/**
 * POST /api/admin/import/properties — import properties from a CSV file.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { execute } from "@/server/db";
import { parseCsv } from "@/server/csv";

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
  const required = ["title", "type", "purpose", "price"];
  const missing = required.filter((r) => !header.includes(r));
  if (missing.length > 0) {
    return error("Missing columns: " + missing.join(", "), 400);
  }

  let inserted = 0;
  let updated = 0;
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

    if (!data.title || !data.type || !data.purpose || !data.price) {
      errors.push(`Line ${lineNum}: missing required fields`);
      continue;
    }

    const slug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/(^-|-$)/g, "");

    let agentId: number | null = null;
    if (data.agent_email) {
      const { fetchOne } = await import("@/server/db");
      const agent = await fetchOne("SELECT id FROM agents WHERE email = ? LIMIT 1", [data.agent_email]);
      agentId = agent ? Number(agent.id) : null;
    }

    try {
      await execute(
        `INSERT INTO properties (title, slug, description, type, purpose, price, beds, baths, area,
          city, community, address, is_active, agent_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW(), NOW())`,
        [
          data.title, slug,
          data.description ?? "", data.type, data.purpose,
          parseInt(data.price, 10) || 0, parseInt(data.beds ?? "0", 10) || 0, parseInt(data.baths ?? "0", 10) || 0,
          parseInt(data.area ?? "0", 10) || 0, data.city ?? "", data.community ?? "",
          data.address ?? "", agentId,
        ]
      );
      inserted++;
    } catch (e: any) {
      errors.push(`Line ${lineNum}: ${e?.message ?? "Unknown error"}`);
    }
  }

  if (errors.length > 0) {
    return success(
      { inserted, updated, errors },
      `Imported ${inserted} properties with ${errors.length} errors`
    );
  }
  return success({ inserted, updated }, `Successfully imported ${inserted} properties`);
}
