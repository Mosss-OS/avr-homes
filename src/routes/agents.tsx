/**
 * Agent directory route (/agents).
 * Fetches all agents from the API, provides search and verification filters,
 * and displays a paginated grid of agent cards. Each card links to the
 * individual agent profile at /agents/$slug.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Phone, Mail, Globe, Search, BadgeCheck, ChevronLeft, ChevronRight, Loader2, MapPin } from "lucide-react";
import { api } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "Top Lagos Real Estate Agents — AVR Homes" },
      { name: "description", content: "Connect with verified luxury property agents across Lekki, Ikoyi, Victoria Island and beyond." },
      { property: "og:title", content: "Top Lagos Real Estate Agents — AVR Homes" },
      { property: "og:description", content: "Find trusted, verified real estate agents in Lagos. Browse agent profiles and get in touch directly." },
      { property: "og:url", content: "https://avrusthomes.com/agents" },
    ],
    links: [{ rel: "canonical", href: "https://avrusthomes.com/agents" }],
  }),
  component: AgentsPage,
});

/** Shape of an agent as returned by the /api/agents list endpoint. */
interface AgentListItem {
  id: number;
  slug: string | null;
  photo_url: string | null;
  name: string;
  agency: string;
  phone: string;
  email: string;
  languages: string[];
  listings: number;
  avatar_hue: number;
  bio: string | null;
  is_verified: boolean;
}

const PER_PAGE = 12;

/** Agent directory page — fetches, filters, searches, and paginates through a list of agents. */
function AgentsPage() {
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [verificationFilter, setVerificationFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get<AgentListItem[]>("/api/agents")
      .then((r) => setAgents(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { setPage(1); }, [search, verificationFilter]);

  const filtered = useMemo(() => {
    let result = agents;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((a) =>
        a.name.toLowerCase().includes(q) ||
        a.agency.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q)
      );
    }
    if (verificationFilter === "verified") result = result.filter((a) => a.is_verified);
    else if (verificationFilter === "unverified") result = result.filter((a) => !a.is_verified);
    return result;
  }, [agents, search, verificationFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--gold)]">Talk to a pro</p>
      <h1 className="mt-1 font-display text-4xl font-semibold sm:text-5xl">Top Lagos agents</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Verified, top-rated agents who actually respond. Pick someone who knows your neighborhood.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, agency..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-1">
          {[
            ["all", "All"],
            ["verified", "Verified"],
            ["unverified", "Unverified"],
          ].map(([value, label]) => (
            <button key={value} onClick={() => setVerificationFilter(value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                verificationFilter === value
                  ? "bg-primary text-primary-foreground"
                  : "border border-input bg-background hover:bg-accent"
              }`}>
              {label}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground ml-auto">{filtered.length} agent{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center mt-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : paged.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12">
          <p className="font-medium">No agents found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {paged.map((a) => (
              <Link key={a.id} to={"/agents/$slug"} params={{ slug: a.slug || String(a.id) }}
                className="group overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition-shadow hover:shadow-lg">
                <div className="h-20" style={{ background: `linear-gradient(135deg, oklch(0.55 0.12 ${a.avatar_hue}), oklch(0.4 0.08 ${a.avatar_hue + 30}))` }} />
                <div className="-mt-10 p-5">
                  {a.photo_url ? (
                    <img src={a.photo_url} alt={a.name}
                      className="h-20 w-20 rounded-full border-4 border-card object-cover" />
                  ) : (
                    <div className="grid h-20 w-20 place-items-center rounded-full border-4 border-card font-display text-2xl font-semibold text-primary-foreground"
                      style={{ background: `oklch(0.45 0.1 ${a.avatar_hue})` }}>
                      {a.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <h3 className="font-display text-xl font-semibold group-hover:text-primary transition-colors">{a.name}</h3>
                    {a.is_verified && <BadgeCheck className="h-5 w-5 text-emerald-500" />}
                  </div>
                  <p className="text-sm text-muted-foreground">{a.agency}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {a.listings} listing{a.listings !== 1 ? "s" : ""}
                  </p>
                  {a.languages.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {a.languages.slice(0, 3).map((l) => (
                        <span key={l} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs">
                          <Globe className="h-3 w-3" />{l}
                        </span>
                      ))}
                      {a.languages.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{a.languages.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1} className="rounded-full">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    p === page ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground"
                  }`}>
                  {p}
                </button>
              ))}
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages} className="rounded-full">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
