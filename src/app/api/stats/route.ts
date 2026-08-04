/**
 * GET /api/stats — public site statistics.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { query } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const tables: Record<string, string> = {
    total_properties: "SELECT COUNT(*) as c FROM properties WHERE is_active = 1",
    featured_properties: "SELECT COUNT(*) as c FROM properties WHERE featured = 1 AND is_active = 1",
    cities_covered: "SELECT COUNT(DISTINCT city) as c FROM properties WHERE is_active = 1",
    total_agents: "SELECT COUNT(*) as c FROM agents WHERE is_active = 1",
    total_users: "SELECT COUNT(*) as c FROM users",
  };

  const stats: Record<string, unknown> = {};
  for (const [key, sql] of Object.entries(tables)) {
    try {
      const rows = await query(sql);
      const row = Array.isArray(rows) ? rows[0] : null;
      stats[key] = Number(row?.c ?? 0);
    } catch (err) {
      stats[key + "_error"] = (err as Error).message;
      stats[key] = 0;
    }
  }

  return success(stats, "Stats retrieved successfully");
}
