/**
 * GET /api/leaderboard/quarterly — top 10 agents by deal value this quarter.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { query } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const quarterStart = startOfQuarter();

  const rows = await query(
    `SELECT a.id, a.name, a.slug, a.photo_url, a.agency, a.city, a.listings,
            COALESCE(q.q_deal_value, 0) as quarterly_deal_value,
            COALESCE(q.q_listings, 0) as quarterly_listings
     FROM agents a
     LEFT JOIN (
       SELECT p.agent_id, SUM(p.price) as q_deal_value, COUNT(*) as q_listings
       FROM properties p
       WHERE p.created_at >= ? AND p.is_active = 1
       GROUP BY p.agent_id
     ) q ON q.agent_id = a.id
     WHERE a.is_active = 1
     ORDER BY COALESCE(q.q_deal_value, 0) DESC
     LIMIT 10`,
    [quarterStart]
  );

  const leaders = (rows as any[]).map((r) => ({
    ...r,
    id: Number(r.id),
    listings: Number(r.listings),
    quarterly_deal_value: Number(r.quarterly_deal_value),
    quarterly_listings: Number(r.quarterly_listings),
    score: Number(r.quarterly_deal_value),
  }));

  return success(
    { period: "quarterly", period_start: quarterStart, leaders },
    "Quarterly leaderboard retrieved"
  );
}

function startOfQuarter(): string {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11
  const quarterStartMonth = currentMonth - (currentMonth % 3);
  return `${now.getFullYear()}-${String(quarterStartMonth + 1).padStart(2, "0")}-01`;
}
