<?php

declare(strict_types=1);

class AuthMiddleware
{
  public static function authenticate(?string $requiredRole = null): array
  {
    $token = self::getBearerToken();

    if (!$token) {
      Response::error('Authentication required', 401);
    }

    $payload = self::validateToken($token);
    if (!$payload) {
      Response::error('Invalid or expired token', 401);
    }

    $db = Database::getConnection();
    $stmt = $db->prepare('SELECT id, name, email, role FROM users WHERE id = ? AND is_active = 1');
    $stmt->execute([$payload['user_id']]);
    $user = $stmt->fetch();

    if (!$user) {
      Response::error('User not found or inactive', 401);
    }

    if ($requiredRole && $user['role'] !== $requiredRole && $user['role'] !== 'superadmin') {
      Response::error('Insufficient permissions', 403);
    }

    return $user;
  }

  public static function authenticateAgent(): array
  {
    $user = self::authenticate();
    if ($user['role'] !== 'agent') {
      $db = Database::getConnection();
      $stmt = $db->prepare('SELECT id FROM agents WHERE user_id = ? AND is_active = 1');
      $stmt->execute([$user['id']]);
      $agent = $stmt->fetch();
      if (!$agent) {
        Response::error('Agent profile not found', 404);
      }
      $user['agent_id'] = (int)$agent['id'];
    }
    return $user;
  }

  public static function authenticateAdmin(): array
  {
    return self::authenticate('admin');
  }

  private static function getBearerToken(): ?string
  {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

    if (preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
      return $matches[1];
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['token'])) {
      return $_GET['token'];
    }

    return null;
  }

  public static function generateToken(int $userId): string
  {
    $secret = $_ENV['JWT_SECRET'] ?? 'change-this-to-a-random-secret-key';
    $issuedAt = time();
    $expiresAt = $issuedAt + 86400;

    $header = self::base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload = self::base64UrlEncode(json_encode([
      'user_id' => $userId,
      'iat'     => $issuedAt,
      'exp'     => $expiresAt,
    ]));

    $signature = self::base64UrlEncode(
      hash_hmac('sha256', "{$header}.{$payload}", $secret, true)
    );

    return "{$header}.{$payload}.{$signature}";
  }

  public static function generateRefreshToken(int $userId): string
  {
    $token = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', time() + 604800);

    $db = Database::getConnection();
    $stmt = $db->prepare(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
    );
    $stmt->execute([$userId, $token, $expiresAt]);

    return $token;
  }

  private static function validateToken(string $token): ?array
  {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
      return null;
    }

    [$header, $payload, $signature] = $parts;

    $secret = $_ENV['JWT_SECRET'] ?? 'change-this-to-a-random-secret-key';
    $expectedSignature = self::base64UrlEncode(
      hash_hmac('sha256', "{$header}.{$payload}", $secret, true)
    );

    if (!hash_equals($expectedSignature, $signature)) {
      return null;
    }

    $data = json_decode(self::base64UrlDecode($payload), true);
    if (!$data || !isset($data['exp']) || $data['exp'] < time()) {
      return null;
    }

    return $data;
  }

  public static function base64UrlEncode(string $data): string
  {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
  }

  private static function base64UrlDecode(string $data): string
  {
    return base64_decode(strtr($data, '-_', '+/'));
  }
}
