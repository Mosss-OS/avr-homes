<?php

declare(strict_types=1);

class EmailTemplateController
{
  private static function getDb(): PDO
  {
    return Database::getConnection();
  }

  /* ── Templates ─────────────────────────────────────────── */

  public static function adminTemplates(array $params): void
  {
    AuthMiddleware::authenticateAgent();
    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 20)));
    $category = $_GET['category'] ?? '';

    $db = self::getDb();
    $where = '';
    $binds = [];
    if ($category) { $where .= ' AND category = ?'; $binds[] = $category; }

    $countStmt = $db->prepare("SELECT COUNT(*) FROM email_templates WHERE 1=1 {$where}");
    $countStmt->execute($binds);
    $total = (int)$countStmt->fetchColumn();

    $offset = ($page - 1) * $perPage;
    $stmt = $db->prepare("SELECT * FROM email_templates WHERE 1=1 {$where} ORDER BY is_system DESC, name ASC LIMIT {$perPage} OFFSET {$offset}");
    $stmt->execute($binds);
    $templates = $stmt->fetchAll();

    foreach ($templates as &$t) {
      $t['id'] = (int)$t['id'];
      $t['is_system'] = (bool)$t['is_system'];
      $t['is_active'] = (bool)$t['is_active'];
      $t['variables'] = $t['variables'] ? json_decode($t['variables'], true) : [];
    }

    Response::success(['data' => $templates, 'total' => $total, 'total_pages' => (int)ceil($total / $perPage)], 'Templates retrieved');
  }

  public static function adminCreateTemplate(array $params): void
  {
    AuthMiddleware::authenticateAgent();
    $input = json_decode(file_get_contents('php://input'), true);

    $validator = new Validator($input);
    $validator->required('name', 'Name')->required('subject', 'Subject')->required('body', 'Body');
    if ($validator->fails()) { Response::error('Validation failed', 422, $validator->getErrors()); }

    $data = $validator->validated();
    $db = self::getDb();
    $stmt = $db->prepare("INSERT INTO email_templates (name, subject, body, variables, category, is_active) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([
      $data['name'], $data['subject'], $data['body'],
      isset($data['variables']) ? json_encode($data['variables']) : null,
      $data['category'] ?? 'general',
      isset($data['is_active']) ? ($data['is_active'] ? 1 : 0) : 1,
    ]);

    Response::success(['id' => (int)$db->lastInsertId()], 'Template created', 201);
  }

  public static function adminUpdateTemplate(array $params): void
  {
    AuthMiddleware::authenticateAgent();
    $id = (int)($params['id'] ?? 0);
    if (!$id) Response::error('Template ID required', 400);

    $input = json_decode(file_get_contents('php://input'), true);
    $db = self::getDb();

    $fields = [];
    $binds = [];
    foreach (['name', 'subject', 'body', 'category'] as $f) {
      if (array_key_exists($f, $input)) { $fields[] = "{$f} = ?"; $binds[] = $input[$f]; }
    }
    if (array_key_exists('is_active', $input)) { $fields[] = 'is_active = ?'; $binds[] = $input['is_active'] ? 1 : 0; }
    if (array_key_exists('variables', $input)) { $fields[] = 'variables = ?'; $binds[] = json_encode($input['variables']); }

    if (empty($fields)) { Response::error('No fields to update', 400); return; }
    $binds[] = $id;
    $db->prepare("UPDATE email_templates SET " . implode(', ', $fields) . " WHERE id = ?")->execute($binds);

    Response::success([], 'Template updated');
  }

  public static function adminDeleteTemplate(array $params): void
  {
    AuthMiddleware::authenticateAgent();
    $id = (int)($params['id'] ?? 0);
    if (!$id) Response::error('Template ID required', 400);

    $db = self::getDb();
    $stmt = $db->prepare("SELECT is_system FROM email_templates WHERE id = ?");
    $stmt->execute([$id]);
    $t = $stmt->fetch();
    if (!$t) Response::error('Template not found', 404);
    if ($t['is_system']) Response::error('System templates cannot be deleted', 422);

    $db->prepare("DELETE FROM email_templates WHERE id = ?")->execute([$id]);
    Response::success([], 'Template deleted');
  }

  /* ── Broadcasts ────────────────────────────────────────── */

  public static function adminBroadcasts(array $params): void
  {
    AuthMiddleware::authenticateAgent();
    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 20)));
    $status = $_GET['status'] ?? '';

    $db = self::getDb();
    $where = '';
    $binds = [];
    if ($status) { $where .= ' AND status = ?'; $binds[] = $status; }

    $countStmt = $db->prepare("SELECT COUNT(*) FROM email_broadcasts WHERE 1=1 {$where}");
    $countStmt->execute($binds);
    $total = (int)$countStmt->fetchColumn();

    $offset = ($page - 1) * $perPage;
    $stmt = $db->prepare("SELECT eb.*, u.name as created_by_name FROM email_broadcasts eb LEFT JOIN users u ON u.id = eb.created_by WHERE 1=1 {$where} ORDER BY eb.created_at DESC LIMIT {$perPage} OFFSET {$offset}");
    $stmt->execute($binds);
    $broadcasts = $stmt->fetchAll();

    foreach ($broadcasts as &$b) {
      $b['id'] = (int)$b['id'];
      $b['sent_count'] = (int)$b['sent_count'];
      $b['created_by'] = (int)$b['created_by'];
    }

    Response::success(['data' => $broadcasts, 'total' => $total, 'total_pages' => (int)ceil($total / $perPage)], 'Broadcasts retrieved');
  }

  public static function adminCreateBroadcast(array $params): void
  {
    $user = AuthMiddleware::authenticateAgent();
    $input = json_decode(file_get_contents('php://input'), true);

    $validator = new Validator($input);
    $validator->required('subject', 'Subject')->required('body', 'Body');
    if ($validator->fails()) { Response::error('Validation failed', 422, $validator->getErrors()); }

    $data = $validator->validated();
    $db = self::getDb();
    $stmt = $db->prepare("INSERT INTO email_broadcasts (subject, body, recipient_filter, status, scheduled_at, created_by) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([
      $data['subject'], $data['body'],
      $data['recipient_filter'] ?? 'all',
      $data['status'] ?? 'draft',
      $data['scheduled_at'] ?? null,
      $user['id'],
    ]);

    Response::success(['id' => (int)$db->lastInsertId()], 'Broadcast created', 201);
  }

  public static function adminUpdateBroadcast(array $params): void
  {
    AuthMiddleware::authenticateAgent();
    $id = (int)($params['id'] ?? 0);
    if (!$id) Response::error('Broadcast ID required', 400);

    $input = json_decode(file_get_contents('php://input'), true);
    $db = self::getDb();

    $stmt = $db->prepare("SELECT status FROM email_broadcasts WHERE id = ?");
    $stmt->execute([$id]);
    $b = $stmt->fetch();
    if (!$b) Response::error('Broadcast not found', 404);
    if ($b['status'] === 'sent') Response::error('Cannot modify a sent broadcast', 422);

    $fields = [];
    $binds = [];
    foreach (['subject', 'body', 'recipient_filter', 'scheduled_at'] as $f) {
      if (array_key_exists($f, $input)) { $fields[] = "{$f} = ?"; $binds[] = $input[$f]; }
    }
    if (array_key_exists('status', $input)) { $fields[] = 'status = ?'; $binds[] = $input['status']; }

    if (empty($fields)) { Response::error('No fields to update', 400); return; }
    $binds[] = $id;
    $db->prepare("UPDATE email_broadcasts SET " . implode(', ', $fields) . " WHERE id = ?")->execute($binds);

    if (($input['status'] ?? '') === 'sent') {
      $db->prepare("UPDATE email_broadcasts SET sent_at = NOW(), status = 'sent' WHERE id = ?")->execute([$id]);
    }

    Response::success([], 'Broadcast updated');
  }
}
