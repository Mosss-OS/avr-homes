import { toast } from "sonner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useEffect, useState, useCallback } from "react";
import {
  Loader2, ChevronLeft, ChevronRight, Mail, CheckCircle2,
  Trash2, MessageCircle, Search, X,
} from "lucide-react";

export const Route = createFileRoute("/admin/inquiries")({
  component: AdminInquiries,
});

interface InquiryRow {
  id: number; property_id: number | null; property_title: string | null;
  property_slug: string | null; name: string; email: string; phone: string;
  message: string; is_read: boolean; status: string; notes: string | null;
  created_at: string;
}

interface ContactRow {
  id: number; name: string; email: string; phone: string;
  enquiry_type: string; message: string; is_read: boolean;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-amber-100 text-amber-700",
  qualified: "bg-emerald-100 text-emerald-700",
  closed: "bg-slate-100 text-slate-700",
};

const ENQUIRY_TYPE_COLORS: Record<string, string> = {
  Buy: "bg-blue-100 text-blue-700",
  Rent: "bg-emerald-100 text-emerald-700",
  "Agent Enquiry": "bg-purple-100 text-purple-700",
  "Developer Partnership": "bg-amber-100 text-amber-700",
  Media: "bg-rose-100 text-rose-700",
  Other: "bg-slate-100 text-slate-700",
};

function AdminInquiries() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"inquiries" | "contacts">("inquiries");

  // inquiries state
  const [iqRows, setIqRows] = useState<InquiryRow[]>([]);
  const [iqTotal, setIqTotal] = useState(0);
  const [iqPage, setIqPage] = useState(1);
  const [iqTotalPages, setIqTotalPages] = useState(1);
  const [iqLoading, setIqLoading] = useState(true);
  const [iqFilter, setIqFilter] = useState("");
  const [iqSearch, setIqSearch] = useState("");

  // contact messages state
  const [ctRows, setCtRows] = useState<ContactRow[]>([]);
  const [ctTotal, setCtTotal] = useState(0);
  const [ctPage, setCtPage] = useState(1);
  const [ctTotalPages, setCtTotalPages] = useState(1);
  const [ctLoading, setCtLoading] = useState(true);
  const [ctFilter, setCtFilter] = useState("");
  const [ctSearch, setCtSearch] = useState("");

  // modal state
  const [selectedMsg, setSelectedMsg] = useState<{ name: string; message: string } | null>(null);
  const [notesModal, setNotesModal] = useState<{ id: number; notes: string } | null>(null);

  const fetchInquiries = useCallback(async () => {
    setIqLoading(true);
    const params = new URLSearchParams({ page: String(iqPage), per_page: "15" });
    if (iqFilter) params.set("status", iqFilter);
    if (iqSearch) params.set("q", iqSearch);
    try {
      const res = await api.get<{ data: InquiryRow[]; total: number; total_pages: number }>(`/api/admin/inquiries?${params}`);
      setIqRows(res.data.data);
      setIqTotal(res.data.total);
      setIqTotalPages(res.data.total_pages);
    } catch { toast.error("Failed to load inquiries"); }
    setIqLoading(false);
  }, [iqPage, iqFilter, iqSearch]);

  const fetchContacts = useCallback(async () => {
    setCtLoading(true);
    const params = new URLSearchParams({ page: String(ctPage), per_page: "15" });
    if (ctFilter === "unread") params.set("unread", "1");
    if (ctSearch) params.set("q", ctSearch);
    try {
      const res = await api.get<{ data: ContactRow[]; total: number; total_pages: number }>(`/api/admin/contact-messages?${params}`);
      setCtRows(res.data.data);
      setCtTotal(res.data.total);
      setCtTotalPages(res.data.total_pages);
    } catch { toast.error("Failed to load contact messages"); }
    setCtLoading(false);
  }, [ctPage, ctFilter, ctSearch]);

  useEffect(() => { fetchInquiries(); }, [fetchInquiries]);
  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    navigate({ to: "/admin/login" });
    return null;
  }

  async function markInquiryRead(id: number) {
    try { await api.put(`/api/admin/inquiries/${id}/read`, {}); toast.success("Marked as read"); fetchInquiries(); }
    catch { toast.error("Failed to update"); }
  }

  async function updateInquiryStatus(id: number, status: string) {
    try { await api.put(`/api/admin/inquiries/${id}/status`, { status }); toast.success(`Status: ${status}`); fetchInquiries(); }
    catch { toast.error("Failed to update status"); }
  }

  async function saveNotes() {
    if (!notesModal) return;
    try { await api.put(`/api/admin/inquiries/${notesModal.id}/notes`, { notes: notesModal.notes }); toast.success("Notes saved"); setNotesModal(null); fetchInquiries(); }
    catch { toast.error("Failed to save notes"); }
  }

  async function deleteInquiry(id: number) {
    if (!confirm("Delete this inquiry?")) return;
    try { await api.delete(`/api/admin/inquiries/${id}`); toast.success("Inquiry deleted"); fetchInquiries(); }
    catch { toast.error("Failed to delete"); }
  }

  async function markContactRead(id: number) {
    try { await api.put(`/api/admin/contact-messages/${id}/read`, {}); toast.success("Marked as read"); fetchContacts(); }
    catch { toast.error("Failed to update"); }
  }

  async function deleteContact(id: number) {
    if (!confirm("Delete this message?")) return;
    try { await api.delete(`/api/admin/contact-messages/${id}`); toast.success("Message deleted"); fetchContacts(); }
    catch { toast.error("Failed to delete"); }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Inquiries</h1>
          <p className="text-sm text-muted-foreground">
            {tab === "inquiries" ? `${iqTotal} total` : `${ctTotal} total`}
          </p>
        </div>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl bg-secondary/50 p-1 w-fit">
        <button onClick={() => setTab("inquiries")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === "inquiries" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          Property Inquiries
        </button>
        <button onClick={() => setTab("contacts")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === "contacts" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          Contact Messages
        </button>
      </div>

      {tab === "inquiries" && (
        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={iqSearch} onChange={(e) => { setIqSearch(e.target.value); setIqPage(1); }}
                placeholder="Search name, email, phone..."
                className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-3 text-sm outline-none focus:ring-1 focus:ring-primary/30" />
            </div>
            <select value={iqFilter} onChange={(e) => { setIqFilter(e.target.value); setIqPage(1); }}
              className="rounded-xl border border-border bg-background px-3 text-sm outline-none h-10">
              <option value="">All status</option>
              <option value="unread">Unread</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {iqLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Contact</th>
                    <th className="px-4 py-3 font-medium">Property</th>
                    <th className="px-4 py-3 font-medium">Message</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium text-center">Date</th>
                    <th className="px-4 py-3 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {iqRows.map((r) => (
                    <tr key={r.id} className={`hover:bg-secondary/30 ${!r.is_read ? "font-medium" : ""}`}>
                      <td className="px-4 py-3">
                        <div>{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.email}{r.phone ? ` · ${r.phone}` : ""}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">
                        {r.property_title || <span className="italic">Website inquiry</span>}
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <button onClick={() => setSelectedMsg({ name: r.name, message: r.message })}
                          className="line-clamp-2 text-left text-muted-foreground hover:text-foreground">
                          {r.message}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <select value={r.status} onChange={(e) => updateInquiryStatus(r.id, e.target.value)}
                          className={`rounded-full px-2 py-0.5 text-xs font-medium outline-none ${STATUS_COLORS[r.status] || ""}`}>
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="qualified">Qualified</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {!r.is_read && (
                            <button onClick={() => markInquiryRead(r.id)} title="Mark as read"
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                              <Mail className="h-4 w-4" />
                            </button>
                          )}
                          <button onClick={() => setNotesModal({ id: r.id, notes: r.notes || "" })} title="Notes"
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                            <MessageCircle className="h-4 w-4" />
                          </button>
                          <button onClick={() => deleteInquiry(r.id)} title="Delete"
                            className="rounded-lg p-1.5 text-red-500 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {iqRows.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No inquiries found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {iqTotalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button disabled={iqPage <= 1} onClick={() => setIqPage(iqPage - 1)}
                className="rounded-lg border border-border p-2 hover:bg-secondary disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-muted-foreground">Page {iqPage} of {iqTotalPages}</span>
              <button disabled={iqPage >= iqTotalPages} onClick={() => setIqPage(iqPage + 1)}
                className="rounded-lg border border-border p-2 hover:bg-secondary disabled:opacity-30">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "contacts" && (
        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={ctSearch} onChange={(e) => { setCtSearch(e.target.value); setCtPage(1); }}
                placeholder="Search name, email..."
                className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-3 text-sm outline-none focus:ring-1 focus:ring-primary/30" />
            </div>
            <select value={ctFilter} onChange={(e) => { setCtFilter(e.target.value); setCtPage(1); }}
              className="rounded-xl border border-border bg-background px-3 text-sm outline-none h-10">
              <option value="">All messages</option>
              <option value="unread">Unread only</option>
            </select>
          </div>

          {ctLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Contact</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Message</th>
                    <th className="px-4 py-3 font-medium text-center">Date</th>
                    <th className="px-4 py-3 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ctRows.map((r) => (
                    <tr key={r.id} className={`hover:bg-secondary/30 ${!r.is_read ? "font-medium" : ""}`}>
                      <td className="px-4 py-3">
                        <div>{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.email}{r.phone ? ` · ${r.phone}` : ""}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ENQUIRY_TYPE_COLORS[r.enquiry_type] || ""}`}>
                          {r.enquiry_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[280px]">
                        <button onClick={() => setSelectedMsg({ name: r.name, message: r.message })}
                          className="line-clamp-2 text-left text-muted-foreground hover:text-foreground">
                          {r.message}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {!r.is_read && (
                            <button onClick={() => markContactRead(r.id)} title="Mark as read"
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                              <Mail className="h-4 w-4" />
                            </button>
                          )}
                          <button onClick={() => deleteContact(r.id)} title="Delete"
                            className="rounded-lg p-1.5 text-red-500 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {ctRows.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No messages found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {ctTotalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button disabled={ctPage <= 1} onClick={() => setCtPage(ctPage - 1)}
                className="rounded-lg border border-border p-2 hover:bg-secondary disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-muted-foreground">Page {ctPage} of {ctTotalPages}</span>
              <button disabled={ctPage >= ctTotalPages} onClick={() => setCtPage(ctPage + 1)}
                className="rounded-lg border border-border p-2 hover:bg-secondary disabled:opacity-30">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Message detail modal */}
      {selectedMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedMsg(null)}>
          <div className="w-full max-w-lg rounded-2xl border bg-background p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Message from {selectedMsg.name}</h3>
              <button onClick={() => setSelectedMsg(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{selectedMsg.message}</p>
          </div>
        </div>
      )}

      {/* Notes modal */}
      {notesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setNotesModal(null)}>
          <div className="w-full max-w-md rounded-2xl border bg-background p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Internal Notes</h3>
              <button onClick={() => setNotesModal(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <textarea value={notesModal.notes} onChange={(e) => setNotesModal({ ...notesModal, notes: e.target.value })}
              rows={5} className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-1 focus:ring-primary/30"
              placeholder="Add internal notes about this lead..." />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setNotesModal(null)} className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">
                Cancel
              </button>
              <button onClick={saveNotes} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
