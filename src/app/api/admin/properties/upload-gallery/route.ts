/**
 * POST /api/admin/properties/upload-gallery — upload gallery images for a property (admin only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchOne, execute } from "@/server/db";
import { upload } from "@/server/cloudinary";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const fd = await req.formData();
  const propertyId = Number(fd.get("property_id") ?? 0);
  if (!propertyId) return error("Property ID required", 400);

  const sortRow = await fetchOne("SELECT COALESCE(MAX(sort_order), 0) FROM property_images WHERE property_id = ?", [propertyId]);
  let sortOrder = Number(sortRow?.[Object.keys(sortRow)[0]] ?? 0);

  const files = fd.getAll("files");
  let uploaded = 0;

  for (const file of files) {
    if (!(file instanceof File)) continue;
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0) continue;

    const result = await upload(buffer, file.name, "image", { folder: "avr-homes/properties" });
    if (!result.success) continue;

    sortOrder++;
    let isPrimary = 0;
    const check = await fetchOne("SELECT COUNT(*) FROM property_images WHERE property_id = ? AND is_primary = 1", [propertyId]);
    if (Number(check?.[Object.keys(check)[0]] ?? 0) === 0) isPrimary = 1;

    await execute(
      "INSERT INTO property_images (property_id, file_path, file_name, file_size, mime_type, sort_order, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [propertyId, result.url, file.name, buffer.length, file.type || "image/jpeg", sortOrder, isPrimary]
    );
    uploaded++;
  }

  return success({ uploaded }, `${uploaded} image(s) uploaded`);
}
