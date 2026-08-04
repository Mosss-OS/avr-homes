/**
 * GET /api/admin/export/users — export users as CSV.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchAll } from "@/server/db";
import { outputCsv } from "@/server/csv";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const rows = await fetchAll("SELECT * FROM users ORDER BY id ASC");

  const headers = ["ID", "Name", "Email", "Role", "Active", "Email Verified", "Created At"];
  const data = rows.map((r: Record<string, any>) => [
    r.id, r.name, r.email, r.role,
    r.is_active ? "Yes" : "No",
    r.email_verified_at ?? "",
    r.created_at,
  ]);

  return outputCsv("users-export.csv", headers, data);
}
