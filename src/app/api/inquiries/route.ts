/**
 * POST /api/inquiries — submit a new property inquiry (public).
 * GET /api/inquiries — list inquiries with pagination and optional unread filter (admin).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
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
    .required("message", "Message")
    .minLength("message", 10, "Message");

  if (!empty(input.property_id)) {
    validator.numeric("property_id", "Property ID");
  }

  if (validator.fails()) {
    return error("Validation failed", 422, validator.getErrors());
  }

  const data = validator.validated();

  if (!empty(data.property_id)) {
    const property = await fetchOne(
      `SELECT p.*, a.name as agent_name, a.agency as agent_agency,
        a.phone as agent_phone, a.email as agent_email, a.avatar_hue as agent_avatar_hue,
        a.languages as agent_languages, a.bio as agent_bio, a.is_verified as agent_is_verified
       FROM properties p
       LEFT JOIN agents a ON p.agent_id = a.id
       WHERE p.id = ? AND p.is_active = 1`,
      [Number(data.property_id)]
    );
    if (!property) {
      return error("Property not found", 404);
    }
  }

  if (!empty(data.payment_ref)) {
    const verified = await verifyPaystackPayment(String(data.payment_ref));
    if (!verified) {
      return error("Payment verification failed. Invalid or unverified payment.", 402);
    }
  }

  const result = await execute(
    "INSERT INTO inquiries (property_id, name, email, phone, message, property_url, payment_ref) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      !empty(data.property_id) ? Number(data.property_id) : null,
      data.name,
      data.email,
      data.phone,
      data.message,
      data.property_url ?? null,
      data.payment_ref ?? null,
    ]
  );

  return success({ id: Number(result.insertId) }, "Your inquiry has been submitted. An agent will reach out shortly.", 201);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const perPage = Math.min(50, Math.max(1, Number(sp.get("per_page") ?? 20)));
  const status = sp.get("status") ?? null;

  const conditions: string[] = [];
  const bindings: unknown[] = [];

  if (status === "unread") {
    conditions.push("i.is_read = 0");
  }

  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  const countRow = await fetchOne(`SELECT COUNT(*) AS c FROM inquiries i ${where}`, bindings);
  const total = Number(countRow?.c ?? 0);

  const offset = (page - 1) * perPage;
  const inquiries = await fetchAll(
    `SELECT i.*, p.title as property_title, p.slug as property_slug
     FROM inquiries i
     LEFT JOIN properties p ON i.property_id = p.id
     ${where}
     ORDER BY i.created_at DESC
     LIMIT ${perPage} OFFSET ${offset}`,
    bindings
  );

  const data = inquiries.map((inq: Record<string, any>) => ({
    ...inq,
    id: Number(inq.id),
    property_id: inq.property_id ? Number(inq.property_id) : null,
    is_read: Boolean(inq.is_read),
  }));

  return success(
    {
      data,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    },
    "Inquiries retrieved"
  );
}

async function verifyPaystackPayment(reference: string): Promise<boolean> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY ?? "";
  if (!secretKey) {
    return false;
  }

  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });

    const body = (await response.json()) as Record<string, any>;
    if (!body || response.status !== 200) {
      return false;
    }

    return (
      body.status === true &&
      (body.data?.status ?? "") === "success" &&
      (body.data?.amount ?? 0) >= 1500000
    );
  } catch {
    return false;
  }
}

function empty(value: unknown): boolean {
  return value === null || value === undefined || value === "" || value === 0 || value === false;
}
