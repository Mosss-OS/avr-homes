/**
 * GET /api/kyc/status — get user's KYC status.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { authenticate, isUser } from "@/server/auth";
import { query } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const record = await query("SELECT * FROM kyc_records WHERE user_id = ?", [user.id]);

  if (!record || record.length === 0) {
    return success({
      status: "not_submitted",
      bvn_verified: false,
      id_verified: false,
    });
  }

  return success({
    id: Number(record[0].id),
    user_id: Number(record[0].user_id),
    bvn_number: record[0].bvn_number,
    source_of_funds: record[0].source_of_funds,
    id_document_url: record[0].id_document_url,
    id_document_type: record[0].id_document_type,
    bvn_verified: Boolean(record[0].bvn_verified),
    id_verified: Boolean(record[0].id_verified),
    accredited_investor: Boolean(record[0].accredited_investor),
    status: record[0].status,
    verified_at: record[0].verified_at,
    rejected_at: record[0].rejected_at,
    created_at: record[0].created_at,
    updated_at: record[0].updated_at,
  });
}
