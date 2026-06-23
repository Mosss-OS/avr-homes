<?php

declare(strict_types=1);

class AuthController
{
  public static function login(array $params): void
  {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      $input = $_POST;
    }

    $validator = new Validator($input);
    $validator
      ->required('email', 'Email')
      ->email('email', 'Email')
      ->required('password', 'Password')
      ->minLength('password', 6, 'Password');

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $data = $validator->validated();

    $db = Database::getConnection();
    $stmt = $db->prepare('SELECT id, name, email, password, role FROM users WHERE email = ? AND is_active = 1');
    $stmt->execute([$data['email']]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($data['password'], $user['password'])) {
      Response::error('Invalid email or password', 401);
    }

    $token = AuthMiddleware::generateToken((int)$user['id']);

    // Log activity
    $logStmt = $db->prepare('INSERT INTO activity_logs (user_id, action, entity_type, ip_address) VALUES (?, ?, ?, ?)');
    $logStmt->execute([$user['id'], 'login', 'user', $_SERVER['REMOTE_ADDR'] ?? '']);

    Response::success([
      'token' => $token,
      'user'  => [
        'id'    => (int)$user['id'],
        'name'  => $user['name'],
        'email' => $user['email'],
        'role'  => $user['role'],
      ],
    ], 'Login successful');
  }

  public static function logout(array $params): void
  {
    $user = AuthMiddleware::authenticate();

    // Log activity
    $db = Database::getConnection();
    $logStmt = $db->prepare('INSERT INTO activity_logs (user_id, action, entity_type, ip_address) VALUES (?, ?, ?, ?)');
    $logStmt->execute([$user['id'], 'logout', 'user', $_SERVER['REMOTE_ADDR'] ?? '']);

    Response::success(null, 'Logged out successfully');
  }

  public static function me(array $params): void
  {
    $user = AuthMiddleware::authenticate();

    Response::success([
      'id'    => (int)$user['id'],
      'name'  => $user['name'],
      'email' => $user['email'],
      'role'  => $user['role'],
    ]);
  }
}
