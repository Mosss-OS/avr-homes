import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useState, useEffect } from "react";
import {
  ShieldCheck, Loader2, Upload, CheckCircle2, XCircle,
  ArrowLeft, FileText, Eye, AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/kyc")({
  component: KYCPage,
});

function KYCPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [form, setForm] = useState({
    bvn_number: "",
    id_document_url: "",
    id_document_type: "international_passport",
    source_of_funds: "",
    accredited_investor: false,
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!user) {
      navigate({ to: "/agent/login" });
      return;
    }
    api.get<{ status: string; bvn_number?: string; id_document_url?: string; id_document_type?: string; source_of_funds?: string; accredited_investor?: boolean }>("/api/kyc/status")
      .then((r) => {
        setStatus(r.data.status);
        if (r.data.status !== "not_submitted") {
          setForm({
            bvn_number: r.data.bvn_number || "",
            id_document_url: r.data.id_document_url || "",
            id_document_type: r.data.id_document_type || "international_passport",
            source_of_funds: r.data.source_of_funds || "",
            accredited_investor: r.data.accredited_investor || false,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, navigate]);

  async function submit() {
    if (!form.bvn_number.trim() || form.bvn_number.length !== 11) {
      setMessage({ type: "error", text: "BVN must be 11 digits" });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      await api.post("/api/kyc/submit", {
        ...form,
        accredited_investor: form.accredited_investor ? 1 : 0,
      });
      setMessage({ type: "success", text: "KYC submitted for verification" });
      setStatus("pending");
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Submission failed" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <button onClick={() => navigate({ to: "/invest" })}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to investments
      </button>

      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold">Identity Verification</h1>
            <p className="text-sm text-muted-foreground">Complete KYC to start investing</p>
          </div>
        </div>

        {status === "verified" && (
          <div className="mb-6 rounded-xl bg-emerald-500/10 p-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-emerald-700">KYC Verified</p>
              <p className="text-sm text-emerald-600/80">You can now invest in fractional properties.</p>
            </div>
          </div>
        )}

        {status === "pending" && (
          <div className="mb-6 rounded-xl bg-blue-500/10 p-4 flex items-start gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-700">Under Review</p>
              <p className="text-sm text-blue-600/80">Your submitted documents are being verified. This usually takes 1-2 business days.</p>
            </div>
          </div>
        )}

        {message && (
          <div className={`mb-4 flex items-center gap-2 rounded-xl p-3 text-sm ${
            message.type === "success" ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
          }`}>
            {message.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {message.text}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">BVN (Bank Verification Number) *</label>
            <input type="text" maxLength={11} value={form.bvn_number}
              onChange={(e) => setForm({ ...form, bvn_number: e.target.value.replace(/\D/g, "") })}
              className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none"
              placeholder="Enter 11-digit BVN" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">ID Document Type</label>
              <select value={form.id_document_type}
                onChange={(e) => setForm({ ...form, id_document_type: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none"
              >
                <option value="international_passport">International Passport</option>
                <option value="national_id">National ID</option>
                <option value="drivers_license">Driver's License</option>
                <option value="voters_card">Voter's Card</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">ID Document URL</label>
              <input type="url" value={form.id_document_url}
                onChange={(e) => setForm({ ...form, id_document_url: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none"
                placeholder="https://..." />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Source of Funds *</label>
            <textarea value={form.source_of_funds} rows={2}
              onChange={(e) => setForm({ ...form, source_of_funds: e.target.value })}
              className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none"
              placeholder="e.g., Employment income, business revenue, savings, investment returns"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={form.accredited_investor}
              onChange={(e) => setForm({ ...form, accredited_investor: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-border text-primary accent-primary" />
            <div className="text-sm">
              <span className="font-medium">Accredited Investor</span>
              <p className="text-xs text-muted-foreground">I confirm that I meet the accredited investor criteria as defined by SEC Nigeria (net worth {">"}₦100M or annual income {">"}₦20M).</p>
            </div>
          </label>

          <button onClick={submit} disabled={submitting || status === "verified"}
            className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-50 mt-2"
          >
            {submitting ? "Submitting..." : status === "verified" ? "Already Verified" : status === "pending" ? "Resubmit" : "Submit for Verification"}
          </button>
        </div>
      </div>
    </div>
  );
}
