/**
 * GET /api/admin/verifications — list all verification requests (admin).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { requirePermission } from "@/server/auth";
import { query } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requirePermission(req, "admin_verifications_read");
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const perPage = Math.min(50, Math.max(1, Number(sp.get("per_page") ?? 20)));
  const status = sp.get("status") ?? null;

  let whereConditions = [];
  let bindValues: any[] = [];

  if (status && ["pending", "approved", "rejected"].includes(status)) {
    whereConditions.push("pv.status = ?");
    bindValues.push(status);
  }

  const whereClause = whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

  const [countResult] = await query(`SELECT COUNT(*) FROM property_verifications pv ${whereClause}`, bindValues);
  const total = Number(countResult[0]?.c ?? 0);

  const offset = (page - 1) * perPage;

  const sql = `SELECT pv.*, p.title as property_title, p.slug as property_slug, p.price as property_price, p.city as property_city, a.name as agent_name, a.agency as agent_agency, u.name as admin_name FROM property_verifications pv JOIN properties p ON p.id = pv.property_id JOIN agents a ON a.id = pv.agent_id LEFT JOIN users u ON u.id = pv.admin_id ${whereClause} ORDER BY pv.created_at DESC LIMIT ${perPage} OFFSET ${offset}`;
  const verifications = await query(sql, bindValues);

  const formattedVerifications = [];
  for (const v of verifications as any[]) {
    const formatted: Record<string, any> = {
      id: Number(v.id),
      property_id: Number(v.property_id),
      agent_id: Number(v.agent_id),
      admin_id: v.admin_id ? Number(v.admin_id) : null,
      status: v.status,
      admin_notes: v.admin_notes,
      rejection_reason: v.rejection_reason,
      expires_at: v.expires_at,
      created_at: v.created_at,
      updated_at: v.updated_at,
      property_title: v.property_title,
      property_slug: v.property_slug,
      property_price: Number(v.property_price),
      property_city: v.property_city,
      agent_name: v.agent_name,
      agent_agency: v.agent_agency,
      admin_name: v.admin_name,
    };

    // Get documents for this verification
    const docs = await query(
      "SELECT id, document_type, file_path, original_name, created_at FROM property_documents WHERE property_id = ?",
      [Number(v.property_id)]
    );

    formatted.documents = (docs as any[]).map((d) => ({
      id: Number(d.id),
      document_type: d.document_type,
      file_path: d.file_path,
      original_name: d.original_name,
      created_at: d.created_at,
    }));

    formattedVerifications.push(formatted);
  }

  return success(
    {
      data: formattedVerifications,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    },
    "Verifications retrieved"
  );
}