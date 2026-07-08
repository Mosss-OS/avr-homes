<?php

/**
 * Referral program endpoints.
 *
 * @package AVRHomes\Controllers
 */

/**
 * Controller for managing agent referral codes and statistics.
 *
 * Handles listing referrals, generating unique referral codes,
 * and retrieving referral stats.
 *
 * @package AVRHomes\Controllers
 */
class ReferralController
{
  /**
   * List referrals for the authenticated agent.
   *
   * Supports pagination. Includes referred user names and emails.
   *
   * @param array $params Route parameters (unused).
   *
   * @return void
   */
  public static function index(array $params): void
  {
    $user = AuthMiddleware::authenticateAgent();
    $userId = $user['id'];

    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 20)));

    $db = Database::getConnection();

    // Total count
    $countStmt = $db->prepare('SELECT COUNT(*) FROM referrals WHERE referrer_id = ?');
    $countStmt->execute([$userId]);
    $total = (int)$countStmt->fetchColumn();

    // Referrals with referred user info
    $offset = ($page - 1) * $perPage;
    $stmt = $db->prepare(
      "SELECT r.*, u.name as referred_name, u.email as referred_email, u.created_at as referred_at
       FROM referrals r
       LEFT JOIN users u ON u.id = r.referred_id
       WHERE r.referrer_id = ?
       ORDER BY r.created_at DESC
       LIMIT {$perPage} OFFSET {$offset}"
    );
    $stmt->execute([$userId]);
    $referrals = $stmt->fetchAll();

    foreach ($referrals as &$ref) {
      $ref['id'] = (int)$ref['id'];
      $ref['referrer_id'] = (int)$ref['referrer_id'];
      $ref['referred_id'] = $ref['referred_id'] ? (int)$ref['referred_id'] : null;
      $ref['reward_amount'] = (float)$ref['reward_amount'];
      $ref['reward_paid'] = (bool)$ref['reward_paid'];
      $ref['referred_name'] = $ref['referred_name'] ?? null;
      $ref['referred_email'] = $ref['referred_email'] ?? null;
    }

    Response::success([
      'data' => $referrals,
      'total' => $total,
      'page' => $page,
      'per_page' => $perPage,
      'total_pages' => (int)ceil($total / $perPage),
    ], 'Referrals retrieved');
  }

  /**
   * Generate a unique referral code for the authenticated agent.
   *
   * If a code already exists for the agent it is returned instead.
   *
   * @param array $params Route parameters (unused).
   *
   * @return void
   */
  public static function generateCode(array $params): void
  {
    $user = AuthMiddleware::authenticateAgent();
    $userId = $user['id'];

    $db = Database::getConnection();

    // Check if agent already has a referral code
    $stmt = $db->prepare('SELECT referral_code FROM referrals WHERE referrer_id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $existing = $stmt->fetchColumn();

    if ($existing) {
      Response::success(['referral_code' => $existing], 'Referral code already exists');
      return;
    }

    // Generate unique referral code
    $code = self::generateUniqueCode($db);
    $stmt = $db->prepare(
      'INSERT INTO referrals (referrer_id, referral_code, status) VALUES (?, ?, "pending")'
    );
    $stmt->execute([$userId, $code]);

    Response::success(['referral_code' => $code], 'Referral code generated', 201);
  }

  /**
   * Get referral statistics for the authenticated agent.
   *
   * Includes counts by status and total earned/pending reward amounts.
   *
   * @param array $params Route parameters (unused).
   *
   * @return void
   */
  public static function stats(array $params): void
  {
    $user = AuthMiddleware::authenticateAgent();
    $userId = $user['id'];

    $db = Database::getConnection();

    $stmt = $db->prepare(
      "SELECT 
         COUNT(*) as total_referrals,
         SUM(CASE WHEN status = 'signed_up' THEN 1 ELSE 0 END) as signed_up,
         SUM(CASE WHEN status = 'upgraded' THEN 1 ELSE 0 END) as upgraded,
         SUM(CASE WHEN status = 'developer_referred' THEN 1 ELSE 0 END) as developer_referred,
         SUM(CASE WHEN status = 'bulk_buyer_referred' THEN 1 ELSE 0 END) as bulk_buyer_referred,
         SUM(CASE WHEN reward_paid = 1 THEN reward_amount ELSE 0 END) as total_earned,
         SUM(CASE WHEN reward_paid = 0 THEN reward_amount ELSE 0 END) as pending_rewards
       FROM referrals WHERE referrer_id = ?"
    );
    $stmt->execute([$userId]);
    $stats = $stmt->fetch();

    foreach (['total_referrals', 'signed_up', 'upgraded', 'developer_referred', 'bulk_buyer_referred'] as $k) {
      $stats[$k] = (int)($stats[$k] ?? 0);
    }
    $stats['total_earned'] = (float)$stats['total_earned'];
    $stats['pending_rewards'] = (float)$stats['pending_rewards'];

    Response::success($stats, 'Referral stats retrieved');
  }

  /**
   * Generate a unique 8-character referral code.
   *
   * Attempts up to 10 random codes before falling back to a hex-based code.
   *
   * @param PDO $db Database connection for uniqueness checks.
   *
   * @return string A unique referral code.
   */
  private static function generateUniqueCode(PDO $db): string
  {
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for ($attempt = 0; $attempt < 10; $attempt++) {
      $code = '';
      for ($i = 0; $i < 8; $i++) {
        $code .= $chars[random_int(0, strlen($chars) - 1)];
      }
      $stmt = $db->prepare('SELECT 1 FROM referrals WHERE referral_code = ?');
      $stmt->execute([$code]);
      if (!$stmt->fetchColumn()) {
        return $code;
      }
    }
    // Fallback: use user ID + random
    return 'REF' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));
  }
}