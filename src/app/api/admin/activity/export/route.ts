/**
 * GET /api/admin/activity/export — export activity log as CSV (admin only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchAll } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const sp = req.nextUrl.searchParams;
  const actionFilter = sp.get("action") ?? "";
  const entityFilter = sp.get("entity_type") ?? "";
  const userId = Number(sp.get("user_id") ?? 0);

  const conditions: string[] = ["1=1"];
  const binds: unknown[] = [];

  if (actionFilter) {
    conditions.push("l.action LIKE ?");
    binds.push(`%${actionFilter}%`);
  }
  if (entityFilter) {
    conditions.push("l.entity_type = ?");
    binds.push(entityFilter);
  }
  if (userId) {
    conditions.push("l.user_id = ?");
    binds.push(userId);
  }

  const where = conditions.join(" AND ");
  const rows = await fetchAll(
    `SELECT l.id, l.action, l.entity_type, l.entity_id, l.details, l.ip_address, l.created_at, u.name as user_name, u.email as user_email
     FROM activity_logs l LEFT JOIN users u ON l.user_id = u.id WHERE ${where} ORDER BY l.created_at DESC LIMIT 10000`,
    binds
  );

  const header = ["ID", "Action", "Entity Type", "Entity ID", "Details", "User", "Email", "IP", "Date"];
  const lines = rows.map((r: any) =>
    [r.id, r.action, r.entity_type, r.entity_id, r.details, r.user_name, r.user_email, r.ip_address, r.created_at]
      .map((cell) => {
        const s = cell === null || cell === undefined ? "" : String(cell);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      })
      .join(",")
  );

  const today = new Date().toISOString().split("T")[0];
  const csv = "\uFEFF" + [header.join(","), ...lines].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="activity_export_${today}.csv"`,
    },
  });
}
