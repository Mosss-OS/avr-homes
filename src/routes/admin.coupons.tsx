import { toast } from "sonner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, ChevronLeft, ChevronRight, Search, Plus, Tag, Percent, DollarSign, Users, CalendarDays, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/coupons")({
  component: AdminCoupons,
});

interface Coupon {
  id: number; code: string; description: string | null;
  discount_type: string; discount_value: number;
  min_order_amount: number | null; max_discount: number | null;
  max_uses: number | null; max_uses_per_user: number | null;
  used_count: number; applies_to: string;
  is_active: boolean; starts_at: string | null;
  expires_at: string | null; created_at: string;
}

interface CouponUsage {
  id: number; coupon_id: number; user_id: number;
  order_type: string; order_id: number | null;
  discount_amount: number; user_name: string; user_email: string;
  used_at: string;
}

const DISCOUNT_TYPES = ["percentage", "fixed"];
const APPLIES_TO = ["all", "buy", "rent", "shortlet", "subscription"];

function AdminCoupons() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [rows, setRows] = useState<Coupon[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState({
    code: "", description: "", discount_type: "percentage", discount_value: "",
    min_order_amount: "", max_discount: "", max_uses: "", max_uses_per_user: "",
    applies_to: "all", is_active: true, starts_at: "", expires_at: "",
  });

  const [usageModal, setUsageModal] = useState<{ code: string; rows: CouponUsage[] } | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: "20" });
    if (search) params.set("q", search);
    if (activeFilter) params.set("active", activeFilter);
    try {
      const res = await api.get<{ data: Coupon[]; total: number; total_pages: number }>(`/api/admin/coupons?${params}`);
      setRows(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch { toast.error("Failed to load coupons"); }
    setLoading(false);
  }, [page, search, activeFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    navigate({ to: "/admin/login" });
    return null;
  }

  function resetForm() {
    setForm({ code: "", description: "", discount_type: "percentage", discount_value: "", min_order_amount: "", max_discount: "", max_uses: "", max_uses_per_user: "", applies_to: "all", is_active: true, starts_at: "", expires_at: "" });
    setEditing(null);
    setShowForm(false);
  }

  function editCoupon(c: Coupon) {
    setForm({
      code: c.code, description: c.description || "",
      discount_type: c.discount_type, discount_value: String(c.discount_value),
      min_order_amount: c.min_order_amount ? String(c.min_order_amount) : "",
      max_discount: c.max_discount ? String(c.max_discount) : "",
      max_uses: c.max_uses ? String(c.max_uses) : "",
      max_uses_per_user: c.max_uses_per_user ? String(c.max_uses_per_user) : "",
      applies_to: c.applies_to, is_active: c.is_active,
      starts_at: c.starts_at ? c.starts_at.slice(0, 16) : "",
      expires_at: c.expires_at ? c.expires_at.slice(0, 16) : "",
    });
    setEditing(c);
    setShowForm(true);
  }

  async function save() {
    if (!form.code || !form.discount_value) { toast.error("Code and discount value required"); return; }
    const payload: Record<string, unknown> = {
      code: form.code.toUpperCase(), discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value),
      description: form.description || null, applies_to: form.applies_to,
      is_active: form.is_active,
    };
    if (form.min_order_amount) payload.min_order_amount = parseFloat(form.min_order_amount);
    if (form.max_discount) payload.max_discount = parseFloat(form.max_discount);
    if (form.max_uses) payload.max_uses = parseInt(form.max_uses);
    if (form.max_uses_per_user) payload.max_uses_per_user = parseInt(form.max_uses_per_user);
    if (form.starts_at) payload.starts_at = form.starts_at;
    if (form.expires_at) payload.expires_at = form.expires_at;

    try {
      if (editing) {
        await api.put(`/api/admin/coupons/${editing.id}`, payload);
        toast.success("Coupon updated");
      } else {
        await api.post("/api/admin/coupons", payload);
        toast.success("Coupon created");
      }
      resetForm();
      fetch();
    } catch { toast.error("Failed to save coupon"); }
  }

  async function deleteCoupon(id: number) {
    if (!confirm("Delete this coupon permanently?")) return;
    try { await api.delete(`/api/admin/coupons/${id}`); toast.success("Coupon deleted"); fetch(); }
    catch { toast.error("Failed to delete"); }
  }

  async function toggleActive(c: Coupon) {
    try { await api.put(`/api/admin/coupons/${c.id}`, { is_active: !c.is_active }); toast.success(c.is_active ? "Deactivated" : "Activated"); fetch(); }
    catch { toast.error("Failed to update"); }
  }

  async function showUsage(c: Coupon) {
    try {
      const res = await api.get<CouponUsage[]>(`/api/admin/coupons/${c.id}/usage`);
      setUsageModal({ code: c.code, rows: res.data });
    } catch { toast.error("Failed to load usage"); }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Coupons & Discounts</h1>
          <p className="text-sm text-muted-foreground">{total} coupons</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> New Coupon
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search code or description..."
            className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-3 text-sm outline-none focus:ring-1 focus:ring-primary/30" />
        </div>
        <select value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-background px-3 text-sm outline-none h-10">
          <option value="">All</option>
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>
      </div>

      {showForm && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold mb-4">{editing ? "Edit Coupon" : "New Coupon"}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Code *</label>
              <input value={form.code} onChange={(e) => setForm({...form, code: e.target.value})}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/30" placeholder="SUMMER20" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Discount Type</label>
              <select value={form.discount_type} onChange={(e) => setForm({...form, discount_type: e.target.value})}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none">
                {DISCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Discount Value *</label>
              <input value={form.discount_value} onChange={(e) => setForm({...form, discount_value: e.target.value})}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/30" placeholder={form.discount_type === "percentage" ? "20" : "5000"} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Min Order Amount</label>
              <input value={form.min_order_amount} onChange={(e) => setForm({...form, min_order_amount: e.target.value})}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/30" placeholder="Leave empty for none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Max Discount (for %)</label>
              <input value={form.max_discount} onChange={(e) => setForm({...form, max_discount: e.target.value})}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Max Total Uses</label>
              <input value={form.max_uses} onChange={(e) => setForm({...form, max_uses: e.target.value})}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Max Uses Per User</label>
              <input value={form.max_uses_per_user} onChange={(e) => setForm({...form, max_uses_per_user: e.target.value})}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Applies To</label>
              <select value={form.applies_to} onChange={(e) => setForm({...form, applies_to: e.target.value})}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none">
                {APPLIES_TO.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
              <input value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none" placeholder="Optional description" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Starts At</label>
              <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({...form, starts_at: e.target.value})}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Expires At</label>
              <input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({...form, expires_at: e.target.value})}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none" />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({...form, is_active: e.target.checked})}
                  className="rounded border-border" />
                <span className="text-sm">Active</span>
              </label>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={save} className="rounded-xl bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              {editing ? "Update" : "Create"}
            </button>
            <button onClick={resetForm} className="rounded-xl border border-border px-6 py-2 text-sm font-medium hover:bg-secondary">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Discount</th>
                <th className="px-4 py-3 font-medium">Applies To</th>
                <th className="px-4 py-3 font-medium text-center">Uses</th>
                <th className="px-4 py-3 font-medium text-center">Active</th>
                <th className="px-4 py-3 font-medium text-center">Expires</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((c) => {
                const expired = c.expires_at && new Date(c.expires_at) < new Date();
                return (
                  <tr key={c.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <code className="rounded bg-secondary/50 px-2 py-0.5 text-sm font-semibold">{c.code}</code>
                      </div>
                      {c.description && <div className="mt-0.5 text-xs text-muted-foreground">{c.description}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{c.discount_type === "percentage" ? `${c.discount_value}%` : `₦${c.discount_value.toLocaleString()}`}</span>
                      {c.max_discount && <div className="text-xs text-muted-foreground">Max ₦{c.max_discount.toLocaleString()}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs capitalize">{c.applies_to}</td>
                    <td className="px-4 py-3 text-center">
                      <span>{c.used_count}</span>
                      {c.max_uses && <span className="text-xs text-muted-foreground"> / {c.max_uses}</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleActive(c)} title="Toggle active">
                        {c.is_active ? <ToggleRight className="h-5 w-5 text-emerald-600" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      {c.expires_at ? (
                        <span className={expired ? "text-red-600" : ""}>{new Date(c.expires_at).toLocaleDateString()}</span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => editCoupon(c)}
                          className="rounded-lg px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200">Edit</button>
                        <button onClick={() => showUsage(c)}
                          className="rounded-lg px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200">Usage</button>
                        <button onClick={() => deleteCoupon(c.id)}
                          className="rounded-lg px-2 py-1 text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No coupons found</td></tr>
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

      {usageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setUsageModal(null)}>
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-lg font-semibold mb-3">Usage: {usageModal.code}</h2>
            {usageModal.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No usage yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="pb-2 font-medium">User</th>
                  <th className="pb-2 font-medium text-right">Discount</th>
                  <th className="pb-2 font-medium text-right">Date</th>
                </tr></thead>
                <tbody className="divide-y">
                  {usageModal.rows.map((u) => (
                    <tr key={u.id}>
                      <td className="py-2">
                        <div className="font-medium">{u.user_name}</div>
                        <div className="text-xs text-muted-foreground">{u.user_email}</div>
                      </td>
                      <td className="py-2 text-right">₦{u.discount_amount.toLocaleString()}</td>
                      <td className="py-2 text-right text-xs text-muted-foreground">{new Date(u.used_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
