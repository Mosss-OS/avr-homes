<?php

/**
 * Standard JSON response helpers.
 *
 * Provides static methods for sending structured JSON responses
 * (success/error) with appropriate HTTP status codes.
 *
 * @package AvrHomes
 */

declare(strict_types=1);

/**
 * HTTP JSON response utility.
 */
class Response
{
  /**
   * Send a JSON response and terminate.
   *
   * @param mixed  $data    Response payload.
   * @param int    $status  HTTP status code (default 200).
   * @param string $message Human-readable message (default 'OK').
   */
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

  /**
   * Send a success JSON response.
   *
   * @param mixed  $data    Response payload.
   * @param string $message Success message (default 'Operation successful').
   * @param int    $status  HTTP status code (default 200).
   */
  public static function success(mixed $data, string $message = 'Operation successful', int $status = 200): void
  {
    self::json($data, $status, $message);
  }

  /**
   * Send an error JSON response and terminate.
   *
   * @param string     $message Error message.
   * @param int        $status  HTTP status code (default 400).
   * @param mixed|null $errors  Optional detailed error data (e.g. validation errors).
   */
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
