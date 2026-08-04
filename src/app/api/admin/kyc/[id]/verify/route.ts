/**
 * PUT /api/admin/kyc/{id}/verify — admin verify a pending KYC record.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { requirePermission } from "@/server/auth";
import { execute } from "@/server/db";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await requirePermission(req, "admin_kyc_write");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const kycId = Number(id);
  if (!kycId || kycId <= 0) {
    return error("KYC record ID is required", 400);
  }

  const result = await execute("UPDATE kyc_records SET status = 'verified', verified_at = NOW() WHERE id = ? AND status = 'pending'", [kycId]);

  if (result.affectedRows === 0) {
    return error("KYC record not found or already processed", 404);
  }

  return success(null, "KYC verified");
}
