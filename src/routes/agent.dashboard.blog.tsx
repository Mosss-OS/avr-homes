import { createFileRoute } from "@tanstack/react-router";
import { api } from "@/lib/api-client";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Plus, FileText, Eye, Trash2, Loader2, Check, X, Sparkles } from "lucide-react";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  status: string;
  is_featured: boolean;
  view_count: number;
  category_name: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export const Route = createFileRoute("/agent/dashboard/blog")({
  head: () => ({ meta: [{ title: "Blog Management — AVR Homes" }] }),
  component: BlogManager,
});

function BlogManager() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: "",
    excerpt: "",
    content: "",
    status: "draft",
    featured_image: "",
    category_id: "",
    tags: "",
  });

  function loadPosts() {
    setLoading(true);
    api.get<{ data: BlogPost[] }>("/api/agent/blog")
      .then((res) => setPosts(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadPosts(); }, []);

  function resetForm() {
    setForm({ title: "", excerpt: "", content: "", status: "draft", featured_image: "", category_id: "", tags: "" });
    setEditingId(null);
    setShowCreate(false);
  }

  function editPost(post: BlogPost) {
    setForm({
      title: post.title,
      excerpt: post.excerpt || "",
      content: "",
      status: post.status,
      featured_image: "",
      category_id: "",
      tags: "",
    });
    setEditingId(post.id);
    setShowCreate(true);
  }

  async function save() {
    if (!form.title.trim() || !form.content.trim()) {
      setMessage({ type: "error", text: "Title and content are required" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
        category_id: form.category_id ? Number(form.category_id) : undefined,
      };

      if (editingId) {
        await api.put(`/api/agent/blog/${editingId}`, payload);
        setMessage({ type: "success", text: "Post updated" });
      } else {
        await api.post("/api/agent/blog", payload);
        setMessage({ type: "success", text: "Post created" });
      }
      resetForm();
      loadPosts();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Failed to save" });
    } finally {
      setSaving(false);
    }
  }

  async function deletePost(id: number) {
    if (!confirm("Delete this post?")) return;
    try {
      await api.delete(`/api/agent/blog/${id}`);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      setMessage({ type: "success", text: "Post deleted" });
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Failed to delete" });
    }
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold">Blog Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">Create and manage blog posts</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowCreate(true); }}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
          >
            <Plus className="h-4 w-4" /> New Post
          </button>
        </div>

        {message && (
          <div className={`mt-4 flex items-center gap-2 rounded-xl p-3 text-sm ${
            message.type === "success" ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
          }`}>
            {message.type === "success" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            {message.text}
          </div>
        )}

        {/* Create/Edit form */}
        {showCreate && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <h2 className="font-display text-lg font-semibold">{editingId ? "Edit Post" : "New Post"}</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none"
                  placeholder="Post title"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Excerpt</label>
                <textarea
                  value={form.excerpt}
                  onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                  className="mt-1 h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                  placeholder="Brief summary"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Content (HTML) *</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="mt-1 h-48 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono outline-none"
                  placeholder="<p>Your content here...</p>"
                  rows={10}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Image URL</label>
                  <input
                    value={form.featured_image}
                    onChange={(e) => setForm({ ...form, featured_image: e.target.value })}
                    className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Category ID</label>
                  <input
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none"
                    placeholder="1"
                    type="number"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Tags (comma-separated)</label>
                <input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none"
                  placeholder="Lagos, real estate, investment"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId ? "Update" : "Publish"}
                </button>
                <button
                  onClick={resetForm}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-secondary transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Posts list */}
        <div className="mt-6 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <p className="mt-3 text-muted-foreground">No posts yet. Create your first blog post.</p>
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{post.title}</h3>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      post.status === "published" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                    }`}>
                      {post.status}
                    </span>
                    {post.is_featured && (
                      <Sparkles className="h-3.5 w-3.5 text-[#C9A84C]" />
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    {post.category_name && <span>{post.category_name}</span>}
                    <span>{post.view_count} views</span>
                    <span>{new Date(post.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-4">
                  <a
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition"
                    title="View"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => editPost(post)}
                    className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition"
                    title="Edit"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deletePost(post.id)}
                    className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
