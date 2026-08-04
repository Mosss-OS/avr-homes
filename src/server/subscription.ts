/**
 * Subscription-based access control for agent features.
 *
 * Enforces listing limits and featured-slot limits based on the agent's
 * active subscription tier. Mirrors the PHP `SubscriptionMiddleware`.
 *
 * @module server/subscription
 */

import { fetchOne } from "./db";
import { error } from "./response";
import type { NextResponse } from "next/server";

interface SubscriptionRow {
  tier: string;
  listings_limit: number | null;
  current_listings: number | null;
  featured_slots: number | null;
}

/**
 * Check whether the agent has remaining listing slots on their plan.
 * Returns a NextResponse error when the limit is hit, or null on success.
 */
export async function checkListingLimit(userId: number): Promise<NextResponse | null> {
  const sub = await fetchOne(
    `SELECT s.tier, s.listings_limit,
            (SELECT COUNT(*) FROM properties p
             JOIN agents a ON p.agent_id = a.id
             WHERE a.user_id = ? AND p.is_active = 1) as current_listings
     FROM agent_subscriptions s
     WHERE s.agent_id = ? AND s.status = 'active'
     ORDER BY s.current_period_start DESC LIMIT 1`,
    [userId, userId]
  ) as SubscriptionRow | null;

  const tier = sub?.tier ?? "free";
  const currentListings = Number(sub?.current_listings ?? 0);
  const limit = Number(sub?.listings_limit ?? 3);

  if (tier === "platinum") return null;
  if (limit > 0 && currentListings >= limit) {
    return error(`Listing limit reached (${limit}). Upgrade your plan to add more listings.`, 403);
  }
  return null;
}

/**
 * Check whether the agent has featured slots remaining on their plan.
 * Returns a NextResponse error when none remain, or null on success.
 */
export async function checkFeaturedLimit(userId: number): Promise<NextResponse | null> {
  const sub = await fetchOne(
    `SELECT s.tier, s.featured_slots
     FROM agent_subscriptions s
     WHERE s.agent_id = ? AND s.status = 'active'
     ORDER BY s.current_period_start DESC LIMIT 1`,
    [userId]
  ) as SubscriptionRow | null;

  const tier = sub?.tier ?? "free";
  const featuredSlots = Number(sub?.featured_slots ?? 0);

  if (tier === "platinum") return null;
  if (featuredSlots <= 0) {
    return error("No featured slots remaining. Upgrade to add featured listings.", 403);
  }
  return null;
}
