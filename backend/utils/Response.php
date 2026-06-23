<?php

declare(strict_types=1);

class Response
{
  public static function json(mixed $data, int $status = 200, string $message = 'OK'): void
  {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
      'success' => $status >= 200 && $status < 300,
      'message' => $message,
      'data'    => $data,
    ], JSON_UNESCAPED_UNICODE);
    exit;
  }

  public static function success(mixed $data, string $message = 'Operation successful', int $status = 200): void
  {
    self::json($data, $status, $message);
  }

  public static function error(string $message, int $status = 400, mixed $errors = null): void
  {
    $payload = [
      'success' => false,
      'message' => $message,
    ];
    if ($errors !== null) {
      $payload['errors'] = $errors;
    }
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
  }
}
