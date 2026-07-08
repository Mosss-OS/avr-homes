import { toast } from "sonner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, ChevronLeft, ChevronRight, CreditCard, Search } from "lucide-react";

export const Route = createFileRoute("/admin/subscriptions")({
  component: AdminSubscriptions,
});

interface SubscriptionRow {
  id: number; agent_id: number; tier: string; status: string;
  listings_limit: number; featured_slots: number;
  lead_priority: number; analytics_access: boolean;
  verification_priority: number; dedicated_manager: boolean;
  current_period_start: string; current_period_end: string;
  cancelled_at: string | null; user_name: string; user_email: string;
  listing_count: number;
}

const TIER_COLORS: Record<string, string> = {
  free: "bg-slate-100 text-slate-700",
  bronze: "bg-amber-100 text-amber-700",
  silver: "bg-slate-300 text-slate-800",
  gold: "bg-yellow-100 text-yellow-700",
  platinum: "bg-purple-100 text-purple-700",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  past_due: "bg-amber-100 text-amber-700",
  trialing: "bg-blue-100 text-blue-700",
};

const TIERS = ["free", "bronze", "silver", "gold", "platinum"];

function AdminSubscriptions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: "20" });
    if (tierFilter) params.set("tier", tierFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("q", search);
    try {
      const res = await api.get<{ data: SubscriptionRow[]; total: number; total_pages: number }>(`/api/admin/subscriptions?${params}`);
      setRows(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch { toast.error("Failed to load subscriptions"); }
    setLoading(false);
  }, [page, tierFilter, statusFilter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    navigate({ to: "/admin/login" });
    return null;
  }

  async function updateTier(id: number, tier: string) {
    try {
      await api.put(`/api/admin/subscriptions/${id}/tier`, { tier });
      toast.success(`Tier changed to ${tier}`);
      fetchData();
    } catch { toast.error("Failed to update tier"); }
  }

  async function updateStatus(id: number, status: string) {
    try {
      await api.put(`/api/admin/subscriptions/${id}/status`, { status });
      toast.success(`Status changed to ${status}`);
      fetchData();
    } catch { toast.error("Failed to update status"); }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Subscriptions</h1>
          <p className="text-sm text-muted-foreground">{total} agents on plans</p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search agent name or email..."
            className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-3 text-sm outline-none focus:ring-1 focus:ring-primary/30" />
        </div>
        <div className="flex gap-2">
          <select value={tierFilter} onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-border bg-background px-3 text-sm outline-none h-10">
            <option value="">All tiers</option>
            {TIERS.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-border bg-background px-3 text-sm outline-none h-10">
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="cancelled">Cancelled</option>
            <option value="past_due">Past Due</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Agent</th>
                <th className="px-4 py-3 font-medium text-center">Plan</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-right">Listings</th>
                <th className="px-4 py-3 font-medium text-center">Period End</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.user_name}</div>
                    <div className="text-xs text-muted-foreground">{r.user_email}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TIER_COLORS[r.tier] || ""}`}>
                      {r.tier.charAt(0).toUpperCase() + r.tier.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status] || ""}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-medium">{r.listing_count}</span>
                    <span className="text-muted-foreground">/{r.listings_limit === -1 ? "∞" : r.listings_limit}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                    {new Date(r.current_period_end).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <select value={r.tier} onChange={(e) => updateTier(r.id, e.target.value)}
                        className="rounded-lg border border-border px-2 py-1 text-xs outline-none bg-background">
                        {TIERS.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                      {r.status === "active" ? (
                        <button onClick={() => updateStatus(r.id, "cancelled")}
                          className="rounded-lg px-2 py-1 text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200">
                          Cancel
                        </button>
                      ) : (
                        <button onClick={() => updateStatus(r.id, "active")}
                          className="rounded-lg px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                          Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No subscriptions found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}
            className="rounded-lg border border-border p-2 hover:bg-secondary disabled:opacity-30">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
            className="rounded-lg border border-border p-2 hover:bg-secondary disabled:opacity-30">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
