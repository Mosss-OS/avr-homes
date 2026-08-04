/**
 * GET /api/market/price-index — get the price index over time (last 8 periods) with period-over-period changes.
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

  let whereConditions = ["city = ?", "purpose = ?"];
  let bindValues: any[] = [city, purpose];

  if (propertyType) {
    whereConditions.push("property_type = ?");
    bindValues.push(propertyType);
  }

  const whereClause = whereConditions.join(" AND ");

  // Get price index over time (last 8 periods)
  const index = (await query(
    `SELECT period, AVG(avg_price) as index_value, SUM(sample_size) as total_samples FROM market_data WHERE ${whereClause} GROUP BY period ORDER BY period DESC LIMIT 8`,
    bindValues
  )) as any[];

  // Calculate period-over-period changes
  const indexData = index.map((row, i) => {
    let change = null;
    if (index[i + 1]) {
      const prev = Number(index[i + 1].index_value);
      const curr = Number(row.index_value);
      change = prev > 0 ? Math.round(((curr - prev) / prev) * 10000) / 100 : null;
    }
    return {
      period: row.period,
      index_value: Number(row.index_value),
      change_pct: change,
      samples: Number(row.total_samples),
    };
  });

  // Current stats
  const current = (await query(
    `SELECT AVG(avg_price) as current_avg, AVG(yield) as current_yield, SUM(sample_size) as total_samples FROM market_data WHERE ${whereClause} AND period = (SELECT MAX(period) FROM market_data WHERE ${whereClause})`,
    bindValues
  )) as any[];

  const currentRow = current[0];

  return success(
    {
      city,
      property_type: propertyType,
      purpose,
      current_avg_price: currentRow ? Number(currentRow.current_avg) : 0,
      current_yield: currentRow ? Number(currentRow.current_yield) : 0,
      total_samples: currentRow ? Number(currentRow.total_samples) : 0,
      index_history: indexData.reverse(),
    },
    "Price index retrieved"
  );
}
