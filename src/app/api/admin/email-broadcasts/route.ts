/**
 * GET /api/admin/email-broadcasts — list email broadcasts.
 * POST /api/admin/email-broadcasts — create an email broadcast.
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
  const status = sp.get("status") ?? "";

  let where = "";
  const binds: unknown[] = [];
  if (status) {
    where += " AND status = ?";
    binds.push(status);
  }

  const countRow = await fetchOne(`SELECT COUNT(*) AS c FROM email_broadcasts WHERE 1=1 ${where}`, binds);
  const total = Number(countRow?.c ?? 0);

  const offset = (page - 1) * perPage;
  const rows = await fetchAll(
    `SELECT eb.*, u.name as created_by_name FROM email_broadcasts eb LEFT JOIN users u ON u.id = eb.created_by WHERE 1=1 ${where} ORDER BY eb.created_at DESC LIMIT ${perPage} OFFSET ${offset}`,
    binds
  );

  const broadcasts = rows.map((b: Record<string, any>) => ({
    ...b,
    id: Number(b.id),
    sent_count: Number(b.sent_count),
    created_by: Number(b.created_by),
  }));

  return success(
    { data: broadcasts, total, total_pages: Math.ceil(total / perPage) },
    "Broadcasts retrieved"
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const input = await readJson(req);

  const validator = new Validator(input);
  validator
    .required("subject", "Subject")
    .required("body", "Body");

  if (validator.fails()) {
    return error("Validation failed", 422, validator.getErrors());
  }

  const data = validator.validated();

  const result = await execute(
    "INSERT INTO email_broadcasts (subject, body, recipient_filter, status, scheduled_at, created_by) VALUES (?, ?, ?, ?, ?, ?)",
    [
      data.subject,
      data.body,
      data.recipient_filter ?? "all",
      data.status ?? "draft",
      data.scheduled_at ?? null,
      user.id,
    ]
  );

  return success({ id: Number(result.insertId) }, "Broadcast created", 201);
}
