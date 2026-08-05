"use client";

/**
 * Blog listing page — category filter, keyword search, and paginated
 * post cards. Filter state lives in the URL query string.
 */

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { formatPostDate } from "@/lib/date";
import { CalendarDays, Search, ChevronLeft, ChevronRight, BookOpen, SearchX } from "lucide-react";

const PER_PAGE = 9;

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  featured_image: string | null;
  author_name: string;
  category_id: number | null;
  category_name: string | null;
  category_slug: string | null;
  published_at: string;
  tags: string[];
  is_featured: boolean;
  view_count: number;
}

interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  post_count: number;
}

interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

function BlogExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const category = searchParams.get("category") ?? "";
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));

  useEffect(() => {
    let cancelled = false;
    api.get<BlogCategory[]>("/api/blog/categories")
      .then((res) => {
        if (!cancelled) setCategories(res.data || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), per_page: String(PER_PAGE) });
    if (category) qs.set("category", category);
    if (search) qs.set("search", search);
    api.get<Paginated<BlogPost>>(`/api/blog?${qs.toString()}`)
      .then((res) => {
        if (cancelled) return;
        setPosts(res.data.data);
        setTotal(res.data.total);
        setTotalPages(res.data.total_pages);
      })
      .catch(() => {
        if (cancelled) return;
        setPosts([]);
        setTotal(0);
        setTotalPages(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, search, page]);

  function apply(patch: Record<string, string | null | undefined>) {
    const p = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === undefined || v === "") p.delete(k);
      else p.set(k, v);
    }
    p.delete("page");
    router.replace(`/blog?${p.toString()}`);
  }

  const activeCategory = categories.find((c) => c.slug === category);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#C9A84C" }}>Insights</p>
        <h1 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">Guides, tips & market analysis</h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Practical advice for buyers, sellers, landlords and diaspora investors across Nigeria.
        </p>
      </div>

      {/* Category chips + search */}
      <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => apply({ category: null })}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${
              !category ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-foreground/70 hover:bg-secondary"
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => apply({ category: c.slug })}
              className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${
                category === c.slug ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-foreground/70 hover:bg-secondary"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <label className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-3 md:w-64">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => apply({ search: e.target.value })}
            placeholder="Search articles…"
            className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>

      {/* Results */}
      {loading && (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
              <Skeleton className="aspect-[16/10] w-full rounded-none" />
              <div className="space-y-3 p-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="mt-10 rounded-2xl border border-border bg-card p-10 text-center">
          <SearchX className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-3 font-display text-lg font-semibold">No articles found</h3>
          <p className="mt-1 text-sm text-muted-foreground">Try a different search or category.</p>
        </div>
      )}

      {!loading && posts.length > 0 && (
        <>
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
              >
                <div className="aspect-[16/10] overflow-hidden bg-secondary/40">
                  {post.featured_image ? (
                    <img src={post.featured_image} alt={post.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-muted-foreground">
                      <BookOpen className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 text-xs">
                    {post.category_name && (
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium uppercase tracking-wide text-primary">{post.category_name}</span>
                    )}
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" /> {formatPostDate(post.published_at)}
                    </span>
                  </div>
                  <h2 className="mt-2.5 line-clamp-2 font-display text-lg font-semibold transition group-hover:text-primary">{post.title}</h2>
                  {post.excerpt && <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>}
                  <p className="mt-3 text-xs text-muted-foreground">By {post.author_name || "AVR Homes"}</p>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => apply({ page: String(page - 1) })}
                className="inline-flex h-10 items-center gap-1 rounded-xl border border-border bg-card px-4 text-sm font-medium transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => apply({ page: String(page + 1) })}
                className="inline-flex h-10 items-center gap-1 rounded-xl border border-border bg-card px-4 text-sm font-medium transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}

      {activeCategory && !loading && (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          {total} {total === 1 ? "article" : "articles"} in {activeCategory.name}
        </p>
      )}
    </div>
  );
}

export default function BlogPage() {
  return (
    <Suspense fallback={<BlogSkeleton />}>
      <BlogExplorer />
    </Suspense>
  );
}

function BlogSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-9 w-64" />
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
            <Skeleton className="aspect-[16/10] w-full rounded-none" />
            <div className="space-y-3 p-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
