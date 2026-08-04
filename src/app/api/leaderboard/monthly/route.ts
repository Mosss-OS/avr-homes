/**
 * GET /api/leaderboard/monthly — top 10 agents by deal value and leads this month.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { query } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const rows = await query(
    `SELECT a.id, a.name, a.slug, a.photo_url, a.agency, a.city, a.listings,
            COALESCE(l.monthly_leads, 0) as monthly_leads,
            COALESCE(d.monthly_deal_value, 0) as monthly_deal_value
     FROM agents a
     LEFT JOIN (
       SELECT p.agent_id, COUNT(*) as monthly_leads
       FROM inquiries i
       JOIN properties p ON p.id = i.property_id
       WHERE i.created_at >= ? AND p.agent_id = a.id
       GROUP BY p.agent_id
     ) l ON l.agent_id = a.id
     LEFT JOIN (
       SELECT p.agent_id, SUM(p.price) as monthly_deal_value
       FROM inquiries i
       JOIN properties p ON p.id = i.property_id
       WHERE i.status = 'closed' AND i.created_at >= ? AND p.agent_id = a.id
       GROUP BY p.agent_id
     ) d ON d.agent_id = a.id
     WHERE a.is_active = 1
     ORDER BY COALESCE(d.monthly_deal_value, 0) DESC
     LIMIT 10`,
    [monthStart, monthStart]
  );

  const leaders = (rows as any[]).map((r) => ({
    ...r,
    id: Number(r.id),
    listings: Number(r.listings),
    monthly_leads: Number(r.monthly_leads),
    monthly_deal_value: Number(r.monthly_deal_value),
    score: Number(r.monthly_deal_value),
  }));

  return success(
    { period: "monthly", period_start: monthStart, leaders },
    "Monthly leaderboard retrieved"
  );
}
