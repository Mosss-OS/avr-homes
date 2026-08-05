"use client";

/**
 * Properties listing page — search/filter/sort + paginated grid.
 * All filter state lives in the URL query string so results are shareable
 * and consistent with the site's "save search" behaviour.
 */

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PropertyCard } from "@/components/property-card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchProperties, propertyTypes, type Property } from "@/lib/properties";
import { ChevronLeft, ChevronRight, Search, SearchX, SlidersHorizontal } from "lucide-react";

const PER_PAGE = 12;

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "price_low", label: "Price: low to high" },
  { value: "price_high", label: "Price: high to low" },
];

const TABS = [
  { value: "all", label: "All" },
  { value: "buy", label: "Buy" },
  { value: "rent", label: "Rent" },
  { value: "shortlet", label: "Short-Let" },
  { value: "land", label: "Land" },
] as const;

function paramsWith(sp: URLSearchParams, patch: Record<string, string | null | undefined>): string {
  const p = new URLSearchParams(sp);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined || v === "") p.delete(k);
    else p.set(k, v);
  }
  p.delete("page");
  return p.toString();
}

function PropertiesExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const purpose = searchParams.get("purpose");
  const type = searchParams.get("type");
  const q = searchParams.get("q") ?? "";
  const city = searchParams.get("city") ?? "";
  const beds = searchParams.get("beds") ?? "";
  const baths = searchParams.get("baths") ?? "";
  const minPrice = searchParams.get("min_price") ?? "";
  const maxPrice = searchParams.get("max_price") ?? "";
  const sort = searchParams.get("sort") ?? "newest";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));

  const isLand = type === "land";
  const activeTab = isLand ? "land" : (purpose as string) ?? "all";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params: Record<string, string> = {};
    for (const key of ["purpose", "type", "city", "community", "q", "min_price", "max_price", "beds", "baths", "featured"]) {
      const v = searchParams.get(key);
      if (v) params[key] = v;
    }
    params.page = String(page);
    params.per_page = String(PER_PAGE);
    if (sort === "price_low") {
      params.sort = "price";
      params.order = "asc";
    } else if (sort === "price_high") {
      params.sort = "price";
      params.order = "desc";
    } else {
      params.sort = "created_at";
      params.order = "desc";
    }

    fetchProperties(params)
      .then((res) => {
        if (cancelled) return;
        setItems(res.data);
        setTotal(res.total);
        setTotalPages(res.total_pages);
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        setTotal(0);
        setTotalPages(0);
        setError("We couldn't load properties right now. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  function apply(patch: Record<string, string | null | undefined>) {
    router.replace(`/properties?${paramsWith(searchParams, patch)}`);
  }

  function setTab(tab: (typeof TABS)[number]["value"]) {
    if (tab === "all") return apply({ purpose: null, type: null });
    if (tab === "land") return apply({ purpose: null, type: "land" });
    apply({ purpose: tab, type: null });
  }

  const activeFilters = [q, city, beds, baths, minPrice, maxPrice].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#C9A84C" }}>
            {isLand ? "Lands" : `${(purpose ?? "buy").replace(/-/g, " ")}`} in Nigeria
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">
            {isLand ? "Plots & acreage" : "Verified homes"}
          </h1>
          {!loading && (
            <p className="mt-2 text-sm text-muted-foreground">
              {total.toLocaleString()} {total === 1 ? "property" : "properties"}
              {city ? ` in ${city}` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <select
              value={sort}
              onChange={(e) => apply({ sort: e.target.value })}
              className="h-10 bg-transparent outline-none"
              aria-label="Sort results"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Purpose tabs */}
      <div className="mt-6 flex flex-wrap gap-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setTab(tab.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${
              activeTab === tab.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/60 text-foreground/70 hover:bg-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mt-4 grid grid-cols-1 gap-2 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)] sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => apply({ q: e.target.value })}
            placeholder="Keyword, area…"
            className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>
        <select
          value={city}
          onChange={(e) => apply({ city: e.target.value })}
          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none"
        >
          <option value="">All cities</option>
          <option>Lagos</option>
          <option>Abuja</option>
          <option>Port Harcourt</option>
          <option>Asaba</option>
          <option>Owerri</option>
          <option>Awka</option>
          <option>Ibadan</option>
          <option>Benin City</option>
        </select>
        <select
          value={type ?? ""}
          onChange={(e) => apply({ type: e.target.value })}
          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none"
        >
          <option value="">Any type</option>
          {propertyTypes.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select
          value={beds}
          onChange={(e) => apply({ beds: e.target.value })}
          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none"
        >
          <option value="">Any beds</option>
          <option value="1">1+ bed</option>
          <option value="2">2+ beds</option>
          <option value="3">3+ beds</option>
          <option value="4">4+ beds</option>
          <option value="5">5+ beds</option>
        </select>
        <select
          value={baths}
          onChange={(e) => apply({ baths: e.target.value })}
          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none"
        >
          <option value="">Any baths</option>
          <option value="1">1+ bath</option>
          <option value="2">2+ baths</option>
          <option value="3">3+ baths</option>
          <option value="4">4+ baths</option>
        </select>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={minPrice}
            onChange={(e) => apply({ min_price: e.target.value })}
            placeholder="Min ₦"
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {activeFilters > 0 && (
          <button
            type="button"
            onClick={() => router.replace("/properties")}
            className="text-xs font-medium text-primary hover:underline"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Results */}
      {error && (
        <div className="mt-10 rounded-2xl border border-border bg-card p-10 text-center">
          <SearchX className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">{error}</p>
        </div>
      )}

      {loading && !error && (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <div className="space-y-3 p-4">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="mt-10 rounded-2xl border border-border bg-card p-10 text-center">
          <SearchX className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-3 font-display text-lg font-semibold">No matching properties</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try widening your search or clearing some filters.
          </p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((p) => (
            <PropertyCard key={p.id} p={p} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => apply({ page: String(page - 1) })}
            className="inline-flex h-10 items-center gap-1 rounded-xl border border-border bg-card px-4 text-sm font-medium transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => apply({ page: String(page + 1) })}
            className="inline-flex h-10 items-center gap-1 rounded-xl border border-border bg-card px-4 text-sm font-medium transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function PropertiesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PropertiesExplorer />
    </Suspense>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-9 w-64" />
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="space-y-3 p-4">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
