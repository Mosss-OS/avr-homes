/**
 * Admin properties list route. Shows a paginated, filterable table of all
 * properties with controls to publish/unpublish, toggle featured/verified,
 * edit, and delete.
 */
import { toast } from "sonner";
import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useEffect, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import {
  Search, CheckCircle2, XCircle, Trash2, Star, EyeOff, Eye,
  Loader2, ChevronLeft, ChevronRight, MoreHorizontal, Plus, Pencil,
} from "lucide-react";

export const Route = createFileRoute("/admin/properties")({
  component: AdminProperties,
});

/** A single row returned by the admin properties listing endpoint. */
interface PropertyRow {
  id: number;
  title: string; purpose: string; type: string; price: number;
  city: string; community: string; featured: boolean; is_verified: boolean;
  is_active: number; agent_name: string | null;
  created_at: string;
}

/** Properties management page with search, status filter, pagination, and row-level actions. */
function AdminProperties() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/admin/properties") return <Outlet />;
  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const perPage = 15;

  /** Fetch properties from the API with current search, status filter, and page. */
  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (search) params.set("q", search);
    if (statusFilter) params.set("status", statusFilter);
    try {
      const res = await api.get<{ data: PropertyRow[]; total: number; total_pages: number }>(`/api/admin/properties?${params}`);
      setRows(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    navigate({ to: "/admin/login" });
    return null;
  }

  /** Publish, unpublish (draft), or archive a property. */
  async function changeStatus(id: number, status: string) {
    try {
      await api.put(`/api/admin/properties/${id}/status`, { status });
      fetchData();
      toast.success(`Property ${status === "published" ? "published" : status === "draft" ? "unpublished" : "archived"} successfully`);
    } catch {
      toast.error("Failed to update property status");
    }
  }

  /** Toggle the featured (star) flag on a property. */
  async function toggleFeature(id: number) {
    try {
      await api.put(`/api/admin/properties/${id}/feature`, {});
      fetchData();
      toast.success("Property featured status toggled");
    } catch {
      toast.error("Failed to toggle featured status");
    }
  }

  /** Toggle the verified badge on a property. */
  async function toggleVerify(id: number) {
    try {
      await api.put(`/api/admin/properties/${id}/verify`, {});
      fetchData();
      toast.success("Property verification toggled");
    } catch {
      toast.error("Failed to toggle verification");
    }
  }

  /** Permanently delete a property after user confirmation. */
  async function deleteProp(id: number) {
    if (!confirm("Delete this property permanently?")) return;
    try {
      await api.delete(`/api/admin/properties/${id}`);
      fetchData();
      toast.success("Property deleted");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to delete property";
      toast.error(msg);
    }
  }

  return (<>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Properties</h1>
          <p className="text-sm text-muted-foreground">{total} total</p>
        </div>
        <Link to="/admin/properties/create" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> New Property
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <label className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3 min-w-[200px]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by title, city, community…"
            className="h-10 w-full bg-transparent text-sm outline-none" />
        </label>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-background px-3 text-sm outline-none h-10">
          <option value="">All status</option>
          <option value="active">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Purpose</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">City</th>
                <th className="px-4 py-3 font-medium">Agent</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-center">Featured</th>
                <th className="px-4 py-3 font-medium text-center">Verified</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium max-w-[250px] truncate">{r.title}</td>
                  <td className="px-4 py-3 capitalize">{r.purpose}</td>
                  <td className="px-4 py-3">₦{(r.price / 1_000_000).toFixed(1)}M</td>
                  <td className="px-4 py-3">{r.city}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.agent_name || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.is_active === 1 ? "bg-emerald-100 text-emerald-700" :
                      r.is_active === 0 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {r.is_active === 1 ? "Published" : r.is_active === 0 ? "Draft" : "Archived"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleFeature(r.id)}
                      className={`${r.featured ? "text-amber-500" : "text-muted-foreground hover:text-amber-500"}`}>
                      <Star className="h-4 w-4" />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleVerify(r.id)}
                      className={`${r.is_verified ? "text-emerald-500" : "text-muted-foreground hover:text-emerald-500"}`}>
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {r.is_active === 1 ? (
                        <button onClick={() => changeStatus(r.id, "draft")} title="Unpublish" className="text-muted-foreground hover:text-amber-500">
                          <EyeOff className="h-4 w-4" />
                        </button>
                      ) : (
                        <button onClick={() => changeStatus(r.id, "published")} title="Publish" className="text-muted-foreground hover:text-emerald-500">
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      <Link to={`/admin/properties/${r.id}/edit`} title="Edit" className="text-muted-foreground hover:text-blue-500">
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button onClick={() => deleteProp(r.id)} title="Delete" className="text-muted-foreground hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">No properties found</td></tr>
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
  </>);
}
