<?php

declare(strict_types=1);

class OffPlanController
{
  /** Look up the agent record ID from the authenticated user. */
  private static function getAgentId(): int
  {
    $user = AuthMiddleware::authenticate();
    $db = Database::getConnection();
    $stmt = $db->prepare('SELECT id FROM agents WHERE user_id = ? AND is_active = 1');
    $stmt->execute([$user['id']]);
    $agent = $stmt->fetch();
    if (!$agent) {
      Response::error('Agent profile not found', 404);
    }
    return (int)$agent['id'];
  }

  /**
   * List off-plan progress updates for a property (public).
   */
  public static function index(array $params): void
  {
    $propertyId = (int)($params['id'] ?? 0);
    if (!$propertyId) {
      Response::error('Property ID is required', 400);
    }

    $db = Database::getConnection();
    $stmt = $db->prepare(
      'SELECT id, property_id, month_number, title, description, images, videos, created_at, updated_at
       FROM off_plan_progress
       WHERE property_id = ?
       ORDER BY month_number ASC'
    );
    $stmt->execute([$propertyId]);
    $items = $stmt->fetchAll();

    foreach ($items as &$item) {
      $item['id'] = (int)$item['id'];
      $item['property_id'] = (int)$item['property_id'];
      $item['month_number'] = (int)$item['month_number'];
      $item['images'] = $item['images'] ? json_decode($item['images'], true) : [];
      $item['videos'] = $item['videos'] ? json_decode($item['videos'], true) : [];
    }

    Response::success($items, 'Progress updates retrieved');
  }

  /**
   * List progress updates for agent's own property.
   */
  public static function agentIndex(array $params): void
  {
    $agentId = self::getAgentId();
    $propertyId = (int)($params['propertyId'] ?? 0);
    if (!$propertyId) {
      Response::error('Property ID is required', 400);
    }

    $db = Database::getConnection();
    $stmt = $db->prepare('SELECT id FROM properties WHERE id = ? AND agent_id = ?');
    $stmt->execute([$propertyId, $agentId]);
    if (!$stmt->fetch()) {
      Response::error('Property not found or not yours', 404);
    }

    $stmt = $db->prepare(
      'SELECT id, property_id, month_number, title, description, images, videos, created_at, updated_at
       FROM off_plan_progress
       WHERE property_id = ?
       ORDER BY month_number ASC'
    );
    $stmt->execute([$propertyId]);
    $items = $stmt->fetchAll();

    foreach ($items as &$item) {
      $item['id'] = (int)$item['id'];
      $item['property_id'] = (int)$item['property_id'];
      $item['month_number'] = (int)$item['month_number'];
      $item['images'] = $item['images'] ? json_decode($item['images'], true) : [];
      $item['videos'] = $item['videos'] ? json_decode($item['videos'], true) : [];
    }

    Response::success($items, 'Progress updates retrieved');
  }

  /**
   * Add a progress update for an off-plan property.
   */
  public static function store(array $params): void
  {
    $agentId = self::getAgentId();
    $propertyId = (int)($params['propertyId'] ?? 0);
    if (!$propertyId) {
      Response::error('Property ID is required', 400);
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      $input = $_POST;
    }

    $validator = new Validator($input);
    $validator
      ->required('title', 'Title')
      ->required('month_number', 'Month number')
      ->numeric('month_number', 'Month number');

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $data = $validator->validated();

    $db = Database::getConnection();

    $stmt = $db->prepare('SELECT id, is_off_plan FROM properties WHERE id = ? AND agent_id = ?');
    $stmt->execute([$propertyId, $agentId]);
    $property = $stmt->fetch();
    if (!$property) {
      Response::error('Property not found or not yours', 404);
    }

    $stmt = $db->prepare(
      'INSERT INTO off_plan_progress (property_id, month_number, title, description, images, videos)
       VALUES (?, ?, ?, ?, ?, ?)'
    );

    $images = isset($data['images']) ? json_encode($data['images']) : '[]';
    $videos = isset($data['videos']) ? json_encode($data['videos']) : '[]';

    $stmt->execute([
      $propertyId,
      (int)$data['month_number'],
      $data['title'],
      $data['description'] ?? null,
      $images,
      $videos,
    ]);

    $id = (int)$db->lastInsertId();

    Response::success(['id' => $id], 'Progress update added', 201);
  }

  /**
   * Update a progress update.
   */
  public static function update(array $params): void
  {
    $agentId = self::getAgentId();

    $id = (int)($params['id'] ?? 0);
    if (!$id) {
      Response::error('Progress ID is required', 400);
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      $input = $_POST;
    }

    $db = Database::getConnection();

    $stmt = $db->prepare(
      'SELECT op.id FROM off_plan_progress op
       JOIN properties p ON p.id = op.property_id
       WHERE op.id = ? AND p.agent_id = ?'
    );
    $stmt->execute([$id, $agentId]);
    if (!$stmt->fetch()) {
      Response::error('Progress update not found or not yours', 404);
    }

    $fields = [];
    $bindings = [];

    foreach (['month_number', 'title', 'description'] as $field) {
      if (isset($input[$field])) {
        $fields[] = "{$field} = ?";
        $bindings[] = $input[$field];
      }
    }

    if (isset($input['images'])) {
      $fields[] = "images = ?";
      $bindings[] = json_encode($input['images']);
    }

    if (isset($input['videos'])) {
      $fields[] = "videos = ?";
      $bindings[] = json_encode($input['videos']);
    }

    if (empty($fields)) {
      Response::error('No fields to update', 400);
    }

    $bindings[] = $id;
    $db->prepare("UPDATE off_plan_progress SET " . implode(', ', $fields) . " WHERE id = ?")->execute($bindings);

    Response::success(['id' => $id], 'Progress update updated');
  }

  /**
   * Delete a progress update.
   */
  public static function destroy(array $params): void
  {
    $agentId = self::getAgentId();

    $id = (int)($params['id'] ?? 0);
    if (!$id) {
      Response::error('Progress ID is required', 400);
    }

    $db = Database::getConnection();

    $stmt = $db->prepare(
      'SELECT op.id FROM off_plan_progress op
       JOIN properties p ON p.id = op.property_id
       WHERE op.id = ? AND p.agent_id = ?'
    );
    $stmt->execute([$id, $agentId]);
    if (!$stmt->fetch()) {
      Response::error('Progress update not found or not yours', 404);
    }

    $db->prepare("DELETE FROM off_plan_progress WHERE id = ?")->execute([$id]);

    Response::success(null, 'Progress update deleted');
  }

  // ─── Admin endpoints (no agent_id ownership check) ─────────────────

  /**
   * Admin: list progress updates for any property.
   */
  public static function adminIndex(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $propertyId = (int)($params['propertyId'] ?? 0);
    if (!$propertyId) {
      Response::error('Property ID is required', 400);
    }

    $db = Database::getConnection();
    $stmt = $db->prepare(
      'SELECT id, property_id, month_number, title, description, images, videos, created_at, updated_at
       FROM off_plan_progress
       WHERE property_id = ?
       ORDER BY month_number ASC'
    );
    $stmt->execute([$propertyId]);
    $items = $stmt->fetchAll();

    foreach ($items as &$item) {
      $item['id'] = (int)$item['id'];
      $item['property_id'] = (int)$item['property_id'];
      $item['month_number'] = (int)$item['month_number'];
      $item['images'] = $item['images'] ? json_decode($item['images'], true) : [];
      $item['videos'] = $item['videos'] ? json_decode($item['videos'], true) : [];
    }

    Response::success($items, 'Progress updates retrieved');
  }

  /**
   * Admin: add a progress update to any property.
   */
  public static function adminStore(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $propertyId = (int)($params['propertyId'] ?? 0);
    if (!$propertyId) {
      Response::error('Property ID is required', 400);
    }

    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $validator = new Validator($input);
    $validator
      ->required('title', 'Title')
      ->required('month_number', 'Month number')
      ->numeric('month_number', 'Month number');

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $data = $validator->validated();
    $db = Database::getConnection();

    $stmt = $db->prepare(
      'INSERT INTO off_plan_progress (property_id, month_number, title, description, images, videos)
       VALUES (?, ?, ?, ?, ?, ?)'
    );

    $images = isset($data['images']) ? json_encode($data['images']) : '[]';
    $videos = isset($data['videos']) ? json_encode($data['videos']) : '[]';

    $stmt->execute([
      $propertyId,
      (int)$data['month_number'],
      $data['title'],
      $data['description'] ?? null,
      $images,
      $videos,
    ]);

    Response::success(['id' => (int)$db->lastInsertId()], 'Progress update added', 201);
  }

  /**
   * Admin: delete any progress update.
   */
  public static function adminDestroy(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if (!$id) {
      Response::error('Progress ID is required', 400);
    }

    Database::getConnection()->prepare("DELETE FROM off_plan_progress WHERE id = ?")->execute([$id]);

    Response::success(null, 'Progress update deleted');
  }
}
