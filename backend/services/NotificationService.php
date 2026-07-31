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

  /** Last SMTP failure reason, populated when a send fails. */
  public static ?string $lastError = null;

  /**
   * Send a richly-styled HTML email.
   *
   * Uses PHP mail() when available; otherwise falls back to direct SMTP
   * (stream_socket_client) using SMTP_HOST / SMTP_PORT / SMTP_USER /
   * SMTP_PASS from .env.
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

    // If mail() is enabled, prefer it.
    if (function_exists('mail')) {
      return @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, implode("\r\n", $headers));
    }

    return self::sendSmtp($to, $subject, $body, $from);
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
   * Direct SMTP send via stream_socket_client (works even when the host's
   * PHP disables mail()). Expects SMTP_HOST / SMTP_PORT / SMTP_USER /
   * SMTP_PASS in .env. Port 465 = implicit TLS; 587 / 25 = STARTTLS.
   *
   * @param string $to      Recipient (may be "Name <email>").
   * @param string $subject
   * @param string $htmlBody Already wrapped in the brand template.
   * @param string $from     Sender (may be "Name <email>").
   */
  private static function sendSmtp(string $to, string $subject, string $htmlBody, string $from): bool
  {
    $host = $_ENV['SMTP_HOST'] ?? '';
    $port = (int)($_ENV['SMTP_PORT'] ?? 587);
    $user = $_ENV['SMTP_USER'] ?? '';
    $pass = $_ENV['SMTP_PASS'] ?? '';

    if ($host === '' || $user === '') {
      return self::fail('SMTP not configured — set SMTP_HOST / SMTP_USER / SMTP_PASS in .env');
    }

    $fromEmail = self::extractEmail($from);
    $toEmail = self::extractEmail($to);
    if ($fromEmail === '' || $toEmail === '') {
      return self::fail("invalid from/to email for SMTP send (from={$from}, to={$to})");
    }

    $timeout = 20;
    $scheme = $port === 465 ? 'ssl' : 'tcp';
    $context = stream_context_create([
      'ssl' => [
        'verify_peer' => false,
        'verify_peer_name' => false,
        'allow_self_signed' => true,
      ],
    ]);

    $conn = @stream_socket_client(
      "{$scheme}://{$host}:{$port}",
      $errno,
      $errstr,
      $timeout,
      STREAM_CLIENT_CONNECT,
      $context
    );
    if (!$conn) {
      return self::fail("SMTP connect failed ({$host}:{$port}) — {$errstr} ({$errno})");
    }
    stream_set_timeout($conn, $timeout);

    try {
      // Greeting (220).
      $greeting = self::smtpRead($conn);
      if ($greeting === null) return self::fail('SMTP connection closed during greeting');
      if ((int)substr($greeting, 0, 3) !== 220) return self::fail("SMTP greeting: {$greeting}");

      if (!self::smtpCmd($conn, 'EHLO ' . self::hostName())) return false;

      // Upgrade to TLS on STARTTLS ports.
      if ($port !== 465) {
        if (!self::smtpCmd($conn, 'STARTTLS', [220])) return false;
        $tls = @stream_socket_enable_crypto($conn, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
        if (!$tls) {
          return self::fail('SMTP STARTTLS handshake failed');
        }
        if (!self::smtpCmd($conn, 'EHLO ' . self::hostName())) return false;
      }

      if (!self::smtpCmd($conn, 'AUTH LOGIN', [334])) return false;
      if (!self::smtpCmd($conn, base64_encode($user), [334])) return false;
      if (!self::smtpCmd($conn, base64_encode($pass), [235])) return false;

      if (!self::smtpCmd($conn, "MAIL FROM:<{$fromEmail}>", [250])) return false;
      if (!self::smtpCmd($conn, "RCPT TO:<{$toEmail}>", [250, 251])) return false;

      if (!self::smtpCmd($conn, 'DATA', [354])) return false;

      $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
      $message = "From: {$from}\r\n"
        . "Reply-To: {$from}\r\n"
        . "To: {$to}\r\n"
        . "Subject: {$encodedSubject}\r\n"
        . "MIME-Version: 1.0\r\n"
        . "Content-Type: text/html; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: 8bit\r\n"
        . "Date: " . date('r') . "\r\n"
        . "\r\n"
        . str_replace("\r\n.", "\r\n..", $htmlBody)
        . "\r\n.";

      fwrite($conn, $message . "\r\n");
      $final = self::smtpRead($conn);
      if ($final === null) return self::fail('SMTP connection closed during DATA');
      if ((int)substr($final, 0, 3) !== 250) return self::fail("SMTP final reply: {$final}");

      fwrite($conn, "QUIT\r\n");
    } catch (\Throwable $e) {
      return self::fail('SMTP error — ' . $e->getMessage());
    } finally {
      if (is_resource($conn)) {
        fclose($conn);
      }
    }

    return true;
  }

  /**
   * Send a command and verify the expected reply code(s).
   *
   * @param resource $conn
   * @param string $cmd
   * @param int[] $okCodes
   */
  private static function smtpCmd($conn, string $cmd, array $okCodes = [250]): bool
  {
    fwrite($conn, $cmd . "\r\n");
    $reply = self::smtpRead($conn);
    if ($reply === null) {
      self::fail("SMTP connection closed after command: {$cmd}");
      return false;
    }

    $code = (int)substr($reply, 0, 3);
    if (!in_array($code, $okCodes, true)) {
      self::fail("SMTP {$cmd} → {$reply}");
      return false;
    }
    return true;
  }

  /**
   * Read a (possibly multi-line) SMTP reply. Returns null on EOF.
   *
   * @param resource $conn
   */
  private static function smtpRead($conn): ?string
  {
    do {
      $data = '';
      while (($ch = fgetc($conn)) !== false && $ch !== '' && $ch !== "\n") {
        $data .= $ch;
      }
      $reply = trim($data);
      if ($reply === '' && feof($conn)) {
        return null;
      }
      $cont = isset($reply[3]) && $reply[3] === '-';
    } while ($cont);

    return $reply;
  }

  /**
   * EHLO identity — the requesting host, or "localhost" as a fallback.
   */
  private static function hostName(): string
  {
    $host = preg_replace('/[^a-z0-9.\-]/i', '', ($_SERVER['HTTP_HOST'] ?? 'localhost'));
    return $host !== '' ? $host : 'localhost';
  }

  /**
   * Record the last failure reason, log it, and return false.
   */
  private static function fail(string $message): bool
  {
    self::$lastError = $message;
    error_log('NotificationService: ' . $message);
    return false;
  }

  /**
   * Pull a bare email address out of "Name <email>" or "email".
   */
  private static function extractEmail(string $value): string
  {
    if (preg_match('/<([^<>]+)>/', $value, $m)) {
      return strtolower(trim($m[1]));
    }
    return strtolower(trim($value));
  }

  /**
   * Wrap message content in the branded AVR Homes email template.
   */
  private static function wrapTemplate(string $html): string
  {
    $logo = 'https://res.cloudinary.com/dv0tt80vn/image/upload/v1782211724/AVRUST_LOGO-removebg-preview_rhui5h.png';
    return <<<HTML
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="padding:0 0 16px;text-align:center;">
          <img src="{$logo}" alt="AVR Homes" width="150" height="auto"
               style="display:inline-block;max-width:160px;max-height:64px;border:0;outline:none;text-decoration:none;">
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
