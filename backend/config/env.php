<?php

declare(strict_types=1);

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
