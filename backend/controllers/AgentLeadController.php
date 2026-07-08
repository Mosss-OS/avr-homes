<?php

declare(strict_types=1);

/**
 * AgentLeadController
 *
 * Handles lead (inquiry) management for authenticated agents, including
 * listing, viewing, marking as read, updating status and notes, and
 * retrieving unread counts.
 */
class AgentLeadController
{
  /**
   * Get the authenticated agent's ID from the users table.
   *
   * @param int $userId The authenticated user's ID.
   * @return int The agent's ID.
   */
  private static function getAgentId(int $userId): int
  {
    $db = Database::getConnection();
    $stmt = $db->prepare('SELECT id FROM agents WHERE user_id = ? AND is_active = 1');
    $stmt->execute([$userId]);
    $agent = $stmt->fetch();
    if (!$agent) {
      Response::error('Agent profile not found. Complete your profile first.', 404);
    }
    return (int)$agent['id'];
  }

  /**
   * List leads (inquiries) for the authenticated agent with filtering and pagination.
   *
   * @param array $params Request parameters (unused).
   * @return void
   */
  public static function index(array $params): void
  {
    $user = AuthMiddleware::authenticate();
    $agentId = self::getAgentId((int)$user['id']);

    $page     = max(1, (int)($_GET['page'] ?? 1));
    $perPage  = min(100, max(1, (int)($_GET['per_page'] ?? 20)));
    $status   = $_GET['status'] ?? null;
    $property = isset($_GET['property_id']) ? (int)$_GET['property_id'] : null;
    $dateFrom = $_GET['date_from'] ?? null;
    $dateTo   = $_GET['date_to'] ?? null;
    $search   = $_GET['search'] ?? null;

    $db = Database::getConnection();
    $conditions = ['p.agent_id = ?'];
    $bindings = [$agentId];

    if ($status && in_array($status, ['new', 'contacted', 'qualified', 'closed'])) {
      $conditions[] = 'i.status = ?';
      $bindings[] = $status;
    }

    if ($property) {
      $conditions[] = 'i.property_id = ?';
      $bindings[] = $property;
    }

    if ($dateFrom) {
      $conditions[] = 'i.created_at >= ?';
      $bindings[] = $dateFrom . ' 00:00:00';
    }

    if ($dateTo) {
      $conditions[] = 'i.created_at <= ?';
      $bindings[] = $dateTo . ' 23:59:59';
    }

    if ($search) {
      $conditions[] = '(i.name LIKE ? OR i.email LIKE ? OR i.phone LIKE ? OR i.message LIKE ?)';
      $s = '%' . $search . '%';
      $bindings[] = $s;
      $bindings[] = $s;
      $bindings[] = $s;
      $bindings[] = $s;
    }

    $where = 'WHERE ' . implode(' AND ', $conditions);

    $countStmt = $db->prepare(
      "SELECT COUNT(*) FROM inquiries i
       JOIN properties p ON i.property_id = p.id
       {$where}"
    );
    $countStmt->execute($bindings);
    $total = (int)$countStmt->fetchColumn();

    $offset = ($page - 1) * $perPage;
    $stmt = $db->prepare(
      "SELECT i.*, p.title as property_title, p.slug as property_slug,
              p.type as property_type, p.purpose as property_purpose,
              p.price as property_price, p.image as property_image,
              p.city as property_city, p.community as property_community
       FROM inquiries i
       JOIN properties p ON i.property_id = p.id
       {$where}
       ORDER BY i.created_at DESC
       LIMIT {$perPage} OFFSET {$offset}"
    );
    $stmt->execute($bindings);
    $leads = $stmt->fetchAll();

    foreach ($leads as &$lead) {
      $lead['id'] = (int)$lead['id'];
      $lead['property_id'] = $lead['property_id'] ? (int)$lead['property_id'] : null;
      $lead['is_read'] = (bool)$lead['is_read'];
      $lead['property_price'] = $lead['property_price'] ? (int)$lead['property_price'] : null;
    }

    Response::success([
      'data'        => $leads,
      'total'       => $total,
      'page'        => $page,
      'per_page'    => $perPage,
      'total_pages' => (int)ceil($total / $perPage),
    ], 'Leads retrieved successfully');
  }

  /**
   * Get a single lead by ID.
   *
   * @param array $params Must contain 'id'.
   * @return void
   */
  public static function show(array $params): void
  {
    $user = AuthMiddleware::authenticate();
    $agentId = self::getAgentId((int)$user['id']);

    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) {
      Response::error('Invalid lead ID', 400);
    }

    $db = Database::getConnection();
    $stmt = $db->prepare(
      "SELECT i.*, p.title as property_title, p.slug as property_slug,
              p.type as property_type, p.purpose as property_purpose,
              p.price as property_price, p.image as property_image,
              p.city as property_city, p.community as property_community,
              p.address as property_address, p.beds as property_beds,
              p.baths as property_baths, p.area as property_area
       FROM inquiries i
       JOIN properties p ON i.property_id = p.id
       WHERE i.id = ? AND p.agent_id = ?"
    );
    $stmt->execute([$id, $agentId]);
    $lead = $stmt->fetch();

    if (!$lead) {
      Response::error('Lead not found or access denied', 404);
    }

    $lead['id'] = (int)$lead['id'];
    $lead['property_id'] = $lead['property_id'] ? (int)$lead['property_id'] : null;
    $lead['is_read'] = (bool)$lead['is_read'];
    $lead['property_price'] = $lead['property_price'] ? (int)$lead['property_price'] : null;

    Response::success($lead, 'Lead retrieved successfully');
  }

  /**
   * Mark a lead as read.
   *
   * @param array $params Must contain 'id'.
   * @return void
   */
  public static function markRead(array $params): void
  {
    $user = AuthMiddleware::authenticate();
    $agentId = self::getAgentId((int)$user['id']);

    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) {
      Response::error('Invalid lead ID', 400);
    }

    $db = Database::getConnection();
    $stmt = $db->prepare(
      "UPDATE inquiries i
       JOIN properties p ON i.property_id = p.id
       SET i.is_read = 1
       WHERE i.id = ? AND p.agent_id = ?"
    );
    $stmt->execute([$id, $agentId]);

    if ($stmt->rowCount() === 0) {
      Response::error('Lead not found or access denied', 404);
    }

    Response::success(['id' => $id, 'is_read' => true], 'Lead marked as read');
  }

  /**
   * Update a lead's status (new / contacted / qualified / closed).
   *
   * @param array $params Must contain 'id'.
   * @return void
   */
  public static function updateStatus(array $params): void
  {
    $user = AuthMiddleware::authenticate();
    $agentId = self::getAgentId((int)$user['id']);

    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) {
      Response::error('Invalid lead ID', 400);
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      $input = $_POST;
    }

    $validator = new Validator($input);
    $validator
      ->required('status', 'Status')
      ->inArray('status', ['new', 'contacted', 'qualified', 'closed'], 'Status');

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $data = $validator->validated();
    $db = Database::getConnection();
    $stmt = $db->prepare(
      "UPDATE inquiries i
       JOIN properties p ON i.property_id = p.id
       SET i.status = ?
       WHERE i.id = ? AND p.agent_id = ?"
    );
    $stmt->execute([$data['status'], $id, $agentId]);

    if ($stmt->rowCount() === 0) {
      Response::error('Lead not found or access denied', 404);
    }

    Response::success(['id' => $id, 'status' => $data['status']], "Lead marked as {$data['status']}");
  }

  /**
   * Update notes on a lead.
   *
   * @param array $params Must contain 'id'.
   * @return void
   */
  public static function updateNotes(array $params): void
  {
    $user = AuthMiddleware::authenticate();
    $agentId = self::getAgentId((int)$user['id']);

    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) {
      Response::error('Invalid lead ID', 400);
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      $input = $_POST;
    }

    $validator = new Validator($input);
    $validator->string('notes', 'Notes');

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $data = $validator->validated();
    $notes = $data['notes'] ?? '';

    $db = Database::getConnection();
    $stmt = $db->prepare(
      "UPDATE inquiries i
       JOIN properties p ON i.property_id = p.id
       SET i.notes = ?
       WHERE i.id = ? AND p.agent_id = ?"
    );
    $stmt->execute([$notes, $id, $agentId]);

    if ($stmt->rowCount() === 0) {
      Response::error('Lead not found or access denied', 404);
    }

    Response::success(['id' => $id, 'notes' => $notes], 'Notes updated successfully');
  }

  /**
   * Get the count of unread leads for the authenticated agent.
   *
   * @param array $params Request parameters (unused).
   * @return void
   */
  public static function unreadCount(array $params): void
  {
    $user = AuthMiddleware::authenticate();
    $agentId = self::getAgentId((int)$user['id']);

    $db = Database::getConnection();
    $stmt = $db->prepare(
      "SELECT COUNT(*) FROM inquiries i
       JOIN properties p ON i.property_id = p.id
       WHERE p.agent_id = ? AND i.is_read = 0"
    );
    $stmt->execute([$agentId]);
    $count = (int)$stmt->fetchColumn();

    Response::success(['unread_count' => $count], 'Unread count retrieved');
  }
}
