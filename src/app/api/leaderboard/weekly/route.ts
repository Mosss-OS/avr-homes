/**
 * GET /api/leaderboard/weekly — top 10 agents by leads and listings this week.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { query } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const weekStart = startOfWeek();
  const weekStartDate = weekStart.toISOString().slice(0, 10);

  const rows = await query(
    `SELECT a.id, a.name, a.slug, a.photo_url, a.agency, a.city, a.listings,
            COALESCE(l.weekly_leads, 0) as weekly_leads,
            COALESCE(p2.weekly_listings, 0) as weekly_listings
     FROM agents a
     LEFT JOIN (
       SELECT p.agent_id, COUNT(*) as weekly_leads
       FROM inquiries i
       JOIN properties p ON p.id = i.property_id
       WHERE i.created_at >= ? AND p.agent_id = a.id
       GROUP BY p.agent_id
     ) l ON l.agent_id = a.id
     LEFT JOIN (
       SELECT agent_id, COUNT(*) as weekly_listings
       FROM properties
       WHERE created_at >= ? AND agent_id = a.id
       GROUP BY agent_id
     ) p2 ON p2.agent_id = a.id
     WHERE a.is_active = 1
     ORDER BY (COALESCE(l.weekly_leads, 0) + COALESCE(p2.weekly_listings, 0)) DESC
     LIMIT 10`,
    [weekStartDate, weekStartDate]
  );

  const leaders = (rows as any[]).map((r) => ({
    ...r,
    id: Number(r.id),
    listings: Number(r.listings),
    weekly_leads: Number(r.weekly_leads),
    weekly_listings: Number(r.weekly_listings),
    score: Number(r.weekly_leads) + Number(r.weekly_listings),
  }));

  return success(
    { period: "weekly", period_start: weekStartDate, leaders },
    "Weekly leaderboard retrieved"
  );
}

function startOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() + diff);
  return monday;
}
