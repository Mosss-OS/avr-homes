/**
 * GET /api/admin/saved-searches — admin list of saved searches.
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
  const q = (sp.get("q") ?? "").trim();
  const alertOnly = sp.get("alert_enabled") ?? "";

  let where = "";
  const binds: unknown[] = [];
  if (q) {
    where += " AND (u.name LIKE ? OR u.email LIKE ? OR s.name LIKE ?)";
    const like = `%${q}%`;
    binds.push(like, like, like);
  }
  if (alertOnly === "1") where += " AND s.alert_enabled = 1";

  const countRow = await fetchOne(
    `SELECT COUNT(*) AS c FROM saved_searches s LEFT JOIN users u ON u.id = s.user_id WHERE 1=1 ${where}`,
    binds
  );
  const total = Number(countRow?.c ?? 0);

  const offset = (page - 1) * perPage;
  const rows = await fetchAll(
    `SELECT s.*, u.name as user_name, u.email as user_email
     FROM saved_searches s
     LEFT JOIN users u ON u.id = s.user_id
     WHERE 1=1 ${where}
     ORDER BY s.created_at DESC LIMIT ${perPage} OFFSET ${offset}`,
    binds
  );

  const data = rows.map((r: Record<string, any>) => ({
    ...r,
    id: Number(r.id),
    user_id: Number(r.user_id),
    alert_enabled: Boolean(r.alert_enabled),
    filters: r.filters ? parseJson(r.filters) : null,
  }));

  return success(
    { data, total, total_pages: Math.ceil(total / perPage) },
    "Saved searches retrieved"
  );
}

function parseJson(value: unknown): any {
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value as string);
  } catch {
    return null;
  }
}
