import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "@/lib/api-client";
import { HardHat, Plus, Loader2, Trash2, ChevronDown, ChevronUp, Video, Check, X } from "lucide-react";

interface PropertyItem {
  id: number;
  title: string;
  agent_name: string | null;
  completion_date: string | null;
  status: string;
  is_off_plan: boolean;
  is_active: number;
}

interface ProgressItem {
  id: number;
  property_id: number;
  month_number: number;
  title: string;
  description: string | null;
  images: string[];
  videos: string[];
  created_at: string;
}

export const Route = createFileRoute("/admin/offplan")({
  head: () => ({ meta: [{ title: "Off-Plan Management — AVR Admin" }] }),
  component: AdminOffPlan,
});

function AdminOffPlan() {
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [progress, setProgress] = useState<Record<number, ProgressItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const [form, setForm] = useState({ month_number: "", title: "", description: "" });
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get<{ data: PropertyItem[] }>("/api/admin/properties?per_page=200")
      .then((r) => {
        const all = r.data.data || [];
        setProperties(all.filter((p: PropertyItem) => p.is_off_plan));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function loadProgress(propertyId: number) {
    try {
      const res = await api.get<{ data: ProgressItem[] }>(`/api/admin/offplan/progress/${propertyId}`);
      setProgress((prev) => ({ ...prev, [propertyId]: res.data.data || [] }));
    } catch {}
  }

  function selectProperty(id: number) {
    setSelectedId(id);
    setShowForm(false);
    resetForm();
    loadProgress(id);
  }

  function resetForm() {
    setForm({ month_number: "", title: "", description: "" });
    setShowForm(false);
  }

  async function save() {
    if (!selectedId || !form.title.trim() || !form.month_number) {
      setMessage({ type: "error", text: "Title and month number are required" });
      return;
    }
    setSaving(true); setMessage(null);
    try {
      await api.post(`/api/admin/offplan/progress/${selectedId}`, {
        ...form, month_number: Number(form.month_number),
      });
      setMessage({ type: "success", text: "Progress update added" });
      resetForm();
      loadProgress(selectedId);
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Failed to save" });
    } finally { setSaving(false); }
  }

  async function deleteProgress(propertyId: number, progressId: number) {
    if (!confirm("Delete this progress update?")) return;
    try {
      await api.delete(`/api/admin/offplan/progress/${progressId}`);
      setProgress((prev) => ({
        ...prev,
        [propertyId]: (prev[propertyId] || []).filter((p) => p.id !== progressId),
      }));
    } catch { setMessage({ type: "error", text: "Failed to delete" }); }
  }

  const filtered = properties.filter((p) =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) || (p.agent_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const selected = properties.find((p) => p.id === selectedId);

  return (
    <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold">Off-Plan Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage construction progress across all off-plan properties</p>
        </div>

        {message && (
          <div className={`mb-4 flex items-center gap-2 rounded-xl p-3 text-sm ${
            message.type === "success" ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
          }`}>
            {message.type === "success" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            {message.text}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Off-Plan Properties</h2>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search properties or agent..."
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none" />
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                <HardHat className="mx-auto h-6 w-6 text-muted-foreground/60" />
                <p className="mt-2">No off-plan properties found</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
                {filtered.map((p) => (
                  <button key={p.id} onClick={() => selectProperty(p.id)}
                    className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                      selectedId === p.id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/50"
                    }`}>
                    <p className="font-medium truncate">{p.title}</p>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{p.agent_name || "No agent"}</span>
                      {p.completion_date && <span>Est. {new Date(p.completion_date).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            {selected ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-lg font-semibold">{selected.title}</h2>
                    <p className="text-sm text-muted-foreground">Agent: {selected.agent_name || "N/A"}</p>
                  </div>
                  <button onClick={() => setShowForm(true)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition">
                    <Plus className="h-3.5 w-3.5" /> Add Update
                  </button>
                </div>

                {showForm && (
                  <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                    <h3 className="text-sm font-medium">New Progress Update</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-medium">Month Number *</label>
                        <input type="number" min="1" value={form.month_number}
                          onChange={(e) => setForm({ ...form, month_number: e.target.value })}
                          className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Title *</label>
                        <input value={form.title}
                          onChange={(e) => setForm({ ...form, title: e.target.value })}
                          className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none"
                          placeholder="Foundation laid" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium">Description</label>
                      <textarea value={form.description} rows={2}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
                        placeholder="Brief update on progress..." />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={save} disabled={saving}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-50">
                        {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                        Save
                      </button>
                      <button onClick={resetForm}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:bg-secondary transition">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {(progress[selectedId] || []).length === 0 ? (
                    <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                      No progress updates yet. Click "Add Update" to start tracking.
                    </div>
                  ) : (
                    (progress[selectedId] || []).map((item) => (
                      <div key={item.id} className="rounded-xl border border-border bg-card">
                        <button onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                          className="flex w-full items-center justify-between px-4 py-3 text-left">
                          <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Month {item.month_number}</span>
                            <p className="mt-0.5 text-sm font-medium">{item.title}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); deleteProgress(selectedId, item.id); }}
                              className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            {expanded === item.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </button>
                        {expanded === item.id && (
                          <div className="border-t border-border px-4 py-3 space-y-3">
                            {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                            {item.images.length > 0 && (
                              <div className="flex gap-2 overflow-x-auto pb-1">
                                {item.images.map((img, i) => (
                                  <div key={i} className="shrink-0">
                                    <img src={img} alt="" className="h-20 w-32 rounded-lg object-cover" loading="lazy" />
                                  </div>
                                ))}
                              </div>
                            )}
                            {item.videos.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {item.videos.map((v, i) => (
                                  <a key={i} href={v} target="_blank" rel="noreferrer"
                                    className="inline-flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition">
                                    <Video className="h-3 w-3" /> Video {i + 1}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-border bg-card">
                <div className="text-center">
                  <HardHat className="mx-auto h-8 w-8 text-muted-foreground/60" />
                  <p className="mt-2 text-sm text-muted-foreground">Select an off-plan property to manage progress</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}
