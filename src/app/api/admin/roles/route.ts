/**
 * GET /api/admin/roles — list admin roles.
 * POST /api/admin/roles — create a role.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchAll, execute } from "@/server/db";
import { readJson } from "@/server/http";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const roles = await fetchAll(
    `SELECT r.*,
      (SELECT COUNT(*) FROM admin_role_permissions WHERE role_id = r.id) as permission_count,
      (SELECT COUNT(*) FROM users WHERE admin_role_id = r.id) as user_count
     FROM admin_roles r ORDER BY r.is_system DESC, r.id ASC`
  );

  const data = roles.map((r: Record<string, any>) => ({
    ...r,
    id: Number(r.id),
    is_system: Boolean(r.is_system),
    permission_count: Number(r.permission_count),
    user_count: Number(r.user_count),
  }));

  return success(data, "Roles retrieved");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const input = await readJson(req);
  if (!input.name || !input.slug) {
    return error("Name and slug are required", 400);
  }

  const slug = String(input.slug).toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-");

  const result = await execute("INSERT INTO admin_roles (name, slug, description) VALUES (?, ?, ?)", [
    input.name,
    slug,
    input.description ?? "",
  ]);

  return success({ id: Number(result.insertId) }, "Role created", 201);
}
