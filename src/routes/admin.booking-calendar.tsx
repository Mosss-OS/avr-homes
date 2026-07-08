import { toast } from "sonner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, ChevronLeft, ChevronRight, CalendarDays, BedDouble, Users, CheckCircle, XCircle, Banknote } from "lucide-react";

export const Route = createFileRoute("/admin/booking-calendar")({
  component: AdminBookingCalendar,
});

interface ShortletProperty {
  id: number; title: string;
}

interface CalendarDay {
  date: string; is_available: boolean;
  price_override: number | null;
  booking: { id: number; guest_name: string; status: string } | null;
}

interface Stats {
  total_shortlets: number; active_bookings_properties: number;
  pending_bookings: number; confirmed_bookings: number;
  completed_bookings: number; total_revenue: number;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function formatCurrency(n: number) {
  return "₦" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function AdminBookingCalendar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<Stats | null>(null);
  const [properties, setProperties] = useState<ShortletProperty[]>([]);
  const [selectedProp, setSelectedProp] = useState<number | "">("");
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectingDates, setSelectingDates] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());

  const propLabel = useCallback((p: { id: number; title: string }) => {
    return `#${p.id} — ${p.title.length > 50 ? p.title.slice(0, 50) + "..." : p.title}`;
  }, []);

  useEffect(() => {
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      navigate({ to: "/admin/login" });
      return;
    }
    Promise.all([
      api.get<Stats>("/api/admin/shortlet/stats"),
      api.get<{ data: ShortletProperty[] }>("/api/admin/properties?purpose=shortlet&per_page=200"),
    ]).then(([s, p]) => {
      setStats(s.data);
      setProperties(p.data.data);
      if (p.data.data.length > 0 && !selectedProp) {
        setSelectedProp(p.data.data[0].id);
      }
    }).catch(() => toast.error("Failed to load shortlet data"));
  }, []);

  useEffect(() => {
    if (!selectedProp) return;
    setLoading(true);
    api.get<{ days: CalendarDay[] }>(`/api/admin/shortlet/${selectedProp}/availability?month=${month}`)
      .then((res) => {
        setDays(res.data.days);
        setSelectedDates(new Set());
      })
      .catch(() => toast.error("Failed to load calendar"))
      .finally(() => setLoading(false));
  }, [selectedProp, month]);

  function prevMonth() {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  function nextMonth() {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  function toggleDateSelection(date: string) {
    const next = new Set(selectedDates);
    if (next.has(date)) next.delete(date);
    else next.add(date);
    setSelectedDates(next);
  }

  async function applyBlock() {
    if (!selectedProp || selectedDates.size === 0) return;
    try {
      await api.put("/api/admin/shortlet/availability/batch", {
        property_id: selectedProp,
        dates: Array.from(selectedDates),
        is_available: false,
      });
      toast.success(`${selectedDates.size} date(s) blocked`);
      setSelectedDates(new Set());
      const res = await api.get<{ days: CalendarDay[] }>(`/api/admin/shortlet/${selectedProp}/availability?month=${month}`);
      setDays(res.data.days);
    } catch { toast.error("Failed to block dates"); }
  }

  async function applyUnblock() {
    if (!selectedProp || selectedDates.size === 0) return;
    try {
      await api.put("/api/admin/shortlet/availability/batch", {
        property_id: selectedProp,
        dates: Array.from(selectedDates),
        is_available: true,
      });
      toast.success(`${selectedDates.size} date(s) unblocked`);
      setSelectedDates(new Set());
      const res = await api.get<{ days: CalendarDay[] }>(`/api/admin/shortlet/${selectedProp}/availability?month=${month}`);
      setDays(res.data.days);
    } catch { toast.error("Failed to unblock dates"); }
  }

  const year = parseInt(month.split("-")[0]);
  const monthNum = parseInt(month.split("-")[1]);
  const firstDay = new Date(year, monthNum - 1, 1).getDay();
  const numDays = new Date(year, monthNum, 0).getDate();

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Booking Calendar</h1>
        <p className="text-sm text-muted-foreground">Manage short-let availability and pricing</p>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1"><BedDouble className="h-4 w-4" /> Shortlets</div>
            <p className="text-2xl font-semibold">{stats.total_shortlets}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1"><CalendarDays className="h-4 w-4" /> Active</div>
            <p className="text-2xl font-semibold">{stats.active_bookings_properties}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1"><Users className="h-4 w-4" /> Pending</div>
            <p className="text-2xl font-semibold text-amber-600">{stats.pending_bookings}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1"><CheckCircle className="h-4 w-4" /> Confirmed</div>
            <p className="text-2xl font-semibold text-emerald-600">{stats.confirmed_bookings}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1"><XCircle className="h-4 w-4" /> Completed</div>
            <p className="text-2xl font-semibold text-blue-600">{stats.completed_bookings}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1"><Banknote className="h-4 w-4" /> Revenue</div>
            <p className="text-2xl font-semibold text-emerald-600">{formatCurrency(stats.total_revenue)}</p>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <select value={selectedProp} onChange={(e) => setSelectedProp(Number(e.target.value) || "")}
          className="rounded-xl border border-border bg-background px-3 text-sm outline-none h-10 max-w-md flex-1">
          <option value="">Select a property...</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{propLabel(p)}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="rounded-lg border border-border p-2 hover:bg-secondary"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm font-medium min-w-[140px] text-center">{MONTHS[monthNum - 1]} {year}</span>
          <button onClick={nextMonth} className="rounded-lg border border-border p-2 hover:bg-secondary"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {selectedDates.size > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{selectedDates.size} date(s) selected</span>
          <button onClick={applyBlock} className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200">
            Block Selected
          </button>
          <button onClick={applyUnblock} className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200">
            Unblock Selected
          </button>
          <button onClick={() => setSelectedDates(new Set())} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary">
            Clear
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : selectedProp ? (
        <div className="rounded-2xl border border-border overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground bg-secondary/30">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-border bg-secondary/10" />
            ))}
            {days.map((day) => {
              const dayNum = parseInt(day.date.split("-")[2]);
              const isSelected = selectedDates.has(day.date);
              const isBooked = day.booking !== null;
              const isAdminBlocked = !day.is_available && !isBooked;

              let bg = "bg-white hover:bg-secondary/30 dark:bg-transparent";
              if (isBooked) bg = day.booking!.status === "pending" ? "bg-amber-50 dark:bg-amber-950/20" : "bg-red-50 dark:bg-red-950/20";
              else if (isAdminBlocked) bg = "bg-orange-50 dark:bg-orange-950/20";

              if (isSelected) bg = "bg-primary/10 ring-2 ring-primary";

              return (
                <div
                  key={day.date}
                  onClick={() => {
                    if (!isBooked) toggleDateSelection(day.date);
                  }}
                  className={`min-h-[80px] border-b border-r border-border p-2 cursor-pointer transition-colors relative ${bg} ${isBooked ? "cursor-default" : ""}`}
                >
                  <span className="text-sm font-medium">{dayNum}</span>
                  {day.booking && (
                    <div className="mt-1">
                      <div className="text-[10px] leading-tight font-medium truncate text-red-700 dark:text-red-400">
                        {day.booking.guest_name}
                      </div>
                      <div className="text-[9px] uppercase text-red-500/70">{day.booking.status}</div>
                    </div>
                  )}
                  {isAdminBlocked && (
                    <div className="mt-1">
                      <div className="text-[10px] font-medium text-orange-600">Blocked</div>
                    </div>
                  )}
                  {day.price_override && (
                    <div className="absolute bottom-1 right-1 text-[9px] font-medium text-blue-600">
                      ₦{day.price_override.toLocaleString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <CalendarDays className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm">Select a short-let property to view its calendar</p>
        </div>
      )}

      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-white border border-border" /> Available</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-red-50 border border-red-200" /> Booked</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-amber-50 border border-amber-200" /> Pending</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-orange-50 border border-orange-200" /> Blocked</span>
      </div>
    </div>
  );
}
