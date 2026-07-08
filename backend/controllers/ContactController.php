<?php

declare(strict_types=1);

/**
 * Handles contact form submissions from the public website.
 * Provides CRUD operations for admin management of contact messages.
 */
class ContactController
{
  /**
   * Store a new contact message from the public form.
   *
   * @param array $params Route parameters (unused).
   * @return void
   */
  public static function store(array $params): void
  {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      $input = $_POST;
    }

    $validator = new Validator($input);
    $validator
      ->required('name', 'Name')
      ->string('name', 'Name', 100)
      ->required('email', 'Email')
      ->email('email', 'Email')
      ->required('phone', 'Phone')
      ->phone('phone', 'Phone')
      ->required('enquiry_type', 'Enquiry Type')
      ->string('enquiry_type', 'Enquiry Type', 50)
      ->inArray('enquiry_type', ['Buy', 'Rent', 'Agent Enquiry', 'Developer Partnership', 'Media', 'Other'], 'Enquiry Type')
      ->required('message', 'Message')
      ->minLength('message', 10, 'Message');

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $data = $validator->validated();

    $db = Database::getConnection();
    $stmt = $db->prepare(
      'INSERT INTO contact_messages (name, email, phone, enquiry_type, message) VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([
      $data['name'],
      $data['email'],
      $data['phone'],
      $data['enquiry_type'],
      $data['message'],
    ]);

    Response::success([
      'id' => (int)$db->lastInsertId(),
    ], 'Thank you! We have received your message and will reply shortly.', 201);
  }

  /**
   * List contact messages with pagination and optional unread filter.
   *
   * @param array $params Route parameters (unused).
   * @return void
   */
  public static function index(array $params): void
  {
    $user = AuthMiddleware::authenticate();

    $page    = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 20)));
    $status  = $_GET['status'] ?? null;

    $db = Database::getConnection();
    $conditions = [];
    $bindings = [];

    if ($status === 'unread') {
      $conditions[] = 'cm.is_read = 0';
    }

    $where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';

    $countStmt = $db->prepare("SELECT COUNT(*) FROM contact_messages cm {$where}");
    $countStmt->execute($bindings);
    $total = (int)$countStmt->fetchColumn();

    $offset = ($page - 1) * $perPage;
    $stmt = $db->prepare(
      "SELECT * FROM contact_messages cm {$where} ORDER BY cm.created_at DESC LIMIT {$perPage} OFFSET {$offset}"
    );
    $stmt->execute($bindings);
    $messages = $stmt->fetchAll();

    foreach ($messages as &$msg) {
      $msg['id'] = (int)$msg['id'];
      $msg['is_read'] = (bool)$msg['is_read'];
    }

    Response::success([
      'data'        => $messages,
      'total'       => $total,
      'page'        => $page,
      'per_page'    => $perPage,
      'total_pages' => (int)ceil($total / $perPage),
    ]);
  }

  /**
   * Delete a contact message by ID.
   *
   * @param array $params Route parameters containing 'id'.
   * @return void
   */
  public static function destroy(array $params): void
  {
    $user = AuthMiddleware::authenticate();

    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) {
      Response::error('Invalid message ID', 400);
    }

    $db = Database::getConnection();
    $stmt = $db->prepare('DELETE FROM contact_messages WHERE id = ?');
    $stmt->execute([$id]);

    if ($stmt->rowCount() === 0) {
      Response::error('Message not found', 404);
    }

    Response::success(null, 'Message deleted successfully');
  }
}
