/**
 * PUT /api/saved-searches/{id} — update a saved search.
 * DELETE /api/saved-searches/{id} — delete a saved search.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticate, isUser } from "@/server/auth";
import { execute } from "@/server/db";
import { readJson } from "@/server/http";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const { id } = await params;
  const searchId = Number(id);

  const input = await readJson(req);

  const fields: string[] = [];
  const binds: unknown[] = [];

  if (input.name !== undefined) {
    fields.push("name = ?");
    binds.push(input.name);
  }
  if (input.alert_enabled !== undefined) {
    fields.push("alert_enabled = ?");
    binds.push(input.alert_enabled ? 1 : 0);
  }
  if (input.filters !== undefined) {
    fields.push("filters = ?");
    binds.push(JSON.stringify(input.filters));
  }

  if (fields.length === 0) {
    return error("No fields to update", 400);
  }

  binds.push(searchId, user.id);
  await execute(`UPDATE saved_searches SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`, binds);

  return success([], "Search updated");
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const { id } = await params;
  const searchId = Number(id);

  await execute("DELETE FROM saved_searches WHERE id = ? AND user_id = ?", [searchId, user.id]);
  return success([], "Search deleted");
}
