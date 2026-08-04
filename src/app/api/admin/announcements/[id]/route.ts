/**
 * GET /api/admin/announcements/{id} — show an announcement with delivery stats.
 * DELETE /api/admin/announcements/{id} — delete an announcement.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchOne, fetchAll, execute } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const notificationId = Number(id);
  if (!notificationId || notificationId <= 0) {
    return error("Notification ID is required", 400);
  }

  let notification: Record<string, any> | null = null;
  try {
    const row = await fetchOne(
      `SELECT n.*, u.name AS created_by_name
       FROM notifications n
       JOIN users u ON u.id = n.created_by
       WHERE n.id = ?`,
      [notificationId]
    );
    notification = row;
  } catch (e: any) {
    notification = null;
  }

  if (!notification) {
    return error("Notification not found", 404);
  }

  notification = { ...notification, id: Number(notification.id), created_by: Number(notification.created_by) };

  let stats: Record<string, any>;
  try {
    const row = await fetchOne(
      `SELECT
        (SELECT COUNT(*) FROM notification_recipients WHERE notification_id = ?) AS total_sent,
        (SELECT COUNT(*) FROM notification_recipients WHERE notification_id = ? AND is_read = 1) AS total_read`,
      [notificationId, notificationId]
    );
    stats = row ?? { total_sent: 0, total_read: 0 };
  } catch (e: any) {
    stats = { total_sent: 0, total_read: 0 };
  }

  return success({ notification, stats }, undefined);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const notificationId = Number(id);
  if (!notificationId || notificationId <= 0) {
    return error("Notification ID is required", 400);
  }

  await execute("DELETE FROM notifications WHERE id = ?", [notificationId]);
  return success(null, "Announcement deleted");
}
