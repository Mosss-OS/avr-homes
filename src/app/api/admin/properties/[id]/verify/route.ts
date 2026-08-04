/**
 * PUT /api/admin/properties/{id}/verify — toggle the verified flag (admin only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchOne, execute } from "@/server/db";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const idNum = Number(id);
  if (idNum <= 0) return error("Invalid property ID", 400);

  const current = await fetchOne("SELECT is_verified FROM properties WHERE id = ?", [idNum]);
  if (!current) return error("Property not found", 404);

  const newValue = Number(current.is_verified) ? 0 : 1;
  await execute("UPDATE properties SET is_verified = ?, verified_at = NOW(), updated_at = NOW() WHERE id = ?", [newValue, idNum]);

  return success({ id: idNum, is_verified: Boolean(newValue) }, "Property verification toggled");
}
