/**
 * PUT /api/admin/inquiries/{id}/read — mark an inquiry as read (admin only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { execute } from "@/server/db";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const idNum = Number(id);
  if (idNum <= 0) return error("Invalid inquiry ID", 400);

  await execute("UPDATE inquiries SET is_read = 1 WHERE id = ?", [idNum]);

  return success({ id: idNum }, "Inquiry marked as read");
}
