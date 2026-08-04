/**
 * PUT /api/admin/blog/{id} — update a blog post (admin).
 * DELETE /api/admin/blog/{id} — delete a blog post (admin).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAgent, isUser } from "@/server/auth";
import { readJson } from "@/server/http";
import { update, remove } from "@/server/models/blog";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAgent(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;
  const isAdmin = user.role === "admin" || user.role === "superadmin";

  const { id } = await params;
  const postId = Number(id);
  if (!postId || postId <= 0) {
    return error("Post ID is required", 400);
  }

  const input = await readJson(req);
  const result = await update(postId, input, user.id, isAdmin);

  if (!result.ok) {
    return error(result.message ?? "Update failed", result.status ?? 500);
  }
  return success({ id: postId }, "Blog post updated");
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAgent(req);
  if (!isUser(auth)) return auth as NextResponse;
  const user = auth;
  const isAdmin = user.role === "admin" || user.role === "superadmin";

  const { id } = await params;
  const postId = Number(id);
  if (!postId || postId <= 0) {
    return error("Post ID is required", 400);
  }

  const result = await remove(postId, user.id, isAdmin);

  if (!result.ok) {
    return error(result.message ?? "Delete failed", result.status ?? 500);
  }
  return success(null, "Blog post deleted");
}
