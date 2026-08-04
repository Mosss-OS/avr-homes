/**
 * GET /api/admin/export/bookings — export bookings as CSV.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchAll } from "@/server/db";
import { outputCsv } from "@/server/csv";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const rows = await fetchAll(
    `SELECT b.*, p.title as property_title
     FROM property_bookings b LEFT JOIN properties p ON b.property_id = p.id
     ORDER BY b.id ASC`
  );

  const headers = [
    "ID", "Property ID", "Property Title", "Guest Name", "Guest Email", "Guest Phone",
    "Check In", "Check Out", "Guests", "Total Price", "Status", "Notes", "Created At",
  ];
  const data = rows.map((r: Record<string, any>) => [
    r.id, r.property_id, r.property_title ?? "",
    r.guest_name, r.guest_email, r.guest_phone,
    r.check_in, r.check_out,
    r.guests, r.total_price, r.status,
    r.notes ?? "", r.created_at,
  ]);

  return outputCsv("bookings-export.csv", headers, data);
}
