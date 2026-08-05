"use client";

/**
 * Saved properties & searches page (/saved).
 * Reads locally stored saved property IDs and saved searches (with optional
 * alerts), then renders the saved listings grid and a search-alert manager.
 * Updates live when hearts are toggled anywhere on the site.
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PropertyCard } from "@/components/property-card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchProperties, type Property } from "@/lib/properties";
import { getSavedProps, getSavedSearches, removeSavedSearch, toggleSearchAlert, type SavedSearch } from "@/lib/saved";
import { Heart, Search, Trash2, Bell, BellOff } from "lucide-react";

export default function SavedPage() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [savedProps, setSavedProps] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    const ids = getSavedProps();
    setSearches(getSavedSearches());
    if (ids.length === 0) {
      setSavedProps([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchProperties({ ids: ids.join(","), per_page: "50" })
      .then((res) => setSavedProps(res.data))
      .catch(() => setSavedProps([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("saved-props-change", load);
    return () => window.removeEventListener("saved-props-change", load);
  }, [load]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#C9A84C" }}>Bookmarked</p>
      <h1 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">Your saved items</h1>
      <p className="mt-2 text-sm text-muted-foreground">Stored locally on this device.</p>

      {/* Saved properties */}
      <section className="mt-10">
        <h2 className="inline-flex items-center gap-2 font-display text-2xl font-semibold">
          <Heart className="h-5 w-5 text-destructive" /> Properties ({savedProps.length})
        </h2>
        {loading ? (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />
            ))}
          </div>
        ) : savedProps.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">Nothing saved yet. Tap the heart on any listing to save it.</p>
            <Link href="/properties?purpose=buy"
              className="mt-4 inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90">
              Browse listings
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {savedProps.map((p) => <PropertyCard key={p.id} p={p} />)}
          </div>
        )}
      </section>

      {/* Saved searches */}
      <section className="mt-12">
        <h2 className="inline-flex items-center gap-2 font-display text-2xl font-semibold">
          <Search className="h-5 w-5 text-primary" /> Saved searches ({searches.length})
        </h2>
        {searches.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No saved searches yet. Run a search and hit &ldquo;Save this search&rdquo; to keep an eye on it.
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
            {searches.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/properties?${s.query}`}
                    className="block truncate font-medium transition hover:text-primary"
                  >
                    {s.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSearches(toggleSearchAlert(s.id))}
                    title={s.alert_enabled ? "Alerts on" : "Alerts off"}
                    aria-label={s.alert_enabled ? "Turn alerts off" : "Turn alerts on"}
                    className={`grid h-9 w-9 place-items-center rounded-full transition ${
                      s.alert_enabled ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {s.alert_enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearches(removeSavedSearch(s.id))}
                    title="Delete saved search"
                    aria-label="Delete saved search"
                    className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
