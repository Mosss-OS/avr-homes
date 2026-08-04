/**
 * GET /api/admin/role-users — list admin users with their assigned roles.
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

  const rows = await fetchAll(
    `SELECT u.id, u.name, u.email, u.role, u.admin_role_id,
            r.name as role_name, r.slug as role_slug
     FROM users u
     LEFT JOIN admin_roles r ON u.admin_role_id = r.id
     WHERE u.role IN ('admin', 'superadmin')
     ORDER BY u.name ASC`
  );

  const data = rows.map((r: Record<string, any>) => ({
    ...r,
    id: Number(r.id),
    admin_role_id: r.admin_role_id ? Number(r.admin_role_id) : null,
  }));

  return success(data, "Admin users retrieved");
}
