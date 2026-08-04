/**
 * GET /api/agent/blog — list blog posts for the authenticated agent/admin with pagination and status filter.
 * POST /api/agent/blog — create a new blog post.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAgent, isUser } from "@/server/auth";
import { readJson } from "@/server/http";
import { Validator } from "@/server/validator";
import { findAgentIndex, create } from "@/server/models/blog";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAgent(req);
  if (!isUser(auth)) return auth as NextResponse;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const perPage = Math.min(50, Math.max(1, Number(sp.get("per_page") ?? 20)));

  const result = await findAgentIndex(page, perPage, sp.get("status"));
  return success(result, "Agent blog posts retrieved");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAgent(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;
  const isAdmin = user.role === "admin" || user.role === "superadmin";

  const input = await readJson(req);

  const validator = new Validator(input);
  validator
    .required("title", "Title")
    .required("content", "Content")
    .string("title", "Title", 255)
    .string("excerpt", "Excerpt", 500);

  if (validator.fails()) {
    return error("Validation failed", 422, validator.getErrors());
  }

  const result = await create(validator.validated(), user.id, isAdmin);
  return success(result, "Blog post created", 201);
}
