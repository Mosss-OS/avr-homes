/**
 * POST /api/pools/{id}/join — authenticated user joins a pool.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticate, isUser } from "@/server/auth";
import { query, execute, beginTransaction, txExecute, commit, rollback } from "@/server/db";
import { readJson } from "@/server/http";
import { notify, naira } from "@/server/notifications";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const { id } = await params;
  const poolId = Number(id);
  if (!poolId || poolId <= 0) {
    return error("Invalid pool ID", 400);
  }

  const input = await readJson(req);

  const pools = await query("SELECT * FROM investment_pools WHERE id = ?", [poolId]);
  if (!pools || pools.length === 0) {
    return error("Pool not found", 404);
  }
  const pool = pools[0];
  if (!["active", "funded"].includes(pool.status)) {
    return error("This pool is no longer accepting contributions", 422);
  }

  const planType = (input.plan_type as string) ?? "monthly";
  if (!["monthly", "lump_sum", "both"].includes(planType)) {
    return error("Invalid plan type", 422);
  }
  if (planType === "lump_sum" && Number(pool.allow_lump_sum) !== 1) {
    return error("This pool does not accept one-time contributions", 422);
  }
  if (planType !== "lump_sum" && Number(pool.allow_monthly) !== 1) {
    return error("This pool does not accept monthly contributions", 422);
  }

  const monthlyAmount = input.monthly_amount !== undefined && input.monthly_amount !== "" && input.monthly_amount !== null
    ? Number(input.monthly_amount)
    : pool.default_monthly !== null
      ? Number(pool.default_monthly)
      : 0;

  if (planType !== "lump_sum") {
    const min = pool.min_monthly !== null ? Number(pool.min_monthly) : 0;
    const max = pool.max_monthly !== null ? Number(pool.max_monthly) : 0;
    if (monthlyAmount <= 0) {
      return error("Monthly contribution amount is required", 422);
    }
    if (min > 0 && monthlyAmount < min) {
      return error(`Monthly contribution is below the minimum of ₦${min.toLocaleString()}`, 422);
    }
    if (max > 0 && monthlyAmount > max) {
      return error(`Monthly contribution exceeds the maximum of ₦${max.toLocaleString()}`, 422);
    }
  }

  const existing = await query(
    "SELECT id FROM pool_memberships WHERE pool_id = ? AND user_id = ? AND status IN ('active','paused','defaulted')",
    [poolId, user.id]
  );
  if (existing && existing.length > 0) {
    return error("You are already a member of this pool", 422);
  }

  const conn = await beginTransaction();
  let membershipId = 0;
  let firstScheduleId: number | null = null;
  try {
    const inserted = await txExecute(
      conn,
      `INSERT INTO pool_memberships (pool_id, user_id, plan_type, monthly_amount, auto_debit, status, joined_at)
       VALUES (?, ?, ?, ?, ?, 'active', NOW())`,
      [poolId, user.id, planType, planType === "lump_sum" ? null : monthlyAmount, input.auto_debit ? 1 : 0]
    );
    membershipId = Number(inserted.insertId);

    if (planType !== "lump_sum") {
      const firstDue = firstDayOfNextMonth();
      const sched = await txExecute(
        conn,
        `INSERT INTO pool_schedules (membership_id, pool_id, user_id, due_date, amount, penalty_amount, total_due, status, created_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, 'pending', NOW())`,
        [membershipId, poolId, user.id, firstDue, monthlyAmount, monthlyAmount]
      );
      firstScheduleId = Number(sched.insertId);
    }

    await txExecute(conn, "UPDATE investment_pools SET member_count = member_count + 1 WHERE id = ?", [poolId]);
    await commit(conn);
  } catch (e: any) {
    await rollback(conn);
    return error("Failed to join pool: " + (e?.message ?? "Unknown error"), 500);
  }

  try {
    const poolRows = await query("SELECT * FROM investment_pools WHERE id = ?", [poolId]);
    const poolRow = poolRows[0];
    if (poolRow) {
      const body = naira(monthlyAmount);
      await notify(
        { id: user.id, name: user.name, email: user.email },
        poolId,
        membershipId,
        null,
        "welcome",
        `Welcome to the ${poolRow.title} pool`,
        `<h2 style="margin:0 0 12px;color:#0A1628;">You're in! 🎉</h2>` +
          `<p style="margin:0 0 12px;color:#4b5563;line-height:1.6;">Welcome to the <strong>${poolRow.title}</strong> pool.</p>` +
          `<p style="margin:0 0 12px;color:#4b5563;line-height:1.6;">Your ${planType === "lump_sum" ? "one-time" : "monthly"} contribution plan is active. ` +
          (planType !== "lump_sum" ? `Your first monthly payment of <strong>${body}</strong> is due on <strong>1st of next month</strong>.<br>` : "") +
          `Payments are held securely in the company account until the pool reaches its target and the property is purchased.</p>` +
          `<p style="margin:0;color:#9ca3af;font-size:13px;">You'll receive 3 reminder emails before every due date. Missing a payment incurs a ` +
          `${poolRow.penalty_rate}% late fee after ${poolRow.grace_days} days.</p>`
      );
    }
  } catch (e: any) {
    console.error("Pool welcome email failed: " + (e?.message ?? ""));
  }

  return success(
    {
      membership_id: membershipId,
      first_schedule_id: firstScheduleId,
      plan_type: planType,
      monthly_amount: planType === "lump_sum" ? null : monthlyAmount,
    },
    "You have joined the pool successfully",
    201
  );
}

function firstDayOfNextMonth(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toISOString().slice(0, 10);
}
