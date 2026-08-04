/**
 * GET /api/investments/[id] — get single investment property with dividends.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { query } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
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
    return error("Investment opportunity not found", 404);
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
