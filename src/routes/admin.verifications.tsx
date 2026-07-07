import { toast } from "sonner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/admin/verifications")({
  component: AdminVerifications,
});

interface VerificationRow {
  id: number; property_id: number; property_title: string;
  status: string; agent_name: string;
  created_at: string;
  rejection_reason: string | null;
}

function AdminVerifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: "15" });
    if (filter) params.set("status", filter);
    try {
      const res = await api.get<{ data: any[]; total: number; total_pages: number }>(`/api/admin/verifications?${params}`);
      setRows(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch {
      toast.error("Failed to load verifications");
    }
    setLoading(false);
  }, [page, filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    navigate({ to: "/admin/login" });
    return null;
  }

  async function approve(id: number) {
    try {
      await api.put(`/api/admin/verifications/${id}/approve`, {});
      fetchData();
      toast.success("Verification approved");
    } catch {
      toast.error("Failed to approve verification");
    }
  }

  async function reject(id: number) {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    try {
      await api.put(`/api/admin/verifications/${id}/reject`, { rejection_reason: reason });
      fetchData();
      toast.success("Verification rejected");
    } catch {
      toast.error("Failed to reject verification");
    }
  }

  return (<>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Verifications</h1>
          <p className="text-sm text-muted-foreground">{total} requests</p>
        </div>
        <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-background px-3 text-sm outline-none h-10">
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="">All</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Property</th>
                <th className="px-4 py-3 font-medium">Agent</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r: any) => (
                <tr key={r.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium max-w-[250px] truncate">
                    {r.property_title || `Property #${r.property_id}`}
                  </td>
                  <td className="px-4 py-3">{r.agent_name || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.status === "pending" ? "bg-amber-100 text-amber-700" :
                      r.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center">
                    {r.status === "pending" && (
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => approve(r.id)} className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-200">Approve</button>
                        <button onClick={() => reject(r.id)} className="rounded-lg bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200">Reject</button>
                      </div>
                    )}
                    {r.rejection_reason && (
                      <span className="text-xs text-muted-foreground" title={r.rejection_reason}>Reason given</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No verifications found</td></tr>
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
