import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { Loader2, Image as ImageIcon, Video, ChevronDown, ChevronUp } from "lucide-react";

interface ProgressItem {
  id: number;
  property_id: number;
  month_number: number;
  title: string;
  description: string | null;
  images: string[];
  videos: string[];
  created_at: string;
  updated_at: string;
}

export function ProgressTimeline({ propertyId }: { propertyId: number }) {
  const [items, setItems] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    api.get<{ data: ProgressItem[] }>(`/api/properties/${propertyId}/progress`)
      .then((r) => setItems(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [propertyId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-display text-lg font-semibold">Construction Progress</h3>
      <div className="relative pl-8 before:absolute before:left-3 before:top-2 before:h-[calc(100%-1rem)] before:w-0.5 before:bg-border">
        {items.map((item) => (
          <div key={item.id} className="relative pb-6 last:pb-0">
            <div className="absolute -left-5 mt-1.5 grid h-2.5 w-2.5 place-items-center rounded-full border-2 border-primary bg-background" />
            <div className="rounded-xl border border-border bg-card p-4">
              <button
                onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                className="flex w-full items-center justify-between text-left"
              >
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">Month {item.month_number}</span>
                  <h4 className="mt-0.5 font-medium text-sm">{item.title}</h4>
                </div>
                {expanded === item.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              {expanded === item.id && (
                <div className="mt-3 space-y-3">
                  {item.description && (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  )}

                  {item.images.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {item.images.map((img, i) => (
                        <div key={i} className="shrink-0">
                          {img.startsWith("http") || img.startsWith("/") ? (
                            <img src={img} alt="" className="h-24 w-36 rounded-lg object-cover" loading="lazy" />
                          ) : (
                            <div className="grid h-24 w-36 place-items-center rounded-lg bg-muted">
                              <ImageIcon className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {item.videos.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {item.videos.map((v, i) => (
                        <a key={i} href={v} target="_blank" rel="noreferrer"
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition"
                        >
                          <Video className="h-3.5 w-3.5" /> Video {i + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
