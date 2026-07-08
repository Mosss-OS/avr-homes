/**
 * Agent listings management route — lists all agent-owned properties
 * with search, status filtering, and inline publish/draft/delete actions.
 */

import { useState, useEffect } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Search, Edit3, Trash2, Eye, Home } from "lucide-react";

export const Route = createFileRoute("/agent/dashboard/listings")({
  head: () => ({ meta: [{ title: "My Listings — AVR Homes" }] }),
  component: AgentListingsPage,
});

/** A single property listing managed by the agent. */
interface Property {
  id: number;
  title: string;
  slug: string;
  type: string;
  purpose: string;
  price: number;
  image: string | null;
  status: string;
  is_active: number;
  is_verified: number;
  city: string;
  community: string;
  created_at: string;
  inquiry_count?: number;
}

/** Listings page component — renders a searchable, filterable table of agent properties. */
function AgentListingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [listings, setListings] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    if (!authLoading && !user) return;
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);

    api.get<{ data: Property[]; total: number }>("/api/agent/listings?" + params.toString())
      .then((res) => setListings(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading, search, statusFilter]);

  if (pathname !== "/agent/dashboard/listings") return <Outlet />;

  /** Delete a listing after user confirmation, then remove it from local state. */
  async function handleDelete(id: number) {
    if (!confirm("Delete this listing?")) return;
    try {
      await api.delete(`/api/agent/listings/${id}`);
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch {}
  }

  /** Toggle a listing between published and draft status. */
  async function handleToggleStatus(id: number, currentStatus: string) {
    const newStatus = currentStatus === "published" ? "draft" : "published";
    try {
      await api.put(`/api/agent/listings/${id}/status`, { status: newStatus });
      setListings((prev) => prev.map((l) => l.id === id ? { ...l, status: newStatus } : l));
    } catch {}
  }

  /** Return a coloured Badge element for the given listing status. */
  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      published: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
      draft: "bg-amber-500/10 text-amber-600 border-amber-200",
      archived: "bg-slate-500/10 text-slate-600 border-slate-200",
    };
    return <Badge variant="outline" className={styles[status] || ""}>{status}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">My Listings</h1>
          <p className="text-sm text-muted-foreground">{listings.length} property{listings.length !== 1 ? "ies" : "y"}</p>
        </div>
        <Link to="/agent/dashboard/listings/create" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> Add Property
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search listings..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        {["", "published", "draft", "archived"].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === s ? "bg-primary text-primary-foreground" : "border border-input bg-background hover:bg-accent"
            }`}>
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12">
          <Home className="mb-3 h-12 w-12 text-muted-foreground/40" />
          <p className="font-medium">No listings yet</p>
          <p className="mb-4 text-sm text-muted-foreground">Create your first property listing.</p>
          <Link to="/agent/dashboard/listings/create" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" /> Add Property
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Property</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Price</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Leads</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {listings.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-accent">
                        {p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-muted-foreground/40"><Home className="h-5 w-5" /></div>}
                      </div>
                      <div>
                        <p className="font-medium">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{p.city}, {p.community} · {p.type} · {p.purpose}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">₦{(p.price / 1e6).toFixed(1)}M</td>
                  <td className="px-4 py-3">{statusBadge(p.status)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.inquiry_count ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleToggleStatus(p.id, p.status)} className="rounded-lg p-2 hover:bg-accent" title={p.status === "published" ? "Draft" : "Publish"}>
                        {p.status === "published" ? <Eye className="h-4 w-4" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </button>
                      <Link to="/agent/dashboard/listings/$id/edit" params={{ id: String(p.id) }} className="rounded-lg p-2 hover:bg-accent" title="Edit">
                        <Edit3 className="h-4 w-4" />
                      </Link>
                      <button onClick={() => handleDelete(p.id)} className="rounded-lg p-2 hover:bg-accent text-destructive" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
