/**
 * GET /api/admin/offplan/progress/{propertyId} — admin list progress updates for a property.
 * POST /api/admin/offplan/progress/{propertyId} — admin add a progress update.
 * PUT /api/admin/offplan/progress/{id} — admin update a progress update.
 * DELETE /api/admin/offplan/progress/{id} — admin delete a progress update.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchOne, fetchAll, execute } from "@/server/db";
import { readJson } from "@/server/http";
import { Validator } from "@/server/validator";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id: raw } = await params;
  const propertyId = Number(raw);
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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id: raw } = await params;
  const propertyId = Number(raw);
  if (!propertyId || propertyId <= 0) {
    return error("Property ID is required", 400);
  }

  const input = await readJson(req);

  const validator = new Validator(input);
  validator
    .required("title", "Title")
    .required("month_number", "Month number")
    .numeric("month_number", "Month number");

  if (validator.fails()) {
    return error("Validation failed", 422, validator.getErrors());
  }

  const data = validator.validated();

  const images = data.images !== undefined ? JSON.stringify(data.images) : "[]";
  const videos = data.videos !== undefined ? JSON.stringify(data.videos) : "[]";

  const result = await execute(
    `INSERT INTO off_plan_progress (property_id, month_number, title, description, images, videos)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [propertyId, Number(data.month_number), data.title, data.description ?? null, images, videos]
  );

  return success({ id: Number(result.insertId) }, "Progress update added", 201);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const progressId = Number(id);
  if (!progressId || progressId <= 0) {
    return error("Progress ID is required", 400);
  }

  const input = await readJson(req);

  const existing = await fetchOne("SELECT id FROM off_plan_progress WHERE id = ?", [progressId]);
  if (!existing) {
    return error("Progress update not found", 404);
  }

  const fields: string[] = [];
  const bindings: unknown[] = [];

  for (const field of ["month_number", "title", "description"]) {
    if (input[field] !== undefined) {
      fields.push(`${field} = ?`);
      bindings.push(input[field]);
    }
  }
  if (input.images !== undefined) {
    fields.push("images = ?");
    bindings.push(JSON.stringify(input.images));
  }
  if (input.videos !== undefined) {
    fields.push("videos = ?");
    bindings.push(JSON.stringify(input.videos));
  }

  if (fields.length === 0) {
    return error("No fields to update", 400);
  }

  bindings.push(progressId);
  await execute(`UPDATE off_plan_progress SET ${fields.join(", ")} WHERE id = ?`, bindings);

  return success({ id: progressId }, "Progress update updated");
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const progressId = Number(id);
  if (!progressId || progressId <= 0) {
    return error("Progress ID is required", 400);
  }

  await execute("DELETE FROM off_plan_progress WHERE id = ?", [progressId]);
  return success(null, "Progress update deleted");
}

function parseJson(value: unknown): any {
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value as string);
  } catch {
    return [];
  }
}
