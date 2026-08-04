/**
 * GET /api/admin/referrals/stats — platform-wide referral stats (admin only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { requirePermission } from "@/server/auth";
import { query } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requirePermission(req, "admin_referrals_read");
  if (auth instanceof NextResponse) return auth;

  const stats = (await query(
    "SELECT COUNT(*) as total_referrals, COUNT(DISTINCT referrer_id) as total_referrers, SUM(CASE WHEN status = 'signed_up' THEN 1 ELSE 0 END) as signed_up, SUM(CASE WHEN status = 'upgraded' THEN 1 ELSE 0 END) as upgraded, SUM(CASE WHEN status = 'developer_referred' THEN 1 ELSE 0 END) as developer_referred, SUM(CASE WHEN status = 'bulk_buyer_referred' THEN 1 ELSE 0 END) as bulk_buyer_referred, SUM(CASE WHEN reward_paid = 1 THEN reward_amount ELSE 0 END) as total_paid, SUM(CASE WHEN reward_paid = 0 THEN reward_amount ELSE 0 END) as pending_payout, SUM(reward_amount) as total_rewards FROM referrals"
  )) as any[];

  const formattedStats = {
    total_referrals: Number(stats[0]?.total_referrals) || 0,
    total_referrers: Number(stats[0]?.total_referrers) || 0,
    signed_up: Number(stats[0]?.signed_up) || 0,
    upgraded: Number(stats[0]?.upgraded) || 0,
    developer_referred: Number(stats[0]?.developer_referred) || 0,
    bulk_buyer_referred: Number(stats[0]?.bulk_buyer_referred) || 0,
    total_paid: Number(stats[0]?.total_paid) || 0,
    pending_payout: Number(stats[0]?.pending_payout) || 0,
    total_rewards: Number(stats[0]?.total_rewards) || 0,
  };

  return success(formattedStats, "Referral stats retrieved");
}
