/**
 * GET /api/notifications/unread-count — authenticated user's unread notification count.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { authenticate, isUser } from "@/server/auth";
import { query } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  let count = 0;
  try {
    const rows = await query(
      `SELECT COUNT(*) AS c FROM notification_recipients nr
       JOIN notifications n ON n.id = nr.notification_id
       WHERE nr.user_id = ? AND n.sent_at IS NOT NULL AND nr.is_read = 0`,
      [user.id]
    );
    count = Number(rows?.[0]?.c ?? 0);
  } catch (e) {
    count = 0;
  }

  return success({ count });
}
