/**
 * DELETE /api/admin/saved-searches/{id} — admin delete a saved search.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { execute } from "@/server/db";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const searchId = Number(id);
  if (!searchId || searchId <= 0) {
    return error("Search ID required", 400);
  }

  await execute("DELETE FROM saved_searches WHERE id = ?", [searchId]);
  return success([], "Search deleted");
}
