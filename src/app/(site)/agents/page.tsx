"use client";

/**
 * Agents listing page — directory of verified agents, ordered by listings.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { BadgeCheck, MapPin, Building2, Users } from "lucide-react";

interface AgentListItem {
  id: number;
  slug: string;
  photo_url: string | null;
  name: string;
  agency: string;
  phone: string;
  email: string;
  languages: string[];
  listings: number;
  avatar_hue: number;
  bio: string;
  is_verified: boolean;
}

function initials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get<AgentListItem[]>("/api/agents")
      .then((res) => {
        if (!cancelled) setAgents(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't load agents right now. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#C9A84C" }}>Our Network</p>
        <h1 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">Find a trusted agent</h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Verified real estate professionals across Lagos, Abuja, Port Harcourt and beyond — talk directly, no middlemen.
        </p>
      </div>

      {error && (
        <div className="mt-10 rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">{error}</div>
      )}

      {loading && (
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="mt-4 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-2/3" />
              <Skeleton className="mt-4 h-9 w-full rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {!loading && !error && agents.length === 0 && (
        <div className="mt-10 rounded-2xl border border-border bg-card p-10 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-3 font-display text-lg font-semibold">No agents yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Agents will appear here once they join the platform.</p>
        </div>
      )}

      {!loading && !error && agents.length > 0 && (
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {agents.map((a) => (
            <Link
              key={a.id}
              href={`/agents/${a.slug}`}
              className="group rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
            >
              <div className="flex items-center gap-3">
                {a.photo_url ? (
                  <img src={a.photo_url} alt={a.name} className="h-12 w-12 shrink-0 rounded-full object-cover" loading="lazy" />
                ) : (
                  <div
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                    style={{ background: a.avatar_hue ? `oklch(0.45 0.1 ${a.avatar_hue})` : "oklch(0.45 0.1 200)" }}
                  >
                    {initials(a.name)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-semibold group-hover:text-primary">{a.name}</span>
                    {a.is_verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}
                  </div>
                  {a.agency && <div className="truncate text-xs text-muted-foreground">{a.agency}</div>}
                </div>
              </div>
              {a.bio && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{a.bio}</p>}
              <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-primary" /> {a.listings} listings</span>
                {a.languages?.length > 0 && (
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-primary" /> {a.languages.slice(0, 2).join(", ")}</span>
                )}
              </div>
              <span className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition group-hover:opacity-90">
                View profile
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
