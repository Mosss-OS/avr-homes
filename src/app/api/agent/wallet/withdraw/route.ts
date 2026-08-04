/**
 * POST /api/agent/wallet/withdraw — submit a withdrawal request.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticate, isUser } from "@/server/auth";
import { fetchOne, execute, beginTransaction, txExecute, commit, rollback } from "@/server/db";
import { readJson } from "@/server/http";
import { Validator } from "@/server/validator";
import { getClientIp } from "@/server/rate-limiter";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;
  const userId = user.id;

  const input = await readJson(req);

  const validator = new Validator(input);
  validator
    .required("amount", "Amount")
    .numeric("amount", "Amount")
    .required("bank_name", "Bank Name")
    .string("bank_name", "Bank Name", 100)
    .required("account_number", "Account Number")
    .string("account_number", "Account Number", 20)
    .required("account_name", "Account Name")
    .string("account_name", "Account Name", 100);

  if (validator.fails()) {
    return error("Validation failed", 422, validator.getErrors());
  }

  const data = validator.validated();

  const wallet = await fetchOne("SELECT id, balance FROM agent_wallets WHERE agent_id = ?", [userId]);
  if (!wallet) {
    return error("Wallet not found", 404);
  }

  if (Number(data.amount) > Number(wallet.balance)) {
    return error("Insufficient balance", 400);
  }

  if (Number(data.amount) < 1000) {
    return error("Minimum withdrawal amount is ₦1,000", 400);
  }

  const conn = await beginTransaction();
  try {
    const walletId = Number(wallet.id);
    const reference = "WD_" + cryptoRandomHex(10).toUpperCase();

    const txResult = await txExecute(
      conn,
      `INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference, status)
       VALUES (?, "debit", ?, ?, ?, "pending")`,
      [walletId, Number(data.amount), `Withdrawal to ${data.bank_name} - ${data.account_number}`, reference]
    );
    const txId = Number(txResult.insertId);

    await txExecute(
      conn,
      "UPDATE agent_wallets SET balance = balance - ?, total_withdrawn = total_withdrawn + ? WHERE id = ?",
      [Number(data.amount), Number(data.amount), walletId]
    );

    await txExecute(
      conn,
      "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, "withdrawal_request", "wallet", walletId, JSON.stringify({ amount: data.amount, bank: data.bank_name }), getClientIp(req)]
    );

    await commit(conn);

    return success(
      {
        id: txId,
        reference,
        amount: Number(data.amount),
        status: "pending",
      },
      "Withdrawal request submitted. Processing takes 1-3 business days.",
      201
    );
  } catch (e: any) {
    await rollback(conn);
    return error("Failed to process withdrawal: " + (e?.message ?? "Unknown error"), 500);
  }
}

function cryptoRandomHex(length: number): string {
  let result = "";
  const bytes = new Uint8Array(Math.ceil(length / 2));
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  for (const b of bytes) {
    result += b.toString(16).padStart(2, "0");
  }
  return result.slice(0, length);
}
