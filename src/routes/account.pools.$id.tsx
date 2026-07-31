import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import {
  ArrowLeft,
  Loader2,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  LogIn,
  CalendarDays,
  HandCoins,
  Wallet,
} from "lucide-react";

export const Route = createFileRoute("/account/pools/$id")({
  component: AccountPoolDetail,
});

interface MembershipDetail {
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
  total_penalties: number;
  pool_status: string;
}

interface Schedule {
  id: number;
  due_date: string;
  amount: number;
  penalty_amount: number;
  total_due: number;
  status: string;
  paid_at: string | null;
  payment_ref: string | null;
}

interface Contribution {
  id: number;
  amount: number;
  penalty_amount: number;
  type: string;
  channel: string;
  payment_ref: string | null;
  status: string;
  paid_at: string | null;
  created_at: string;
}

function AccountPoolDetail() {
  const { id } = Route.useParams();
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [membership, setMembership] = useState<MembershipDetail | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [lumpAmount, setLumpAmount] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    api
      .get<{ membership: MembershipDetail; schedules: Schedule[]; contributions: Contribution[] }>(
        `/api/pools/my/memberships/${id}`,
      )
      .then((r) => {
        setMembership(r.data.membership);
        setSchedules(r.data.schedules || []);
        setContributions(r.data.contributions || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, user?.id]);

  if (!isLoading && !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <LogIn className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Login required</h1>
        <Link
          to="/register"
          className="mt-6 inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
        >
          Login / Create account
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!membership) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <p className="text-lg font-semibold">Membership not found</p>
        <Link
          to="/account/pools"
          className="mt-2 inline-flex items-center gap-1 text-sm text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to my pools
        </Link>
      </div>
    );
  }

  function paySchedule(scheduleId: number) {
    navigate({
      to: "/pools/$id/payment",
      params: { id: String(membership!.pool_id) },
      search: { membership_id: membership!.id, schedule_id: scheduleId, type: "schedule" } as never,
    });
  }

  function payLumpSum() {
    navigate({
      to: "/pools/$id/payment",
      params: { id: String(membership!.pool_id) },
      search: {
        membership_id: membership!.id,
        type: "lump_sum",
        amount: lumpAmount || undefined,
      } as never,
    });
  }

  const outstanding = schedules.filter((s) => s.status === "pending" || s.status === "overdue");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        to="/account/pools"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to my pools
      </Link>

      {/* Summary */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0A1628] to-[#1a2a4a] p-6 sm:p-8 text-white mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold">
              {membership.pool_title}
            </h1>
            <p className="mt-1 text-sm text-white/70 capitalize">
              {membership.plan_type.replace("_", " ")} plan
              {membership.monthly_amount
                ? ` · ₦${membership.monthly_amount.toLocaleString()}/month`
                : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {membership.auto_debit ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 font-medium text-emerald-300">
                  <CreditCard className="h-3 w-3" /> Auto-debit active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 font-medium text-white/70">
                  <CreditCard className="h-3 w-3" /> Manual payments
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 font-medium text-white/70 capitalize">
                {membership.status}
              </span>
            </div>
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <p className="text-xs text-white/60">Total contributed</p>
              <p className="font-display text-xl font-bold text-emerald-400">
                ₦{membership.total_contributed.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/60">Penalties paid</p>
              <p className="font-display text-xl font-bold">
                {membership.total_penalties > 0
                  ? `₦${membership.total_penalties.toLocaleString()}`
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lump sum */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <HandCoins className="h-4 w-4 text-primary" /> One-time contribution
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Boost the pool with a lump-sum payment any time.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={lumpAmount ?? ""}
              onChange={(e) => setLumpAmount(Number(e.target.value))}
              placeholder="Amount (₦)"
              className="h-10 w-40 rounded-xl border border-border bg-background px-3 text-sm font-medium outline-none focus:border-primary"
            />
            <button
              onClick={payLumpSum}
              className="rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition"
            >
              Contribute now
            </button>
          </div>
        </div>
      </div>

      {/* Schedules */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-base font-semibold">Payment Schedule</h2>
          <span className="text-xs text-muted-foreground">{outstanding.length} outstanding</span>
        </div>
        {schedules.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No monthly installments yet.{" "}
            {membership.plan_type === "lump_sum"
              ? "You're on a one-time plan — use the lump-sum box above."
              : "Your first installment will be generated automatically."}
          </p>
        ) : (
          <div className="divide-y divide-border">
            {schedules.map((s) => {
              const isPending = s.status === "pending" || s.status === "overdue";
              return (
                <div key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="flex min-w-[120px] flex-col">
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      {new Date(s.due_date).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex-1 min-w-[100px]">
                    <p className="text-sm font-semibold">₦{s.total_due.toLocaleString()}</p>
                    {s.penalty_amount > 0 && (
                      <p className="flex items-center gap-1 text-xs text-amber-600">
                        <AlertTriangle className="h-3 w-3" /> includes ₦
                        {s.penalty_amount.toLocaleString()} late fee
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                      s.status === "paid"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : s.status === "overdue"
                          ? "bg-red-500/10 text-red-600"
                          : "bg-blue-500/10 text-blue-600"
                    }`}
                  >
                    {s.status === "paid" ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}{" "}
                    {s.status}
                  </span>
                  {isPending && membership.status !== "defaulted" && (
                    <button
                      onClick={() => paySchedule(s.id)}
                      className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition"
                    >
                      Pay now
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Contributions */}
      {contributions.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <Wallet className="h-4 w-4 text-primary" /> Contribution History
            </h2>
          </div>
          <div className="divide-y divide-border">
            {contributions.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold">₦{c.amount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {c.type.replace("_", " ")} · {c.channel.replace("_", " ")}
                  </p>
                </div>
                {c.penalty_amount > 0 && (
                  <span className="text-xs text-amber-600">
                    +₦{c.penalty_amount.toLocaleString()} fee
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {c.paid_at
                    ? new Date(c.paid_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : ""}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 capitalize">
                  <CheckCircle2 className="h-3 w-3" /> {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
