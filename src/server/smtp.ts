/**
 * Direct SMTP send via nodemailer.
 *
 * Expects SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS in env.
 * Port 465 = implicit TLS; 587 / 25 = STARTTLS.
 *
 * @module server/smtp
 */

import nodemailer from "nodemailer";

export interface SmtpOptions {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  fromEmail: string;
  to: string;
  toEmail: string;
  subject: string;
  htmlBody: string;
}

/**
 * Send an email over SMTP. Returns true on success.
 */
export async function createSmtpConnection(opts: SmtpOptions): Promise<boolean> {
  const secure = opts.port === 465;
  const transporter = nodemailer.createTransport({
    host: opts.host,
    port: opts.port,
    secure,
    auth: { user: opts.user, pass: opts.pass },
    tls: { rejectUnauthorized: false },
  });

  await transporter.sendMail({
    from: opts.from,
    to: opts.to,
    subject: opts.subject,
    html: opts.htmlBody,
  });

  return true;
}
