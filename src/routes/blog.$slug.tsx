import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "@/lib/api-client";
import { useEffect, useState } from "react";
import { Calendar, ArrowLeft, User, Tag, ArrowRight, Sparkles } from "lucide-react";

interface BlogPostDetail {
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

export const Route = createFileRoute("/blog/$slug")({
  head: () => ({
    meta: [
      { title: "Blog — AVR Homes" },
      { name: "description", content: "Read the latest Lagos real estate insights from AVR Homes." },
    ],
    links: [{ rel: "canonical", href: "https://avrusthomes.com/blog" }],
  }),
  component: BlogSingle,
});

function BlogSingle() {
  const { slug } = Route.useParams();
  const [post, setPost] = useState<BlogPostDetail | null>(null);
  const [related, setRelated] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get<{ post: BlogPostDetail; related: RelatedPost[] }>(`/api/blog/${slug}`)
      .then((res) => {
        setPost(res.data.post);
        setRelated(res.data.related);
        // Update meta tags
        const p = res.data.post;
        if (p.meta_title || p.title) {
          document.title = `${p.meta_title || p.title} — AVR Homes`;
        }
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && p.meta_description) {
          metaDesc.setAttribute("content", p.meta_description);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-8 w-3/4 rounded bg-muted" />
          <div className="h-4 w-1/2 rounded bg-muted" />
          <div className="aspect-[16/9] rounded-2xl bg-muted" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-3/4 rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <p className="text-muted-foreground">Post not found.</p>
        <Link to="/blog" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to blog
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
      <Link to="/blog" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition">
        <ArrowLeft className="h-4 w-4" /> Back to blog
      </Link>

      <article className="mx-auto mt-6 max-w-3xl">
        {post.featured_image && (
          <img
            src={post.featured_image}
            alt={post.title}
            className="aspect-[16/9] w-full rounded-2xl object-cover"
          />
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {post.category_name && (
            <Link
              to="/blog"
              search={{ category: post.category_slug } as never}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary"
            >
              {post.category_name}
            </Link>
          )}
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(post.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </span>
          <span className="inline-flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {post.author_name}
          </span>
        </div>

        <h1 className="mt-4 font-display text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">{post.title}</h1>

        {post.excerpt && (
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{post.excerpt}</p>
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Link
                key={tag}
                to="/blog"
                search={{ tag } as never}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition"
              >
                <Tag className="h-3 w-3" /> {tag}
              </Link>
            ))}
          </div>
        )}

        {/* Content */}
        <div
          className="mt-8 prose prose-neutral max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>

      {/* Related posts */}
      {related.length > 0 && (
        <section className="mx-auto mt-20 max-w-7xl">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">Related Articles</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.id}
                to="/blog/$slug"
                params={{ slug: r.slug }}
                className="group rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)] overflow-hidden"
              >
                {r.featured_image ? (
                  <img src={r.featured_image} alt={r.title} className="aspect-[16/9] w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                ) : (
                  <div className="aspect-[16/9] flex items-center justify-center bg-muted text-muted-foreground/40">
                    <Sparkles className="h-8 w-8" />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-display text-base font-semibold group-hover:text-primary transition line-clamp-2">{r.title}</h3>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(r.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
