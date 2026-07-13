import { toast } from "sonner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, ChevronLeft, ChevronRight, ShieldCheck, XCircle } from "lucide-react";

export const Route = createFileRoute("/admin/kyc-review")({
  head: () => ({ meta: [{ title: "KYC Review — Admin — AVR Homes" }] }),
  component: AdminKycReview,
});

interface KycRow {
  id: number; user_id: number; user_name: string; user_email: string;
  status: string; bvn_number: string | null; source_of_funds: string | null;
  id_document_url: string | null; id_document_type: string | null;
  accredited_investor: boolean; bvn_verified: boolean; id_verified: boolean;
  created_at: string;
}

function AdminKycReview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<KycRow[]>([]);
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
      const res = await api.get<{ data: KycRow[]; total: number; total_pages: number }>(`/api/admin/kyc?${params}`);
      setRows(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch {
      toast.error("Failed to load KYC records");
    }
    setLoading(false);
  }, [page, filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    navigate({ to: "/admin/login" });
    return null;
  }

  async function verify(id: number) {
    try {
      await api.put(`/api/admin/kyc/${id}/verify`, {});
      fetchData();
      toast.success("KYC verified");
    } catch {
      toast.error("Failed to verify KYC");
    }
  }

  async function reject(id: number) {
    const reason = prompt("Rejection reason (optional):");
    try {
      await api.put(`/api/admin/kyc/${id}/reject`, { rejection_reason: reason || null });
      fetchData();
      toast.success("KYC rejected");
    } catch {
      toast.error("Failed to reject KYC");
    }
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">KYC Review</h1>
          <p className="text-sm text-muted-foreground">{total} records</p>
        </div>
        <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-background px-3 text-sm outline-none h-10">
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
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
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">BVN</th>
                <th className="px-4 py-3 font-medium">ID Document</th>
                <th className="px-4 py-3 font-medium">Source of Funds</th>
                <th className="px-4 py-3 font-medium">Accredited</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3">
                    <p className="font-medium truncate max-w-[180px]">{r.user_name}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[180px]">{r.user_email}</p>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono">{r.bvn_number || "—"}</td>
                  <td className="px-4 py-3 text-xs max-w-[150px] truncate">
                    {r.id_document_url ? (
                      <a href={r.id_document_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {r.id_document_type || "View"}
                      </a>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs max-w-[150px] truncate">{r.source_of_funds || "—"}</td>
                  <td className="px-4 py-3 text-xs">{r.accredited_investor ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.status === "pending" ? "bg-amber-100 text-amber-700" :
                      r.status === "verified" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center">
                    {r.status === "pending" && (
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => verify(r.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-200">
                          <ShieldCheck className="h-3 w-3" /> Verify
                        </button>
                        <button onClick={() => reject(r.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-200">
                          <XCircle className="h-3 w-3" /> Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No KYC records found</td></tr>
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
    </>
  );
}
