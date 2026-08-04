/**
 * POST /api/pools/pay/auto-debit — complete auto-debit setup after the
 * first (card-authorizing) payment.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticate, isUser } from "@/server/auth";
import { fetchOne, execute } from "@/server/db";
import { readJson } from "@/server/http";
import {
  verifyTransaction,
  createCustomer,
  createSubscription,
  disableSubscription,
} from "@/server/paystack";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const input = await readJson(req);
  const membershipId = Number(input.membership_id ?? 0);
  const reference = String(input.reference ?? "");

  if (membershipId <= 0 || !reference) {
    return error("membership_id and reference are required", 422);
  }

  const membership = await fetchOne("SELECT * FROM pool_memberships WHERE id = ? AND user_id = ?", [membershipId, user.id]);
  if (!membership) {
    return error("Membership not found", 404);
  }

  const verified = await verifyTransaction(reference);
  if (!verified.ok || verified.status !== "success") {
    return error("Payment verification failed for auto-debit setup", 402);
  }

  const authorizationCode = verified.authorization?.authorization_code ?? "";
  const customerEmail = verified.customer?.email ?? user.email;
  if (!authorizationCode) {
    return error("Card was not authorized for auto-debit. Please try again.", 422);
  }

  let customerCode: string | null = null;
  if (!membership.paystack_customer_code) {
    const customer = await createCustomer(customerEmail, user.name ?? "");
    if (!customer.ok || !customer.customer_code) {
      return error(`Could not create Paystack customer: ${customer.body?.body?.error ?? "Unknown error"}`, 500);
    }
    customerCode = customer.customer_code;
    await execute("UPDATE pool_memberships SET paystack_customer_code = ? WHERE id = ?", [customerCode, membershipId]);
  } else {
    customerCode = membership.paystack_customer_code;
  }

  if (!customerCode) {
    return error("Could not resolve Paystack customer for auto-debit", 422);
  }

  if (!membership.paystack_plan_code) {
    return error("Payment plan was not created. Please re-initiate payment.", 422);
  }
  const planCode = membership.paystack_plan_code;

  if (membership.paystack_subscription_code) {
    try {
      await disableSubscription(membership.paystack_subscription_code);
    } catch (e: any) {
      // best-effort disable
    }
  }

  const subscription = await createSubscription(customerCode, planCode, authorizationCode);
  if (!subscription.ok || !subscription.subscription_code) {
    return error(`Could not create subscription: ${subscription.body?.body?.error ?? "Unknown error"}`, 500);
  }

  await execute(
    "UPDATE pool_memberships SET paystack_subscription_code = ?, auto_debit = 1 WHERE id = ?",
    [subscription.subscription_code, membershipId]
  );

  return success(null, "Auto-debit enabled. Your card will be charged each month automatically.");
}
