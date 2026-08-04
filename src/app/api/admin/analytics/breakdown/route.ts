/**
 * GET /api/admin/analytics/breakdown — breakdown stats for charts (admin only).
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

  const format = (rows: any[]) =>
    rows.map((r: any) => ({ ...r, count: Number(r.count) }));

  try {
    const [
      propertiesByType,
      propertiesByPurpose,
      propertiesByCity,
      subscriptionsByTier,
      bookingsByStatus,
      inquiriesByStatus,
    ] = await Promise.all([
      fetchAll("SELECT type, COUNT(*) as count FROM properties GROUP BY type ORDER BY count DESC"),
      fetchAll("SELECT purpose, COUNT(*) as count FROM properties GROUP BY purpose ORDER BY count DESC"),
      fetchAll("SELECT city, COUNT(*) as count FROM properties GROUP BY city ORDER BY count DESC LIMIT 10"),
      fetchAll("SELECT tier, COUNT(*) as count FROM agent_subscriptions WHERE status = 'active' GROUP BY tier ORDER BY count DESC"),
      fetchAll("SELECT status, COUNT(*) as count FROM property_bookings GROUP BY status"),
      fetchAll("SELECT status, COUNT(*) as count FROM inquiries GROUP BY status"),
    ]);

    return success(
      {
        properties_by_type: format(propertiesByType),
        properties_by_purpose: format(propertiesByPurpose),
        properties_by_city: format(propertiesByCity),
        subscriptions_by_tier: format(subscriptionsByTier),
        bookings_by_status: format(bookingsByStatus),
        inquiries_by_status: format(inquiriesByStatus),
      },
      "Breakdown retrieved"
    );
  } catch {
    return success(
      {
        properties_by_type: [],
        properties_by_purpose: [],
        properties_by_city: [],
        subscriptions_by_tier: [],
        bookings_by_status: [],
        inquiries_by_status: [],
      },
      "Breakdown retrieved"
    );
  }
}
