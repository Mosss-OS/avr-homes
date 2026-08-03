/**
 * Homepage "Pay Small Small" section — pooled buying (ajo/esusu) browse cards.
 * Fetches active investment pools and renders funding-progress cards that link
 * to each pool's detail page, styled like the property BrowseSection.
 */

import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Users, HandCoins } from "lucide-react";
import { ScrollableSection } from "@/components/scrollable-section";
import { api } from "@/lib/api-client";
import { useEffect, useState } from "react";

interface Pool {
  id: number;
  title: string;
  description: string | null;
  image: string | null;
  target_amount: number;
  current_raised: number;
  member_count: number;
  min_monthly: number | null;
  max_monthly: number | null;
  min_lump_sum: number | null;
  allow_monthly: boolean;
  allow_lump_sum: boolean;
  status: string;
  funding_percentage: number;
  property_city: string | null;
  property_image: string | null;
}

const FALLBACK_POOLS: Pool[] = [
  {
    id: 2,
    title: "Group Rent — Lagos Island",
    description:
      "Pool monthly contributions to cover the annual rent of a premium 3-bedroom apartment on Lagos Island.",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
    target_amount: 36000000,
    current_raised: 9000000,
    member_count: 3,
    min_monthly: 250000,
    max_monthly: 2000000,
    min_lump_sum: 250000,
    allow_monthly: true,
    allow_lump_sum: true,
    status: "active",
    funding_percentage: 25,
    property_city: "Lagos Island",
    property_image: null,
  },
  {
    id: 3,
    title: "Co-Buy Home — Lekki Phase 1",
    description:
      "Co-own a premium 4-bedroom duplex in Lekki Phase 1 by pooling monthly or one-time contributions.",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
    target_amount: 250000000,
    current_raised: 25000000,
    member_count: 4,
    min_monthly: 100000,
    max_monthly: 2000000,
    min_lump_sum: 250000,
    allow_monthly: true,
    allow_lump_sum: true,
    status: "active",
    funding_percentage: 10,
    property_city: "Lekki",
    property_image: null,
  },
  {
    id: 4,
    title: "Land Co-Purchase — Epe Waterfront",
    description:
      "Group purchase of an approved waterfront land plot. Members contribute monthly or one-time.",
    image: "https://images.unsplash.com/photo-1581093458791-9d42e3c4e117?w=800",
    target_amount: 150000000,
    current_raised: 15000000,
    member_count: 2,
    min_monthly: 100000,
    max_monthly: 1000000,
    min_lump_sum: 100000,
    allow_monthly: true,
    allow_lump_sum: true,
    status: "active",
    funding_percentage: 10,
    property_city: "Epe",
    property_image: null,
  },
];

/** Homepage "Pay Small Small" section: pooled-buying cards with funding progress. */
export function PoolBrowseSection() {
  const [pools, setPools] = useState<Pool[]>([]);

  useEffect(() => {
    let cancelled = false;
    let applied = false;
    const timer = setTimeout(() => {
      if (!cancelled && !applied) {
        applied = true;
        setPools(FALLBACK_POOLS);
      }
    }, 6000);
    api
      .get<{ data: Pool[] }>("/api/pools")
      .then((r) => {
        if (!cancelled) {
          clearTimeout(timer);
          applied = true;
          const active = (r.data.data || []).filter((p) => p.status === "active");
          setPools(active.length > 0 ? active : FALLBACK_POOLS);
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearTimeout(timer);
          applied = true;
          setPools(FALLBACK_POOLS);
        }
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const totalMembers = pools.reduce((s, p) => s + (p.member_count || 0), 0);

  return (
    <section className="border-y border-border bg-secondary/40">
      <div className="mx-auto max-w-7xl py-10 lg:py-16">
        <div className="px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#C9A84C" }}>
                Pay Small Small
              </p>
              <h2 className="mt-1 font-display text-2xl font-semibold sm:text-3xl lg:text-4xl">
                Pooled buying &amp; group rent — ajo / esusu, modernised
              </h2>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Join a pool and contribute monthly or one-time toward a home, rent or land. Once the
                group funds the target, AVR Homes acquires the property and you own it together.
              </p>
            </div>
            <Link
              to="/pools"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Browse all pools <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-6 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" /> {totalMembers} members pooling
            </span>
            <span className="inline-flex items-center gap-1.5">
              <HandCoins className="h-4 w-4 text-primary" /> From ₦50,000/month
            </span>
          </div>
        </div>

        <div className="mt-6">
          <ScrollableSection className="gap-5 px-4 pb-2 sm:px-6">
            {pools.map((pool) => (
              <Link
                key={pool.id}
                to="/pools/$id"
                params={{ id: String(pool.id) }}
                className="group w-[280px] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)] sm:w-[320px]"
              >
                <div className="relative aspect-[16/9] overflow-hidden">
                  <img
                    src={pool.image || pool.property_image || ""}
                    alt={pool.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  {pool.property_city && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 text-xs font-medium text-white">
                      <MapPin className="h-3 w-3" /> {pool.property_city}
                    </div>
                  )}
                  <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white">
                    <Users className="h-3 w-3" /> {pool.member_count}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-1 text-sm font-semibold">{pool.title}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{pool.description}</p>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{pool.funding_percentage}% funded</span>
                      <span>₦{(pool.current_raised / 1e6).toFixed(1)}M of ₦{(pool.target_amount / 1e6).toFixed(1)}M</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${Math.min(100, pool.funding_percentage)}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-600">
                      ₦{((pool.min_monthly || pool.min_lump_sum || 50000)).toLocaleString()}
                      <span className="font-normal text-muted-foreground">{pool.allow_monthly ? "/mo" : " lump"}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/5 px-2.5 py-1 font-semibold text-primary">
                      Pay small small <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </ScrollableSection>
        </div>
      </div>
    </section>
  );
}
