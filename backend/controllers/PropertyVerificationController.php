<?php

declare(strict_types=1);

class PropertyVerificationController
{
  private static function getAgentId(int $userId): int
  {
    $db = Database::getConnection();
    $stmt = $db->prepare('SELECT id FROM agents WHERE user_id = ? AND is_active = 1');
    $stmt->execute([$userId]);
    $agent = $stmt->fetch();
    if (!$agent) {
      Response::error('Agent profile not found', 404);
    }
    return (int)$agent['id'];
  }

  private static function getProperty(int $propertyId, int $agentId): array
  {
    $db = Database::getConnection();
    $stmt = $db->prepare('SELECT * FROM properties WHERE id = ? AND agent_id = ?');
    $stmt->execute([$propertyId, $agentId]);
    $property = $stmt->fetch();
    if (!$property) {
      Response::error('Property not found or access denied', 404);
    }
    return $property;
  }

  public static function uploadDocument(array $params): void
  {
    $user = AuthMiddleware::authenticate();
    $agentId = self::getAgentId((int)$user['id']);

    $propertyId = (int)($params['id'] ?? 0);
    if ($propertyId <= 0) {
      Response::error('Invalid property ID', 400);
    }

    $property = self::getProperty($propertyId, $agentId);

    $documentType = $_POST['document_type'] ?? '';
    $allowedTypes = ['certificate_of_occupancy', 'survey_plan', 'deed_of_assignment', 'governors_consent', 'agent_lasrera_id', 'property_photo'];

    if (!in_array($documentType, $allowedTypes)) {
      Response::error('Invalid document type. Allowed: ' . implode(', ', $allowedTypes), 422);
    }

    if (!isset($_FILES['document']) || $_FILES['document']['error'] !== UPLOAD_ERR_OK) {
      Response::error('Document file is required', 400);
    }

    $file = $_FILES['document'];
    $allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    $allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
    $maxSize = 10 * 1024 * 1024;

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $mime = mime_content_type($file['tmp_name']);

    if (!in_array($mime, $allowedMimes) || !in_array($ext, $allowedExts)) {
      Response::error('Invalid file type. Allowed: jpg, jpeg, png, webp, pdf', 422);
    }

    if ($file['size'] > $maxSize) {
      Response::error('File too large. Maximum size is 10MB', 422);
    }

    $uploadDir = __DIR__ . '/../uploads/documents';
    if (!is_dir($uploadDir)) {
      mkdir($uploadDir, 0755, true);
    }

    $filename = 'doc_' . $propertyId . '_' . $documentType . '_' . uniqid() . '.' . $ext;
    $dest = $uploadDir . '/' . $filename;

    if (!move_uploaded_file($file['tmp_name'], $dest)) {
      Response::error('Failed to upload document', 500);
    }

    $db = Database::getConnection();
    $stmt = $db->prepare(
      'INSERT INTO property_documents (property_id, document_type, file_path, original_name, file_size)
       VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([
      $propertyId,
      $documentType,
      'uploads/documents/' . $filename,
      $file['name'],
      $file['size'],
    ]);
    $docId = (int)$db->lastInsertId();

    $logStmt = $db->prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)');
    $logStmt->execute([$user['id'], 'upload_document', 'property_document', $docId, $_SERVER['REMOTE_ADDR'] ?? '']);

    // Create or update verification request
    $vfStmt = $db->prepare(
      "SELECT id, status FROM property_verifications WHERE property_id = ? AND status = 'pending'"
    );
    $vfStmt->execute([$propertyId]);
    $verification = $vfStmt->fetch();

    if (!$verification) {
      $vfStmt = $db->prepare(
        'INSERT INTO property_verifications (property_id, agent_id, status) VALUES (?, ?, ?)'
      );
      $vfStmt->execute([$propertyId, $agentId, 'pending']);
      $vfId = (int)$db->lastInsertId();
    } else {
      $vfId = (int)$verification['id'];
    }

    // Link document to verification
    $db->prepare('UPDATE property_documents SET verification_id = ? WHERE id = ?')
       ->execute([$vfId, $docId]);

    Response::success([
      'document_id' => $docId,
      'verification_id' => $vfId,
      'document_type' => $documentType,
      'file_path' => 'uploads/documents/' . $filename,
    ], 'Document uploaded successfully', 201);
  }

  public static function getVerificationStatus(array $params): void
  {
    $user = AuthMiddleware::authenticate();
    $agentId = self::getAgentId((int)$user['id']);

    $propertyId = (int)($params['id'] ?? 0);
    if ($propertyId <= 0) {
      Response::error('Invalid property ID', 400);
    }

    $property = self::getProperty($propertyId, $agentId);

    $db = Database::getConnection();
    $stmt = $db->prepare(
      'SELECT pv.*, u.name as admin_name
       FROM property_verifications pv
       LEFT JOIN users u ON u.id = pv.admin_id
       WHERE pv.property_id = ?
       ORDER BY pv.created_at DESC
       LIMIT 1'
    );
    $stmt->execute([$propertyId]);
    $verification = $stmt->fetch();

    $docsStmt = $db->prepare(
      'SELECT id, document_type, file_path, original_name, created_at
       FROM property_documents
       WHERE property_id = ?
       ORDER BY created_at DESC'
    );
    $docsStmt->execute([$propertyId]);
    $documents = $docsStmt->fetchAll();

    foreach ($documents as &$doc) {
      $doc['id'] = (int)$doc['id'];
    }

    if ($verification) {
      $verification['id'] = (int)$verification['id'];
      $verification['property_id'] = (int)$verification['property_id'];
      $verification['agent_id'] = (int)$verification['agent_id'];
      $verification['admin_id'] = $verification['admin_id'] ? (int)$verification['admin_id'] : null;
    }

    Response::success([
      'property' => [
        'id' => (int)$property['id'],
        'title' => $property['title'],
        'is_verified' => (bool)$property['is_verified'],
        'verified_at' => $property['verified_at'],
        'verification_expires_at' => $property['verification_expires_at'],
      ],
      'verification' => $verification,
      'documents' => $documents,
    ], 'Verification status retrieved');
  }

  public static function adminIndex(array $params): void
  {
    AuthMiddleware::authenticate('admin');

    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 20)));
    $status = $_GET['status'] ?? null;

    $db = Database::getConnection();
    $conditions = [];
    $bindings = [];

    if ($status && in_array($status, ['pending', 'approved', 'rejected'])) {
      $conditions[] = 'pv.status = ?';
      $bindings[] = $status;
    }

    $where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';

    $countStmt = $db->prepare(
      "SELECT COUNT(*) FROM property_verifications pv {$where}"
    );
    $countStmt->execute($bindings);
    $total = (int)$countStmt->fetchColumn();

    $offset = ($page - 1) * $perPage;
    $stmt = $db->prepare(
      "SELECT pv.*,
              p.title as property_title, p.slug as property_slug,
              p.price as property_price, p.city as property_city,
              a.name as agent_name, a.agency as agent_agency,
              u.name as admin_name
       FROM property_verifications pv
       JOIN properties p ON p.id = pv.property_id
       JOIN agents a ON a.id = pv.agent_id
       LEFT JOIN users u ON u.id = pv.admin_id
       {$where}
       ORDER BY pv.created_at DESC
       LIMIT {$perPage} OFFSET {$offset}"
    );
    $stmt->execute($bindings);
    $verifications = $stmt->fetchAll();

    foreach ($verifications as &$v) {
      $v['id'] = (int)$v['id'];
      $v['property_id'] = (int)$v['property_id'];
      $v['agent_id'] = (int)$v['agent_id'];
      $v['admin_id'] = $v['admin_id'] ? (int)$v['admin_id'] : null;
      $v['property_price'] = (int)$v['property_price'];

      // Get documents for this verification
      $dStmt = $db->prepare(
        "SELECT id, document_type, file_path, original_name, created_at
         FROM property_documents WHERE property_id = ?"
      );
      $dStmt->execute([$v['property_id']]);
      $v['documents'] = $dStmt->fetchAll();
      foreach ($v['documents'] as &$d) {
        $d['id'] = (int)$d['id'];
      }
    }

    Response::success([
      'data' => $verifications,
      'total' => $total,
      'page' => $page,
      'per_page' => $perPage,
      'total_pages' => (int)ceil($total / $perPage),
    ], 'Verifications retrieved');
  }

  public static function adminApprove(array $params): void
  {
    $user = AuthMiddleware::authenticate('admin');

    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) {
      Response::error('Invalid verification ID', 400);
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      $input = $_POST;
    }

    $db = Database::getConnection();
    $stmt = $db->prepare(
      "SELECT pv.*, p.title as property_title
       FROM property_verifications pv
       JOIN properties p ON p.id = pv.property_id
       WHERE pv.id = ? AND pv.status = 'pending'"
    );
    $stmt->execute([$id]);
    $verification = $stmt->fetch();

    if (!$verification) {
      Response::error('Pending verification not found', 404);
    }

    $notes = $input['admin_notes'] ?? null;
    $expiresAt = date('Y-m-d H:i:s', strtotime('+1 year'));

    $db->beginTransaction();
    try {
      $stmt = $db->prepare(
        "UPDATE property_verifications
         SET status = ?, admin_id = ?, admin_notes = ?, expires_at = ?
         WHERE id = ?"
      );
      $stmt->execute(['approved', $user['id'], $notes, $expiresAt, $id]);

      $stmt = $db->prepare(
        'UPDATE properties SET is_verified = 1, verified_by = ?, verified_at = NOW(), verification_expires_at = ? WHERE id = ?'
      );
      $stmt->execute([$user['id'], $expiresAt, $verification['property_id']]);

      $logStmt = $db->prepare("INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)");
      $logStmt->execute([$user['id'], 'approve_verification', 'property_verification', $id, json_encode(['property_id' => $verification['property_id'], 'property_title' => $verification['property_title']]), $_SERVER['REMOTE_ADDR'] ?? '']);

      $db->commit();

      Response::success([
        'verification_id' => $id,
        'property_id' => (int)$verification['property_id'],
        'status' => 'approved',
        'expires_at' => $expiresAt,
      ], 'Property verification approved');
    } catch (Exception $e) {
      $db->rollBack();
      Response::error('Approval failed: ' . $e->getMessage(), 500);
    }
  }

  public static function adminReject(array $params): void
  {
    $user = AuthMiddleware::authenticate('admin');

    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) {
      Response::error('Invalid verification ID', 400);
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      $input = $_POST;
    }

    $validator = new Validator($input);
    $validator->required('rejection_reason', 'Rejection Reason');

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $data = $validator->validated();

    $db = Database::getConnection();
    $stmt = $db->prepare(
      "SELECT pv.*, p.title as property_title
       FROM property_verifications pv
       JOIN properties p ON p.id = pv.property_id
       WHERE pv.id = ? AND pv.status = 'pending'"
    );
    $stmt->execute([$id]);
    $verification = $stmt->fetch();

    if (!$verification) {
      Response::error('Pending verification not found', 404);
    }

    $db->beginTransaction();
    try {
      $stmt = $db->prepare(
        "UPDATE property_verifications
         SET status = ?, admin_id = ?, rejection_reason = ?
         WHERE id = ?"
      );
      $stmt->execute(['rejected', $user['id'], $data['rejection_reason'], $id]);

      $logStmt = $db->prepare("INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)");
      $logStmt->execute([$user['id'], 'reject_verification', 'property_verification', $id, json_encode(['property_id' => $verification['property_id'], 'property_title' => $verification['property_title'], 'reason' => $data['rejection_reason']]), $_SERVER['REMOTE_ADDR'] ?? '']);

      $db->commit();

      Response::success([
        'verification_id' => $id,
        'property_id' => (int)$verification['property_id'],
        'status' => 'rejected',
      ], 'Property verification rejected');
    } catch (Exception $e) {
      $db->rollBack();
      Response::error('Rejection failed: ' . $e->getMessage(), 500);
    }
  }
}
