/**
 * GET /api/admin/bookings — list bookings with pagination and status filter (admin only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchOne, fetchAll } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const perPage = Math.min(50, Math.max(1, Number(sp.get("per_page") ?? 20)));
  const status = sp.get("status") ?? null;

  const conditions: string[] = ["1=1"];
  const binds: unknown[] = [];

  if (status) {
    conditions.push("b.status = ?");
    binds.push(status);
  }

  const where = conditions.join(" AND ");

  const countRow = await fetchOne(`SELECT COUNT(*) FROM property_bookings b WHERE ${where}`, binds);
  const total = Number(countRow?.[Object.keys(countRow)[0]] ?? 0);

  const offset = (page - 1) * perPage;
  const rows = await fetchAll(
    `SELECT b.*, p.title as property_title, p.slug as property_slug
     FROM property_bookings b
     LEFT JOIN properties p ON b.property_id = p.id
     WHERE ${where}
     ORDER BY b.created_at DESC LIMIT ${perPage} OFFSET ${offset}`,
    binds
  );

  const data = rows.map((r: any) => ({
    ...r,
    id: Number(r.id),
    property_id: Number(r.property_id),
    guests: Number(r.guests),
    total_price: Number(r.total_price),
  }));

  return success(
    {
      data,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    },
    "Bookings retrieved"
  );
}
