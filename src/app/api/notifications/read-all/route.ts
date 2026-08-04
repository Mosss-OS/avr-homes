/**
 * PUT /api/notifications/read-all — mark all notifications as read.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { authenticate, isUser } from "@/server/auth";
import { execute } from "@/server/db";

export const runtime = "nodejs";

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  await execute(
    `UPDATE notification_recipients nr
     JOIN notifications n ON n.id = nr.notification_id
     SET nr.is_read = 1, nr.read_at = NOW()
     WHERE nr.user_id = ? AND n.sent_at IS NOT NULL AND nr.is_read = 0`,
    [user.id]
  );

  return success(null, "All notifications marked as read");
}
