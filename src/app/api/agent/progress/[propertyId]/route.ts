/**
 * GET /api/agent/progress/{propertyId} — list progress updates for the agent's own property.
 * POST /api/agent/progress/{propertyId} — add a progress update for an off-plan property.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAgent, isUser } from "@/server/auth";
import { fetchOne, fetchAll, execute } from "@/server/db";
import { readJson } from "@/server/http";
import { Validator } from "@/server/validator";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ propertyId: string }> }): Promise<NextResponse> {
  const auth = await authenticateAgent(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const agentId = await getAgentId(user);
  if (agentId instanceof NextResponse) return agentId;

  const { propertyId: raw } = await params;
  const propertyId = Number(raw);
  if (!propertyId || propertyId <= 0) {
    return error("Property ID is required", 400);
  }

  const property = await fetchOne("SELECT id FROM properties WHERE id = ? AND agent_id = ?", [propertyId, agentId]);
  if (!property) {
    return error("Property not found or not yours", 404);
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

export async function POST(req: NextRequest, { params }: { params: Promise<{ propertyId: string }> }): Promise<NextResponse> {
  const auth = await authenticateAgent(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;

  const agentId = await getAgentId(user);
  if (agentId instanceof NextResponse) return agentId;

  const { propertyId: raw } = await params;
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

  const property = await fetchOne("SELECT id, is_off_plan FROM properties WHERE id = ? AND agent_id = ?", [propertyId, agentId]);
  if (!property) {
    return error("Property not found or not yours", 404);
  }

  const images = data.images !== undefined ? JSON.stringify(data.images) : "[]";
  const videos = data.videos !== undefined ? JSON.stringify(data.videos) : "[]";

  const result = await execute(
    `INSERT INTO off_plan_progress (property_id, month_number, title, description, images, videos)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [propertyId, Number(data.month_number), data.title, data.description ?? null, images, videos]
  );

  return success({ id: Number(result.insertId) }, "Progress update added", 201);
}

async function getAgentId(user: any): Promise<number | NextResponse> {
  if (user.agent_id) return Number(user.agent_id);
  const agent = await fetchOne("SELECT id FROM agents WHERE user_id = ? AND is_active = 1", [user.id]);
  if (!agent) {
    return error("Agent profile not found. Complete your profile first.", 404);
  }
  return Number(agent.id);
}

function parseJson(value: unknown): any {
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value as string);
  } catch {
    return [];
  }
}
