/**
 * GET /api/market/reports — list all published market reports with pagination.
 * POST /api/market/reports — publish or update a market report (admin).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { query, execute } from "@/server/db";
import { readJson } from "@/server/http";
import { Validator } from "@/server/validator";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const sp = req.nextUrl.searchParams;

  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const perPage = Math.min(20, Math.max(1, Number(sp.get("per_page") ?? 10)));

  const countRows = (await query("SELECT COUNT(*) as total FROM market_reports")) as any[];
  const total = Number(countRows[0]?.total ?? 0);

  const offset = (page - 1) * perPage;
  const reports = (await query(
    "SELECT id, period, pdf_url, highlights, published_at FROM market_reports ORDER BY published_at DESC LIMIT ? OFFSET ?",
    [perPage, offset]
  )) as any[];

  for (const report of reports) {
    report.id = Number(report.id);
    report.highlights = report.highlights ? JSON.parse(report.highlights) : [];
  }

  return success(
    {
      data: reports,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    },
    "Market reports retrieved"
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const input = await readJson(req);

  const validator = new Validator(input);
  validator.required("period", "Period");
  validator.required("pdf_url", "PDF URL");
  validator.required("highlights", "Highlights");

  if (validator.fails()) {
    return error("Validation failed", 422, validator.getErrors());
  }

  const data = validator.validated();

  await execute(
    "INSERT INTO market_reports (period, pdf_url, highlights, charts_data, published_at) VALUES (?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE pdf_url = VALUES(pdf_url), highlights = VALUES(highlights), charts_data = VALUES(charts_data), published_at = NOW()",
    [data.period, data.pdf_url, JSON.stringify(data.highlights), JSON.stringify(data.charts_data ?? [])]
  );

  return success({ period: data.period }, "Report published", 201);
}
