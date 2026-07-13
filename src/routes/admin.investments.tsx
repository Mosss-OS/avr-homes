import { toast } from "sonner";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useEffect, useState, useCallback } from "react";
import {
  Loader2, TrendingUp, MapPin, Percent, DollarSign, Users,
  ChevronLeft, ChevronRight, Plus, Building2,
} from "lucide-react";

export const Route = createFileRoute("/admin/investments")({
  head: () => ({ meta: [{ title: "Investments — Admin — AVR Homes" }] }),
  component: AdminInvestments,
});

interface InvestmentRow {
  id: number; title: string; status: string;
  total_shares: number; available_shares: number;
  share_price: number; expected_yield: number | null;
  property_title: string | null; city: string | null;
  investor_count: number; total_raised: number;
  funding_percentage: number;
  created_at: string;
}

function AdminInvestments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<InvestmentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: "15" });
    if (filter) params.set("status", filter);
    try {
      const res = await api.get<{ data: InvestmentRow[]; total: number; total_pages: number }>(`/api/admin/investments?${params}`);
      setRows(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch {
      toast.error("Failed to load investments");
    }
    setLoading(false);
  }, [page, filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    navigate({ to: "/admin/login" });
    return null;
  }

  const totalRaised = rows.reduce((s, r) => s + r.total_raised, 0);
  const totalInvestors = rows.reduce((s, r) => s + r.investor_count, 0);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Investments</h1>
          <p className="text-sm text-muted-foreground">{total} opportunities</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-border bg-background px-3 text-sm outline-none h-10">
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="fully_funded">Fully Funded</option>
            <option value="closed">Closed</option>
          </select>
          <Link to="/admin/investments/new" className="inline-flex items-center gap-2 rounded-xl bg-[#C9A84C] px-4 py-2 text-sm font-medium text-[#0A1628] hover:bg-[#C9A84C]/90">
            <Plus className="h-4 w-4" /> New Investment
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Raised</p>
          <p className="mt-1 text-xl font-semibold">₦{totalRaised.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Investors</p>
          <p className="mt-1 text-xl font-semibold">{totalInvestors}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Active Opportunities</p>
          <p className="mt-1 text-xl font-semibold">{rows.filter((r) => r.status === "active").length}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Yield</th>
                <th className="px-4 py-3 font-medium">Shares</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Raised</th>
                <th className="px-4 py-3 font-medium">Investors</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3 max-w-[220px]">
                    <p className="font-medium truncate">{r.title}</p>
                    {r.city && <p className="text-xs text-muted-foreground truncate">{r.city}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                      <Percent className="h-3 w-3" />{r.expected_yield ?? "—"}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <p>{r.available_shares.toLocaleString()} / {r.total_shares.toLocaleString()}</p>
                    <div className="mt-1 h-1.5 w-24 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-[#C9A84C] transition-all"
                        style={{ width: `${Math.min(r.funding_percentage, 100)}%` }} />
                    </div>
                  </td>
                  <td className="px-4 py-3">₦{(r.share_price ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3">₦{(r.total_raised ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3">{r.investor_count}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.status === "active" ? "bg-emerald-100 text-emerald-700" :
                      r.status === "fully_funded" ? "bg-blue-100 text-blue-700" : "bg-zinc-100 text-zinc-700"
                    }`}>
                      {r.status === "fully_funded" ? "Fully Funded" : r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link to={`/admin/investments/${r.id}/edit`}
                      className="rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-secondary transition-colors">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No investment opportunities found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-border p-2 hover:bg-secondary disabled:opacity-30">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-lg border border-border p-2 hover:bg-secondary disabled:opacity-30">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
