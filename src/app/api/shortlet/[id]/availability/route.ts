/**
 * GET /api/shortlet/[id]/availability — check availability for a short-let property.
 * POST /api/shortlet/[id]/book — create a booking request.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { query, execute } from "@/server/db";
import { readJson } from "@/server/http";
import { Validator } from "@/server/validator";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const propertyId = Number(id);
  if (!propertyId || propertyId <= 0) {
    return error("Invalid property ID", 400);
  }

  const sp = req.nextUrl.searchParams;
  const checkIn = sp.get("check_in");
  const checkOut = sp.get("check_out");

  // Verify it's a shortlet property
  const prop = await query("SELECT purpose, nightly_price, min_stay, max_stay FROM properties WHERE id = ? AND is_active = 1", [propertyId]);

  if (!prop || prop.length === 0) {
    return error("Property not found", 404);
  }
  if (prop[0].purpose !== "shortlet") {
    return error("Not a short-let property", 400);
  }

  const property = prop[0];
  let unavailable: string[] = [];
  let totalPrice = 0;
  let nights = 0;

  if (checkIn && checkOut) {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (nights < Number(property.min_stay)) {
      return error(`Minimum stay is ${property.min_stay} nights`, 422);
    }
    if (property.max_stay && nights > Number(property.max_stay)) {
      return error(`Maximum stay is ${property.max_stay} nights`, 422);
    }

    // Check bookings that overlap
    const bookings = await query(
      "SELECT check_in, check_out FROM property_bookings WHERE property_id = ? AND status IN ('pending','confirmed') AND check_in < ? AND check_out > ?",
      [propertyId, checkOut, checkIn]
    );

    for (const b of bookings as any[]) {
      const bStart = new Date(b.check_in);
      const bEnd = new Date(b.check_out);
      const interval = 24 * 60 * 60 * 1000; // 1 day
      for (let d = new Date(bStart); d < bEnd; d = new Date(d.getTime() + interval)) {
        const ds = d.toISOString().split("T")[0];
        if (ds >= checkIn && ds < checkOut) {
          unavailable.push(ds);
        }
      }
    }

    // Check availability table
    const availRecords = await query(
      "SELECT date, is_available, price_override FROM property_availability WHERE property_id = ? AND date >= ? AND date < ?",
      [propertyId, checkIn, checkOut]
    );

    for (const a of availRecords as any[]) {
      if (!a.is_available) {
        unavailable.push(a.date);
      }
      const nightPrice = a.price_override ?? Number(property.nightly_price);
      if (!unavailable.includes(a.date)) {
        totalPrice += nightPrice;
      }
    }

    // If no availability records exist, use nightly_price for all nights
    if (totalPrice === 0 && unavailable.length === 0) {
      totalPrice = Number(property.nightly_price) * nights;
    }
  }

  return success(
    {
      property_id: propertyId,
      nightly_price: Number(property.nightly_price),
      min_stay: Number(property.min_stay),
      max_stay: property.max_stay ? Number(property.max_stay) : null,
      check_in: checkIn,
      check_out: checkOut,
      nights,
      total_price: totalPrice,
      unavailable_dates: unavailable,
      is_available: unavailable.length === 0 && nights > 0,
    },
    "Availability checked"
  );
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const propertyId = Number(id);
  if (!propertyId || propertyId <= 0) {
    return error("Invalid property ID", 400);
  }

  const input = await readJson(req);

  const validator = new Validator(input);
  validator
    .required("guest_name", "Guest name")
    .required("guest_email", "Guest email")
    .required("guest_phone", "Guest phone")
    .required("check_in", "Check-in date")
    .required("check_out", "Check-out date")
    .required("guests", "Number of guests");

  if (validator.fails()) {
    return error("Validation failed", 422, validator.getErrors());
  }

  const data = validator.validated();
  const db = await query("SELECT nightly_price, min_stay, agent_id, title FROM properties WHERE id = ? AND purpose = 'shortlet' AND is_active = 1", [propertyId]);

  if (!db || db.length === 0) {
    return error("Property not found or not a short-let", 404);
  }

  const prop = db[0];
  const checkIn = new Date(data.check_in as string);
  const checkOut = new Date(data.check_out as string);
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

  if (nights < Number(prop.min_stay)) {
    return error(`Minimum stay is ${prop.min_stay} nights`, 422);
  }

  const totalPrice = nights * Number(prop.nightly_price);

  // Check availability
  const bookStmt = await query(
    "SELECT COUNT(*) FROM property_bookings WHERE property_id = ? AND status IN ('pending','confirmed') AND check_in < ? AND check_out > ?",
    [propertyId, data.check_out, data.check_in]
  );

  if (Number(bookStmt[0]?.c ?? 0) > 0) {
    return error("Property is not available for the selected dates", 409);
  }

  const result = await execute(
    "INSERT INTO property_bookings (property_id, guest_name, guest_email, guest_phone, check_in, check_out, guests, total_price, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')",
    [propertyId, data.guest_name, data.guest_email, data.guest_phone, data.check_in, data.check_out, Number(data.guests ?? 1), totalPrice]
  );

  // TODO: Send notifications (agent + admins) - NotificationController::create

  return success(
    {
      booking_id: result.insertId,
      total_price: totalPrice,
      nights,
      status: "pending",
    },
    "Booking request submitted",
    201
  );
}