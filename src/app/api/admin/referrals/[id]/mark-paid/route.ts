/**
 * PUT /api/admin/referrals/{id}/mark-paid — mark a referral reward as paid (admin only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { requirePermission } from "@/server/auth";
import { query } from "@/server/db";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await requirePermission(req, "admin_referrals_write");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const referralId = Number(id);
  if (!referralId) {
    return error("Referral ID required", 400);
  }

  await query("UPDATE referrals SET reward_paid = 1, paid_at = NOW() WHERE id = ?", [referralId]);

  return success([], "Reward marked as paid");
}
