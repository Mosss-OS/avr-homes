/**
 * PUT /api/admin/referrals/{id}/reward — update reward amount for a referral (admin only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { requirePermission } from "@/server/auth";
import { query } from "@/server/db";
import { readJson } from "@/server/http";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await requirePermission(req, "admin_referrals_write");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const referralId = Number(id);
  if (!referralId) {
    return error("Referral ID required", 400);
  }

  const input = await readJson(req);
  const amount = Number(input.reward_amount ?? 0);

  await query("UPDATE referrals SET reward_amount = ? WHERE id = ?", [amount, referralId]);

  return success([], "Reward updated");
}
