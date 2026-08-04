/**
 * GET /api/auth/me — return the authenticated user's details
 * (includes agent profile for agent role).
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticate, isUser } from "@/server/auth";
import { error, success } from "@/server/response";
import { fetchOne } from "@/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authResult = await authenticate(req);
  if (!isUser(authResult)) return authResult as NextResponse;
  const user = authResult;

  if (user.role === "agent") {
    const profile = await fetchOne(
      `SELECT id, slug, photo_url, name, agency, phone, email, whatsapp, languages, listings, avatar_hue, bio,
        experience, state, city, lasrera_number, niesv_number, avg_monthly_listings, property_types,
        avg_deal_size, specialization, social_instagram, social_facebook, social_linkedin, social_tiktok,
        social_youtube, why_join, support_needed, referral_source, is_verified, created_at
       FROM agents WHERE user_id = ? AND is_active = 1`,
      [user.id]
    );

    if (profile) {
      profile.id = Number(profile.id);
      profile.listings = Number(profile.listings);
      profile.avatar_hue = Number(profile.avatar_hue);
      profile.is_verified = Boolean(profile.is_verified);
      profile.languages = safeJson(profile.languages, []);
      profile.property_types = safeJson(profile.property_types, []);
      profile.specialization = safeJson(profile.specialization, []);
      profile.support_needed = safeJson(profile.support_needed, []);
    }

    return success({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profile,
    });
  }

  return success({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
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
