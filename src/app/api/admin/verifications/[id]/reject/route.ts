/**
 * PUT /api/admin/verifications/[id]/reject — reject verification (admin).
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
  const rejectionReason = input.rejection_reason;

  if (!rejectionReason) {
    return error("Validation failed", 422, { rejection_reason: ["Rejection Reason is required"] });
  }

  const verification = await fetchOne(
    "SELECT pv.*, p.title as property_title FROM property_verifications pv JOIN properties p ON p.id = pv.property_id WHERE pv.id = ? AND pv.status = 'pending'",
    [verificationId]
  );

  if (!verification) {
    return error("Pending verification not found", 404);
  }

  try {
    await execute(
      "UPDATE property_verifications SET status = ?, admin_id = ?, rejection_reason = ? WHERE id = ?",
      ["rejected", user.id, rejectionReason, verificationId]
    );

    await execute(
      "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)",
      [
        user.id,
        "reject_verification",
        "property_verification",
        verificationId,
        JSON.stringify({ property_id: verification.property_id, property_title: verification.property_title, reason: rejectionReason }),
        getClientIp(req),
      ]
    );

    return success(
      {
        verification_id: verificationId,
        property_id: Number(verification.property_id),
        status: "rejected",
      },
      "Property verification rejected"
    );
  } catch (e) {
    return error("Rejection failed: " + (e as Error).message, 500);
  }
}
