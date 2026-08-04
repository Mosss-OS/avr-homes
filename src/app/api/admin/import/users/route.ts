/**
 * POST /api/admin/import/users — import users from a CSV file.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { execute } from "@/server/db";
import { parseCsv } from "@/server/csv";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const fd = await req.formData();
  const file = fd.get("file");
  if (!(file instanceof File)) {
    return error("CSV file required", 400);
  }

  const content = await file.text();
  const parsed = parseCsv(content);
  if (parsed.length === 0) {
    return error("Empty CSV", 400);
  }

  const header = parsed[0].map((h) => String(h).toLowerCase());
  const required = ["name", "email", "password"];
  const missing = required.filter((r) => !header.includes(r));
  if (missing.length > 0) {
    return error("Missing columns: " + missing.join(", "), 400);
  }

  let inserted = 0;
  const errors: string[] = [];

  for (let i = 1; i < parsed.length; i++) {
    const lineNum = i + 1;
    const row = parsed[i];
    if (row.length === 0 || (row.length === 1 && (row[0] === null || row[0] === ""))) {
      continue;
    }

    const data: Record<string, string> = {};
    header.forEach((h, idx) => {
      data[h] = row[idx] !== undefined ? String(row[idx]) : "";
    });

    if (!data.name || !data.email || !data.password) {
      errors.push(`Line ${lineNum}: missing required fields`);
      continue;
    }

    const hashed = bcrypt.hashSync(String(data.password), 12);

    try {
      const result = await execute(
        "INSERT IGNORE INTO users (name, email, password, role, is_active, created_at) VALUES (?, ?, ?, ?, 1, NOW())",
        [data.name, data.email, hashed, data.role ?? "user"]
      );
      if (Number(result.affectedRows) > 0) {
        inserted++;
      } else {
        errors.push(`Line ${lineNum}: duplicate email`);
      }
    } catch (e: any) {
      errors.push(`Line ${lineNum}: ${e?.message ?? "Unknown error"}`);
    }
  }

  return success({ inserted, errors }, `Imported ${inserted} users`);
}
