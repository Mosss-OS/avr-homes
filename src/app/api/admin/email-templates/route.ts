/**
 * GET /api/admin/email-templates — list email templates.
 * POST /api/admin/email-templates — create an email template.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchOne, fetchAll, execute } from "@/server/db";
import { readJson } from "@/server/http";
import { Validator } from "@/server/validator";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const perPage = Math.min(50, Math.max(1, Number(sp.get("per_page") ?? 20)));
  const category = sp.get("category") ?? "";

  let where = "";
  const binds: unknown[] = [];
  if (category) {
    where += " AND category = ?";
    binds.push(category);
  }

  const countRow = await fetchOne(`SELECT COUNT(*) AS c FROM email_templates WHERE 1=1 ${where}`, binds);
  const total = Number(countRow?.c ?? 0);

  const offset = (page - 1) * perPage;
  const rows = await fetchAll(
    `SELECT * FROM email_templates WHERE 1=1 ${where} ORDER BY is_system DESC, name ASC LIMIT ${perPage} OFFSET ${offset}`,
    binds
  );

  const templates = rows.map((t: Record<string, any>) => ({
    ...t,
    id: Number(t.id),
    is_system: Boolean(t.is_system),
    is_active: Boolean(t.is_active),
    variables: t.variables ? parseJson(t.variables) : [],
  }));

  return success(
    { data: templates, total, total_pages: Math.ceil(total / perPage) },
    "Templates retrieved"
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const input = await readJson(req);

  const validator = new Validator(input);
  validator
    .required("name", "Name")
    .required("subject", "Subject")
    .required("body", "Body");

  if (validator.fails()) {
    return error("Validation failed", 422, validator.getErrors());
  }

  const data = validator.validated();

  const result = await execute(
    "INSERT INTO email_templates (name, subject, body, variables, category, is_active) VALUES (?, ?, ?, ?, ?, ?)",
    [
      data.name,
      data.subject,
      data.body,
      data.variables !== undefined ? JSON.stringify(data.variables) : null,
      data.category ?? "general",
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
    ]
  );

  return success({ id: Number(result.insertId) }, "Template created", 201);
}

function parseJson(value: unknown): any {
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value as string);
  } catch {
    return [];
  }
}
