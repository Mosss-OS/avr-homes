import { toast } from "sonner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, ChevronLeft, ChevronRight, Search, Users, Gift, Coins, DollarSign, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/admin/referrals")({
  component: AdminReferrals,
});

interface ReferralRow {
  id: number; referrer_id: number; referred_id: number | null;
  referral_code: string; status: string; reward_amount: number;
  reward_paid: boolean; paid_at: string | null;
  referrer_name: string; referrer_email: string;
  referred_name: string | null; referred_email: string | null;
  created_at: string;
}

interface Stats {
  total_referrals: number; total_referrers: number;
  signed_up: number; upgraded: number;
  developer_referred: number; bulk_buyer_referred: number;
  total_paid: number; pending_payout: number; total_rewards: number;
}

const STATUS_OPTIONS = ["", "pending", "signed_up", "upgraded", "developer_referred", "bulk_buyer_referred"];
const STATUS_LABELS: Record<string, string> = {
  "": "All statuses", pending: "Pending", signed_up: "Signed Up",
  upgraded: "Upgraded", developer_referred: "Developer", bulk_buyer_referred: "Bulk Buyer",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  signed_up: "bg-blue-100 text-blue-700",
  upgraded: "bg-emerald-100 text-emerald-700",
  developer_referred: "bg-purple-100 text-purple-700",
  bulk_buyer_referred: "bg-cyan-100 text-cyan-700",
};

function formatCurrency(n: number) {
  return "₦" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function AdminReferrals() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<ReferralRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetch = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: "20" });
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("q", search);
    try {
      const [dataRes, statsRes] = await Promise.all([
        api.get<{ data: ReferralRow[]; total: number; total_pages: number }>(`/api/admin/referrals?${params}`),
        api.get<Stats>("/api/admin/referrals/stats"),
      ]);
      setRows(dataRes.data.data);
      setTotal(dataRes.data.total);
      setTotalPages(dataRes.data.total_pages);
      setStats(statsRes.data);
    } catch { toast.error("Failed to load referrals"); }
    setLoading(false);
  }, [page, statusFilter, search]);

  useEffect(() => { fetch(); }, [fetch]);

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    navigate({ to: "/admin/login" });
    return null;
  }

  async function updateReward(id: number, current: number) {
    const input = prompt("Reward amount (₦):", String(current));
    if (input === null) return;
    const amount = parseFloat(input);
    if (isNaN(amount) || amount < 0) { toast.error("Invalid amount"); return; }
    try {
      await api.put(`/api/admin/referrals/${id}/reward`, { reward_amount: amount });
      toast.success("Reward updated");
      fetch();
    } catch { toast.error("Failed to update reward"); }
  }

  async function markPaid(id: number) {
    if (!confirm("Mark this referral reward as paid?")) return;
    try {
      await api.put(`/api/admin/referrals/${id}/mark-paid`, {});
      toast.success("Reward marked as paid");
      fetch();
    } catch { toast.error("Failed to mark as paid"); }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Referral Program</h1>
        <p className="text-sm text-muted-foreground">{total} referrals across {stats?.total_referrers ?? 0} agents</p>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">
              <Users className="h-4 w-4" /> Referrals
            </div>
            <p className="text-2xl font-semibold">{stats.total_referrals}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">
              <Gift className="h-4 w-4" /> Referrers
            </div>
            <p className="text-2xl font-semibold">{stats.total_referrers}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">
              <Coins className="h-4 w-4" /> Total Rewards
            </div>
            <p className="text-2xl font-semibold">{formatCurrency(stats.total_rewards)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">
              <DollarSign className="h-4 w-4" /> Paid Out
            </div>
            <p className="text-2xl font-semibold text-emerald-600">{formatCurrency(stats.total_paid)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">
              <DollarSign className="h-4 w-4" /> Pending Payout
            </div>
            <p className="text-2xl font-semibold text-amber-600">{formatCurrency(stats.pending_payout)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">
              <CheckCircle2 className="h-4 w-4" /> Conversions
            </div>
            <p className="text-2xl font-semibold">{stats.signed_up + stats.upgraded + stats.developer_referred + stats.bulk_buyer_referred}</p>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, email, code..."
            className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-3 text-sm outline-none focus:ring-1 focus:ring-primary/30" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-background px-3 text-sm outline-none h-10">
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Referrer</th>
                <th className="px-4 py-3 font-medium">Referred</th>
                <th className="px-4 py-3 font-medium text-center">Code</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-right">Reward</th>
                <th className="px-4 py-3 font-medium text-center">Paid</th>
                <th className="px-4 py-3 font-medium text-center">Date</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.referrer_name}</div>
                    <div className="text-xs text-muted-foreground">{r.referrer_email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {r.referred_name ? (
                      <>
                        <div className="font-medium">{r.referred_name}</div>
                        <div className="text-xs text-muted-foreground">{r.referred_email}</div>
                      </>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <code className="rounded bg-secondary/50 px-2 py-0.5 text-xs">{r.referral_code}</code>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status] || ""}`}>{r.status.replace(/_/g, " ")}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(r.reward_amount)}</td>
                  <td className="px-4 py-3 text-center">
                    {r.reward_paid ? (
                      <span className="text-emerald-600 text-xs font-medium">Yes</span>
                    ) : (
                      <span className="text-amber-600 text-xs font-medium">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => updateReward(r.id, r.reward_amount)}
                        className="rounded-lg px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200">
                        Reward
                      </button>
                      {!r.reward_paid && r.reward_amount > 0 && (
                        <button onClick={() => markPaid(r.id)}
                          className="rounded-lg px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                          Pay
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No referrals found</td></tr>
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
