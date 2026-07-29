<?php

declare(strict_types=1);

/**
 * CloudinaryService — upload files to Cloudinary via REST API.
 *
 * Uses HTTP Basic Auth (API Key / API Secret) so no SDK / Composer is needed.
 *
 * @package AvrHomes
 */
class CloudinaryService
{
  private static function config(): array
  {
    $cloudName = $_ENV['CLOUDINARY_CLOUD_NAME'] ?? '';
    $apiKey    = $_ENV['CLOUDINARY_API_KEY'] ?? '';
    $apiSecret = $_ENV['CLOUDINARY_API_SECRET'] ?? '';

    if (!$cloudName || !$apiKey || !$apiSecret) {
      throw new RuntimeException('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env');
    }

    return [$cloudName, $apiKey, $apiSecret];
  }

  private const MAX_VIDEO_BYTES = 95 * 1024 * 1024; // 95 MB — leave headroom for Cloudinary's 100 MB limit

  /**
   * Compress a video file with FFmpeg if it exceeds the size limit.
   * Returns the path to the compressed file (or the original if no compression was needed).
   * The caller should clean up the returned path when done.
   */
  private static function compressVideoIfNeeded(string $filePath, string $originalName): string
  {
    $size = filesize($filePath);
    if ($size <= self::MAX_VIDEO_BYTES) {
      return $filePath;
    }

    // Only compress videos
    $mime = mime_content_type($filePath);
    if (!$mime || strpos($mime, 'video/') !== 0) {
      return $filePath;
    }

    // Check that exec() and FFmpeg are available
    if (!function_exists('exec')) {
      return $filePath;
    }
    @exec('which ffmpeg 2>/dev/null', $whichOut, $whichCode);
    if ($whichCode !== 0) {
      return $filePath;
    }

    $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    $outPath = $filePath . '_compressed.' . ($ext === 'mp4' ? 'mp4' : 'mp4');

    // Compress: h264 @ CRF 28, AAC audio 128k, fast preset, max rate 2 Mbps to keep size down
    $cmd = sprintf(
      'ffmpeg -i %s -c:v libx264 -crf 28 -preset fast -maxrate 2M -bufsize 4M -c:a aac -b:a 128k -movflags +faststart -y %s 2>/dev/null',
      escapeshellarg($filePath),
      escapeshellarg($outPath)
    );

    @exec($cmd, $_, $returnCode);

    if ($returnCode === 0 && file_exists($outPath) && filesize($outPath) > 0) {
      return $outPath;
    }

    // Compression failed — return original
    if (file_exists($outPath)) {
      @unlink($outPath);
    }
    return $filePath;
  }

  /**
   * Upload a file to Cloudinary.
   *
   * @param string $filePath   Absolute path to the temp file.
   * @param string $originalName Original filename (used for public_id).
   * @param string $resourceType 'image' | 'video' | 'raw' | 'auto'
   * @param array  $options     Extra upload params (e.g. folder, tags).
   *
   * @return array{success: bool, url?: string, public_id?: string, error?: string}
   */
  public static function upload(
    string $filePath,
    string $originalName,
    string $resourceType = 'auto',
    array  $options = []
  ): array {
    try {
      [$cloudName, $apiKey, $apiSecret] = self::config();
    } catch (RuntimeException $e) {
      return ['success' => false, 'error' => $e->getMessage()];
    }

    if (!file_exists($filePath)) {
      return ['success' => false, 'error' => 'File not found'];
    }

    // Auto-detect video resource type
    if ($resourceType === 'auto') {
      $mime = mime_content_type($filePath);
      if ($mime && strpos($mime, 'video/') === 0) {
        $resourceType = 'video';
      }
    }

    // Compress large videos before uploading
    $effectivePath = self::compressVideoIfNeeded($filePath, $originalName);
    $needsCleanup = $effectivePath !== $filePath;

    // Optimise images (resize + compress) before uploading
    if ($resourceType !== 'video' && $resourceType !== 'raw') {
      $optimisedPath = ImageOptimizer::optimize($effectivePath);
      if ($optimisedPath !== $effectivePath) {
        if ($needsCleanup) @unlink($effectivePath); // clean up previous temp
        $effectivePath = $optimisedPath;
        $needsCleanup = true;
      }
    }

    $timestamp = time();
    $folder = $options['folder'] ?? 'avr-homes';
    $publicId = $options['public_id'] ?? pathinfo($originalName, PATHINFO_FILENAME) . '_' . $timestamp;

    // Build signature params (api_key and file are NOT included in the signature)
    $paramsToSign = [
      'timestamp' => $timestamp,
      'folder'    => $folder,
      'public_id' => $publicId,
    ];
    if (!empty($options['tags'])) {
      $paramsToSign['tags'] = $options['tags'];
    }

    // Generate signature
    ksort($paramsToSign);
    $signStr = '';
    foreach ($paramsToSign as $k => $v) {
      $signStr .= "{$k}={$v}&";
    }
    $signStr = rtrim($signStr, '&') . $apiSecret;
    $signature = sha1($signStr);

    $url = "https://api.cloudinary.com/v1_1/{$cloudName}/{$resourceType}/upload";

    // Increase timeout for large video uploads
    $timeout = ($resourceType === 'video') ? 300 : 120;

    $postFields = $paramsToSign;
    $postFields['api_key'] = $apiKey;
    $postFields['signature'] = $signature;
    $postFields['file'] = new CURLFile($effectivePath, 'application/octet-stream', $originalName);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_POST           => true,
      CURLOPT_POSTFIELDS     => $postFields,
      CURLOPT_HTTPHEADER     => [
        'Authorization: Basic ' . base64_encode("{$apiKey}:{$apiSecret}"),
      ],
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT        => $timeout,
      CURLOPT_CONNECTTIMEOUT => 30,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    // Clean up compressed temp file
    if ($needsCleanup) {
      @unlink($effectivePath);
    }

    if ($curlErr) {
      return ['success' => false, 'error' => "cURL error: {$curlErr}"];
    }

    $data = json_decode($response, true);

    if ($httpCode !== 200 || !$data || !empty($data['error'])) {
      $errMsg = $data['error']['message'] ?? "HTTP {$httpCode}";
      return ['success' => false, 'error' => "Cloudinary error: {$errMsg}"];
    }

    return [
      'success'   => true,
      'url'       => $data['secure_url'],
      'public_id' => $data['public_id'],
      'format'    => $data['format'] ?? null,
      'bytes'     => $data['bytes'] ?? 0,
    ];
  }

  /**
   * Upload a file from an HTTP upload ($_FILES array) to Cloudinary.
   */
  public static function uploadFromFile(
    array $file,
    string $resourceType = 'auto',
    array $options = []
  ): array {
    if ($file['error'] !== UPLOAD_ERR_OK) {
      return ['success' => false, 'error' => 'Upload error code: ' . $file['error']];
    }

    return self::upload(
      $file['tmp_name'],
      $file['name'],
      $resourceType,
      $options
    );
  }

  /**
   * Delete a resource from Cloudinary by its public URL.
   * The URL must be a Cloudinary secure_url (res.cloudinary.com/...).
   * Extracts the public_id and resource type automatically from the URL.
   *
   * @param string $cloudinaryUrl Full Cloudinary URL (https://res.cloudinary.com/...)
   * @return array{success: bool, error?: string}
   */
  public static function deleteByUrl(string $cloudinaryUrl): array
  {
    // Only attempt deletion if this is a Cloudinary URL
    if (!str_contains($cloudinaryUrl, 'res.cloudinary.com/')) {
      return ['success' => true]; // Not a Cloudinary URL, nothing to do
    }

    try {
      [$cloudName, $apiKey, $apiSecret] = self::config();
    } catch (RuntimeException $e) {
      return ['success' => false, 'error' => $e->getMessage()];
    }

    // Determine resource type from URL path
    $resourceType = 'image';
    if (preg_match('#/(image|video|raw)/upload/#', $cloudinaryUrl, $m)) {
      $resourceType = $m[1];
    }

    // Parse public_id from URL
    // Format: https://res.cloudinary.com/cloud_name/image/upload/v1234567/folder/public_id.ext
    $parts = parse_url($cloudinaryUrl);
    $path = $parts['path'] ?? '';

    // Remove /cloud_name/image/upload/v1234567/ prefix
    $path = preg_replace('#^/[^/]+/(image|video|raw)/upload/[^/]+/#', '', $path);
    // Remove file extension
    $path = preg_replace('#\.\w+$#', '', $path);

    if (!$path) {
      return ['success' => false, 'error' => 'Could not parse public_id from URL'];
    }

    $publicId = $path;

    $timestamp = time();
    $paramsToSign = [
      'timestamp' => $timestamp,
      'public_id' => $publicId,
    ];
    ksort($paramsToSign);
    $signStr = '';
    foreach ($paramsToSign as $k => $v) {
      $signStr .= "{$k}={$v}&";
    }
    $signStr = rtrim($signStr, '&') . $apiSecret;
    $signature = sha1($signStr);

    $url = "https://api.cloudinary.com/v1_1/{$cloudName}/{$resourceType}/destroy";

    $postFields = [
      'public_id'  => $publicId,
      'api_key'    => $apiKey,
      'signature'  => $signature,
      'timestamp'  => $timestamp,
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_POST           => true,
      CURLOPT_POSTFIELDS     => http_build_query($postFields),
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT        => 30,
      CURLOPT_CONNECTTIMEOUT => 10,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $data = json_decode($response, true);

    if ($httpCode !== 200 || !$data || ($data['result'] ?? '') !== 'ok') {
      $errMsg = $data['error']['message'] ?? "HTTP {$httpCode}";
      return ['success' => false, 'error' => "Cloudinary delete error: {$errMsg}"];
    }

    return ['success' => true];
  }
}
