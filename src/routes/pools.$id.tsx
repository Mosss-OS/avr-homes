import { createFileRoute, Link, Outlet, useMatches, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { api, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import {
  ArrowLeft,
  Loader2,
  Users,
  MapPin,
  ShieldCheck,
  CalendarDays,
  AlertTriangle,
  HandCoins,
  CreditCard,
  CheckCircle2,
  LogIn,
} from "lucide-react";

export const Route = createFileRoute("/pools/$id")({
  component: PoolDetail,
});

interface Pool {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  image: string | null;
  target_property_id: number | null;
  target_amount: number;
  current_raised: number;
  member_count: number;
  default_monthly: number | null;
  min_monthly: number | null;
  max_monthly: number | null;
  min_lump_sum: number | null;
  allow_monthly: boolean;
  allow_lump_sum: boolean;
  penalty_rate: number;
  grace_days: number;
  reminder_days: number[];
  status: string;
  funding_percentage: number;
  property_title: string | null;
  property_city: string | null;
  property_image: string | null;
  property_address: string | null;
  is_member?: boolean;
}

const FALLBACK: Pool[] = [
  {
    id: 1,
    title: "Test Dream Home Pool",
    slug: "test-dream-home-pool",
    description:
      "A test pooled investment for verifying the ajo/esusu contribution system.",
    image: null,
    target_property_id: null,
    target_amount: 10000000,
    current_raised: 250000,
    member_count: 2,
    default_monthly: 250000,
    min_monthly: 50000,
    max_monthly: 2000000,
    min_lump_sum: 100000,
    allow_monthly: true,
    allow_lump_sum: true,
    penalty_rate: 5,
    grace_days: 7,
    reminder_days: [7, 3, 1],
    status: "active",
    funding_percentage: 2,
    property_title: null,
    property_city: null,
    property_image: null,
    property_address: null,
  },
  {
    id: 2,
    title: "Group Rent — Lagos Island",
    slug: "group-rent-lagos-island",
    description:
      "Pool monthly contributions to cover the annual rent of a premium 3-bedroom apartment on Lagos Island. Once funded, the group secures a one-year lease.",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
    target_property_id: null,
    target_amount: 36000000,
    current_raised: 9000000,
    member_count: 4,
    default_monthly: 500000,
    min_monthly: 250000,
    max_monthly: 2000000,
    min_lump_sum: 250000,
    allow_monthly: true,
    allow_lump_sum: true,
    penalty_rate: 5,
    grace_days: 7,
    reminder_days: [7, 3, 1],
    status: "active",
    funding_percentage: 25,
    property_title: null,
    property_city: null,
    property_image: null,
    property_address: null,
  },
  {
    id: 3,
    title: "Co-Buy Home — Lekki Phase 1",
    slug: "co-buy-home-lekki-phase-1",
    description:
      "Pool monthly or one-time contributions to co-own a 4-bedroom duplex in Lekki Phase 1. The duplex is acquired in the group's name once the target is funded.",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
    target_property_id: null,
    target_amount: 250000000,
    current_raised: 18000000,
    member_count: 3,
    default_monthly: 1000000,
    min_monthly: 500000,
    max_monthly: 10000000,
    min_lump_sum: 1000000,
    allow_monthly: true,
    allow_lump_sum: true,
    penalty_rate: 5,
    grace_days: 7,
    reminder_days: [7, 3, 1],
    status: "active",
    funding_percentage: 7,
    property_title: null,
    property_city: null,
    property_image: null,
    property_address: null,
  },
  {
    id: 4,
    title: "Land Co-Purchase — Epe Waterfront",
    slug: "land-co-purchase-epe-waterfront",
    description:
      "Group purchase of an approved waterfront land plot in Epe. Members contribute monthly or one-time; the C of O is registered in the group's name once funded.",
    image: "https://images.unsplash.com/photo-1581093458791-9d42e3c4e117?w=800",
    target_property_id: null,
    target_amount: 180000000,
    current_raised: 10000000,
    member_count: 4,
    default_monthly: 1500000,
    min_monthly: 500000,
    max_monthly: 10000000,
    min_lump_sum: 1000000,
    allow_monthly: true,
    allow_lump_sum: true,
    penalty_rate: 5,
    grace_days: 7,
    reminder_days: [7, 3, 1],
    status: "active",
    funding_percentage: 5,
    property_title: null,
    property_city: null,
    property_image: null,
    property_address: null,
  },
];

function PoolDetail() {
  const { id } = Route.useParams();
  const matches = useMatches();
  const hasPaymentChild = matches.some((m) => m.routeId === "/pools/$id/payment");
  const { user, isAgent } = useAuth();
  const navigate = useNavigate();

  const [pool, setPool] = useState<Pool | null>(null);
  const [loading, setLoading] = useState(true);
  const [planType, setPlanType] = useState<"monthly" | "lump_sum" | "both">("monthly");
  const [monthlyAmount, setMonthlyAmount] = useState<number | null>(null);
  const [lumpAmount, setLumpAmount] = useState<number | null>(null);
  const [autoDebit, setAutoDebit] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const applyFallback = () => {
      if (cancelled) return;
      const found = FALLBACK.find((f) => f.id === Number(id));
      if (found) setPool(found);
      setLoading(false);
    };
    const timer = setTimeout(applyFallback, 6000);
    api
      .get<Pool>(`/api/pools/${id}`)
      .then((r) => {
        if (!cancelled) {
          clearTimeout(timer);
          setPool(r.data);
        }
      })
      .catch(applyFallback)
      .finally(() => {
        if (!cancelled) {
          clearTimeout(timer);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id]);

  useEffect(() => {
    if (pool && pool.default_monthly) setMonthlyAmount(pool.default_monthly);
  }, [pool?.id]);

  if (hasPaymentChild) return <Outlet />;

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <p className="text-lg font-semibold">Pool not found</p>
        <Link to="/pools" className="mt-2 inline-flex items-center gap-1 text-sm text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to pools
        </Link>
      </div>
    );
  }

  const minMonthly = pool.min_monthly ?? 0;
  const maxMonthly = pool.max_monthly ?? 0;
  const canMonthly = pool.allow_monthly;
  const canLump = pool.allow_lump_sum;
  const monthlyPlans =
    canMonthly && canLump
      ? ["monthly", "lump_sum", "both"]
      : canMonthly
        ? ["monthly"]
        : ["lump_sum"];
  const effectivePlan =
    planType === "lump_sum" && !canLump
      ? "monthly"
      : planType === "monthly" && !canMonthly
        ? "lump_sum"
        : planType;

  async function handleJoin() {
    setError(null);
    if (!user || !pool) return;
    const body: Record<string, unknown> = { plan_type: effectivePlan };
    if (effectivePlan !== "lump_sum") {
      body.monthly_amount = monthlyAmount || pool.default_monthly;
      body.auto_debit = autoDebit;
    } else {
      body.auto_debit = false;
    }
    setJoining(true);
    try {
      const res = await api.post<{
        membership_id: number;
        first_schedule_id: number | null;
        plan_type: string;
        monthly_amount: number | null;
      }>(`/api/pools/${pool.id}/join`, body);
      const { membership_id, first_schedule_id, plan_type } = res.data;
      const search: Record<string, unknown> = { membership_id };
      if (plan_type !== "lump_sum") {
        search.type = "schedule";
        if (first_schedule_id) search.schedule_id = first_schedule_id;
        if (autoDebit) search.auto_debit = 1;
      } else {
        search.type = "lump_sum";
        search.amount = lumpAmount || pool.min_lump_sum || undefined;
      }
      navigate({
        to: "/pools/$id/payment",
        params: { id: String(pool.id) },
        search: search as never,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to join pool");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link
        to="/pools"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to pools
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* Left: details */}
        <div>
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl">
            <img
              src={pool.image || pool.property_image || ""}
              alt={pool.title}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                <Users className="h-3 w-3" /> {pool.member_count} members
              </span>
              {pool.property_city && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {pool.property_city}
                </span>
              )}
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 capitalize">
                {pool.status}
              </span>
            </div>

            <h1 className="font-display text-3xl font-semibold">{pool.title}</h1>
            <p className="mt-3 leading-relaxed text-foreground/80">{pool.description}</p>

            {/* Rules */}
            <div className="mt-6 rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-semibold mb-4">How this pool works</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Monthly installments</p>
                    <p className="text-xs text-muted-foreground">
                      Due on the 1st of every month. 3 reminder emails (
                      {pool.reminder_days.join(", ")} days before).
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium">Late payments</p>
                    <p className="text-xs text-muted-foreground">
                      {pool.penalty_rate}% late fee after a {pool.grace_days}-day grace period.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <div>
                    <p className="text-sm font-medium">Held securely</p>
                    <p className="text-xs text-muted-foreground">
                      Contributions are tracked per account and held in the company account until
                      the target is reached.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <HandCoins className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Flexible plans</p>
                    <p className="text-xs text-muted-foreground">
                      {pool.allow_monthly
                        ? `Monthly from ₦${minMonthly.toLocaleString()} to ₦${maxMonthly.toLocaleString()}. `
                        : ""}
                      {pool.allow_lump_sum
                        ? `One-time from ₦${(pool.min_lump_sum || 0).toLocaleString()}.`
                        : ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: join card */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Funding Target</p>
                <p className="font-display text-2xl font-bold">
                  ₦{(pool.target_amount / 1e6).toFixed(1)}M
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Raised</p>
                <p className="text-xl font-bold text-emerald-600">
                  ₦{(pool.current_raised / 1e6).toFixed(1)}M
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Funding Progress</span>
                <span>{pool.funding_percentage}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${pool.funding_percentage}%` }}
                />
              </div>
            </div>

            {!user ? (
              <div className="rounded-xl bg-amber-500/10 p-4 text-sm">
                <p className="font-medium text-amber-700 flex items-center gap-1.5">
                  <LogIn className="h-4 w-4" /> Login required
                </p>
                <p className="mt-1 text-amber-600/80 text-xs">
                  Create a free account or log in to join this pool.
                </p>
                <Link
                  to="/register"
                  className="mt-2 inline-flex rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                >
                  Create account / Login
                </Link>
              </div>
            ) : pool.status !== "active" ? (
              <p className="rounded-xl bg-secondary p-4 text-sm text-muted-foreground">
                This pool is no longer accepting contributions.
              </p>
            ) : pool.is_member ? (
              <div className="rounded-xl bg-emerald-500/10 p-4 text-sm">
                <p className="font-medium text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> You're already a member of this pool
                </p>
                <p className="mt-1 text-xs text-emerald-600/80">
                  You can view your membership and make contributions from your pool dashboard.
                </p>
                <button
                  type="button"
                  disabled
                  className="mt-3 w-full cursor-not-allowed rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground opacity-50"
                >
                  Already Joined
                </button>
                <Link
                  to="/account/pools"
                  className="mt-2 block text-center text-xs font-semibold text-primary hover:underline"
                >
                  View my pool dashboard →
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Plan type */}
                <div className="grid grid-cols-3 gap-2">
                  {(["monthly", "lump_sum", "both"] as const)
                    .filter((p) => (p === "lump_sum" ? canLump : canMonthly))
                    .map((p) => (
                      <button
                        key={p}
                        onClick={() => setPlanType(p)}
                        className={`rounded-xl border px-2 py-2 text-xs font-medium capitalize transition ${effectivePlan === p ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-secondary"}`}
                      >
                        {p.replace("_", " ")}
                      </button>
                    ))}
                </div>

                {effectivePlan !== "lump_sum" ? (
                  <>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Monthly contribution (₦)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={monthlyAmount ?? ""}
                          onChange={(e) => setMonthlyAmount(Number(e.target.value))}
                          placeholder={String(pool.default_monthly ?? "")}
                          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium outline-none focus:border-primary"
                          min={minMonthly || undefined}
                          max={maxMonthly || undefined}
                        />
                      </div>
                      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                        <span>{minMonthly ? `Min ₦${minMonthly.toLocaleString()}` : ""}</span>
                        <span>{maxMonthly ? `Max ₦${maxMonthly.toLocaleString()}` : ""}</span>
                      </div>
                    </div>

                    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border p-3 hover:bg-secondary/60 transition">
                      <input
                        type="checkbox"
                        checked={autoDebit}
                        onChange={(e) => setAutoDebit(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-primary"
                      />
                      <span className="text-sm">
                        <span className="font-medium flex items-center gap-1.5">
                          <CreditCard className="h-3.5 w-3.5" /> Auto-debit my card monthly
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          Paystack charges your card automatically every month. No missed payments.
                        </span>
                      </span>
                    </label>
                  </>
                ) : (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      One-time contribution (₦)
                    </label>
                    <input
                      type="number"
                      value={lumpAmount ?? ""}
                      onChange={(e) => setLumpAmount(Number(e.target.value))}
                      placeholder={pool.min_lump_sum ? String(pool.min_lump_sum) : "e.g. 500000"}
                      className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium outline-none focus:border-primary"
                      min={pool.min_lump_sum || undefined}
                    />
                    {pool.min_lump_sum && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Minimum one-time contribution: ₦{pool.min_lump_sum.toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                {error && (
                  <p className="rounded-xl bg-destructive/10 p-3 text-xs font-medium text-destructive">
                    {error}
                  </p>
                )}

                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
                >
                  {joining
                    ? "Processing..."
                    : effectivePlan === "lump_sum"
                      ? "Join & Contribute"
                      : "Join This Pool"}
                </button>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Secured via Paystack
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> No hidden fees
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
