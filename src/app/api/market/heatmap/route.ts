/**
 * GET /api/market/heatmap — get heatmap data (latest period) with coordinates for map rendering.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { query } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const sp = req.nextUrl.searchParams;

  const city = sp.get("city") ?? "Lagos";
  const propertyType = sp.get("type") ?? null;
  const purpose = sp.get("purpose") ?? "buy";

  let whereConditions = [];
  let bindValues: any[] = [];

  whereConditions.push("city = ?");
  bindValues.push(city);
  whereConditions.push("purpose = ?");
  bindValues.push(purpose);

  if (propertyType) {
    whereConditions.push("property_type = ?");
    bindValues.push(propertyType);
  }

  const whereClause = whereConditions.join(" AND ");

  // Get latest period data for heatmap
  const sql = `SELECT community, avg_price, avg_rent, yield, sample_size, property_type, lat, lng FROM market_data WHERE ${whereClause} AND period = (SELECT MAX(period) FROM market_data WHERE ${whereClause}) ORDER BY sample_size DESC`;
  const data = await query(sql, bindValues);

  const formattedData = (data as any[]).map((row) => ({
    community: row.community,
    avg_price: Number(row.avg_price),
    avg_rent: Number(row.avg_rent),
    yield: Number(row.yield),
    sample_size: Number(row.sample_size),
    property_type: row.property_type,
    lat: Number(row.lat),
    lng: Number(row.lng),
  }));

  return success(formattedData, "Heatmap data retrieved");
}
