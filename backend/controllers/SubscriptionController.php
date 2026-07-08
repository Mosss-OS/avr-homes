<?php

/**
 * Subscription management endpoints.
 *
 * @package AVRHomes\Controllers
 */

/**
 * Controller for managing agent subscription tiers.
 *
 * Handles retrieving current subscription, upgrading to a different tier,
 * cancelling an active subscription, and providing tier configuration data.
 *
 * @package AVRHomes\Controllers
 */
class SubscriptionController
{
  /**
   * Get the current active subscription for the authenticated agent.
   *
   * Returns free-tier defaults if no subscription exists.
   *
   * @param array $params Route parameters (unused).
   *
   * @return void
   */
  public static function index(array $params): void
  {
    $user = AuthMiddleware::authenticateAgent();
    $userId = $user['id'];

    $db = Database::getConnection();
    $stmt = $db->prepare(
      'SELECT s.tier, s.status, s.listings_limit, s.featured_slots, s.lead_priority, s.analytics_access, s.verification_priority, s.dedicated_manager, s.current_period_start, s.current_period_end, s.cancelled_at
       FROM agent_subscriptions s
       JOIN users u ON u.id = s.agent_id
       WHERE u.id = ? AND s.status = "active"
       ORDER BY s.current_period_start DESC LIMIT 1'
    );
    $stmt->execute([$userId]);
    $subscription = $stmt->fetch();

    if (!$subscription) {
      Response::success([
        'tier' => 'free',
        'status' => 'active',
        'listings_limit' => 3,
        'featured_slots' => 0,
        'lead_priority' => 0,
        'analytics_access' => false,
        'verification_priority' => 0,
        'dedicated_manager' => false,
        'current_period_start' => date('Y-m-d H:i:s', strtotime('now')),
        'current_period_end' => date('Y-m-d H:i:s', strtotime('+1 month')),
        'cancelled_at' => null,
      ], 'Subscription data retrieved');
      return;
    }

    $subscription['current_period_start'] = (string) $subscription['current_period_start'];
    $subscription['current_period_end'] = (string) $subscription['current_period_end'];
    $subscription['cancelled_at'] = $subscription['cancelled_at'] ? (string) $subscription['cancelled_at'] : null;

    Response::success($subscription, 'Subscription data retrieved');
  }

  /**
   * Upgrade or change the subscription tier for the authenticated agent.
   *
   * Accepts a 'tier' parameter (bronze, silver, gold, platinum, free) and
   * creates or updates the subscription record accordingly.
   *
   * @param array $params Route parameters (unused).
   *
   * @return void
   */
  public static function upgrade(array $params): void
  {
    $user = AuthMiddleware::authenticateAgent();
    $userId = $user['id'];

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      $input = $_POST;
    }

    $validator = new Validator($input);
    $validator->required('tier', 'Subscription tier');

    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $data = $validator->validated();

    if (!in_array($data['tier'], ['bronze', 'silver', 'gold', 'platinum'])) {
      Response::error('Invalid subscription tier', 400);
    }

    $db = Database::getConnection();

    $db->beginTransaction();
    try {
      $stmt = $db->prepare(
        'SELECT s.tier, s.status, s.current_period_end
         FROM agent_subscriptions s
         WHERE s.agent_id = ? AND s.status = "active"
         ORDER BY s.current_period_start DESC LIMIT 1'
      );
      $stmt->execute([$userId]);
      $subscription = $stmt->fetch();

      if ($subscription && $data['tier'] !== 'free' && $subscription['status'] === 'active' && strtotime($subscription['current_period_end']) > time()) {
        Response::success([
          'agent_id' => $userId,
          'current_tier' => $subscription['tier'],
          'new_tier' => $data['tier'],
          'current_period_end' => $subscription['current_period_end'],
          'action' => 'upgrade_requires_payment'
        ], 'Subscription upgrade requires payment processing');
        return;
      }

      if ($subscription && ($subscription['status'] !== 'active' || strtotime($subscription['current_period_end']) <= time())) {
        $status = 'active';
        $currentPeriodStart = date('Y-m-d H:i:s');
        $currentPeriodEnd = date('Y-m-d H:i:s', strtotime('+' . ($data['tier'] === 'free' ? '1 month' : '+1 month')));
      } else {
        $status = 'active';
        $currentPeriodStart = date('Y-m-d H:i:s');
        $currentPeriodEnd = date('Y-m-d H:i:s', strtotime('+' . ($data['tier'] === 'free' ? '1 month' : '+1 month')));
      }

      if ($subscription && $subscription['tier'] === $data['tier']) {
        Response::success(['subscription' => $subscription], 'Already subscribed to this tier');
        return;
      }

      $stmt = $db->prepare(
        'INSERT INTO agent_subscriptions (agent_id, tier, status, listings_limit, featured_slots, lead_priority, analytics_access, verification_priority, dedicated_manager, current_period_start, current_period_end)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );

      $tierData = self::getTierData($data['tier']);

      $stmt->execute([
        $userId,
        $data['tier'],
        $status,
        $tierData['listings_limit'],
        $tierData['featured_slots'],
        $tierData['lead_priority'],
        $tierData['analytics_access'],
        $tierData['verification_priority'],
        $tierData['dedicated_manager'],
        $currentPeriodStart,
        $currentPeriodEnd,
      ]);

      $subscriptionId = (int)$db->lastInsertId();

      if ($subscriptionId) {
        $subscription['id'] = $subscriptionId;
        $subscription['tier'] = $data['tier'];
        $subscription['status'] = $status;
        $subscription['listings_limit'] = $tierData['listings_limit'];
        $subscription['featured_slots'] = $tierData['featured_slots'];
        $subscription['lead_priority'] = $tierData['lead_priority'];
        $subscription['analytics_access'] = $tierData['analytics_access'];
        $subscription['verification_priority'] = $tierData['verification_priority'];
        $subscription['dedicated_manager'] = $tierData['dedicated_manager'];
        $subscription['current_period_start'] = $currentPeriodStart;
        $subscription['current_period_end'] = $currentPeriodEnd;
      }

      $db->commit();
      Response::success(['subscription' => $subscription], 'Subscription upgraded successfully');
    } catch (Exception $e) {
      $db->rollBack();
      Response::error('Failed to upgrade subscription: ' . $e->getMessage(), 500);
    }
  }

  /**
   * Cancel the active subscription for the authenticated agent.
   *
   * Sets status to 'cancelled' and records the cancellation timestamp.
   *
   * @param array $params Route parameters (unused).
   *
   * @return void
   */
  public static function cancel(array $params): void
  {
    $user = AuthMiddleware::authenticateAgent();
    $userId = $user['id'];

    $db = Database::getConnection();
    $stmt = $db->prepare(
      'SELECT id, current_period_end, status FROM agent_subscriptions
       WHERE agent_id = ? AND status = "active"
       ORDER BY current_period_start DESC LIMIT 1'
    );
    $stmt->execute([$userId]);
    $subscription = $stmt->fetch();

    if (!$subscription) {
      Response::error('No active subscription found', 404);
    }

    if (strtotime($subscription['current_period_end']) <= time()) {
      Response::error('Subscription has already ended', 400);
    }

    $stmt = $db->prepare(
      'UPDATE agent_subscriptions SET status = "cancelled", cancelled_at = NOW()
       WHERE id = ?'
    );
    $stmt->execute([$subscription['id']]);

    $db->prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)')
      ->execute([$userId, 'cancel_subscription', 'subscription', $subscription['id'], $_SERVER['REMOTE_ADDR'] ?? '']);

    Response::success(null, 'Subscription cancelled successfully');
  }

  /**
   * Get the feature data for a given subscription tier.
   *
   * @param string $tier The tier name (free, bronze, silver, gold, platinum).
   *
   * @return array The tier configuration with listings_limit, featured_slots, etc.
   */
  public static function getTierData(string $tier): array
  {
    $tiers = [
      'free' => [
        'listings_limit' => 3,
        'featured_slots' => 0,
        'lead_priority' => 0,
        'analytics_access' => false,
        'verification_priority' => 0,
        'dedicated_manager' => false,
      ],
      'bronze' => [
        'listings_limit' => 10,
        'featured_slots' => 1,
        'lead_priority' => 1,
        'analytics_access' => false,
        'verification_priority' => 1,
        'dedicated_manager' => false,
      ],
      'silver' => [
        'listings_limit' => 25,
        'featured_slots' => 3,
        'lead_priority' => 2,
        'analytics_access' => false,
        'verification_priority' => 2,
        'dedicated_manager' => false,
      ],
      'gold' => [
        'listings_limit' => 50,
        'featured_slots' => 10,
        'lead_priority' => 3,
        'analytics_access' => true,
        'verification_priority' => 3,
        'dedicated_manager' => true,
      ],
      'platinum' => [
        'listings_limit' => -1,
        'featured_slots' => -1,
        'lead_priority' => 4,
        'analytics_access' => true,
        'verification_priority' => 4,
        'dedicated_manager' => true,
      ],
    ];

    return $tiers[$tier];
  }

  // ─── Admin routes ─────────────────────────────────────────────────────

  /**
   * List all subscriptions with agent info, pagination, filtering.
   *
   * @param array $params Request parameters (unused).
   * @return void
   */
  public static function adminIndex(array $params): void
  {
    AuthMiddleware::authenticateAdmin();

    $page    = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 20)));
    $tier    = $_GET['tier'] ?? null;
    $status  = $_GET['status'] ?? null;
    $search  = $_GET['q'] ?? null;

    $db = Database::getConnection();
    $conditions = ['1=1'];
    $binds = [];

    if ($tier) { $conditions[] = 's.tier = ?'; $binds[] = $tier; }
    if ($status) { $conditions[] = 's.status = ?'; $binds[] = $status; }
    if ($search) { $conditions[] = '(u.name LIKE ? OR u.email LIKE ?)'; $binds[] = "%{$search}%"; $binds[] = "%{$search}%"; }

    $where = implode(' AND ', $conditions);

    try {
      $countStmt = $db->prepare(
        "SELECT COUNT(DISTINCT s.agent_id) FROM agent_subscriptions s
         JOIN users u ON u.id = s.agent_id
         WHERE {$where}"
      );
      $countStmt->execute($binds);
      $total = (int)$countStmt->fetchColumn();

      $offset = ($page - 1) * $perPage;
      $stmt = $db->prepare(
        "SELECT s.*, u.name as user_name, u.email as user_email,
                (SELECT COUNT(*) FROM properties p WHERE p.agent_id = s.agent_id) as listing_count
         FROM agent_subscriptions s
         JOIN users u ON u.id = s.agent_id
         WHERE {$where}
         AND s.id = (
           SELECT s2.id FROM agent_subscriptions s2
           WHERE s2.agent_id = s.agent_id
           ORDER BY s2.current_period_start DESC LIMIT 1
         )
         ORDER BY s.current_period_start DESC
         LIMIT {$perPage} OFFSET {$offset}"
      );
      $stmt->execute($binds);
      $rows = $stmt->fetchAll();

      foreach ($rows as &$r) {
        $r['id'] = (int)$r['id'];
        $r['agent_id'] = (int)$r['agent_id'];
        $r['listings_limit'] = (int)$r['listings_limit'];
        $r['featured_slots'] = (int)$r['featured_slots'];
        $r['lead_priority'] = (int)$r['lead_priority'];
        $r['analytics_access'] = (bool)$r['analytics_access'];
        $r['verification_priority'] = (int)$r['verification_priority'];
        $r['dedicated_manager'] = (bool)$r['dedicated_manager'];
        $r['listing_count'] = (int)$r['listing_count'];
      }
    } catch (Exception $e) {
      $rows = []; $total = 0;
    }

    Response::success([
      'data' => $rows, 'total' => $total,
      'page' => $page, 'per_page' => $perPage,
      'total_pages' => (int)ceil($total / $perPage),
    ]);
  }

  /**
   * Update a subscription's tier (admin).
   *
   * @param array $params Must contain 'id'.
   * @return void
   */
  public static function adminUpdateTier(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) Response::error('Invalid subscription ID', 400);

    $input = json_decode(file_get_contents('php://input'), true);
    $tier = $input['tier'] ?? null;

    if (!in_array($tier, ['free', 'bronze', 'silver', 'gold', 'platinum'])) {
      Response::error('Invalid tier', 422);
    }

    $tierData = self::getTierData($tier);
    $db = Database::getConnection();

    $stmt = $db->prepare(
      "UPDATE agent_subscriptions SET tier = ?, listings_limit = ?, featured_slots = ?,
       lead_priority = ?, analytics_access = ?, verification_priority = ?, dedicated_manager = ?
       WHERE id = ?"
    );
    $stmt->execute([
      $tier, $tierData['listings_limit'], $tierData['featured_slots'],
      $tierData['lead_priority'], (int)$tierData['analytics_access'],
      $tierData['verification_priority'], (int)$tierData['dedicated_manager'],
      $id,
    ]);

    Response::success(['id' => $id, 'tier' => $tier], 'Subscription tier updated');
  }

  /**
   * Update a subscription's status (admin).
   *
   * @param array $params Must contain 'id'.
   * @return void
   */
  public static function adminUpdateStatus(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) Response::error('Invalid subscription ID', 400);

    $input = json_decode(file_get_contents('php://input'), true);
    $status = $input['status'] ?? null;

    if (!in_array($status, ['active', 'cancelled', 'past_due'])) {
      Response::error('Invalid status. Use: active, cancelled, past_due', 422);
    }

    $db = Database::getConnection();
    $cancelled = $status === 'cancelled' ? ", cancelled_at = NOW()" : "";
    $db->prepare("UPDATE agent_subscriptions SET status = ? {$cancelled} WHERE id = ?")->execute([$status, $id]);

    Response::success(['id' => $id, 'status' => $status], 'Subscription status updated');
  }
}
