/**
 * POST /api/shortlet/[id]/book — create a booking request.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { query, execute } from "@/server/db";
import { readJson } from "@/server/http";
import { Validator } from "@/server/validator";

export const runtime = "nodejs";

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
  const prop = await query("SELECT nightly_price, min_stay, agent_id, title FROM properties WHERE id = ? AND purpose = 'shortlet' AND is_active = 1", [propertyId]);

  if (!prop || prop.length === 0) {
    return error("Property not found or not a short-let", 404);
  }

  const property = prop[0];
  const checkIn = new Date(data.check_in as string);
  const checkOut = new Date(data.check_out as string);
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

  if (nights < Number(property.min_stay)) {
    return error(`Minimum stay is ${property.min_stay} nights`, 422);
  }

  const totalPrice = nights * Number(property.nightly_price);

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