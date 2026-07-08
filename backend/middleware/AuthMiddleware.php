<?php

/**
 * Authentication middleware using self-contained JWT tokens.
 *
 * Provides bearer-token extraction, JWT generation/validation,
 * and role-based access control helpers for users, agents, and admins.
 *
 * @package AvrHomes
 */

declare(strict_types=1);

/**
 * JWT-based authentication handler.
 */
class AuthMiddleware
{
  /**
   * Authenticate a user from the bearer token with optional role check.
   *
   * @param string|null $requiredRole If set, the user must have this role (or 'superadmin').
   * @return array<string,mixed> Authenticated user row.
   */
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
    $stmt = $db->prepare('SELECT id, name, email, role, admin_role_id FROM users WHERE id = ? AND is_active = 1');
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

  /**
   * Authenticate and ensure the user has an active agent profile.
   *
   * @return array<string,mixed> Authenticated user row with agent_id injected.
   */
  public static function authenticateAgent(): array
  {
    $user = self::authenticate();
    if ($user['role'] === 'admin' || $user['role'] === 'superadmin') {
      return $user;
    }
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

  /**
   * Authenticate and require the admin role.
   *
   * @return array<string,mixed> Authenticated user row.
   */
  public static function authenticateAdmin(): array
  {
    return self::authenticate('admin');
  }

  /**
   * Extract the Bearer token from the Authorization header or ?token query param.
   *
   * @return string|null Token string or null if not present.
   */
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

  /**
   * Generate a signed HS256 JWT access token valid for 24 hours.
   *
   * @param int $userId The user identifier to embed in the token.
   * @return string Encoded JWT string.
   */
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

  /**
   * Generate a cryptographically random refresh token (7-day TTL) and persist it.
   *
   * @param int $userId The user identifier.
   * @return string The raw refresh token string.
   */
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

  /**
   * Validate a JWT token: verify signature and check expiration.
   *
   * @param string $token The raw JWT string.
   * @return array|null Decoded payload or null on failure.
   */
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

  /**
   * Base64-URL encode (RFC 4648 §5) a string.
   *
   * @param string $data Raw binary data.
   * @return string URL-safe base64 encoded string.
   */
  public static function base64UrlEncode(string $data): string
  {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
  }

  /**
   * Base64-URL decode (RFC 4648 §5) a string.
   *
   * @param string $data URL-safe base64 encoded string.
   * @return string Decoded raw binary data.
   */
  /**
   * Require a specific permission for the current admin user.
   * Superadmin always passes. Falls back to role-based permission check.
   */
  public static function requirePermission(string $permissionSlug): void
  {
    $user = self::authenticate();
    if ($user['role'] === 'superadmin') return;

    $db = Database::getConnection();

    // Check via admin_role_id if set
    if (!empty($user['admin_role_id'])) {
      $stmt = $db->prepare(
        "SELECT COUNT(*) FROM admin_role_permissions rp
         INNER JOIN admin_permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = ? AND p.slug = ?"
      );
      $stmt->execute([$user['admin_role_id'], $permissionSlug]);
      if ((int)$stmt->fetchColumn() > 0) return;
    }

    // Fallback: check by role name
    $stmt = $db->prepare(
      "SELECT COUNT(*) FROM admin_role_permissions rp
       INNER JOIN admin_permissions p ON p.id = rp.permission_id
       INNER JOIN admin_roles r ON r.id = rp.role_id
       WHERE r.slug = ? AND p.slug = ?"
    );
    $stmt->execute([$user['role'], $permissionSlug]);
    if ((int)$stmt->fetchColumn() > 0) return;

    Response::error('Insufficient permissions: ' . $permissionSlug . ' required', 403);
  }

  private static function base64UrlDecode(string $data): string
  {
    return base64_decode(strtr($data, '-_', '+/'));
  }
}
