/**
 * PUT /api/admin/subscriptions/{id}/tier — update a subscription's tier (admin only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { requirePermission } from "@/server/auth";
import { query } from "@/server/db";
import { readJson } from "@/server/http";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await requirePermission(req, "admin_subscriptions_write");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const subscriptionId = Number(id);
  if (!subscriptionId || subscriptionId <= 0) {
    return error("Invalid subscription ID", 400);
  }

  const input = await readJson(req);
  const tier: string = input.tier;

  if (!["free", "bronze", "silver", "gold", "platinum"].includes(tier)) {
    return error("Invalid tier", 422);
  }

  const tierData = ({
    free: { listings_limit: 3, featured_slots: 0, lead_priority: 0, analytics_access: false, verification_priority: 0, dedicated_manager: false },
    bronze: { listings_limit: 10, featured_slots: 1, lead_priority: 1, analytics_access: false, verification_priority: 1, dedicated_manager: false },
    silver: { listings_limit: 25, featured_slots: 3, lead_priority: 2, analytics_access: false, verification_priority: 2, dedicated_manager: false },
    gold: { listings_limit: 50, featured_slots: 10, lead_priority: 3, analytics_access: true, verification_priority: 3, dedicated_manager: true },
    platinum: { listings_limit: -1, featured_slots: -1, lead_priority: 4, analytics_access: true, verification_priority: 4, dedicated_manager: true },
  } as Record<string, any>)[tier];

  await query(
    "UPDATE agent_subscriptions SET tier = ?, listings_limit = ?, featured_slots = ?, lead_priority = ?, analytics_access = ?, verification_priority = ?, dedicated_manager = ? WHERE id = ?",
    [tier, tierData.listings_limit, tierData.featured_slots, tierData.lead_priority, tierData.analytics_access, tierData.verification_priority, tierData.dedicated_manager, subscriptionId]
  );

  return success({ id: subscriptionId, tier }, "Subscription tier updated");
}
