/**
 * GET /api/admin/users/{id} — get a single user (admin only).
 * PUT /api/admin/users/{id} — update a user's name, email, or active status (admin only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchOne, execute } from "@/server/db";
import { readJson } from "@/server/http";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const idNum = Number(id);
  if (idNum <= 0) return error("Invalid user ID", 400);

  const row = await fetchOne(
    "SELECT id, name, email, role, is_active, email_verified_at, created_at, updated_at FROM users WHERE id = ?",
    [idNum]
  );
  if (!row) return error("User not found", 404);

  row.id = Number(row.id);
  row.is_active = Boolean(row.is_active);

  return success({ user: row });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const idNum = Number(id);
  if (idNum <= 0) return error("Invalid user ID", 400);

  const input = await readJson(req);
  if (!input || Object.keys(input).length === 0) return error("No data provided", 400);

  const fields: string[] = [];
  const binds: unknown[] = [];

  for (const f of ["name", "email"]) {
    if (f in input) {
      fields.push(`${f} = ?`);
      binds.push(input[f]);
    }
  }
  if ("is_active" in input) {
    fields.push("is_active = ?");
    binds.push(input.is_active ? 1 : 0);
  }

  if (fields.length === 0) return error("No fields to update", 400);

  binds.push(idNum);
  const sql = `UPDATE users SET ${fields.join(", ")} WHERE id = ?`;
  await execute(sql, binds);

  return success({ id: idNum }, "User updated");
}
