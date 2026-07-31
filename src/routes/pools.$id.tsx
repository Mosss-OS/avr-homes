import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
}

const FALLBACK: Pool[] = [
  {
    id: 1,
    title: "Lekki 4-Bedroom Duplex Co-Buy",
    slug: "lekki-duplex",
    description:
      "Pool monthly contributions with other Nigerians to co-own a premium 4-bedroom duplex in Lekki Phase 1. When the target is funded, AVR Homes acquires the property and the pool members hold proportional ownership. This is a modern ajo/esusu — everyone contributes on schedule, contributions are held securely in the company account, and the group owns the asset together.",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
    target_property_id: null,
    target_amount: 250000000,
    current_raised: 42000000,
    member_count: 86,
    default_monthly: 100000,
    min_monthly: 50000,
    max_monthly: 500000,
    min_lump_sum: 500000,
    allow_monthly: true,
    allow_lump_sum: true,
    penalty_rate: 5,
    grace_days: 7,
    reminder_days: [7, 3, 1],
    status: "active",
    funding_percentage: 17,
    property_title: "Luxury Duplex, Lekki Phase 1",
    property_city: "Lekki",
    property_image: null,
    property_address: "Lekki Phase 1, Lagos",
  },
  {
    id: 2,
    title: "Land Co-Purchase — Banana Island",
    slug: "banana-island-land",
    description:
      "Group purchase of an approved waterfront land plot in Banana Island. Members contribute monthly or one-time; the plot is registered once funded.",
    image: "https://images.unsplash.com/photo-1581093458791-9d42e3c4e117?w=800",
    target_property_id: null,
    target_amount: 180000000,
    current_raised: 54000000,
    member_count: 54,
    default_monthly: 150000,
    min_monthly: 100000,
    max_monthly: 1000000,
    min_lump_sum: 1000000,
    allow_monthly: true,
    allow_lump_sum: true,
    penalty_rate: 5,
    grace_days: 7,
    reminder_days: [7, 3, 1],
    status: "active",
    funding_percentage: 30,
    property_title: "Waterfront Plot, Banana Island",
    property_city: "Lekki",
    property_image: null,
    property_address: "Banana Island, Lagos",
  },
  {
    id: 3,
    title: "Ikoyi Serviced Apartment Fund",
    slug: "ikoyi-apartment",
    description:
      "Co-fund a fully furnished serviced apartment in Ikoyi that operates as a short-let. Pool members share rental revenue proportionally.",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
    target_property_id: null,
    target_amount: 120000000,
    current_raised: 96000000,
    member_count: 132,
    default_monthly: 50000,
    min_monthly: 25000,
    max_monthly: 300000,
    min_lump_sum: 250000,
    allow_monthly: true,
    allow_lump_sum: true,
    penalty_rate: 5,
    grace_days: 7,
    reminder_days: [7, 3, 1],
    status: "active",
    funding_percentage: 80,
    property_title: "Serviced Apartment, Ikoyi",
    property_city: "Ikoyi",
    property_image: null,
    property_address: "Ikoyi, Lagos",
  },
  {
    id: 4,
    title: "Eko Atlantic Studio Pool",
    slug: "eko-atlantic-studio",
    description:
      "Save together toward an Eko Atlantic luxury studio. Flexible monthly or one-off contributions, automatic card debits available.",
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
    target_property_id: null,
    target_amount: 95000000,
    current_raised: 14250000,
    member_count: 41,
    default_monthly: 75000,
    min_monthly: 50000,
    max_monthly: 400000,
    min_lump_sum: 500000,
    allow_monthly: true,
    allow_lump_sum: true,
    penalty_rate: 5,
    grace_days: 7,
    reminder_days: [7, 3, 1],
    status: "active",
    funding_percentage: 15,
    property_title: "Luxury Studio, Eko Atlantic",
    property_city: "Eko Atlantic",
    property_image: null,
    property_address: "Eko Atlantic City, Lagos",
  },
];

function PoolDetail() {
  const { id } = Route.useParams();
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
    setLoading(true);
    api
      .get<Pool>(`/api/pools/${id}`)
      .then((r) => setPool(r.data))
      .catch(() => {
        const found = FALLBACK.find((f) => f.id === Number(id));
        if (found) setPool(found);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (pool && pool.default_monthly) setMonthlyAmount(pool.default_monthly);
  }, [pool?.id]);

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
    if (!user) return;
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
