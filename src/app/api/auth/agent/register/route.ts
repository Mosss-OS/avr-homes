/**
 * POST /api/auth/agent/register — register a new agent account with user,
 * agent profile, subscription, and wallet.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Validator } from "@/server/validator";
import { error, success } from "@/server/response";
import { generateToken, generateRefreshToken } from "@/server/auth";
import { generateSlug } from "@/server/models/agent";
import { execute, fetchOne, beginTransaction, txExecute, commit, rollback } from "@/server/db";
import { readJson } from "@/server/http";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const input = await readJson(req);

  const validator = new Validator(input);
  validator
    .required("name", "Full Name")
    .string("name", "Full Name", 100)
    .required("email", "Email")
    .email("email", "Email")
    .required("password", "Password")
    .minLength("password", 6, "Password")
    .required("phone", "Phone Number")
    .string("phone", "Phone Number", 30);

  if (validator.fails()) {
    return error("Validation failed", 422, validator.getErrors());
  }

  const data = validator.validated();

  const existing = await fetchOne("SELECT id FROM users WHERE email = ?", [data.email]);
  if (existing) {
    return error("An account with this email already exists", 422, {
      email: ["Email is already registered"],
    });
  }

  const hashedPassword = bcrypt.hashSync(String(data.password), 12);

  const conn = await beginTransaction();
  try {
    const userResult = await txExecute(
      conn,
      "INSERT INTO users (name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?)",
      [data.name, data.email, hashedPassword, "agent", 1]
    );
    const userId = Number(userResult.insertId ?? 0);

    const slug = await generateSlug(String(data.name));

    await txExecute(
      conn,
      `INSERT INTO agents (user_id, slug, photo_url, name, agency, phone, email, whatsapp, languages, bio, avatar_hue,
        experience, state, city, lasrera_number, niesv_number, avg_monthly_listings, property_types,
        avg_deal_size, specialization, social_instagram, social_facebook, social_linkedin, social_tiktok,
        social_youtube, why_join, support_needed, referral_source, is_verified, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        slug,
        null,
        data.name,
        data.agency ?? "AVR Homes",
        data.phone,
        data.email,
        data.whatsapp ?? data.phone,
        JSON.stringify(data.languages ?? ["English"]),
        data.bio ?? null,
        Math.floor(Math.random() * 361),
        data.experience ?? null,
        data.state ?? null,
        data.city ?? null,
        data.lasrera_number ?? null,
        data.niesv_number ?? null,
        data.avg_monthly_listings ?? null,
        JSON.stringify(data.property_types ?? []),
        data.avg_deal_size ?? null,
        JSON.stringify(data.specialization ?? []),
        data.social_instagram ?? null,
        data.social_facebook ?? null,
        data.social_linkedin ?? null,
        data.social_tiktok ?? null,
        data.social_youtube ?? null,
        data.why_join ?? null,
        JSON.stringify(data.support_needed ?? []),
        data.referral_source ?? null,
        0,
        1,
      ]
    );

    await txExecute(
      conn,
      "INSERT INTO agent_subscriptions (agent_id, tier, status, listings_limit, featured_slots, current_period_start, current_period_end) VALUES (?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH))",
      [userId, "free", "active", 3, 0]
    );

    await txExecute(
      conn,
      "INSERT INTO agent_wallets (agent_id, balance, total_earned, total_withdrawn) VALUES (?, 0, 0, 0)",
      [userId]
    );

    await commit(conn);

    const token = generateToken(userId);
    const refreshToken = await generateRefreshToken(userId);

    return success(
      {
        id: userId,
        token,
        refresh_token: refreshToken,
        user: {
          id: userId,
          name: data.name,
          email: data.email,
          role: "agent",
        },
      },
      "Registration successful",
      201
    );
  } catch (err) {
    await rollback(conn).catch(() => {});
    return error("Registration failed: " + (err as Error).message, 500);
  }
}
