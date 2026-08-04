/**
 * PUT /api/admin/pools/{id} — update a pool.
 * DELETE /api/admin/pools/{id} — delete a pool.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchOne, execute } from "@/server/db";
import { readJson } from "@/server/http";

export const runtime = "nodejs";

const NUMERIC_FIELDS = ["target_amount", "default_monthly", "min_monthly", "max_monthly", "min_lump_sum", "penalty_rate"];
const INT_FIELDS = ["grace_days", "default_after_days", "target_property_id"];
const BOOL_FIELDS = ["allow_monthly", "allow_lump_sum"];
const DATE_FIELDS = ["start_date", "end_date"];

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const poolId = Number(id);
  if (!poolId || poolId <= 0) {
    return error("Invalid pool ID", 400);
  }

  const existing = await fetchOne("SELECT id FROM investment_pools WHERE id = ?", [poolId]);
  if (!existing) {
    return error("Pool not found", 404);
  }

  const input = await readJson(req);

  const allowed = [
    "title", "description", "image", "target_property_id", "target_amount",
    "default_monthly", "min_monthly", "max_monthly", "min_lump_sum", "allow_monthly",
    "allow_lump_sum", "penalty_rate", "grace_days", "default_after_days",
    "reminder_days_before", "start_date", "end_date", "status",
  ];

  const fields: string[] = [];
  const bindings: unknown[] = [];

  for (const field of allowed) {
    if (!(field in input)) continue;
    let value: unknown;
    if (BOOL_FIELDS.includes(field)) {
      value = input[field] ? 1 : 0;
    } else if (NUMERIC_FIELDS.includes(field)) {
      value = input[field] === "" || input[field] === null ? null : Number(input[field]);
    } else if (INT_FIELDS.includes(field)) {
      value = input[field] === "" || input[field] === null ? null : Number(input[field]);
    } else if (DATE_FIELDS.includes(field)) {
      value = input[field] ? input[field] : null;
    } else {
      value = input[field];
    }
    fields.push(`${field} = ?`);
    bindings.push(value);
  }

  if (fields.length > 0) {
    bindings.push(poolId);
    await execute(`UPDATE investment_pools SET ${fields.join(", ")} WHERE id = ?`, bindings);
  }

  return success(null, "Pool updated successfully");
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const poolId = Number(id);
  if (!poolId || poolId <= 0) {
    return error("Invalid pool ID", 400);
  }

  await execute("DELETE FROM investment_pools WHERE id = ?", [poolId]);
  return success(null, "Pool deleted successfully");
}
