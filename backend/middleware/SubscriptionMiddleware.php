<?php

/**
 * Subscription-based access control for agent features.
 *
 * Enforces listing limits and featured-slot limits based on
 * the agent's active subscription tier.
 *
 * @package AvrHomes
 */

/**
 * Middleware that checks subscription limits before allowing operations.
 */
class SubscriptionMiddleware
{
  /**
   * Check whether the agent has remaining listing slots on their plan.
   *
   * @param int $userId The authenticated user ID.
   */
  public static function checkListingLimit(int $userId): void
  {
    $db = Database::getConnection();

    $stmt = $db->prepare(
      "SELECT s.tier, s.listings_limit, 
             (SELECT COUNT(*) FROM properties p 
              JOIN agents a ON p.agent_id = a.id 
              WHERE a.user_id = ? AND p.is_active = 1) as current_listings
       FROM agent_subscriptions s 
       WHERE s.agent_id = ? AND s.status = 'active'
       ORDER BY s.current_period_start DESC LIMIT 1"
    );
    $stmt->execute([$userId, $userId]);
    $subscription = $stmt->fetch();

    $tier = $subscription['tier'] ?? 'free';
    $currentListings = (int)$subscription['current_listings'] ?? 0;
    $limit = (int)$subscription['listings_limit'] ?? 3;

    if ($tier === 'platinum') {
      return;
    }

    if ($limit > 0 && $currentListings >= $limit) {
      Response::error(
        "Listing limit reached ({$limit}). Upgrade your plan to add more listings.",
        403
      );
    }
  }

  /**
   * Check whether the agent has featured slots remaining on their plan.
   *
   * @param int $userId The authenticated user ID.
   */
  public static function checkFeaturedLimit(int $userId): void
  {
    $db = Database::getConnection();

    $stmt = $db->prepare(
      "SELECT s.tier, s.featured_slots
       FROM agent_subscriptions s 
       WHERE s.agent_id = ? AND s.status = 'active'
       ORDER BY s.current_period_start DESC LIMIT 1"
    );
    $stmt->execute([$userId]);
    $subscription = $stmt->fetch();

    $tier = $subscription['tier'] ?? 'free';
    $featuredSlots = (int)$subscription['featured_slots'] ?? 0;

    if ($tier === 'platinum') {
      return;
    }

    if ($featuredSlots <= 0) {
      Response::error('No featured slots remaining. Upgrade to add featured listings.', 403);
    }
  }

  /**
   * Convenience: authenticate as agent and check listing limits in one call.
   *
   * @param array $params Unused (matches route handler signature convention).
   * @return array<string,mixed> Authenticated user row.
   */
  public static function agentAuthAndSubscription(array $params): array
  {
    $user = AuthMiddleware::authenticateAgent();

    if ($user['role'] === 'agent') {
      self::checkListingLimit((int)$user['id']);
    }

    return $user;
  }
}
