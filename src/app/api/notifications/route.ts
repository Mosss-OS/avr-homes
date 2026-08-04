/**
 * GET /api/notifications — authenticated user's notifications.
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

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const perPage = Math.min(50, Math.max(1, Number(sp.get("per_page") ?? 20)));
  const offset = (page - 1) * perPage;

  let total = 0;
  let items: any[] = [];

  try {
    const totalRows = await query(
      `SELECT COUNT(*) AS c FROM notification_recipients nr
       JOIN notifications n ON n.id = nr.notification_id
       WHERE nr.user_id = ? AND n.sent_at IS NOT NULL`,
      [user.id]
    );
    total = Number(totalRows?.[0]?.c ?? 0);

    const rows = await query(
      `SELECT nr.id AS recipient_id, nr.is_read, nr.read_at, nr.link,
              n.id AS notification_id, n.title, n.body, n.type, n.created_at, n.sent_at
       FROM notification_recipients nr
       JOIN notifications n ON n.id = nr.notification_id
       WHERE nr.user_id = ? AND n.sent_at IS NOT NULL
       ORDER BY n.sent_at DESC
       LIMIT ? OFFSET ?`,
      [user.id, perPage, offset]
    );

    items = (rows as any[]).map((item) => ({
      ...item,
      recipient_id: Number(item.recipient_id),
      notification_id: Number(item.notification_id),
      is_read: Boolean(item.is_read),
    }));
  } catch (e) {
    items = [];
    total = 0;
  }

  return success({
    data: items,
    total,
    page,
    total_pages: Math.ceil(total / perPage),
  });
}
