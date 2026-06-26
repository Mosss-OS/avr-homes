import { useState, useEffect, useCallback, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { Loader2, Mail, Phone, MessageSquare, Search, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/agent/dashboard/leads")({
  head: () => ({ meta: [{ title: "Leads — AVR Homes" }] }),
  component: AgentLeadsPage,
});

interface Lead {
  id: number;
  property_id: number | null;
  name: string;
  email: string;
  phone: string;
  message: string;
  is_read: boolean;
  status: string;
  notes: string | null;
  created_at: string;
  property_title: string | null;
  property_slug: string | null;
  property_type: string | null;
  property_purpose: string | null;
  property_price: number | null;
  property_image: string | null;
  property_city: string | null;
  property_community: string | null;
}

const STATUS_OPTIONS = ["new", "contacted", "qualified", "closed"];

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-600 border-blue-200",
  contacted: "bg-amber-500/10 text-amber-600 border-amber-200",
  qualified: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  closed: "bg-slate-500/10 text-slate-600 border-slate-200",
};

interface AgentProperty {
  id: number;
  title: string;
}

function AgentLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [properties, setProperties] = useState<AgentProperty[]>([]);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevUnreadRef = useRef(unreadCount);

  const perPage = 20;

  useEffect(() => {
    api.get<{ data: AgentProperty[] }>("/api/agent/listings?per_page=100")
      .then((r) => setProperties(r.data.data || []))
      .catch(() => {});
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("search", search);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (propertyFilter && propertyFilter !== "all") params.set("property_id", propertyFilter);

    try {
      const res = await api.get<{ data: Lead[]; total: number; total_pages: number }>(
        "/api/agent/leads?" + params.toString()
      );
      setLeads(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch {} finally {
      setLoading(false);
    }
  }, [page, statusFilter, search, dateFrom, dateTo, propertyFilter]);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await api.get<{ unread_count: number }>("/api/agent/leads/unread-count");
      const newCount = res.data.unread_count;
      if (newCount > prevUnreadRef.current && prevUnreadRef.current > 0) {
        toast(`You have ${newCount} unread lead${newCount !== 1 ? "s" : ""}`, {
          description: "New inquiries from your property listings",
          action: { label: "View", onClick: () => window.location.href = "/agent/dashboard/leads" },
        });
      }
      prevUnreadRef.current = newCount;
      setUnreadCount(newCount);
    } catch {}
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => {
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);
  useEffect(() => { fetchUnread(); const iv = setInterval(fetchUnread, 30000); return () => clearInterval(iv); }, [fetchUnread]);

  useEffect(() => { setPage(1); }, [statusFilter, search, dateFrom, dateTo, propertyFilter]);

  async function openDetail(lead: Lead) {
    setSelected(lead);
    setDetailOpen(true);
    if (!lead.is_read) {
      try {
        await api.put(`/api/agent/leads/${lead.id}/read`, {});
        setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, is_read: true } : l));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {}
    }
  }

  async function updateStatus(id: number, status: string) {
    try {
      await api.put(`/api/agent/leads/${id}/status`, { status });
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
      setSelected((prev) => prev?.id === id ? { ...prev, status } : prev);
    } catch {}
  }

  async function updateNotes(id: number, notes: string) {
    try {
      await api.put(`/api/agent/leads/${id}/notes`, { notes });
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, notes } : l));
      setSelected((prev) => prev?.id === id ? { ...prev, notes } : prev);
    } catch {}
  }

  const statusBadge = (s: string) => (
    <Badge variant="outline" className={STATUS_STYLES[s] || ""}>{s}</Badge>
  );

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Leads & Inquiries</h1>
          <p className="text-sm text-muted-foreground">
            {total} lead{total !== 1 ? "s" : ""}
            {unreadCount > 0 && (
              <span className="ml-2 text-destructive font-medium">({unreadCount} unread)</span>
            )}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, email, phone..."
            value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {["", ...STATUS_OPTIONS].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s ? "bg-primary text-primary-foreground" : "border border-input bg-background hover:bg-accent"
              }`}>
              {s ? s.charAt(0).toUpperCase() + s.slice(1) : "All"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 w-36 text-xs" />
          <span className="text-xs text-muted-foreground">—</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="h-9 w-36 text-xs" />
        </div>
        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
          <SelectTrigger className="h-9 w-44 text-xs">
            <SelectValue placeholder="All properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All properties</SelectItem>
            {properties.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12">
          <Mail className="mb-3 h-12 w-12 text-muted-foreground/40" />
          <p className="font-medium">No leads found</p>
          <p className="text-sm text-muted-foreground">
            {search || statusFilter ? "Try different filters" : "Inquiries from your property listings will appear here"}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Inquirer</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Property</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Message</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leads.map((lead) => (
                  <tr key={lead.id} onClick={() => openDetail(lead)}
                    className={`cursor-pointer transition-colors hover:bg-muted/30 ${
                      !lead.is_read ? "font-medium bg-primary/5" : ""
                    }`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {!lead.is_read && <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
                        <div>
                          <p>{lead.name}</p>
                          <p className="text-xs text-muted-foreground">{lead.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{lead.property_title || "—"}</p>
                      <p className="text-xs text-muted-foreground">{lead.property_city}, {lead.property_community}</p>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="truncate text-muted-foreground">{lead.message}</p>
                    </td>
                    <td className="px-4 py-3">{statusBadge(lead.status)}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1} className="rounded-full">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages} className="rounded-full">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription>
                  {selected.property_title && (
                    <span>{selected.property_title} &middot; </span>
                  )}
                  {new Date(selected.created_at).toLocaleString()}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6">
                <div className="flex gap-2">
                  <a href={`tel:${selected.phone}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-input px-4 py-2 text-sm hover:bg-accent">
                    <Phone className="h-4 w-4" /> Call
                  </a>
                  <a href={`https://wa.me/${selected.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-input px-4 py-2 text-sm hover:bg-accent">
                    <MessageSquare className="h-4 w-4" /> WhatsApp
                  </a>
                  <a href={`mailto:${selected.email}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-input px-4 py-2 text-sm hover:bg-accent">
                    <Mail className="h-4 w-4" /> Email
                  </a>
                </div>

                <div className="space-y-2">
                  <Label>Contact Info</Label>
                  <div className="rounded-lg bg-accent/50 p-3 space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Email:</span> {selected.email}</p>
                    <p><span className="text-muted-foreground">Phone:</span> {selected.phone}</p>
                  </div>
                </div>

                {selected.property_title && (
                  <div className="space-y-2">
                    <Label>Property</Label>
                    <div className="rounded-lg bg-accent/50 p-3 space-y-1 text-sm">
                      <Link to={"/properties/$id"} params={{ id: String(selected.property_id) }}
                        className="font-medium text-primary hover:underline">
                        {selected.property_title}
                      </Link>
                      <p className="text-muted-foreground">
                        {selected.property_city}, {selected.property_community}
                        {selected.property_price && ` · ₦${(selected.property_price / 1e6).toFixed(1)}M`}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {selected.property_type} &middot; {selected.property_purpose}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Message</Label>
                  <div className="rounded-lg bg-accent/50 p-3 text-sm whitespace-pre-wrap">
                    {selected.message}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={selected.status} onValueChange={(v) => updateStatus(selected.id, v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Internal Notes</Label>
                  <Textarea id="notes" value={selected.notes || ""}
                    onChange={(e) => updateNotes(selected.id, e.target.value)}
                    placeholder="Add private notes about this lead..."
                    rows={4} />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}
