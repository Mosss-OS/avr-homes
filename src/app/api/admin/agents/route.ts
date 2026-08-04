/**
 * GET /api/admin/agents — list agents with pagination and search (admin only).
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
  const search = sp.get("q") ?? null;

  const conditions: string[] = ["1=1"];
  const binds: unknown[] = [];

  if (search) {
    conditions.push("(a.name LIKE ? OR a.email LIKE ? OR a.agency LIKE ?)");
    const like = `%${search}%`;
    binds.push(like, like, like);
  }

  const where = conditions.join(" AND ");

  const countRow = await fetchOne(`SELECT COUNT(*) FROM agents a WHERE ${where}`, binds);
  const total = Number(countRow?.[Object.keys(countRow)[0]] ?? 0);

  const offset = (page - 1) * perPage;
  const rows = await fetchAll(
    `SELECT a.*, u.email as user_email, u.is_active as user_is_active, u.role
     FROM agents a
     LEFT JOIN users u ON a.user_id = u.id
     WHERE ${where}
     ORDER BY a.created_at DESC LIMIT ${perPage} OFFSET ${offset}`,
    binds
  );

  const data = rows.map((r: any) => ({
    ...r,
    id: Number(r.id),
    listings: Number(r.listings),
    is_verified: Boolean(r.is_verified),
    languages: safeJson(r.languages, []),
  }));

  return success(
    {
      data,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    },
    "Agents retrieved"
  );
}

function safeJson(value: unknown, fallback: unknown): unknown {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value as string);
  } catch {
    return fallback;
  }
}
