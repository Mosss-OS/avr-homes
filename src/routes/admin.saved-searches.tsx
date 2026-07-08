import { toast } from "sonner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, ChevronLeft, ChevronRight, Search, Trash2, Bell, BellOff, BellRing } from "lucide-react";

export const Route = createFileRoute("/admin/saved-searches")({
  component: AdminSavedSearches,
});

interface SavedSearch {
  id: number; user_id: number; user_name: string; user_email: string;
  name: string; filters: Record<string, unknown>;
  alert_enabled: boolean; created_at: string; updated_at: string;
}

function AdminSavedSearches() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<SavedSearch[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [alertFilter, setAlertFilter] = useState("");

  const fetch = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: "20" });
    if (search) params.set("q", search);
    if (alertFilter) params.set("alert_enabled", alertFilter);
    try {
      const res = await api.get<{ data: SavedSearch[]; total: number; total_pages: number }>(`/api/admin/saved-searches?${params}`);
      setRows(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch { toast.error("Failed to load saved searches"); }
    setLoading(false);
  }, [page, search, alertFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    navigate({ to: "/admin/login" }); return null;
  }

  async function deleteSearch(id: number) {
    if (!confirm("Delete this saved search?")) return;
    try { await api.delete(`/api/admin/saved-searches/${id}`); toast.success("Deleted"); fetch(); }
    catch { toast.error("Failed to delete"); }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Saved Searches</h1>
        <p className="text-sm text-muted-foreground">{total} saved searches with property alerts</p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search user or search name..."
            className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-3 text-sm outline-none" />
        </div>
        <select value={alertFilter} onChange={(e) => { setAlertFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-background px-3 text-sm outline-none h-10">
          <option value="">All alerts</option>
          <option value="1">Alerts enabled</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Search Name</th>
                <th className="px-4 py-3 font-medium">Filters</th>
                <th className="px-4 py-3 font-medium text-center">Alert</th>
                <th className="px-4 py-3 font-medium text-center">Created</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((s) => (
                <tr key={s.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.user_name}</div>
                    <div className="text-xs text-muted-foreground">{s.user_email}</div>
                  </td>
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-xs text-muted-foreground">
                    {Object.entries(s.filters || {}).map(([k, v]) => `${k}:${v}`).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.alert_enabled ? (
                      <BellRing className="mx-auto h-5 w-5 text-emerald-600" />
                    ) : (
                      <BellOff className="mx-auto h-5 w-5 text-muted-foreground" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => deleteSearch(s.id)}
                      className="rounded-lg px-2 py-1 text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No saved searches found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}
            className="rounded-lg border border-border p-2 hover:bg-secondary disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
            className="rounded-lg border border-border p-2 hover:bg-secondary disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}
