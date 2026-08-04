/**
 * GET /api/admin/investments/[id] — admin show investment property with investors and dividends.
 * PUT /api/admin/investments/[id] — admin update investment property.
 * DELETE /api/admin/investments/[id] — admin delete investment property.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { requirePermission } from "@/server/auth";
import { query, execute } from "@/server/db";
import { readJson } from "@/server/http";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await requirePermission(req, "admin_investments_read");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const investmentId = Number(id);
  if (!investmentId) {
    return error("Investment property ID is required", 400);
  }

  const item = await query(
    `SELECT ip.*, p.title AS property_title, p.description AS property_description,
            p.city, p.state, p.image AS property_image, p.price AS property_price,
            p.beds, p.baths, p.area, p.type AS property_type
     FROM investment_properties ip
     LEFT JOIN properties p ON p.id = ip.property_id
     WHERE ip.id = ?`,
    [investmentId]
  );

  if (!item || item.length === 0) {
    return error("Investment property not found", 404);
  }

  const formatted: Record<string, any> = {
    id: Number(item[0].id),
    property_id: item[0].property_id !== null ? Number(item[0].property_id) : null,
    title: item[0].title,
    description: item[0].description,
    image: item[0].image,
    total_shares: Number(item[0].total_shares),
    available_shares: Number(item[0].available_shares),
    share_price: Number(item[0].share_price),
    min_investment: item[0].min_investment ? Number(item[0].min_investment) : null,
    expected_yield: item[0].expected_yield ? Number(item[0].expected_yield) : null,
    distribution_frequency: item[0].distribution_frequency,
    status: item[0].status,
    funding_percentage: item[0].total_shares > 0
      ? Math.round(((item[0].total_shares - item[0].available_shares) / item[0].total_shares) * 100 * 10) / 10
      : 0,
    property_details: item[0].property_details ? (typeof item[0].property_details === "string" ? JSON.parse(item[0].property_details) : item[0].property_details) : null,
    property_title: item[0].property_title,
    property_description: item[0].property_description,
    city: item[0].city,
    state: item[0].state,
    property_image: item[0].property_image,
    property_price: item[0].property_price ? Number(item[0].property_price) : null,
    beds: item[0].beds ? Number(item[0].beds) : null,
    baths: item[0].baths ? Number(item[0].baths) : null,
    area: item[0].area ? Number(item[0].area) : null,
    property_type: item[0].property_type,
    created_at: item[0].created_at,
    updated_at: item[0].updated_at,
  };

  // Get investors
  const investors = await query(
    `SELECT i.id, i.shares, i.total_amount, i.purchase_price, i.status, i.purchase_date,
            u.name AS user_name, u.email AS user_email
     FROM investments i
     JOIN users u ON u.id = i.user_id
     WHERE i.investment_property_id = ?
     ORDER BY i.purchase_date DESC`,
    [investmentId]
  );

  formatted.investors = (investors as any[]).map((inv) => ({
    id: Number(inv.id),
    shares: Number(inv.shares),
    total_amount: Number(inv.total_amount),
    purchase_price: Number(inv.purchase_price),
    status: inv.status,
    purchase_date: inv.purchase_date,
    user_name: inv.user_name,
    user_email: inv.user_email,
  }));

  formatted.investor_count = formatted.investors.length;

  // Get dividend history
  const dividends = await query(
    "SELECT id, amount_per_share, total_amount, declared_at, paid_at, period_start, period_end, status FROM dividends WHERE investment_property_id = ? ORDER BY declared_at DESC",
    [investmentId]
  );

  formatted.dividends = (dividends as any[]).map((d) => ({
    id: Number(d.id),
    amount_per_share: Number(d.amount_per_share),
    total_amount: Number(d.total_amount),
    declared_at: d.declared_at,
    paid_at: d.paid_at,
    period_start: d.period_start,
    period_end: d.period_end,
    status: d.status,
  }));

  return success(formatted);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await requirePermission(req, "admin_investments_write");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const investmentId = Number(id);
  if (!investmentId) {
    return error("Investment property ID is required", 400);
  }

  const input = await readJson(req);
  if (!input || Object.keys(input).length === 0) {
    return error("No data provided", 400);
  }

  const fields: string[] = [];
  const binds: any[] = [];

  for (const f of ["title", "description", "image"]) {
    if (input[f] !== undefined) {
      fields.push(`${f} = ?`);
      binds.push(input[f]);
    }
  }
  for (const f of ["total_shares", "available_shares"]) {
    if (input[f] !== undefined) {
      fields.push(`${f} = ?`);
      binds.push(Number(input[f]));
    }
  }
  for (const f of ["share_price", "min_investment", "expected_yield"]) {
    if (input[f] !== undefined) {
      fields.push(`${f} = ?`);
      binds.push(Number(input[f]));
    }
  }
  if (input.property_id !== undefined) {
    fields.push("property_id = ?");
    binds.push(input.property_id ? Number(input.property_id) : null);
  }
  if (input.distribution_frequency !== undefined) {
    fields.push("distribution_frequency = ?");
    binds.push(input.distribution_frequency);
  }
  if (input.property_details !== undefined) {
    fields.push("property_details = ?");
    binds.push(JSON.stringify(input.property_details));
  }

  if (fields.length === 0) {
    return error("No fields to update", 400);
  }

  binds.push(investmentId);
  await execute(`UPDATE investment_properties SET ${fields.join(", ")} WHERE id = ?`, binds);

  return success({ id: investmentId }, "Investment property updated");
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await requirePermission(req, "admin_investments_write");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const investmentId = Number(id);
  if (!investmentId) {
    return error("Investment property ID is required", 400);
  }

  await execute("DELETE FROM investment_properties WHERE id = ?", [investmentId]);

  return success(null, "Investment property deleted");
}