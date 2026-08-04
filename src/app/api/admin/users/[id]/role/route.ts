/**
 * PUT /api/admin/users/{id}/role — update a user's role (admin only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { execute } from "@/server/db";
import { readJson } from "@/server/http";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const idNum = Number(id);
  if (idNum <= 0) return error("Invalid user ID", 400);

  const input = await readJson(req);
  const role = input.role ?? null;

  if (!["user", "agent", "admin"].includes(role)) {
    return error("Invalid role. Use: user, agent, admin", 422);
  }

  await execute("UPDATE users SET role = ? WHERE id = ?", [role, idNum]);

  return success({ id: idNum, role }, "User role updated");
}
