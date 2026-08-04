/**
 * PUT /api/notifications/{id}/read — mark a notification as read.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticate, isUser } from "@/server/auth";
import { execute } from "@/server/db";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const { id } = await params;
  const recipientId = Number(id);
  if (!recipientId || recipientId <= 0) {
    return error("Recipient ID is required", 400);
  }

  await execute("UPDATE notification_recipients SET is_read = 1, read_at = NOW() WHERE id = ? AND user_id = ?", [
    recipientId,
    user.id,
  ]);

  return success(null, "Marked as read");
}
