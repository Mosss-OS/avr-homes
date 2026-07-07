import { toast } from "sonner";
import { createFileRoute, Outlet, useNavigate, useRouterState, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useEffect, useState, useCallback } from "react";
import { Search, CheckCircle2, XCircle, Trash2, Loader2, ChevronLeft, ChevronRight, Ban, Pencil } from "lucide-react";

export const Route = createFileRoute("/admin/agents")({
  component: AdminAgents,
});

interface AgentRow {
  id: number; name: string; email: string; agency: string; phone: string;
  listings: number; is_verified: boolean; is_active: boolean;
  created_at: string;
}

function AdminAgents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/admin/agents") return <Outlet />;
  const [rows, setRows] = useState<AgentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: "15" });
    if (search) params.set("q", search);
    try {
      const res = await api.get<{ data: AgentRow[]; total: number; total_pages: number }>(`/api/admin/agents?${params}`);
      setRows(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch {}
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    navigate({ to: "/admin/login" });
    return null;
  }

  async function toggleStatus(id: number) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    try {
      await api.put(`/api/admin/agents/${id}/status`, { is_active: !row.is_active });
      fetchData();
      toast.success(`Agent ${row.is_active ? "suspended" : "activated"} successfully`);
    } catch {
      toast.error("Failed to update agent status");
    }
  }

  async function toggleVerify(id: number) {
    try {
      await api.put(`/api/admin/agents/${id}/verify`, {});
      fetchData();
      toast.success("Agent verification toggled");
    } catch {
      toast.error("Failed to toggle verification");
    }
  }

  async function deleteAgent(id: number) {
    if (!confirm("Delete this agent? Properties will be unlinked.")) return;
    try {
      await api.delete(`/api/admin/agents/${id}`);
      fetchData();
      toast.success("Agent deleted");
    } catch {
      toast.error("Failed to delete agent");
    }
  }

  return (<>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Agents</h1>
        <p className="text-sm text-muted-foreground">{total} registered agents</p>
      </div>

      <div className="mb-4">
        <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email, agency…"
            className="h-10 w-full bg-transparent text-sm outline-none" />
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Agency</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium text-center">Listings</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-center">Verified</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3">{r.agency || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                  <td className="px-4 py-3">{r.phone || "—"}</td>
                  <td className="px-4 py-3 text-center">{r.listings}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}>{r.is_active ? "Active" : "Suspended"}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleVerify(r.id)}
                      className={`${r.is_verified ? "text-emerald-500" : "text-muted-foreground hover:text-emerald-500"}`}>
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => toggleStatus(r.id)} title={r.is_active ? "Suspend" : "Activate"}
                        className={`${r.is_active ? "text-muted-foreground hover:text-red-500" : "text-muted-foreground hover:text-emerald-500"}`}>
                        <Ban className="h-4 w-4" />
                      </button>
                      <Link to={`/admin/agents/${r.id}/edit`} title="Edit" className="text-muted-foreground hover:text-blue-500">
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button onClick={() => deleteAgent(r.id)} title="Delete" className="text-muted-foreground hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No agents found</td></tr>
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
  </>);
}
