/**
 * GET /api/admin/activity — list activity logs with pagination (admin only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchOne, fetchAll } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const perPage = Math.min(50, Math.max(1, Number(sp.get("per_page") ?? 30)));
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

  const countRow = await fetchOne(`SELECT COUNT(*) FROM activity_logs l WHERE ${where}`, binds);
  const total = Number(countRow?.[Object.keys(countRow)[0]] ?? 0);

  const offset = (page - 1) * perPage;
  const rows = await fetchAll(
    `SELECT l.*, u.name as user_name, u.email as user_email
     FROM activity_logs l
     LEFT JOIN users u ON l.user_id = u.id
     WHERE ${where}
     ORDER BY l.created_at DESC LIMIT ${perPage} OFFSET ${offset}`,
    binds
  );

  const data = rows.map((r: any) => ({
    ...r,
    user_id: r.user_id ? Number(r.user_id) : null,
    id: Number(r.id),
    entity_id: r.entity_id ? Number(r.entity_id) : null,
  }));

  return success(
    {
      data,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    },
    "Activity log retrieved"
  );
}
