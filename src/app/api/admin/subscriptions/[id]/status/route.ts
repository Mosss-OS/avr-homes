/**
 * PUT /api/admin/subscriptions/{id}/status — update a subscription's status (admin only).
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
  const status = input.status;

  if (!["active", "cancelled", "past_due"].includes(status)) {
    return error("Invalid status. Use: active, cancelled, past_due", 422);
  }

  const cancelled = status === "cancelled" ? ", cancelled_at = NOW()" : "";
  await query("UPDATE agent_subscriptions SET status = ? " + cancelled + " WHERE id = ?", [status, subscriptionId]);

  return success({ id: subscriptionId, status }, "Subscription status updated");
}
