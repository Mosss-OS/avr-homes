<?php

declare(strict_types=1);

class SavedSearchController
{
  /* ── Agent/User routes ────────────────────────────────── */

  public static function index(array $params): void
  {
    $user = AuthMiddleware::authenticate();
    $db = Database::getConnection();
    $stmt = $db->prepare("SELECT * FROM saved_searches WHERE user_id = ? ORDER BY created_at DESC");
    $stmt->execute([$user['id']]);
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) {
      $r['id'] = (int)$r['id'];
      $r['user_id'] = (int)$r['user_id'];
      $r['alert_enabled'] = (bool)$r['alert_enabled'];
      $r['filters'] = json_decode($r['filters'], true);
    }
    Response::success($rows, 'Saved searches retrieved');
  }

  public static function store(array $params): void
  {
    $user = AuthMiddleware::authenticate();
    $input = json_decode(file_get_contents('php://input'), true);
    $db = Database::getConnection();
    $stmt = $db->prepare("INSERT INTO saved_searches (user_id, name, filters, alert_enabled) VALUES (?, ?, ?, ?)");
    $stmt->execute([
      $user['id'],
      $input['name'] ?? 'Untitled Search',
      json_encode($input['filters'] ?? []),
      isset($input['alert_enabled']) ? ($input['alert_enabled'] ? 1 : 0) : 1,
    ]);
    Response::success(['id' => (int)$db->lastInsertId()], 'Search saved', 201);
  }

  public static function update(array $params): void
  {
    $user = AuthMiddleware::authenticate();
    $id = (int)($params['id'] ?? 0);
    $input = json_decode(file_get_contents('php://input'), true);

    $db = Database::getConnection();
    $fields = []; $binds = [];
    if (isset($input['name'])) { $fields[] = 'name = ?'; $binds[] = $input['name']; }
    if (isset($input['alert_enabled'])) { $fields[] = 'alert_enabled = ?'; $binds[] = $input['alert_enabled'] ? 1 : 0; }
    if (isset($input['filters'])) { $fields[] = 'filters = ?'; $binds[] = json_encode($input['filters']); }
    if (empty($fields)) { Response::error('No fields to update', 400); return; }
    $binds[] = $id; $binds[] = $user['id'];
    $db->prepare("UPDATE saved_searches SET " . implode(', ', $fields) . " WHERE id = ? AND user_id = ?")->execute($binds);
    Response::success([], 'Search updated');
  }

  public static function destroy(array $params): void
  {
    $user = AuthMiddleware::authenticate();
    $id = (int)($params['id'] ?? 0);
    $db = Database::getConnection();
    $db->prepare("DELETE FROM saved_searches WHERE id = ? AND user_id = ?")->execute([$id, $user['id']]);
    Response::success([], 'Search deleted');
  }

  /* ── Admin routes ─────────────────────────────────────── */

  public static function adminIndex(array $params): void
  {
    AuthMiddleware::authenticateAgent();
    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 20)));
    $q = trim($_GET['q'] ?? '');
    $alertOnly = $_GET['alert_enabled'] ?? '';

    $db = Database::getConnection();
    $where = '';
    $binds = [];
    if ($q) { $where .= ' AND (u.name LIKE ? OR u.email LIKE ? OR s.name LIKE ?)'; $like = "%{$q}%"; $binds = [$like, $like, $like]; }
    if ($alertOnly === '1') $where .= ' AND s.alert_enabled = 1';

    $countStmt = $db->prepare("SELECT COUNT(*) FROM saved_searches s LEFT JOIN users u ON u.id = s.user_id WHERE 1=1 {$where}");
    $countStmt->execute($binds);
    $total = (int)$countStmt->fetchColumn();

    $offset = ($page - 1) * $perPage;
    $stmt = $db->prepare(
      "SELECT s.*, u.name as user_name, u.email as user_email
       FROM saved_searches s
       LEFT JOIN users u ON u.id = s.user_id
       WHERE 1=1 {$where}
       ORDER BY s.created_at DESC LIMIT {$perPage} OFFSET {$offset}"
    );
    $stmt->execute($binds);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$r) {
      $r['id'] = (int)$r['id'];
      $r['user_id'] = (int)$r['user_id'];
      $r['alert_enabled'] = (bool)$r['alert_enabled'];
      $r['filters'] = json_decode($r['filters'], true);
    }

    Response::success([
      'data' => $rows, 'total' => $total, 'total_pages' => (int)ceil($total / $perPage),
    ], 'Saved searches retrieved');
  }

  public static function adminDelete(array $params): void
  {
    AuthMiddleware::authenticateAgent();
    $id = (int)($params['id'] ?? 0);
    if (!$id) Response::error('Search ID required', 400);
    $db = Database::getConnection();
    $db->prepare("DELETE FROM saved_searches WHERE id = ?")->execute([$id]);
    Response::success([], 'Search deleted');
  }
}
