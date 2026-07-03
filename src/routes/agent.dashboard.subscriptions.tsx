import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Calendar, ArrowRight, CheckCircle, XCircle, AlertTriangle, Crown, Zap, Star } from "lucide-react";

export const Route = createFileRoute("/agent/dashboard/subscriptions")({
  head: () => ({ meta: [{ title: "Subscription — AVR Homes" }] }),
  component: SubscriptionPage,
});

interface Subscription {
  tier: string;
  status: string;
  listings_limit: number;
  featured_slots: number;
  lead_priority: number;
  analytics_access: boolean;
  verification_priority: number;
  dedicated_manager: boolean;
  current_period_start: string;
  current_period_end: string;
  cancelled_at: string | null;
}

function SubscriptionPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) return;
    loadSubscription();
  }, [user, authLoading]);

  async function loadSubscription() {
    try {
      setLoading(true);
      const res = await api.get<Subscription>("/api/agent/subscription");
      setSubscription(res.data);
    } catch {
      setError("Failed to load subscription details");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade(tier: string) {
    if (tier === subscription?.tier) return;

    try {
      setUpgrading(true);
      const res = await api.post<{ subscription: Subscription }>("/api/agent/subscription/upgrade", { tier });
      setSubscription(res.data.subscription);
    } catch {
      setError("Failed to upgrade subscription. Please try again.");
    } finally {
      setUpgrading(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel your subscription? This will end at the current period end.")) return;
    try {
      setCanceling(true);
      await api.post("/api/agent/subscription/cancel");
      await loadSubscription();
    } catch {
      setError("Failed to cancel subscription. Please try again.");
    } finally {
      setCanceling(false);
    }
  }

  const tierDetails = {
    free: { name: "Free", color: "bg-gray-500/10 text-gray-600 border-gray-200", icon: Zap, price: "₦0" },
    bronze: { name: "Bronze", color: "bg-orange-500/10 text-orange-600 border-orange-200", icon: Star, price: "₦15,000" },
    silver: { name: "Silver", color: "bg-slate-500/10 text-slate-600 border-slate-200", icon: Crown, price: "₦35,000" },
gold: { name: "Gold", color: "bg-yellow-500/10 text-yellow-600 border-yellow-200", icon: Crown, price: "₦75,000" },
    platinum: { name: "Platinum", color: "bg-purple-500/10 text-purple-600 border-purple-200", icon: Crown, price: "₦150,000" },
  };

  const getFeature = (key: string, tier: string) => {
    const features = {
      listings_limit: {
        free: "3 listings",
        bronze: "10 listings",
        silver: "25 listings",
        gold: "50 listings",
        platinum: "Unlimited",
      },
      featured_slots: {
        free: "0",
        bronze: "1 per month",
        silver: "3 per month",
        gold: "10 per month",
        platinum: "Unlimited",
      },
      lead_priority: {
        free: "Basic",
        bronze: "Priority",
        silver: "Priority + SMS",
        gold: "Full + Analytics",
        platinum: "Full",
      },
      analytics_access: {
        free: false,
        bronze: false,
        silver: false,
        gold: true,
        platinum: true,
      },
      verification_priority: {
        free: "Manual",
        bronze: "Fast-track",
        silver: "Fast-track",
        gold: "Dedicated",
        platinum: "Dedicated",
      },
      dedicated_manager: {
        free: false,
        bronze: false,
        silver: false,
        gold: true,
        platinum: true,
      },
    };
    return features[key as keyof typeof features]?.[tier as keyof typeof features.free] ?? false;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-destructive">{error}</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!subscription) return null;

  const currentTier = tierDetails[subscription.tier as keyof typeof tierDetails];
  const nextTier = subscription.tier === "free" ? "bronze" : subscription.tier === "bronze" ? "silver" : subscription.tier === "silver" ? "gold" : null;

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Subscription</h1>
        <p className="text-sm text-muted-foreground">Manage your agent subscription and billing</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Current Subscription Card */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">Current Plan: {currentTier.name}</h2>
              <p className="text-sm text-muted-foreground">Monthly fee: {currentTier.price}</p>
            </div>
            <div className={`rounded-2xl px-3 py-1 border ${currentTier.color} flex items-center gap-1.5`}>
              <currentTier.icon className="h-4 w-4" />
              <span className="font-medium text-sm">{subscription.status === "active" ? "Active" : "Cancelled"}</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground mb-3">INCLUDED FEATURES</h3>
            <div className="grid gap-2">
              {[
                { label: "Listings", value: getFeature("listings_limit", subscription.tier) },
                { label: "Featured slots", value: getFeature("featured_slots", subscription.tier) },
                { label: "Lead priority", value: getFeature("lead_priority", subscription.tier) },
                { label: "Analytics access", value: getFeature("analytics_access", subscription.tier) },
                { label: "Verification priority", value: get("verification_priority", subscription.tier) },
                { label: "Dedicated manager", value: getFeature("dedicated_manager", subscription.tier) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Period Start</p>
              <p className="font-medium text-sm">{new Date(subscription.current_period_start).toLocaleDateString()}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Renews on</p>
              <p className="font-medium text-sm">{new Date(subscription.current_period_end).toLocaleDateString()}</p>
            </div>
          </div>

          {subscription.cancelled_at && (
            <div className="mt-4 rounded-lg bg-amber-500/10 p-3 border border-amber-200">
              <p className="text-sm text-amber-700">Subscription cancelled. Access continues until {new Date(subscription.current_period_end).toLocaleDateString()}.</p>
            </div>
          )}
        </div>

        {/* Upgrade Card */}
        <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] p-6">
          <h3 className="font-display text-lg font-semibold mb-4">Upgrade Plan</h3>

          {nextTier ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <nextTier.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{currentTier.name} → {tierDetails[nextTier].name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Next month</span>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>• {getFeature("listings_limit", nextTier)} (vs {getFeature("listings_limit", subscription.tier)})</p>
                  <p>• {getFeature("featured_slots", nextTier)} (vs {getFeature("featured_slots", subscription.tier)})</p>
                  <p>• {getFeature("lead_priority", nextTier)} (vs {getFeature("lead_priority", subscription.tier)})</p>
                  <p>• Analytics: {getFeature("analytics_access", nextTier) ? "Yes" : "No"}</p>
                </div>
              </div>

              <button
                onClick={() => handleUpgrade(nextTier)}
                disabled={upgrading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {upgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upgrade Now"}
                <ArrowRight className="h-4 w-4" />
              </button>

              {subscription.status !== "active" && (
                <div className="rounded-lg bg-amber-500/10 p-3 border border-amber-200">
                  <p className="text-xs text-amber-700">Upgrade will take effect on the next billing cycle.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Crown className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="font-medium mb-1">You’re on the highest tier</p>
              <p className="text-xs text-muted-foreground">Platinum offers unlimited everything</p>
            </div>
          )}

          {/* Cancel Section */}
          {subscription.status === "active" && subscription.tier !== "free" && (
            <div className="mt-6 pt-6 border-t border-border">
              <h4 className="font-medium text-sm mb-3">Cancel Subscription</h4>
              <button
                onClick={handleCancel}
                disabled={canceling}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-destructive bg-destructive/5 px-4 py-2.5 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
              >
                {canceling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel Subscription"}
                <XCircle className="h-4 w-4" />
              </button>
              <p className="mt-2 text-xs text-muted-foreground">You'll keep access until the end of your billing period.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
