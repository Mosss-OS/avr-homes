<?php

declare(strict_types=1);

/**
 * File upload endpoints.
 *
 * @package AVRHomes\Controllers
 */

/**
 * Controller for handling property image uploads.
 *
 * Supports single and gallery uploads, file validation by MIME type
 * and extension, and image deletion with cleanup.
 *
 * @package AVRHomes\Controllers
 */
class UploadController
{
  private const UPLOAD_DIR = __DIR__ . '/../uploads/properties';
  private const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  private const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
  private const MAX_SIZE = 10485760; // 10MB

  /**
   * Upload a single property image.
   *
   * Accepts a 'file' upload and optional 'property_id' and 'is_primary' fields.
   * Validates file type and size before saving.
   *
   * @param array $params Route parameters (unused).
   *
   * @return void
   */
  public static function upload(array $params): void
  {
    $user = AuthMiddleware::authenticate();

    if (!isset($_FILES['file'])) {
      Response::error('No file uploaded', 400);
    }

    $file = $_FILES['file'];

    $result = self::handleUpload($file);
    if (!$result['success']) {
      Response::error($result['error'], 400);
    }

    $propertyId = !empty($_POST['property_id']) ? (int)$_POST['property_id'] : null;
    $isPrimary = !empty($_POST['is_primary']) ? 1 : 0;

    if ($propertyId) {
      $db = Database::getConnection();
      $stmt = $db->prepare(
        'INSERT INTO property_images (property_id, file_path, file_name, file_size, mime_type, is_primary) 
         VALUES (?, ?, ?, ?, ?, ?)'
      );
      $stmt->execute([
        $propertyId,
        $result['path'],
        $result['original_name'],
        $result['size'],
        $result['mime'],
        $isPrimary,
      ]);
      $imageId = (int)$db->lastInsertId();

      // Set as property main image
      if ($isPrimary) {
        $db->prepare('UPDATE properties SET image = ? WHERE id = ?')
          ->execute([$result['path'], $propertyId]);
      }

      Response::success([
        'id'        => $imageId,
        'url'       => Property::imageUrl($result['path']),
        'path'      => $result['path'],
        'file_name' => $result['original_name'],
      ], 'File uploaded successfully', 201);
    }

    Response::success([
      'url'       => Property::imageUrl($result['path']),
      'path'      => $result['path'],
      'file_name' => $result['original_name'],
    ], 'File uploaded successfully', 201);
  }

  /**
   * Upload multiple images for a property gallery.
   *
   * Accepts a 'files' array and a required 'property_id'. Each file
   * is validated individually. Returns lists of successful and failed uploads.
   *
   * @param array $params Route parameters (unused).
   *
   * @return void
   */
  public static function uploadGallery(array $params): void
  {
    $user = AuthMiddleware::authenticate();

    if (!isset($_FILES['files'])) {
      Response::error('No files uploaded', 400);
    }

    $propertyId = !empty($_POST['property_id']) ? (int)$_POST['property_id'] : null;
    if (!$propertyId) {
      Response::error('Property ID is required', 400);
    }

    $files = $_FILES['files'];
    $uploaded = [];
    $errors = [];

    // Normalize PHP's weird multi-file array format
    $fileCount = is_array($files['name']) ? count($files['name']) : 1;

    for ($i = 0; $i < $fileCount; $i++) {
      $file = [
        'name'     => is_array($files['name']) ? $files['name'][$i] : $files['name'],
        'type'     => is_array($files['type']) ? $files['type'][$i] : $files['type'],
        'tmp_name' => is_array($files['tmp_name']) ? $files['tmp_name'][$i] : $files['tmp_name'],
        'error'    => is_array($files['error']) ? $files['error'][$i] : $files['error'],
        'size'     => is_array($files['size']) ? $files['size'][$i] : $files['size'],
      ];

      if ($file['error'] !== UPLOAD_ERR_OK) {
        $errors[] = "File {$file['name']}: upload error";
        continue;
      }

      $result = self::handleUpload($file);
      if (!$result['success']) {
        $errors[] = "File {$file['name']}: {$result['error']}";
        continue;
      }

      $db = Database::getConnection();
      $stmt = $db->prepare(
        'INSERT INTO property_images (property_id, file_path, file_name, file_size, mime_type, sort_order) 
         VALUES (?, ?, ?, ?, ?, ?)'
      );
      $stmt->execute([
        $propertyId,
        $result['path'],
        $result['original_name'],
        $result['size'],
        $result['mime'],
        $i,
      ]);
      $imageId = (int)$db->lastInsertId();

      $uploaded[] = [
        'id'        => $imageId,
        'url'       => Property::imageUrl($result['path']),
        'path'      => $result['path'],
        'file_name' => $result['original_name'],
      ];
    }

    Response::success([
      'uploaded' => $uploaded,
      'errors'   => $errors,
    ], count($uploaded) . ' file(s) uploaded successfully');
  }

  /**
   * Delete a property image.
   *
   * Removes the file from disk and the database record. Clears the
   * property's main image if the deleted image was the primary one.
   *
   * @param array $params Route parameters containing 'id' (image ID).
   *
   * @return void
   */
  public static function destroy(array $params): void
  {
    $user = AuthMiddleware::authenticate();

    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) {
      Response::error('Invalid image ID', 400);
    }

    $db = Database::getConnection();
    $stmt = $db->prepare('SELECT id, file_path, property_id, is_primary FROM property_images WHERE id = ?');
    $stmt->execute([$id]);
    $image = $stmt->fetch();

    if (!$image) {
      Response::error('Image not found', 404);
    }

    // Delete file from disk
    $filePath = __DIR__ . '/../' . $image['file_path'];
    if (file_exists($filePath)) {
      unlink($filePath);
    }

    // Delete from DB
    $db->prepare('DELETE FROM property_images WHERE id = ?')->execute([$id]);

    // If it was the primary image, clear it from properties table
    if ($image['is_primary'] && $image['property_id']) {
      $db->prepare('UPDATE properties SET image = NULL WHERE id = ?')
        ->execute([$image['property_id']]);
    }

    Response::success(null, 'Image deleted successfully');
  }

  /**
   * Validate and save an uploaded file to the uploads directory.
   *
   * @param array $file The $_FILES entry for a single file.
   *
   * @return array{success: bool, path?: string, original_name?: string, size?: int, mime?: string, error?: string} Result with
   *               success flag, file details on success, or error message on failure.
   */
  private static function handleUpload(array $file): array
  {
    if ($file['error'] !== UPLOAD_ERR_OK) {
      return ['success' => false, 'error' => 'Upload error code: ' . $file['error']];
    }

    if ($file['size'] > self::MAX_SIZE) {
      return ['success' => false, 'error' => 'File is too large. Maximum size is 10MB.'];
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mime, self::ALLOWED_TYPES, true)) {
      return ['success' => false, 'error' => 'Invalid file type. Only JPG, PNG, and WEBP are allowed.'];
    }

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, self::ALLOWED_EXTENSIONS, true)) {
      return ['success' => false, 'error' => 'Invalid file extension.'];
    }

    if (!is_dir(self::UPLOAD_DIR)) {
      mkdir(self::UPLOAD_DIR, 0755, true);
    }

    $uniqueName = uniqid('prop_', true) . '.' . $ext;
    $destPath = self::UPLOAD_DIR . '/' . $uniqueName;

    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
      return ['success' => false, 'error' => 'Failed to move uploaded file.'];
    }

    $relativePath = 'uploads/properties/' . $uniqueName;

    return [
      'success'       => true,
      'path'          => $relativePath,
      'original_name' => $file['name'],
      'size'          => $file['size'],
      'mime'          => $mime,
    ];
  }
}
