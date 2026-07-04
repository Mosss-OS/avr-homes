import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import { cities, propertyTypes, purposes, type Purpose } from "@/lib/properties";

export function SearchBar({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const [purpose, setPurpose] = useState<Purpose>("buy");
  const [city, setCity] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    navigate({
      to: "/properties",
      search: {
        purpose, q: q || undefined, city: city || undefined, type: type || undefined,
      } as never,
    });
  }

  return (
    <form onSubmit={submit} className={`w-full rounded-2xl bg-background/95 p-2 shadow-[var(--shadow-elevated)] backdrop-blur ${compact ? "" : "md:p-3"}`}>
      <div className="flex gap-1 px-2 pt-1">
        {purposes.map((p) => (
          <button key={p} type="button" onClick={() => setPurpose(p)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${
              purpose === p ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-secondary"
            }`}>{p}</button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:gap-2 md:grid-cols-[1.5fr_1fr_1fr_auto]">
        <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search by area, property type or budget…"
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>
        <select value={city} onChange={(e) => setCity(e.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none">
          <option value="">All cities</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none">
          <option value="">Any type</option>
          {propertyTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button type="submit"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-90 md:w-auto">
          <Search className="h-4 w-4" /> Search
        </button>
      </div>
    </form>
  );
}
