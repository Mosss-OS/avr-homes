import { toast } from "sonner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useEffect, useState, useCallback } from "react";
import {
  Loader2, ChevronLeft, ChevronRight, Plus, Pencil, Trash2,
  Check, X, FileText,
} from "lucide-react";

export const Route = createFileRoute("/admin/blog")({
  component: AdminBlog,
});

interface BlogRow {
  id: number; title: string; category_name: string;
  is_published: boolean; author_name: string; status: string;
  created_at: string;
}

const emptyForm = { title: "", excerpt: "", content: "", status: "draft", featured_image: "", category_id: "", tags: "" };

function AdminBlog() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<BlogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: "15" });
    if (search) params.set("q", search);
    try {
      const res = await api.get<{ data: BlogRow[]; total: number; total_pages: number }>(`/api/admin/blog?${params}`);
      setRows(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch { toast.error("Failed to load blog posts"); }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    navigate({ to: "/admin/login" });
    return null;
  }

  function resetForm() { setForm({ ...emptyForm }); setEditingId(null); setShowForm(false); }

  function openEdit(row: BlogRow) {
    setForm({
      title: row.title,
      excerpt: "",
      content: "",
      status: row.status || (row.is_published ? "published" : "draft"),
      featured_image: "",
      category_id: "",
      tags: "",
    });
    setEditingId(row.id);
    setShowForm(true);
  }

  async function save() {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        excerpt: form.excerpt,
        content: form.content,
        status: form.status,
        featured_image: form.featured_image || null,
        category_id: form.category_id ? Number(form.category_id) : null,
        tags: form.tags ? form.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
      };
      if (editingId) {
        await api.put(`/api/admin/blog/${editingId}`, payload);
        toast.success("Blog post updated");
      } else {
        await api.post("/api/admin/blog", payload);
        toast.success("Blog post created");
      }
      resetForm();
      fetchData();
    } catch { toast.error(editingId ? "Failed to update post" : "Failed to create post"); }
    setSaving(false);
  }

  async function deletePost(id: number) {
    if (!confirm("Delete this blog post permanently?")) return;
    try {
      await api.delete(`/api/admin/blog/${id}`);
      toast.success("Blog post deleted");
      fetchData();
    } catch { toast.error("Failed to delete post"); }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Blog Posts</h1>
          <p className="text-sm text-muted-foreground">{total} posts</p>
        </div>
        {!showForm && (
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" /> New Post
          </button>
        )}
      </div>

      <div className="mb-4">
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search posts..."
          className="h-10 w-full max-w-sm rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-primary/30" />
      </div>

      {showForm && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">{editingId ? "Edit Post" : "New Post"}</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-primary/30"
                placeholder="Post title" />
            </div>
            <div>
              <label className="text-sm font-medium">Excerpt</label>
              <textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                className="mt-1 h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/30"
                placeholder="Brief summary" rows={3} />
            </div>
            <div>
              <label className="text-sm font-medium">Content (HTML) *</label>
              <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="mt-1 h-48 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-primary/30"
                placeholder="<p>Your content here...</p>" rows={10} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-sm font-medium">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Image URL</label>
                <input value={form.featured_image} onChange={(e) => setForm({ ...form, featured_image: e.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none"
                  placeholder="https://..." />
              </div>
              <div>
                <label className="text-sm font-medium">Category ID</label>
                <input value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none"
                  placeholder="1" type="number" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Tags (comma-separated)</label>
              <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none"
                placeholder="Lagos, real estate, investment" />
            </div>
            <div className="flex gap-2">
              <button onClick={save} disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Update" : "Publish"}
              </button>
              <button onClick={resetForm}
                className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Author</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/30">
                  <td className="max-w-[300px] truncate px-4 py-3 font-medium">{r.title}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.category_name || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.author_name || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {r.status || (r.is_published ? "published" : "draft")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(r)} title="Edit"
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => deletePost(r.id)} title="Delete"
                        className="rounded-lg p-1.5 text-red-500 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No blog posts found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}
            className="rounded-lg border border-border p-2 hover:bg-secondary disabled:opacity-30">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
            className="rounded-lg border border-border p-2 hover:bg-secondary disabled:opacity-30">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
