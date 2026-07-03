<?php

class WalletController
{
  public static function show(array $params): void
  {
    $user = AuthMiddleware::authenticateAgent();
    $userId = $user['id'];

    $db = Database::getConnection();
    $stmt = $db->prepare(
      'SELECT id, balance, total_earned, total_withdrawn, created_at, updated_at
       FROM agent_wallets WHERE agent_id = ?'
    );
    $stmt->execute([$userId]);
    $wallet = $stmt->fetch();

    if (!$wallet) {
      // Create wallet if doesn't exist
      $stmt = $db->prepare(
        'INSERT INTO agent_wallets (agent_id, balance, total_earned, total_withdrawn) VALUES (?, 0, 0, 0)'
      );
      $stmt->execute([$userId]);
      $wallet = [
        'id' => (int)$db->lastInsertId(),
        'agent_id' => $userId,
        'balance' => '0.00',
        'total_earned' => '0.00',
        'total_withdrawn' => '0.00',
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s'),
      ];
    }

    $wallet['id'] = (int)$wallet['id'];
    $wallet['balance'] = (float)$wallet['balance'];
    $wallet['total_earned'] = (float)$wallet['total_earned'];
    $wallet['total_withdrawn'] = (float)$wallet['total_withdrawn'];

    Response::success($wallet, 'Wallet retrieved');
  }

  public static function transactions(array $params): void
  {
    $user = AuthMiddleware::authenticateAgent();
    $userId = $user['id'];

    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(100, max(1, (int)($_GET['per_page'] ?? 20)));

    $db = Database::getConnection();

    // Get wallet ID first
    $stmt = $db->prepare('SELECT id FROM agent_wallets WHERE agent_id = ?');
    $stmt->execute([$userId]);
    $wallet = $stmt->fetch();

    if (!$wallet) {
      Response::success(['data' => [], 'total' => 0, 'page' => 1, 'per_page' => $perPage, 'total_pages' => 0]);
      return;
    }

    $walletId = (int)$wallet['id'];

    $countStmt = $db->prepare('SELECT COUNT(*) FROM wallet_transactions WHERE wallet_id = ?');
    $countStmt->execute([$walletId]);
    $total = (int)$countStmt->fetchColumn();

    $offset = ($page - 1) * $perPage;
    $stmt = $db->prepare(
      'SELECT * FROM wallet_transactions WHERE wallet_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    );
    $stmt->execute([$walletId, $perPage, $offset]);
    $transactions = $stmt->fetchAll();

    foreach ($transactions as &$tx) {
      $tx['id'] = (int)$tx['id'];
      $tx['wallet_id'] = (int)$tx['wallet_id'];
      $tx['amount'] = (float)$tx['amount'];
    }

    Response::success([
      'data' => $transactions,
      'total' => $total,
      'page' => $page,
      'per_page' => $perPage,
      'total_pages' => (int)ceil($total / $perPage),
    ], 'Wallet transactions retrieved');
  }

  public static function requestWithdrawal(array $params): void
  {
    $user = AuthMiddleware::authenticateAgent();
    $userId = $user['id'];

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      $input = $_POST;
    }

    $validator = new Validator($input);
    $validator
      ->required('amount', 'Amount')
      ->numeric('amount', 'Amount')
      ->required('bank_name', 'Bank Name')
      ->string('bank_name', 'Bank Name', 100)
      ->required('account_number', 'Account Number')
      ->string('account_number', 'Account Number', 20)
      ->required('account_name', 'Account Name')
      ->string('account_name', 'Account Name', 100);

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $data = $validator->validated();

    $db = Database::getConnection();
    $stmt = $db->prepare('SELECT id, balance FROM agent_wallets WHERE agent_id = ?');
    $stmt->execute([$userId]);
    $wallet = $stmt->fetch();

    if (!$wallet) {
      Response::error('Wallet not found', 404);
    }

    if ((float)$data['amount'] > (float)$wallet['balance']) {
      Response::error('Insufficient balance', 400);
    }

    if ((float)$data['amount'] < 1000) {
      Response::error('Minimum withdrawal amount is ₦1,000', 400);
    }

    $db->beginTransaction();
    try {
      $walletId = (int)$wallet['id'];
      $reference = 'WD_' . strtoupper(substr(bin2hex(random_bytes(6)), 0, 10));

      // Create withdrawal transaction
      $stmt = $db->prepare(
        'INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference, status)
         VALUES (?, "debit", ?, ?, ?, "pending")'
      );
      $stmt->execute([
        $walletId,
        (float)$data['amount'],
        'Withdrawal to ' . $data['bank_name'] . ' - ' . $data['account_number'],
        $reference,
      ]);
      $txId = (int)$db->lastInsertId();

      // Update wallet balance (reserve the amount)
      $stmt = $db->prepare(
        'UPDATE agent_wallets SET balance = balance - ?, total_withdrawn = total_withdrawn + ? WHERE id = ?'
      );
      $stmt->execute([(float)$data['amount'], (float)$data['amount'], $walletId]);

      // Log activity
      $db->prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
        ->execute([$userId, 'withdrawal_request', 'wallet', $walletId, json_encode(['amount' => $data['amount'], 'bank' => $data['bank_name']]), $_SERVER['REMOTE_ADDR'] ?? '']);

      $db->commit();

      Response::success([
        'id' => $txId,
        'reference' => $reference,
        'amount' => (float)$data['amount'],
        'status' => 'pending',
      ], 'Withdrawal request submitted. Processing takes 1-3 business days.', 201);
    } catch (Exception $e) {
      $db->rollBack();
      Response::error('Failed to process withdrawal: ' . $e->getMessage(), 500);
    }
  }
}