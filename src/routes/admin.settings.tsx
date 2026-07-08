/**
 * Admin settings route. Provides a simple key-value form for editing
 * platform-wide configuration values (site name, contacts, social links, etc.).
 */
import { toast } from "sonner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

/** Settings editor — loads all settings on mount and saves them as a flat key-value object. */
function AdminSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  /* Load all settings on mount */
useEffect(() => {
    api.get<Record<string, string>>("/api/settings")
      .then((r) => setSettings(r.data))
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    navigate({ to: "/admin/login" });
    return null;
  }

  /** Persist all settings to the API. Shows "Saved!" confirmation for 2 seconds. */
  async function save() {
    setSaving(true);
    try {
      await api.post("/api/settings", settings);
      setSaved(true);
      toast.success("Settings saved successfully");
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error("Failed to save settings");
    }
    setSaving(false);
  }

  const FIELDS = [
    { key: "site_name", label: "Site Name", type: "text" },
    { key: "site_tagline", label: "Site Tagline", type: "text" },
    { key: "contact_email", label: "Contact Email", type: "email" },
    { key: "contact_phone", label: "Contact Phone", type: "text" },
    { key: "address", label: "Address", type: "text" },
    { key: "currency_ngn_usd", label: "NGN to USD Rate", type: "number" },
    { key: "currency_ngn_gbp", label: "NGN to GBP Rate", type: "number" },
    { key: "whatsapp_number", label: "WhatsApp Number", type: "text" },
    { key: "social_instagram", label: "Instagram URL", type: "text" },
    { key: "social_tiktok", label: "TikTok URL", type: "text" },
    { key: "social_linkedin", label: "LinkedIn URL", type: "text" },
    { key: "social_facebook", label: "Facebook URL", type: "text" },
    { key: "social_youtube", label: "YouTube URL", type: "text" },
  ];

  return (<>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage platform configuration</p>
        </div>
        <button onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="max-w-2xl space-y-4">
          {FIELDS.map(({ key, label, type }) => (
            <label key={key} className="block">
              <span className="text-sm font-medium text-muted-foreground">{label}</span>
              <input type={type} value={settings[key] || ""}
                onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
            </label>
          ))}
        </div>
      )}
  </>);
}
