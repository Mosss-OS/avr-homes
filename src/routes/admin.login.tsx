/**
 * Admin login route. Provides a credential-based sign-in form styled
 * with a dark branded background. Redirects to /admin on success.
 */
import { useState } from "react";
import { toast } from "sonner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, Lock, Mail, Shield } from "lucide-react";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Admin Login — AVR Homes" },
      { name: "description", content: "Sign in to the AVR Homes admin panel." },
    ],
  }),
  component: AdminLoginPage,
});

/** Admin login form with email, password (show/hide toggle), error display, and loading state. */
function AdminLoginPage() {
  const { adminLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /** Authenticate with email/password via auth context, then navigate to admin dashboard. */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await adminLogin(email, password);
      toast.success("Welcome back, admin!");
      navigate({ to: "/admin" });
    } catch (err) {
      console.error("Admin login error:", err);
      setError("Invalid email or password. Please try again.");
      toast.error("Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "#0A1628" }}>
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#C9A84C]/20 text-[#C9A84C]">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-white">Admin Panel</h1>
          <p className="mt-1 text-sm text-white/60">Sign in to manage the platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white/80">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
              <Input id="email" type="email" placeholder="admin@avrhomes.ng" value={email}
                onChange={(e) => setEmail(e.target.value)} required
                className="border-white/10 bg-[#132237] pl-10 text-white placeholder:text-white/40
                  [box-shadow:0_0_0_1000px_#132237_inset] [-webkit-text-fill-color:white]
                  autofill:!bg-[#132237] focus:outline-none focus:ring-1 focus:ring-[#C9A84C]/30" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white/80">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter password"
                value={password} onChange={(e) => setPassword(e.target.value)} required
                className="border-white/10 bg-[#132237] pl-10 pr-10 text-white placeholder:text-white/40
                  [box-shadow:0_0_0_1000px_#132237_inset] [-webkit-text-fill-color:white]
                  autofill:!bg-[#132237] focus:outline-none focus:ring-1 focus:ring-[#C9A84C]/30" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-[#C9A84C]/70 hover:text-[#C9A84C]">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
          )}

          <Button type="submit" className="w-full rounded-full" disabled={loading} style={{ background: "#C9A84C", color: "#0A1628" }}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Sign in
          </Button>
        </form>

        <p className="text-center text-xs text-white/40">
          Authorized personnel only.
        </p>
      </div>
    </div>
  );
}
