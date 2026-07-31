<?php

declare(strict_types=1);

/**
 * PoolPaymentController — Paystack payments for pool contributions.
 *
 * Supports:
 *  - Manual per-schedule payment (inline popup + server-side verification)
 *  - One-time lump-sum contributions
 *  - Paystack recurring subscriptions (auto-debit) for monthly plans
 *  - Webhook handling for subscription / charge events
 *
 * @package AvrHomes
 */
class PoolPaymentController
{
  /**
   * Initialize a Paystack payment.
   *
   * Body:
   *   membership_id : int          (required)
   *   schedule_id   : int          (pay a specific monthly installment)
   *   amount        : float        (for lump_sum contributions)
   *   type          : 'schedule'|'lump_sum'
   *   auto_debit    : bool         (when true, include a recurring plan)
   */
  public static function initializePayment(array $params): void
  {
    $user = AuthMiddleware::authenticate();
    $input = json_decode(file_get_contents('php://input'), true) ?: [];

    $membershipId = (int)($input['membership_id'] ?? 0);
    if ($membershipId <= 0) {
      Response::error('membership_id is required', 422);
    }

    $db = Database::getConnection();
    $stmt = $db->prepare(
      "SELECT m.*, p.title as pool_title, p.id as pool_id, p.min_lump_sum, p.allow_lump_sum
       FROM pool_memberships m
       JOIN investment_pools p ON p.id = m.pool_id
       WHERE m.id = ? AND m.user_id = ? AND m.status = 'active'"
    );
    $stmt->execute([$membershipId, (int)$user['id']]);
    $membership = $stmt->fetch();
    if (!$membership) {
      Response::error('Active membership not found', 404);
    }

    $type = $input['type'] ?? 'schedule';
    $amount = 0.0;
    $scheduleId = null;
    $reference = '';

    if ($type === 'lump_sum') {
      $amount = (float)($input['amount'] ?? 0);
      if ($amount <= 0) {
        Response::error('Valid lump-sum amount is required', 422);
      }
      $min = $membership['min_lump_sum'] !== null ? (float)$membership['min_lump_sum'] : 0;
      if ($min > 0 && $amount < $min) {
        Response::error('Amount is below the minimum lump-sum contribution of ₦' . number_format($min), 422);
      }
      $reference = 'pool_lump_' . $membershipId . '_' . bin2hex(random_bytes(4));
    } else {
      $scheduleId = (int)($input['schedule_id'] ?? 0);
      if ($scheduleId <= 0) {
        // No schedule specified — resolve the next outstanding installment.
        $next = $db->prepare("SELECT id FROM pool_schedules WHERE membership_id = ? AND status IN ('pending','overdue') ORDER BY due_date ASC LIMIT 1");
        $next->execute([$membershipId]);
        $nextRow = $next->fetch();
        $scheduleId = $nextRow ? (int)$nextRow['id'] : 0;
      }
      if ($scheduleId <= 0) {
        Response::error('No outstanding installment to pay', 422);
      }
      $sched = $db->prepare('SELECT * FROM pool_schedules WHERE id = ? AND membership_id = ?');
      $sched->execute([$scheduleId, $membershipId]);
      $schedule = $sched->fetch();
      if (!$schedule) {
        Response::error('Schedule not found', 404);
      }
      if ($schedule['status'] === 'paid') {
        Response::error('This installment has already been paid', 422);
      }
      $amount = (float)$schedule['total_due'];
      $reference = 'pool_sched_' . $scheduleId . '_' . bin2hex(random_bytes(4));
    }

    $amountKobo = (int)round($amount * 100);

    // If auto-debit is requested and this is a monthly plan, attach a recurring plan.
    $planCode = null;
    if (!empty($input['auto_debit']) && in_array($membership['plan_type'], ['monthly', 'both'], true)) {
      if (!empty($membership['paystack_plan_code'])) {
        $planCode = $membership['paystack_plan_code'];
      } else {
        $plan = PaystackService::createPlan(
          'Pool ' . $membership['pool_title'] . ' — ' . NotificationService::naira($amount) . '/month',
          $amountKobo,
          'monthly',
          'AVR Homes pooled property contribution'
        );
        if (!$plan['ok']) {
          Response::error('Could not create payment plan: ' . $plan['body']['error'], 500);
        }
        $planCode = $plan['plan_code'];
        $db->prepare('UPDATE pool_memberships SET paystack_plan_code = ? WHERE id = ?')
          ->execute([$planCode, $membershipId]);
      }
    }

    $init = PaystackService::initializeTransaction(
      $user['email'],
      $amountKobo,
      $reference,
      [
        'pool_id' => (int)$membership['pool_id'],
        'membership_id' => $membershipId,
        'schedule_id' => $scheduleId,
        'type' => $type,
        'purpose' => 'pool_contribution',
      ],
      $planCode
    );

    if (!$init['ok']) {
      Response::error('Failed to initialize payment: ' . $init['body']['error'], 500);
    }

    Response::success([
      'reference' => $init['reference'],
      'authorization_url' => $init['authorization_url'],
      'access_code' => $init['access_code'],
      'amount' => $amount,
    ]);
  }

  /**
   * Verify a Paystack payment and record the contribution.
   *
   * Body: { payment_ref, schedule_id? }
   */
  public static function verifyPayment(array $params): void
  {
    $user = AuthMiddleware::authenticate();
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $reference = $input['payment_ref'] ?? '';

    if (!$reference) {
      Response::error('payment_ref is required', 422);
    }

    $verified = PaystackService::verifyTransaction($reference);
    if (!$verified['ok'] || $verified['status'] !== 'success') {
      Response::error('Payment verification failed', 402);
    }

    $paidKobo = $verified['amountKobo'];
    $paidAmount = $paidKobo / 100;

    $db = Database::getConnection();

    // Determine membership from transaction metadata, else lookup.
    $metadata = $verified['body']['body']['data']['metadata'] ?? [];
    $membershipId = (int)($metadata['membership_id'] ?? 0);
    $scheduleId = (int)($metadata['schedule_id'] ?? 0);
    $type = $metadata['type'] ?? 'schedule';

    if (!$membershipId) {
      $membershipId = (int)($input['membership_id'] ?? 0);
    }
    if ($membershipId <= 0) {
      Response::error('Could not resolve membership for this payment', 422);
    }

    $stmt = $db->prepare(
      "SELECT m.*, p.id as pool_id, p.title as pool_title
       FROM pool_memberships m JOIN investment_pools p ON p.id = m.pool_id
       WHERE m.id = ? AND m.user_id = ?"
    );
    $stmt->execute([$membershipId, (int)$user['id']]);
    $membership = $stmt->fetch();
    if (!$membership) {
      Response::error('Membership not found', 404);
    }

    // Prevent double-recording the same reference.
    $dup = $db->prepare('SELECT id FROM pool_contributions WHERE payment_ref = ?');
    $dup->execute([$reference]);
    if ($dup->fetch()) {
      Response::success(null, 'Payment already recorded');
    }

    $db->beginTransaction();
    try {
      if ($type === 'lump_sum') {
        $amount = $paidAmount;
        $penalty = 0.0;
        $recordType = 'lump_sum';
        $stmt = $db->prepare(
          'INSERT INTO pool_contributions (pool_id, membership_id, user_id, schedule_id, amount, penalty_amount, type, channel, payment_ref, status, paid_at, created_at)
           VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, \'paid\', NOW(), NOW())'
        );
        $stmt->execute([
          (int)$membership['pool_id'], $membershipId, (int)$user['id'],
          $amount, $penalty, $recordType, 'manual', $reference,
        ]);
      } else {
        // Schedule payment — resolve the schedule.
        if (!$scheduleId) {
          $sched = $db->prepare("SELECT * FROM pool_schedules WHERE membership_id = ? AND status IN ('pending','overdue') ORDER BY due_date ASC LIMIT 1");
          $sched->execute([$membershipId]);
          $schedule = $sched->fetch();
        } else {
          $sched = $db->prepare('SELECT * FROM pool_schedules WHERE id = ? AND membership_id = ?');
          $sched->execute([$scheduleId, $membershipId]);
          $schedule = $sched->fetch();
        }
        if (!$schedule) {
          throw new \RuntimeException('No outstanding schedule found for this payment');
        }

        // Recalculate the current total due (penalty may have been applied).
        $scheduleDue = (float)$schedule['total_due'];
        if ($paidAmount < $scheduleDue - 0.01) {
          throw new \RuntimeException('Paid amount is less than the due amount');
        }

        $amount = (float)$schedule['amount'];
        $penalty = (float)$schedule['penalty_amount'];

        $stmt = $db->prepare(
          'INSERT INTO pool_contributions (pool_id, membership_id, user_id, schedule_id, amount, penalty_amount, type, channel, payment_ref, status, paid_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, \'monthly\', ?, ?, \'paid\', NOW(), NOW())'
        );
        $stmt->execute([
          (int)$membership['pool_id'], $membershipId, (int)$user['id'], (int)$schedule['id'],
          $amount, $penalty, 'manual', $reference,
        ]);

        $db->prepare("UPDATE pool_schedules SET status = 'paid', paid_at = NOW(), payment_ref = ? WHERE id = ?")
          ->execute([$reference, (int)$schedule['id']]);
      }

      // Money is held in the company account — track it on the pool.
      $db->prepare('UPDATE investment_pools SET current_raised = current_raised + ? WHERE id = ?')
        ->execute([$amount, (int)$membership['pool_id']]);

      $db->commit();
    } catch (\Throwable $e) {
      if ($db->inTransaction()) {
        $db->rollBack();
      }
      Response::error($e->getMessage(), 422);
    }

    // Confirmation email (best-effort).
    try {
      $stmt = $db->prepare('SELECT id, name, email FROM users WHERE id = ?');
      $stmt->execute([(int)$user['id']]);
      $userRow = $stmt->fetch();
      if ($userRow) {
        $stmt = $db->prepare('SELECT target_amount, current_raised FROM investment_pools WHERE id = ?');
        $stmt->execute([(int)$membership['pool_id']]);
        $poolRow = $stmt->fetch();
        $pct = $poolRow && $poolRow['target_amount'] > 0
          ? (int)floor($poolRow['current_raised'] / $poolRow['target_amount'] * 100) : 0;
        NotificationService::notify(
          $userRow,
          (int)$membership['pool_id'],
          $membershipId,
          $scheduleId ?: null,
          'payment',
          'Payment received — ' . NotificationService::naira($amount),
          '<h2 style="margin:0 0 12px;color:#0A1628;">Payment received ✅</h2>' .
          '<p style="margin:0 0 12px;color:#4b5563;line-height:1.6;">We received <strong>' . NotificationService::naira($amount) . '</strong> for <strong>' . htmlspecialchars($membership['pool_title']) . '</strong>.</p>' .
          '<p style="margin:0 0 12px;color:#4b5563;line-height:1.6;">Reference: <code>' . htmlspecialchars($reference) . '</code></p>' .
          '<p style="margin:0;color:#4b5563;line-height:1.6;">The pool is now <strong>' . $pct . '%</strong> funded. Funds are held securely until the target is reached.</p>'
        );
      }
    } catch (\Throwable $e) {
      error_log('Pool payment email failed: ' . $e->getMessage());
    }

    Response::success(null, 'Payment recorded successfully');
  }

  /**
   * Complete the auto-debit setup after the first (card-authorizing) payment.
   *
   * Body: { membership_id, reference }
   */
  public static function setupAutoDebit(array $params): void
  {
    $user = AuthMiddleware::authenticate();
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $membershipId = (int)($input['membership_id'] ?? 0);
    $reference = $input['reference'] ?? '';

    if ($membershipId <= 0 || !$reference) {
      Response::error('membership_id and reference are required', 422);
    }

    $db = Database::getConnection();
    $stmt = $db->prepare('SELECT * FROM pool_memberships WHERE id = ? AND user_id = ?');
    $stmt->execute([$membershipId, (int)$user['id']]);
    $membership = $stmt->fetch();
    if (!$membership) {
      Response::error('Membership not found', 404);
    }

    $verified = PaystackService::verifyTransaction($reference);
    if (!$verified['ok'] || $verified['status'] !== 'success') {
      Response::error('Payment verification failed for auto-debit setup', 402);
    }

    $authorizationCode = $verified['authorization']['authorization_code'] ?? '';
    $customerEmail = $verified['customer']['email'] ?? $user['email'];
    if (!$authorizationCode) {
      Response::error('Card was not authorized for auto-debit. Please try again.', 422);
    }

    // Ensure customer exists.
    if (empty($membership['paystack_customer_code'])) {
      $customer = PaystackService::createCustomer($customerEmail, $user['name'] ?? '');
      if (!$customer['ok'] || !$customer['customer_code']) {
        Response::error('Could not create Paystack customer: ' . $customer['body']['error'], 500);
      }
      $customerCode = $customer['customer_code'];
      $db->prepare('UPDATE pool_memberships SET paystack_customer_code = ? WHERE id = ?')
        ->execute([$customerCode, $membershipId]);
    } else {
      $customerCode = $membership['paystack_customer_code'];
    }

    // Ensure plan exists.
    if (empty($membership['paystack_plan_code'])) {
      Response::error('Payment plan was not created. Please re-initiate payment.', 422);
    }
    $planCode = $membership['paystack_plan_code'];

    // Disable any old subscription first.
    if (!empty($membership['paystack_subscription_code'])) {
      PaystackService::disableSubscription($membership['paystack_subscription_code']);
    }

    $subscription = PaystackService::createSubscription($customerCode, $planCode, $authorizationCode);
    if (!$subscription['ok'] || !$subscription['subscription_code']) {
      Response::error('Could not create subscription: ' . $subscription['body']['error'], 500);
    }

    $db->prepare('UPDATE pool_memberships SET paystack_subscription_code = ?, auto_debit = 1 WHERE id = ?')
      ->execute([$subscription['subscription_code'], $membershipId]);

    Response::success(null, 'Auto-debit enabled. Your card will be charged each month automatically.');
  }

  /**
   * Handle Paystack webhook events.
   *
   * Events: subscription.charge.success, charge.success, subscription.disable.
   */
  public static function webhook(array $params): void
  {
    $rawBody = file_get_contents('php://input');
    $signature = $_SERVER['HTTP_X_PAYSTACK_SIGNATURE'] ?? '';

    if (!PaystackService::verifyWebhookSignature($signature, $rawBody)) {
      Response::error('Invalid webhook signature', 401);
    }

    $payload = json_decode($rawBody, true);
    if (!$payload) {
      Response::error('Invalid webhook payload', 400);
    }

    $event = $payload['event'] ?? '';
    $data = $payload['data'] ?? [];

    $db = Database::getConnection();

    try {
      if ($event === 'subscription.charge.success') {
        self::recordSubscriptionCharge($db, $data);
      } elseif ($event === 'charge.success') {
        $reference = $data['reference'] ?? '';
        if (str_starts_with($reference, 'pool_')) {
          // Try to record via metadata.
          $metadata = $data['metadata'] ?? [];
          $membershipId = (int)($metadata['membership_id'] ?? 0);
          $scheduleId = (int)($metadata['schedule_id'] ?? 0);
          $type = $metadata['type'] ?? 'schedule';

          $stmt = $db->prepare("SELECT m.*, p.id as pool_id FROM pool_memberships m JOIN investment_pools p ON p.id = m.pool_id WHERE m.id = ?");
          $stmt->execute([$membershipId]);
          $membership = $stmt->fetch();
          if ($membership) {
            self::recordPaidContribution($db, $membership, $reference, (int)$data['amount'] ?? 0, $scheduleId, $type, 'auto_debit');
          }
        }
      } elseif ($event === 'subscription.disable') {
        $subscriptionCode = $data['subscription_code'] ?? '';
        if ($subscriptionCode) {
          $db->prepare('UPDATE pool_memberships SET auto_debit = 0, paystack_subscription_code = NULL WHERE paystack_subscription_code = ?')
            ->execute([$subscriptionCode]);
        }
      }
    } catch (\Throwable $e) {
      error_log('Pool webhook handler error: ' . $e->getMessage());
    }

    Response::success(null, 'Webhook processed');
  }

  /* ────────────────────────── Helpers ────────────────────────── */

  /**
   * Record a subscription auto-charge against the next outstanding schedule.
   */
  private static function recordSubscriptionCharge(\PDO $db, array $data): void
  {
    $subscriptionCode = $data['subscription']['subscription_code'] ?? '';
    $amountKobo = (int)($data['amount'] ?? 0);
    $amount = $amountKobo / 100;
    $reference = $data['reference'] ?? ('pool_auto_' . bin2hex(random_bytes(4)));

    if (!$subscriptionCode || $amountKobo <= 0) {
      return;
    }

    $stmt = $db->prepare('SELECT * FROM pool_memberships WHERE paystack_subscription_code = ?');
    $stmt->execute([$subscriptionCode]);
    $membership = $stmt->fetch();
    if (!$membership) {
      return;
    }

    self::recordPaidContribution($db, $membership, $reference, $amountKobo, 0, 'schedule', 'auto_debit');
  }

  /**
   * Mark the matching schedule paid and record a contribution.
   */
  private static function recordPaidContribution(\PDO $db, array $membership, string $reference, int $amountKobo, int $scheduleId, string $type, string $channel): void
  {
    $amount = $amountKobo / 100;
    $membershipId = (int)$membership['id'];

    $dup = $db->prepare('SELECT id FROM pool_contributions WHERE payment_ref = ?');
    $dup->execute([$reference]);
    if ($dup->fetch()) {
      return;
    }

    $db->beginTransaction();
    try {
      if ($type === 'lump_sum') {
        $stmt = $db->prepare(
          'INSERT INTO pool_contributions (pool_id, membership_id, user_id, schedule_id, amount, penalty_amount, type, channel, payment_ref, status, paid_at, created_at)
           VALUES (?, ?, ?, NULL, ?, 0, \'lump_sum\', ?, ?, \'paid\', NOW(), NOW())'
        );
        $stmt->execute([(int)$membership['pool_id'], $membershipId, (int)$membership['user_id'], $amount, $channel, $reference]);
      } else {
        // Find the next outstanding schedule.
        $sched = $db->prepare("SELECT * FROM pool_schedules WHERE membership_id = ? AND status IN ('pending','overdue') ORDER BY due_date ASC LIMIT 1");
        $sched->execute([$membershipId]);
        $schedule = $sched->fetch();
        if (!$schedule) {
          return;
        }
        $stmt = $db->prepare(
          'INSERT INTO pool_contributions (pool_id, membership_id, user_id, schedule_id, amount, penalty_amount, type, channel, payment_ref, status, paid_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, \'monthly\', ?, ?, \'paid\', NOW(), NOW())'
        );
        $stmt->execute([
          (int)$membership['pool_id'], $membershipId, (int)$membership['user_id'], (int)$schedule['id'],
          (float)$schedule['amount'], (float)$schedule['penalty_amount'], $channel, $reference,
        ]);
        $db->prepare("UPDATE pool_schedules SET status = 'paid', paid_at = NOW(), payment_ref = ? WHERE id = ?")
          ->execute([$reference, (int)$schedule['id']]);
      }

      $db->prepare('UPDATE investment_pools SET current_raised = current_raised + ? WHERE id = ?')
        ->execute([$amount, (int)$membership['pool_id']]);
      $db->commit();
    } catch (\Throwable $e) {
      if ($db->inTransaction()) {
        $db->rollBack();
      }
      error_log('Pool auto-charge record failed: ' . $e->getMessage());
    }
  }
}
