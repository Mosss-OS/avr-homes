import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useEffect, useState } from "react";
import {
  Loader2, Plus, Send, Trash2, Megaphone, Eye, Users,
  ChevronLeft, ChevronRight, CalendarDays, Target, CheckCircle2, XCircle,
} from "lucide-react";

export const Route = createFileRoute("/admin/announcements")({
  component: AdminAnnouncements,
});

interface Announcement {
  id: number;
  title: string;
  body: string;
  type: string;
  target_role: string | null;
  created_by: number;
  created_by_name: string;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  recipient_count: number;
  read_count: number;
}

function AdminAnnouncements() {
  const { user } = useAuth();

  const [items, setItems] = useState<Announcement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [showComposer, setShowComposer] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    title: "",
    body: "",
    target_role: "",
    scheduled_at: "",
  });

  const [viewing, setViewing] = useState<Announcement | null>(null);

  const TARGET_OPTIONS = [
    { value: "", label: "All Users" },
    { value: "user", label: "Users Only" },
    { value: "agent", label: "Agents Only" },
    { value: "admin", label: "Admins Only" },
  ];

  function fetchItems() {
    setLoading(true);
    api.get<{ data: Announcement[]; total: number; page: number; total_pages: number }>(
      `/api/admin/announcements?page=${page}`
    )
      .then((r) => {
        setItems(r.data.data || []);
        setTotal(r.data.total || 0);
        setTotalPages(r.data.total_pages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchItems();
  }, [page]);

  async function sendAnnouncement() {
    if (!form.title.trim() || !form.body.trim()) return;
    setSending(true);
    try {
      const payload: Record<string, any> = {
        title: form.title,
        body: form.body,
      };
      if (form.target_role) payload.target_role = form.target_role;
      if (form.scheduled_at) payload.scheduled_at = form.scheduled_at;

      await api.post("/api/admin/announcements", payload);
      setShowComposer(false);
      setForm({ title: "", body: "", target_role: "", scheduled_at: "" });
      setPage(1);
      fetchItems();
    } catch (e: any) {
      alert(e.message || "Failed to send");
    } finally {
      setSending(false);
    }
  }

  async function deleteItem(id: number) {
    if (!confirm("Delete this announcement?")) return;
    try {
      await api.delete(`/api/admin/announcements/${id}`);
      fetchItems();
    } catch {
      alert("Failed to delete");
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Announcements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Broadcast messages to users, agents, or everyone
          </p>
        </div>
        <button
          onClick={() => setShowComposer(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
        >
          <Plus className="h-4 w-4" /> New Announcement
        </button>
      </div>

      {showComposer && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-display text-lg font-semibold">Compose Announcement</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Title *</label>
              <input value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none"
                placeholder="Maintenance scheduled for..." />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Message *</label>
              <textarea value={form.body} rows={4}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none"
                placeholder="Write your announcement message..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Target Audience</label>
              <select value={form.target_role}
                onChange={(e) => setForm({ ...form, target_role: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none"
              >
                {TARGET_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Schedule (optional)</label>
              <input type="datetime-local" value={form.scheduled_at}
                onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={sendAnnouncement} disabled={sending}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? "Sending..." : form.scheduled_at ? "Schedule" : "Send Now"}
            </button>
            <button onClick={() => setShowComposer(false)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-secondary transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setViewing(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">{viewing.title}</h2>
              <button onClick={() => setViewing(null)} className="text-muted-foreground hover:text-foreground">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">{viewing.body}</p>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {viewing.target_role || "All users"}</span>
              <span className="flex items-center gap-1"><Send className="h-3.5 w-3.5" /> {viewing.recipient_count} sent</span>
              <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {viewing.read_count} read</span>
              {viewing.scheduled_at && (
                <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Scheduled</span>
              )}
            </div>
            <button
              onClick={() => setViewing(null)}
              className="mt-4 w-full rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <Megaphone className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <h3 className="mt-3 font-display text-lg font-semibold">No announcements yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Create your first broadcast to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{item.title}</h3>
                    {item.sent_at ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" /> Sent
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                        <CalendarDays className="h-3 w-3" /> Scheduled
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{item.body}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {item.target_role || "All"}</span>
                    <span className="flex items-center gap-1"><Send className="h-3 w-3" /> {item.recipient_count}</span>
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {item.read_count} read</span>
                    <span>{item.created_by_name} · {new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => setViewing(item)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition"
                    title="View details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteItem(item.id)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                className="grid h-9 w-9 place-items-center rounded-xl border border-border hover:bg-secondary disabled:opacity-30 transition">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                className="grid h-9 w-9 place-items-center rounded-xl border border-border hover:bg-secondary disabled:opacity-30 transition">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
