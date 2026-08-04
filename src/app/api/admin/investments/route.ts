/**
 * GET /api/admin/investments — admin list of investment properties.
 * POST /api/admin/investments — admin create investment property.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { requirePermission } from "@/server/auth";
import { query, execute } from "@/server/db";
import { readJson } from "@/server/http";
import { Validator } from "@/server/validator";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requirePermission(req, "admin_investments_read");
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const perPage = Math.min(50, Math.max(1, Number(sp.get("per_page") ?? 20)));
  const status = sp.get("status") ?? null;

  let whereConditions = ["1=1"];
  let bindValues: any[] = [];

  if (status && ["active", "fully_funded", "closed"].includes(status)) {
    whereConditions.push("ip.status = ?");
    bindValues.push(status);
  }

  const whereClause = whereConditions.join(" AND ");

  const countSql = `SELECT COUNT(*) FROM investment_properties ip WHERE ${whereClause}`;
  const [countResult] = await query(countSql, bindValues);
  const total = Number(countResult[0]?.c ?? 0);

  const offset = (page - 1) * perPage;

  const sql = `SELECT ip.*, p.title AS property_title, p.city, p.image AS property_image,
               (SELECT COUNT(*) FROM investments i WHERE i.investment_property_id = ip.id AND i.status = 'active') AS investor_count,
               (SELECT COALESCE(SUM(i.total_amount), 0) FROM investments i WHERE i.investment_property_id = ip.id AND i.status = 'active') AS total_raised
        FROM investment_properties ip
        LEFT JOIN properties p ON p.id = ip.property_id
        WHERE ${whereClause}
        ORDER BY ip.created_at DESC LIMIT ${perPage} OFFSET ${offset}`;
  const rows = await query(sql, bindValues);

  const formattedRows = (rows as any[]).map((r) => ({
    id: Number(r.id),
    property_id: r.property_id !== null ? Number(r.property_id) : null,
    title: r.title,
    description: r.description,
    image: r.image,
    total_shares: Number(r.total_shares),
    available_shares: Number(r.available_shares),
    share_price: Number(r.share_price),
    min_investment: r.min_investment ? Number(r.min_investment) : null,
    expected_yield: r.expected_yield ? Number(r.expected_yield) : null,
    distribution_frequency: r.distribution_frequency,
    status: r.status,
    investor_count: Number(r.investor_count),
    total_raised: Number(r.total_raised),
    funding_percentage: r.total_shares > 0
      ? Math.round(((r.total_shares - r.available_shares) / r.total_shares) * 100 * 10) / 10
      : 0,
    property_title: r.property_title,
    city: r.city,
    property_image: r.property_image,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  return success({
    data: formattedRows,
    total,
    page,
    per_page: perPage,
    total_pages: Math.ceil(total / perPage),
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requirePermission(req, "admin_investments_write");
  if (auth instanceof NextResponse) return auth;

  const input = await readJson(req);

  const validator = new Validator(input);
  validator
    .required("title", "Title")
    .required("total_shares", "Total Shares")
    .numeric("total_shares", "Total Shares")
    .required("share_price", "Share Price")
    .numeric("share_price", "Share Price");

  if (validator.fails()) {
    return error("Validation failed", 422, validator.getErrors());
  }

  const data = validator.validated();

  const result = await execute(
    `INSERT INTO investment_properties (property_id, title, description, image, total_shares, share_price,
      available_shares, min_investment, expected_yield, distribution_frequency, status, property_details)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.property_id ? Number(input.property_id) : null,
      data.title,
      input.description ?? null,
      input.image ?? null,
      Number(data.total_shares),
      Number(data.share_price),
      Number(data.total_shares),
      input.min_investment ? Number(input.min_investment) : null,
      input.expected_yield ? Number(input.expected_yield) : null,
      input.distribution_frequency ?? "quarterly",
      input.status ?? "active",
      input.property_details ? JSON.stringify(input.property_details) : null,
    ]
  );

  return success({ id: result.insertId }, "Investment property created", 201);
}