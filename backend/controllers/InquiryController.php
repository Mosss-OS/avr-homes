<?php

declare(strict_types=1);

/**
 * Handles property inquiry submissions from the public and admin management.
 * Supports linking inquiries to specific properties.
 */
class InquiryController
{
  /**
   * Submit a new property inquiry, optionally linked to a property.
   * Requires a verified Paystack payment reference for inspection scheduling.
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
      ->required('message', 'Message')
      ->minLength('message', 10, 'Message');

    if (!empty($input['property_id'])) {
      $validator->numeric('property_id', 'Property ID');
    }

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $data = $validator->validated();

    // Verify property exists if property_id provided
    if (!empty($data['property_id'])) {
      $property = Property::findById((int)$data['property_id']);
      if (!$property) {
        Response::error('Property not found', 404);
      }
    }

    // Verify Paystack payment if payment_ref provided
    if (!empty($data['payment_ref'])) {
      $verified = self::verifyPaystackPayment($data['payment_ref']);
      if (!$verified) {
        Response::error('Payment verification failed. Invalid or unverified payment.', 402);
      }
    }

    $db = Database::getConnection();
    $stmt = $db->prepare(
      'INSERT INTO inquiries (property_id, name, email, phone, message, property_url, payment_ref) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
      !empty($data['property_id']) ? (int)$data['property_id'] : null,
      $data['name'],
      $data['email'],
      $data['phone'],
      $data['message'],
      $data['property_url'] ?? null,
      $data['payment_ref'] ?? null,
    ]);

    Response::success([
      'id' => (int)$db->lastInsertId(),
    ], 'Your inquiry has been submitted. An agent will reach out shortly.', 201);
  }

  /**
   * Verify a Paystack transaction reference via the Paystack API.
   *
   * @param string $reference The Paystack transaction reference.
   * @return bool True if the transaction was successful and verified.
   */
  private static function verifyPaystackPayment(string $reference): bool
  {
    $secretKey = $_ENV['PAYSTACK_SECRET_KEY'] ?? '';
    if (!$secretKey) {
      error_log('Paystack secret key not configured');
      return false;
    }

    $ch = curl_init("https://api.paystack.co/transaction/verify/" . urlencode($reference));
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $secretKey,
        'Content-Type: application/json',
      ],
      CURLOPT_TIMEOUT => 15,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
      error_log("Paystack verification curl error: {$error}");
      return false;
    }

    $body = json_decode($response, true);
    if (!$body || $httpCode !== 200) {
      error_log("Paystack verification HTTP {$httpCode}: {$response}");
      return false;
    }

    // Status must be "success" and amount must be at least ₦15,000 (minimum inspection fee)
    return $body['status'] === true
      && ($body['data']['status'] ?? '') === 'success'
      && ($body['data']['amount'] ?? 0) >= 1500000; // ₦15,000 minimum in kobo
  }

  /**
   * List inquiries with pagination and optional unread filter.
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
      $conditions[] = 'i.is_read = 0';
    }

    $where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';

    // Count
    $countStmt = $db->prepare("SELECT COUNT(*) FROM inquiries i {$where}");
    $countStmt->execute($bindings);
    $total = (int)$countStmt->fetchColumn();

    $offset = ($page - 1) * $perPage;
    $stmt = $db->prepare(
      "SELECT i.*, p.title as property_title, p.slug as property_slug
       FROM inquiries i
       LEFT JOIN properties p ON i.property_id = p.id
       {$where}
       ORDER BY i.created_at DESC
       LIMIT {$perPage} OFFSET {$offset}"
    );
    $stmt->execute($bindings);
    $inquiries = $stmt->fetchAll();

    foreach ($inquiries as &$inq) {
      $inq['id'] = (int)$inq['id'];
      $inq['property_id'] = $inq['property_id'] ? (int)$inq['property_id'] : null;
      $inq['is_read'] = (bool)$inq['is_read'];
    }

    Response::success([
      'data'        => $inquiries,
      'total'       => $total,
      'page'        => $page,
      'per_page'    => $perPage,
      'total_pages' => (int)ceil($total / $perPage),
    ]);
  }

  /**
   * Delete an inquiry by ID.
   *
   * @param array $params Route parameters containing 'id'.
   * @return void
   */
  public static function destroy(array $params): void
  {
    $user = AuthMiddleware::authenticate();

    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) {
      Response::error('Invalid inquiry ID', 400);
    }

    $db = Database::getConnection();
    $stmt = $db->prepare('DELETE FROM inquiries WHERE id = ?');
    $stmt->execute([$id]);

    if ($stmt->rowCount() === 0) {
      Response::error('Inquiry not found', 404);
    }

    Response::success(null, 'Inquiry deleted successfully');
  }
}
