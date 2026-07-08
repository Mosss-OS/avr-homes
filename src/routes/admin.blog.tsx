/**
 * Admin blog listing route. Shows a paginated, searchable table of blog
 * posts with published/draft indicator.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, ChevronLeft, ChevronRight, Plus } from "lucide-react";

export const Route = createFileRoute("/admin/blog")({
  component: AdminBlog,
});

/** A single row returned by the admin blog listing endpoint. */
interface BlogRow {
  id: number; title: string; category_name: string;
  is_published: boolean; author_name: string;
  created_at: string;
}

/** Blog management page with search, pagination, and link to create a new post. */
function AdminBlog() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<BlogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  /** Fetch blog posts from the API with current search query and page. */
  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: "15" });
    if (search) params.set("q", search);
    try {
      const res = await api.get<{ data: BlogRow[]; total: number; total_pages: number }>(`/api/admin/blog?${params}`);
      setRows(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch {}
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    navigate({ to: "/admin/login" });
    return null;
  }

  return (<>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Blog Posts</h1>
          <p className="text-sm text-muted-foreground">{total} posts</p>
        </div>
        <Link to="/agent/dashboard/blog" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> New Post
        </Link>
      </div>

      <div className="mb-4">
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search posts…"
          className="h-10 w-full max-w-sm rounded-xl border border-border bg-background px-3 text-sm outline-none" />
      </div>

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
                <th className="px-4 py-3 font-medium text-center">Published</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium max-w-[300px] truncate">{r.title}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.category_name || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.author_name || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex h-2 w-2 rounded-full ${r.is_published ? "bg-emerald-500" : "bg-gray-300"}`} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No blog posts found</td></tr>
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
