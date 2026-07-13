<?php

declare(strict_types=1);

class KYCController
{
  private static function auth(): array
  {
    return AuthMiddleware::authenticate();
  }

  public static function status(): void
  {
    $user = self::auth();
    $db = Database::getConnection();

    $stmt = $db->prepare('SELECT * FROM kyc_records WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    $record = $stmt->fetch();

    if (!$record) {
      Response::success([
        'status' => 'not_submitted',
        'bvn_verified' => false,
        'id_verified' => false,
      ]);
      return;
    }

    $record['id'] = (int)$record['id'];
    $record['user_id'] = (int)$record['user_id'];
    $record['bvn_verified'] = (bool)$record['bvn_verified'];
    $record['id_verified'] = (bool)$record['id_verified'];
    $record['accredited_investor'] = (bool)$record['accredited_investor'];

    Response::success($record);
  }

  public static function submit(): void
  {
    $user = self::auth();

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      $input = $_POST;
    }

    $validator = new Validator($input);
    $validator
      ->string('bvn_number', 'BVN Number', 11)
      ->string('source_of_funds', 'Source of Funds', 1000);

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $data = $validator->validated();
    $db = Database::getConnection();

    $stmt = $db->prepare('SELECT id FROM kyc_records WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    $existing = $stmt->fetch();

    if ($existing) {
      $stmt = $db->prepare(
        'UPDATE kyc_records SET bvn_number = ?, source_of_funds = ?, status = "pending",
         id_document_url = ?, id_document_type = ?, accredited_investor = ?
         WHERE user_id = ?'
      );
      $stmt->execute([
        $data['bvn_number'] ?? null,
        $data['source_of_funds'] ?? null,
        $input['id_document_url'] ?? null,
        $input['id_document_type'] ?? null,
        !empty($input['accredited_investor']) ? 1 : 0,
        $user['id'],
      ]);
      Response::success(null, 'KYC updated');
    } else {
      $stmt = $db->prepare(
        'INSERT INTO kyc_records (user_id, bvn_number, source_of_funds, id_document_url, id_document_type, accredited_investor, status)
         VALUES (?, ?, ?, ?, ?, ?, "pending")'
      );
      $stmt->execute([
        $user['id'],
        $data['bvn_number'] ?? null,
        $data['source_of_funds'] ?? null,
        $input['id_document_url'] ?? null,
        $input['id_document_type'] ?? null,
        !empty($input['accredited_investor']) ? 1 : 0,
      ]);
      Response::success(null, 'KYC submitted', 201);
    }
  }

  /* ── Admin: List KYC records ─────────────────────────────── */
  public static function adminList(): void
  {
    AuthMiddleware::authenticateAdmin();

    $page    = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 20)));
    $status  = $_GET['status'] ?? null;

    $db = Database::getConnection();
    $conditions = ['1=1'];
    $binds = [];

    if ($status && in_array($status, ['pending', 'verified', 'rejected'])) {
      $conditions[] = 'k.status = ?';
      $binds[] = $status;
    }

    $where = implode(' AND ', $conditions);

    $countStmt = $db->prepare("SELECT COUNT(*) FROM kyc_records k WHERE {$where}");
    $countStmt->execute($binds);
    $total = (int)$countStmt->fetchColumn();

    $offset = ($page - 1) * $perPage;
    $stmt = $db->prepare(
      "SELECT k.*, u.name AS user_name, u.email AS user_email
       FROM kyc_records k
       JOIN users u ON u.id = k.user_id
       WHERE {$where}
       ORDER BY k.created_at DESC LIMIT {$perPage} OFFSET {$offset}"
    );
    $stmt->execute($binds);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$r) {
      $r['id'] = (int)$r['id'];
      $r['user_id'] = (int)$r['user_id'];
      $r['bvn_verified'] = (bool)$r['bvn_verified'];
      $r['id_verified'] = (bool)$r['id_verified'];
      $r['accredited_investor'] = (bool)$r['accredited_investor'];
    }

    Response::success([
      'data' => $rows, 'total' => $total, 'page' => $page, 'per_page' => $perPage,
      'total_pages' => (int)ceil($total / $perPage),
    ]);
  }

  /* ── Admin: Verify KYC record ────────────────────────────── */
  public static function adminVerify(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if (!$id) Response::error('KYC record ID is required', 400);

    $db = Database::getConnection();
    $stmt = $db->prepare("UPDATE kyc_records SET status = 'verified', verified_at = NOW() WHERE id = ? AND status = 'pending'");
    $stmt->execute([$id]);

    if ($stmt->rowCount() === 0) {
      Response::error('KYC record not found or already processed', 404);
    }

    Response::success(null, 'KYC verified');
  }

  /* ── Admin: Reject KYC record ────────────────────────────── */
  public static function adminReject(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if (!$id) Response::error('KYC record ID is required', 400);

    $input = json_decode(file_get_contents('php://input'), true);

    $db = Database::getConnection();
    $stmt = $db->prepare("UPDATE kyc_records SET status = 'rejected' WHERE id = ? AND status = 'pending'");
    $stmt->execute([$id]);

    if ($stmt->rowCount() === 0) {
      Response::error('KYC record not found or already processed', 404);
    }

    Response::success(null, 'KYC rejected');
  }
}
