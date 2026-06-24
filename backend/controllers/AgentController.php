<?php

declare(strict_types=1);

class AgentController
{
  public static function index(array $params): void
  {
    $agents = Agent::findAll();
    Response::success($agents, 'Agents retrieved successfully');
  }

  public static function show(array $params): void
  {
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) {
      Response::error('Invalid agent ID', 400);
    }

    $agent = Agent::findById($id);
    if (!$agent) {
      Response::error('Agent not found', 404);
    }

    Response::success($agent, 'Agent retrieved successfully');
  }

  public static function showBySlug(array $params): void
  {
    $slug = $params['slug'] ?? '';
    if (!$slug) {
      Response::error('Agent slug is required', 400);
    }

    $agent = Agent::findBySlug($slug);
    if (!$agent) {
      Response::error('Agent not found', 404);
    }

    Response::success($agent, 'Agent retrieved successfully');
  }

  public static function profile(array $params): void
  {
    $user = AuthMiddleware::authenticate();

    $db = Database::getConnection();
    $stmt = $db->prepare(
      'SELECT a.*, u.email as user_email, u.name as user_name
       FROM agents a
       JOIN users u ON u.id = a.user_id
       WHERE a.user_id = ? AND a.is_active = 1'
    );
    $stmt->execute([$user['id']]);
    $agent = $stmt->fetch();

    if (!$agent) {
      Response::error('Agent profile not found', 404);
    }

    foreach (['languages', 'property_types', 'specialization', 'support_needed'] as $jsonField) {
      $agent[$jsonField] = isset($agent[$jsonField]) ? json_decode($agent[$jsonField], true) : [];
    }
    $agent['id'] = (int)$agent['id'];
    $agent['user_id'] = (int)$agent['user_id'];
    $agent['listings'] = (int)$agent['listings'];
    $agent['avatar_hue'] = (int)$agent['avatar_hue'];
    $agent['is_verified'] = (bool)$agent['is_verified'];
    $agent['is_active'] = (bool)$agent['is_active'];

    Response::success($agent, 'Profile retrieved successfully');
  }

  public static function updateProfile(array $params): void
  {
    $user = AuthMiddleware::authenticate();

    $db = Database::getConnection();
    $stmt = $db->prepare('SELECT id FROM agents WHERE user_id = ? AND is_active = 1');
    $stmt->execute([$user['id']]);
    $agent = $stmt->fetch();

    if (!$agent) {
      Response::error('Agent profile not found', 404);
    }

    $agentId = (int)$agent['id'];

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      $input = $_POST;
    }

    // Validate input
    $validator = new Validator($input);
    if (isset($input['name'])) {
      $validator->string('name', 'Full Name', 100);
    }
    if (isset($input['phone'])) {
      $validator->string('phone', 'Phone Number', 30);
    }
    if (isset($input['experience'])) {
      $validator->inArray('experience', ['1-2', '3-5', '6-10', '10+'], 'Experience');
    }
    if (isset($input['avg_monthly_listings'])) {
      $validator->inArray('avg_monthly_listings', ['1-5', '6-15', '16-30', '30+'], 'Avg Monthly Listings');
    }
    if (isset($input['avg_deal_size'])) {
      $validator->inArray('avg_deal_size', ['below-10m', '10m-50m', '50m-200m', '200m+'], 'Avg Deal Size');
    }

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $updated = Agent::update($agentId, $input);

    if (!$updated) {
      Response::error('No fields to update', 400);
    }

    // Log activity
    $logStmt = $db->prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)');
    $logStmt->execute([$user['id'], 'update_profile', 'agent', $agentId, $_SERVER['REMOTE_ADDR'] ?? '']);

    // Return updated profile
    $profile = Agent::findByUserId((int)$user['id']);
    Response::success($profile, 'Profile updated successfully');
  }

  public static function updateAvatar(array $params): void
  {
    $user = AuthMiddleware::authenticate();

    $db = Database::getConnection();
    $stmt = $db->prepare('SELECT id FROM agents WHERE user_id = ? AND is_active = 1');
    $stmt->execute([$user['id']]);
    $agent = $stmt->fetch();

    if (!$agent) {
      Response::error('Agent profile not found', 404);
    }

    $agentId = (int)$agent['id'];

    if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
      Response::error('Avatar file is required', 400);
    }

    $file = $_FILES['avatar'];
    $allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    $allowedExts = ['jpg', 'jpeg', 'png', 'webp'];
    $maxSize = 5 * 1024 * 1024; // 5MB

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $mime = mime_content_type($file['tmp_name']);

    if (!in_array($mime, $allowedTypes) || !in_array($ext, $allowedExts)) {
      Response::error('Invalid file type. Allowed: jpg, jpeg, png, webp', 422);
    }

    if ($file['size'] > $maxSize) {
      Response::error('File too large. Maximum size is 5MB', 422);
    }

    $uploadDir = __DIR__ . '/../uploads/avatars';
    if (!is_dir($uploadDir)) {
      mkdir($uploadDir, 0755, true);
    }

    $filename = 'agent_' . $agentId . '_' . uniqid() . '.' . $ext;
    $dest = $uploadDir . '/' . $filename;

    if (!move_uploaded_file($file['tmp_name'], $dest)) {
      Response::error('Failed to upload avatar', 500);
    }

    $baseUrl = rtrim($_ENV['APP_URL'] ?? 'http://localhost:8000', '/');
    $photoUrl = $baseUrl . '/uploads/avatars/' . $filename;

    Agent::updatePhoto($agentId, $photoUrl);

    $logStmt = $db->prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)');
    $logStmt->execute([$user['id'], 'update_avatar', 'agent', $agentId, $_SERVER['REMOTE_ADDR'] ?? '']);

    Response::success(['photo_url' => $photoUrl], 'Avatar updated successfully');
  }
}
