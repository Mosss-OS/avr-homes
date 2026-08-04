/**
 * POST /api/kyc/submit — submit KYC information.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticate, isUser } from "@/server/auth";
import { query, execute } from "@/server/db";
import { readJson } from "@/server/http";
import { Validator } from "@/server/validator";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const input = await readJson(req);

  const validator = new Validator(input);
  validator
    .string("bvn_number", "BVN Number", 11)
    .string("source_of_funds", "Source of Funds", 1000);

  if (validator.fails()) {
    return error("Validation failed", 422, validator.getErrors());
  }

  const data = validator.validated();

  const existing = await query("SELECT id FROM kyc_records WHERE user_id = ?", [user.id]);

  if (existing && existing.length > 0) {
    await execute(
      "UPDATE kyc_records SET bvn_number = ?, source_of_funds = ?, status = 'pending', id_document_url = ?, id_document_type = ?, accredited_investor = ? WHERE user_id = ?",
      [
        data.bvn_number ?? null,
        data.source_of_funds ?? null,
        input.id_document_url ?? null,
        input.id_document_type ?? null,
        input.accredited_investor ? 1 : 0,
        user.id,
      ]
    );
    return success(null, "KYC updated");
  } else {
    const result = await execute(
      "INSERT INTO kyc_records (user_id, bvn_number, source_of_funds, id_document_url, id_document_type, accredited_investor, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')",
      [
        user.id,
        data.bvn_number ?? null,
        data.source_of_funds ?? null,
        input.id_document_url ?? null,
        input.id_document_type ?? null,
        input.accredited_investor ? 1 : 0,
      ]
    );

    return success({ id: result.insertId }, "KYC submitted", 201);
  }
}
