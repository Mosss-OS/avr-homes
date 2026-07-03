import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin } from "lucide-react";
import { PropertyCard } from "@/components/property-card";
import { MiniMap } from "@/components/mini-map";
import { nigerianStates, properties as allProperties, type Property } from "@/lib/properties";

export type BrowseCategory = "buy" | "rent" | "land";

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
  land: {
    title: "Land for Sale",
    kicker: "Land",
    blurb: "Verified plots with proper title documents — C of O, R of O and Governor's Consent.",
    ctaLabel: "Browse land",
    to: "/land",
  },
};

function filterByCategory(list: Property[], cat: BrowseCategory): Property[] {
  if (cat === "land") return list.filter((p) => p.type === "land");
  if (cat === "buy") return list.filter((p) => p.purpose === "buy" && p.type !== "land");
  return list.filter((p) => p.purpose === "rent" && p.type !== "land");
}

function stateSearch(cat: BrowseCategory, city: string) {
  if (cat === "land") return { type: "land", city } as never;
  return { purpose: cat, city } as never;
}

function mapSearch(cat: BrowseCategory, city?: string) {
  const s: Record<string, string> = {};
  if (cat === "land") s.type = "land";
  else s.purpose = cat;
  if (city) s.city = city;
  return s as never;
}

export function BrowseSection({ category, dark = false }: { category: BrowseCategory; dark?: boolean }) {
  const meta = META[category];
  const items = filterByCategory(allProperties, category);
  const cards = items.slice(0, 3);

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

        {/* Grid: 3 cards + mini map */}
        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr_1fr_1fr]">
          {cards.map((p) => (
            <div key={p.id} className="lg:col-span-1">
              <PropertyCard p={p} />
            </div>
          ))}
          <Link
            to="/map"
            search={mapSearch(category)}
            className="hidden lg:block lg:col-span-1"
            aria-label={`View ${meta.title} on the map`}
          >
            <MiniMap items={items} />
          </Link>
        </div>
      </div>
    </section>
  );
}
