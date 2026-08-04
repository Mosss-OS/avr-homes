/**
 * GET /api/admin/inquiries — list property inquiries with pagination, status filter, and search (admin only).
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
  const status = sp.get("status") ?? null;
  const search = sp.get("q") ?? null;

  const conditions: string[] = ["1=1"];
  const binds: unknown[] = [];

  if (status === "unread") {
    conditions.push("i.is_read = 0");
  } else if (status) {
    conditions.push("i.status = ?");
    binds.push(status);
  }
  if (search) {
    conditions.push("(i.name LIKE ? OR i.email LIKE ? OR i.phone LIKE ?)");
    const like = `%${search}%`;
    binds.push(like, like, like);
  }

  const where = conditions.join(" AND ");

  const countRow = await fetchOne(`SELECT COUNT(*) FROM inquiries i WHERE ${where}`, binds);
  const total = Number(countRow?.[Object.keys(countRow)[0]] ?? 0);

  const offset = (page - 1) * perPage;
  const rows = await fetchAll(
    `SELECT i.*, p.title as property_title, p.slug as property_slug,
            a.name as assigned_agent_name, a.id as assigned_agent_id
     FROM inquiries i
     LEFT JOIN properties p ON i.property_id = p.id
     LEFT JOIN agents a ON i.assigned_to = a.id
     WHERE ${where}
     ORDER BY i.created_at DESC LIMIT ${perPage} OFFSET ${offset}`,
    binds
  );

  const data = rows.map((r: any) => ({
    ...r,
    id: Number(r.id),
    property_id: r.property_id ? Number(r.property_id) : null,
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
    "Inquiries retrieved"
  );
}
