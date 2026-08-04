/**
 * DELETE /api/upload/{id} — delete a property image (authenticated).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticate, isUser } from "@/server/auth";
import { fetchOne, execute } from "@/server/db";
import { deleteByUrl } from "@/server/cloudinary";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const imageId = Number(id);
  if (!imageId || imageId <= 0) {
    return error("Invalid image ID", 400);
  }

  const image = await fetchOne("SELECT id, file_path, property_id, is_primary FROM property_images WHERE id = ?", [imageId]);
  if (!image) {
    return error("Image not found", 404);
  }

  if (image.file_path) {
    await deleteByUrl(image.file_path);
  }

  await execute("DELETE FROM property_images WHERE id = ?", [imageId]);

  if (image.is_primary && image.property_id) {
    await execute("UPDATE properties SET image = NULL WHERE id = ?", [Number(image.property_id)]);
  }

  return success(null, "Image deleted successfully");
}
