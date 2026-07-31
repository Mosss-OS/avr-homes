import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { Loader2, LogIn, UserPlus, ShieldCheck, Mail, Lock, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/register")({
  component: Register,
});

const API_LOGO_URL =
  "https://res.cloudinary.com/dv0tt80vn/image/upload/v1782211724/AVRUST_LOGO-removebg-preview_rhui5h.png";

function Register() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"register" | "login">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "register") {
        const res = await api.post<{ token: string; refresh_token: string }>("/api/auth/register", {
          name,
          email,
          password,
        });
        localStorage.setItem("auth_token", res.data.token);
        localStorage.setItem("refresh_token", res.data.refresh_token);
      } else {
        const res = await api.post<{ token: string; refresh_token: string }>("/api/auth/login", {
          email,
          password,
        });
        localStorage.setItem("auth_token", res.data.token);
        localStorage.setItem("refresh_token", res.data.refresh_token);
      }
      // Full reload so the auth provider restores the session.
      window.location.href = "/account/pools";
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <img
            src={API_LOGO_URL}
            alt="AVR Homes"
            className="mx-auto h-16 w-16 rounded-xl object-cover"
          />
          <h1 className="mt-3 font-display text-2xl font-semibold">
            {mode === "register" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "register"
              ? "Join pools, contribute, and co-own property."
              : "Log in to manage your pools and investments."}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1">
          <button
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium transition ${mode === "register" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <UserPlus className="h-4 w-4" /> Register
          </button>
          <button
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium transition ${mode === "login" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LogIn className="h-4 w-4" /> Login
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Full name"
                className="h-12 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm font-medium outline-none focus:border-primary"
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Email address"
              className="h-12 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm font-medium outline-none focus:border-primary"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Password (min 6 characters)"
              className="h-12 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm font-medium outline-none focus:border-primary"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-destructive/10 p-3 text-xs font-medium text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Please wait..." : mode === "register" ? "Create account" : "Log in"}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          Secure · Your contributions are held in the company account until the pool is funded.
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Are you a real estate agent?{" "}
          <Link to="/agent/register" className="font-medium text-primary hover:underline">
            Join the AVR Homes network
          </Link>
        </p>
      </div>
    </div>
  );
}
