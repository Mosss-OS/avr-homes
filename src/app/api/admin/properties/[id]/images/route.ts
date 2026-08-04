/**
 * GET /api/admin/properties/{id}/images — list gallery images for a property (admin only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchAll } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const idNum = Number(id);
  if (idNum <= 0) return error("Property ID required", 400);

  const images = await fetchAll(
    `SELECT pi.*, p.image as hero_image
     FROM property_images pi
     LEFT JOIN properties p ON p.id = pi.property_id
     WHERE pi.property_id = ? AND pi.file_path NOT LIKE '/uploads/%'
     ORDER BY pi.sort_order ASC, pi.id ASC`,
    [idNum]
  );

  const data = images.map((img: any) => ({
    ...img,
    id: Number(img.id),
    property_id: Number(img.property_id),
    is_primary: Boolean(img.is_primary),
    sort_order: Number(img.sort_order),
    file_size: Number(img.file_size),
  }));

  return success(data, "Images retrieved");
}
