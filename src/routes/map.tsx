/**
 * Interactive property map route (/map).
 * Filters properties by URL search params and renders a simplified SVG map
 * with price pins. Hovering a pin shows a preview card in the sidebar.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { MapPin } from "lucide-react";
import { formatAED, properties as allProperties } from "@/lib/properties";

const schema = z.object({
  purpose: fallback(z.enum(["buy", "rent"]), "buy").optional(),
  type: fallback(z.string(), "").optional(),
  city: fallback(z.string(), "").optional(),
});

export const Route = createFileRoute("/map")({
  validateSearch: zodValidator(schema),
  head: () => ({
    meta: [
      { title: "Map view — AVR Homes Nigeria Property Search" },
      { name: "description", content: "Explore verified homes and land across Lagos, Abuja, Port Harcourt and beyond on an interactive map." },
      { property: "og:title", content: "Map view — AVR Homes Nigeria Property Search" },
      { property: "og:description", content: "Explore Nigerian properties on an interactive map." },
      { property: "og:url", content: "https://avrusthomes.com/map" },
    ],
    links: [{ rel: "canonical", href: "https://avrusthomes.com/map" }],
  }),
  component: MapView,
});

/**
 * Map view component — filters properties by search params, projects lat/lng onto
 * an SVG canvas, and renders price pins with a hover-activated preview sidebar.
 */
function MapView() {
  const search = Route.useSearch();
  const properties = useMemo(() => allProperties.filter((p) => {
    if (search.purpose && p.purpose !== search.purpose) return false;
    if (search.type && p.type !== search.type) return false;
    if (search.city && p.city !== search.city) return false;
    return true;
  }), [search]);

  const [hoverId, setHoverId] = useState<string | number | null>(null);
  const bounds = useMemo(() => {
    if (properties.length === 0) return { minLat: 4, maxLat: 10, minLng: 3, maxLng: 8 };
    const lats = properties.map((p) => p.lat);
    const lngs = properties.map((p) => p.lng);
    return {
      minLat: Math.min(...lats) - 0.1, maxLat: Math.max(...lats) + 0.1,
      minLng: Math.min(...lngs) - 0.1, maxLng: Math.max(...lngs) + 0.1,
    };
  }, [properties]);
  const project = (lat: number, lng: number) => {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
    const y = 100 - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;
    return { x, y };
  };

  const active = properties.find((p) => p.id === hoverId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">Map view</h1>
      <p className="mt-1 text-sm text-muted-foreground">Hover or tap a pin to preview a listing.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]"
          style={{
            backgroundImage: `
              radial-gradient(circle at 30% 30%, oklch(0.94 0.04 195) 0%, transparent 40%),
              radial-gradient(circle at 70% 70%, oklch(0.92 0.05 75) 0%, transparent 45%),
              linear-gradient(180deg, oklch(0.96 0.01 195), oklch(0.92 0.02 200))
            `,
          }}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            {/* Coastline-ish stylized lines */}
            <path d="M 5 70 Q 25 60 40 65 T 80 55 L 95 50" stroke="oklch(0.55 0.08 195 / 0.3)" strokeWidth="0.3" fill="none" />
            <path d="M 10 80 Q 30 75 50 78 T 90 70" stroke="oklch(0.55 0.08 195 / 0.2)" strokeWidth="0.3" fill="none" />
          </svg>
          {properties.map((p) => {
            const { x, y } = project(p.lat, p.lng);
            const isActive = hoverId === p.id;
            return (
              <button key={p.id}
                onMouseEnter={() => setHoverId(p.id)}
                onFocus={() => setHoverId(p.id)}
                onClick={() => setHoverId(p.id)}
                style={{ left: `${x}%`, top: `${y}%` }}
                className="absolute -translate-x-1/2 -translate-y-full">
                <span className={`block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold shadow-[var(--shadow-card)] transition ${
                  isActive ? "bg-[var(--gold)] text-[var(--gold-foreground)] scale-110" : "bg-primary text-primary-foreground hover:scale-105"
                }`}>
                  {formatAED(p.price)}
                </span>
                <span className="mx-auto block h-2 w-2 -translate-y-1 rotate-45 bg-primary" />
              </button>
            );
          })}
        </div>

        <aside className="space-y-3">
          {active ? (
            <Link to="/properties/$id" params={{ id: active.id }}
              className="block overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-elevated)]">
              <div className="aspect-[16/10] overflow-hidden">
                <img src={active.image} alt={active.title} className="h-full w-full object-cover" />
              </div>
              <div className="p-4">
                <div className="font-display text-xl font-semibold">{formatAED(active.price)}</div>
                <div className="mt-1 text-sm font-medium">{active.title}</div>
                <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> {active.community}, {active.city}
                </div>
              </div>
            </Link>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Hover a pin to preview.
            </div>
          )}
          <div className="rounded-2xl border border-border bg-secondary/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">All on map</p>
            <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto">
              {properties.map((p) => (
                <li key={p.id}>
                  <button onMouseEnter={() => setHoverId(p.id)} onClick={() => setHoverId(p.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${hoverId === p.id ? "bg-background" : "hover:bg-background/60"}`}>
                    <div className="font-medium">{formatAED(p.price)} · {p.community}</div>
                    <div className="text-xs text-muted-foreground">{p.beds || "Studio"} bd · {p.baths} ba · {p.area} sqft</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
