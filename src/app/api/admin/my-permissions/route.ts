/**
 * GET /api/admin/my-permissions — current admin's permission slugs.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchAll } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  if (user.role === "superadmin") {
    const rows = await fetchAll("SELECT slug FROM admin_permissions");
    const permissions = rows.map((r: any) => r.slug);
    return success({ permissions }, "All permissions (superadmin)");
  }

  const rows = await fetchAll(
    `SELECT p.slug FROM admin_permissions p
     INNER JOIN admin_role_permissions rp ON p.id = rp.permission_id
     INNER JOIN admin_roles r ON r.id = rp.role_id
     WHERE r.slug = ?`,
    [user.role]
  );

  const permissions = rows.map((r: any) => r.slug);
  return success({ permissions }, "My permissions");
}
