/**
 * POST /api/pools/pay/webhook — Paystack webhook for pool payments
 * (subscription.charge.success, charge.success, subscription.disable).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import {
  fetchOne,
  execute,
  beginTransaction,
  txExecute,
  commit,
  rollback,
} from "@/server/db";
import { verifyWebhookSignature } from "@/server/paystack";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";

  const valid = await verifyWebhookSignature(signature, rawBody);
  if (!valid) {
    return error("Invalid webhook signature", 401);
  }

  let payload: Record<string, any>;
  try {
    payload = JSON.parse(rawBody);
  } catch (e: any) {
    return error("Invalid webhook payload", 400);
  }

  const event = payload.event ?? "";
  const data = payload.data ?? {};

  try {
    if (event === "subscription.charge.success") {
      await recordSubscriptionCharge(data);
    } else if (event === "charge.success") {
      const reference = String(data.reference ?? "");
      if (reference.startsWith("pool_")) {
        const metadata = data.metadata ?? {};
        const membershipId = Number(metadata.membership_id ?? 0);
        const scheduleId = Number(metadata.schedule_id ?? 0);
        const type = metadata.type ?? "schedule";

        const membership = await fetchOne(
          "SELECT m.*, p.id as pool_id FROM pool_memberships m JOIN investment_pools p ON p.id = m.pool_id WHERE m.id = ?",
          [membershipId]
        );
        if (membership) {
          await recordPaidContribution(membership, reference, Number(data.amount ?? 0), scheduleId, type, "auto_debit");
        }
      }
    } else if (event === "subscription.disable") {
      const subscriptionCode = String(data.subscription_code ?? "");
      if (subscriptionCode) {
        await execute(
          "UPDATE pool_memberships SET auto_debit = 0, paystack_subscription_code = NULL WHERE paystack_subscription_code = ?",
          [subscriptionCode]
        );
      }
    }
  } catch (e: any) {
    console.error("Pool webhook handler error: " + (e?.message ?? ""));
  }

  return success(null, "Webhook processed");
}

async function recordSubscriptionCharge(data: Record<string, any>): Promise<void> {
  const subscriptionCode = data.subscription?.subscription_code ?? "";
  const amountKobo = Number(data.amount ?? 0);
  const amount = amountKobo / 100;
  const reference = String(data.reference ?? "");

  if (!subscriptionCode || amountKobo <= 0) {
    return;
  }

  const membership = await fetchOne("SELECT * FROM pool_memberships WHERE paystack_subscription_code = ?", [subscriptionCode]);
  if (!membership) {
    return;
  }

  await recordPaidContribution(membership, reference, amountKobo, 0, "schedule", "auto_debit");
}

async function recordPaidContribution(
  membership: Record<string, any>,
  reference: string,
  amountKobo: number,
  scheduleId: number,
  type: string,
  channel: string
): Promise<void> {
  const amount = amountKobo / 100;
  const membershipId = Number(membership.id);

  const dup = await fetchOne("SELECT id FROM pool_contributions WHERE payment_ref = ?", [reference]);
  if (dup) {
    return;
  }

  const conn = await beginTransaction();
  try {
    if (type === "lump_sum") {
      await txExecute(
        conn,
        `INSERT INTO pool_contributions (pool_id, membership_id, user_id, schedule_id, amount, penalty_amount, type, channel, payment_ref, status, paid_at, created_at)
         VALUES (?, ?, ?, NULL, ?, 0, 'lump_sum', ?, ?, 'paid', NOW(), NOW())`,
        [Number(membership.pool_id), membershipId, Number(membership.user_id), amount, channel, reference]
      );
    } else {
      const schedule = await txExecute(
        conn,
        "SELECT * FROM pool_schedules WHERE membership_id = ? AND status IN ('pending','overdue') ORDER BY due_date ASC LIMIT 1",
        [membershipId]
      ) as unknown as Record<string, any> | null;
      if (!schedule) {
        await rollback(conn);
        return;
      }
      await txExecute(
        conn,
        `INSERT INTO pool_contributions (pool_id, membership_id, user_id, schedule_id, amount, penalty_amount, type, channel, payment_ref, status, paid_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'monthly', ?, ?, 'paid', NOW(), NOW())`,
        [Number(membership.pool_id), membershipId, Number(membership.user_id), Number(schedule.id), Number(schedule.amount), Number(schedule.penalty_amount), channel, reference]
      );
      await txExecute(conn, "UPDATE pool_schedules SET status = 'paid', paid_at = NOW(), payment_ref = ? WHERE id = ?", [reference, Number(schedule.id)]);
    }

    await txExecute(conn, "UPDATE investment_pools SET current_raised = current_raised + ? WHERE id = ?", [amount, Number(membership.pool_id)]);
    await commit(conn);
  } catch (e: any) {
    await rollback(conn);
    console.error("Pool auto-charge record failed: " + (e?.message ?? ""));
  }
}
