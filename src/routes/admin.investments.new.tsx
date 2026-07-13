import { toast } from "sonner";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/admin/investments/new")({
  head: () => ({ meta: [{ title: "New Investment — Admin — AVR Homes" }] }),
  component: AdminNewInvestment,
});

const DISTRIBUTION_OPTIONS = [
  ["monthly", "Monthly"],
  ["quarterly", "Quarterly"],
  ["semi_annual", "Semi-Annual"],
  ["annual", "Annual"],
];

function AdminNewInvestment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", image: "",
    total_shares: "", share_price: "", min_investment: "",
    expected_yield: "", distribution_frequency: "quarterly",
    property_id: "",
  });

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    navigate({ to: "/admin/login" });
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.total_shares || !form.share_price) {
      toast.error("Title, Total Shares, and Share Price are required");
      return;
    }
    setSaving(true);
    try {
      const res = await api.post<{ id: number }>("/api/admin/investments", {
        title: form.title,
        description: form.description || null,
        image: form.image || null,
        total_shares: parseInt(form.total_shares),
        share_price: parseFloat(form.share_price),
        min_investment: form.min_investment ? parseFloat(form.min_investment) : null,
        expected_yield: form.expected_yield ? parseFloat(form.expected_yield) : null,
        distribution_frequency: form.distribution_frequency,
        property_id: form.property_id ? parseInt(form.property_id) : null,
      });
      toast.success("Investment property created");
      navigate({ to: `/admin/investments/${res.data.id}/edit` });
    } catch {
      toast.error("Failed to create investment property");
    }
    setSaving(false);
  }

  return (
    <>
      <div className="mb-6 flex items-center gap-3">
        <Link to="/admin/investments" className="rounded-lg border border-border p-2 hover:bg-secondary transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-semibold">New Investment</h1>
          <p className="text-sm text-muted-foreground">Create a new fractional investment opportunity</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl rounded-2xl border border-border bg-card p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Title *</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#C9A84C]" required />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#C9A84C]" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Total Shares *</label>
            <input type="number" value={form.total_shares} onChange={(e) => setForm({ ...form, total_shares: e.target.value })}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#C9A84C]" required />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Share Price (₦) *</label>
            <input type="number" step="0.01" value={form.share_price} onChange={(e) => setForm({ ...form, share_price: e.target.value })}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#C9A84C]" required />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Min Investment (₦)</label>
            <input type="number" step="0.01" value={form.min_investment} onChange={(e) => setForm({ ...form, min_investment: e.target.value })}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#C9A84C]" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Expected Yield (%)</label>
            <input type="number" step="0.1" value={form.expected_yield} onChange={(e) => setForm({ ...form, expected_yield: e.target.value })}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#C9A84C]" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Distribution Frequency</label>
            <select value={form.distribution_frequency} onChange={(e) => setForm({ ...form, distribution_frequency: e.target.value })}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#C9A84C]">
              {DISTRIBUTION_OPTIONS.map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Linked Property ID</label>
            <input type="number" value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#C9A84C]" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Image URL</label>
            <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#C9A84C]" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Link to="/admin/investments" className="rounded-xl border border-border px-5 py-2 text-sm font-medium hover:bg-secondary transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={saving}
            className="rounded-xl bg-[#C9A84C] px-6 py-2 text-sm font-medium text-[#0A1628] hover:bg-[#C9A84C]/90 disabled:opacity-50">
            {saving ? "Creating..." : "Create Investment"}
          </button>
        </div>
      </form>
    </>
  );
}
