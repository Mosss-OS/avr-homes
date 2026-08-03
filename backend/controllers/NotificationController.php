<?php

declare(strict_types=1);

class NotificationController
{
  private static function auth(): array
  {
    return AuthMiddleware::authenticate();
  }

  public static function index(array $params): void
  {
    $user = self::auth();
    $db = Database::getConnection();

    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 20)));
    $offset = ($page - 1) * $perPage;

    try {
      $totalStmt = $db->prepare(
        'SELECT COUNT(*) FROM notification_recipients nr
         JOIN notifications n ON n.id = nr.notification_id
         WHERE nr.user_id = ? AND n.sent_at IS NOT NULL'
      );
      $totalStmt->execute([$user['id']]);
      $total = (int)$totalStmt->fetchColumn();

      $stmt = $db->prepare(
        'SELECT nr.id AS recipient_id, nr.is_read, nr.read_at, nr.link,
                n.id AS notification_id, n.title, n.body, n.type, n.created_at, n.sent_at
         FROM notification_recipients nr
         JOIN notifications n ON n.id = nr.notification_id
         WHERE nr.user_id = ? AND n.sent_at IS NOT NULL
         ORDER BY n.sent_at DESC
         LIMIT ? OFFSET ?'
      );
      $stmt->execute([$user['id'], $perPage, $offset]);
      $items = $stmt->fetchAll();
    } catch (PDOException $e) {
      // Notifications tables may not exist yet on this database — degrade gracefully.
      $items = [];
      $total = 0;
    }

    foreach ($items as &$item) {
      $item['recipient_id'] = (int)$item['recipient_id'];
      $item['notification_id'] = (int)$item['notification_id'];
      $item['is_read'] = (bool)$item['is_read'];
    }

    Response::success([
      'data' => $items,
      'total' => $total,
      'page' => $page,
      'total_pages' => (int)ceil($total / $perPage),
    ]);
  }

  public static function unreadCount(): void
  {
    $user = self::auth();
    $db = Database::getConnection();

    try {
      $stmt = $db->prepare(
        'SELECT COUNT(*) FROM notification_recipients nr
         JOIN notifications n ON n.id = nr.notification_id
         WHERE nr.user_id = ? AND n.sent_at IS NOT NULL AND nr.is_read = 0'
      );
      $stmt->execute([$user['id']]);
      $count = (int)$stmt->fetchColumn();
    } catch (PDOException $e) {
      // Notifications tables may not exist yet on this database — degrade gracefully.
      $count = 0;
    }

    Response::success(['count' => $count]);
  }

  public static function markAsRead(array $params): void
  {
    $user = self::auth();
    $id = (int)($params['id'] ?? 0);
    if (!$id) {
      Response::error('Recipient ID is required', 400);
    }

    $db = Database::getConnection();
    $stmt = $db->prepare(
      'UPDATE notification_recipients SET is_read = 1, read_at = NOW()
       WHERE id = ? AND user_id = ?'
    );
    $stmt->execute([$id, $user['id']]);

    Response::success(null, 'Marked as read');
  }

  public static function markAllAsRead(): void
  {
    $user = self::auth();
    $db = Database::getConnection();

    $stmt = $db->prepare(
      'UPDATE notification_recipients nr
       JOIN notifications n ON n.id = nr.notification_id
       SET nr.is_read = 1, nr.read_at = NOW()
       WHERE nr.user_id = ? AND n.sent_at IS NOT NULL AND nr.is_read = 0'
    );
    $stmt->execute([$user['id']]);

    Response::success(null, 'All notifications marked as read');
  }

  /**
   * Create an in-app notification and distribute it to the given users.
   * Each recipient may carry its own link so the frontend can deep-link
   * to the right action page per role.
   *
   * @param array<int,string|null> $recipients Map of user_id => link (or null).
   * @param string $title
   * @param string $body
   * @param string $type
   * @param int|null $createdBy Falls back to the first admin id.
   * @return int|null The notification id, or null on failure (never throws).
   */
  public static function create(array $recipients, string $title, string $body, string $type = 'notification', ?int $createdBy = null): ?int
  {
    if (!$recipients) {
      return null;
    }

    $db = null;
    try {
      $db = Database::getConnection();
      $db->beginTransaction();

      if (!$createdBy) {
        $createdByStmt = $db->query(
          "SELECT id FROM users WHERE role IN ('admin','superadmin') AND is_active = 1 ORDER BY id LIMIT 1"
        );
        $createdBy = (int)$createdByStmt->fetchColumn() ?: null;
      }

      if (!$createdBy) {
        $db->rollBack();
        return null;
      }

      $stmt = $db->prepare(
        'INSERT INTO notifications (title, body, type, target_role, created_by, scheduled_at, sent_at)
         VALUES (?, ?, ?, NULL, ?, NULL, NOW())'
      );
      $stmt->execute([$title, $body, $type, $createdBy]);
      $notificationId = (int)$db->lastInsertId();

      $insertStmt = $db->prepare(
        'INSERT INTO notification_recipients (notification_id, user_id, link)
         VALUES (?, ?, ?)'
      );
      foreach ($recipients as $userId => $link) {
        $insertStmt->execute([$notificationId, (int)$userId, $link ?: null]);
      }

      $db->commit();
      return $notificationId;
    } catch (\Throwable $e) {
      error_log('NotificationController::create failed: ' . $e->getMessage());
      if ($db && $db->inTransaction()) {
        $db->rollBack();
      }
      return null;
    }
  }
}
