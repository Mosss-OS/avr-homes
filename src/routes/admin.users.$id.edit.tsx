/**
 * Admin edit-user route. Loads an existing user by ID and allows editing
 * name, email, and active status. Role is displayed as read-only.
 */
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { Loader2, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/admin/users/$id/edit")({
  head: () => ({ meta: [{ title: "Edit User — Admin — AVR Homes" }] }),
  component: AdminEditUser,
});

/** Shape of the user data returned by the API and used in the edit form. */
interface UserData {
  name: string; email: string; role: string; is_active: boolean;
}

/** Single-page user editor. Loads existing data and saves name/email/active status via PUT. */
function AdminEditUser() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const params = useParams({ from: "/admin/users/$id/edit" });
  const id = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState<UserData>({
    name: "", email: "", role: "user", is_active: true,
  });

  /* Load user data on mount / id change */
  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<{ user: UserData }>(`/api/admin/users/${id}`);
        const u = res.data.user;
        setForm({
          name: u.name || "", email: u.email || "",
          role: u.role || "user", is_active: u.is_active,
        });
      } catch (err) {
        setFetchError(err instanceof ApiError ? err.message : "Failed to load user");
        toast.error("Failed to load user");
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    navigate({ to: "/admin/login" });
    return null;
  }

  /** Save user changes via PUT. Role is intentionally excluded from the payload. */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.put(`/api/admin/users/${id}`, {
        name: form.name,
        email: form.email,
        is_active: form.is_active,
      });
      setSuccess("User updated successfully");
      toast.success("User updated successfully");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update user");
      toast.error("Failed to update user");
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (fetchError) {
    return <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{fetchError}</div>;
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate({ to: "/admin/users" })} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-semibold">Edit User</h1>
          <p className="text-sm text-muted-foreground">#{id}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          </div>
          <div>
            <Label>Role</Label>
            <div className="mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm capitalize text-muted-foreground">
              {form.role}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label>Active</Label>
            <button type="button" onClick={() => setForm((p) => ({ ...p, is_active: !p.is_active }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.is_active ? "bg-emerald-500" : "bg-muted"
              }`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.is_active ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>
        </div>

        {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        {success && <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600">{success}</div>}

        <div className="flex items-center gap-3 border-t border-border pt-6">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/admin/users" })}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
