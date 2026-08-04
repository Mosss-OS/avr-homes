/**
 * PUT /api/admin/shortlet/availability/batch — batch update availability.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { requirePermission } from "@/server/auth";
import { execute } from "@/server/db";
import { readJson } from "@/server/http";

export const runtime = "nodejs";

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const auth = await requirePermission(req, "admin_shortlet_write");
  if (auth instanceof NextResponse) return auth;

  const input = await readJson(req);

  const propertyId = Number(input.property_id ?? 0);
  const dates = input.dates ?? [];
  const isAvailable = Boolean(input.is_available ?? true);
  const priceOverride = input.price_override !== undefined ? Number(input.price_override) : null;

  if (!propertyId || !dates.length) {
    return error("Property ID and dates required", 400);
  }

  for (const date of dates) {
    await execute(
      "INSERT INTO property_availability (property_id, date, is_available, price_override) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE is_available = VALUES(is_available), price_override = VALUES(price_override)",
      [propertyId, date, isAvailable ? 1 : 0, priceOverride]
    );
  }

  return success({ updated: dates.length }, "Availability updated");
}
