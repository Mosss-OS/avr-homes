import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { MessageCircle, Send, ArrowLeft, ExternalLink, Mail, Phone } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { fetchInquiryMessages, sendInquiryMessage } from "@/lib/properties";

export const Route = createFileRoute("/inquiry/$id")({
  head: () => [{ title: "Inquiry — AVR Homes" }],
  component: InquiryPage,
});

function InquiryPage() {
  const { id } = Route.useParams();
  const [email, setEmail] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [inquiry, setInquiry] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [storedEmail, setStoredEmail] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Try to restore email from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem(`inquiry_email_${id}`);
    if (saved) {
      setEmail(saved);
      setStoredEmail(saved);
      setAuthenticated(true);
    }
  }, [id]);

  // Load messages once authenticated
  useEffect(() => {
    if (!authenticated) return;
    loadMessages();
    const interval = setInterval(loadMessages, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [authenticated]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadMessages() {
    try {
      const data = await fetchInquiryMessages(Number(id), storedEmail);
      setInquiry(data.inquiry);
      setMessages(data.messages);
    } catch (e: any) {
      if (authenticated) setError("Could not load messages. Refreshing…");
    } finally {
      setLoading(false);
    }
  }

  function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setStoredEmail(email);
    sessionStorage.setItem(`inquiry_email_${id}`, email);
    setAuthenticated(true);
    setLoading(true);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setError("");
    try {
      const msg = await sendInquiryMessage(Number(id), storedEmail, body.trim());
      setMessages((prev) => [...prev, msg]);
      setBody("");
    } catch (e: any) {
      setError(e.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  if (!authenticated) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4">
        <form onSubmit={handleAuth} className="w-full rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <MessageCircle className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-3 text-center font-display text-xl font-semibold">Track Your Inspection</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">Enter the email you used when scheduling.</p>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button type="submit" className="mt-3 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            View my inspection
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Back link */}
      <Link to="/" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back to home
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-primary">Inspection Request</p>
            <h1 className="mt-1 font-display text-xl font-semibold sm:text-2xl">{inquiry?.name}</h1>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {inquiry?.property_title && (
                <Link to="/properties/$id" params={{ id: String(inquiry.property_id) }}
                  className="inline-flex items-center gap-1 hover:text-foreground">
                  <ExternalLink className="h-3 w-3" /> {inquiry.property_title}
                </Link>
              )}
              {inquiry?.payment_ref && (
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Paid
                </span>
              )}
            </div>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-medium ${
            inquiry?.status === "new" ? "bg-blue-100 text-blue-700" :
            inquiry?.status === "contacted" ? "bg-amber-100 text-amber-700" :
            inquiry?.status === "qualified" ? "bg-green-100 text-green-700" :
            "bg-gray-100 text-gray-700"
          }`}>
            {inquiry?.status ? inquiry.status.charAt(0).toUpperCase() + inquiry.status.slice(1) : "New"}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="mt-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-base font-semibold">Messages</h2>

        {loading ? (
          <div className="mt-4 flex justify-center py-8">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No messages yet. An agent will respond shortly.
          </p>
        ) : (
          <div className="mt-4 max-h-[400px] space-y-3 overflow-y-auto pr-1">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender_type === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.sender_type === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}>
                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                  <p className={`mt-1 text-[10px] ${msg.sender_type === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {new Date(msg.created_at).toLocaleString("en-NG", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}

        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

        {/* Reply */}
        <form onSubmit={handleSend} className="mt-4 flex gap-2">
          <input
            value={body} onChange={(e) => setBody(e.target.value)}
            placeholder="Type your message…"
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            maxLength={5000}
          />
          <button type="submit" disabled={sending || !body.trim()}
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {sending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
