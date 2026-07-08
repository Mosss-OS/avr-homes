import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, ChevronLeft, ChevronRight, Download, Search, Filter } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/activity")({
  component: AdminActivity,
});

interface ActivityRow {
  id: number; user_id: number | null; user_name: string | null; user_email: string | null;
  action: string; entity_type: string; entity_id: number | null;
  details: string | null; ip_address: string; created_at: string;
}

function AdminActivity() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: "30" });
    if (actionFilter) params.set("action", actionFilter);
    if (entityFilter) params.set("entity_type", entityFilter);
    try {
      const res = await api.get<{ data: ActivityRow[]; total: number; total_pages: number }>(`/api/admin/activity?${params}`);
      setRows(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch { toast.error("Failed to load activity"); }
    setLoading(false);
  }, [page, actionFilter, entityFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    navigate({ to: "/admin/login" });
    return null;
  }

  function exportCSV() {
    const params = new URLSearchParams();
    if (actionFilter) params.set("action", actionFilter);
    if (entityFilter) params.set("entity_type", entityFilter);
    window.open(`/api/admin/activity/export?${params}`, "_blank");
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Activity Log</h1>
          <p className="text-sm text-muted-foreground">{total} events recorded</p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            placeholder="Filter by action..."
            className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-3 text-sm outline-none" />
        </div>
        <input value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
          placeholder="Filter by entity type..."
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none flex-1 max-w-xs" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Type / ID</th>
                <th className="px-4 py-3 font-medium">Details</th>
                <th className="px-4 py-3 font-medium text-right">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/30">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.user_name || "System"}</div>
                    {r.user_email && <div className="text-xs text-muted-foreground">{r.user_email}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-lg bg-secondary/60 px-2 py-0.5 text-xs font-medium">{r.action}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {r.entity_type}{r.entity_id ? ` #${r.entity_id}` : ""}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-xs text-muted-foreground" title={r.details || ""}>
                    {r.details ? (r.details.length > 60 ? r.details.slice(0, 60) + "..." : r.details) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">{r.ip_address || "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No activity found</td></tr>
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
