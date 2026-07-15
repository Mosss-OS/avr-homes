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

    $timestamp = time();
    $folder = $options['folder'] ?? 'avr-homes';
    $publicId = $options['public_id'] ?? pathinfo($originalName, PATHINFO_FILENAME) . '_' . $timestamp;

    // Build signature params
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
    $body .= "Content-Disposition: form-data; name=\"signature\"\r\n\r\n{$signature}\r\n";
    $body .= "--{$boundary}\r\n";
    $body .= "Content-Disposition: form-data; name=\"file\"; filename=\"{$originalName}\"\r\n";
    $body .= "Content-Type: application/octet-stream\r\n\r\n";
    $body .= file_get_contents($filePath);
    $body .= "\r\n--{$boundary}--\r\n";

    $url = "https://api.cloudinary.com/v1_1/{$cloudName}/{$resourceType}/upload";

    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_POST           => true,
      CURLOPT_POSTFIELDS     => $body,
      CURLOPT_HTTPHEADER     => [
        'Authorization: Basic ' . base64_encode("{$apiKey}:{$apiSecret}"),
        "Content-Type: multipart/form-data; boundary={$boundary}",
      ],
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT        => 120,
      CURLOPT_CONNECTTIMEOUT => 30,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

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
