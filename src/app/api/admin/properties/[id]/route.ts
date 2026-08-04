/**
 * GET /api/admin/properties/{id} — get a single property (admin only).
 * PUT /api/admin/properties/{id} — update a property (admin only).
 * DELETE /api/admin/properties/{id} — delete a property (admin only).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { success, error } from "@/server/response";
import { authenticateAdmin, isUser } from "@/server/auth";
import { fetchOne, execute, query } from "@/server/db";
import { readJson } from "@/server/http";
import { deleteByUrl } from "@/server/cloudinary";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const idNum = Number(id);
  if (idNum <= 0) return error("Invalid property ID", 400);

  const row = await fetchOne("SELECT * FROM properties WHERE id = ?", [idNum]);
  if (!row) return error("Property not found", 404);

  row.amenities = safeJson(row.amenities, []);
  row.featured = Boolean(row.featured);
  row.is_verified = Boolean(row.is_verified);
  row.is_off_plan = Boolean(row.is_off_plan);
  row.is_active = Number(row.is_active);

  return success({ property: row });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const idNum = Number(id);
  if (idNum <= 0) return error("Invalid property ID", 400);

  const input = await readJson(req);
  if (!input || Object.keys(input).length === 0) return error("No data provided", 400);

  const fields: string[] = [];
  const binds: unknown[] = [];

  for (const f of ["title", "description", "type", "purpose", "price", "nightly_price", "min_stay", "max_stay", "beds", "baths", "area", "city", "community", "address", "lat", "lng", "image", "video_url", "virtual_tour_url", "floor_plan_url", "is_off_plan", "completion_date"]) {
    if (!(f in input)) continue;
    if (f === "price" && input[f] === "") continue;
    fields.push(`${f} = ?`);
    const val = input[f];
    if (f === "is_off_plan") {
      binds.push(val ? 1 : 0);
    } else if (f === "completion_date") {
      binds.push(val === "" || val === null || val === undefined ? null : val);
    } else if (["price", "nightly_price", "max_stay"].includes(f)) {
      binds.push(val === "" || val === null || val === undefined ? null : Number(val));
    } else if (f === "min_stay") {
      binds.push(val === "" || val === null || val === undefined ? 1 : Number(val));
    } else if (["beds", "baths", "area"].includes(f)) {
      binds.push(Number(val));
    } else if (["lat", "lng"].includes(f)) {
      binds.push(Number(val));
    } else {
      binds.push(val);
    }
  }

  if ("amenities" in input) {
    fields.push("amenities = ?");
    binds.push(JSON.stringify(input.amenities));
  }
  if ("status" in input) {
    fields.push("is_active = ?");
    binds.push(input.status === "published" ? 1 : input.status === "archived" ? 2 : 0);
  }

  if (fields.length === 0) return error("No fields to update", 400);

  if ("title" in input) {
    fields.push("slug = ?");
    binds.push(await generateSlug(String(input.title), idNum));
  }

  fields.push("updated_at = NOW()");
  binds.push(idNum);

  const sql = `UPDATE properties SET ${fields.join(", ")} WHERE id = ?`;
  await execute(sql, binds);

  if ("image" in input && input.image) {
    const primaryImage = await fetchOne("SELECT id FROM property_images WHERE property_id = ? AND is_primary = 1", [idNum]);
    if (primaryImage) {
      await execute("UPDATE property_images SET file_path = ? WHERE id = ?", [input.image, primaryImage.id]);
    } else {
      await execute(
        "INSERT INTO property_images (property_id, file_path, file_name, file_size, mime_type, is_primary) VALUES (?, ?, ?, ?, ?, 1)",
        [idNum, input.image, "main", 0, "image/jpeg"]
      );
    }
  }

  await execute(
    "INSERT INTO activity_logs (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)",
    [auth.id, "update_property", "property", idNum]
  );

  return success({ id: idNum }, "Property updated");
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const auth = await authenticateAdmin(req);
  if (!isUser(auth)) return auth as NextResponse;

  const { id } = await params;
  const idNum = Number(id);
  if (idNum <= 0) return error("Invalid property ID", 400);

  try {
    for (const table of ["property_images", "property_videos"]) {
      if (await tableExists(table)) {
        const rows = await query(`SELECT file_path FROM ${table} WHERE property_id = ?`, [idNum]);
        for (const row of rows) {
          if (row?.file_path) {
            await deleteByUrl(row.file_path);
          }
        }
        await execute(`DELETE FROM ${table} WHERE property_id = ?`, [idNum]);
      }
    }

    for (const table of ["off_plan_progress", "property_verifications", "property_documents", "property_bookings", "property_availability"]) {
      if (await tableExists(table)) {
        await execute(`DELETE FROM ${table} WHERE property_id = ?`, [idNum]);
      }
    }

    if (await tableExists("investment_properties")) {
      await execute("UPDATE investment_properties SET property_id = NULL WHERE property_id = ?", [idNum]);
    }

    await execute("DELETE FROM properties WHERE id = ?", [idNum]);

    await execute(
      "INSERT INTO activity_logs (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)",
      [auth.id, "delete_property", "property", idNum]
    );

    return success(null, "Property deleted");
  } catch (err) {
    return error("Database error: " + (err as Error).message, 500);
  }
}

async function tableExists(table: string): Promise<boolean> {
  const row = await fetchOne(
    "SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
    [table]
  );
  return Number(row?.c ?? 0) > 0;
}

async function generateSlug(title: string, excludeId: number | null = null): Promise<string> {
  let slug = String(title).trim().toLowerCase();
  slug = slug.replace(/[^a-z0-9\s-]/g, "");
  slug = slug.replace(/[\s-]+/g, "-");
  slug = slug.replace(/^-+|-+$/g, "");

  const original = slug;
  let counter = 1;
  while (true) {
    const row = excludeId
      ? await fetchOne("SELECT COUNT(*) AS c FROM properties WHERE slug = ? AND id != ?", [slug, excludeId])
      : await fetchOne("SELECT COUNT(*) AS c FROM properties WHERE slug = ?", [slug]);
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
