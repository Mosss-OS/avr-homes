/**
 * GET /api/admin/properties — list properties with pagination, filtering, and search (admin only).
 * POST /api/admin/properties — create a new property (admin only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchOne, fetchAll, execute } from "@/server/db";
import { readJson } from "@/server/http";
import { Validator } from "@/server/validator";
import { getClientIp } from "@/server/rate-limiter";
import { companyAgentDefaults } from "@/server/models/property";
import { upload } from "@/server/cloudinary";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const perPage = Math.min(50, Math.max(1, Number(sp.get("per_page") ?? 20)));
  const status = sp.get("status") ?? null;
  const purpose = sp.get("purpose") ?? null;
  const search = sp.get("q") ?? null;

  const conditions: string[] = ["1=1"];
  const binds: unknown[] = [];

  if (status === "active") conditions.push("p.is_active = 1");
  else if (status === "draft") conditions.push("p.is_active = 0");
  else if (status === "archived") conditions.push("p.is_active = 2");

  if (purpose) {
    conditions.push("p.purpose = ?");
    binds.push(purpose);
  }
  if (search) {
    conditions.push("(p.title LIKE ? OR p.city LIKE ? OR p.community LIKE ?)");
    const like = `%${search}%`;
    binds.push(like, like, like);
  }

  const where = conditions.join(" AND ");

  const countRow = await fetchOne(`SELECT COUNT(*) FROM properties p WHERE ${where}`, binds);
  const total = Number(countRow?.[Object.keys(countRow)[0]] ?? 0);

  const offset = (page - 1) * perPage;
  const rows = await fetchAll(
    `SELECT p.*, a.name as agent_name, a.agency as agent_agency
     FROM properties p
     LEFT JOIN agents a ON p.agent_id = a.id
     WHERE ${where}
     ORDER BY p.created_at DESC LIMIT ${perPage} OFFSET ${offset}`,
    binds
  );

  const defaults = await companyAgentDefaults();
  const data = rows.map((r: any) => {
    let merged = { ...r };
    if (!r.agent_name) {
      merged = { ...r, ...defaults };
    }
    merged.id = Number(merged.id);
    merged.price = Number(merged.price);
    merged.nightly_price = merged.nightly_price !== null ? Number(merged.nightly_price) : null;
    merged.beds = Number(merged.beds);
    merged.baths = Number(merged.baths);
    merged.area = Number(merged.area);
    merged.featured = Boolean(merged.featured);
    merged.is_verified = Boolean(merged.is_verified);
    merged.amenities = safeJson(merged.amenities, []);
    return merged;
  });

  return success(
    {
      data,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    },
    "Properties retrieved"
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const ct = req.headers.get("content-type") ?? "";
  let input: Record<string, any> = {};
  let imageFile: { name: string; type: string; data: Buffer } | null = null;

  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    for (const [key, value] of fd.entries()) {
      if (value instanceof File) {
        if (key === "image") {
          imageFile = {
            name: value.name,
            type: value.type,
            data: Buffer.from(await value.arrayBuffer()),
          };
        }
      } else {
        input[key] = value;
      }
    }
  } else {
    input = await readJson(req);
  }

  const purpose = input.purpose ?? "buy";
  const validator = new Validator(input);
  validator.required("title", "Title").required("description", "Description");
  if (purpose !== "shortlet") {
    validator.required("price", "Price");
  }
  if (validator.fails()) {
    return error("Validation failed", 422, validator.getErrors());
  }

  const data = validator.validated();

  const slug = await generateSlug(String(data.title));

  let imageUrl: string | null = null;
  let imageBytes = 0;
  if (imageFile && imageFile.data.length > 0) {
    const result = await upload(imageFile.data, imageFile.name, "image", { folder: "avr-homes/properties" });
    if (result.success && result.url) {
      imageUrl = result.url;
      imageBytes = imageFile.data.length;
    }
  }

  const amenities = typeof input.amenities === "string"
    ? JSON.stringify(safeJson(input.amenities, []))
    : JSON.stringify(input.amenities ?? []);

  const price =
    purpose === "shortlet"
      ? (input.price !== undefined && input.price !== "" ? Number(input.price) : Number(input.nightly_price ?? 0))
      : Number(input.price ?? 0);
  const rawNightly = input.nightly_price;
  const nightlyPrice = rawNightly === "" || rawNightly === null || rawNightly === undefined ? null : Number(rawNightly);
  const rawMinStay = input.min_stay;
  const minStay = rawMinStay === "" || rawMinStay === null || rawMinStay === undefined ? 1 : Number(rawMinStay);
  const rawMaxStay = input.max_stay;
  const maxStay = rawMaxStay === "" || rawMaxStay === null || rawMaxStay === undefined ? null : Number(rawMaxStay);
  const rawCompletion = input.completion_date;
  const completionDate = rawCompletion === "" || rawCompletion === null || rawCompletion === undefined ? null : rawCompletion;

  const result = await execute(
    `INSERT INTO properties (title, slug, description, type, purpose, price, nightly_price, min_stay, max_stay, beds, baths, area, amenities,
      city, community, address, lat, lng, image, video_url, virtual_tour_url, floor_plan_url,
      is_off_plan, completion_date, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      data.title, slug, data.description, input.type ?? "apartment", purpose,
      price, nightlyPrice, minStay, maxStay,
      Number(input.beds ?? 0), Number(input.baths ?? 0), Number(input.area ?? 0),
      amenities, input.city ?? "", input.community ?? "", input.address ?? "",
      Number(input.lat ?? 0), Number(input.lng ?? 0), imageUrl,
      input.video_url ?? "", input.virtual_tour_url ?? "", input.floor_plan_url ?? "",
      input.is_off_plan ? 1 : 0,
      completionDate,
      (input.status ?? "published") === "published" ? 1 : 0,
    ]
  );

  const newId = Number(result.insertId);

  if (imageUrl) {
    await execute(
      "INSERT INTO property_images (property_id, file_path, file_name, file_size, mime_type, is_primary) VALUES (?, ?, ?, ?, ?, 1)",
      [newId, imageUrl, "main", imageBytes, "image/jpeg"]
    );
  }

  await execute(
    "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)",
    [auth.id, "create_property", "property", newId, getClientIp(req)]
  );

  return success({ id: newId }, "Property created successfully", 201);
}

async function generateSlug(title: string): Promise<string> {
  let slug = String(title).trim().toLowerCase();
  slug = slug.replace(/[^a-z0-9\s-]/g, "");
  slug = slug.replace(/[\s-]+/g, "-");
  slug = slug.replace(/^-+|-+$/g, "");

  const original = slug;
  let counter = 1;
  while (true) {
    const row = await fetchOne("SELECT COUNT(*) AS c FROM properties WHERE slug = ?", [slug]);
    if (Number(row?.c ?? 0) === 0) break;
    slug = `${original}-${counter}`;
    counter++;
  }
  return slug;
}

function safeJson(value: unknown, fallback: unknown): unknown {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value as string);
  } catch {
    return fallback;
  }
}
