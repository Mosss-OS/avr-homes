/**
 * PUT /api/admin/verifications/[id]/approve — approve verification (admin).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { requirePermission } from "@/server/auth";
import { fetchOne, execute } from "@/server/db";
import { readJson } from "@/server/http";
import { getClientIp } from "@/server/rate-limiter";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await requirePermission(req, "admin_verifications_write");
  if (auth instanceof NextResponse) return auth;
  const user = auth;

  const { id } = await params;
  const verificationId = Number(id);
  if (!verificationId || verificationId <= 0) {
    return error("Invalid verification ID", 400);
  }

  const input = await readJson(req);

  const verification = await fetchOne(
    "SELECT pv.*, p.title as property_title FROM property_verifications pv JOIN properties p ON p.id = pv.property_id WHERE pv.id = ? AND pv.status = 'pending'",
    [verificationId]
  );

  if (!verification) {
    return error("Pending verification not found", 404);
  }

  const notes = input.admin_notes ?? null;
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");

  try {
    await execute(
      "UPDATE property_verifications SET status = ?, admin_id = ?, admin_notes = ?, expires_at = ? WHERE id = ?",
      ["approved", user.id, notes, expiresAt, verificationId]
    );

    await execute(
      "UPDATE properties SET is_verified = 1, verified_by = ?, verified_at = NOW(), verification_expires_at = ? WHERE id = ?",
      [user.id, expiresAt, verification.property_id]
    );

    await execute(
      "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)",
      [
        user.id,
        "approve_verification",
        "property_verification",
        verificationId,
        JSON.stringify({ property_id: verification.property_id, property_title: verification.property_title }),
        getClientIp(req),
      ]
    );

    return success(
      {
        verification_id: verificationId,
        property_id: Number(verification.property_id),
        status: "approved",
        expires_at: expiresAt,
      },
      "Property verification approved"
    );
  } catch (e) {
    return error("Approval failed: " + (e as Error).message, 500);
  }
}
