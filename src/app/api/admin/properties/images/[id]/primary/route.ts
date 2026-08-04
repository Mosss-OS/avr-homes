/**
 * PUT /api/admin/properties/images/{id}/primary — set an image as primary (admin only).
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
  if (!idNum) return error("Image ID required", 400);

  const img = await fetchOne("SELECT property_id FROM property_images WHERE id = ?", [idNum]);
  if (!img) return error("Image not found", 404);

  await execute("UPDATE property_images SET is_primary = 0 WHERE property_id = ?", [img.property_id]);
  await execute("UPDATE property_images SET is_primary = 1 WHERE id = ?", [idNum]);

  return success([], "Primary image updated");
}
