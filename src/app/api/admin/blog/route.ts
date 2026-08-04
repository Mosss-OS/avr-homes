/**
 * GET /api/admin/blog — list blog posts with pagination and search (admin only).
 * POST /api/admin/blog — create a new blog post (admin).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, authenticateAgent, isUser } from "@/server/auth";
import { fetchOne, fetchAll } from "@/server/db";
import { readJson } from "@/server/http";
import { Validator } from "@/server/validator";
import { create } from "@/server/models/blog";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const perPage = Math.min(50, Math.max(1, Number(sp.get("per_page") ?? 20)));
  const search = sp.get("q") ?? null;

  const conditions: string[] = ["1=1"];
  const binds: unknown[] = [];

  if (search) {
    conditions.push("(p.title LIKE ?)");
    binds.push(`%${search}%`);
  }

  const where = conditions.join(" AND ");

  let rows: any[] = [];
  let total = 0;

  try {
    const countRow = await fetchOne(`SELECT COUNT(*) FROM blog_posts p WHERE ${where}`, binds);
    total = Number(countRow?.[Object.keys(countRow)[0]] ?? 0);

    const offset = (page - 1) * perPage;
    rows = await fetchAll(
      `SELECT p.*, c.name as category_name, u.name as author_name
       FROM blog_posts p
       LEFT JOIN blog_categories c ON p.category_id = c.id
       LEFT JOIN users u ON p.author_id = u.id
       WHERE ${where}
       ORDER BY p.created_at DESC LIMIT ${perPage} OFFSET ${offset}`,
      binds
    );
  } catch {
    rows = [];
    total = 0;
  }

  const data = rows.map((r: any) => ({
    ...r,
    id: Number(r.id),
    category_id: Number(r.category_id),
    is_published: r.status === "published",
    is_featured: Boolean(r.is_featured),
  }));

  return success(
    {
      data,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    },
    "Blog posts retrieved"
  );
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
