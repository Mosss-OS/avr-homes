<?php

declare(strict_types=1);

class AdminAnnouncementController
{
  private static function adminAuth(): array
  {
    $user = AuthMiddleware::authenticate();
    if (!in_array($user['role'] ?? '', ['admin', 'super_admin'])) {
      Response::error('Unauthorized', 403);
    }
    return $user;
  }

  public static function index(array $params): void
  {
    self::adminAuth();
    $db = Database::getConnection();

    $page = max(1, (int)($params['page'] ?? 1));
    $perPage = 20;
    $offset = ($page - 1) * $perPage;

    $totalStmt = $db->query('SELECT COUNT(*) FROM notifications');
    $total = (int)$totalStmt->fetchColumn();

    $stmt = $db->prepare(
      'SELECT n.*, u.full_name AS created_by_name,
        (SELECT COUNT(*) FROM notification_recipients nr WHERE nr.notification_id = n.id) AS recipient_count,
        (SELECT COUNT(*) FROM notification_recipients nr WHERE nr.notification_id = n.id AND nr.is_read = 1) AS read_count
       FROM notifications n
       JOIN users u ON u.id = n.created_by
       ORDER BY n.created_at DESC
       LIMIT ? OFFSET ?'
    );
    $stmt->execute([$perPage, $offset]);
    $items = $stmt->fetchAll();

    foreach ($items as &$item) {
      $item['id'] = (int)$item['id'];
      $item['created_by'] = (int)$item['created_by'];
      $item['recipient_count'] = (int)$item['recipient_count'];
      $item['read_count'] = (int)$item['read_count'];
    }

    Response::success([
      'data' => $items,
      'total' => $total,
      'page' => $page,
      'total_pages' => (int)ceil($total / $perPage),
    ]);
  }

  public static function show(array $params): void
  {
    self::adminAuth();
    $id = (int)($params['id'] ?? 0);
    if (!$id) {
      Response::error('Notification ID is required', 400);
    }

    $db = Database::getConnection();
    $stmt = $db->prepare(
      'SELECT n.*, u.full_name AS created_by_name
       FROM notifications n
       JOIN users u ON u.id = n.created_by
       WHERE n.id = ?'
    );
    $stmt->execute([$id]);
    $notification = $stmt->fetch();

    if (!$notification) {
      Response::error('Notification not found', 404);
    }

    $notification['id'] = (int)$notification['id'];
    $notification['created_by'] = (int)$notification['created_by'];

    // Get delivery stats per role for display
    $statsStmt = $db->prepare(
      'SELECT
        (SELECT COUNT(*) FROM notification_recipients WHERE notification_id = ?) AS total_sent,
        (SELECT COUNT(*) FROM notification_recipients WHERE notification_id = ? AND is_read = 1) AS total_read'
    );
    $statsStmt->execute([$id, $id]);
    $stats = $statsStmt->fetch();

    Response::success([
      'notification' => $notification,
      'stats' => $stats,
    ]);
  }

  public static function store(array $params): void
  {
    $user = self::adminAuth();

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      $input = $_POST;
    }

    $validator = new Validator($input);
    $validator
      ->required('title', 'Title')
      ->string('title', 'Title', 255)
      ->required('body', 'Message body');

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $data = $validator->validated();
    $targetRole = $input['target_role'] ?? null;
    $scheduledAt = $input['scheduled_at'] ?? null;

    $db = Database::getConnection();
    $db->beginTransaction();

    try {
      $stmt = $db->prepare(
        'INSERT INTO notifications (title, body, type, target_role, created_by, scheduled_at)
         VALUES (?, ?, ?, ?, ?, ?)'
      );
      $stmt->execute([
        $data['title'],
        $data['body'],
        $input['type'] ?? 'announcement',
        $targetRole,
        $user['id'],
        $scheduledAt,
      ]);
      $notificationId = (int)$db->lastInsertId();

      // Build recipient list based on target role
      if ($targetRole) {
        $userStmt = $db->prepare('SELECT id FROM users WHERE role = ?');
        $userStmt->execute([$targetRole]);
      } else {
        $userStmt = $db->query('SELECT id FROM users');
      }

      $recipientIds = [];
      $insertStmt = $db->prepare(
        'INSERT INTO notification_recipients (notification_id, user_id) VALUES (?, ?)'
      );

      foreach ($userStmt->fetchAll() as $recipient) {
        $recipientIds[] = (int)$recipient['id'];
        $insertStmt->execute([$notificationId, (int)$recipient['id']]);
      }

      // Mark as sent (unless scheduled)
      if (!$scheduledAt) {
        $db->prepare('UPDATE notifications SET sent_at = NOW() WHERE id = ?')
          ->execute([$notificationId]);
      }

      $db->commit();

      Response::success([
        'id' => $notificationId,
        'recipient_count' => count($recipientIds),
      ], 'Announcement sent', 201);
    } catch (Exception $e) {
      $db->rollBack();
      Response::error('Failed to create announcement: ' . $e->getMessage(), 500);
    }
  }

  public static function destroy(array $params): void
  {
    self::adminAuth();
    $id = (int)($params['id'] ?? 0);
    if (!$id) {
      Response::error('Notification ID is required', 400);
    }

    $db = Database::getConnection();
    $stmt = $db->prepare('DELETE FROM notifications WHERE id = ?');
    $stmt->execute([$id]);

    Response::success(null, 'Announcement deleted');
  }
}
