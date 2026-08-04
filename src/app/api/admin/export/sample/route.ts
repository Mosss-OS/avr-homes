/**
 * GET /api/admin/export/sample — download a sample CSV for imports.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticateAdmin, isUser } from "@/server/auth";
import { outputCsv } from "@/server/csv";

export const runtime = "nodejs";

const SAMPLES: Record<string, { headers: string[]; rows: string[][] }> = {
  properties: {
    headers: ["title", "type", "purpose", "price", "beds", "baths", "area", "city", "community", "description", "agent_email"],
    rows: [
      ["Luxury 3-Bed Apartment", "apartment", "rent", "3500000", "3", "2", "120", "Lagos", "Lekki Phase 1", "Beautiful apartment", "agent@example.com"],
      ["4-Bed Duplex", "villa", "buy", "85000000", "4", "4", "350", "Abuja", "Maitama", "Spacious duplex", "agent@example.com"],
    ],
  },
  users: {
    headers: ["name", "email", "password", "role"],
    rows: [
      ["John Doe", "john@example.com", "password123", "agent"],
      ["Jane Smith", "jane@example.com", "password123", "user"],
    ],
  },
  agents: {
    headers: ["name", "email", "phone", "agency", "city", "state"],
    rows: [
      ["John Doe", "john@example.com", "08012345678", "AVR Homes", "Lagos", "Lagos"],
      ["Jane Smith", "jane@example.com", "08087654321", "AVR Homes", "Abuja", "FCT"],
    ],
  },
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const entity = req.nextUrl.searchParams.get("entity") ?? "properties";
  const spec = SAMPLES[entity] ?? SAMPLES.properties;

  return outputCsv(`${entity}-sample.csv`, spec.headers, spec.rows);
}
