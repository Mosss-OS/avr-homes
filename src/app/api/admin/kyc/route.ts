/**
 * GET /api/admin/kyc — admin list KYC records.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { requirePermission } from "@/server/auth";
import { query } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requirePermission(req, "admin_kyc_read");
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const perPage = Math.min(50, Math.max(1, Number(sp.get("per_page") ?? 20)));
  const status = sp.get("status") ?? null;

  let whereConditions = ["1=1"];
  let bindValues: any[] = [];

  if (status && ["pending", "verified", "rejected"].includes(status)) {
    whereConditions.push("k.status = ?");
    bindValues.push(status);
  }

  const whereClause = whereConditions.join(" AND ");

  const countSql = `SELECT COUNT(*) FROM kyc_records k WHERE ${whereClause}`;
  const [countResult] = await query(countSql, bindValues);
  const total = Number(countResult[0]?.c ?? 0);

  const offset = (page - 1) * perPage;

  const sql = `SELECT k.*, u.name AS user_name, u.email AS user_email FROM kyc_records k JOIN users u ON u.id = k.user_id WHERE ${whereClause} ORDER BY k.created_at DESC LIMIT ${perPage} OFFSET ${offset}`;
  const rows = await query(sql, bindValues);

  const formattedRows = (rows as any[]).map((r) => ({
    id: Number(r.id),
    user_id: Number(r.user_id),
    bvn_number: r.bvn_number,
    source_of_funds: r.source_of_funds,
    id_document_url: r.id_document_url,
    id_document_type: r.id_document_type,
    bvn_verified: Boolean(r.bvn_verified),
    id_verified: Boolean(r.id_verified),
    accredited_investor: Boolean(r.accredited_investor),
    status: r.status,
    verified_at: r.verified_at,
    rejected_at: r.rejected_at,
    created_at: r.created_at,
    updated_at: r.updated_at,
    user_name: r.user_name,
    user_email: r.user_email,
  }));

  return success({
    data: formattedRows,
    total,
    page,
    per_page: perPage,
    total_pages: Math.ceil(total / perPage),
  });
}