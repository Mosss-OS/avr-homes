import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import {
  Loader2,
  ArrowRight,
  HandCoins,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  CalendarDays,
  LogIn,
  PauseCircle,
} from "lucide-react";

export const Route = createFileRoute("/account/pools")({
  component: AccountPools,
});

interface Membership {
  id: number;
  pool_id: number;
  pool_title: string;
  pool_slug: string;
  pool_image: string | null;
  plan_type: string;
  monthly_amount: number | null;
  status: string;
  auto_debit: boolean;
  total_contributed: number;
  outstanding: number;
  pending_count: number;
  overdue_count: number;
  next_due_date: string | null;
  pool_status: string;
}

function AccountPools() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    api
      .get<{ data: Membership[] }>("/api/pools/my/memberships")
      .then((r) => setMemberships(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (!isLoading && !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <LogIn className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Login required</h1>
        <p className="mt-2 text-sm text-muted-foreground">Log in to view your pool memberships.</p>
        <Link
          to="/register"
          className="mt-6 inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
        >
          Login / Create account
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-semibold">My Pooled Investments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track contributions, due dates and penalties.
          </p>
        </div>
        <Link
          to="/pools"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary transition"
        >
          <HandCoins className="h-4 w-4" /> Browse pools
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : memberships.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <HandCoins className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-3 font-display text-xl font-semibold">
            You haven't joined any pool yet
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Join a pool to start co-owning Nigerian property with a group.
          </p>
          <Link
            to="/pools"
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
          >
            Explore pools <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {memberships.map((m) => (
            <div key={m.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-24 overflow-hidden rounded-xl">
                    <img
                      src={m.pool_image || ""}
                      alt={m.pool_title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-semibold">{m.pool_title}</h2>
                    <p className="text-xs text-muted-foreground capitalize">
                      {m.plan_type.replace("_", " ")} plan ·{" "}
                      {m.monthly_amount ? `₦${m.monthly_amount.toLocaleString()}/mo` : "one-time"}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      {m.auto_debit ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-medium text-emerald-600">
                          <CreditCard className="h-3 w-3" /> Auto-debit on
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 font-medium text-muted-foreground">
                          <PauseCircle className="h-3 w-3" /> Manual payments
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium capitalize ${
                          m.status === "active"
                            ? "bg-blue-500/10 text-blue-600"
                            : m.status === "defaulted"
                              ? "bg-red-500/10 text-red-600"
                              : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {m.status}
                      </span>
                      {m.overdue_count > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 font-medium text-red-600">
                          <AlertTriangle className="h-3 w-3" /> {m.overdue_count} overdue
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-5">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Contributed</p>
                    <p className="font-display text-lg font-bold text-emerald-600">
                      ₦{m.total_contributed.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                    <p className="font-display text-lg font-bold">
                      {m.outstanding > 0 ? `₦${m.outstanding.toLocaleString()}` : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Next due</p>
                    <p className="text-sm font-semibold">
                      {m.next_due_date
                        ? new Date(m.next_due_date).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })
                        : "—"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {m.pending_count > 0 && m.status !== "defaulted" && (
                      <button
                        onClick={() =>
                          navigate({
                            to: "/pools/$id/payment",
                            params: { id: String(m.pool_id) },
                            search: { membership_id: m.id, type: "schedule" } as never,
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition"
                      >
                        <CreditCard className="h-3.5 w-3.5" /> Pay{" "}
                        {m.pending_count > 1 ? `installments (${m.pending_count})` : "installment"}
                      </button>
                    )}
                    <Link
                      to="/account/pools/$id"
                      params={{ id: String(m.id) }}
                      className="inline-flex items-center justify-center gap-1 rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-secondary transition"
                    >
                      Details <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
