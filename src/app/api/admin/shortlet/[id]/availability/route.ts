/**
 * GET /api/admin/shortlet/[id]/availability — admin availability calendar.
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
  const month = sp.get("month") ?? new Date().toISOString().slice(0, 7);
  const start = `${month}-01`;
  const end = new Date(new Date(start).getFullYear(), new Date(start).getMonth() + 1, 0).toISOString().split("T")[0];

  const property = (await query("SELECT id, title, nightly_price, purpose FROM properties WHERE id = ?", [propertyId])) as any[];
  if (!property || property.length === 0) {
    return error("Property not found", 404);
  }

  const bookings = (await query(
    "SELECT check_in, check_out, id as booking_id, guest_name, status FROM property_bookings WHERE property_id = ? AND status IN ('pending','confirmed','completed') AND check_in < ? AND check_out > ?",
    [propertyId, end, start]
  )) as any[];

  const availRecords = (await query(
    "SELECT date, is_available, price_override FROM property_availability WHERE property_id = ? AND date >= ? AND date <= ?",
    [propertyId, start, end]
  )) as any[];

  const availMap: Record<string, { is_available: boolean; price_override: number | null }> = {};
  for (const a of availRecords) {
    availMap[a.date] = { is_available: Boolean(a.is_available), price_override: a.price_override ? Number(a.price_override) : null };
  }

  const days: any[] = [];
  const current = new Date(start);
  const lastDay = new Date(end);
  while (current <= lastDay) {
    const ds = current.toISOString().split("T")[0];
    const day: any = {
      date: ds,
      is_available: true,
      price_override: null,
      booking: null,
    };

    if (availMap[ds]) {
      day.is_available = availMap[ds].is_available;
      day.price_override = availMap[ds].price_override;
    }

    for (const b of bookings) {
      if (ds >= b.check_in && ds < b.check_out) {
        day.booking = {
          id: Number(b.booking_id),
          guest_name: b.guest_name,
          status: b.status,
        };
        day.is_available = false;
        break;
      }
    }

    days.push(day);
    current.setDate(current.getDate() + 1);
  }

  return success(
    {
      property: property[0],
      month,
      days,
    },
    "Availability retrieved"
  );
}
