import { useMemo } from "react";
import type { Property } from "@/lib/properties";

/**
 * Small decorative SVG map preview used inside homepage browse sections.
 * Renders pins for the passed properties using the same visual language
 * as /map, but non-interactive.
 */
export function MiniMap({ items }: { items: Property[] }) {
  const bounds = useMemo(() => {
    if (items.length === 0) {
      return { minLat: 4, maxLat: 10, minLng: 3, maxLng: 8 };
    }
    const lats = items.map((p) => p.lat);
    const lngs = items.map((p) => p.lng);
    return {
      minLat: Math.min(...lats) - 0.5,
      maxLat: Math.max(...lats) + 0.5,
      minLng: Math.min(...lngs) - 0.5,
      maxLng: Math.max(...lngs) + 0.5,
    };
  }, [items]);

  const project = (lat: number, lng: number) => {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
    const y = 100 - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;
    return { x, y };
  };

  return (
    <div
      className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-card)]"
      style={{
        backgroundImage: `
          radial-gradient(circle at 30% 30%, oklch(0.94 0.04 195) 0%, transparent 40%),
          radial-gradient(circle at 70% 70%, oklch(0.92 0.05 75) 0%, transparent 45%),
          linear-gradient(180deg, oklch(0.96 0.01 195), oklch(0.92 0.02 200))
        `,
      }}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <path d="M 5 70 Q 25 60 40 65 T 80 55 L 95 50" stroke="oklch(0.55 0.08 195 / 0.3)" strokeWidth="0.3" fill="none" />
        <path d="M 10 80 Q 30 75 50 78 T 90 70" stroke="oklch(0.55 0.08 195 / 0.2)" strokeWidth="0.3" fill="none" />
      </svg>
      {items.slice(0, 20).map((p) => {
        const { x, y } = project(p.lat, p.lng);
        return (
          <span
            key={p.id}
            style={{ left: `${x}%`, top: `${y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full ring-2 ring-white"
            aria-hidden
          >
            <span className="block h-full w-full rounded-full bg-[var(--gold)]" />
          </span>
        );
      })}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/40 to-transparent p-3 text-xs font-medium text-white">
        <span>{items.length} on map</span>
        <span>View full map →</span>
      </div>
    </div>
  );
}
