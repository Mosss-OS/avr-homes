<?php

declare(strict_types=1);

/**
 * File upload endpoints backed by Cloudinary.
 *
 * @package AVRHomes\Controllers
 */

class UploadController
{
  /**
   * Upload a single property image to Cloudinary.
   *
   * Accepts a 'file' upload and optional 'property_id' and 'is_primary' fields.
   *
   * @param array $params Route parameters (unused).
   */
  public static function upload(array $params): void
  {
    $user = AuthMiddleware::authenticate();

    if (!isset($_FILES['file'])) {
      Response::error('No file uploaded', 400);
    }

    $result = CloudinaryService::uploadFromFile($_FILES['file'], 'image', ['folder' => 'avr-homes/properties']);
    if (!$result['success']) {
      Response::error($result['error'], 400);
    }

    $url = $result['url'];
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
        $url,
        $_FILES['file']['name'],
        $result['bytes'],
        'image/' . $result['format'],
        $isPrimary,
      ]);
      $imageId = (int)$db->lastInsertId();

      if ($isPrimary) {
        $db->prepare('UPDATE properties SET image = ? WHERE id = ?')
          ->execute([$url, $propertyId]);
      }

      Response::success([
        'id'        => $imageId,
        'url'       => $url,
        'path'      => $url,
        'file_name' => $_FILES['file']['name'],
      ], 'File uploaded successfully', 201);
      return;
    }

    Response::success([
      'url'       => $url,
      'path'      => $url,
      'file_name' => $_FILES['file']['name'],
    ], 'File uploaded successfully', 201);
  }

  /**
   * Upload multiple images for a property gallery to Cloudinary.
   *
   * Accepts a 'files' array and a required 'property_id'.
   *
   * @param array $params Route parameters (unused).
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

      $result = CloudinaryService::uploadFromFile($file, 'image', ['folder' => 'avr-homes/properties']);
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
        $result['url'],
        $file['name'],
        $result['bytes'],
        $file['type'],
        $i,
      ]);
      $imageId = (int)$db->lastInsertId();

      $uploaded[] = [
        'id'        => $imageId,
        'url'       => $result['url'],
        'path'      => $result['url'],
        'file_name' => $file['name'],
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
   * @param array $params Route parameters containing 'id' (image ID).
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

    $db->prepare('DELETE FROM property_images WHERE id = ?')->execute([$id]);

    if ($image['is_primary'] && $image['property_id']) {
      $db->prepare('UPDATE properties SET image = NULL WHERE id = ?')
        ->execute([$image['property_id']]);
    }

    Response::success(null, 'Image deleted successfully');
  }

  /**
   * Upload any media file (image, video, document) to Cloudinary.
   *
   * Accepts a 'file' upload. Detects resource type automatically.
   *
   * @param array $params Route parameters (unused).
   */
  public static function uploadMedia(array $params): void
  {
    $user = AuthMiddleware::authenticate();

    if (!isset($_FILES['file'])) {
      Response::error('No file uploaded', 400);
    }

    $file = $_FILES['file'];
    $folder = $_POST['folder'] ?? 'avr-homes/media';

    // Detect resource type from MIME
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (str_starts_with($mime, 'video/')) {
      $resourceType = 'video';
    } elseif (str_starts_with($mime, 'image/')) {
      $resourceType = 'image';
    } else {
      $resourceType = 'raw';
      // For raw files, ensure proper extension is detected
      $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
      if (in_array($ext, ['pdf', 'doc', 'docx', 'xls', 'xlsx'], true)) {
        $resourceType = 'raw';
      } elseif (in_array($ext, ['mp4', 'webm', 'mov', 'avi', 'mkv'], true)) {
        $resourceType = 'video';
      }
    }

    $result = CloudinaryService::uploadFromFile($file, $resourceType, ['folder' => $folder]);
    if (!$result['success']) {
      Response::error($result['error'], 400);
    }

    Response::success([
      'url'       => $result['url'],
      'public_id' => $result['public_id'],
      'format'    => $result['format'],
      'bytes'     => $result['bytes'],
      'resource_type' => $resourceType,
    ], 'Media uploaded successfully', 201);
  }

  /**
   * Return signed upload parameters for direct browser-to-Cloudinary upload.
   *
   * The frontend uses these params to POST directly to
   * https://api.cloudinary.com/v1_1/{cloud_name}/auto/upload,
   * bypassing the PHP proxy for large files (especially videos).
   *
   * @param array $params Route parameters (unused).
   */
  public static function sign(array $params): void
  {
    $user = AuthMiddleware::authenticate();

    $cloudName = $_ENV['CLOUDINARY_CLOUD_NAME'] ?? '';
    $apiKey    = $_ENV['CLOUDINARY_API_KEY'] ?? '';
    $apiSecret = $_ENV['CLOUDINARY_API_SECRET'] ?? '';

    if (!$cloudName || !$apiKey || !$apiSecret) {
      Response::error('Cloudinary not configured', 500);
    }

    $folder    = $_GET['folder'] ?? 'avr-homes/media';
    $timestamp = time();

    $paramsToSign = [
      'timestamp' => $timestamp,
      'folder'    => $folder,
    ];
    ksort($paramsToSign);
    $signStr = '';
    foreach ($paramsToSign as $k => $v) {
      $signStr .= "{$k}={$v}&";
    }
    $signStr = rtrim($signStr, '&') . $apiSecret;
    $signature = sha1($signStr);

    Response::success([
      'cloud_name' => $cloudName,
      'api_key'    => $apiKey,
      'timestamp'  => $timestamp,
      'signature'  => $signature,
      'folder'     => $folder,
    ], 'Upload signature generated');
  }
}
