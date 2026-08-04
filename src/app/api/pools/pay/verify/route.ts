/**
 * POST /api/pools/pay/verify — verify a Paystack pool contribution and
 * record it against the membership / schedule.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticate, isUser } from "@/server/auth";
import {
  fetchOne,
  beginTransaction,
  txExecute,
  commit,
  rollback,
} from "@/server/db";
import { readJson } from "@/server/http";
import { verifyTransaction } from "@/server/paystack";
import { notify, naira } from "@/server/notifications";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const input = await readJson(req);
  const reference = String(input.payment_ref ?? "");

  if (!reference) {
    return error("payment_ref is required", 422);
  }

  const verified = await verifyTransaction(reference);
  if (!verified.ok || verified.status !== "success") {
    return error("Payment verification failed", 402);
  }

  const paidKobo = verified.amountKobo;
  const paidAmount = paidKobo / 100;

  const metadata = verified.body?.body?.data?.metadata ?? {};
  let membershipId = Number(metadata.membership_id ?? 0);
  let scheduleId = Number(metadata.schedule_id ?? 0);
  const type = metadata.type ?? "schedule";

  if (!membershipId) {
    membershipId = Number(input.membership_id ?? 0);
  }
  if (membershipId <= 0) {
    return error("Could not resolve membership for this payment", 422);
  }

  const membership = await fetchOne(
    `SELECT m.*, p.id as pool_id, p.title as pool_title
     FROM pool_memberships m JOIN investment_pools p ON p.id = m.pool_id
     WHERE m.id = ? AND m.user_id = ?`,
    [membershipId, user.id]
  );
  if (!membership) {
    return error("Membership not found", 404);
  }

  const dup = await fetchOne("SELECT id FROM pool_contributions WHERE payment_ref = ?", [reference]);
  if (dup) {
    return success(null, "Payment already recorded");
  }

  const conn = await beginTransaction();
  try {
    if (type === "lump_sum") {
      const amount = paidAmount;
      const penalty = 0;
      await txExecute(
        conn,
        `INSERT INTO pool_contributions (pool_id, membership_id, user_id, schedule_id, amount, penalty_amount, type, channel, payment_ref, status, paid_at, created_at)
         VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, 'paid', NOW(), NOW())`,
        [Number(membership.pool_id), membershipId, user.id, amount, penalty, "lump_sum", "manual", reference]
      );
      await txExecute(conn, "UPDATE investment_pools SET current_raised = current_raised + ? WHERE id = ?", [amount, Number(membership.pool_id)]);
    } else {
      let schedule: Record<string, any> | null = null;
      if (!scheduleId) {
        schedule = await txExecute(
          conn,
          "SELECT * FROM pool_schedules WHERE membership_id = ? AND status IN ('pending','overdue') ORDER BY due_date ASC LIMIT 1",
          [membershipId]
        ) as unknown as Record<string, any>;
      } else {
        schedule = await txExecute(
          conn,
          "SELECT * FROM pool_schedules WHERE id = ? AND membership_id = ?",
          [scheduleId, membershipId]
        ) as unknown as Record<string, any>;
      }
      if (!schedule) {
        throw new Error("No outstanding schedule found for this payment");
      }

      const scheduleDue = Number(schedule.total_due);
      if (paidAmount < scheduleDue - 0.01) {
        throw new Error("Paid amount is less than the due amount");
      }

      const amount = Number(schedule.amount);
      const penalty = Number(schedule.penalty_amount);

      await txExecute(
        conn,
        `INSERT INTO pool_contributions (pool_id, membership_id, user_id, schedule_id, amount, penalty_amount, type, channel, payment_ref, status, paid_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'monthly', ?, ?, 'paid', NOW(), NOW())`,
        [Number(membership.pool_id), membershipId, user.id, Number(schedule.id), amount, penalty, "manual", reference]
      );

      await txExecute(conn, "UPDATE pool_schedules SET status = 'paid', paid_at = NOW(), payment_ref = ? WHERE id = ?", [reference, Number(schedule.id)]);
      await txExecute(conn, "UPDATE investment_pools SET current_raised = current_raised + ? WHERE id = ?", [amount, Number(membership.pool_id)]);
    }

    await commit(conn);
  } catch (e: any) {
    await rollback(conn);
    return error(e?.message ?? "Payment recording failed", 422);
  }

  try {
    const poolRow = await fetchOne("SELECT target_amount, current_raised FROM investment_pools WHERE id = ?", [Number(membership.pool_id)]);
    const pct = poolRow && Number(poolRow.target_amount) > 0
      ? Math.floor((Number(poolRow.current_raised) / Number(poolRow.target_amount)) * 100)
      : 0;
    await notify(
      { id: user.id, name: user.name ?? "", email: user.email },
      Number(membership.pool_id),
      membershipId,
      scheduleId || null,
      "payment",
      `Payment received — ${naira(paidAmount)}`,
      `<h2 style="margin:0 0 12px;color:#0A1628;">Payment received ✅</h2>` +
      `<p style="margin:0 0 12px;color:#4b5563;line-height:1.6;">We received <strong>${naira(paidAmount)}</strong> for <strong>${escapeHtml(membership.pool_title)}</strong>.</p>` +
      `<p style="margin:0 0 12px;color:#4b5563;line-height:1.6;">Reference: <code>${escapeHtml(reference)}</code></p>` +
      `<p style="margin:0;color:#4b5563;line-height:1.6;">The pool is now <strong>${pct}%</strong> funded. Funds are held securely until the target is reached.</p>`
    );
  } catch (e: any) {
    console.error("Pool payment email failed: " + (e?.message ?? ""));
  }

  return success(null, "Payment recorded successfully");
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] as string)
  );
}
