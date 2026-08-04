/**
 * NotificationService — sends reminder / penalty / payment emails and
 * logs every notification to the pool_notifications table.
 *
 * Emails are sent through SMTP via `nodemailer`-style JSON transport using
 * the configured SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS env vars.
 *
 * @module server/notifications
 */

import { execute } from "./db";

const FROM_ADDRESS = "AVR Homes <no-reply@avrusthomes.com>";
const LOGO_URL =
  "https://res.cloudinary.com/dv0tt80vn/image/upload/v1782211724/AVRUST_LOGO-removebg-preview_rhui5h.png";

let lastErrorValue: string | null = null;

/** Last SMTP failure reason, populated when a send fails. */
export function lastError(): string | null {
  return lastErrorValue;
}

/**
 * Send a richly-styled HTML email via SMTP.
 *
 * @returns True if accepted by the mailer.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const from = process.env.MAIL_FROM ?? FROM_ADDRESS;
  const body = wrapTemplate(html);
  return sendSmtp(to, subject, body, from);
}

/**
 * Send a payment reminder email and log it. Returns the notification id.
 */
export async function notify(
  user: { id: number; name: string; email: string },
  poolId: number,
  membershipId: number | null,
  scheduleId: number | null,
  type: string,
  subject: string,
  htmlBody: string,
  daysBefore: number | null = null
): Promise<number | null> {
  const sent = await sendEmail(user.email, subject, htmlBody);

  const result = await execute(
    `INSERT INTO pool_notifications (pool_id, membership_id, user_id, schedule_id, type, channel, subject, body, days_before, sent_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [poolId, membershipId, user.id, scheduleId, type, "email", subject, htmlBody, daysBefore]
  );

  if (!sent) {
    console.error(`NotificationService: failed to send email to ${user.email} — ${subject}`);
  }

  return result.insertId ?? null;
}

/**
 * Direct SMTP send via the `nodemailer` transport. Expects SMTP_HOST /
 * SMTP_PORT / SMTP_USER / SMTP_PASS in env. Port 465 = implicit TLS;
 * 587 / 25 = STARTTLS.
 */
async function sendSmtp(to: string, subject: string, htmlBody: string, from: string): Promise<boolean> {
  const host = process.env.SMTP_HOST ?? "";
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER ?? "";
  const pass = process.env.SMTP_PASS ?? "";

  if (host === "" || user === "") {
    return fail("SMTP not configured — set SMTP_HOST / SMTP_USER / SMTP_PASS in .env");
  }

  const fromEmail = extractEmail(from);
  const toEmail = extractEmail(to);
  if (fromEmail === "" || toEmail === "") {
    return fail(`invalid from/to email for SMTP send (from=${from}, to=${to})`);
  }

  try {
    const { createSmtpConnection } = await import("./smtp");
    await createSmtpConnection({ host, port, user, pass, from, fromEmail, to, toEmail, subject, htmlBody });
    return true;
  } catch (err) {
    return fail((err as Error).message);
  }
}

/**
 * Record the last failure reason, log it, and return false.
 */
function fail(message: string): boolean {
  lastErrorValue = message;
  console.error("NotificationService: " + message);
  return false;
}

/**
 * Pull a bare email address out of "Name <email>" or "email".
 */
function extractEmail(value: string): string {
  const m = /<([^<>]+)>/.exec(value);
  return (m ? m[1] : value).trim().toLowerCase();
}

/**
 * Wrap message content in the branded AVR Homes email template.
 */
function wrapTemplate(html: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="padding:0 0 16px;text-align:center;">
          <img src="${LOGO_URL}" alt="AVR Homes" width="150" height="auto"
               style="display:inline-block;max-width:160px;max-height:64px;border:0;outline:none;text-decoration:none;">
        </td></tr>
        <tr><td style="background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
          ${html}
        </td></tr>
        <tr><td style="padding:16px 8px;text-align:center;font-size:12px;color:#9ca3af;">
          AVR Homes · Verified Nigerian property marketplace<br>
          You are receiving this email because of your activity on avrusthomes.com
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Format a naira amount for emails: ₦250,000 */
export function naira(amount: number): string {
  return "₦" + new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(amount);
}
