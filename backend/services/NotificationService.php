<?php

declare(strict_types=1);

/**
 * NotificationService — sends reminder / penalty / payment emails and
 * logs every notification to the pool_notifications table.
 *
 * Emails are sent through PHP mail() (works on cPanel shared hosting when
 * the domain's mail is configured). A MAIL_FROM address can be overridden
 * via .env.
 *
 * @package AvrHomes
 */
class NotificationService
{
  private const FROM_ADDRESS = 'AVR Homes <no-reply@avrusthomes.com>';

  /**
   * Send a richly-styled HTML email.
   *
   * @param string $to      Recipient email.
   * @param string $subject Email subject.
   * @param string $html    HTML body (rendered inside a branded template).
   * @return bool True if accepted by the mailer.
   */
  public static function sendEmail(string $to, string $subject, string $html): bool
  {
    $from = $_ENV['MAIL_FROM'] ?? self::FROM_ADDRESS;

    $headers = [
      'From: ' . $from,
      'Reply-To: ' . $from,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
    ];

    $body = self::wrapTemplate($html);

    return @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, implode("\r\n", $headers));
  }

  /**
   * Send a payment reminder email and log it. Returns the notification id.
   *
   * @param array $user   User row (id, name, email).
   * @param int $poolId
   * @param int|null $membershipId
   * @param int|null $scheduleId
   * @param string $type One of pool_notifications.type values.
   * @param string $subject
   * @param string $htmlBody
   * @param int|null $daysBefore For reminder-type notifications.
   * @return int|null Notification id on success.
   */
  public static function notify(array $user, int $poolId, ?int $membershipId, ?int $scheduleId, string $type, string $subject, string $htmlBody, ?int $daysBefore = null): ?int
  {
    $sent = self::sendEmail($user['email'], $subject, $htmlBody);

    $db = Database::getConnection();
    $stmt = $db->prepare(
      'INSERT INTO pool_notifications (pool_id, membership_id, user_id, schedule_id, type, channel, subject, body, days_before, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())'
    );
    $stmt->execute([
      $poolId,
      $membershipId,
      (int)$user['id'],
      $scheduleId,
      $type,
      'email',
      $subject,
      $htmlBody,
      $daysBefore,
    ]);

    if (!$sent) {
      error_log("NotificationService: failed to send email to {$user['email']} — {$subject}");
    }

    return (int)$db->lastInsertId();
  }

  /**
   * Wrap message content in the branded AVR Homes email template.
   */
  private static function wrapTemplate(string $html): string
  {
    $brand = htmlspecialchars('AVR Homes');
    return <<<HTML
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="padding:0 0 16px;text-align:center;">
          <span style="font-size:22px;font-weight:700;color:#0A1628;font-family:'Georgia',serif;">{$brand}</span>
        </td></tr>
        <tr><td style="background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
          {$html}
        </td></tr>
        <tr><td style="padding:16px 8px;text-align:center;font-size:12px;color:#9ca3af;">
          AVR Homes · Verified Nigerian property marketplace<br>
          You are receiving this email because of your activity on avrusthomes.com
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
HTML;
  }

  /**
   * Format a naira amount for emails: ₦250,000
   */
  public static function naira(float $amount): string
  {
    return '₦' . number_format((float)$amount, 0);
  }
}
