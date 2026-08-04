/**
 * DELETE /api/admin/properties/images/{id} — delete an image (admin only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchOne, execute } from "@/server/db";
import { deleteByUrl } from "@/server/cloudinary";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const idNum = Number(id);
  if (!idNum) return error("Image ID required", 400);

  const img = await fetchOne("SELECT * FROM property_images WHERE id = ?", [idNum]);
  if (!img) return error("Image not found", 404);

  if (img.file_path) {
    await deleteByUrl(img.file_path);
  }

  await execute("DELETE FROM property_images WHERE id = ?", [idNum]);

  if (img.is_primary) {
    await execute("UPDATE properties SET image = NULL WHERE id = ?", [img.property_id]);
  }

  return success([], "Image deleted");
}
