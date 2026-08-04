/**
 * GET /api/admin/withdrawals — list pending/status-filtered withdrawals across all agents (admin).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchOne, fetchAll } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const perPage = Math.min(50, Math.max(1, Number(sp.get("per_page") ?? 20)));
  const status = sp.get("status") ?? null;
  const search = sp.get("q") ?? null;

  const conditions: string[] = ['wt.type = "debit"'];
  const binds: unknown[] = [];

  if (status) {
    conditions.push("wt.status = ?");
    binds.push(status);
  }
  if (search) {
    conditions.push("(u.name LIKE ? OR u.email LIKE ?)");
    binds.push(`%${search}%`, `%${search}%`);
  }

  const where = conditions.join(" AND ");

  const countRow = await fetchOne(
    `SELECT COUNT(*) AS c FROM wallet_transactions wt
     JOIN agent_wallets w ON w.id = wt.wallet_id
     JOIN users u ON u.id = w.agent_id
     WHERE ${where}`,
    binds
  );
  const total = Number(countRow?.c ?? 0);

  const offset = (page - 1) * perPage;
  const rows = await fetchAll(
    `SELECT wt.*, w.agent_id, u.name as user_name, u.email as user_email
     FROM wallet_transactions wt
     JOIN agent_wallets w ON w.id = wt.wallet_id
     JOIN users u ON u.id = w.agent_id
     WHERE ${where}
     ORDER BY wt.created_at DESC LIMIT ${perPage} OFFSET ${offset}`,
    binds
  );

  const data = rows.map((r: Record<string, any>) => ({
    ...r,
    id: Number(r.id),
    wallet_id: Number(r.wallet_id),
    amount: Number(r.amount),
  }));

  return success(
    {
      data,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    },
    "Withdrawals retrieved"
  );
}
