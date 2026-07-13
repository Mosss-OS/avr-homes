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
}
