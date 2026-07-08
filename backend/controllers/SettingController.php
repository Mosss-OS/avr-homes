<?php

declare(strict_types=1);

/**
 * Settings management endpoints.
 *
 * @package AVRHomes\Controllers
 */

/**
 * Controller for managing application settings.
 *
 * Provides read (public) and update (admin-only) access to
 * key-value configuration settings stored in the database.
 *
 * @package AVRHomes\Controllers
 */
class SettingController
{
  /**
   * Retrieve all application settings as key-value pairs.
   *
   * @param array $params Route parameters (unused).
   *
   * @return void
   */
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

  /**
   * Update application settings (admin only).
   *
   * Accepts a JSON object of key-value pairs and upserts them
   * into the settings table.
   *
   * @param array $params Route parameters (unused).
   *
   * @return void
   */
  public static function update(array $params): void
  {
    AuthMiddleware::authenticateAdmin();

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
