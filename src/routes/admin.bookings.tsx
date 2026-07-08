/**
 * Admin bookings listing route. Shows a paginated, filterable table of all
 * bookings with inline controls to confirm, cancel, or mark as complete.
 */
import { toast } from "sonner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/admin/bookings")({
  component: AdminBookings,
});

/** A single row returned by the admin bookings listing endpoint. */
interface BookingRow {
  id: number; property_id: number; property_title: string;
  guest_name: string; guest_email: string; guest_phone: string;
  check_in: string; check_out: string; guests: number;
  total_price: number; status: string; created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-700",
};

/** Bookings management page with status filter, pagination, and status-change actions. */
function AdminBookings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  /** Fetch bookings from the API with current status filter and page. */
  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: "15" });
    if (statusFilter) params.set("status", statusFilter);
    try {
      const res = await api.get<{ data: BookingRow[]; total: number; total_pages: number }>(`/api/admin/bookings?${params}`);
      setRows(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch {
      toast.error("Failed to load bookings");
    }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    navigate({ to: "/admin/login" });
    return null;
  }

  /** Transition a booking to a new status (confirm, cancel, complete). */
  async function updateStatus(id: number, status: string) {
    try {
      await api.put(`/api/admin/bookings/${id}/status`, { status });
      fetchData();
      toast.success(`Booking ${status} successfully`);
    } catch {
      toast.error("Failed to update booking status");
    }
  }

  return (<>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Bookings</h1>
          <p className="text-sm text-muted-foreground">{total} total</p>
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-background px-3 text-sm outline-none h-10">
          <option value="">All status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Guest</th>
                <th className="px-4 py-3 font-medium">Property</th>
                <th className="px-4 py-3 font-medium">Dates</th>
                <th className="px-4 py-3 font-medium text-center">Guests</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.guest_name}</div>
                    <div className="text-xs text-muted-foreground">{r.guest_email} · {r.guest_phone}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{r.property_title || `Property #${r.property_id}`}</td>
                  <td className="px-4 py-3 text-xs">
                    <div>{new Date(r.check_in).toLocaleDateString()} → {new Date(r.check_out).toLocaleDateString()}</div>
                  </td>
                  <td className="px-4 py-3 text-center">{r.guests}</td>
                  <td className="px-4 py-3 text-right font-medium">₦{(r.total_price / 1_000).toFixed(0)}K</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status] || ""}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {r.status === "pending" && (
                        <>
                          <button onClick={() => updateStatus(r.id, "confirmed")} className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-200">Confirm</button>
                          <button onClick={() => updateStatus(r.id, "cancelled")} className="rounded-lg bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200">Cancel</button>
                        </>
                      )}
                      {r.status === "confirmed" && (
                        <button onClick={() => updateStatus(r.id, "completed")} className="rounded-lg bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200">Complete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No bookings found</td></tr>
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
