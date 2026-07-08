/**
 * Saved properties and searches route (/saved).
 * Reads locally stored saved property IDs and saved searches (with optional alerts),
 * then renders the saved listings grid and a search-alert management list.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Search, Trash2, Bell, BellOff } from "lucide-react";
import { PropertyCard } from "@/components/property-card";
import { properties } from "@/lib/properties";
import { getSavedProps, getSavedSearches, removeSavedSearch, toggleSearchAlert, type SavedSearch } from "@/lib/saved";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "Saved properties & searches — AVR Homes" },
      { name: "description", content: "Your saved Lagos properties and search alerts." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Saved,
});

/** Saved page — shows bookmarked properties and saved searches with alert-toggle and delete. */
function Saved() {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [searches, setSearches] = useState<SavedSearch[]>([]);

  useEffect(() => {
    setSavedIds(getSavedProps());
    setSearches(getSavedSearches());
  }, []);

  const savedProps = properties.filter((p) => savedIds.includes(String(p.id)));

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-semibold sm:text-5xl">Your saved items</h1>
      <p className="mt-2 text-muted-foreground">Stored locally on this device.</p>

      <section className="mt-10">
        <h2 className="inline-flex items-center gap-2 font-display text-2xl font-semibold">
          <Heart className="h-5 w-5 text-destructive" /> Properties ({savedProps.length})
        </h2>
        {savedProps.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">Nothing saved yet. Tap the heart on any listing to save it.</p>
            <Link to="/properties" search={{ purpose: "buy" } as never}
              className="mt-3 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Browse listings</Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {savedProps.map((p) => <PropertyCard key={p.id} p={p} />)}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="inline-flex items-center gap-2 font-display text-2xl font-semibold">
          <Search className="h-5 w-5 text-primary" /> Saved searches ({searches.length})
        </h2>
        {searches.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">No saved searches yet. Run a search and hit "Save this search".</p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {searches.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <Link to="/properties" search={Object.fromEntries(new URLSearchParams(s.query)) as never}
                    className="font-medium hover:underline">{s.name}</Link>
                  <div className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setSearches(toggleSearchAlert(s.id))}
                    className={`grid h-9 w-9 place-items-center rounded-full transition ${
                      s.alert_enabled
                        ? "text-primary hover:bg-primary/10"
                        : "text-muted-foreground hover:bg-secondary"
                    }`}
                    title={s.alert_enabled ? "Alerts on" : "Alerts off"}>
                    {s.alert_enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                  </button>
                  <button onClick={() => setSearches(removeSavedSearch(s.id))}
                    className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-destructive">
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
