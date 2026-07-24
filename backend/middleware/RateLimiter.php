<?php

declare(strict_types=1);

/**
 * Simple file-based rate limiter for login attempts.
 *
 * Tracks failed login attempts by IP address.
 * Blocks the IP after the maximum attempts within the time window.
 */
class RateLimiter
{
  private static string $dir = '';

  private static function getDir(): string
  {
    if (self::$dir === '') {
      self::$dir = __DIR__ . '/../storage/ratelimit';
      if (!is_dir(self::$dir)) {
        mkdir(self::$dir, 0755, true);
      }
    }
    return self::$dir;
  }

  private static function filePath(string $key): string
  {
    return self::getDir() . '/' . md5($key) . '.json';
  }

  /**
   * Check if a key (e.g. IP address) is currently rate-limited.
   *
   * @param string $key       Identifier (usually the client IP).
   * @param int    $maxAttempts  Maximum failed attempts allowed.
   * @param int    $windowSeconds Time window in seconds.
   * @return array{ blocked: bool, remaining: int, retryAfter: int }
   */
  public static function check(string $key, int $maxAttempts = 5, int $windowSeconds = 900): array
  {
    $file = self::filePath($key);
    $now = time();

    if (!file_exists($file)) {
      return ['blocked' => false, 'remaining' => $maxAttempts, 'retryAfter' => 0];
    }

    $data = json_decode(file_get_contents($file), true);
    if (!$data || !isset($data['attempts'])) {
      return ['blocked' => false, 'remaining' => $maxAttempts, 'retryAfter' => 0];
    }

    // Purge attempts older than the window
    $data['attempts'] = array_filter($data['attempts'], fn($ts) => $ts > $now - $windowSeconds);
    $data['attempts'] = array_values($data['attempts']);
    file_put_contents($file, json_encode($data), LOCK_EX);

    $count = count($data['attempts']);

    if ($count >= $maxAttempts) {
      $oldest = min($data['attempts']);
      $retryAfter = $oldest + $windowSeconds - $now;
      return ['blocked' => true, 'remaining' => 0, 'retryAfter' => max($retryAfter, 1)];
    }

    return ['blocked' => false, 'remaining' => $maxAttempts - $count, 'retryAfter' => 0];
  }

  /**
   * Record a failed attempt for the given key.
   */
  public static function recordFailure(string $key): void
  {
    $file = self::filePath($key);
    $now = time();

    $data = ['attempts' => []];
    if (file_exists($file)) {
      $decoded = json_decode(file_get_contents($file), true);
      if (isset($decoded['attempts'])) {
        $data['attempts'] = $decoded['attempts'];
      }
    }

    $data['attempts'][] = $now;
    file_put_contents($file, json_encode($data), LOCK_EX);
  }

  /**
   * Clear all recorded failures for a key (call on successful login).
   */
  public static function clear(string $key): void
  {
    $file = self::filePath($key);
    if (file_exists($file)) {
      unlink($file);
    }
  }

  /**
   * Get the client IP address, respecting X-Forwarded-For for cPanel proxied requests.
   */
  public static function getClientIp(): string
  {
    $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $ip = explode(',', $ip)[0];
    return trim($ip);
  }
}
