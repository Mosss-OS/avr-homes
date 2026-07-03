import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "@/lib/api-client";
import { useEffect, useState } from "react";
import { Calendar, ArrowRight, Tag, Sparkles } from "lucide-react";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image: string | null;
  author_name: string;
  category_name: string | null;
  category_slug: string | null;
  published_at: string;
  tags: string[];
  is_featured: boolean;
  view_count: number;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  post_count: number;
}

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — AVR Homes" },
      { name: "description", content: "Lagos real estate insights, neighbourhood guides, buying tips and market analysis from AVR Homes." },
      { property: "og:title", content: "Blog — AVR Homes" },
      { property: "og:description", content: "Lagos real estate insights, neighbourhood guides, buying tips and market analysis." },
    ],
    links: [{ rel: "canonical", href: "https://avrusthomes.com/blog" }],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: "12" });
    if (activeCategory) params.set("category", activeCategory);

    Promise.all([
      api.get<{ data: BlogPost[]; total_pages: number }>(`/api/blog?${params}`),
      api.get<Category[]>("/api/blog/categories"),
    ])
      .then(([postsRes, catsRes]) => {
        setPosts(postsRes.data.data);
        setTotalPages(postsRes.data.total_pages);
        setCategories(catsRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, activeCategory]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary">
          <Sparkles className="h-3.5 w-3.5" /> AVR Homes Blog
        </span>
        <h1 className="mt-4 font-display text-4xl font-semibold sm:text-5xl">Lagos Real Estate Insights</h1>
        <p className="mt-3 text-muted-foreground">
          Market analysis, neighbourhood guides, buying tips and expert advice for Nigeria's property market.
        </p>
      </div>

      {/* Categories */}
      <div className="mt-10 flex flex-wrap justify-center gap-2">
        <button
          onClick={() => { setActiveCategory(null); setPage(1); }}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            !activeCategory ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground/70 hover:bg-secondary/80"
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.slug}
            onClick={() => { setActiveCategory(c.slug); setPage(1); }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeCategory === c.slug ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground/70 hover:bg-secondary/80"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Posts grid */}
      {loading ? (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-border bg-card">
              <div className="aspect-[16/9] rounded-t-2xl bg-muted" />
              <div className="space-y-3 p-5">
                <div className="h-3 w-1/4 rounded bg-muted" />
                <div className="h-5 w-3/4 rounded bg-muted" />
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-2/3 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">No posts yet. Check back soon.</p>
        </div>
      ) : (
        <>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                to="/blog/$slug"
                params={{ slug: post.slug }}
                className="group flex flex-col rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)] overflow-hidden"
              >
                <div className="aspect-[16/9] overflow-hidden bg-muted">
                  {post.featured_image ? (
                    <img
                      src={post.featured_image}
                      alt={post.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground/40">
                      <Sparkles className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {post.category_name && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                        {post.category_name}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(post.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <h2 className="mt-3 font-display text-lg font-semibold tracking-tight group-hover:text-primary transition">{post.title}</h2>
                  {post.excerpt && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground flex-1">{post.excerpt}</p>
                  )}
                  <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
                    Read more <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex justify-center gap-2">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`grid h-10 w-10 place-items-center rounded-full text-sm font-medium transition ${
                    page === i + 1 ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground/70 hover:bg-secondary/80"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
