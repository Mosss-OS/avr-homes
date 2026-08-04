/**
 * GET /api/admin/announcements — list announcements (notifications).
 * POST /api/admin/announcements — create and send an announcement.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import {
  fetchOne,
  fetchAll,
  execute,
  beginTransaction,
  txExecute,
  commit,
  rollback,
} from "@/server/db";
import { readJson } from "@/server/http";
import { Validator } from "@/server/validator";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const perPage = 20;
  const offset = (page - 1) * perPage;

  let items: Record<string, any>[] = [];
  let total = 0;

  try {
    const countRow = await fetchOne("SELECT COUNT(*) AS c FROM notifications");
    total = Number(countRow?.c ?? 0);

    const rows = await fetchAll(
      `SELECT n.*, u.name AS created_by_name,
          (SELECT COUNT(*) FROM notification_recipients nr WHERE nr.notification_id = n.id) AS recipient_count,
          (SELECT COUNT(*) FROM notification_recipients nr WHERE nr.notification_id = n.id AND nr.is_read = 1) AS read_count
       FROM notifications n
       JOIN users u ON u.id = n.created_by
       ORDER BY n.created_at DESC
       LIMIT ${perPage} OFFSET ${offset}`
    );
    items = rows;
  } catch (e: any) {
    items = [];
    total = 0;
  }

  const data = items.map((item: Record<string, any>) => ({
    ...item,
    id: Number(item.id),
    created_by: Number(item.created_by),
    recipient_count: Number(item.recipient_count ?? 0),
    read_count: Number(item.read_count ?? 0),
  }));

  return success(
    { data, total, page, total_pages: Math.ceil(total / perPage) },
    undefined
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const input = await readJson(req);

  const validator = new Validator(input);
  validator
    .required("title", "Title")
    .string("title", "Title", 255)
    .required("body", "Message body");

  if (validator.fails()) {
    return error("Validation failed", 422, validator.getErrors());
  }

  const data = validator.validated();
  const targetRole = input.target_role ?? null;
  const scheduledAt = input.scheduled_at ?? null;

  const conn = await beginTransaction();
  try {
    const result = await txExecute(
      conn,
      "INSERT INTO notifications (title, body, type, target_role, created_by, scheduled_at) VALUES (?, ?, ?, ?, ?, ?)",
      [
        data.title,
        data.body,
        input.type ?? "announcement",
        targetRole,
        user.id,
        scheduledAt,
      ]
    );
    const notificationId = Number(result.insertId);

    let recipients: Record<string, any>[];
    if (targetRole) {
      recipients = await txExecute(conn, "SELECT id FROM users WHERE role = ?", [targetRole]) as unknown as Record<string, any>[];
    } else {
      recipients = await txExecute(conn, "SELECT id FROM users") as unknown as Record<string, any>[];
    }

    const recipientIds: number[] = [];
    for (const recipient of recipients) {
      recipientIds.push(Number(recipient.id));
      await txExecute(
        conn,
        "INSERT INTO notification_recipients (notification_id, user_id) VALUES (?, ?)",
        [notificationId, Number(recipient.id)]
      );
    }

    if (!scheduledAt) {
      await txExecute(conn, "UPDATE notifications SET sent_at = NOW() WHERE id = ?", [notificationId]);
    }

    await commit(conn);

    return success(
      { id: notificationId, recipient_count: recipientIds.length },
      "Announcement sent",
      201
    );
  } catch (e: any) {
    await rollback(conn);
    return error("Failed to create announcement: " + (e?.message ?? "Unknown error"), 500);
  }
}
