import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Check, Loader2, X, Eye } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface NotificationItem {
  recipient_id: number;
  notification_id: number;
  is_read: boolean;
  read_at: string | null;
  title: string;
  body: string;
  type: string;
  created_at: string;
  sent_at: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<{ count: number }>("/api/notifications/unread-count");
      setUnread(res.data.count || 0);
    } catch {}
  }, [user]);

  const fetchItems = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.get<{ data: NotificationItem[] }>("/api/notifications?per_page=10");
      setItems(res.data.data || []);
    } catch {}
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  useEffect(() => {
    if (open) fetchItems();
  }, [open, fetchItems]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markRead(id: number) {
    try {
      await api.put(`/api/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => n.recipient_id === id ? { ...n, is_read: true } : n));
      setUnread((prev) => Math.max(0, prev - 1));
    } catch {}
  }

  async function markAllRead() {
    try {
      await api.put("/api/notifications/read-all");
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    } catch {}
  }

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-9 w-9 place-items-center rounded-full text-foreground/70 hover:bg-secondary hover:text-foreground transition"
        aria-label="Notifications"
      >
        <Bell className="h-4.5 w-4.5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-[17px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-[16px] text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[360px] rounded-2xl border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition">
                <Check className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : items.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No notifications yet</div>
            ) : (
              items.map((item) => (
                <div key={item.recipient_id}
                  className={`border-b border-border px-4 py-3 transition ${item.is_read ? "" : "bg-primary/[0.03]"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{item.title}</span>
                        {!item.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{item.body}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {new Date(item.sent_at || item.created_at).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {!item.is_read && (
                      <button onClick={() => markRead(item.recipient_id)}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition"
                        title="Mark as read"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
