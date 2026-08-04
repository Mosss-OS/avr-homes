/**
 * GET /api/pools/cron/daily — daily maintenance for pooled investments.
 *
 * Tasks:
 *  1. Generate monthly schedules for active memberships
 *  2. Send payment reminders (days_before: 7, 3, 1)
 *  3. Apply late penalty after grace period
 *  4. Mark memberships defaulted after default_after_days
 *  5. Mark a pool funded when current_raised reaches target
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { fetchAll, fetchOne, execute } from "@/server/db";
import { notify, naira } from "@/server/notifications";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret !== "") {
    const sp = req.nextUrl.searchParams;
    const provided = sp.get("secret") ?? req.headers.get("x-cron-secret") ?? "";
    if (!timingSafeEqual(secret, provided)) {
      return error("Forbidden", 403);
    }
  }

  const taskErrors: Record<string, string> = {};
  const summary: Record<string, any> = {
    schedules_generated: await safeTask("generateSchedules", taskErrors),
    reminders_sent: await safeTask("sendReminders", taskErrors),
    penalties_applied: await safeTask("applyPenalties", taskErrors),
    memberships_defaulted: await safeTask("markDefaulted", taskErrors),
    pools_funded: await safeTask("markFunded", taskErrors),
    run_at: new Date().toISOString(),
  };

  if (Object.keys(taskErrors).length > 0) {
    summary.errors = taskErrors;
  }

  return success(summary, "Pool cron completed");
}

async function safeTask(name: string, taskErrors: Record<string, string>): Promise<number> {
  try {
    switch (name) {
      case "generateSchedules": return await generateSchedules();
      case "sendReminders": return await sendReminders();
      case "applyPenalties": return await applyPenalties();
      case "markDefaulted": return await markDefaulted();
      case "markFunded": return await markFunded();
    }
  } catch (e: any) {
    taskErrors[name] = e?.message ?? "Unknown error";
    console.error(`PoolCronController::${name} failed: ` + (e?.message ?? ""));
  }
  return 0;
}

async function generateSchedules(): Promise<number> {
  const today = new Date().getDate();
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01 00:00:00`;
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthStart = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01 00:00:00`;

  let created = 0;
  if (today !== 1) {
    return created;
  }

  const memberships = await fetchAll(
    `SELECT m.*, p.title as pool_title
     FROM pool_memberships m
     JOIN investment_pools p ON p.id = m.pool_id
     WHERE m.status = 'active' AND m.plan_type IN ('monthly','both')
       AND p.status = 'active'`
  );

  for (const m of memberships) {
    const existing = await fetchOne(
      "SELECT id FROM pool_schedules WHERE membership_id = ? AND due_date >= ? AND due_date < ?",
      [Number(m.id), monthStart, nextMonthStart]
    );
    if (existing) {
      continue;
    }

    await execute(
      `INSERT INTO pool_schedules (membership_id, pool_id, user_id, amount, total_due, due_date, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [Number(m.id), Number(m.pool_id), Number(m.user_id), Number(m.monthly_amount), Number(m.monthly_amount), todayStr()]
    );
    created++;
  }

  return created;
}

async function sendReminders(): Promise<number> {
  let sent = 0;
  const pools = await fetchAll("SELECT id, reminder_days_before FROM investment_pools WHERE status = 'active'");

  for (const pool of pools) {
    const days = parseDays(pool.reminder_days_before);
    for (const d of days) {
      const target = addDaysStr(d);
      const schedules = await fetchAll(
        `SELECT s.*, m.auto_debit, p.title as pool_title, u.id as user_id, u.name, u.email
         FROM pool_schedules s
         JOIN pool_memberships m ON m.id = s.membership_id
         JOIN investment_pools p ON p.id = s.pool_id
         JOIN users u ON u.id = s.user_id
         WHERE s.pool_id = ? AND s.status = 'pending' AND DATE(s.due_date) = ? AND m.auto_debit = 0`,
        [Number(pool.id), target]
      );

      for (const s of schedules) {
        const last = await fetchOne(
          "SELECT id FROM pool_notifications WHERE user_id = ? AND type = 'reminder' AND schedule_id = ? AND sent_at >= DATE_SUB(NOW(), INTERVAL 2 DAY)",
          [Number(s.user_id), Number(s.id)]
        );
        if (last) {
          continue;
        }

        await notify(
          { id: Number(s.user_id), name: s.name, email: s.email },
          Number(s.pool_id),
          Number(s.membership_id),
          Number(s.id),
          "reminder",
          `Payment due in ${d} day${d === 1 ? "" : "s"} — ${naira(Number(s.total_due))}`,
          `<h2 style="margin:0 0 12px;color:#0A1628;">Payment reminder ⏰</h2>` +
          `<p style="margin:0 0 12px;color:#4b5563;line-height:1.6;">Your <strong>${naira(Number(s.total_due))}</strong> contribution to <strong>${escapeHtml(s.pool_title)}</strong> is due on <strong>${formatDueDate(s.due_date)}</strong>.</p>` +
          `<p style="margin:0;color:#4b5563;line-height:1.6;">Login to your AVR Homes account to pay. Late payments attract a penalty after the grace period.</p>`
        );
        sent++;
      }
    }
  }

  return sent;
}

async function applyPenalties(): Promise<number> {
  let applied = 0;
  const rows = await fetchAll(
    `SELECT s.*, p.penalty_rate, p.grace_days
     FROM pool_schedules s
     JOIN investment_pools p ON p.id = s.pool_id
     WHERE s.status = 'pending'
       AND s.penalty_amount = 0
       AND s.due_date < DATE_SUB(NOW(), INTERVAL p.grace_days DAY)`
  );

  for (const s of rows) {
    const penalty = Math.round(Number(s.amount) * (Number(s.penalty_rate) / 100) * 100) / 100;
    await execute(
      "UPDATE pool_schedules SET penalty_amount = ?, total_due = amount + ?, status = 'overdue', penalty_applied_at = NOW() WHERE id = ?",
      [penalty, penalty, Number(s.id)]
    );

    const u = await fetchOne("SELECT id, name, email FROM users WHERE id = ?", [Number(s.user_id)]);
    if (u) {
      await notify(
        { id: Number(u.id), name: u.name, email: u.email },
        Number(s.pool_id),
        Number(s.membership_id),
        Number(s.id),
        "penalty",
        `Late payment penalty applied — ${naira(penalty)}`,
        `<h2 style="margin:0 0 12px;color:#0A1628;">Late payment ⚠️</h2>` +
        `<p style="margin:0 0 12px;color:#4b5563;line-height:1.6;">Your <strong>${naira(Number(s.amount))}</strong> contribution is overdue. A <strong>${naira(penalty)}</strong> late fee has been added.</p>` +
        `<p style="margin:0;color:#4b5563;line-height:1.6;">Total now due: <strong>${naira(Number(s.total_due))}</strong>. Please pay as soon as possible.</p>`
      );
    }
    applied++;
  }

  return applied;
}

async function markDefaulted(): Promise<number> {
  let defaulted = 0;
  const memberships = await fetchAll(
    `SELECT m.id, m.pool_id, m.user_id, p.default_after_days
     FROM pool_memberships m
     JOIN investment_pools p ON p.id = m.pool_id
     WHERE m.status = 'active' AND p.status = 'active'`
  );

  for (const m of memberships) {
    const window = Math.max(0, Number(m.default_after_days ?? 0));
    const overdueRow = await fetchOne(
      `SELECT COUNT(*) as cnt FROM pool_schedules
       WHERE membership_id = ? AND status = 'overdue' AND penalty_applied_at < DATE_SUB(NOW(), INTERVAL ${window} DAY)`,
      [Number(m.id)]
    );
    if (Number(overdueRow?.cnt ?? 0) > 0) {
      await execute("UPDATE pool_memberships SET status = 'defaulted' WHERE id = ?", [Number(m.id)]);
      const u = await fetchOne("SELECT id, name, email FROM users WHERE id = ?", [Number(m.user_id)]);
      if (u) {
        await notify(
          { id: Number(u.id), name: u.name, email: u.email },
          Number(m.pool_id),
          Number(m.id),
          null,
          "default",
          "Membership defaulted",
          `<h2 style="margin:0 0 12px;color:#0A1628;">Membership defaulted ❌</h2>` +
          `<p style="margin:0 0 12px;color:#4b5563;line-height:1.6;">You have missed payments beyond the allowed window, so your pool membership has been marked <strong>defaulted</strong>.</p>` +
          `<p style="margin:0;color:#4b5563;line-height:1.6;">Please contact AVR Homes to discuss reinstatement or a refund of contributions made so far.</p>`
        );
      }
      defaulted++;
    }
  }

  return defaulted;
}

async function markFunded(): Promise<number> {
  const result = await execute(
    "UPDATE investment_pools SET status = 'funded', funded_at = NOW() WHERE status = 'active' AND current_raised >= target_amount"
  );
  return result.affectedRows ?? 0;
}

function parseDays(config: string | null): number[] {
  if (!config) {
    return [];
  }
  const days = Array.from(new Set(
    String(config).split(",").map((v) => parseInt(v, 10)).filter((v) => Number.isFinite(v) && v > 0)
  ));
  days.sort((a, b) => a - b);
  return days;
}

function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function addDaysStr(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() + days);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatDueDate(value: string): string {
  const d = new Date(value);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function escapeHtml(value: string): string {
  return String(value).replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] as string)
  );
}

function timingSafeEqual(a: string, b: string): boolean {
  const crypto = require("node:crypto");
  const bufA = crypto.createHash("sha256").update(a).digest();
  const bufB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(bufA, bufB);
}
