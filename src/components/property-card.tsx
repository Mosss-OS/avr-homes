import { useNavigate } from "@tanstack/react-router";
import { BedDouble, Bath, Maximize2, MapPin, BadgeCheck, Heart } from "lucide-react";
import { useState } from "react";
import { formatPrice, type Currency, type Property } from "@/lib/properties";
import { isSaved, toggleSavedProp } from "@/lib/saved";

const CURRENCIES: Currency[] = ["NGN", "USD", "GBP"];
const SYMBOLS: Record<Currency, string> = { NGN: "₦", USD: "$", GBP: "£" };

export function PropertyCard({ p }: { p: Property }) {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(() => isSaved(String(p.id)));
  const [currency, setCurrency] = useState<Currency>("NGN");
  function goToDetail() {
    navigate({ to: "/properties/$id", params: { id: String(p.id) } });
  }
  return (
    <div
      onClick={goToDetail}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
    >
      <div className="relative block aspect-[4/3] overflow-hidden">
        <img
          src={p.image}
          alt={p.title}
          loading="lazy"
          width={1024}
          height={768}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          {(p.verified || p.is_verified) && (
            <span className="inline-flex items-center gap-1 rounded-full bg-background/95 px-2.5 py-1 text-xs font-medium text-primary">
              <BadgeCheck className="h-3.5 w-3.5" /> Verified
            </span>
          )}
          <span className="rounded-full bg-primary/90 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-primary-foreground">
            For {p.purpose}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleSavedProp(String(p.id));
            setSaved((s) => !s);
          }}
          aria-label="Save"
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-background/95 text-foreground/70 transition hover:text-destructive"
        >
          <Heart className={`h-4 w-4 ${saved ? "fill-destructive text-destructive" : ""}`} />
        </button>
      </div>
      <div className="p-4">
        <div className="flex items-baseline justify-between gap-3">
          <div className="font-display text-xl font-semibold tracking-tight">
            {formatPrice(p.price, currency)}
            {p.purpose === "rent" && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">/yr</span>
            )}
          </div>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">{p.type}</span>
        </div>
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-1.5 inline-flex items-center gap-0.5 rounded-full border border-border bg-secondary/60 p-0.5 text-[10px] font-semibold"
        >
          {CURRENCIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrency(c);
              }}
              className={`rounded-full px-2 py-0.5 transition ${currency === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              aria-label={`Show price in ${c}`}
            >
              {SYMBOLS[c]}
            </button>
          ))}
        </div>
        <span className="mt-2 line-clamp-1 block text-sm font-medium">{p.title}</span>
        <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" /> {p.community}, {p.city}
        </div>
        <div className="mt-3 flex items-center gap-4 border-t border-border pt-3 text-sm text-foreground/80">
          <span className="inline-flex items-center gap-1.5">
            <BedDouble className="h-4 w-4 text-primary" />
            {p.beds || "Studio"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Bath className="h-4 w-4 text-primary" />
            {p.baths}
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5">
            <Maximize2 className="h-4 w-4 text-primary" />
            {p.area.toLocaleString()} sqm
          </span>
        </div>
      </div>
    </div>
  );
}
