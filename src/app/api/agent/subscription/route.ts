/**
 * GET /api/agent/subscription — get the current active subscription for the authenticated agent.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAgent, isUser } from "@/server/auth";
import { fetchOne, execute } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAgent(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const userId = user.id;

  const subscription = await fetchOne(
    `SELECT s.tier, s.status, s.listings_limit, s.featured_slots, s.lead_priority, s.analytics_access, s.verification_priority, s.dedicated_manager, s.current_period_start, s.current_period_end, s.cancelled_at
     FROM agent_subscriptions s
     JOIN users u ON u.id = s.agent_id
     WHERE u.id = ? AND s.status = "active"
     ORDER BY s.current_period_start DESC LIMIT 1`,
    [userId]
  );

  if (!subscription) {
    return success(
      {
        tier: "free",
        status: "active",
        listings_limit: 3,
        featured_slots: 0,
        lead_priority: 0,
        analytics_access: false,
        verification_priority: 0,
        dedicated_manager: false,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancelled_at: null,
      },
      "Subscription data retrieved"
    );
  }

  return success(subscription, "Subscription data retrieved");
}
