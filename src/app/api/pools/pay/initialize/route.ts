/**
 * POST /api/pools/pay/initialize — initialize a Paystack pool contribution.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticate, isUser } from "@/server/auth";
import { fetchOne, execute } from "@/server/db";
import { readJson } from "@/server/http";
import { initializeTransaction, createPlan } from "@/server/paystack";
import { naira } from "@/server/notifications";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const input = await readJson(req);

  const membershipId = Number(input.membership_id ?? 0);
  if (membershipId <= 0) {
    return error("membership_id is required", 422);
  }

  const membership = await fetchOne(
    `SELECT m.*, p.title as pool_title, p.id as pool_id, p.min_lump_sum, p.allow_lump_sum
     FROM pool_memberships m
     JOIN investment_pools p ON p.id = m.pool_id
     WHERE m.id = ? AND m.user_id = ? AND m.status = 'active'`,
    [membershipId, user.id]
  );
  if (!membership) {
    return error("Active membership not found", 404);
  }

  const type = input.type ?? "schedule";
  let amount = 0;
  let scheduleId: number | null = null;
  let reference = "";

  if (type === "lump_sum") {
    amount = Number(input.amount ?? 0);
    if (amount <= 0) {
      return error("Valid lump-sum amount is required", 422);
    }
    const min = membership.min_lump_sum !== null ? Number(membership.min_lump_sum) : 0;
    if (min > 0 && amount < min) {
      return error(`Amount is below the minimum lump-sum contribution of ${naira(min)}`, 422);
    }
    reference = "pool_lump_" + membershipId + "_" + randomHex(4);
  } else {
    let schedId = Number(input.schedule_id ?? 0);
    if (schedId <= 0) {
      const nextRow = await fetchOne(
        "SELECT id FROM pool_schedules WHERE membership_id = ? AND status IN ('pending','overdue') ORDER BY due_date ASC LIMIT 1",
        [membershipId]
      );
      schedId = nextRow ? Number(nextRow.id) : 0;
    }
    if (schedId <= 0) {
      return error("No outstanding installment to pay", 422);
    }
    const schedule = await fetchOne("SELECT * FROM pool_schedules WHERE id = ? AND membership_id = ?", [schedId, membershipId]);
    if (!schedule) {
      return error("Schedule not found", 404);
    }
    if (schedule.status === "paid") {
      return error("This installment has already been paid", 422);
    }
    scheduleId = schedId;
    amount = Number(schedule.total_due);
    reference = "pool_sched_" + schedId + "_" + randomHex(4);
  }

  const amountKobo = Math.round(amount * 100);

  let planCode: string | null = null;
  if (input.auto_debit && ["monthly", "both"].includes(membership.plan_type)) {
    if (membership.paystack_plan_code) {
      planCode = membership.paystack_plan_code;
    } else {
      const plan = await createPlan(
        `Pool ${membership.pool_title} — ${naira(amount)}/month`,
        amountKobo,
        "monthly",
        "AVR Homes pooled property contribution"
      );
      if (!plan.ok) {
        return error(`Could not create payment plan: ${plan.body?.body?.error ?? "Unknown error"}`, 500);
      }
      planCode = plan.plan_code;
      await execute("UPDATE pool_memberships SET paystack_plan_code = ? WHERE id = ?", [planCode, membershipId]);
    }
  }

  const init = await initializeTransaction(
    user.email,
    amountKobo,
    reference,
    {
      pool_id: Number(membership.pool_id),
      membership_id: membershipId,
      schedule_id: scheduleId,
      type,
      purpose: "pool_contribution",
    },
    planCode
  );

  if (!init.ok) {
    return error(`Failed to initialize payment: ${init.body?.body?.error ?? "Unknown error"}`, 500);
  }

  return success(
    {
      reference: init.reference,
      authorization_url: init.authorization_url,
      access_code: init.access_code,
      amount,
    },
    undefined
  );
}

function randomHex(bytes: number): string {
  const crypto = require("node:crypto");
  return crypto.randomBytes(bytes).toString("hex");
}
