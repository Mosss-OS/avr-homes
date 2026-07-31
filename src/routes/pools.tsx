import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import {
  Users,
  MapPin,
  Loader2,
  ArrowRight,
  ShieldCheck,
  HandCoins,
  CalendarDays,
  AlertTriangle,
  Wallet,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/pools")({
  component: PoolMarketplace,
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
  status: string;
  funding_percentage: number;
  property_title: string | null;
  property_city: string | null;
  property_image: string | null;
}

const FALLBACK_POOLS: Pool[] = [
  {
    id: 1,
    title: "Lekki 4-Bedroom Duplex Co-Buy",
    slug: "lekki-duplex",
    description:
      "Pool monthly contributions with other Nigerians to co-own a premium 4-bedroom duplex in Lekki Phase 1. When the target is funded, AVR Homes acquires the property and the pool members hold proportional ownership.",
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
    status: "active",
    funding_percentage: 17,
    property_title: null,
    property_city: "Lekki",
    property_image: null,
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
    status: "active",
    funding_percentage: 30,
    property_title: null,
    property_city: "Lekki",
    property_image: null,
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
    status: "active",
    funding_percentage: 80,
    property_title: null,
    property_city: "Ikoyi",
    property_image: null,
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
    status: "active",
    funding_percentage: 15,
    property_title: null,
    property_city: "Eko Atlantic",
    property_image: null,
  },
];

function PoolMarketplace() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: Pool[] }>("/api/pools")
      .then((r) => setPools(r.data.data || []))
      .catch(() => setPools(FALLBACK_POOLS))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-[#0A1628] to-[#1a2a4a] p-8 sm:p-12 text-white mb-10">
        <div className="flex items-center gap-2 text-[#C9A84C] text-sm font-semibold uppercase tracking-wider mb-3">
          <HandCoins className="h-4 w-4" /> Pooled Investment
        </div>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold leading-tight">
          Buy Together. <br />
          <span className="text-[#C9A84C]">Own Real Estate, As A Group.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-white/70 text-lg">
          The modern ajo &amp; esusu. Pool monthly or one-time contributions with other members, and
          co-own premium Lagos properties. Contributions are tracked per account and held securely
          until the pool reaches its target.
        </p>
        <div className="mt-6 flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" /> Funds held securely
          </div>
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-emerald-400" /> From ₦25,000/month
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-emerald-400" /> Auto-debit or manual
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: Users,
            title: "1. Join a pool",
            text: "Choose a property pool and pick a monthly or one-time plan.",
          },
          {
            icon: CalendarDays,
            title: "2. Contribute",
            text: "Pay monthly (auto-debit or manual) — 3 reminders before each due date.",
          },
          {
            icon: Sparkles,
            title: "3. Co-own",
            text: "Once funded, the property is acquired and the group owns it together.",
          },
        ].map((s) => (
          <div key={s.title} className="rounded-2xl border border-border bg-card p-5">
            <s.icon className="h-5 w-5 text-primary" />
            <h3 className="mt-3 font-display text-base font-semibold">{s.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
          </div>
        ))}
      </div>

      {/* Stats */}
      {!loading && pools.length > 0 && (
        <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-2xl font-bold">{pools.length}</p>
            <p className="text-xs text-muted-foreground">Active Pools</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-2xl font-bold">
              {pools.reduce((s, p) => s + p.member_count, 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Total Members</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-2xl font-bold">
              ₦{(pools.reduce((s, p) => s + p.current_raised, 0) / 1e6).toFixed(0)}M
            </p>
            <p className="text-xs text-muted-foreground">Raised</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-2xl font-bold">
              {Math.round(pools.reduce((s, p) => s + p.funding_percentage, 0) / pools.length)}%
            </p>
            <p className="text-xs text-muted-foreground">Avg Funded</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pools.map((pool) => (
            <Link
              key={pool.id}
              to="/pools/$id"
              params={{ id: String(pool.id) }}
              className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
            >
              <div className="relative aspect-[16/9] overflow-hidden">
                <img
                  src={pool.image || pool.property_image || ""}
                  alt={pool.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-sm font-semibold text-white">{pool.title}</p>
                  {pool.property_city && (
                    <p className="flex items-center gap-1 text-xs text-white/70">
                      <MapPin className="h-3 w-3" /> {pool.property_city}
                    </p>
                  )}
                </div>
                <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white">
                  <Users className="h-3 w-3" /> {pool.member_count}
                </div>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">{pool.description}</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Target</p>
                    <p className="font-display text-lg font-bold">
                      ₦{(pool.target_amount / 1e6).toFixed(1)}M
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">From</p>
                    <p className="text-lg font-bold text-emerald-600">
                      ₦{(pool.min_monthly || 0).toLocaleString()}
                      <span className="text-xs font-normal">/mo</span>
                    </p>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{pool.funding_percentage}% funded</span>
                    <span>₦{(pool.current_raised / 1e6).toFixed(1)}M raised</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${pool.funding_percentage}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {pool.penalty_rate}% late fee after{" "}
                    {pool.grace_days}d
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <HandCoins className="h-3 w-3" />{" "}
                    {pool.allow_lump_sum ? "Lump sum OK" : "Monthly only"}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-1 rounded-xl bg-primary/5 py-2 text-xs font-semibold text-primary group-hover:bg-primary/10 transition">
                  Join This Pool <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
