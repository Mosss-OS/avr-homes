/**
 * GET /api/admin/shortlet/[id]/bookings — admin property bookings.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { requirePermission } from "@/server/auth";
import { query } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await requirePermission(req, "admin_shortlet_read");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const propertyId = Number(id);
  if (!propertyId || propertyId <= 0) {
    return error("Invalid property ID", 400);
  }

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const perPage = Math.min(50, Math.max(1, Number(sp.get("per_page") ?? 20)));
  const offset = (page - 1) * perPage;

  const countResult = (await query("SELECT COUNT(*) FROM property_bookings WHERE property_id = ?", [propertyId])) as any[];
  const total = Number(countResult[0]?.c || 0);

  const bookings = (await query(
    `SELECT pb.*, p.title as property_title
     FROM property_bookings pb
     LEFT JOIN properties p ON p.id = pb.property_id
     WHERE pb.property_id = ?
     ORDER BY pb.check_in DESC
     LIMIT ${perPage} OFFSET ${offset}`,
    [propertyId]
  )) as any[];

  const formattedBookings = bookings.map((b) => ({
    id: Number(b.id),
    property_id: Number(b.property_id),
    guest_name: b.guest_name,
    guest_email: b.guest_email,
    guest_phone: b.guest_phone,
    check_in: b.check_in,
    check_out: b.check_out,
    guests: Number(b.guests),
    total_price: Number(b.total_price),
    status: b.status,
    property_title: b.property_title,
    created_at: b.created_at,
    updated_at: b.updated_at,
  }));

  return success(
    {
      data: formattedBookings,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    },
    "Property bookings retrieved"
  );
}
