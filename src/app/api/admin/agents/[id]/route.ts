/**
 * GET /api/admin/agents/{id} — get a single agent (admin only).
 * PUT /api/admin/agents/{id} — update an agent's profile fields (admin only).
 * DELETE /api/admin/agents/{id} — delete an agent and reassign their properties (admin only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchOne, execute, beginTransaction, txExecute, commit, rollback } from "@/server/db";
import { readJson } from "@/server/http";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const idNum = Number(id);
  if (idNum <= 0) return error("Invalid agent ID", 400);

  const row = await fetchOne(
    "SELECT a.*, u.email as user_email FROM agents a LEFT JOIN users u ON a.user_id = u.id WHERE a.id = ?",
    [idNum]
  );
  if (!row) return error("Agent not found", 404);

  row.id = Number(row.id);
  row.is_verified = Boolean(row.is_verified);
  row.languages = safeJson(row.languages, []);
  row.property_types = safeJson(row.property_types, []);
  row.specialization = safeJson(row.specialization, []);

  return success({ agent: row });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const idNum = Number(id);
  if (idNum <= 0) return error("Invalid agent ID", 400);

  const input = await readJson(req);
  if (!input || Object.keys(input).length === 0) return error("No data provided", 400);

  const fields: string[] = [];
  const binds: unknown[] = [];

  for (const f of ["name", "email", "phone", "agency", "bio", "whatsapp", "experience", "state", "city", "avg_monthly_listings", "avg_deal_size", "referral_source", "social_instagram", "social_facebook", "social_linkedin", "social_tiktok", "social_youtube"]) {
    if (f in input) {
      fields.push(`${f} = ?`);
      binds.push(input[f]);
    }
  }
  for (const f of ["property_types", "specialization", "languages", "support_needed"]) {
    if (f in input) {
      fields.push(`${f} = ?`);
      binds.push(JSON.stringify(input[f]));
    }
  }

  if (fields.length === 0) return error("No fields to update", 400);

  binds.push(idNum);
  const sql = `UPDATE agents SET ${fields.join(", ")} WHERE id = ?`;
  await execute(sql, binds);

  return success({ id: idNum }, "Agent updated");
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const idNum = Number(id);
  if (idNum <= 0) return error("Invalid agent ID", 400);

  const agent = await fetchOne("SELECT user_id FROM agents WHERE id = ?", [idNum]);
  if (!agent) return error("Agent not found", 404);

  const conn = await beginTransaction();
  try {
    await txExecute(conn, "UPDATE properties SET agent_id = NULL WHERE agent_id = ?", [idNum]);
    await txExecute(conn, "DELETE FROM agents WHERE id = ?", [idNum]);
    await txExecute(conn, "UPDATE users SET role = ? WHERE id = ? AND role = ?", ["user", agent.user_id, "agent"]);
    await commit(conn);
  } catch (err) {
    await rollback(conn).catch(() => {});
    return error("Database error: " + (err as Error).message, 500);
  }

  return success(null, "Agent deleted");
}

function safeJson(value: unknown, fallback: unknown): unknown {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value as string);
  } catch {
    return fallback;
  }
}
