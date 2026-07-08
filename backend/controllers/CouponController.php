<?php

declare(strict_types=1);

class CouponController
{
  /**
   * [Admin] List all coupons.
   */
  public static function adminIndex(array $params): void
  {
    AuthMiddleware::authenticateAgent();
    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 20)));
    $q = trim($_GET['q'] ?? '');
    $active = $_GET['active'] ?? '';

    $db = Database::getConnection();
    $where = '';
    $binds = [];

    if ($q) {
      $where .= ' AND (code LIKE ? OR description LIKE ?)';
      $like = "%{$q}%";
      $binds[] = $like; $binds[] = $like;
    }
    if ($active === '1') { $where .= ' AND is_active = 1'; }
    elseif ($active === '0') { $where .= ' AND is_active = 0'; }

    $countStmt = $db->prepare("SELECT COUNT(*) FROM coupons WHERE 1=1 {$where}");
    $countStmt->execute($binds);
    $total = (int)$countStmt->fetchColumn();

    $offset = ($page - 1) * $perPage;
    $stmt = $db->prepare("SELECT * FROM coupons WHERE 1=1 {$where} ORDER BY created_at DESC LIMIT {$perPage} OFFSET {$offset}");
    $stmt->execute($binds);
    $coupons = $stmt->fetchAll();

    foreach ($coupons as &$c) {
      $c['id'] = (int)$c['id'];
      $c['discount_value'] = (float)$c['discount_value'];
      $c['min_order_amount'] = $c['min_order_amount'] ? (float)$c['min_order_amount'] : null;
      $c['max_discount'] = $c['max_discount'] ? (float)$c['max_discount'] : null;
      $c['max_uses'] = $c['max_uses'] ? (int)$c['max_uses'] : null;
      $c['max_uses_per_user'] = $c['max_uses_per_user'] ? (int)$c['max_uses_per_user'] : null;
      $c['used_count'] = (int)$c['used_count'];
      $c['is_active'] = (bool)$c['is_active'];
    }

    Response::success([
      'data' => $coupons,
      'total' => $total,
      'page' => $page,
      'total_pages' => (int)ceil($total / $perPage),
    ], 'Coupons retrieved');
  }

  /**
   * [Admin] Create a coupon.
   */
  public static function adminCreate(array $params): void
  {
    AuthMiddleware::authenticateAgent();
    $input = json_decode(file_get_contents('php://input'), true);

    $validator = new Validator($input);
    $validator
      ->required('code', 'Coupon code')
      ->required('discount_type', 'Discount type')
      ->required('discount_value', 'Discount value');

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $data = $validator->validated();
    $data['code'] = strtoupper(trim($data['code']));

    $db = Database::getConnection();

    $stmt = $db->prepare('SELECT 1 FROM coupons WHERE code = ?');
    $stmt->execute([$data['code']]);
    if ($stmt->fetchColumn()) {
      Response::error('Coupon code already exists', 409);
    }

    $insert = $db->prepare(
      "INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount, max_uses, max_uses_per_user, applies_to, is_active, starts_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $insert->execute([
      $data['code'],
      $data['description'] ?? null,
      $data['discount_type'],
      (float)$data['discount_value'],
      isset($data['min_order_amount']) ? (float)$data['min_order_amount'] : null,
      isset($data['max_discount']) ? (float)$data['max_discount'] : null,
      isset($data['max_uses']) ? (int)$data['max_uses'] : null,
      isset($data['max_uses_per_user']) ? (int)$data['max_uses_per_user'] : null,
      $data['applies_to'] ?? 'all',
      isset($data['is_active']) ? ($data['is_active'] ? 1 : 0) : 1,
      $data['starts_at'] ?? null,
      $data['expires_at'] ?? null,
    ]);

    $id = (int)$db->lastInsertId();
    Response::success(['id' => $id], 'Coupon created', 201);
  }

  /**
   * [Admin] Update a coupon.
   */
  public static function adminUpdate(array $params): void
  {
    AuthMiddleware::authenticateAgent();
    $id = (int)($params['id'] ?? 0);
    if (!$id) Response::error('Coupon ID required', 400);

    $input = json_decode(file_get_contents('php://input'), true);
    $db = Database::getConnection();

    $fields = [];
    $binds = [];
    foreach (['code', 'description', 'discount_type', 'discount_value', 'min_order_amount', 'max_discount', 'max_uses', 'max_uses_per_user', 'applies_to', 'starts_at', 'expires_at'] as $f) {
      if (array_key_exists($f, $input)) {
        $fields[] = "{$f} = ?";
        $binds[] = $input[$f];
      }
    }
    if (array_key_exists('is_active', $input)) {
      $fields[] = 'is_active = ?';
      $binds[] = $input['is_active'] ? 1 : 0;
    }

    if (empty($fields)) { Response::error('No fields to update', 400); return; }

    $binds[] = $id;
    $stmt = $db->prepare("UPDATE coupons SET " . implode(', ', $fields) . " WHERE id = ?");
    $stmt->execute($binds);

    Response::success([], 'Coupon updated');
  }

  /**
   * [Admin] Delete a coupon.
   */
  public static function adminDelete(array $params): void
  {
    AuthMiddleware::authenticateAgent();
    $id = (int)($params['id'] ?? 0);
    if (!$id) Response::error('Coupon ID required', 400);

    $db = Database::getConnection();
    $stmt = $db->prepare('DELETE FROM coupons WHERE id = ?');
    $stmt->execute([$id]);

    Response::success([], 'Coupon deleted');
  }

  /**
   * [Admin] Get coupon usage stats.
   */
  public static function adminUsage(array $params): void
  {
    AuthMiddleware::authenticateAgent();
    $id = (int)($params['id'] ?? 0);
    if (!$id) Response::error('Coupon ID required', 400);

    $db = Database::getConnection();
    $stmt = $db->prepare(
      "SELECT cu.*, u.name as user_name, u.email as user_email
       FROM coupon_usage cu
       LEFT JOIN users u ON u.id = cu.user_id
       WHERE cu.coupon_id = ?
       ORDER BY cu.used_at DESC
       LIMIT 100"
    );
    $stmt->execute([$id]);
    $usage = $stmt->fetchAll();

    foreach ($usage as &$u) {
      $u['id'] = (int)$u['id'];
      $u['coupon_id'] = (int)$u['coupon_id'];
      $u['user_id'] = (int)$u['user_id'];
      $u['order_id'] = $u['order_id'] ? (int)$u['order_id'] : null;
      $u['discount_amount'] = (float)$u['discount_amount'];
    }

    Response::success($usage, 'Coupon usage retrieved');
  }

  /**
   * [Public] Validate and apply a coupon.
   * POST /api/coupons/validate
   */
  public static function validate(array $params): void
  {
    $input = json_decode(file_get_contents('php://input'), true);
    $code = trim(strtoupper($input['code'] ?? ''));
    $orderAmount = (float)($input['order_amount'] ?? 0);
    $appliesTo = $input['applies_to'] ?? 'all';
    $userId = isset($input['user_id']) ? (int)$input['user_id'] : null;

    if (!$code) Response::error('Coupon code required', 400);

    $db = Database::getConnection();
    $stmt = $db->prepare("SELECT * FROM coupons WHERE code = ? LIMIT 1");
    $stmt->execute([$code]);
    $coupon = $stmt->fetch();

    if (!$coupon) Response::error('Invalid coupon code', 404);
    if (!$coupon['is_active']) Response::error('This coupon has been deactivated', 422);
    if ($coupon['expires_at'] && strtotime($coupon['expires_at']) < time()) Response::error('This coupon has expired', 422);
    if ($coupon['starts_at'] && strtotime($coupon['starts_at']) > time()) Response::error('This coupon is not yet active', 422);
    if ($coupon['max_uses'] && (int)$coupon['used_count'] >= (int)$coupon['max_uses']) Response::error('This coupon has reached its usage limit', 422);

    if ($appliesTo !== 'all' && $coupon['applies_to'] !== 'all' && $coupon['applies_to'] !== $appliesTo) {
      Response::error('This coupon does not apply to this order type', 422);
    }

    if ($orderAmount > 0 && $coupon['min_order_amount'] && $orderAmount < (float)$coupon['min_order_amount']) {
      Response::error("Minimum order amount of " . number_format((float)$coupon['min_order_amount'], 2) . " required", 422);
    }

    if ($userId && $coupon['max_uses_per_user']) {
      $usageStmt = $db->prepare("SELECT COUNT(*) FROM coupon_usage WHERE coupon_id = ? AND user_id = ?");
      $usageStmt->execute([$coupon['id'], $userId]);
      if ((int)$usageStmt->fetchColumn() >= (int)$coupon['max_uses_per_user']) {
        Response::error('You have reached the usage limit for this coupon', 422);
      }
    }

    $discount = 0;
    if ($coupon['discount_type'] === 'percentage') {
      $discount = $orderAmount * ((float)$coupon['discount_value'] / 100);
      if ($coupon['max_discount'] && $discount > (float)$coupon['max_discount']) {
        $discount = (float)$coupon['max_discount'];
      }
    } else {
      $discount = min((float)$coupon['discount_value'], $orderAmount);
    }

    Response::success([
      'coupon_id' => (int)$coupon['id'],
      'code' => $coupon['code'],
      'discount_type' => $coupon['discount_type'],
      'discount_value' => (float)$coupon['discount_value'],
      'discount_amount' => round($discount, 2),
      'description' => $coupon['description'],
    ], 'Coupon is valid');
  }
}
