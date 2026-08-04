/**
 * GET /api/market — list market data filtered by city, property type, and purpose.
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
  const purpose = sp.get("purpose") ?? null;

  let whereConditions = ["city = ?"];
  let bindValues: any[] = [city];

  if (propertyType) {
    whereConditions.push("property_type = ?");
    bindValues.push(propertyType);
  }
  if (purpose) {
    whereConditions.push("purpose = ?");
    bindValues.push(purpose);
  }

  const whereClause = whereConditions.join(" AND ");

  const data = await query(`SELECT * FROM market_data WHERE ${whereClause} ORDER BY period DESC LIMIT 20`, bindValues);

  const formattedData = (data as any[]).map((row) => ({
    ...row,
    id: Number(row.id),
    avg_price: Number(row.avg_price),
    avg_rent: Number(row.avg_rent),
    yield: Number(row.yield),
    sample_size: Number(row.sample_size),
  }));

  return success(formattedData, "Market data retrieved");
}
