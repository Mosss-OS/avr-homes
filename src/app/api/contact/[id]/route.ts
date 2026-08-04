/**
 * DELETE /api/contact/{id} — delete a contact message (authenticated).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticate, isUser } from "@/server/auth";
import { execute } from "@/server/db";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const messageId = Number(id);
  if (!messageId || messageId <= 0) {
    return error("Invalid message ID", 400);
  }

  const result = await execute("DELETE FROM contact_messages WHERE id = ?", [messageId]);
  if (result.affectedRows === 0) {
    return error("Message not found", 404);
  }

  return success(null, "Message deleted successfully");
}
