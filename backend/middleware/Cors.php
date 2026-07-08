<?php

/**
 * CORS (Cross-Origin Resource Sharing) handler.
 *
 * Sets permissive but origin-whitelisted CORS headers and
 * short-circuits pre-flight OPTIONS requests.
 *
 * @package AvrHomes
 */

declare(strict_types=1);

/**
 * CORS header management.
 */
class Cors
{
  /**
   * Set CORS headers for the current request and exit on OPTIONS.
   */
  public static function handle(): void
  {
    $allowedOrigins = [
      'http://localhost:8080',
      'http://localhost:5173',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:5173',
      'https://avrusthomes.com',
      'https://www.avrusthomes.com',
      'https://avr-homes.vercel.app',
      'https://avr-homes-nof3pglpa-mosss-os-projects.vercel.app',
      'https://avr-homes-i34kreqoz-mosss-os-projects.vercel.app',
    ];

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, $allowedOrigins, true)) {
      header("Access-Control-Allow-Origin: {$origin}");
    } else {
      header('Access-Control-Allow-Origin: https://avrusthomes.com');
    }

    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
      http_response_code(204);
      exit;
    }
  }
}
