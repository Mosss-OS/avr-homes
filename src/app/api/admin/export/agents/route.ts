/**
 * GET /api/admin/export/agents — export agents as CSV.
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

  const rows = await fetchAll(
    "SELECT a.*, u.email as user_email FROM agents a LEFT JOIN users u ON a.user_id = u.id ORDER BY a.id ASC"
  );

  const headers = [
    "ID", "Name", "Agency", "Phone", "Email", "WhatsApp", "City", "State",
    "Experience", "Verified", "Active", "Listings", "User Email", "Created At",
  ];
  const data = rows.map((r: Record<string, any>) => [
    r.id, r.name, r.agency, r.phone, r.email,
    r.whatsapp ?? "", r.city ?? "", r.state ?? "",
    r.experience ?? "", r.is_verified ? "Yes" : "No",
    r.is_active ? "Yes" : "No", r.listings ?? "0",
    r.user_email ?? "", r.created_at,
  ]);

  return outputCsv("agents-export.csv", headers, data);
}
