<?php

declare(strict_types=1);

class SavedSearchController
{
  public static function index(array $params): void
  {
    $user = AuthMiddleware::authenticate();

    $db = Database::getConnection();
    $stmt = $db->prepare(
      "SELECT id, name, filters, alert_enabled, created_at, updated_at
       FROM saved_searches WHERE user_id = ? ORDER BY updated_at DESC"
    );
    $stmt->execute([$user['id']]);
    $searches = $stmt->fetchAll();

    foreach ($searches as &$s) {
      $s['id'] = (int)$s['id'];
      $s['alert_enabled'] = (bool)$s['alert_enabled'];
      $s['filters'] = json_decode($s['filters'] ?? '{}', true);
    }

    Response::success($searches, 'Saved searches retrieved');
  }

  public static function store(array $params): void
  {
    $user = AuthMiddleware::authenticate();

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      Response::error('Invalid request body', 400);
    }

    $name = trim($input['name'] ?? 'Untitled Search');
    $filters = $input['filters'] ?? [];
    $alertEnabled = isset($input['alert_enabled']) ? ($input['alert_enabled'] ? 1 : 0) : 1;

    $db = Database::getConnection();
    $stmt = $db->prepare(
      "INSERT INTO saved_searches (user_id, name, filters, alert_enabled)
       VALUES (:user_id, :name, :filters, :alert_enabled)"
    );
    $stmt->execute([
      ':user_id'       => $user['id'],
      ':name'          => $name,
      ':filters'       => json_encode($filters),
      ':alert_enabled' => $alertEnabled,
    ]);

    $id = (int)$db->lastInsertId();
    $stmt = $db->prepare("SELECT * FROM saved_searches WHERE id = ?");
    $stmt->execute([$id]);
    $search = $stmt->fetch();
    $search['id'] = (int)$search['id'];
    $search['alert_enabled'] = (bool)$search['alert_enabled'];
    $search['filters'] = json_decode($search['filters'] ?? '{}', true);

    Response::success($search, 'Search saved', 201);
  }

  public static function update(array $params): void
  {
    $user = AuthMiddleware::authenticate();
    $id = (int)($params['id'] ?? 0);

    $db = Database::getConnection();
    $stmt = $db->prepare("SELECT id FROM saved_searches WHERE id = ? AND user_id = ?");
    $stmt->execute([$id, $user['id']]);
    if (!$stmt->fetch()) {
      Response::error('Saved search not found', 404);
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      Response::error('Invalid request body', 400);
    }

    $fields = [];
    $bindings = [':id' => $id];

    if (isset($input['name'])) {
      $fields[] = 'name = :name';
      $bindings[':name'] = trim($input['name']);
    }
    if (isset($input['filters'])) {
      $fields[] = 'filters = :filters';
      $bindings[':filters'] = json_encode($input['filters']);
    }
    if (isset($input['alert_enabled'])) {
      $fields[] = 'alert_enabled = :alert_enabled';
      $bindings[':alert_enabled'] = $input['alert_enabled'] ? 1 : 0;
    }

    if (empty($fields)) {
      Response::error('No valid fields to update', 400);
    }

    $sql = "UPDATE saved_searches SET " . implode(', ', $fields) . " WHERE id = :id";
    $stmt = $db->prepare($sql);
    $stmt->execute($bindings);

    $stmt = $db->prepare("SELECT * FROM saved_searches WHERE id = ?");
    $stmt->execute([$id]);
    $search = $stmt->fetch();
    $search['id'] = (int)$search['id'];
    $search['alert_enabled'] = (bool)$search['alert_enabled'];
    $search['filters'] = json_decode($search['filters'] ?? '{}', true);

    Response::success($search, 'Saved search updated');
  }

  public static function destroy(array $params): void
  {
    $user = AuthMiddleware::authenticate();
    $id = (int)($params['id'] ?? 0);

    $db = Database::getConnection();
    $stmt = $db->prepare("SELECT id FROM saved_searches WHERE id = ? AND user_id = ?");
    $stmt->execute([$id, $user['id']]);
    if (!$stmt->fetch()) {
      Response::error('Saved search not found', 404);
    }

    $stmt = $db->prepare("DELETE FROM saved_searches WHERE id = ?");
    $stmt->execute([$id]);

    Response::success(null, 'Saved search deleted');
  }
}
