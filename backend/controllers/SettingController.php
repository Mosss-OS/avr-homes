<?php

declare(strict_types=1);

class SettingController
{
  public static function index(array $params): void
  {
    $db = Database::getConnection();
    $stmt = $db->query('SELECT `key`, `value` FROM settings');
    $rows = $stmt->fetchAll();

    $settings = [];
    foreach ($rows as $row) {
      $settings[$row['key']] = $row['value'];
    }

    Response::success($settings, 'Settings retrieved successfully');
  }

  public static function update(array $params): void
  {
    $user = AuthMiddleware::authenticate();

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || empty($input)) {
      Response::error('No settings provided', 400);
    }

    $db = Database::getConnection();
    $stmt = $db->prepare('INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)');

    foreach ($input as $key => $value) {
      $stmt->execute([$key, (string)$value]);
    }

    // Log activity
    $logStmt = $db->prepare('INSERT INTO activity_logs (user_id, action, entity_type, ip_address) VALUES (?, ?, ?, ?)');
    $logStmt->execute([$user['id'], 'update_settings', 'settings', $_SERVER['REMOTE_ADDR'] ?? '']);

    self::index($params);
  }
}
