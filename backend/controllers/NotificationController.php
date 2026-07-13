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

    $page = max(1, (int)($params['page'] ?? 1));
    $perPage = 20;
    $offset = ($page - 1) * $perPage;

    $totalStmt = $db->prepare(
      'SELECT COUNT(*) FROM notification_recipients nr
       JOIN notifications n ON n.id = nr.notification_id
       WHERE nr.user_id = ? AND n.sent_at IS NOT NULL'
    );
    $totalStmt->execute([$user['id']]);
    $total = (int)$totalStmt->fetchColumn();

    $stmt = $db->prepare(
      'SELECT nr.id AS recipient_id, nr.is_read, nr.read_at,
              n.id AS notification_id, n.title, n.body, n.type, n.created_at, n.sent_at
       FROM notification_recipients nr
       JOIN notifications n ON n.id = nr.notification_id
       WHERE nr.user_id = ? AND n.sent_at IS NOT NULL
       ORDER BY n.sent_at DESC
       LIMIT ? OFFSET ?'
    );
    $stmt->execute([$user['id'], $perPage, $offset]);
    $items = $stmt->fetchAll();

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

    $stmt = $db->prepare(
      'SELECT COUNT(*) FROM notification_recipients nr
       JOIN notifications n ON n.id = nr.notification_id
       WHERE nr.user_id = ? AND n.sent_at IS NOT NULL AND nr.is_read = 0'
    );
    $stmt->execute([$user['id']]);
    $count = (int)$stmt->fetchColumn();

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
}
