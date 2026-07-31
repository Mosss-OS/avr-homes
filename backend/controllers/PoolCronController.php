<?php

declare(strict_types=1);

/**
 * PoolCronController — scheduled maintenance for pooled investments.
 *
 * Run daily via cPanel cron:  php /home/.../cron.php pools
 *
 * Tasks:
 *  1. Generate monthly schedules for active memberships
 *  2. Send payment reminders (days_before: 7, 3, 1)
 *  3. Apply late penalty after grace period
 *  4. Mark memberships defaulted after default_after_days
 *  5. Mark a pool funded when current_raised reaches target
 *
 * @package AvrHomes
 */
class PoolCronController
{
  public static function daily(array $params): void
  {
    self::generateSchedules();
    self::sendReminders();
    self::applyPenalties();
    self::markDefaulted();
    self::markFunded();
  }

  /* ────────────────────────── Tasks ────────────────────────── */

  /**
   * Create a pending schedule for every active membership on its due day.
   */
  private static function generateSchedules(): void
  {
    $db = Database::getConnection();
    $today = (int)date('j');
    $month = date('Y-m');

    $stmt = $db->query(
      "SELECT m.*, p.title as pool_title
       FROM pool_memberships m
       JOIN investment_pools p ON p.id = m.pool_id
       WHERE m.status = 'active' AND m.plan_type IN ('monthly','both')
         AND p.status = 'active'"
    );

    while ($m = $stmt->fetch()) {
      // Schedules fall on the 1st of each month (set at join time).
      $dueDay = 1;

      if ($today === $dueDay) {
        $check = $db->prepare('SELECT id FROM pool_schedules WHERE membership_id = ? AND due_date >= ? AND due_date < ?');
        $check->execute([(int)$m['id'], $month . '-01 00:00:00', date('Y-m-01', strtotime('+1 month')) . ' 00:00:00']);
        if ($check->fetch()) {
          continue; // Already generated this month.
        }

        $stmtIns = $db->prepare(
          'INSERT INTO pool_schedules (membership_id, pool_id, user_id, amount, total_due, due_date, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, \'pending\', NOW())'
        );
        $stmtIns->execute([
          (int)$m['id'], (int)$m['pool_id'], (int)$m['user_id'],
          (float)$m['monthly_amount'], (float)$m['monthly_amount'],
          date('Y-m-d'),
        ]);
      }
    }
  }

  /**
   * Send reminder emails for schedules due within the pool's reminder window.
   */
  private static function sendReminders(): void
  {
    $db = Database::getConnection();
    $today = date('Y-m-d');

    $pools = $db->query('SELECT id, reminder_days_before FROM investment_pools WHERE status = \'active\'');
    while ($pool = $pools->fetch()) {
      $days = self::parseDays($pool['reminder_days_before']);
      foreach ($days as $d) {
        $target = date('Y-m-d', strtotime("+{$d} days"));
        $stmt = $db->prepare(
          "SELECT s.*, m.auto_debit, p.title as pool_title, u.id as user_id, u.name, u.email
           FROM pool_schedules s
           JOIN pool_memberships m ON m.id = s.membership_id
           JOIN investment_pools p ON p.id = s.pool_id
           JOIN users u ON u.id = s.user_id
           WHERE s.pool_id = ? AND s.status = 'pending' AND DATE(s.due_date) = ? AND m.auto_debit = 0"
        );
        $stmt->execute([(int)$pool['id'], $target]);

        while ($s = $stmt->fetch()) {
          $last = $db->prepare(
            'SELECT id FROM pool_notifications WHERE user_id = ? AND type = \'reminder\' AND schedule_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 2 DAY)'
          );
          $last->execute([(int)$s['user_id'], (int)$s['id']]);
          if ($last->fetch()) {
            continue; // Already reminded for this window.
          }

          NotificationService::notify(
            ['id' => (int)$s['user_id'], 'name' => $s['name'], 'email' => $s['email']],
            (int)$s['pool_id'], (int)$s['membership_id'], (int)$s['id'],
            'reminder',
            'Payment due in ' . $d . ' day' . ($d === 1 ? '' : 's') . ' — ' . NotificationService::naira((float)$s['total_due']),
            '<h2 style="margin:0 0 12px;color:#0A1628;">Payment reminder ⏰</h2>' .
            '<p style="margin:0 0 12px;color:#4b5563;line-height:1.6;">Your <strong>' . NotificationService::naira((float)$s['total_due']) . '</strong> contribution to <strong>' . htmlspecialchars($s['pool_title']) . '</strong> is due on <strong>' . date('j F Y', strtotime($s['due_date'])) . '</strong>.</p>' .
            '<p style="margin:0;color:#4b5563;line-height:1.6;">Login to your AVR Homes account to pay. Late payments attract a penalty after the grace period.</p>'
          );
        }
      }
    }
  }

  /**
   * Apply the late penalty once a schedule passes its grace period.
   */
  private static function applyPenalties(): void
  {
    $db = Database::getConnection();

    $stmt = $db->query(
      "SELECT s.*, p.penalty_rate, p.grace_days
       FROM pool_schedules s
       JOIN investment_pools p ON p.id = s.pool_id
       WHERE s.status = 'pending'
         AND s.penalty_amount = 0
         AND s.due_date < DATE_SUB(NOW(), INTERVAL p.grace_days DAY)"
    );

    while ($s = $stmt->fetch()) {
      $penalty = round((float)$s['amount'] * ((float)$s['penalty_rate'] / 100), 2);
      $update = $db->prepare(
        "UPDATE pool_schedules SET penalty_amount = ?, total_due = amount + ?, status = 'overdue', penalty_applied_at = NOW() WHERE id = ?"
      );
      $update->execute([$penalty, $penalty, (int)$s['id']]);

      $user = $db->prepare('SELECT id, name, email FROM users WHERE id = ?');
      $user->execute([(int)$s['user_id']]);
      if ($u = $user->fetch()) {
        NotificationService::notify(
          $u, (int)$s['pool_id'], (int)$s['membership_id'], (int)$s['id'],
          'penalty',
          'Late payment penalty applied — ' . NotificationService::naira($penalty),
          '<h2 style="margin:0 0 12px;color:#0A1628;">Late payment ⚠️</h2>' .
          '<p style="margin:0 0 12px;color:#4b5563;line-height:1.6;">Your <strong>' . NotificationService::naira((float)$s['amount']) . '</strong> contribution is overdue. A <strong>' . NotificationService::naira($penalty) . '</strong> late fee has been added.</p>' .
          '<p style="margin:0;color:#4b5563;line-height:1.6;">Total now due: <strong>' . NotificationService::naira((float)$s['total_due']) . '</strong>. Please pay as soon as possible.</p>'
        );
      }
    }
  }

  /**
   * Default memberships that have been overdue beyond the default window.
   */
  private static function markDefaulted(): void
  {
    $db = Database::getConnection();

    $stmt = $db->query(
      "SELECT m.id, m.pool_id, p.default_after_days
       FROM pool_memberships m
       JOIN investment_pools p ON p.id = m.pool_id
       WHERE m.status = 'active' AND p.status = 'active'"
    );

    while ($m = $stmt->fetch()) {
      $overdue = $db->prepare(
        "SELECT COUNT(*) as cnt FROM pool_schedules
         WHERE membership_id = ? AND status = 'overdue' AND penalty_applied_at < DATE_SUB(NOW(), INTERVAL ? DAY)"
      );
      $overdue->execute([(int)$m['id'], (int)$m['default_after_days']]);
      $row = $overdue->fetch();
      if ((int)$row['cnt'] > 0) {
        $db->prepare("UPDATE pool_memberships SET status = 'defaulted' WHERE id = ?")->execute([(int)$m['id']]);
        $user = $db->prepare('SELECT id, name, email FROM users WHERE id = ?');
        $user->execute([(int)$m['user_id']]);
        if ($u = $user->fetch()) {
          NotificationService::notify(
            $u, (int)$m['pool_id'], (int)$m['id'], null,
            'default',
            'Membership defaulted',
            '<h2 style="margin:0 0 12px;color:#0A1628;">Membership defaulted ❌</h2>' .
            '<p style="margin:0 0 12px;color:#4b5563;line-height:1.6;">You have missed payments beyond the allowed window, so your pool membership has been marked <strong>defaulted</strong>.</p>' .
            '<p style="margin:0;color:#4b5563;line-height:1.6;">Please contact AVR Homes to discuss reinstatement or a refund of contributions made so far.</p>'
          );
        }
      }
    }
  }

  /**
   * Mark a pool funded once the target is reached.
   */
  private static function markFunded(): void
  {
    $db = Database::getConnection();
    $db->query(
      "UPDATE investment_pools SET status = 'funded', funded_at = NOW()
       WHERE status = 'active' AND current_raised >= target_amount"
    );
  }

  /* ────────────────────────── Helpers ────────────────────────── */

  /**
   * Parse a comma-separated reminder config like "7,3,1" into an int array.
   */
  private static function parseDays(?string $config): array
  {
    if (!$config) {
      return [];
    }
    $days = array_filter(array_map('intval', explode(',', $config)));
    sort($days);
    return array_values(array_unique($days));
  }
}
