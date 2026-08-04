/**
 * GET /api/admin/roles/{id} — role detail with permissions.
 * PUT /api/admin/roles/{id} — update a role.
 * DELETE /api/admin/roles/{id} — delete a role.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchOne, fetchAll, execute } from "@/server/db";
import { readJson } from "@/server/http";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const roleId = Number(id);

  const role = await fetchOne("SELECT * FROM admin_roles WHERE id = ?", [roleId]);
  if (!role) {
    return error("Role not found", 404);
  }

  role.is_system = Boolean(role.is_system);

  const permissions = await fetchAll(
    `SELECT p.* FROM admin_permissions p
     INNER JOIN admin_role_permissions rp ON p.id = rp.permission_id
     WHERE rp.role_id = ? ORDER BY p.permission_group, p.id`,
    [roleId]
  );

  role.permissions = permissions.map((p: Record<string, any>) => ({ ...p, id: Number(p.id) }));
  role.id = Number(role.id);

  return success(role, "Role detail retrieved");
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const roleId = Number(id);
  if (!roleId || roleId <= 0) {
    return error("Role ID required", 400);
  }

  const input = await readJson(req);

  const fields: string[] = [];
  const binds: unknown[] = [];

  if (input.name !== undefined) {
    fields.push("name = ?");
    binds.push(input.name);
  }
  if (input.description !== undefined) {
    fields.push("description = ?");
    binds.push(input.description);
  }

  if (fields.length === 0) {
    return error("No fields to update", 400);
  }

  binds.push(roleId);
  await execute(`UPDATE admin_roles SET ${fields.join(", ")} WHERE id = ?`, binds);

  return success([], "Role updated");
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const roleId = Number(id);
  if (!roleId || roleId <= 0) {
    return error("Role ID required", 400);
  }

  const role = await fetchOne("SELECT is_system FROM admin_roles WHERE id = ?", [roleId]);
  if (!role) {
    return error("Role not found", 404);
  }
  if (role.is_system) {
    return error("Cannot delete system role", 403);
  }

  await execute("UPDATE users SET admin_role_id = NULL WHERE admin_role_id = ?", [roleId]);
  await execute("DELETE FROM admin_roles WHERE id = ?", [roleId]);

  return success([], "Role deleted");
}
