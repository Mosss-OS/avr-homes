/**
 * Agent login route — provides an email/password sign-in form
 * that authenticates via the Auth context and redirects to the dashboard.
 */

import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

export const Route = createFileRoute("/agent/login")({
  head: () => ({
    meta: [
      { title: "Agent Login — AVR Homes" },
      { name: "description", content: "Sign in to your AVR Homes agent dashboard." },
    ],
  }),
  component: AgentLoginPage,
});

/** Login page component — email/password form with show/hide password toggle. */
function AgentLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /** Handle form submission: call login and navigate to dashboard on success. */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate({ to: "/agent/dashboard" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold">Agent Login</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to manage your listings</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="email" type="email" placeholder="agent@example.com" value={email}
                onChange={(e) => setEmail(e.target.value)} required
                className="pl-10" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter password"
                value={password} onChange={(e) => setPassword(e.target.value)} required
                className="pl-10 pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <Button type="submit" className="w-full rounded-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Sign in
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link to="/agent/register" className="font-medium text-primary hover:underline">
            Register as agent
          </Link>
        </p>
      </div>
    </div>
  );
}
