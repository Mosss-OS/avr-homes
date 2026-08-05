"use client";

/**
 * Blog post page — full article with category, author, tags, rich-text
 * body, and related posts.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api-client";
import { api } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPostDate } from "@/lib/date";
import { CalendarDays, ChevronLeft, BookOpen, User, Tag } from "lucide-react";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  author_name: string;
  category_id: number | null;
  category_name: string | null;
  category_slug: string | null;
  published_at: string;
  tags: string[];
  is_featured: boolean;
  view_count: number;
  meta_title: string | null;
  meta_description: string | null;
}

interface RelatedPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image: string | null;
  published_at: string;
}

export default function BlogDetailPage() {
  const params = useParams();
  const slug = String(params.slug ?? "");

  const [post, setPost] = useState<BlogPost | null>(null);
  const [related, setRelated] = useState<RelatedPost[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setStatus("loading");
    api.get<{ post: BlogPost; related: RelatedPost[] }>(`/api/blog/${slug}`)
      .then((res) => {
        if (cancelled) return;
        setPost(res.data.post);
        setRelated(res.data.related || []);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus(err instanceof ApiError && err.status === 404 ? "missing" : "error");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (status === "loading" || !post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-9 w-full" />
        <Skeleton className="mt-2 h-9 w-2/3" />
        <Skeleton className="mt-6 aspect-[16/9] w-full rounded-2xl" />
        <div className="mt-6 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (status === "missing") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <h1 className="font-display text-3xl font-semibold">Article not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This post may have been unpublished or removed.</p>
        <Link href="/blog" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">
          Back to blog
        </Link>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <h1 className="font-display text-3xl font-semibold">Something went wrong</h1>
        <Link href="/blog" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">
          Back to blog
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> All articles
      </Link>

      <article className="mt-6">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {post.category_name && (
            <Link
              href={`/blog?category=${post.category_slug ?? ""}`}
              className="rounded-full bg-primary/10 px-3 py-1 font-medium uppercase tracking-wide text-primary transition hover:bg-primary/20"
            >
              {post.category_name}
            </Link>
          )}
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" /> {formatPostDate(post.published_at)}
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <User className="h-3.5 w-3.5" /> {post.author_name || "AVR Homes"}
          </span>
        </div>

        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-4xl">{post.title}</h1>
        {post.excerpt && <p className="mt-3 text-base text-muted-foreground sm:text-lg">{post.excerpt}</p>}

        {post.featured_image && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-card)]">
            <img src={post.featured_image} alt={post.title} className="aspect-[16/9] w-full object-cover" />
          </div>
        )}

        <div className="blog-content mt-8" dangerouslySetInnerHTML={{ __html: post.content }} />

        {post.tags && post.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-border pt-5">
            <Tag className="h-4 w-4 text-muted-foreground" />
            {post.tags.map((t) => (
              <Link
                key={t}
                href={`/blog?tag=${encodeURIComponent(t)}`}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
              >
                #{t}
              </Link>
            ))}
          </div>
        )}
      </article>

      {/* Related posts */}
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-2xl font-semibold">Related articles</h2>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/blog/${r.slug}`}
                className="group overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
              >
                <div className="aspect-[16/10] overflow-hidden bg-secondary/40">
                  {r.featured_image ? (
                    <img src={r.featured_image} alt={r.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-muted-foreground">
                      <BookOpen className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs text-muted-foreground">{formatPostDate(r.published_at)}</p>
                  <h3 className="mt-1 line-clamp-2 font-display text-base font-semibold transition group-hover:text-primary">{r.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
