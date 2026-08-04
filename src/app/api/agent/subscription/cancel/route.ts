/**
 * POST /api/agent/subscription/cancel — cancel the active subscription for the authenticated agent.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAgent, isUser } from "@/server/auth";
import { fetchOne, execute } from "@/server/db";
import { getClientIp } from "@/server/rate-limiter";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAgent(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const userId = user.id;

  const subscription = await fetchOne(
    'SELECT id, current_period_end, status FROM agent_subscriptions WHERE agent_id = ? AND status = "active" ORDER BY current_period_start DESC LIMIT 1',
    [userId]
  );

  if (!subscription) {
    return error("No active subscription found", 404);
  }

  if (new Date(subscription.current_period_end) <= new Date()) {
    return error("Subscription has already ended", 400);
  }

  await execute('UPDATE agent_subscriptions SET status = "cancelled", cancelled_at = NOW() WHERE id = ?', [subscription.id]);

  await execute("INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)", [
    userId,
    "cancel_subscription",
    "subscription",
    subscription.id,
    getClientIp(req),
  ]);

  return success(null, "Subscription cancelled successfully");
}
