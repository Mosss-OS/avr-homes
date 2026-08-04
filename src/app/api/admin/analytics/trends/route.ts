/**
 * GET /api/admin/analytics/trends?period=30 — trend data for charts (admin only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchAll } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const period = Math.max(7, Math.min(365, Number(req.nextUrl.searchParams.get("period") ?? 30)));
  const since = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  try {
    const trends = await fetchAll(
      `SELECT
         d.date,
         COALESCE(u.cnt, 0) as new_users,
         COALESCE(p.cnt, 0) as new_properties,
         COALESCE(b.cnt, 0) as new_bookings,
         COALESCE(i.cnt, 0) as new_inquiries,
         COALESCE(r.cnt, 0) as new_referrals,
         COALESCE(s.cnt, 0) as new_subscriptions
       FROM (
         SELECT DATE_ADD(?, INTERVAL seq DAY) as date
         FROM (SELECT 0 as seq UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) d1
         CROSS JOIN (SELECT 0 as seq UNION SELECT 10 UNION SELECT 20 UNION SELECT 30 UNION SELECT 40 UNION SELECT 50 UNION SELECT 60 UNION SELECT 70 UNION SELECT 80 UNION SELECT 90) d2
         HAVING date <= CURDATE()
       ) d
       LEFT JOIN (SELECT DATE(created_at) as dt, COUNT(*) as cnt FROM users WHERE created_at >= ? GROUP BY dt) u ON u.dt = d.date
       LEFT JOIN (SELECT DATE(created_at) as dt, COUNT(*) as cnt FROM properties WHERE created_at >= ? GROUP BY dt) p ON p.dt = d.date
       LEFT JOIN (SELECT DATE(created_at) as dt, COUNT(*) as cnt FROM property_bookings WHERE created_at >= ? GROUP BY dt) b ON b.dt = d.date
       LEFT JOIN (SELECT DATE(created_at) as dt, COUNT(*) as cnt FROM inquiries WHERE created_at >= ? GROUP BY dt) i ON i.dt = d.date
       LEFT JOIN (SELECT DATE(created_at) as dt, COUNT(*) as cnt FROM referrals WHERE created_at >= ? GROUP BY dt) r ON r.dt = d.date
       LEFT JOIN (SELECT DATE(created_at) as dt, COUNT(*) as cnt FROM agent_subscriptions WHERE created_at >= ? GROUP BY dt) s ON s.dt = d.date
       ORDER BY d.date`,
      [since, since, since, since, since, since, since]
    );

    const data = trends.map((t: any) => ({
      date: t.date,
      new_users: Number(t.new_users),
      new_properties: Number(t.new_properties),
      new_bookings: Number(t.new_bookings),
      new_inquiries: Number(t.new_inquiries),
      new_referrals: Number(t.new_referrals),
      new_subscriptions: Number(t.new_subscriptions),
    }));

    return success({ period, data }, "Trends retrieved");
  } catch {
    return success({ period, data: [] }, "Trends retrieved");
  }
}
