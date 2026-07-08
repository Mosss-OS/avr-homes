import { toast } from "sonner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Shield, ShieldCheck, UserCog, Plus, Trash2, Check, X, ChevronDown, ChevronUp, Save } from "lucide-react";

export const Route = createFileRoute("/admin/roles")({
  component: AdminRoles,
});

interface Role { id: number; name: string; slug: string; description: string; is_system: boolean; permission_count: number; user_count: number; permissions?: Permission[]; }
interface Permission { id: number; name: string; slug: string; description: string; permission_group: string; }
interface AdminUser { id: number; name: string; email: string; role: string; admin_role_id: number | null; role_name: string | null; role_slug: string | null; }

type Tab = "roles" | "users";

function AdminRoles() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("roles");
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<{ grouped: Record<string, Permission[]> }>({ grouped: {} });
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes, usersRes] = await Promise.all([
        api.get<Role[]>("/api/admin/roles"),
        api.get<{ grouped: Record<string, Permission[]> }>("/api/admin/permissions"),
        api.get<AdminUser[]>("/api/admin/role-users"),
      ]);
      setRoles(rolesRes.data);
      setAllPermissions(permsRes.data);
      setAdminUsers(usersRes.data);
    } catch { toast.error("Failed to load role data"); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    navigate({ to: "/admin/login" }); return null;
  }

  function selectRole(role: Role) {
    setSelectedRole(role);
    if (role.permissions) {
      setSelectedPermIds(new Set(role.permissions.map((p) => p.id)));
    } else {
      loadRolePermissions(role.id);
    }
  }

  async function loadRolePermissions(roleId: number) {
    try {
      const res = await api.get<Role>(`/api/admin/roles/${roleId}`);
      const role = res.data;
      setSelectedPermIds(new Set((role.permissions || []).map((p: Permission) => p.id)));
    } catch { toast.error("Failed to load role permissions"); }
  }

  function togglePerm(permId: number) {
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId); else next.add(permId);
      return next;
    });
  }

  async function savePermissions() {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await api.put(`/api/admin/roles/${selectedRole.id}/permissions`, {
        permission_ids: Array.from(selectedPermIds),
      });
      toast.success("Permissions saved");
      fetchAll();
    } catch { toast.error("Failed to save permissions"); }
    setSaving(false);
  }

  async function assignRole(userId: number, roleId: number | null) {
    try {
      await api.put("/api/admin/role-users/assign", { user_id: userId, role_id: roleId });
      toast.success("Role assigned");
      fetchAll();
    } catch { toast.error("Failed to assign role"); }
  }

  async function deleteRole(id: number) {
    if (!confirm("Delete this role?")) return;
    try { await api.delete(`/api/admin/roles/${id}`); toast.success("Role deleted"); fetchAll(); }
    catch { toast.error("Failed to delete"); }
  }

  async function createRole() {
    const name = prompt("Role name:");
    if (!name) return;
    const slug = prompt("Slug (URL-safe identifier):", name.toLowerCase().replace(/\s+/g, "-"));
    if (!slug) return;
    try { await api.post("/api/admin/roles", { name, slug }); toast.success("Role created"); fetchAll(); }
    catch { toast.error("Failed to create role"); }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const tabs: { key: Tab; label: string; icon: typeof Shield }[] = [
    { key: "roles", label: "Roles & Permissions", icon: Shield },
    { key: "users", label: "Admin Users", icon: UserCog },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Admin Roles & Permissions</h1>
        <p className="text-sm text-muted-foreground">Manage admin roles and granular permissions</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-secondary/50 p-1">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "roles" && (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Roles list */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium">Roles</h2>
              <button onClick={createRole}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white">
                <Plus className="h-3 w-3" /> New
              </button>
            </div>
            <div className="space-y-2">
              {roles.map((r) => (
                <button key={r.id} onClick={() => selectRole(r)}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${
                    selectedRole?.id === r.id ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{r.name}</div>
                    {r.is_system && <ShieldCheck className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                    <span>{r.permission_count} permissions</span>
                    <span>{r.user_count} users</span>
                  </div>
                  {r.description && (
                    <div className="mt-1 text-xs text-muted-foreground">{r.description}</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Permission editor */}
          <div>
            {selectedRole ? (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-medium">{selectedRole.name}</h2>
                    <p className="text-xs text-muted-foreground">{selectedRole.permission_count} of {Object.values(allPermissions.grouped).flat().length} permissions assigned</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedPermIds(new Set(Object.values(allPermissions.grouped).flat().map((p: Permission) => p.id)))}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium">Select All</button>
                    <button onClick={() => setSelectedPermIds(new Set())}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium">Clear</button>
                    <button onClick={savePermissions} disabled={saving}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {Object.entries(allPermissions.grouped || {}).map(([group, perms]) => (
                    <div key={group} className="rounded-xl border border-border">
                      <div className="border-b border-border bg-secondary/30 px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground capitalize">
                        {group}
                      </div>
                      <div className="grid gap-1 p-2 sm:grid-cols-2">
                        {perms.map((p) => (
                          <label key={p.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-secondary/50 ${
                              selectedPermIds.has(p.id) ? "bg-primary/5" : ""
                            }`}>
                            <input type="checkbox" checked={selectedPermIds.has(p.id)} onChange={() => togglePerm(p.id)}
                              className="h-4 w-4 rounded border-gray-300 text-primary" />
                            <div>
                              <div className="font-medium">{p.name}</div>
                              <div className="text-xs text-muted-foreground">{p.description}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                Select a role to manage permissions
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">System Role</th>
                <th className="px-4 py-3 font-medium">Admin Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {adminUsers.map((u) => (
                <tr key={u.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium capitalize">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select value={u.admin_role_id ?? ""} onChange={(e) => assignRole(u.id, e.target.value ? Number(e.target.value) : null)}
                      className="rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none">
                      <option value="">None</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
