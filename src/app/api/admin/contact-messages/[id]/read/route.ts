/**
 * PUT /api/admin/contact-messages/{id}/read — mark a contact message as read (admin only).
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
  if (idNum <= 0) return error("Invalid contact message ID", 400);

  await execute("UPDATE contact_messages SET is_read = 1 WHERE id = ?", [idNum]);

  return success({ id: idNum }, "Contact message marked as read");
}
