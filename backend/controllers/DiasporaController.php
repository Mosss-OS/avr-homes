<?php

/**
 * Manages diaspora investor profiles, wallets, and KYC verification.
 * All endpoints require superadmin authentication.
 */
class DiasporaController
{
  /**
   * List all diaspora investors with pagination.
   *
   * @param array $params Route parameters (unused).
   * @return void
   */
  public static function index(array $params): void
  {
    // Get diaspora investors - requires superadmin
    AuthMiddleware::authenticateAdmin();

    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 20)));

    $db = Database::getConnection();

    $countStmt = $db->query("SELECT COUNT(*) FROM diaspora_investors");
    $total = (int)$countStmt->fetchColumn();

    $stmt = $db->prepare(
      "SELECT di.*, u.email, u.name as user_name
       FROM diaspora_investors di
       LEFT JOIN users u ON u.id = di.user_id
       ORDER BY di.created_at DESC
       LIMIT {$perPage} OFFSET {($page - 1) * $perPage}"
    );
    $stmt->execute();
    $investors = $stmt->fetchAll();

    foreach ($investors as &$investor) {
      $investor['id'] = (int)$investor['id'];
      $investor['user_id'] = $investor['user_id'] ? (int)$investor['user_id'] : null;
      $investor['is_verified'] = (bool)$investor['is_verified'];
    }

    Response::success([
      'data' => $investors,
      'total' => $total,
      'page' => $page,
      'per_page' => $perPage,
      'total_pages' => (int)ceil($total / $perPage),
    ], 'Diaspora investors retrieved');
  }

  /**
   * Show a single diaspora investor profile by ID.
   *
   * @param array $params Route parameters containing 'id'.
   * @return void
   */
  public static function show(array $params): void
  {
    $investorId = (int)($params['id'] ?? 0);

    $db = Database::getConnection();
    $stmt = $db->prepare(
      "SELECT di.*, u.email, u.name as user_name
       FROM diaspora_investors di
       LEFT JOIN users u ON u.id = di.user_id
       WHERE di.id = ?"
    );
    $stmt->execute([$investorId]);
    $investor = $stmt->fetch();

    if (!$investor) {
      Response::error('Investor not found', 404);
    }

    $investor['id'] = (int)$investor['id'];
    $investor['user_id'] = $investor['user_id'] ? (int)$investor['user_id'] : null;
    $investor['is_verified'] = (bool)$investor['is_verified'];

    Response::success($investor, 'Investor profile retrieved');
  }

  /**
   * List all wallets for a given diaspora investor.
   *
   * @param array $params Route parameters containing 'id'.
   * @return void
   */
  public static function wallets(array $params): void
  {
    $investorId = (int)($params['id'] ?? 0);

    $db = Database::getConnection();
    $stmt = $db->prepare(
      "SELECT dw.*, u.email
       FROM diaspora_wallets dw
       LEFT JOIN diaspora_investors di ON di.id = dw.investor_id
       LEFT JOIN users u ON u.id = di.user_id
       WHERE dw.investor_id = ?"
    );
    $stmt->execute([$investorId]);
    $wallets = $stmt->fetchAll();

    foreach ($wallets as &$wallet) {
      $wallet['id'] = (int)$wallet['id'];
      $wallet['investor_id'] = (int)$wallet['investor_id'];
      $wallet['balance'] = (float)$wallet['balance'];
      $wallet['pending_balance'] = (float)$wallet['pending_balance'];
      $wallet['total'] = (float)($wallet['balance'] + $wallet['pending_balance']);
    }

    Response::success($wallets, 'Investor wallets retrieved');
  }

  /**
   * Update the KYC status for a diaspora investor.
   * Sets is_verified based on kyc_status value.
   *
   * @param array $params Route parameters containing 'id'.
   * @return void
   */
  public static function updateKyc(array $params): void
  {
    $investorId = (int)($params['id'] ?? 0);

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      $input = $_POST;
    }

    $validator = new Validator($input);
    $validator->required('kyc_status', 'KYC status');

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $data = $validator->validated();

    $db = Database::getConnection();
    $stmt = $db->prepare(
      'UPDATE diaspora_investors SET kyc_status = ?, is_verified = ? WHERE id = ?'
    );
    $stmt->execute([
      $data['kyc_status'],
      $data['kyc_status'] === 'verified' ? 1 : 0,
      $investorId,
    ]);

    Response::success(['id' => $investorId], 'KYC status updated');
  }
}
