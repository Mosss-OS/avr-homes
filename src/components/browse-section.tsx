/**
 * Homepage browse-by-category section showing a heading, state chips,
 * three property cards, and a linked mini-map.
 */

import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin } from "lucide-react";
import { PropertyCard } from "@/components/property-card";
import { MiniMap } from "@/components/mini-map";
import { ScrollableSection } from "@/components/scrollable-section";
import { nigerianStates, fetchProperties, type Property } from "@/lib/properties";
import { useEffect, useState } from "react";

/** The four browsing categories displayed on the homepage. */
export type BrowseCategory = "buy" | "rent" | "land" | "shortlet";

/** Per-category copy and route config. */
const META: Record<BrowseCategory, { title: string; kicker: string; blurb: string; ctaLabel: string; to: string }> = {
  buy: {
    title: "Homes for Sale",
    kicker: "Buy",
    blurb: "Finished homes ready to move into — from Lagos duplexes to Abuja luxury villas.",
    ctaLabel: "Browse homes for sale",
    to: "/buy",
  },
  rent: {
    title: "Homes for Rent",
    kicker: "Rent",
    blurb: "Serviced apartments, family homes and short-let residences across Nigeria's cities.",
    ctaLabel: "Browse homes for rent",
    to: "/rent",
  },
  shortlet: {
    title: "Short-Let & Furnished",
    kicker: "Short-Let",
    blurb: "Luxury furnished apartments and villas available for nightly stays — perfect for business trips and holidays.",
    ctaLabel: "Browse short-lets",
    to: "/shortlet",
  },
  land: {
    title: "Land for Sale",
    kicker: "Land",
    blurb: "Verified plots with proper title documents — C of O, R of O and Governor's Consent.",
    ctaLabel: "Browse land",
    to: "/land",
  },
};

/** Build a search param object for the per-state city links. */
function stateSearch(cat: BrowseCategory, city: string) {
  if (cat === "land") return { type: "land", city } as never;
  return { purpose: cat, city } as never;
}

/** Build a search param object for the full-map link. */
function mapSearch(cat: BrowseCategory, city?: string) {
  const s: Record<string, string> = {};
  if (cat === "land") s.type = "land";
  else s.purpose = cat;
  if (city) s.city = city;
  return s as never;
}

/** Homepage section that previews properties for a given browse category. */
export function BrowseSection({ category, dark = false }: { category: BrowseCategory; dark?: boolean }) {
  const meta = META[category];
  const [items, setItems] = useState<Property[]>([]);

  useEffect(() => {
    const params: Record<string, string> = { per_page: "8" };
    if (category === "land") params.type = "land";
    else if (category === "shortlet") params.purpose = "shortlet";
    else if (category === "buy") params.purpose = "buy";
    else params.purpose = "rent";
    fetchProperties(params).then((res) => setItems(res.data)).catch(() => {});
  }, [category]);

  return (
    <section className={dark ? "bg-secondary/40" : ""}>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#C9A84C" }}>
              {meta.kicker}
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold sm:text-3xl lg:text-4xl">{meta.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">{meta.blurb}</p>
          </div>
          <Link
            to={meta.to}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            {meta.ctaLabel} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* State chips */}
        <div className="mt-6 flex flex-wrap gap-2">
          {nigerianStates.map((city) => (
            <Link
              key={city}
              to="/properties"
              search={stateSearch(category, city)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-medium text-foreground/80 hover:border-primary hover:text-primary transition"
            >
              <MapPin className="h-3 w-3" /> {city}
            </Link>
          ))}
        </div>

        {/* Horizontal scroll: property cards + mini map */}
        <div className="mt-6 flex gap-5">
          <ScrollableSection className="-mx-4 flex gap-5 px-4 pb-2 sm:mx-0 sm:px-0">
            {items.map((p) => (
              <div key={p.id} className="w-[280px] shrink-0 sm:w-[320px]">
                <PropertyCard p={p} />
              </div>
            ))}
            <Link
              to="/map"
              search={mapSearch(category)}
              className="hidden w-[280px] shrink-0 sm:block sm:w-[320px]"
              aria-label={`View ${meta.title} on the map`}
            >
              <MiniMap items={items} />
            </Link>
          </ScrollableSection>
        </div>
      </div>
    </section>
  );
}
