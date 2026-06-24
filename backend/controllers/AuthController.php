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
    $refreshToken = AuthMiddleware::generateRefreshToken((int)$user['id']);

    $logStmt = $db->prepare('INSERT INTO activity_logs (user_id, action, entity_type, ip_address) VALUES (?, ?, ?, ?)');
    $logStmt->execute([$user['id'], 'login', 'user', $_SERVER['REMOTE_ADDR'] ?? '']);

    Response::success([
      'token'         => $token,
      'refresh_token' => $refreshToken,
      'user'          => [
        'id'    => (int)$user['id'],
        'name'  => $user['name'],
        'email' => $user['email'],
        'role'  => $user['role'],
      ],
    ], 'Login successful');
  }

  public static function registerAgent(array $params): void
  {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      $input = $_POST;
    }

    $validator = new Validator($input);
    $validator
      ->required('name', 'Full Name')
      ->string('name', 'Full Name', 100)
      ->required('email', 'Email')
      ->email('email', 'Email')
      ->required('password', 'Password')
      ->minLength('password', 6, 'Password')
      ->required('phone', 'Phone Number')
      ->string('phone', 'Phone Number', 30);

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $data = $validator->validated();

    $db = Database::getConnection();

    $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$data['email']]);
    if ($stmt->fetch()) {
      Response::error('An account with this email already exists', 422, ['email' => ['Email is already registered']]);
    }

    $hashedPassword = password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => 12]);

    $db->beginTransaction();
    try {
      $stmt = $db->prepare(
        'INSERT INTO users (name, email, password, role, is_active, lasrera_number, niesv_number)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      $stmt->execute([
        $data['name'],
        $data['email'],
        $hashedPassword,
        'agent',
        1,
        $data['lasrera_number'] ?? null,
        $data['niesv_number'] ?? null,
      ]);
      $userId = (int)$db->lastInsertId();

      $slug = Agent::generateSlug($data['name']);

      $stmt = $db->prepare(
        'INSERT INTO agents (user_id, slug, photo_url, name, agency, phone, email, whatsapp, languages, bio, avatar_hue,
          experience, state, city, lasrera_number, niesv_number, avg_monthly_listings, property_types,
          avg_deal_size, specialization, social_instagram, social_facebook, social_linkedin, social_tiktok,
          social_youtube, why_join, support_needed, referral_source, is_verified, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      $stmt->execute([
        $userId,
        $slug,
        null,
        $data['name'],
        $data['agency'] ?? 'AVR Homes',
        $data['phone'],
        $data['email'],
        $data['whatsapp'] ?? $data['phone'],
        json_encode($data['languages'] ?? ['English']),
        $data['bio'] ?? null,
        rand(0, 360),
        $data['experience'] ?? null,
        $data['state'] ?? null,
        $data['city'] ?? null,
        $data['lasrera_number'] ?? null,
        $data['niesv_number'] ?? null,
        $data['avg_monthly_listings'] ?? null,
        json_encode($data['property_types'] ?? []),
        $data['avg_deal_size'] ?? null,
        json_encode($data['specialization'] ?? []),
        $data['social_instagram'] ?? null,
        $data['social_facebook'] ?? null,
        $data['social_linkedin'] ?? null,
        $data['social_tiktok'] ?? null,
        $data['social_youtube'] ?? null,
        $data['why_join'] ?? null,
        json_encode($data['support_needed'] ?? []),
        $data['referral_source'] ?? null,
        0,
        1,
      ]);

      $stmt = $db->prepare(
        'INSERT INTO agent_subscriptions (agent_id, tier, status, listings_limit, featured_slots,
          current_period_start, current_period_end)
         VALUES (?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH))'
      );
      $stmt->execute([$userId, 'free', 'active', 3, 0]);

      $stmt = $db->prepare(
        'INSERT INTO agent_wallets (agent_id, balance, total_earned, total_withdrawn) VALUES (?, 0, 0, 0)'
      );
      $stmt->execute([$userId]);

      $db->commit();

      $token = AuthMiddleware::generateToken($userId);
      $refreshToken = AuthMiddleware::generateRefreshToken($userId);

      Response::success([
        'id'            => $userId,
        'token'         => $token,
        'refresh_token' => $refreshToken,
        'user'          => [
          'id'    => $userId,
          'name'  => $data['name'],
          'email' => $data['email'],
          'role'  => 'agent',
        ],
      ], 'Registration successful', 201);
    } catch (Exception $e) {
      $db->rollBack();
      Response::error('Registration failed: ' . $e->getMessage(), 500);
    }
  }

  public static function loginAgent(array $params): void
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
    $stmt = $db->prepare("SELECT id, name, email, password, role FROM users WHERE email = ? AND role = 'agent' AND is_active = 1");
    $stmt->execute([$data['email']]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($data['password'], $user['password'])) {
      Response::error('Invalid email or password', 401);
    }

    $token = AuthMiddleware::generateToken((int)$user['id']);
    $refreshToken = AuthMiddleware::generateRefreshToken((int)$user['id']);

    $logStmt = $db->prepare('INSERT INTO activity_logs (user_id, action, entity_type, ip_address) VALUES (?, ?, ?, ?)');
    $logStmt->execute([$user['id'], 'login', 'agent', $_SERVER['REMOTE_ADDR'] ?? '']);

    $stmt = $db->prepare('SELECT id, slug, photo_url, name, phone, email, agency, is_verified, avatar_hue FROM agents WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    $profile = $stmt->fetch();

    Response::success([
      'token'         => $token,
      'refresh_token' => $refreshToken,
      'user'          => [
        'id'          => (int)$user['id'],
        'name'        => $user['name'],
        'email'       => $user['email'],
        'role'        => 'agent',
        'profile'     => $profile ? [
          'agent_id'    => (int)$profile['id'],
          'slug'        => $profile['slug'],
          'photo_url'   => $profile['photo_url'],
          'agency'      => $profile['agency'],
          'phone'       => $profile['phone'],
          'is_verified' => (bool)$profile['is_verified'],
          'avatar_hue'  => (int)$profile['avatar_hue'],
        ] : null,
      ],
    ], 'Login successful');
  }

  public static function me(array $params): void
  {
    $user = AuthMiddleware::authenticate();

    if ($user['role'] === 'agent') {
      $db = Database::getConnection();
      $stmt = $db->prepare(
        'SELECT id, slug, photo_url, name, agency, phone, email, whatsapp, languages, listings, avatar_hue, bio,
          experience, state, city, lasrera_number, niesv_number, avg_monthly_listings, property_types,
          avg_deal_size, specialization, social_instagram, social_facebook, social_linkedin, social_tiktok,
          social_youtube, why_join, support_needed, referral_source, is_verified, created_at
         FROM agents WHERE user_id = ? AND is_active = 1'
      );
      $stmt->execute([$user['id']]);
      $profile = $stmt->fetch();

      if ($profile) {
        $profile['id'] = (int)$profile['id'];
        $profile['listings'] = (int)$profile['listings'];
        $profile['avatar_hue'] = (int)$profile['avatar_hue'];
        $profile['is_verified'] = (bool)$profile['is_verified'];
        $profile['languages'] = json_decode($profile['languages'] ?? '[]', true);
        $profile['property_types'] = json_decode($profile['property_types'] ?? '[]', true);
        $profile['specialization'] = json_decode($profile['specialization'] ?? '[]', true);
        $profile['support_needed'] = json_decode($profile['support_needed'] ?? '[]', true);
      }

      Response::success([
        'id'      => (int)$user['id'],
        'name'    => $user['name'],
        'email'   => $user['email'],
        'role'    => $user['role'],
        'profile' => $profile,
      ]);
      return;
    }

    Response::success([
      'id'    => (int)$user['id'],
      'name'  => $user['name'],
      'email' => $user['email'],
      'role'  => $user['role'],
    ]);
  }

  public static function logout(array $params): void
  {
    $user = AuthMiddleware::authenticate();

    $input = json_decode(file_get_contents('php://input'), true);
    if ($input && isset($input['refresh_token'])) {
      $db = Database::getConnection();
      $stmt = $db->prepare('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = ? AND user_id = ?');
      $stmt->execute([$input['refresh_token'], $user['id']]);
    }

    $db = Database::getConnection();
    $logStmt = $db->prepare('INSERT INTO activity_logs (user_id, action, entity_type, ip_address) VALUES (?, ?, ?, ?)');
    $logStmt->execute([$user['id'], 'logout', $user['role'], $_SERVER['REMOTE_ADDR'] ?? '']);

    Response::success(null, 'Logged out successfully');
  }

  public static function refreshToken(array $params): void
  {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || !isset($input['refresh_token'])) {
      Response::error('Refresh token is required', 400);
    }

    $db = Database::getConnection();
    $stmt = $db->prepare(
      'SELECT rt.user_id, rt.token, u.id, u.is_active
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token = ? AND rt.revoked_at IS NULL AND rt.expires_at > NOW()'
    );
    $stmt->execute([$input['refresh_token']]);
    $result = $stmt->fetch();

    if (!$result) {
      Response::error('Invalid or expired refresh token', 401);
    }

    if (!$result['is_active']) {
      Response::error('Account is inactive', 401);
    }

    $db->prepare('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = ?')
       ->execute([$input['refresh_token']]);

    $newToken = AuthMiddleware::generateToken((int)$result['user_id']);
    $newRefreshToken = AuthMiddleware::generateRefreshToken((int)$result['user_id']);

    Response::success([
      'token'         => $newToken,
      'refresh_token' => $newRefreshToken,
    ], 'Token refreshed');
  }
}
