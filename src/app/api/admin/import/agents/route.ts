/**
 * POST /api/admin/import/agents — import agents from a CSV file.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { execute } from "@/server/db";
import { parseCsv } from "@/server/csv";
import { randomInt } from "node:crypto";

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
  const required = ["name", "email", "phone"];
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

    if (!data.name || !data.email || !data.phone) {
      errors.push(`Line ${lineNum}: missing required fields`);
      continue;
    }

    try {
      await execute(
        `INSERT INTO agents (name, email, phone, agency, city, state, avatar_hue, is_active, is_verified, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, NOW())`,
        [
          data.name, data.email, data.phone,
          data.agency ?? "AVR Homes",
          data.city ?? "", data.state ?? "",
          randomInt(0, 361),
        ]
      );
      inserted++;
    } catch (e: any) {
      if (/duplicate/i.test(e?.message ?? "")) {
        errors.push(`Line ${lineNum}: duplicate email`);
      } else {
        errors.push(`Line ${lineNum}: ${e?.message ?? "Unknown error"}`);
      }
    }
  }

  return success({ inserted, errors }, `Imported ${inserted} agents`);
}
