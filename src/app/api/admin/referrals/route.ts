/**
 * GET /api/admin/referrals — list all referrals platform-wide (admin only).
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

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const perPage = Math.min(50, Math.max(1, Number(sp.get("per_page") ?? 20)));
  const status = sp.get("status") ?? "";
  const q = (sp.get("q") ?? "").trim();

  let where = "";
  const binds: any[] = [];

  if (status && ["pending", "signed_up", "upgraded", "developer_referred", "bulk_buyer_referred"].includes(status)) {
    where += " AND r.status = ?";
    binds.push(status);
  }

  if (q) {
    where += " AND (u.name LIKE ? OR u.email LIKE ? OR ru.name LIKE ? OR ru.email LIKE ? OR r.referral_code LIKE ?)";
    const like = `%${q}%`;
    binds.push(like, like, like, like, like);
  }

  const countQuery = `SELECT COUNT(*) FROM referrals r LEFT JOIN users u ON u.id = r.referrer_id LEFT JOIN users ru ON ru.id = r.referred_id WHERE 1=1 ${where}`;
  const [countRows] = await query(countQuery, binds);
  const total = Number(countRows[0]?.c ?? 0);

  const offset = (page - 1) * perPage;

  const rowsQuery = `SELECT r.*, u.name as referrer_name, u.email as referrer_email, ru.name as referred_name, ru.email as referred_email FROM referrals r LEFT JOIN users u ON u.id = r.referrer_id LEFT JOIN users ru ON ru.id = r.referred_id WHERE 1=1 ${where} ORDER BY r.created_at DESC LIMIT ${perPage} OFFSET ${offset}`;
  const rows = await query(rowsQuery, binds);

  const formattedRows = rows.map((r: any) => ({
    id: Number(r.id),
    referrer_id: Number(r.referrer_id),
    referred_id: r.referred_id ? Number(r.referred_id) : null,
    referral_code: r.referral_code,
    status: r.status,
    reward_amount: Number(r.reward_amount),
    reward_paid: Boolean(r.reward_paid),
    referred_name: r.referred_name ?? null,
    referred_email: r.referred_email ?? null,
    referrer_name: r.referrer_name ?? null,
    referrer_email: r.referrer_email ?? null,
    paid_at: r.paid_at,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  return success(
    {
      data: formattedRows,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    },
    "Referrals retrieved"
  );
}
