import { toast } from "sonner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, ChevronLeft, ChevronRight, Search, Wallet, TrendingUp, TrendingDown, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/admin/wallet")({
  component: AdminWallet,
});

interface WalletRow {
  id: number; agent_id: number; balance: number;
  total_earned: number; total_withdrawn: number;
  user_name: string; user_email: string;
}

interface WithdrawalRow {
  id: number; wallet_id: number; agent_id: number;
  type: string; amount: number; description: string;
  reference: string | null; status: string;
  user_name: string; user_email: string; created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
};

function formatCurrency(n: number) {
  return "₦" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function AdminWallet() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"wallets" | "withdrawals">("withdrawals");

  const [wlRows, setWlRows] = useState<WalletRow[]>([]);
  const [wlTotal, setWlTotal] = useState(0);
  const [wlPage, setWlPage] = useState(1);
  const [wlTotalPages, setWlTotalPages] = useState(1);
  const [wlLoading, setWlLoading] = useState(true);
  const [wlSearch, setWlSearch] = useState("");

  const [wdRows, setWdRows] = useState<WithdrawalRow[]>([]);
  const [wdTotal, setWdTotal] = useState(0);
  const [wdPage, setWdPage] = useState(1);
  const [wdTotalPages, setWdTotalPages] = useState(1);
  const [wdLoading, setWdLoading] = useState(true);
  const [wdFilter, setWdFilter] = useState("pending");
  const [wdSearch, setWdSearch] = useState("");

  const fetchWallets = useCallback(async () => {
    setWlLoading(true);
    const params = new URLSearchParams({ page: String(wlPage), per_page: "20" });
    if (wlSearch) params.set("q", wlSearch);
    try {
      const res = await api.get<{ data: WalletRow[]; total: number; total_pages: number }>(`/api/admin/wallets?${params}`);
      setWlRows(res.data.data);
      setWlTotal(res.data.total);
      setWlTotalPages(res.data.total_pages);
    } catch { toast.error("Failed to load wallets"); }
    setWlLoading(false);
  }, [wlPage, wlSearch]);

  const fetchWithdrawals = useCallback(async () => {
    setWdLoading(true);
    const params = new URLSearchParams({ page: String(wdPage), per_page: "20" });
    if (wdFilter) params.set("status", wdFilter);
    if (wdSearch) params.set("q", wdSearch);
    try {
      const res = await api.get<{ data: WithdrawalRow[]; total: number; total_pages: number }>(`/api/admin/withdrawals?${params}`);
      setWdRows(res.data.data);
      setWdTotal(res.data.total);
      setWdTotalPages(res.data.total_pages);
    } catch { toast.error("Failed to load withdrawals"); }
    setWdLoading(false);
  }, [wdPage, wdFilter, wdSearch]);

  useEffect(() => { fetchWallets(); }, [fetchWallets]);
  useEffect(() => { fetchWithdrawals(); }, [fetchWithdrawals]);

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    navigate({ to: "/admin/login" });
    return null;
  }

  async function approveWithdrawal(id: number) {
    try { await api.put(`/api/admin/withdrawals/${id}/approve`, {}); toast.success("Withdrawal approved"); fetchWithdrawals(); }
    catch { toast.error("Failed to approve"); }
  }

  async function rejectWithdrawal(id: number) {
    if (!confirm("Reject this withdrawal and refund the wallet?")) return;
    try { await api.put(`/api/admin/withdrawals/${id}/reject`, {}); toast.success("Withdrawal rejected, wallet refunded"); fetchWithdrawals(); }
    catch { toast.error("Failed to reject"); }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Wallet & Withdrawals</h1>
        <p className="text-sm text-muted-foreground">
          {tab === "wallets" ? `${wlTotal} agent wallets` : `${wdTotal} withdrawals`}
        </p>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl bg-secondary/50 p-1 w-fit">
        <button onClick={() => setTab("withdrawals")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === "withdrawals" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          Withdrawals
        </button>
        <button onClick={() => setTab("wallets")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === "wallets" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          Agent Wallets
        </button>
      </div>

      {tab === "withdrawals" && (
        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={wdSearch} onChange={(e) => { setWdSearch(e.target.value); setWdPage(1); }}
                placeholder="Search agent..."
                className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-3 text-sm outline-none focus:ring-1 focus:ring-primary/30" />
            </div>
            <select value={wdFilter} onChange={(e) => { setWdFilter(e.target.value); setWdPage(1); }}
              className="rounded-xl border border-border bg-background px-3 text-sm outline-none h-10">
              <option value="">All status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {wdLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Agent</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium text-center">Date</th>
                    <th className="px-4 py-3 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {wdRows.map((r) => (
                    <tr key={r.id} className="hover:bg-secondary/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.user_name}</div>
                        <div className="text-xs text-muted-foreground">{r.user_email}</div>
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-xs text-muted-foreground">{r.description}</td>
                      <td className="px-4 py-3 text-right font-medium text-red-600">{formatCurrency(r.amount)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status] || ""}`}>{r.status}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {r.status === "pending" && (
                            <>
                              <button onClick={() => approveWithdrawal(r.id)} title="Approve"
                                className="rounded-lg px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                                Approve
                              </button>
                              <button onClick={() => rejectWithdrawal(r.id)} title="Reject"
                                className="rounded-lg px-2 py-1 text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200">
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {wdRows.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No withdrawals found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {wdTotalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button disabled={wdPage <= 1} onClick={() => setWdPage(wdPage - 1)}
                className="rounded-lg border border-border p-2 hover:bg-secondary disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-muted-foreground">Page {wdPage} of {wdTotalPages}</span>
              <button disabled={wdPage >= wdTotalPages} onClick={() => setWdPage(wdPage + 1)}
                className="rounded-lg border border-border p-2 hover:bg-secondary disabled:opacity-30">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "wallets" && (
        <div>
          <div className="mb-4">
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={wlSearch} onChange={(e) => { setWlSearch(e.target.value); setWlPage(1); }}
                placeholder="Search agent..."
                className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-3 text-sm outline-none focus:ring-1 focus:ring-primary/30" />
            </div>
          </div>

          {wlLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Agent</th>
                    <th className="px-4 py-3 font-medium text-right">Balance</th>
                    <th className="px-4 py-3 font-medium text-right">Total Earned</th>
                    <th className="px-4 py-3 font-medium text-right">Total Withdrawn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {wlRows.map((r) => (
                    <tr key={r.id} className="hover:bg-secondary/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.user_name}</div>
                        <div className="text-xs text-muted-foreground">{r.user_email}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(r.balance)}</td>
                      <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(r.total_earned)}</td>
                      <td className="px-4 py-3 text-right text-amber-600">{formatCurrency(r.total_withdrawn)}</td>
                    </tr>
                  ))}
                  {wlRows.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">No wallets found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {wlTotalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button disabled={wlPage <= 1} onClick={() => setWlPage(wlPage - 1)}
                className="rounded-lg border border-border p-2 hover:bg-secondary disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-muted-foreground">Page {wlPage} of {wlTotalPages}</span>
              <button disabled={wlPage >= wlTotalPages} onClick={() => setWlPage(wlPage + 1)}
                className="rounded-lg border border-border p-2 hover:bg-secondary disabled:opacity-30">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
