import { toast } from "sonner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useEffect, useState } from "react";
import { Loader2, Save, Percent, DollarSign, BadgePercent, Landmark } from "lucide-react";

export const Route = createFileRoute("/admin/fees")({
  component: AdminFees,
});

function AdminFees() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Record<string, string>>("/api/settings")
      .then((r) => setSettings(r.data))
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    navigate({ to: "/admin/login" }); return null;
  }

  async function save() {
    setSaving(true);
    try { await api.post("/api/settings", settings); toast.success("Fees saved"); }
    catch { toast.error("Failed to save"); }
    setSaving(false);
  }

  function set(key: string, value: string) { setSettings({ ...settings, [key]: value }); }

  const fields = [
    { section: "Transaction Fees", icon: Percent },
    { key: "platform_fee_percent", label: "Platform Fee (%)", desc: "Charged on all escrow transactions", type: "number" },
    { key: "booking_fee_percent", label: "Booking Service Fee (%)", desc: "Added to short-let bookings", type: "number" },
    { key: "escrow_fee_percent", label: "Escrow Service Fee (%)", desc: "Escrow holding fee", type: "number" },
    { key: "commission_rate", label: "Agent Commission Rate (%)", desc: "Default agent commission on referrals", type: "number" },
    { section: "Agent Subscription Fees", icon: DollarSign },
    { key: "subscription_basic_price", label: "Basic Plan (₦)", desc: "Monthly price for basic subscription", type: "number" },
    { key: "subscription_pro_price", label: "Pro Plan (₦)", desc: "Monthly price for pro subscription", type: "number" },
    { key: "subscription_premium_price", label: "Premium Plan (₦)", desc: "Monthly price for premium subscription", type: "number" },
    { key: "subscription_enterprise_price", label: "Enterprise Plan (₦)", desc: "Monthly price for enterprise", type: "number" },
    { section: "Withdrawal & Payout Fees", icon: Landmark },
    { key: "withdrawal_fee_fixed", label: "Withdrawal Fixed Fee (₦)", desc: "Fixed fee per withdrawal request", type: "number" },
    { key: "withdrawal_fee_percent", label: "Withdrawal Fee (%)", desc: "Percentage fee on withdrawals", type: "number" },
    { key: "min_withdrawal_amount", label: "Min Withdrawal (₦)", desc: "Minimum withdrawal amount", type: "number" },
    { key: "max_withdrawal_amount", label: "Max Withdrawal (₦)", desc: "Maximum withdrawal amount", type: "number" },
    { section: "Discount & Promo Limits", icon: BadgePercent },
    { key: "max_discount_percent", label: "Max Discount (%)", desc: "Maximum discount allowed on coupons", type: "number" },
    { key: "referral_reward_amount", label: "Referral Reward (₦)", desc: "Default reward for referring an agent", type: "number" },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Fees & Commissions</h1>
          <p className="text-sm text-muted-foreground">Configure platform fees, subscription pricing, and payout limits</p>
        </div>
        <button onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="max-w-2xl space-y-8">
          {fields.reduce((acc: JSX.Element[], f) => {
            if ('section' in f && f.section) {
              const Icon = f.icon || DollarSign;
              acc.push(
                <div key={f.section} className="flex items-center gap-2 border-b border-border pb-2">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <h2 className="font-display text-base font-semibold">{f.section}</h2>
                </div>
              );
            } else {
              acc.push(
                <label key={f.key} className="block">
                  <span className="text-sm font-medium text-muted-foreground">{f.label}</span>
                  {f.desc && <p className="text-xs text-muted-foreground/60 mb-1">{f.desc}</p>}
                  <input type={f.type} value={settings[f.key] || ""}
                    onChange={(e) => set(f.key, e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary/30" />
                </label>
              );
            }
            return acc;
          }, [])}
        </div>
      )}
    </div>
  );
}
