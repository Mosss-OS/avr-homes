/**
 * GET /api/admin/export/properties — export properties as CSV.
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
    `SELECT p.*, a.name as agent_name, a.agency as agent_agency
     FROM properties p LEFT JOIN agents a ON p.agent_id = a.id
     ORDER BY p.id ASC`
  );

  const headers = [
    "ID", "Title", "Slug", "Description", "Type", "Purpose", "Price", "Nightly Price",
    "Min Stay", "Max Stay", "Beds", "Baths", "Area", "City", "Community", "Address", "Lat", "Lng",
    "Status", "Featured", "Verified", "Agent Name", "Agent Agency", "Created At",
  ];

  const data = rows.map((r: Record<string, any>) => [
    r.id, r.title, r.slug, String(r.description ?? "").replace(/<[^>]*>/g, ""),
    r.type, r.purpose, r.price, r.nightly_price ?? "",
    r.min_stay ?? "", r.max_stay ?? "",
    r.beds, r.baths, r.area,
    r.city, r.community, r.address,
    r.lat ?? "", r.lng ?? "",
    r.is_active == 1 ? "Active" : r.is_active == 0 ? "Draft" : "Archived",
    r.featured ? "Yes" : "No",
    r.is_verified ? "Yes" : "No",
    r.agent_name ?? "", r.agent_agency ?? "",
    r.created_at,
  ]);

  return outputCsv("properties-export.csv", headers, data);
}
