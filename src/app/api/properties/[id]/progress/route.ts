/**
 * GET /api/properties/{id}/progress — public off-plan progress updates for a property.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { fetchAll } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const propertyId = Number(id);
  if (!propertyId || propertyId <= 0) {
    return error("Property ID is required", 400);
  }

  const rows = await fetchAll(
    `SELECT id, property_id, month_number, title, description, images, videos, created_at, updated_at
     FROM off_plan_progress
     WHERE property_id = ?
     ORDER BY month_number ASC`,
    [propertyId]
  );

  const items = rows.map((item: Record<string, any>) => ({
    ...item,
    id: Number(item.id),
    property_id: Number(item.property_id),
    month_number: Number(item.month_number),
    images: item.images ? parseJson(item.images) : [],
    videos: item.videos ? parseJson(item.videos) : [],
  }));

  return success(items, "Progress updates retrieved");
}

function parseJson(value: unknown): any {
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value as string);
  } catch {
    return [];
  }
}
