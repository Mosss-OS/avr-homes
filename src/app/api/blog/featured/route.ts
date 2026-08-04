/**
 * GET /api/blog/featured — list featured published blog posts (max 6) (public).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { findFeatured } from "@/server/models/blog";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const posts = await findFeatured();
  return success(posts, "Featured posts retrieved");
}
