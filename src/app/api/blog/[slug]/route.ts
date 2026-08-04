/**
 * GET /api/blog/{slug} — get a single published blog post by slug with related posts (public).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { findBySlug } from "@/server/models/blog";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
  const { slug } = await params;
  if (!slug) {
    return error("Slug is required", 400);
  }

  const result = await findBySlug(slug);
  if (!result) {
    return error("Post not found", 404);
  }

  return success(result, "Blog post retrieved");
}
