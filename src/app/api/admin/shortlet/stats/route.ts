/**
 * GET /api/admin/shortlet/stats — short-let dashboard stats (admin).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { requirePermission } from "@/server/auth";
import { query } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requirePermission(req, "admin_shortlet_read");
  if (auth instanceof NextResponse) return auth;

  const stats = (await query(
    `SELECT
      COUNT(DISTINCT p.id) as total_shortlets,
      COUNT(DISTINCT CASE WHEN pb.status IN ('pending','confirmed') THEN pb.property_id END) as active_bookings_properties,
      COUNT(CASE WHEN pb.status = 'pending' THEN 1 END) as pending_bookings,
      COUNT(CASE WHEN pb.status = 'confirmed' THEN 1 END) as confirmed_bookings,
      COUNT(CASE WHEN pb.status = 'completed' THEN 1 END) as completed_bookings,
      COALESCE(SUM(CASE WHEN pb.status IN ('confirmed','completed') THEN pb.total_price END), 0) as total_revenue
    FROM properties p
    LEFT JOIN property_bookings pb ON pb.property_id = p.id
    WHERE p.purpose = 'shortlet'`
  )) as any[];

  return success(
    {
      total_shortlets: Number(stats[0]?.total_shortlets || 0),
      active_bookings_properties: Number(stats[0]?.active_bookings_properties || 0),
      pending_bookings: Number(stats[0]?.pending_bookings || 0),
      confirmed_bookings: Number(stats[0]?.confirmed_bookings || 0),
      completed_bookings: Number(stats[0]?.completed_bookings || 0),
      total_revenue: Number(stats[0]?.total_revenue || 0),
    },
    "Dashboard stats retrieved"
  );
}
