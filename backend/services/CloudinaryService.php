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

    // Check that FFmpeg is available
    exec('which ffmpeg 2>/dev/null', $whichOut, $whichCode);
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

    exec($cmd, $_, $returnCode);

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

    $timestamp = time();
    $folder = $options['folder'] ?? 'avr-homes';
    $publicId = $options['public_id'] ?? pathinfo($originalName, PATHINFO_FILENAME) . '_' . $timestamp;

    // Build signature params (api_key is NOT included in the signature)
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

    // Build multipart request
    $boundary = '----CloudinaryBoundary' . md5((string)$timestamp);
    $body = '';

    foreach ($paramsToSign as $k => $v) {
      $body .= "--{$boundary}\r\n";
      $body .= "Content-Disposition: form-data; name=\"{$k}\"\r\n\r\n{$v}\r\n";
    }

    $body .= "--{$boundary}\r\n";
    $body .= "Content-Disposition: form-data; name=\"api_key\"\r\n\r\n{$apiKey}\r\n";
    $body .= "--{$boundary}\r\n";
    $body .= "Content-Disposition: form-data; name=\"signature\"\r\n\r\n{$signature}\r\n";
    $body .= "--{$boundary}\r\n";
    $body .= "Content-Disposition: form-data; name=\"file\"; filename=\"{$originalName}\"\r\n";
    $body .= "Content-Type: application/octet-stream\r\n\r\n";
    $body .= file_get_contents($effectivePath);
    $body .= "\r\n--{$boundary}--\r\n";

    $url = "https://api.cloudinary.com/v1_1/{$cloudName}/{$resourceType}/upload";

    // Increase timeout for large video uploads
    $timeout = ($resourceType === 'video') ? 300 : 120;

    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_POST           => true,
      CURLOPT_POSTFIELDS     => $body,
      CURLOPT_HTTPHEADER     => [
        'Authorization: Basic ' . base64_encode("{$apiKey}:{$apiSecret}"),
        "Content-Type: multipart/form-data; boundary={$boundary}",
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
}
