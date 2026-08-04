/**
 * POST /api/agent/subscription/upgrade — upgrade or change the subscription tier for the authenticated agent.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAgent, isUser } from "@/server/auth";
import { fetchOne, beginTransaction, txFetchOne, txExecute, commit, rollback } from "@/server/db";
import { readJson } from "@/server/http";
import { Validator } from "@/server/validator";

export const runtime = "nodejs";

const TIER_DATA: Record<string, { listings_limit: number; featured_slots: number; lead_priority: number; analytics_access: boolean; verification_priority: number; dedicated_manager: boolean }> = {
  free: { listings_limit: 3, featured_slots: 0, lead_priority: 0, analytics_access: false, verification_priority: 0, dedicated_manager: false },
  bronze: { listings_limit: 10, featured_slots: 1, lead_priority: 1, analytics_access: false, verification_priority: 1, dedicated_manager: false },
  silver: { listings_limit: 25, featured_slots: 3, lead_priority: 2, analytics_access: false, verification_priority: 2, dedicated_manager: false },
  gold: { listings_limit: 50, featured_slots: 10, lead_priority: 3, analytics_access: true, verification_priority: 3, dedicated_manager: true },
  platinum: { listings_limit: -1, featured_slots: -1, lead_priority: 4, analytics_access: true, verification_priority: 4, dedicated_manager: true },
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAgent(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const userId = user.id;
  const input = await readJson(req);

  const validator = new Validator(input);
  validator.required("tier", "Subscription tier");

  if (validator.fails()) {
    return error("Validation failed", 422, validator.getErrors());
  }

  const tier = validator.validated().tier as string;

  if (!["bronze", "silver", "gold", "platinum"].includes(tier)) {
    return error("Invalid subscription tier", 400);
  }

  const conn = await beginTransaction();
  try {
    const subscription = await txFetchOne(
      conn,
      'SELECT s.tier, s.status, s.current_period_end FROM agent_subscriptions s WHERE s.agent_id = ? AND s.status = "active" ORDER BY s.current_period_start DESC LIMIT 1',
      [userId]
    );

    if (subscription) {
      const sub = subscription as any;

      if (tier !== "free" && sub.status === "active" && new Date(sub.current_period_end) > new Date()) {
        await commit(conn);
        return success(
          {
            agent_id: userId,
            current_tier: sub.tier,
            new_tier: tier,
            current_period_end: sub.current_period_end,
            action: "upgrade_requires_payment",
          },
          "Subscription upgrade requires payment processing"
        );
      }

      if (sub.tier === tier) {
        await commit(conn);
        return success({ subscription: sub }, "Already subscribed to this tier");
      }
    }

    const status = "active";
    const currentPeriodStart = new Date().toISOString().slice(0, 19).replace("T", " ");
    const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");

    const tierData = TIER_DATA[tier];

    const insertResult = await txExecute(
      conn,
      "INSERT INTO agent_subscriptions (agent_id, tier, status, listings_limit, featured_slots, lead_priority, analytics_access, verification_priority, dedicated_manager, current_period_start, current_period_end) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        userId,
        tier,
        status,
        tierData.listings_limit,
        tierData.featured_slots,
        tierData.lead_priority,
        tierData.analytics_access ? 1 : 0,
        tierData.verification_priority,
        tierData.dedicated_manager ? 1 : 0,
        currentPeriodStart,
        currentPeriodEnd,
      ]
    );

    const subscriptionId = Number(insertResult?.insertId ?? 0);
    const subscriptionResponse: Record<string, any> = {
      id: subscriptionId,
      tier,
      status,
      listings_limit: tierData.listings_limit,
      featured_slots: tierData.featured_slots,
      lead_priority: tierData.lead_priority,
      analytics_access: tierData.analytics_access,
      verification_priority: tierData.verification_priority,
      dedicated_manager: tierData.dedicated_manager,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
    };

    await commit(conn);
    return success({ subscription: subscriptionResponse }, "Subscription upgraded successfully");
  } catch (e) {
    await rollback(conn);
    return error("Failed to upgrade subscription: " + (e as Error).message, 500);
  }
}
