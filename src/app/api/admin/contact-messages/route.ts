/**
 * GET /api/admin/contact-messages — list contact messages with pagination, status filter, and search (admin only).
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
  const perPage = Math.min(50, Math.max(1, Number(sp.get("per_page") ?? 20)));
  const unread = sp.get("unread") ?? null;
  const search = sp.get("q") ?? null;

  const conditions: string[] = ["1=1"];
  const binds: unknown[] = [];

  if (unread === "1") {
    conditions.push("cm.is_read = 0");
  }
  if (search) {
    conditions.push("(cm.name LIKE ? OR cm.email LIKE ? OR cm.phone LIKE ?)");
    const like = `%${search}%`;
    binds.push(like, like, like);
  }

  const where = conditions.join(" AND ");

  const countRow = await fetchOne(`SELECT COUNT(*) FROM contact_messages cm WHERE ${where}`, binds);
  const total = Number(countRow?.[Object.keys(countRow)[0]] ?? 0);

  const offset = (page - 1) * perPage;
  const rows = await fetchAll(
    `SELECT cm.*
     FROM contact_messages cm
     WHERE ${where}
     ORDER BY cm.created_at DESC LIMIT ${perPage} OFFSET ${offset}`,
    binds
  );

  const data = rows.map((r: any) => ({
    ...r,
    id: Number(r.id),
    is_read: Boolean(r.is_read),
  }));

  return success(
    {
      data,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    },
    "Contact messages retrieved"
  );
}
