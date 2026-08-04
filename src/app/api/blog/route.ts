/**
 * GET /api/blog — list published blog posts with pagination, category/tag/search filtering (public).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { findPublic } from "@/server/models/blog";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const perPage = Math.min(20, Math.max(1, Number(sp.get("per_page") ?? 10)));

  const result = await findPublic(page, perPage, {
    category: sp.get("category"),
    tag: sp.get("tag"),
    search: sp.get("search"),
  });

  return success(result, "Blog posts retrieved");
}
