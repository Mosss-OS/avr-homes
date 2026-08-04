/**
 * GET /api/market/reports/{period} — retrieve a specific market report by period identifier.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { query } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ period: string }> }): Promise<NextResponse> {
  const { period } = await params;

  const rows = (await query("SELECT * FROM market_reports WHERE period = ?", [period])) as any[];
  const report = rows[0];

  if (!report) {
    return error("Report not found", 404);
  }

  report.highlights = report.highlights ? JSON.parse(report.highlights) : [];
  report.charts_data = report.charts_data ? JSON.parse(report.charts_data) : [];

  return success(report, "Market report retrieved");
}
