/**
 * GET /api/saved-searches — authenticated user's saved searches.
 * POST /api/saved-searches — save a new search.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { authenticate, isUser } from "@/server/auth";
import { fetchAll, execute } from "@/server/db";
import { readJson } from "@/server/http";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const rows = await fetchAll("SELECT * FROM saved_searches WHERE user_id = ? ORDER BY created_at DESC", [user.id]);

  const data = rows.map((r: Record<string, any>) => ({
    ...r,
    id: Number(r.id),
    user_id: Number(r.user_id),
    alert_enabled: Boolean(r.alert_enabled),
    filters: r.filters ? parseJson(r.filters) : null,
  }));

  return success(data, "Saved searches retrieved");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const input = await readJson(req);

  const result = await execute(
    "INSERT INTO saved_searches (user_id, name, filters, alert_enabled) VALUES (?, ?, ?, ?)",
    [
      user.id,
      input.name ?? "Untitled Search",
      JSON.stringify(input.filters ?? []),
      input.alert_enabled !== undefined ? (input.alert_enabled ? 1 : 0) : 1,
    ]
  );

  return success({ id: Number(result.insertId) }, "Search saved", 201);
}

function parseJson(value: unknown): any {
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value as string);
  } catch {
    return null;
  }
}
