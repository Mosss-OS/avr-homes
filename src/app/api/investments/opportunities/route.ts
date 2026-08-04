/**
 * GET /api/investments/opportunities — list active investment properties.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { query } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const items = await query(
    `SELECT ip.*, p.title AS property_title, p.city, p.image AS property_image
     FROM investment_properties ip
     LEFT JOIN properties p ON p.id = ip.property_id
     WHERE ip.status = "active"
     ORDER BY ip.created_at DESC`
  );

  const formattedItems = (items as any[]).map((item) => ({
    id: Number(item.id),
    property_id: item.property_id !== null ? Number(item.property_id) : null,
    title: item.title,
    description: item.description,
    image: item.image,
    total_shares: Number(item.total_shares),
    available_shares: Number(item.available_shares),
    share_price: Number(item.share_price),
    min_investment: item.min_investment ? Number(item.min_investment) : null,
    expected_yield: item.expected_yield ? Number(item.expected_yield) : null,
    distribution_frequency: item.distribution_frequency,
    status: item.status,
    funding_percentage: item.total_shares > 0
      ? Math.round(((item.total_shares - item.available_shares) / item.total_shares) * 100 * 10) / 10
      : 0,
    property_details: item.property_details ? (typeof item.property_details === "string" ? JSON.parse(item.property_details) : item.property_details) : null,
    property_title: item.property_title,
    city: item.city,
    property_image: item.property_image,
    created_at: item.created_at,
    updated_at: item.updated_at,
  }));

  return success(formattedItems, "Investment opportunities retrieved");
}