<?php

/**
 * Loads environment variables from a .env file into $_ENV and putenv().
 *
 * Supports optional quotes around values and skips comment lines (#).
 *
 * @package AvrHomes
 */

declare(strict_types=1);

/**
 * Parse and load a .env file into the environment.
 *
 * @param string $path Absolute path to the .env file.
 */
function loadEnv(string $path): void
{
  if (!file_exists($path)) {
    return;
  }

  $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
  foreach ($lines as $line) {
    $line = trim($line);
    if ($line === '' || str_starts_with($line, '#')) {
      continue;
    }

    if (str_contains($line, '=')) {
      [$key, $value] = explode('=', $line, 2);
      $key   = trim($key);
      $value = trim($value);

      $value = trim($value, '"\'');
      $_ENV[$key] = $value;
      putenv("{$key}={$value}");
    }
  }
}

$envPath = __DIR__ . '/../.env';
if (file_exists($envPath)) {
  loadEnv($envPath);
} else {
  loadEnv(__DIR__ . '/../.env.example');
}
