/**
 * GET /api/agent/referrals — list the authenticated agent's referrals.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { authenticateAgent, isUser } from "@/server/auth";
import { query } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAgent(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const userId = user.id;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const perPage = Math.min(50, Math.max(1, Number(sp.get("per_page") ?? 20)));

  const countRows = (await query("SELECT COUNT(*) as c FROM referrals WHERE referrer_id = ?", [userId])) as any[];
  const total = Number(countRows[0]?.c ?? 0);

  const offset = (page - 1) * perPage;
  const referrals = (await query(
    "SELECT r.*, u.name as referred_name, u.email as referred_email, u.created_at as referred_at FROM referrals r LEFT JOIN users u ON u.id = r.referred_id WHERE r.referrer_id = ? ORDER BY r.created_at DESC LIMIT ? OFFSET ?",
    [userId, perPage, offset]
  )) as any[];

  const formattedReferrals = referrals.map((ref) => ({
    id: Number(ref.id),
    referrer_id: Number(ref.referrer_id),
    referred_id: ref.referred_id ? Number(ref.referred_id) : null,
    referral_code: ref.referral_code,
    status: ref.status,
    reward_amount: Number(ref.reward_amount),
    reward_paid: Boolean(ref.reward_paid),
    referred_name: ref.referred_name ?? null,
    referred_email: ref.referred_email ?? null,
    referred_at: ref.referred_at,
    created_at: ref.created_at,
    paid_at: ref.paid_at,
    updated_at: ref.updated_at,
  }));

  return success(
    {
      data: formattedReferrals,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    },
    "Referrals retrieved"
  );
}
