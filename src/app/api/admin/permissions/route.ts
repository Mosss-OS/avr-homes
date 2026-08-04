/**
 * GET /api/admin/permissions — list all permissions grouped.
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

  const rows = await fetchAll("SELECT * FROM admin_permissions ORDER BY permission_group, id ASC");

  const grouped: Record<string, any[]> = {};
  const all = rows.map((r: Record<string, any>) => {
    const out: Record<string, any> = { ...r, id: Number(r.id) };
    const g = out.permission_group;
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(out);
    return out;
  });

  return success({ all, grouped }, "Permissions retrieved");
}
