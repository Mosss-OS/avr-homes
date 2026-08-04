/**
 * PUT /api/admin/bookings/{id}/status — update a booking's status (confirmed/cancelled/completed) (admin only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { execute } from "@/server/db";
import { readJson } from "@/server/http";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const idNum = Number(id);
  if (idNum <= 0) return error("Invalid booking ID", 400);

  const input = await readJson(req);
  const status = input.status ?? null;

  if (!["confirmed", "cancelled", "completed"].includes(status)) {
    return error("Invalid status. Use: confirmed, cancelled, completed", 422);
  }

  await execute("UPDATE property_bookings SET status = ? WHERE id = ?", [status, idNum]);

  return success({ id: idNum, status }, "Booking status updated");
}
