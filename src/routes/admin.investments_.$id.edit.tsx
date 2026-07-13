import { toast } from "sonner";
import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useEffect, useState } from "react";
import { Loader2, ChevronLeft, Percent, Users, DollarSign } from "lucide-react";

export const Route = createFileRoute("/admin/investments_/$id/edit")({
  head: () => ({ meta: [{ title: "Edit Investment — Admin — AVR Homes" }] }),
  component: AdminEditInvestment,
});

const DISTRIBUTION_OPTIONS = [
  ["monthly", "Monthly"],
  ["quarterly", "Quarterly"],
  ["semi_annual", "Semi-Annual"],
  ["annual", "Annual"],
];

const STATUS_OPTIONS = [
  ["active", "Active"],
  ["fully_funded", "Fully Funded"],
  ["closed", "Closed"],
];

interface InvestmentData {
  title: string; description: string | null; image: string | null;
  total_shares: number; share_price: number; available_shares: number;
  min_investment: number | null; expected_yield: number | null;
  distribution_frequency: string; status: string;
  property_id: number | null; funding_percentage: number;
  property_title: string | null; property_details: any | null;
}

interface Investor {
  id: number; user_name: string; user_email: string;
  shares: number; total_amount: number; purchase_price: number;
  status: string; purchase_date: string;
}

interface Dividend {
  id: number; amount_per_share: number; total_amount: number;
  declared_at: string; paid_at: string | null;
  period_start: string | null; period_end: string | null;
  status: string;
}

function AdminEditInvestment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const params = useParams({ from: "/admin/investments/$id/edit" });
  const id = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<InvestmentData>({
    title: "", description: null, image: null,
    total_shares: 0, share_price: 0, available_shares: 0,
    min_investment: null, expected_yield: null,
    distribution_frequency: "quarterly", status: "active",
    property_id: null, funding_percentage: 0,
    property_title: null, property_details: null,
  });
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [declaringDividend, setDeclaringDividend] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<any>(`/api/admin/investments/${id}`);
        const d = res.data;
        setForm({
          title: d.title || "", description: d.description || null,
          image: d.image || null,
          total_shares: d.total_shares || 0,
          share_price: d.share_price || 0,
          available_shares: d.available_shares || 0,
          min_investment: d.min_investment || null,
          expected_yield: d.expected_yield || null,
          distribution_frequency: d.distribution_frequency || "quarterly",
          status: d.status || "active",
          property_id: d.property_id || null,
          funding_percentage: d.funding_percentage || 0,
          property_title: d.property_title || null,
          property_details: d.property_details || null,
        });
        setInvestors(d.investors || []);
        setDividends(d.dividends || []);
      } catch {
        toast.error("Failed to load investment property");
        navigate({ to: "/admin/investments" });
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    navigate({ to: "/admin/login" });
    return null;
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.put(`/api/admin/investments/${id}`, {
        title: form.title, description: form.description,
        image: form.image, total_shares: form.total_shares,
        available_shares: form.available_shares,
        share_price: form.share_price, min_investment: form.min_investment,
        expected_yield: form.expected_yield,
        distribution_frequency: form.distribution_frequency,
        property_id: form.property_id,
        property_details: form.property_details,
      });
      toast.success("Investment updated");
    } catch {
      toast.error("Failed to update investment");
    }
    setSaving(false);
  }

  async function handleStatusChange(newStatus: string) {
    try {
      await api.put(`/api/admin/investments/${id}/status`, { status: newStatus });
      setForm({ ...form, status: newStatus });
      toast.success(`Status changed to ${newStatus}`);
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this investment opportunity? This cannot be undone.")) return;
    try {
      await api.delete(`/api/admin/investments/${id}`);
      toast.success("Investment deleted");
      navigate({ to: "/admin/investments" });
    } catch {
      toast.error("Failed to delete investment");
    }
  }

  async function handleDeclareDividend() {
    const amountStr = prompt("Amount per share (₦):");
    if (!amountStr) return;
    const amountPerShare = parseFloat(amountStr);
    if (isNaN(amountPerShare) || amountPerShare <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setDeclaringDividend(true);
    try {
      await api.post("/api/admin/investments/dividends", {
        investment_property_id: parseInt(id),
        amount_per_share: amountPerShare,
      });
      toast.success("Dividend declared");
      // Reload
      const res = await api.get<any>(`/api/admin/investments/${id}`);
      setDividends(res.data.dividends || []);
    } catch {
      toast.error("Failed to declare dividend");
    }
    setDeclaringDividend(false);
  }

  async function handlePayDividend(dividendId: number) {
    try {
      await api.put(`/api/admin/investments/dividends/${dividendId}/pay`, {});
      toast.success("Dividend marked as paid");
      const res = await api.get<any>(`/api/admin/investments/${id}`);
      setDividends(res.data.dividends || []);
    } catch {
      toast.error("Failed to mark dividend as paid");
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin/investments" className="rounded-lg border border-border p-2 hover:bg-secondary transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-semibold">{form.title || `Investment #${id}`}</h1>
            <p className="text-sm text-muted-foreground">Edit investment property details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-border px-3 py-1.5">
            {STATUS_OPTIONS.map(([val, label]) => (
              <button key={val} onClick={() => handleStatusChange(val)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  form.status === val
                    ? "bg-[#C9A84C] text-[#0A1628]"
                    : "text-muted-foreground hover:text-foreground"
                }`}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={handleDelete} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors">
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 font-display text-lg font-semibold">Details</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#C9A84C]" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#C9A84C]" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Total Shares</label>
                <input type="number" value={form.total_shares} onChange={(e) => setForm({ ...form, total_shares: parseInt(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#C9A84C]" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Available Shares</label>
                <input type="number" value={form.available_shares} onChange={(e) => setForm({ ...form, available_shares: parseInt(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#C9A84C]" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Share Price (₦)</label>
                <input type="number" value={form.share_price} onChange={(e) => setForm({ ...form, share_price: parseFloat(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#C9A84C]" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Expected Yield (%)</label>
                <input type="number" value={form.expected_yield || ""} onChange={(e) => setForm({ ...form, expected_yield: parseFloat(e.target.value) || null })}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#C9A84C]" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Min Investment (₦)</label>
                <input type="number" value={form.min_investment || ""} onChange={(e) => setForm({ ...form, min_investment: parseFloat(e.target.value) || null })}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#C9A84C]" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Distribution</label>
                <select value={form.distribution_frequency}
                  onChange={(e) => setForm({ ...form, distribution_frequency: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#C9A84C]">
                  {DISTRIBUTION_OPTIONS.map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Image URL</label>
                <input value={form.image || ""} onChange={(e) => setForm({ ...form, image: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#C9A84C]" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Linked Property ID</label>
                <input type="number" value={form.property_id || ""} onChange={(e) => setForm({ ...form, property_id: parseInt(e.target.value) || null })}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#C9A84C]" />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={handleSave} disabled={saving}
                className="rounded-xl bg-[#C9A84C] px-6 py-2 text-sm font-medium text-[#0A1628] hover:bg-[#C9A84C]/90 disabled:opacity-50">
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Dividends</h2>
              <button onClick={handleDeclareDividend} disabled={declaringDividend}
                className="rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200 disabled:opacity-50">
                {declaringDividend ? "..." : "Declare Dividend"}
              </button>
            </div>
            {dividends.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No dividends declared yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Per Share</th>
                      <th className="px-3 py-2 font-medium">Total</th>
                      <th className="px-3 py-2 font-medium">Period</th>
                      <th className="px-3 py-2 font-medium">Declared</th>
                      <th className="px-3 py-2 font-medium text-center">Status</th>
                      <th className="px-3 py-2 font-medium text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {dividends.map((d) => (
                      <tr key={d.id} className="hover:bg-secondary/30">
                        <td className="px-3 py-2">₦{(d.amount_per_share ?? 0).toLocaleString()}</td>
                        <td className="px-3 py-2">₦{(d.total_amount ?? 0).toLocaleString()}</td>
                        <td className="px-3 py-2 text-xs">
                          {d.period_start ? new Date(d.period_start).toLocaleDateString() : "—"} &ndash; {d.period_end ? new Date(d.period_end).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-3 py-2 text-xs">{new Date(d.declared_at).toLocaleDateString()}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            d.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}>{d.status}</span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {d.status === "declared" && (
                            <button onClick={() => handlePayDividend(d.id)}
                              className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-200">
                              Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 font-display text-lg font-semibold">Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Funding</span>
                <span className="font-medium">{form.funding_percentage}%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-[#C9A84C]" style={{ width: `${Math.min(form.funding_percentage, 100)}%` }} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Available</span>
                <span className="font-medium">{form.available_shares.toLocaleString()} / {form.total_shares.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Share Price</span>
                <span className="font-medium">₦{(form.share_price ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Min Investment</span>
                <span className="font-medium">{form.min_investment ? `₦${form.min_investment.toLocaleString()}` : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expected Yield</span>
                <span className="font-medium text-emerald-600">{form.expected_yield ? `${form.expected_yield}%` : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Distribution</span>
                <span className="font-medium capitalize">{form.distribution_frequency.replace("_", " ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className={`font-medium ${form.status === "active" ? "text-emerald-600" : form.status === "fully_funded" ? "text-blue-600" : "text-zinc-600"}`}>
                  {form.status === "fully_funded" ? "Fully Funded" : form.status.charAt(0).toUpperCase() + form.status.slice(1)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Investors ({investors.length})</h2>
            </div>
            {investors.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No investors yet</p>
            ) : (
              <div className="space-y-2">
                {investors.map((inv) => (
                  <div key={inv.id} className="rounded-xl bg-secondary/30 p-3 text-sm">
                    <p className="font-medium truncate">{inv.user_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{inv.user_email}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{inv.shares} shares</span>
                      <span>₦{(inv.total_amount ?? 0).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
