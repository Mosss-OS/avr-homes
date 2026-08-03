<?php

declare(strict_types=1);

/**
 * Handles two-way messaging on inquiry threads.
 * Users authenticate by email + inquiry_id; agents authenticate via JWT.
 */
class InquiryMessageController
{
  /**
   * List messages for an inquiry.
   * Accessible by: user (email + inquiry_id) or agent (JWT).
   */
  public static function index(array $params): void
  {
    $inquiryId = (int)($params['inquiry_id'] ?? 0);
    if ($inquiryId <= 0) {
      Response::error('Invalid inquiry ID', 400);
    }

    $db = Database::getConnection();

    // Verify the inquiry exists
    $stmt = $db->prepare('SELECT id, email FROM inquiries WHERE id = ?');
    $stmt->execute([$inquiryId]);
    $inquiry = $stmt->fetch();

    if (!$inquiry) {
      Response::error('Inquiry not found', 404);
    }

    // Authenticate: either user (email match) or agent/admin (JWT)
    $isAgent = false;
    try {
      $user = AuthMiddleware::authenticate();
      $isAgent = true;

      // Agents may only view threads on their own properties
      if (!in_array($user['role'], ['admin', 'superadmin'], true)) {
        $stmt = $db->prepare(
          'SELECT p.id FROM inquiries i
           JOIN properties p ON i.property_id = p.id
           JOIN agents a ON a.id = p.agent_id
           WHERE i.id = ? AND a.user_id = ?'
        );
        $stmt->execute([$inquiryId, $user['id']]);
        if (!$stmt->fetch()) {
          Response::error('Unauthorized', 401);
        }
      }
    } catch (\Throwable $e) {
      // Not an agent — check user auth via email header
      $userEmail = $_SERVER['HTTP_X_INQUIRY_EMAIL'] ?? '';
      if (!$userEmail || strtolower($userEmail) !== strtolower($inquiry['email'])) {
        Response::error('Unauthorized', 401);
      }
      $isAgent = false;
    }

    // If agent, also return the inquiry contact details
    $stmt = $db->prepare(
      'SELECT m.* FROM inquiry_messages m WHERE m.inquiry_id = ? ORDER BY m.created_at ASC'
    );
    $stmt->execute([$inquiryId]);
    $messages = $stmt->fetchAll();

    foreach ($messages as &$msg) {
      $msg['id'] = (int)$msg['id'];
      $msg['inquiry_id'] = (int)$msg['inquiry_id'];
      $msg['is_read'] = (bool)$msg['is_read'];
    }

    // If agent viewing, mark unread user messages as read
    if ($isAgent) {
      $stmt = $db->prepare(
        "UPDATE inquiry_messages SET is_read = 1 WHERE inquiry_id = ? AND sender_type = 'user' AND is_read = 0"
      );
      $stmt->execute([$inquiryId]);
    }

    // Get inquiry details for the response
    $stmt = $db->prepare(
      "SELECT i.*, p.title as property_title, p.slug as property_slug
       FROM inquiries i
       LEFT JOIN properties p ON i.property_id = p.id
       WHERE i.id = ?"
    );
    $stmt->execute([$inquiryId]);
    $inquiryData = $stmt->fetch();

    if ($inquiryData) {
      $inquiryData['id'] = (int)$inquiryData['id'];
      $inquiryData['property_id'] = $inquiryData['property_id'] ? (int)$inquiryData['property_id'] : null;
      $inquiryData['is_read'] = (bool)$inquiryData['is_read'];
    }

    Response::success([
      'inquiry'  => $inquiryData,
      'messages' => $messages,
    ]);
  }

  /**
   * Send a message on an inquiry thread.
   * Accessible by: user (email + inquiry_id) or agent (JWT).
   */
  public static function store(array $params): void
  {
    $inquiryId = (int)($params['inquiry_id'] ?? 0);
    if ($inquiryId <= 0) {
      Response::error('Invalid inquiry ID', 400);
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      $input = $_POST;
    }

    if (empty($input['body']) || trim($input['body']) === '') {
      Response::error('Message body is required', 422);
    }
    $body = trim($input['body']);

    if (mb_strlen($body) > 5000) {
      Response::error('Message too long (max 5000 characters)', 422);
    }

    $db = Database::getConnection();

    // Verify the inquiry exists
    $stmt = $db->prepare('SELECT id, email, status FROM inquiries WHERE id = ?');
    $stmt->execute([$inquiryId]);
    $inquiry = $stmt->fetch();

    if (!$inquiry) {
      Response::error('Inquiry not found', 404);
    }

    // Determine sender type and sender email
    $senderType = 'user';
    $senderEmail = null;

    try {
      $user = AuthMiddleware::authenticate();
      // Authenticated as agent/admin
      $senderType = 'agent';
      $senderEmail = $user['email'] ?? null;

      // Agents may only reply on threads for their own properties
      if (!in_array($user['role'], ['admin', 'superadmin'], true)) {
        $stmt = $db->prepare(
          'SELECT p.id FROM inquiries i
           JOIN properties p ON i.property_id = p.id
           JOIN agents a ON a.id = p.agent_id
           WHERE i.id = ? AND a.user_id = ?'
        );
        $stmt->execute([$inquiryId, $user['id']]);
        if (!$stmt->fetch()) {
          Response::error('Unauthorized', 401);
        }
      }

      // Update inquiry status to 'contacted' on first agent reply
      if ($inquiry['status'] === 'new') {
        $stmt = $db->prepare('UPDATE inquiries SET status = ? WHERE id = ?');
        $stmt->execute(['contacted', $inquiryId]);
      }
    } catch (\Throwable $e) {
      // Not an agent — check user auth via email header
      $userEmail = $_SERVER['HTTP_X_INQUIRY_EMAIL'] ?? '';
      if (!$userEmail || strtolower($userEmail) !== strtolower($inquiry['email'])) {
        Response::error('Unauthorized', 401);
      }
      $senderType = 'user';
      $senderEmail = $inquiry['email'];
    }

    $stmt = $db->prepare(
      'INSERT INTO inquiry_messages (inquiry_id, sender_type, sender_email, body) VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([$inquiryId, $senderType, $senderEmail, $body]);

    $messageId = (int)$db->lastInsertId();

    Response::success([
      'id'          => $messageId,
      'inquiry_id'  => $inquiryId,
      'sender_type' => $senderType,
      'body'        => $body,
      'created_at'  => date('c'),
    ], 'Message sent', 201);
  }

  /**
   * Get unread message count for agents.
   */
  public static function unreadCountByAgent(array $params): void
  {
    $user = AuthMiddleware::authenticate();
    $db = Database::getConnection();

    // Get agent's properties and count unread user messages
    $stmt = $db->prepare(
      "SELECT COUNT(*) as cnt FROM inquiry_messages m
       JOIN inquiries i ON m.inquiry_id = i.id
       JOIN properties p ON i.property_id = p.id
       WHERE p.agent_id = (SELECT id FROM agents WHERE user_id = ?)
       AND m.sender_type = 'user'
       AND m.is_read = 0"
    );
    $stmt->execute([$user['id']]);
    $result = $stmt->fetch();

    Response::success([
      'unread_count' => (int)$result['cnt'],
    ]);
  }
}
