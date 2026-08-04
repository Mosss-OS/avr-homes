/**
 * GET /api/admin/subscriptions — list all subscriptions with agent info (admin only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { requirePermission } from "@/server/auth";
import { query } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requirePermission(req, "admin_subscriptions_read");
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const perPage = Math.min(50, Math.max(1, Number(sp.get("per_page") ?? 20)));
  const tier = sp.get("tier") ?? null;
  const status = sp.get("status") ?? null;
  const search = sp.get("q") ?? null;

  let whereConditions = [];
  let bindValues: any[] = [];

  if (tier) {
    whereConditions.push("s.tier = ?");
    bindValues.push(tier);
  }

  if (status) {
    whereConditions.push("s.status = ?");
    bindValues.push(status);
  }

  if (search) {
    whereConditions.push("(u.name LIKE ? OR u.email LIKE ?)");
    const searchTerm = `%${search}%`;
    bindValues.push(searchTerm, searchTerm);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

  const countQuery = `SELECT COUNT(DISTINCT s.agent_id) FROM agent_subscriptions s JOIN users u ON u.id = s.agent_id ${whereClause}`;
  const [countResult] = await query(countQuery, bindValues);
  const total = Number(countResult[0]?.c ?? 0);

  const offset = (page - 1) * perPage;

  const rowsQuery = `SELECT s.*, u.name as user_name, u.email as user_email, (SELECT COUNT(*) FROM properties p WHERE p.agent_id = s.agent_id) as listing_count FROM agent_subscriptions s JOIN users u ON u.id = s.agent_id ${whereClause} AND s.id = (SELECT s2.id FROM agent_subscriptions s2 WHERE s2.agent_id = s.agent_id ORDER BY s2.current_period_start DESC LIMIT 1) ORDER BY s.current_period_start DESC LIMIT ${perPage} OFFSET ${offset}`;
  const rows = await query(rowsQuery, bindValues);

  const formattedRows = rows.map((r: any) => ({
    id: Number(r.id),
    agent_id: Number(r.agent_id),
    tier: r.tier,
    status: r.status,
    listings_limit: Number(r.listings_limit),
    featured_slots: Number(r.featured_slots),
    lead_priority: Number(r.lead_priority),
    analytics_access: Boolean(r.analytics_access),
    verification_priority: Number(r.verification_priority),
    dedicated_manager: Boolean(r.dedicated_manager),
    listing_count: Number(r.listing_count),
    user_name: r.user_name,
    user_email: r.user_email,
    current_period_start: r.current_period_start,
    current_period_end: r.current_period_end,
    cancelled_at: r.cancelled_at,
  }));

  return success(
    {
      data: formattedRows,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    },
    "Subscriptions retrieved successfully"
  );
}
