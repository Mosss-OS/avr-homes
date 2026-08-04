/**
 * POST /api/contact — submit a new contact message from the public form.
 * GET /api/contact — list contact messages with pagination and optional unread filter (authenticated).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticate, isUser } from "@/server/auth";
import { fetchOne, fetchAll, execute } from "@/server/db";
import { readJson } from "@/server/http";
import { Validator } from "@/server/validator";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const input = await readJson(req);

  const validator = new Validator(input);
  validator
    .required("name", "Name")
    .string("name", "Name", 100)
    .required("email", "Email")
    .email("email", "Email")
    .required("phone", "Phone")
    .phone("phone", "Phone")
    .required("enquiry_type", "Enquiry Type")
    .string("enquiry_type", "Enquiry Type", 50)
    .inArray("enquiry_type", ["Buy", "Rent", "Agent Enquiry", "Developer Partnership", "Media", "Other"], "Enquiry Type")
    .required("message", "Message")
    .minLength("message", 10, "Message");

  if (validator.fails()) {
    return error("Validation failed", 422, validator.getErrors());
  }

  const data = validator.validated();

  const result = await execute(
    "INSERT INTO contact_messages (name, email, phone, enquiry_type, message) VALUES (?, ?, ?, ?, ?)",
    [data.name, data.email, data.phone, data.enquiry_type, data.message]
  );

  return success({ id: Number(result.insertId) }, "Thank you! We have received your message and will reply shortly.", 201);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const perPage = Math.min(50, Math.max(1, Number(sp.get("per_page") ?? 20)));
  const status = sp.get("status") ?? null;

  const conditions: string[] = [];
  const bindings: unknown[] = [];

  if (status === "unread") {
    conditions.push("cm.is_read = 0");
  }

  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  const countRow = await fetchOne(`SELECT COUNT(*) AS c FROM contact_messages cm ${where}`, bindings);
  const total = Number(countRow?.c ?? 0);

  const offset = (page - 1) * perPage;
  const messages = await fetchAll(
    `SELECT * FROM contact_messages cm ${where} ORDER BY cm.created_at DESC LIMIT ${perPage} OFFSET ${offset}`,
    bindings
  );

  const data = messages.map((msg: Record<string, any>) => ({
    ...msg,
    id: Number(msg.id),
    is_read: Boolean(msg.is_read),
  }));

  return success(
    {
      data,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    },
    "Contact messages retrieved"
  );
}
