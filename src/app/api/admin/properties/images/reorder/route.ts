/**
 * PUT /api/admin/properties/images/reorder — swap sort order of two images (admin only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchOne, execute } from "@/server/db";
import { readJson } from "@/server/http";

export const runtime = "nodejs";

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const input = await readJson(req);
  const imageId = Number(input.image_id ?? 0);
  const swapId = Number(input.swap_id ?? 0);
  if (!imageId || !swapId) return error("image_id and swap_id required", 400);

  const order1 = await fetchOne("SELECT sort_order FROM property_images WHERE id = ?", [imageId]);
  const order2 = await fetchOne("SELECT sort_order FROM property_images WHERE id = ?", [swapId]);

  await execute("UPDATE property_images SET sort_order = ? WHERE id = ?", [order2?.sort_order, imageId]);
  await execute("UPDATE property_images SET sort_order = ? WHERE id = ?", [order1?.sort_order, swapId]);

  return success([], "Images reordered");
}
