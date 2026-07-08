import { toast } from "sonner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, ChevronLeft, ChevronRight, Plus, Mail, FileText, Send, Trash2, Eye, Pencil } from "lucide-react";

export const Route = createFileRoute("/admin/email")({
  component: AdminEmail,
});

interface Template {
  id: number; name: string; subject: string; body: string;
  variables: string[]; category: string; is_system: boolean;
  is_active: boolean; created_at: string; updated_at: string;
}

interface Broadcast {
  id: number; subject: string; body: string;
  recipient_filter: string; sent_count: number;
  status: string; scheduled_at: string | null;
  sent_at: string | null; created_by_name: string;
  created_at: string;
}

const CATEGORIES = ["general", "welcome", "booking", "subscription", "verification", "marketing"];
const FILTERS = ["all", "agents", "users", "verified_agents", "subscribers"];

function AdminEmail() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"templates" | "broadcasts">("templates");

  /* Templates */
  const [temps, setTemps] = useState<Template[]>([]);
  const [tempsTotal, setTempsTotal] = useState(0);
  const [tempsPage, setTempsPage] = useState(1);
  const [tempsPages, setTempsPages] = useState(1);
  const [tempsLoading, setTempsLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("");

  /* Broadcasts */
  const [bcs, setBcs] = useState<Broadcast[]>([]);
  const [bcsTotal, setBcsTotal] = useState(0);
  const [bcsPage, setBcsPage] = useState(1);
  const [bcsPages, setBcsPages] = useState(1);
  const [bcsLoading, setBcsLoading] = useState(true);
  const [bcStatus, setBcStatus] = useState("");

  /* Modal */
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Template | Broadcast | null>(null);
  const [isTemplate, setIsTemplate] = useState(true);
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null);

  const [form, setForm] = useState({ name: "", subject: "", body: "", category: "general", is_active: true, variables: "", recipient_filter: "all", status: "draft", scheduled_at: "" });

  const fetchTemps = useCallback(async () => {
    setTempsLoading(true);
    const p = new URLSearchParams({ page: String(tempsPage), per_page: "20" });
    if (catFilter) p.set("category", catFilter);
    try {
      const r = await api.get<{ data: Template[]; total: number; total_pages: number }>(`/api/admin/email-templates?${p}`);
      setTemps(r.data.data); setTempsTotal(r.data.total); setTempsPages(r.data.total_pages);
    } catch { toast.error("Failed to load templates"); }
    setTempsLoading(false);
  }, [tempsPage, catFilter]);

  const fetchBcs = useCallback(async () => {
    setBcsLoading(true);
    const p = new URLSearchParams({ page: String(bcsPage), per_page: "20" });
    if (bcStatus) p.set("status", bcStatus);
    try {
      const r = await api.get<{ data: Broadcast[]; total: number; total_pages: number }>(`/api/admin/email-broadcasts?${p}`);
      setBcs(r.data.data); setBcsTotal(r.data.total); setBcsPages(r.data.total_pages);
    } catch { toast.error("Failed to load broadcasts"); }
    setBcsLoading(false);
  }, [bcsPage, bcStatus]);

  useEffect(() => { if (tab === "templates") fetchTemps(); }, [fetchTemps, tab]);
  useEffect(() => { if (tab === "broadcasts") fetchBcs(); }, [fetchBcs, tab]);

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    navigate({ to: "/admin/login" }); return null;
  }

  function resetForm() {
    setForm({ name: "", subject: "", body: "", category: "general", is_active: true, variables: "", recipient_filter: "all", status: "draft", scheduled_at: "" });
    setEditing(null); setShowForm(false);
  }

  function editTemplate(t: Template) {
    setForm({ name: t.name, subject: t.subject, body: t.body, category: t.category, is_active: t.is_active, variables: t.variables?.join(", ") || "", recipient_filter: "all", status: "draft", scheduled_at: "" });
    setEditing(t); setIsTemplate(true); setShowForm(true);
  }

  function editBroadcast(b: Broadcast) {
    setForm({ name: "", subject: b.subject, body: b.body, category: "general", is_active: true, variables: "", recipient_filter: b.recipient_filter, status: b.status, scheduled_at: b.scheduled_at?.slice(0, 16) || "" });
    setEditing(b); setIsTemplate(false); setShowForm(true);
  }

  async function save() {
    if (!form.subject || !form.body) { toast.error("Subject and body required"); return; }
    try {
      if (isTemplate) {
        const payload: Record<string, unknown> = { name: form.name, subject: form.subject, body: form.body, category: form.category, is_active: form.is_active };
        if (form.variables) payload.variables = form.variables.split(",").map((v: string) => v.trim());
        if (editing) { await api.put(`/api/admin/email-templates/${(editing as Template).id}`, payload); toast.success("Template updated"); }
        else { await api.post("/api/admin/email-templates", payload); toast.success("Template created"); }
        resetForm(); fetchTemps();
      } else {
        const payload: Record<string, unknown> = { subject: form.subject, body: form.body, recipient_filter: form.recipient_filter, status: form.status };
        if (form.scheduled_at) payload.scheduled_at = form.scheduled_at;
        if (editing) { await api.put(`/api/admin/email-broadcasts/${(editing as Broadcast).id}`, payload); toast.success("Broadcast updated"); }
        else { await api.post("/api/admin/email-broadcasts", payload); toast.success("Broadcast created"); }
        resetForm(); fetchBcs();
      }
    } catch { toast.error("Failed to save"); }
  }

  async function deleteTemplate(id: number) {
    if (!confirm("Delete this template?")) return;
    try { await api.delete(`/api/admin/email-templates/${id}`); toast.success("Deleted"); fetchTemps(); }
    catch { toast.error("Failed to delete"); }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Email & Notifications</h1>
        </div>
        <button onClick={() => { resetForm(); setIsTemplate(tab === "templates"); setShowForm(true); }}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> New {tab === "templates" ? "Template" : "Broadcast"}
        </button>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl bg-secondary/50 p-1 w-fit">
        <button onClick={() => setTab("templates")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === "templates" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          Templates
        </button>
        <button onClick={() => setTab("broadcasts")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === "broadcasts" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          Broadcasts
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold mb-4">
            {editing ? "Edit" : "New"} {isTemplate ? "Template" : "Broadcast"}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {isTemplate && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Name *</label>
                <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none" placeholder="Welcome Email" />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Subject *</label>
              <input value={form.subject} onChange={(e) => setForm({...form, subject: e.target.value})}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none" />
            </div>
            {isTemplate && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Category</label>
                  <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Variables (comma separated)</label>
                  <input value={form.variables} onChange={(e) => setForm({...form, variables: e.target.value})}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none" placeholder="name, email, code" />
                </div>
              </>
            )}
            {!isTemplate && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Recipients</label>
                  <select value={form.recipient_filter} onChange={(e) => setForm({...form, recipient_filter: e.target.value})}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none">
                    {FILTERS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Schedule (optional)</label>
                  <input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({...form, scheduled_at: e.target.value})}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none" />
                </div>
              </>
            )}
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Body *</label>
            <textarea value={form.body} onChange={(e) => setForm({...form, body: e.target.value})} rows={8}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none font-mono" placeholder="<h1>Welcome {{name}}!</h1><p>...</p>" />
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={save} className="rounded-xl bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              {editing ? "Update" : "Create"}
            </button>
            <button onClick={() => setPreview({ subject: form.subject, body: form.body })}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary flex items-center gap-1">
              <Eye className="h-4 w-4" /> Preview
            </button>
            <button onClick={resetForm} className="rounded-xl border border-border px-6 py-2 text-sm font-medium hover:bg-secondary">Cancel</button>
          </div>
        </div>
      )}

      {tab === "templates" && (
        <div>
          <div className="mb-4">
            <select value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setTempsPage(1); }}
              className="rounded-xl border border-border bg-background px-3 text-sm outline-none h-10">
              <option value="">All categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {tempsLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Subject</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium text-center">Active</th>
                    <th className="px-4 py-3 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {temps.map((t) => (
                    <tr key={t.id} className="hover:bg-secondary/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{t.name}</span>
                          {t.is_system && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">System</span>}
                        </div>
                      </td>
                      <td className="max-w-[250px] truncate px-4 py-3 text-xs text-muted-foreground">{t.subject}</td>
                      <td className="px-4 py-3 text-xs capitalize">{t.category}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={t.is_active ? "text-emerald-600" : "text-muted-foreground"}>{t.is_active ? "Yes" : "No"}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => editTemplate(t)}
                            className="rounded-lg px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200">Edit</button>
                          <button onClick={() => setPreview({ subject: t.subject, body: t.body })}
                            className="rounded-lg px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200">Preview</button>
                          {!t.is_system && (
                            <button onClick={() => deleteTemplate(t.id)}
                              className="rounded-lg px-2 py-1 text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200"><Trash2 className="h-3 w-3" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {temps.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No templates found</td></tr>}
                </tbody>
              </table>
            </div>
          )}
          {tempsPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button disabled={tempsPage <= 1} onClick={() => setTempsPage(tempsPage - 1)}
                className="rounded-lg border border-border p-2 hover:bg-secondary disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-sm text-muted-foreground">Page {tempsPage} of {tempsPages}</span>
              <button disabled={tempsPage >= tempsPages} onClick={() => setTempsPage(tempsPage + 1)}
                className="rounded-lg border border-border p-2 hover:bg-secondary disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
            </div>
          )}
        </div>
      )}

      {tab === "broadcasts" && (
        <div>
          <div className="mb-4">
            <select value={bcStatus} onChange={(e) => { setBcStatus(e.target.value); setBcsPage(1); }}
              className="rounded-xl border border-border bg-background px-3 text-sm outline-none h-10">
              <option value="">All status</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="sending">Sending</option>
              <option value="sent">Sent</option>
            </select>
          </div>
          {bcsLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Subject</th>
                    <th className="px-4 py-3 font-medium">Recipients</th>
                    <th className="px-4 py-3 font-medium text-center">Sent</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium text-center">Created</th>
                    <th className="px-4 py-3 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bcs.map((b) => (
                    <tr key={b.id} className="hover:bg-secondary/30">
                      <td className="max-w-[250px] truncate px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{b.subject}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs capitalize">{b.recipient_filter.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3 text-center">{b.sent_count}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          b.status === "sent" ? "bg-emerald-100 text-emerald-700" :
                          b.status === "scheduled" ? "bg-blue-100 text-blue-700" :
                          b.status === "sending" ? "bg-amber-100 text-amber-700" :
                          "bg-secondary text-muted-foreground"}`}>{b.status}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => editBroadcast(b)}
                            className="rounded-lg px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200">Edit</button>
                          <button onClick={() => setPreview({ subject: b.subject, body: b.body })}
                            className="rounded-lg px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200">Preview</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {bcs.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No broadcasts found</td></tr>}
                </tbody>
              </table>
            </div>
          )}
          {bcsPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button disabled={bcsPage <= 1} onClick={() => setBcsPage(bcsPage - 1)}
                className="rounded-lg border border-border p-2 hover:bg-secondary disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-sm text-muted-foreground">Page {bcsPage} of {bcsPages}</span>
              <button disabled={bcsPage >= bcsPages} onClick={() => setBcsPage(bcsPage + 1)}
                className="rounded-lg border border-border p-2 hover:bg-secondary disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
            </div>
          )}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPreview(null)}>
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Preview</h2>
              <button onClick={() => setPreview(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="mb-3 rounded-lg border border-border bg-secondary/30 px-4 py-2">
              <span className="text-xs font-medium text-muted-foreground">Subject: </span>
              <span className="text-sm">{preview.subject}</span>
            </div>
            <div className="rounded-xl border border-border bg-white p-6" dangerouslySetInnerHTML={{ __html: preview.body }} />
          </div>
        </div>
      )}
    </div>
  );
}
