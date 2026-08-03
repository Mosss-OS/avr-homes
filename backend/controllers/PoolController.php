<?php

declare(strict_types=1);

/**
 * PoolController — pooled property investment (ajo/esusu group contribution).
 *
 * Public: list & show pools. Authenticated: join a pool, view my memberships,
 * contribution schedule, and history. Admin: create / update / delete pools.
 *
 * @package AvrHomes
 */
class PoolController
{
  /**
   * Public list of active pools with funding progress.
   */
  public static function index(array $params): void
  {
    $db = Database::getConnection();
    $status = $_GET['status'] ?? 'active';
    $where = '';
    $bindings = [];

    if ($status === 'active') {
      $where = "WHERE p.status IN ('active','funded')";
    } elseif ($status === 'all') {
      $where = '';
    } else {
      $where = "WHERE p.status = :status";
      $bindings[':status'] = $status;
    }

    $stmt = $db->prepare(
      "SELECT p.*, pr.title as property_title, pr.city as property_city, pr.image as property_image
       FROM investment_pools p
       LEFT JOIN properties pr ON pr.id = p.target_property_id
       {$where}
       ORDER BY p.status = 'active' DESC, p.created_at DESC"
    );
    $stmt->execute($bindings);
    $pools = $stmt->fetchAll();

    foreach ($pools as &$pool) {
      self::hydratePool($pool);
    }

    Response::success(['data' => $pools]);
  }

  /**
   * Public pool detail (by id or slug).
   */
  public static function show(array $params): void
  {
    $db = Database::getConnection();
    $key = $params['id'] ?? $params['slug'] ?? '';
    $isNumeric = ctype_digit((string)$key);

    if ($isNumeric) {
      $stmt = $db->prepare(
        "SELECT p.*, pr.title as property_title, pr.city as property_city, pr.image as property_image, pr.address as property_address
         FROM investment_pools p
         LEFT JOIN properties pr ON pr.id = p.target_property_id
         WHERE p.id = ?"
      );
      $stmt->execute([(int)$key]);
    } else {
      $stmt = $db->prepare(
        "SELECT p.*, pr.title as property_title, pr.city as property_city, pr.image as property_image, pr.address as property_address
         FROM investment_pools p
         LEFT JOIN properties pr ON pr.id = p.target_property_id
         WHERE p.slug = ?"
      );
      $stmt->execute([$key]);
    }

    $pool = $stmt->fetch();
    if (!$pool) {
      Response::error('Pool not found', 404);
    }

    self::hydratePool($pool);

    // Flag membership for logged-in users so the UI can disable the join form.
    $pool['is_member'] = false;
    $user = AuthMiddleware::tryAuthenticate();
    if ($user) {
      $stmt = $db->prepare(
        "SELECT id FROM pool_memberships WHERE pool_id = ? AND user_id = ? AND status IN ('active','paused','defaulted')"
      );
      $stmt->execute([(int)$pool['id'], (int)$user['id']]);
      if ($stmt->fetch()) {
        $pool['is_member'] = true;
      }
    }

    Response::success($pool);
  }

  /**
   * Authenticated user joins a pool.
   *
   * Body: plan_type ('monthly'|'lump_sum'|'both'), monthly_amount (required for
   * monthly plans), auto_debit (bool).
   */
  public static function join(array $params): void
  {
    $user = AuthMiddleware::authenticate();
    $poolId = (int)($params['id'] ?? 0);

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
      $input = $_POST;
    }

    if ($poolId <= 0) {
      Response::error('Invalid pool ID', 400);
    }

    $db = Database::getConnection();
    $stmt = $db->prepare('SELECT * FROM investment_pools WHERE id = ?');
    $stmt->execute([$poolId]);
    $pool = $stmt->fetch();
    if (!$pool) {
      Response::error('Pool not found', 404);
    }
    if (!in_array($pool['status'], ['active', 'funded'], true)) {
      Response::error('This pool is no longer accepting contributions', 422);
    }

    $planType = $input['plan_type'] ?? 'monthly';
    if (!in_array($planType, ['monthly', 'lump_sum', 'both'], true)) {
      Response::error('Invalid plan type', 422);
    }
    if ($planType === 'lump_sum' && (int)$pool['allow_lump_sum'] !== 1) {
      Response::error('This pool does not accept one-time contributions', 422);
    }
    if ($planType !== 'lump_sum' && (int)$pool['allow_monthly'] !== 1) {
      Response::error('This pool does not accept monthly contributions', 422);
    }

    $monthlyAmount = (float)($input['monthly_amount'] ?? $pool['default_monthly'] ?? 0);
    if ($planType !== 'lump_sum') {
      $min = $pool['min_monthly'] !== null ? (float)$pool['min_monthly'] : 0;
      $max = $pool['max_monthly'] !== null ? (float)$pool['max_monthly'] : 0;
      if ($monthlyAmount <= 0) {
        Response::error('Monthly contribution amount is required', 422);
      }
      if ($min > 0 && $monthlyAmount < $min) {
        Response::error('Monthly contribution is below the minimum of ₦' . number_format($min), 422);
      }
      if ($max > 0 && $monthlyAmount > $max) {
        Response::error('Monthly contribution exceeds the maximum of ₦' . number_format($max), 422);
      }
    }

    // Prevent duplicate membership
    $check = $db->prepare('SELECT id FROM pool_memberships WHERE pool_id = ? AND user_id = ? AND status IN (\'active\',\'paused\',\'defaulted\')');
    $check->execute([$poolId, (int)$user['id']]);
    if ($check->fetch()) {
      Response::error('You are already a member of this pool', 422);
    }

    $db->beginTransaction();
    try {
      $stmt = $db->prepare(
        'INSERT INTO pool_memberships (pool_id, user_id, plan_type, monthly_amount, auto_debit, status, joined_at)
         VALUES (?, ?, ?, ?, ?, \'active\', NOW())'
      );
      $stmt->execute([
        $poolId,
        (int)$user['id'],
        $planType,
        $planType === 'lump_sum' ? null : $monthlyAmount,
        !empty($input['auto_debit']) ? 1 : 0,
      ]);
      $membershipId = (int)$db->lastInsertId();

    // Generate the first monthly schedule (due on the 1st of next month).
    $firstScheduleId = null;
    if ($planType !== 'lump_sum') {
      $firstDue = date('Y-m-d', strtotime('first day of next month'));
      $stmt = $db->prepare(
        'INSERT INTO pool_schedules (membership_id, pool_id, user_id, due_date, amount, penalty_amount, total_due, status, created_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, \'pending\', NOW())'
      );
      $stmt->execute([$membershipId, $poolId, (int)$user['id'], $firstDue, $monthlyAmount, $monthlyAmount]);
      $firstScheduleId = (int)$db->lastInsertId();
    }

      // Bump the pool's member count.
      $stmt = $db->prepare('UPDATE investment_pools SET member_count = member_count + 1 WHERE id = ?');
      $stmt->execute([$poolId]);

      $db->commit();
    } catch (\Throwable $e) {
      if ($db->inTransaction()) {
        $db->rollBack();
      }
      Response::error('Failed to join pool: ' . $e->getMessage(), 500);
    }

    // Welcome email.
    try {
      $poolStmt = $db->prepare('SELECT * FROM investment_pools WHERE id = ?');
      $poolStmt->execute([$poolId]);
      $poolRow = $poolStmt->fetch();
      if ($poolRow) {
        $body = NotificationService::naira($monthlyAmount);
        NotificationService::notify(
          $user,
          $poolId,
          $membershipId,
          null,
          'welcome',
          'Welcome to the ' . $poolRow['title'] . ' pool',
          "<h2 style=\"margin:0 0 12px;color:#0A1628;\">You're in! 🎉</h2>" .
          "<p style=\"margin:0 0 12px;color:#4b5563;line-height:1.6;\">Welcome to the <strong>{$poolRow['title']}</strong> pool.</p>" .
          "<p style=\"margin:0 0 12px;color:#4b5563;line-height:1.6;\">Your " . ($planType === 'lump_sum' ? 'one-time' : 'monthly') . " contribution plan is active. " .
          ($planType !== 'lump_sum' ? "Your first monthly payment of <strong>{$body}</strong> is due on <strong>1st of next month</strong>.<br>" : '') .
          "Payments are held securely in the company account until the pool reaches its target and the property is purchased.</p>" .
          "<p style=\"margin:0;color:#9ca3af;font-size:13px;\">You'll receive 3 reminder emails before every due date. Missing a payment incurs a " .
          $poolRow['penalty_rate'] . "% late fee after " . $poolRow['grace_days'] . " days.</p>"
        );
      }
    } catch (\Throwable $e) {
      error_log('Pool welcome email failed: ' . $e->getMessage());
    }

    Response::success([
      'membership_id' => $membershipId,
      'first_schedule_id' => $firstScheduleId,
      'plan_type' => $planType,
      'monthly_amount' => $planType === 'lump_sum' ? null : $monthlyAmount,
    ], 'You have joined the pool successfully', 201);
  }

  /**
   * Authenticated user's list of pool memberships.
   */
  public static function myPools(array $params): void
  {
    $user = AuthMiddleware::authenticate();

    $db = Database::getConnection();
    $stmt = $db->prepare(
      "SELECT m.*, p.title as pool_title, p.slug as pool_slug, p.image as pool_image,
              p.target_amount, p.current_raised, p.status as pool_status, p.penalty_rate, p.grace_days,
              (SELECT COALESCE(SUM(c.amount), 0) FROM pool_contributions c WHERE c.membership_id = m.id AND c.status = 'paid') as total_contributed,
              (SELECT COALESCE(SUM(s.total_due), 0) FROM pool_schedules s WHERE s.membership_id = m.id AND s.status IN ('pending','overdue')) as outstanding,
              (SELECT COUNT(*) FROM pool_schedules s WHERE s.membership_id = m.id AND s.status IN ('pending','overdue')) as pending_count,
              (SELECT COUNT(*) FROM pool_schedules s WHERE s.membership_id = m.id AND s.status = 'overdue') as overdue_count,
              (SELECT MIN(s.due_date) FROM pool_schedules s WHERE s.membership_id = m.id AND s.status = 'pending') as next_due_date
       FROM pool_memberships m
       JOIN investment_pools p ON p.id = m.pool_id
       WHERE m.user_id = ?
       ORDER BY m.joined_at DESC"
    );
    $stmt->execute([(int)$user['id']]);
    $memberships = $stmt->fetchAll();

    foreach ($memberships as &$m) {
      $m['id'] = (int)$m['id'];
      $m['pool_id'] = (int)$m['pool_id'];
      $m['total_contributed'] = (float)$m['total_contributed'];
      $m['outstanding'] = (float)$m['outstanding'];
      $m['pending_count'] = (int)$m['pending_count'];
      $m['overdue_count'] = (int)$m['overdue_count'];
      $m['monthly_amount'] = $m['monthly_amount'] !== null ? (float)$m['monthly_amount'] : null;
      $m['target_amount'] = (float)$m['target_amount'];
      $m['current_raised'] = (float)$m['current_raised'];
      $m['auto_debit'] = (bool)$m['auto_debit'];
    }

    Response::success(['data' => $memberships]);
  }

  /**
   * Authenticated user's detailed membership: schedules + contributions.
   */
  public static function myPool(array $params): void
  {
    $user = AuthMiddleware::authenticate();
    $membershipId = (int)($params['membership_id'] ?? 0);

    $db = Database::getConnection();
    $stmt = $db->prepare(
      "SELECT m.*, p.title as pool_title, p.slug as pool_slug, p.image as pool_image,
              p.target_amount, p.current_raised, p.penalty_rate, p.grace_days, p.default_after_days, p.status as pool_status,
              (SELECT COALESCE(SUM(c.amount), 0) FROM pool_contributions c WHERE c.membership_id = m.id AND c.status = 'paid') as total_contributed,
              (SELECT COALESCE(SUM(c.penalty_amount), 0) FROM pool_contributions c WHERE c.membership_id = m.id AND c.status = 'paid') as total_penalties
       FROM pool_memberships m
       JOIN investment_pools p ON p.id = m.pool_id
       WHERE m.id = ? AND m.user_id = ?"
    );
    $stmt->execute([$membershipId, (int)$user['id']]);
    $membership = $stmt->fetch();
    if (!$membership) {
      Response::error('Membership not found', 404);
    }

    $membership['id'] = (int)$membership['id'];
    $membership['pool_id'] = (int)$membership['pool_id'];
    $membership['total_contributed'] = (float)$membership['total_contributed'];
    $membership['total_penalties'] = (float)$membership['total_penalties'];
    $membership['monthly_amount'] = $membership['monthly_amount'] !== null ? (float)$membership['monthly_amount'] : null;
    $membership['target_amount'] = (float)$membership['target_amount'];
    $membership['current_raised'] = (float)$membership['current_raised'];
    $membership['auto_debit'] = (bool)$membership['auto_debit'];

    $schedStmt = $db->prepare(
      'SELECT id, due_date, amount, penalty_amount, total_due, status, paid_at, payment_ref
       FROM pool_schedules WHERE membership_id = ? ORDER BY due_date DESC'
    );
    $schedStmt->execute([$membershipId]);
    $schedules = $schedStmt->fetchAll();
    foreach ($schedules as &$s) {
      $s['id'] = (int)$s['id'];
      $s['amount'] = (float)$s['amount'];
      $s['penalty_amount'] = (float)$s['penalty_amount'];
      $s['total_due'] = (float)$s['total_due'];
    }

    $contribStmt = $db->prepare(
      'SELECT id, amount, penalty_amount, type, channel, payment_ref, status, paid_at, created_at
       FROM pool_contributions WHERE membership_id = ? ORDER BY created_at DESC LIMIT 100'
    );
    $contribStmt->execute([$membershipId]);
    $contributions = $contribStmt->fetchAll();
    foreach ($contributions as &$c) {
      $c['id'] = (int)$c['id'];
      $c['amount'] = (float)$c['amount'];
      $c['penalty_amount'] = (float)$c['penalty_amount'];
    }

    Response::success([
      'membership' => $membership,
      'schedules' => $schedules,
      'contributions' => $contributions,
    ]);
  }

  /* ────────────────────────── Admin ────────────────────────── */

  public static function adminList(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $db = Database::getConnection();
    $stmt = $db->prepare('SELECT * FROM investment_pools ORDER BY created_at DESC');
    $stmt->execute();
    $pools = $stmt->fetchAll();
    foreach ($pools as &$pool) {
      self::hydratePool($pool);
    }
    Response::success(['data' => $pools]);
  }

  public static function adminCreate(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $db = Database::getConnection();

    $validator = new Validator($input);
    $validator
      ->required('title', 'Title')
      ->required('target_amount', 'Target Amount')
      ->numeric('target_amount', 'Target Amount');
    if ($validator->fails()) {
      Response::error('Validation failed', 422, $validator->getErrors());
    }

    $slug = self::generateSlug($input['title']);
    $stmt = $db->prepare(
      'INSERT INTO investment_pools (title, slug, description, image, target_property_id, target_amount,
        default_monthly, min_monthly, max_monthly, min_lump_sum, allow_monthly, allow_lump_sum,
        penalty_rate, grace_days, default_after_days, reminder_days_before, start_date, end_date, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())'
    );
    $stmt->execute([
      $input['title'],
      $slug,
      $input['description'] ?? null,
      $input['image'] ?? null,
      !empty($input['target_property_id']) ? (int)$input['target_property_id'] : null,
      (float)$input['target_amount'],
      $input['default_monthly'] !== '' ? (float)$input['default_monthly'] : null,
      $input['min_monthly'] !== '' ? (float)$input['min_monthly'] : null,
      $input['max_monthly'] !== '' ? (float)$input['max_monthly'] : null,
      $input['min_lump_sum'] !== '' ? (float)$input['min_lump_sum'] : null,
      !empty($input['allow_monthly']) ? 1 : 0,
      !empty($input['allow_lump_sum']) ? 1 : 0,
      (float)($input['penalty_rate'] ?? 5.00),
      (int)($input['grace_days'] ?? 7),
      (int)($input['default_after_days'] ?? 30),
      $input['reminder_days_before'] ?? '7,3,1',
      $input['start_date'] ?: null,
      $input['end_date'] ?: null,
      $input['status'] ?? 'draft',
    ]);

    Response::success(['id' => (int)$db->lastInsertId()], 'Pool created successfully', 201);
  }

  public static function adminUpdate(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $db = Database::getConnection();

    $stmt = $db->prepare('SELECT id FROM investment_pools WHERE id = ?');
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
      Response::error('Pool not found', 404);
    }

    $allowed = ['title', 'description', 'image', 'target_property_id', 'target_amount',
      'default_monthly', 'min_monthly', 'max_monthly', 'min_lump_sum', 'allow_monthly',
      'allow_lump_sum', 'penalty_rate', 'grace_days', 'default_after_days',
      'reminder_days_before', 'start_date', 'end_date', 'status'];
    $fields = [];
    $bindings = [':id' => $id];
    foreach ($allowed as $field) {
      if (array_key_exists($field, $input)) {
        $fields[] = "{$field} = :{$field}";
        if (in_array($field, ['allow_monthly', 'allow_lump_sum'], true)) {
          $bindings[":{$field}"] = !empty($input[$field]) ? 1 : 0;
        } elseif (in_array($field, ['target_amount', 'default_monthly', 'min_monthly', 'max_monthly', 'min_lump_sum', 'penalty_rate'], true)) {
          $bindings[":{$field}"] = ($input[$field] === '' || $input[$field] === null) ? null : (float)$input[$field];
        } elseif (in_array($field, ['grace_days', 'default_after_days', 'target_property_id'], true)) {
          $bindings[":{$field}"] = ($input[$field] === '' || $input[$field] === null) ? null : (int)$input[$field];
        } elseif (in_array($field, ['start_date', 'end_date'], true)) {
          $bindings[":{$field}"] = $input[$field] ?: null;
        } else {
          $bindings[":{$field}"] = $input[$field];
        }
      }
    }
    if (!empty($fields)) {
      $db->prepare('UPDATE investment_pools SET ' . implode(', ', $fields) . ' WHERE id = :id')->execute($bindings);
    }

    Response::success(null, 'Pool updated successfully');
  }

  public static function adminDelete(array $params): void
  {
    AuthMiddleware::authenticateAdmin();
    $id = (int)($params['id'] ?? 0);
    $db = Database::getConnection();
    $db->prepare('DELETE FROM investment_pools WHERE id = ?')->execute([$id]);
    Response::success(null, 'Pool deleted successfully');
  }

  /* ────────────────────────── Helpers ────────────────────────── */

  private static function hydratePool(array &$pool): void
  {
    $pool['id'] = (int)$pool['id'];
    $pool['target_property_id'] = $pool['target_property_id'] !== null ? (int)$pool['target_property_id'] : null;
    $pool['target_amount'] = (float)$pool['target_amount'];
    $pool['current_raised'] = (float)$pool['current_raised'];
    $pool['member_count'] = (int)$pool['member_count'];
    $pool['allow_monthly'] = (bool)$pool['allow_monthly'];
    $pool['allow_lump_sum'] = (bool)$pool['allow_lump_sum'];
    $pool['penalty_rate'] = (float)$pool['penalty_rate'];
    $pool['grace_days'] = (int)$pool['grace_days'];
    $pool['default_after_days'] = (int)$pool['default_after_days'];
    $pool['default_monthly'] = $pool['default_monthly'] !== null ? (float)$pool['default_monthly'] : null;
    $pool['min_monthly'] = $pool['min_monthly'] !== null ? (float)$pool['min_monthly'] : null;
    $pool['max_monthly'] = $pool['max_monthly'] !== null ? (float)$pool['max_monthly'] : null;
    $pool['min_lump_sum'] = $pool['min_lump_sum'] !== null ? (float)$pool['min_lump_sum'] : null;
    $pool['funding_percentage'] = $pool['target_amount'] > 0
      ? (int)floor($pool['current_raised'] / $pool['target_amount'] * 100)
      : 0;
    $pool['reminder_days'] = array_map('intval', explode(',', $pool['reminder_days_before'] ?? '7,3,1'));
  }

  public static function generateSlug(string $title): string
  {
    $slug = strtolower(trim($title));
    $slug = preg_replace('/[^a-z0-9\s-]/', '', $slug);
    $slug = preg_replace('/[\s-]+/', '-', $slug);
    $slug = trim($slug, '-');
    if ($slug === '') {
      $slug = 'pool-' . time();
    }
    return $slug;
  }
}
