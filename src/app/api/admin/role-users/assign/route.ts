/**
 * PUT /api/admin/role-users/assign — assign a role to a user.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchOne, execute } from "@/server/db";
import { readJson } from "@/server/http";

export const runtime = "nodejs";

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const input = await readJson(req);
  const userId = Number(input.user_id ?? 0);
  const roleId = input.role_id !== null && input.role_id !== "" ? Number(input.role_id) : null;

  if (!userId || userId <= 0) {
    return error("User ID required", 400);
  }

  if (roleId) {
    const role = await fetchOne("SELECT id FROM admin_roles WHERE id = ?", [roleId]);
    if (!role) {
      return error("Role not found", 404);
    }
  }

  await execute("UPDATE users SET admin_role_id = ? WHERE id = ?", [roleId, userId]);
  return success([], "Role assigned");
}
