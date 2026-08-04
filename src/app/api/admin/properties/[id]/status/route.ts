/**
 * PUT /api/admin/properties/{id}/status — update property status (draft/published/archived) (admin only).
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
  if (idNum <= 0) return error("Invalid property ID", 400);

  const input = await readJson(req);
  const status = input.status ?? null;

  if (!["draft", "published", "archived"].includes(status)) {
    return error("Invalid status. Use: draft, published, archived", 422);
  }

  const isActive = status === "published" ? 1 : status === "archived" ? 2 : 0;
  await execute("UPDATE properties SET is_active = ?, updated_at = NOW() WHERE id = ?", [isActive, idNum]);

  return success({ id: idNum, status }, "Property status updated");
}
