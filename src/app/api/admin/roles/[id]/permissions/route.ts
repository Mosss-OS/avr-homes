/**
 * PUT /api/admin/roles/{id}/permissions — update a role's permissions.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { beginTransaction, txExecute, commit, rollback } from "@/server/db";
import { readJson } from "@/server/http";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const roleId = Number(id);
  if (!roleId || roleId <= 0) {
    return error("Role ID required", 400);
  }

  const input = (await readJson(req)) as Record<string, any>;
  let permissionIds: number[] = input.permission_ids;

  if (!Array.isArray(permissionIds)) {
    return error("permission_ids must be an array", 400);
  }
  permissionIds = Array.from(new Set(permissionIds.map(Number).filter((n) => Number.isFinite(n))));

  const conn = await beginTransaction();
  try {
    await txExecute(conn, "DELETE FROM admin_role_permissions WHERE role_id = ?", [roleId]);
    if (permissionIds.length > 0) {
      for (const permId of permissionIds) {
        await txExecute(conn, "INSERT INTO admin_role_permissions (role_id, permission_id) VALUES (?, ?)", [roleId, permId]);
      }
    }
    await commit(conn);
    return success({ assigned: permissionIds.length }, "Role permissions updated");
  } catch (e: any) {
    await rollback(conn);
    return error("Failed to update permissions: " + (e?.message ?? "Unknown error"), 500);
  }
}
