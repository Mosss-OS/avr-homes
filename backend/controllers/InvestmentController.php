<?php

declare(strict_types=1);

class InvestmentController
{
  private static function auth(): array
  {
    return AuthMiddleware::authenticate();
  }

  public static function opportunities(): void
  {
    $db = Database::getConnection();
    $stmt = $db->query(
      'SELECT ip.*, p.title AS property_title, p.city, p.image AS property_image
       FROM investment_properties ip
       LEFT JOIN properties p ON p.id = ip.property_id
       WHERE ip.status = "active"
       ORDER BY ip.created_at DESC'
    );
    $items = $stmt->fetchAll();

    foreach ($items as &$item) {
      $item['id'] = (int)$item['id'];
      $item['total_shares'] = (int)$item['total_shares'];
      $item['available_shares'] = (int)$item['available_shares'];
      $item['share_price'] = (float)$item['share_price'];
      $item['min_investment'] = $item['min_investment'] ? (float)$item['min_investment'] : null;
      $item['expected_yield'] = $item['expected_yield'] ? (float)$item['expected_yield'] : null;
      $item['funding_percentage'] = $item['total_shares'] > 0
        ? round((($item['total_shares'] - $item['available_shares']) / $item['total_shares']) * 100, 1)
        : 0;
      $item['property_details'] = $item['property_details'] ? json_decode($item['property_details'], true) : null;
    }

    Response::success($items);
  }

  public static function show(array $params): void
  {
    $id = (int)($params['id'] ?? 0);
    if (!$id) {
      Response::error('Investment property ID is required', 400);
    }

    $db = Database::getConnection();
    $stmt = $db->prepare(
      'SELECT ip.*, p.title AS property_title, p.description AS property_description,
              p.city, p.state, p.image AS property_image, p.price AS property_price,
              p.beds, p.baths, p.area, p.type AS property_type
       FROM investment_properties ip
       LEFT JOIN properties p ON p.id = ip.property_id
       WHERE ip.id = ?'
    );
    $stmt->execute([$id]);
    $item = $stmt->fetch();

    if (!$item) {
      Response::error('Investment opportunity not found', 404);
    }

    $item['id'] = (int)$item['id'];
    $item['total_shares'] = (int)$item['total_shares'];
    $item['available_shares'] = (int)$item['available_shares'];
    $item['share_price'] = (float)$item['share_price'];
    $item['min_investment'] = $item['min_investment'] ? (float)$item['min_investment'] : null;
    $item['expected_yield'] = $item['expected_yield'] ? (float)$item['expected_yield'] : null;
    $item['funding_percentage'] = $item['total_shares'] > 0
      ? round((($item['total_shares'] - $item['available_shares']) / $item['total_shares']) * 100, 1)
      : 0;
    $item['property_details'] = $item['property_details'] ? json_decode($item['property_details'], true) : null;

    // Get dividend history
    $divStmt = $db->prepare(
      'SELECT id, amount_per_share, total_amount, declared_at, paid_at, period_start, period_end, status
       FROM dividends WHERE investment_property_id = ? ORDER BY declared_at DESC'
    );
    $divStmt->execute([$id]);
    $dividends = $divStmt->fetchAll();
    foreach ($dividends as &$d) {
      $d['id'] = (int)$d['id'];
      $d['amount_per_share'] = (float)$d['amount_per_share'];
      $d['total_amount'] = (float)$d['total_amount'];
    }
    $item['dividends'] = $dividends;

    Response::success($item);
  }

  public static function buy(): void
  {
    $user = self::auth();

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      $input = $_POST;
    }

    $validator = new Validator($input);
    $validator
      ->required('investment_property_id', 'Investment property')
      ->numeric('investment_property_id', 'Investment property')
      ->required('shares', 'Shares')
      ->numeric('shares', 'Shares');

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $data = $validator->validated();
    $propertyId = (int)$data['investment_property_id'];
    $shares = (int)$data['shares'];

    // Check KYC
    $db = Database::getConnection();
    $kycStmt = $db->prepare("SELECT status FROM kyc_records WHERE user_id = ?");
    $kycStmt->execute([$user['id']]);
    $kyc = $kycStmt->fetch();

    if (!$kyc || $kyc['status'] !== 'verified') {
      Response::error('KYC verification required before investing', 403);
    }

    // Check property availability
    $propStmt = $db->prepare(
      'SELECT id, share_price, available_shares, min_investment, status FROM investment_properties WHERE id = ?'
    );
    $propStmt->execute([$propertyId]);
    $property = $propStmt->fetch();

    if (!$property || $property['status'] !== 'active') {
      Response::error('Investment opportunity not available', 404);
    }

    if ($shares > (int)$property['available_shares']) {
      Response::error("Only {$property['available_shares']} shares available", 400);
    }

    $totalAmount = $shares * (float)$property['share_price'];
    $minInvestment = $property['min_investment'] ? (float)$property['min_investment'] : 0;

    if ($totalAmount < $minInvestment) {
      Response::error("Minimum investment is {$minInvestment}", 400);
    }

    $db->beginTransaction();
    try {
      $stmt = $db->prepare(
        'INSERT INTO investments (user_id, investment_property_id, shares, purchase_price, total_amount)
         VALUES (?, ?, ?, ?, ?)'
      );
      $stmt->execute([
        $user['id'],
        $propertyId,
        $shares,
        $property['share_price'],
        $totalAmount,
      ]);

      $db->prepare(
        'UPDATE investment_properties SET available_shares = available_shares - ? WHERE id = ?'
      )->execute([$shares, $propertyId]);

      // Check if fully funded
      $check = $db->prepare('SELECT available_shares FROM investment_properties WHERE id = ?');
      $check->execute([$propertyId]);
      $remaining = (int)$check->fetchColumn();

      if ($remaining <= 0) {
        $db->prepare("UPDATE investment_properties SET status = 'fully_funded' WHERE id = ?")
          ->execute([$propertyId]);
      }

      $db->commit();

      Response::success([
        'investment_id' => (int)$db->lastInsertId(),
        'shares' => $shares,
        'total_amount' => $totalAmount,
      ], 'Investment successful', 201);
    } catch (Exception $e) {
      $db->rollBack();
      Response::error('Investment failed: ' . $e->getMessage(), 500);
    }
  }

  public static function portfolio(): void
  {
    $user = self::auth();
    $db = Database::getConnection();

    $stmt = $db->prepare(
      'SELECT i.id, i.shares, i.purchase_price, i.total_amount, i.status, i.purchase_date,
              ip.title, ip.total_shares, ip.share_price, ip.expected_yield,
              ip.image, p.city, p.state
       FROM investments i
       JOIN investment_properties ip ON ip.id = i.investment_property_id
       LEFT JOIN properties p ON p.id = ip.property_id
       WHERE i.user_id = ?
       ORDER BY i.purchase_date DESC'
    );
    $stmt->execute([$user['id']]);
    $items = $stmt->fetchAll();

    $totalInvested = 0;
    $totalCurrent = 0;

    foreach ($items as &$item) {
      $item['id'] = (int)$item['id'];
      $item['shares'] = (int)$item['shares'];
      $item['purchase_price'] = (float)$item['purchase_price'];
      $item['total_amount'] = (float)$item['total_amount'];
      $item['total_shares'] = (int)$item['total_shares'];
      $item['share_price'] = (float)$item['share_price'];

      if ($item['status'] === 'active') {
        $totalInvested += $item['total_amount'];
        $totalCurrent += $item['shares'] * $item['share_price'];
      }

      // Get dividend earnings for this investment
      $divStmt = $db->prepare(
        'SELECT COALESCE(SUM(amount), 0) AS total_dividends
         FROM investment_dividend_payments
         WHERE investment_id = ? AND status = "paid"'
      );
      $divStmt->execute([$item['id']]);
      $divResult = $divStmt->fetch();
      $item['dividends_earned'] = (float)$divResult['total_dividends'];
    }

    Response::success([
      'investments' => $items,
      'summary' => [
        'total_invested' => $totalInvested,
        'current_value' => $totalCurrent,
        'total_dividends' => array_sum(array_column($items, 'dividends_earned')),
        'total_return' => $totalCurrent + array_sum(array_column($items, 'dividends_earned')) - $totalInvested,
      ],
    ]);
  }

  public static function sell(array $params): void
  {
    $user = self::auth();
    $id = (int)($params['id'] ?? 0);
    if (!$id) {
      Response::error('Investment ID is required', 400);
    }

    $db = Database::getConnection();
    $stmt = $db->prepare(
      'SELECT i.id, i.shares, i.investment_property_id, ip.title
       FROM investments i
       JOIN investment_properties ip ON ip.id = i.investment_property_id
       WHERE i.id = ? AND i.user_id = ? AND i.status = "active"'
    );
    $stmt->execute([$id, $user['id']]);
    $investment = $stmt->fetch();

    if (!$investment) {
      Response::error('Investment not found or already sold', 404);
    }

    $db->beginTransaction();
    try {
      $db->prepare(
        "UPDATE investments SET status = 'sold', sold_date = NOW() WHERE id = ?"
      )->execute([$id]);

      $db->prepare(
        'UPDATE investment_properties SET available_shares = available_shares + ?, status = "active" WHERE id = ?'
      )->execute([$investment['shares'], $investment['investment_property_id']]);

      $db->commit();
      Response::success(null, 'Shares listed for sale');
    } catch (Exception $e) {
      $db->rollBack();
      Response::error('Failed to sell shares', 500);
    }
  }

  /* ── Admin: List all investment properties ─────────────────── */
  public static function adminList(): void
  {
    AuthMiddleware::authenticateAdmin();
    $page    = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 20)));
    $status  = $_GET['status'] ?? null;

    $db = Database::getConnection();
    $conditions = ['1=1'];
    $binds = [];

    if ($status && in_array($status, ['active', 'fully_funded', 'closed'])) {
      $conditions[] = 'ip.status = ?';
      $binds[] = $status;
    }

    $where = implode(' AND ', $conditions);

    $countStmt = $db->prepare("SELECT COUNT(*) FROM investment_properties ip WHERE {$where}");
    $countStmt->execute($binds);
    $total = (int)$countStmt->fetchColumn();

    $offset = ($page - 1) * $perPage;
    $stmt = $db->prepare(
      "SELECT ip.*, p.title AS property_title, p.city, p.image AS property_image,
              (SELECT COUNT(*) FROM investments i WHERE i.investment_property_id = ip.id AND i.status = 'active') AS investor_count,
              (SELECT COALESCE(SUM(i.total_amount), 0) FROM investments i WHERE i.investment_property_id = ip.id AND i.status = 'active') AS total_raised
       FROM investment_properties ip
       LEFT JOIN properties p ON p.id = ip.property_id
       WHERE {$where}
       ORDER BY ip.created_at DESC LIMIT {$perPage} OFFSET {$offset}"
    );
    $stmt->execute($binds);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$r) {
      $r['id'] = (int)$r['id'];
      $r['total_shares'] = (int)$r['total_shares'];
      $r['available_shares'] = (int)$r['available_shares'];
      $r['share_price'] = (float)$r['share_price'];
      $r['min_investment'] = $r['min_investment'] ? (float)$r['min_investment'] : null;
      $r['expected_yield'] = $r['expected_yield'] ? (float)$r['expected_yield'] : null;
      $r['investor_count'] = (int)$r['investor_count'];
      $r['total_raised'] = (float)$r['total_raised'];
      $r['funding_percentage'] = $r['total_shares'] > 0
        ? round((($r['total_shares'] - $r['available_shares']) / $r['total_shares']) * 100, 1)
        : 0;
    }

    Response::success([
      'data' => $rows, 'total' => $total, 'page' => $page, 'per_page' => $perPage,
      'total_pages' => (int)ceil($total / $perPage),
    ]);
  }

  /* ── Admin: Get single investment property with investors ──── */
  public static function adminShow(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if (!$id) Response::error('Investment property ID is required', 400);

    $db = Database::getConnection();
    $stmt = $db->prepare(
      'SELECT ip.*, p.title AS property_title, p.description AS property_description,
              p.city, p.state, p.image AS property_image, p.price AS property_price,
              p.beds, p.baths, p.area, p.type AS property_type
       FROM investment_properties ip
       LEFT JOIN properties p ON p.id = ip.property_id
       WHERE ip.id = ?'
    );
    $stmt->execute([$id]);
    $item = $stmt->fetch();

    if (!$item) Response::error('Investment property not found', 404);

    $item['id'] = (int)$item['id'];
    $item['total_shares'] = (int)$item['total_shares'];
    $item['available_shares'] = (int)$item['available_shares'];
    $item['share_price'] = (float)$item['share_price'];
    $item['min_investment'] = $item['min_investment'] ? (float)$item['min_investment'] : null;
    $item['expected_yield'] = $item['expected_yield'] ? (float)$item['expected_yield'] : null;
    $item['funding_percentage'] = $item['total_shares'] > 0
      ? round((($item['total_shares'] - $item['available_shares']) / $item['total_shares']) * 100, 1)
      : 0;
    $item['property_details'] = $item['property_details'] ? json_decode($item['property_details'], true) : null;

    // Get investors
    $invStmt = $db->prepare(
      'SELECT i.id, i.shares, i.total_amount, i.purchase_price, i.status, i.purchase_date,
              u.name AS user_name, u.email AS user_email
       FROM investments i
       JOIN users u ON u.id = i.user_id
       WHERE i.investment_property_id = ?
       ORDER BY i.purchase_date DESC'
    );
    $invStmt->execute([$id]);
    $investors = $invStmt->fetchAll();
    foreach ($investors as &$inv) {
      $inv['id'] = (int)$inv['id'];
      $inv['shares'] = (int)$inv['shares'];
      $inv['total_amount'] = (float)$inv['total_amount'];
      $inv['purchase_price'] = (float)$inv['purchase_price'];
    }
    $item['investors'] = $investors;
    $item['investor_count'] = count($investors);

    // Get dividend history
    $divStmt = $db->prepare(
      'SELECT id, amount_per_share, total_amount, declared_at, paid_at, period_start, period_end, status
       FROM dividends WHERE investment_property_id = ? ORDER BY declared_at DESC'
    );
    $divStmt->execute([$id]);
    $dividends = $divStmt->fetchAll();
    foreach ($dividends as &$d) {
      $d['id'] = (int)$d['id'];
      $d['amount_per_share'] = (float)$d['amount_per_share'];
      $d['total_amount'] = (float)$d['total_amount'];
    }
    $item['dividends'] = $dividends;

    Response::success($item);
  }

  /* ── Admin: Create investment property ────────────────────── */
  public static function adminCreate(): void
  {
    AuthMiddleware::authenticateAdmin();

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST;

    $validator = new Validator($input);
    $validator
      ->required('title', 'Title')
      ->required('total_shares', 'Total Shares')
      ->numeric('total_shares', 'Total Shares')
      ->required('share_price', 'Share Price')
      ->numeric('share_price', 'Share Price');

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $data = $validator->validated();
    $db = Database::getConnection();

    $stmt = $db->prepare(
      'INSERT INTO investment_properties (property_id, title, description, image, total_shares, share_price,
        available_shares, min_investment, expected_yield, distribution_frequency, status, property_details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
      !empty($input['property_id']) ? (int)$input['property_id'] : null,
      $data['title'],
      $input['description'] ?? null,
      $input['image'] ?? null,
      (int)$data['total_shares'],
      (float)$data['share_price'],
      (int)$data['total_shares'], // available = total initially
      !empty($input['min_investment']) ? (float)$input['min_investment'] : null,
      !empty($input['expected_yield']) ? (float)$input['expected_yield'] : null,
      $input['distribution_frequency'] ?? 'quarterly',
      $input['status'] ?? 'active',
      !empty($input['property_details']) ? json_encode($input['property_details']) : null,
    ]);

    $newId = (int)$db->lastInsertId();
    Response::success(['id' => $newId], 'Investment property created', 201);
  }

  /* ── Admin: Update investment property ────────────────────── */
  public static function adminUpdate(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if (!$id) Response::error('Investment property ID is required', 400);

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) Response::error('No data provided', 400);

    $db = Database::getConnection();
    $fields = [];
    $binds = [];

    foreach (['title', 'description', 'image'] as $f) {
      if (array_key_exists($f, $input)) {
        $fields[] = "$f = ?";
        $binds[] = $input[$f];
      }
    }
    foreach (['total_shares', 'available_shares'] as $f) {
      if (array_key_exists($f, $input)) {
        $fields[] = "$f = ?";
        $binds[] = (int)$input[$f];
      }
    }
    foreach (['share_price', 'min_investment', 'expected_yield'] as $f) {
      if (array_key_exists($f, $input)) {
        $fields[] = "$f = ?";
        $binds[] = (float)$input[$f];
      }
    }
    if (array_key_exists('property_id', $input)) {
      $fields[] = "property_id = ?";
      $binds[] = $input['property_id'] ? (int)$input['property_id'] : null;
    }
    if (array_key_exists('distribution_frequency', $input)) {
      $fields[] = "distribution_frequency = ?";
      $binds[] = $input['distribution_frequency'];
    }
    if (array_key_exists('property_details', $input)) {
      $fields[] = "property_details = ?";
      $binds[] = json_encode($input['property_details']);
    }

    if (empty($fields)) Response::error('No fields to update', 400);

    $binds[] = $id;
    $sql = "UPDATE investment_properties SET " . implode(', ', $fields) . " WHERE id = ?";
    $db->prepare($sql)->execute($binds);

    Response::success(['id' => $id], 'Investment property updated');
  }

  /* ── Admin: Update investment property status ─────────────── */
  public static function adminUpdateStatus(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if (!$id) Response::error('Investment property ID is required', 400);

    $input = json_decode(file_get_contents('php://input'), true);
    $status = $input['status'] ?? null;

    if (!in_array($status, ['active', 'fully_funded', 'closed'])) {
      Response::error('Invalid status. Use: active, fully_funded, closed', 422);
    }

    $db = Database::getConnection();
    $db->prepare("UPDATE investment_properties SET status = ? WHERE id = ?")->execute([$status, $id]);

    Response::success(['id' => $id, 'status' => $status], 'Investment property status updated');
  }

  /* ── Admin: Delete investment property ────────────────────── */
  public static function adminDelete(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if (!$id) Response::error('Investment property ID is required', 400);

    $db = Database::getConnection();
    $db->prepare('DELETE FROM investment_properties WHERE id = ?')->execute([$id]);

    Response::success(null, 'Investment property deleted');
  }

  /* ── Admin: Declare dividend ──────────────────────────────── */
  public static function adminDeclareDividend(): void
  {
    AuthMiddleware::authenticateAdmin();

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) Response::error('No data provided', 400);

    $validator = new Validator($input);
    $validator
      ->required('investment_property_id', 'Investment Property')
      ->numeric('investment_property_id', 'Investment Property')
      ->required('amount_per_share', 'Amount Per Share')
      ->numeric('amount_per_share', 'Amount Per Share');

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $data = $validator->validated();
    $propertyId = (int)$data['investment_property_id'];
    $amountPerShare = (float)$data['amount_per_share'];

    $db = Database::getConnection();

    // Get total active shares for this property
    $stmt = $db->prepare(
      'SELECT COALESCE(SUM(shares), 0) AS total_active_shares FROM investments
       WHERE investment_property_id = ? AND status = "active"'
    );
    $stmt->execute([$propertyId]);
    $totalShares = (float)$stmt->fetchColumn();

    if ($totalShares <= 0) {
      Response::error('No active investments for this property', 400);
    }

    $totalAmount = $totalShares * $amountPerShare;

    $db->beginTransaction();
    try {
      $stmt = $db->prepare(
        'INSERT INTO dividends (investment_property_id, amount_per_share, total_amount, declared_at, period_start, period_end)
         VALUES (?, ?, ?, NOW(), ?, ?)'
      );
      $stmt->execute([
        $propertyId,
        $amountPerShare,
        $totalAmount,
        $data['period_start'] ?? null,
        $data['period_end'] ?? null,
      ]);
      $dividendId = (int)$db->lastInsertId();

      // Create payment records for each active investor
      $invStmt = $db->prepare(
        'SELECT id, user_id, shares FROM investments WHERE investment_property_id = ? AND status = "active"'
      );
      $invStmt->execute([$propertyId]);
      $investments = $invStmt->fetchAll();

      $payStmt = $db->prepare(
        'INSERT INTO investment_dividend_payments (dividend_id, investment_id, user_id, shares_held, amount)
         VALUES (?, ?, ?, ?, ?)'
      );
      foreach ($investments as $inv) {
        $payStmt->execute([
          $dividendId,
          (int)$inv['id'],
          (int)$inv['user_id'],
          (int)$inv['shares'],
          (float)$inv['shares'] * $amountPerShare,
        ]);
      }

      $db->commit();
      Response::success([
        'dividend_id' => $dividendId,
        'total_amount' => $totalAmount,
        'investors' => count($investments),
      ], 'Dividend declared', 201);
    } catch (Exception $e) {
      $db->rollBack();
      Response::error('Failed to declare dividend: ' . $e->getMessage(), 500);
    }
  }

  /* ── Admin: Mark dividend as paid ─────────────────────────── */
  public static function adminPayDividend(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if (!$id) Response::error('Dividend ID is required', 400);

    $db = Database::getConnection();
    $db->beginTransaction();
    try {
      $db->prepare("UPDATE dividends SET status = 'paid', paid_at = NOW() WHERE id = ?")->execute([$id]);
      $db->prepare("UPDATE investment_dividend_payments SET status = 'paid', paid_at = NOW() WHERE dividend_id = ?")->execute([$id]);
      $db->commit();
      Response::success(null, 'Dividend marked as paid');
    } catch (Exception $e) {
      $db->rollBack();
      Response::error('Failed to mark dividend as paid', 500);
    }
  }
}
