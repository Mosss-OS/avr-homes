<?php

class EscrowController
{
  public static function index(array $params): void
  {
    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 20)));

    $db = Database::getConnection();

    // Build where clause for filters
    $where = "1=1";
    $bindings = [];

    if (isset($_GET['status']) && $_GET['status']) {
      $statuses = explode(',', $_GET['status']);
      $statusWhere = "WHERE status IN (" . str_repeat("?,", count($statuses)) . "?)";
      $statusWhere = rtrim($statusWhere, ',');
      $where .= " {$statusWhere}";
      $bindings = array_merge($bindings, $statuses);
    }

    if (isset($_GET['property_id']) && $_GET['property_id']) {
      $where .= " AND property_id = ?";
      $bindings[] = (int)$_GET['property_id'];
    }

    $countStmt = $db->prepare("SELECT COUNT(*) FROM escrow_contracts WHERE {$where}");
    $countStmt->execute($bindings);
    $total = (int)$countStmt->fetchColumn();

    $offset = ($page - 1) * $perPage;
    $stmt = $db->prepare(
      "SELECT ec.*, p.title, p.city, p.community, p.agent_id,
              u1.name as buyer_name, u2.name as seller_name
       FROM escrow_contracts ec
       LEFT JOIN properties p ON p.id = ec.property_id
       LEFT JOIN users u1 ON u1.id = ec.buyer_id
       LEFT JOIN users u2 ON u2.id = ec.seller_id
       WHERE {$where}
       ORDER BY ec.created_at DESC
       LIMIT {$perPage} OFFSET {$offset}"
    );
    $stmt->execute($bindings);
    $contracts = $stmt->fetchAll();

    foreach ($contracts as &$contract) {
      $contract['id'] = (int)$contract['id'];
      $contract['property_id'] = (int)$contract['property_id'];
      $contract['buyer_id'] = (int)$contract['buyer_id'];
      $contract['seller_id'] = (int)$contract['seller_id'];
      $contract['agent_id'] = $contract['agent_id'] ? (int)$contract['agent_id'] : null;
      $contract['amount'] = (float)$contract['amount'];
      $contract['total_amount'] = (float)$contract['total_amount'];
      $contract['platform_fee'] = (float)$contract['platform_fee'];
      $contract['buyer_payout'] = (float)$contract['buyer_payout'];
      $contract['seller_payout'] = (float)$contract['seller_payout'];
    }

    Response::success([
      'data' => $contracts,
      'total' => $total,
      'page' => $page,
      'per_page' => $perPage,
      'total_pages' => (int)ceil($total / $perPage),
    ], 'Escrow contracts retrieved');
  }

  public static function show(array $params): void
  {
    $contractId = (int)($params['id'] ?? 0);

    $db = Database::getConnection();
    $stmt = $db->prepare(
      "SELECT ec.*, p.title, p.city, p.community, p.agent_id,
              u1.name as buyer_name, u1.email as buyer_email,
              u2.name as seller_name, u2.email as seller_email
       FROM escrow_contracts ec
       LEFT JOIN properties p ON p.id = ec.property_id
       LEFT JOIN users u1 ON u1.id = ec.buyer_id
       LEFT JOIN users u2 ON u2.id = ec.seller_id
       WHERE ec.id = ?"
    );
    $stmt->execute([$contractId]);
    $contract = $stmt->fetch();

    if (!$contract) {
      Response::error('Escrow contract not found', 404);
    }

    $contract['id'] = (int)$contract['id'];
    $contract['property_id'] = (int)$contract['property_id'];
    $contract['buyer_id'] = (int)$contract['buyer_id'];
    $contract['seller_id'] = (int)$contract['seller_id'];
    $contract['agent_id'] = $contract['agent_id'] ? (int)$contract['agent_id'] : null;
    $contract['amount'] = (float)$contract['amount'];
    $contract['total_amount'] = (float)$contract['total_amount'];
    $contract['platform_fee'] = (float)$contract['platform_fee'];
    $contract['buyer_payout'] = (float)$contract['buyer_payout'];
    $contract['seller_payout'] = (float)$contract['seller_payout'];

    Response::success($contract, 'Escrow contract retrieved');
  }

  public static function store(array $params): void
  {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      $input = $_POST;
    }

    $validator = new Validator($input);
    $validator
      ->required('property_id', 'Property ID')
      ->numeric('property_id', 'Property ID')
      ->required('amount', 'Escrow amount')
      ->numeric('amount', 'Escrow amount')
      ->required('buyer_id', 'Buyer ID')
      ->numeric('buyer_id', 'Buyer ID')
      ->required('seller_id', 'Seller ID')
      ->numeric('seller_id', 'Seller ID')
      ->required('release_conditions', 'Release conditions');

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $data = $validator->validated();

    $db = Database::getConnection();

    $db->beginTransaction();
    try {
      // Generate unique contract hash
      $contractHash = substr(md5(time() . $data['property_id'] . rand()), 0, 20);

      // Calculate splits
      $platformFee = (float)($data['amount'] * 0.02);
      $escrowFee = (float)($data['amount'] * 0.005);
      $totalAmount = (float)($data['amount'] + $platformFee + $escrowFee);
      $buyerPayout = $data['amount'];
      $sellerPayout = $data['amount'];

      $stmt = $db->prepare(
        "INSERT INTO escrow_contracts (
           property_id, buyer_id, seller_id, agent_id, amount, currency,
           status, release_conditions, platform_fee, escrow_fee,
           total_amount, buyer_payout, seller_payout, platform_payout,
           contract_hash, expires_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );

      $stmt->execute([
        (int)$data['property_id'],
        (int)$data['buyer_id'],
        (int)$data['seller_id'],
        $data['agent_id'] ?? null,
        (float)$data['amount'],
        'NGN',
        'active',
        json_encode($data['release_conditions']),
        $platformFee,
        $escrowFee,
        $totalAmount,
        $buyerPayout,
        $sellerPayout,
        ($platformFee + $escrowFee),
        $contractHash,
        date('Y-m-d H:i:s', strtotime('+30 days')),
      ]);

      $contractId = (int)$db->lastInsertId();

      // Record initial deposit
      $stmt = $db->prepare(
        "INSERT INTO escrow_transactions (
           contract_id, transaction_type, amount, currency, party,
           reference, status, processed_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      );
      $stmt->execute([
        $contractId,
        'deposit',
        $data['amount'],
        'NGN',
        'buyer',
        $contractHash,
        'completed',
        date('Y-m-d H:i:s'),
      ]);

      $db->commit();
      Response::success(['id' => $contractId], 'Escrow contract created successfully', 201);
    } catch (Exception $e) {
      $db->rollBack();
      Response::error('Failed to create escrow contract: ' . $e->getMessage(), 500);
    }
  }

  public static function release(array $params): void
  {
    $contractId = (int)($params['id'] ?? 0);

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      $input = $_POST;
    }

    $validator = new Validator($input);
    $validator->required('release_reason', 'Release reason');

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $data = $validator->validated();

    $db = Database::getConnection();

    $db->beginTransaction();
    try {
      $stmt = $db->prepare(
        'SELECT id, property_id, buyer_id, seller_id, amount, currency, status, platform_payout, contract_hash
         FROM escrow_contracts
         WHERE id = ? AND status = "active"'
      );
      $stmt->execute([$contractId]);
      $contract = $stmt->fetch();

      if (!$contract) {
        Response::error('Escrow contract not found or not active', 404);
      }

      // Create payment routing record for release
      $stmt = $db->prepare(
        'INSERT INTO payment_routing (provider_id, contract_id, transaction_type, amount, currency, reference, status, payment_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      );
      $stmt->execute([
        1, // Flutterwave provider
        $contractId,
        'payout',
        $contract['amount'],
        $contract['currency'],
        'escrow_' . $contract['id'] . '_' . time(),
        'pending',
        json_encode(['release_reason' => $data['release_reason'], 'release_type' => 'full']),
      ]);

      // Release funds to seller
      $stmt = $db->prepare(
        'UPDATE escrow_contracts 
         SET status = "completed", released_at = NOW()
         WHERE id = ?'
      );
      $stmt->execute([$contractId]);

      Response::success(['id' => $contractId], 'Escrow contract released successfully');
      $db->commit();
    } catch (Exception $e) {
      $db->rollBack();
      Response::error('Failed to release escrow: ' . $e->getMessage(), 500);
    }
  }

  public static function refund(array $params): void
  {
    $contractId = (int)($params['id'] ?? 0);

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      $input = $_POST;
    }

    $validator = new Validator($input);
    $validator->required('refund_reason', 'Refund reason');

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $data = $validator->validated();

    $db = Database::getConnection();

    $stmt = $db->prepare(
      'SELECT * FROM escrow_contracts WHERE id = ? AND status = "active"'
    );
    $stmt->execute([$contractId]);
    $contract = $stmt->fetch();

    if (!$contract) {
      Response::error('Escrow contract not found or not active', 404);
    }

    $db->beginTransaction();
    try {
      $stmt = $db->prepare(
        'UPDATE escrow_contracts SET status = "refunded" WHERE id = ?'
      );
      $stmt->execute([$contractId]);

      $stmt = $db->prepare(
        'INSERT INTO escrow_transactions (contract_id, transaction_type, amount, currency, party, status, processed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      $stmt->execute([
        $contractId,
        'refund',
        $contract['amount'],
        $contract['currency'],
        'buyer',
        'completed',
        date('Y-m-d H:i:s'),
      ]);

      Response::success(['id' => $contractId], 'Escrow contract refunded successfully');
      $db->commit();
    } catch (Exception $e) {
      $db->rollBack();
      Response::error('Failed to refund escrow: ' . $e->getMessage(), 500);
    }
  }
}
