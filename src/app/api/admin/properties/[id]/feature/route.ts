/**
 * PUT /api/admin/properties/{id}/feature — toggle the featured flag (admin only).
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

  const current = await fetchOne("SELECT featured FROM properties WHERE id = ?", [idNum]);
  if (!current) return error("Property not found", 404);

  const newValue = Number(current.featured) ? 0 : 1;
  await execute("UPDATE properties SET featured = ?, updated_at = NOW() WHERE id = ?", [newValue, idNum]);

  return success({ id: idNum, featured: Boolean(newValue) }, "Property featured status toggled");
}
