/**
 * GET /api/blog/categories — list all blog categories with their published post count (public).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success } from "@/server/response";
import { findCategories } from "@/server/models/blog";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const categories = await findCategories();
  return success(categories, "Categories retrieved");
}
