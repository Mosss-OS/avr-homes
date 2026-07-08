import { toast } from "sonner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, Home, Users, FileText, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/moderation")({
  component: AdminModeration,
});

interface ModerationData {
  pending_verifications: any[];
  unpublished_properties: any[];
  unverified_agents: any[];
  pending_blog_posts: any[];
}

function AdminModeration() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<ModerationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) { navigate({ to: "/admin/login" }); return; }
    api.get<ModerationData>("/api/admin/moderation")
      .then((r) => setData(r.data))
      .catch(() => toast.error("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const sections = [
    { key: "pending_verifications", icon: ShieldCheck, label: "Property Verifications", color: "text-amber-600", bg: "bg-amber-50", link: "/admin/verifications" },
    { key: "unpublished_properties", icon: Home, label: "Unpublished Properties", color: "text-blue-600", bg: "bg-blue-50", link: "/admin/properties" },
    { key: "unverified_agents", icon: Users, label: "Unverified Agents", color: "text-purple-600", bg: "bg-purple-50", link: "/admin/agents" },
    { key: "pending_blog_posts", icon: FileText, label: "Draft Blog Posts", color: "text-emerald-600", bg: "bg-emerald-50", link: "/admin/blog" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Moderation Queue</h1>
        <p className="text-sm text-muted-foreground">Review and manage content needing attention</p>
      </div>

      {sections.map(({ key, icon: Icon, label, color, bg, link }) => {
        const items = data?.[key as keyof ModerationData] || [];
        return (
          <div key={key} className="mb-6 rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${color}`} />
                <h2 className="font-display text-base font-semibold">{label}</h2>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${bg} ${color}`}>{items.length}</span>
              </div>
              <Link to={link as any} className="text-xs font-medium text-primary hover:underline">View all</Link>
            </div>

            {items.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                <CheckCircle className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
                All clear — nothing pending.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {items.slice(0, 10).map((item: any, i: number) => (
                  <div key={item.id || i} className="flex items-center justify-between px-6 py-3">
                    <div className="flex-1">
                      {key === "pending_verifications" && (
                        <div>
                          <span className="font-medium text-sm">{item.property_title || `Property #${item.property_id}`}</span>
                          <span className="ml-2 text-xs text-muted-foreground">by {item.agent_name || `Agent #${item.agent_id}`}</span>
                        </div>
                      )}
                      {key === "unpublished_properties" && (
                        <div>
                          <span className="font-medium text-sm">{item.title}</span>
                          <span className="ml-2 text-xs text-muted-foreground capitalize">{item.purpose}</span>
                        </div>
                      )}
                      {key === "unverified_agents" && (
                        <div>
                          <span className="font-medium text-sm">{item.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{item.agency}</span>
                        </div>
                      )}
                      {key === "pending_blog_posts" && (
                        <div>
                          <span className="font-medium text-sm">{item.title}</span>
                          <span className="ml-2 text-xs text-muted-foreground">Draft</span>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-0.5">{new Date(item.created_at).toLocaleDateString()}</div>
                    </div>
                    <Link to={link as any} className="shrink-0 text-primary hover:underline">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
