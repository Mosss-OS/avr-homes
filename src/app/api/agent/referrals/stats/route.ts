/**
 * GET /api/agent/referrals/stats — get referral statistics for the authenticated agent.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { authenticateAgent, isUser } from "@/server/auth";
import { fetchOne } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAgent(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const userId = user.id;

  const stats = await fetchOne(
    `SELECT
      COUNT(*) as total_referrals,
      SUM(CASE WHEN status = 'signed_up' THEN 1 ELSE 0 END) as signed_up,
      SUM(CASE WHEN status = 'upgraded' THEN 1 ELSE 0 END) as upgraded,
      SUM(CASE WHEN status = 'developer_referred' THEN 1 ELSE 0 END) as developer_referred,
      SUM(CASE WHEN status = 'bulk_buyer_referred' THEN 1 ELSE 0 END) as bulk_buyer_referred,
      SUM(CASE WHEN reward_paid = 1 THEN reward_amount ELSE 0 END) as total_earned,
      SUM(CASE WHEN reward_paid = 0 THEN reward_amount ELSE 0 END) as pending_rewards
     FROM referrals WHERE referrer_id = ?`,
    [userId]
  );

  const formattedStats = {
    total_referrals: Number(stats?.total_referrals) || 0,
    signed_up: Number(stats?.signed_up) || 0,
    upgraded: Number(stats?.upgraded) || 0,
    developer_referred: Number(stats?.developer_referred) || 0,
    bulk_buyer_referred: Number(stats?.bulk_buyer_referred) || 0,
    total_earned: Number(stats?.total_earned) || 0,
    pending_rewards: Number(stats?.pending_rewards) || 0,
  };

  return success(formattedStats, "Referral stats retrieved");
}
