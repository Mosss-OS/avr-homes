import { toast } from "sonner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useEffect, useState } from "react";
import { Loader2, Save, ShieldAlert, Wrench, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/admin/maintenance")({
  component: AdminMaintenance,
});

function AdminMaintenance() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) { navigate({ to: "/admin/login" }); return; }
    api.get<Record<string, string>>("/api/settings")
      .then((r) => setSettings(r.data))
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try { await api.post("/api/settings", settings); toast.success("Saved"); }
    catch { toast.error("Failed to save"); }
    setSaving(false);
  }

  function set(key: string, value: string) { setSettings({ ...settings, [key]: value }); }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Maintenance Mode</h1>
        <p className="text-sm text-muted-foreground">Control site availability and maintenance settings</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <div className="max-w-2xl space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {settings.maintenance_mode === "1" ? (
                  <EyeOff className="h-6 w-6 text-red-500" />
                ) : (
                  <Eye className="h-6 w-6 text-emerald-500" />
                )}
                <div>
                  <h2 className="font-display text-base font-semibold">
                    {settings.maintenance_mode === "1" ? "Maintenance Mode Active" : "Site is Live"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {settings.maintenance_mode === "1"
                      ? "Frontend will show a maintenance page. Admin panel remains accessible."
                      : "Site is publicly accessible."}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" checked={settings.maintenance_mode === "1"}
                  onChange={(e) => set("maintenance_mode", e.target.checked ? "1" : "0")}
                  className="peer sr-only" />
                <div className="h-6 w-11 rounded-full bg-secondary after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-red-500 peer-checked:after:translate-x-full" />
              </label>
            </div>
          </div>

          {settings.maintenance_mode === "1" && (
            <>
              <label className="block">
                <span className="text-sm font-medium text-muted-foreground">Maintenance Title</span>
                <input value={settings.maintenance_title || ""} onChange={(e) => set("maintenance_title", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none" placeholder="Under Maintenance" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-muted-foreground">Maintenance Message</span>
                <textarea value={settings.maintenance_message || ""} onChange={(e) => set("maintenance_message", e.target.value)} rows={4}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none"
                  placeholder="We are performing scheduled maintenance. We'll be back shortly." />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-muted-foreground">Allowed IPs (comma separated)</span>
                <input value={settings.maintenance_allowed_ips || ""} onChange={(e) => set("maintenance_allowed_ips", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none"
                  placeholder="127.0.0.1, ::1" />
                <p className="mt-1 text-xs text-muted-foreground">Users from these IPs can bypass maintenance mode</p>
              </label>
            </>
          )}

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Wrench className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-display text-base font-semibold">Site Configuration</h2>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-muted-foreground">Meta Title</span>
                <input value={settings.meta_title || ""} onChange={(e) => set("meta_title", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-muted-foreground">Meta Description</span>
                <textarea value={settings.meta_description || ""} onChange={(e) => set("meta_description", e.target.value)} rows={3}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-muted-foreground">Google Analytics ID</span>
                <input value={settings.ga_id || ""} onChange={(e) => set("ga_id", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none" placeholder="G-XXXXXXXXXX" />
              </label>
            </div>
          </div>

          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}
