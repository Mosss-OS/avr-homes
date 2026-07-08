/**
 * Agent referral program route — displays referral stats, link generation,
 * wallet balance, transaction history, and leaderboard rankings.
 */

import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Link as LinkIcon, Wallet, CreditCard, TrendingUp, Users, Activity, CheckCircle, Clock, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/agent/dashboard/referrals")({
  head: () => ({ meta: [{ title: "Referral Program — AVR Homes" }] }),
  component: ReferralsPage,
});

/** A single referral record with its status and reward info. */
interface Referral {
  id: number;
  referral_code: string;
  status: string;
  reward_amount: number;
  reward_paid: boolean;
  paid_at: string | null;
  created_at: string;
  referred_name: string | null;
  referred_email: string | null;
  referred_at: string | null;
}

/** Agent wallet balance and aggregated earning/withdrawal totals. */
interface Wallet {
  id: number;
  balance: number;
  total_earned: number;
  total_withdrawn: number;
}

/** A single wallet transaction (credit or debit). */
interface Transaction {
  id: number;
  type: string;
  amount: number;
  description: string;
  reference: string | null;
  status: string;
  created_at: string;
}

/** Aggregated referral statistics for the dashboard overview tab. */
interface ReferralStats {
  total_referrals: number;
  signed_up: number;
  upgraded: number;
  developer_referred: number;
  bulk_buyer_referred: number;
  total_earned: number;
  pending_rewards: number;
}

/** Referrals page component — tabbed view of overview, referrals, wallet, and leaderboard. */
function ReferralsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "referrals" | "wallet" | "leaderboard">("overview");
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) return;
    loadAllData();
  }, [user, authLoading]);

  /** Fetch all referral data (referrals, wallet, transactions, stats) in parallel. */
  async function loadAllData() {
    try {
      setLoading(true);
      const [referralsRes, walletRes, transactionsRes, statsRes] = await Promise.all([
        api.get<{ data: Referral[]; total: number }>("/api/agent/referrals"),
        api.get<Wallet>("/api/agent/wallet"),
        api.get<{ data: Transaction[]; total: number }>("/api/agent/wallet/transactions"),
        api.get<ReferralStats>("/api/agent/referrals/stats"),
      ]);
      setReferrals(referralsRes.data.data);
      setWallet(walletRes.data);
      setTransactions(transactionsRes.data.data);
      setStats(statsRes.data);
    } catch {
      setError("Failed to load referral data");
    } finally {
      setLoading(false);
    }
  }

  /** Generate a new referral code and prepend it to the referrals list. */
  async function generateReferralCode() {
    try {
      const res = await api.post<{ referral_code: string }>("/api/agent/referrals/generate");
      setReferrals(prev => [{ 
        id: Date.now(), 
        referral_code: res.data.referral_code, 
        status: "pending", 
        reward_amount: 0, 
        reward_paid: false, 
        paid_at: null, 
        created_at: new Date().toISOString(),
        referred_name: null,
        referred_email: null,
        referred_at: null,
      }, ...prev]);
    } catch {
      setError("Failed to generate referral code");
    }
  }

  /** Copy the full referral link to the clipboard and show a temporary "Copied!" state. */
  async function copyReferralLink(code: string) {
    const link = `${window.location.origin}/register?ref=${code}`;
    await navigator.clipboard.writeText(link);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }

  /** Prompt for bank details and submit a withdrawal request to the API. */
  async function requestWithdrawal() {
    const amount = prompt("Enter withdrawal amount (minimum ₦1,000):");
    if (!amount) return;
    
    const bankName = prompt("Bank name:");
    if (!bankName) return;
    
    const accountNumber = prompt("Account number:");
    if (!accountNumber) return;
    
    const accountName = prompt("Account name:");
    if (!accountName) return;

    try {
      await api.post("/api/agent/wallet/withdraw", {
        amount: parseFloat(amount),
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
      });
      await loadAllData();
    } catch {
      setError("Failed to request withdrawal");
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-gray-500/10 text-gray-600 border-gray-200",
      signed_up: "bg-blue-500/10 text-blue-600 border-blue-200",
      upgraded: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
      developer_referred: "bg-purple-500/10 text-purple-600 border-purple-200",
      bulk_buyer_referred: "bg-amber-500/10 text-amber-600 border-amber-200",
    };
    return <Badge variant="outline" className={styles[status] || ""}>{status.replace('_', ' ')}</Badge>;
  };

  const getTxStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-500/10 text-amber-600 border-amber-200",
      completed: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
      failed: "bg-destructive/10 text-destructive border-destructive/20",
    };
    return <Badge variant="outline" className={styles[status] || ""}>{status}</Badge>;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-destructive">{error}</p>
        </div>
      </DashboardLayout>
    );
  }

  const referralCode = referrals.find(r => r.referral_code)?.referral_code;
  const referralLink = referralCode ? `${window.location.origin}/register?ref=${referralCode}` : null;

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Referral Program</h1>
        <p className="text-sm text-muted-foreground">Earn wallet credits by referring agents, developers, and bulk buyers</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-border bg-card p-1">
        {[
          { id: "overview", label: "Overview", icon: Activity },
          { id: "referrals", label: "My Referrals", icon: Users },
          { id: "wallet", label: "Wallet", icon: Wallet },
          { id: "leaderboard", label: "Leaderboard", icon: TrendingUp },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as typeof activeTab)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}>
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Users} label="Total Referrals" value={stats?.total_referrals ?? 0} color="blue" />
            <StatCard icon={CheckCircle} label="Signed Up" value={stats?.signed_up ?? 0} color="emerald" />
            <StatCard icon={TrendingUp} label="Upgraded" value={stats?.upgraded ?? 0} color="purple" />
            <StatCard icon={Wallet} label="Total Earned" value={formatCurrency(stats?.total_earned ?? 0)} color="amber" />
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <h3 className="font-display text-lg font-semibold mb-4">Your Referral Link</h3>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                {referralLink ? (
                  <>
                    <Input 
                      value={referralLink} 
                      readOnly 
                      className="pr-12" 
                      placeholder="No referral code generated"
                    />
                    <button
                      onClick={() => copyReferralLink(referrals[0]?.referral_code || '')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90"
                    >
                      {copySuccess ? <CheckCircle className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copySuccess ? "Copied!" : "Copy"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={generateReferralCode}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                  >
                    <LinkIcon className="h-4 w-4" /> Generate Referral Code
                  </button>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Share this link. When someone signs up with your code, you'll earn ₦2,000 wallet credit. If they upgrade, you earn ₦5,000.</p>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <h3 className="font-display text-lg font-semibold mb-4">Reward Tiers</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <RewardCard icon={Users} title="Agent Sign-up" amount="₦2,000" description="When a referred agent completes registration" />
              <RewardCard icon={TrendingUp} title="Agent Upgrade" amount="₦5,000" description="When a referred agent upgrades to a paid tier" />
              <RewardCard icon={Users} title="Developer Referral" amount="₦50,000" description="When a referred developer joins the platform" />
              <RewardCard icon={Users} title="Bulk Buyer" amount="0.5% deal value" description="When a referred buyer purchases 5+ units" />
            </div>
          </div>
        </>
      )}

      {/* Referrals Tab */}
      {activeTab === "referrals" && (
        <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="p-6 border-b border-border">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="font-display text-lg font-semibold">My Referrals</h3>
              {!referrals[0]?.referral_code && (
                <button onClick={generateReferralCode} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90">
                  <LinkIcon className="h-4 w-4" /> Generate Code
                </button>
              )}
            </div>
          </div>
          {referrals.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="font-medium">No referrals yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Generate your referral code to start earning</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Referral Code</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Referred</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reward</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {referrals.map((ref) => (
                    <tr key={ref.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-sm">{ref.referral_code}</td>
                      <td className="px-4 py-3">
                        {ref.referred_name ? (
                          <div>
                            <p className="font-medium">{ref.referred_name}</p>
                            <p className="text-xs text-muted-foreground">{ref.referred_email}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Pending sign-up</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(ref.status)}</td>
                      <td className="px-4 py-3 font-medium">{formatCurrency(ref.reward_amount)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(ref.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Wallet Tab */}
      {activeTab === "wallet" && wallet && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-semibold">Wallet Balance</h3>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Active</Badge>
              </div>
              <div className="text-4xl font-bold">{formatCurrency(wallet.balance)}</div>
              <p className="text-sm text-muted-foreground mt-1">Available for withdrawal</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Total Earned</p>
                  <p className="font-medium">{formatCurrency(wallet.total_earned)}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Total Withdrawn</p>
                  <p className="font-medium">{formatCurrency(wallet.total_withdrawn)}</p>
                </div>
              </div>
              <button
                onClick={requestWithdrawal}
                disabled={wallet.balance < 1000}
                className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                <CreditCard className="h-4 w-4" /> Request Withdrawal (min ₦1,000)
              </button>
            </div>

            <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
              <div className="p-4 border-b border-border">
                <h3 className="font-display text-lg font-semibold">Transaction History</h3>
              </div>
              {transactions.length === 0 ? (
                <div className="p-8 text-center">
                  <Wallet className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
                  <p className="font-medium">No transactions yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">Referral rewards and withdrawals will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg p-2 ${tx.type === 'credit' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                          {tx.type === 'credit' ? <TrendingUp className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-medium">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${tx.type === 'credit' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </p>
                        {getTxStatusBadge(tx.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <h3 className="font-display text-lg font-semibold mb-4">Withdrawal Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Processing: 1-3 business days</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>Minimum: ₦1,000</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>Bank details required</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Activity className="h-4 w-4" />
                <span>Pending withdrawals: {formatCurrency(stats?.pending_rewards ?? 0)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Tab */}
      {activeTab === "leaderboard" && (
        <div className="space-y-6">
          {(['weekly', 'monthly', 'quarterly'] as const).map((period) => (
            <LeaderboardCard key={period} period={period} />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

/** A small stat card with an icon, label, and formatted value. */
function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; color: string }) {
  const colors = {
    blue: "bg-blue-500/10 text-blue-600 border-blue-200",
    emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
    purple: "bg-purple-500/10 text-purple-600 border-purple-200",
    amber: "bg-amber-500/10 text-amber-600 border-amber-200",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 font-display text-2xl font-bold">{value}</p>
        </div>
        <div className={`rounded-xl p-3 ${colors[color as keyof typeof colors]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

/** A card showing a reward tier with title, amount, and description. */
function RewardCard({ icon: Icon, title, amount, description }: { icon: React.ComponentType<{ className?: string }>; title: string; amount: string; description: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-medium">{title}</h4>
          <p className="mt-1 font-display text-xl font-bold text-primary">{amount}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

/** A leaderboard card that fetches and displays the top agents for a given period. */
function LeaderboardCard({ period }: { period: 'weekly' | 'monthly' | 'quarterly' }) {
  const [leaders, setLeaders] = useState<{ id: number; name: string; slug: string | null; photo_url: string | null; agency: string; city: string; listings: number; score: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ leaders: { id: number; name: string; slug: string | null; photo_url: string | null; agency: string; city: string; listings: number; score: number }[] }>(`/api/leaderboard/${period}`)
      .then((res) => setLeaders(res.data.leaders))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const periodLabels = { weekly: 'This Week', monthly: 'This Month', quarterly: 'This Quarter' };
  const periodIcons = { weekly: Activity, monthly: TrendingUp, quarterly: Users };

  const PeriodIcon = periodIcons[period];

  return (
    <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PeriodIcon className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg font-semibold">{periodLabels[period]} Leaderboard</h3>
        </div>
        <span className="text-xs text-muted-foreground">Top 10 agents</span>
      </div>
      {loading ? (
        <div className="p-8 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        </div>
      ) : leaders.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">No data available</div>
      ) : (
        <div className="divide-y divide-border">
          {leaders.map((leader, index) => (
            <div key={leader.id} className="px-6 py-4 flex items-center gap-4 hover:bg-muted/30">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${index < 3 ? 'bg-amber-500/10 text-amber-600' : 'bg-muted text-muted-foreground'}`}>
                {index + 1}
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full overflow-hidden bg-accent flex-shrink-0">
                  {leader.photo_url ? <img src={leader.photo_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-muted-foreground">?</div>}
                </div>
                <div>
                  <p className="font-medium">{leader.name}</p>
                  <p className="text-xs text-muted-foreground">{leader.agency} · {leader.city}</p>
                </div>
              </div>
              <div className="ml-auto text-right">
                <p className="font-bold text-primary">{leader.listings} listings</p>
                <p className="text-xs text-muted-foreground">Score: {leader.score.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}