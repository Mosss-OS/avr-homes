import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { PropertyCard } from "@/components/property-card";
import { properties, cities, propertyTypes, type Purpose } from "@/lib/properties";
import { addSavedSearch } from "@/lib/saved";
import { BookmarkPlus, SlidersHorizontal } from "lucide-react";

const schema = z.object({
  purpose: fallback(z.enum(["buy", "rent"]), "buy").default("buy"),
  q: fallback(z.string(), "").optional(),
  city: fallback(z.string(), "").optional(),
  type: fallback(z.string(), "").optional(),
  minPrice: fallback(z.number(), 0).optional(),
  maxPrice: fallback(z.number(), 0).optional(),
  beds: fallback(z.number(), 0).optional(),
});

export const Route = createFileRoute("/properties")({
  validateSearch: zodValidator(schema),
  head: () => ({
    meta: [
      { title: "Properties for sale & rent — AVR Homes" },
      { name: "description", content: "Browse luxury apartments, villas, and penthouses across Lekki, Ikoyi, Victoria Island, and Eko Atlantic." },
      { property: "og:title", content: "Properties for sale & rent — AVR Homes" },
      { property: "og:description", content: "Browse luxury apartments, villas, and penthouses across Lagos." },
      { property: "og:url", content: "https://avrusthomes.com/properties" },
    ],
    links: [{ rel: "canonical", href: "https://avrusthomes.com/properties" }],
  }),
  component: List,
});

function List() {
  const search = Route.useSearch();
  const [saved, setSaved] = useState(false);

  const results = useMemo(() => {
    return properties.filter((p) => {
      if (search.purpose && p.purpose !== search.purpose) return false;
      if (search.city && p.city !== search.city) return false;
      if (search.type && p.type !== search.type) return false;
      if (search.beds && p.beds < search.beds) return false;
      if (search.minPrice && p.price < search.minPrice) return false;
      if (search.maxPrice && p.price > search.maxPrice) return false;
      if (search.q) {
        const q = search.q.toLowerCase();
        const hay = `${p.title} ${p.community} ${p.city} ${p.address}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [search]);

  function saveThisSearch() {
    const params = new URLSearchParams();
    Object.entries(search).forEach(([k, v]) => { if (v) params.set(k, String(v)); });
    addSavedSearch({
      name: `${search.purpose === "rent" ? "Rent" : "Buy"} · ${search.city || "Lagos"}${search.type ? " · " + search.type : ""}`,
      query: params.toString(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {search.purpose === "rent" ? "For rent" : "For sale"}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">
            {results.length} {results.length === 1 ? "property" : "properties"}
            {search.city ? <span className="text-muted-foreground"> in {search.city}</span> : null}
          </h1>
        </div>
        <button onClick={saveThisSearch}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary">
          <BookmarkPlus className="h-4 w-4" /> {saved ? "Saved!" : "Save this search"}
        </button>
      </div>

      <Filters current={search} />

      {results.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
          <h3 className="font-display text-xl font-semibold">No matches</h3>
          <p className="mt-1 text-sm text-muted-foreground">Try widening your filters or clearing them.</p>
          <Link to="/properties" search={{ purpose: search.purpose } as never}
            className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Reset filters</Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((p) => <PropertyCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}

function Filters({ current }: { current: z.infer<typeof schema> }) {
  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
      <div className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
      </div>
      <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible">
        <Pill label="Purpose">
          {(["buy", "rent"] as Purpose[]).map((p) => (
            <Link key={p} to="/properties" search={{ ...current, purpose: p } as never}
              className={chip(current.purpose === p)}>{p}</Link>
          ))}
        </Pill>
        <Pill label="City">
          <Link to="/properties" search={{ ...current, city: undefined } as never} className={chip(!current.city)}>All</Link>
          {cities.map((c) => (
            <Link key={c} to="/properties" search={{ ...current, city: c } as never} className={chip(current.city === c)}>{c}</Link>
          ))}
        </Pill>
        <Pill label="Type">
          <Link to="/properties" search={{ ...current, type: undefined } as never} className={chip(!current.type)}>Any</Link>
          {propertyTypes.map((t) => (
            <Link key={t.value} to="/properties" search={{ ...current, type: t.value } as never} className={chip(current.type === t.value)}>{t.label}</Link>
          ))}
        </Pill>
        <Pill label="Beds">
          {[0, 1, 2, 3, 4].map((b) => (
            <Link key={b} to="/properties" search={{ ...current, beds: b || undefined } as never} className={chip((current.beds || 0) === b)}>
              {b === 0 ? "Any" : `${b}+`}
            </Link>
          ))}
        </Pill>
      </div>
    </div>
  );
}

function Pill({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-xl bg-secondary/60 p-1">
      <span className="shrink-0 px-2 text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
function chip(active: boolean) {
  return `rounded-lg px-3 py-1 text-xs font-medium capitalize transition ${
    active ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-background"
  }`;
}
