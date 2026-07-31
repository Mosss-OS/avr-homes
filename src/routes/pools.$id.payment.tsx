import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { api, ApiError } from "@/lib/api-client";
import { Loader2, ShieldCheck, CheckCircle2, ArrowLeft, CreditCard } from "lucide-react";

export const Route = createFileRoute("/pools/$id/payment")({
  component: PoolPayment,
});

interface InitializeResponse {
  reference: string;
  authorization_url: string;
  access_code: string;
  amount: number;
}

declare global {
  interface Window {
    PaystackPop?: {
      setup: (opts: Record<string, unknown>) => { openIframe: () => void };
    };
  }
}

function PoolPayment() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const search = Route.useSearch() as {
    membership_id?: number;
    schedule_id?: number;
    type?: "schedule" | "lump_sum";
    amount?: number;
    auto_debit?: number;
    reference?: string;
  };

  const [initializing, setInitializing] = useState(true);
  const [popupOpen, setPopupOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const doneRef = useRef(false);

  // Initialise the Paystack transaction and open the inline popup.
  useEffect(() => {
    if (!search.membership_id) {
      setError("Missing membership. Please join the pool first.");
      setInitializing(false);
      return;
    }

    let cancelled = false;
    async function run() {
      try {
        const res = await api.post<InitializeResponse>("/api/pools/pay/initialize", {
          membership_id: search.membership_id,
          schedule_id: search.schedule_id,
          type: search.type || "schedule",
          amount: search.amount,
          auto_debit: search.auto_debit === 1,
        });
        if (cancelled) return;
        setAmount(res.data.amount);
        setInitializing(false);
        openPopup(res.data.access_code, res.data.reference, res.data.amount);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : "Failed to initialise payment");
        setInitializing(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [search.membership_id, search.schedule_id]);

  function openPopup(accessCode: string, reference: string, amt: number) {
    const key =
      import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ||
      "pk_test_8f68b8a8da7e89262b754f79586235a3e8533419";

    if (!window.PaystackPop) {
      // Load the inline script on demand, then retry.
      const script = document.createElement("script");
      script.src = "https://js.paystack.co/v1/inline.js";
      script.onload = () => openPopup(accessCode, reference, amt);
      document.body.appendChild(script);
      return;
    }

    setPopupOpen(true);
    window.PaystackPop.setup({
      key,
      email: "",
      amount: amt * 100,
      currency: "NGN",
      access_code: accessCode,
      reference,
      onSuccess: (tx: { reference?: string }) => verify(tx.reference || reference),
      onClose: () => setPopupOpen(false),
    }).openIframe();
  }

  async function verify(reference: string) {
    if (doneRef.current) return;
    doneRef.current = true;
    setVerifying(true);
    try {
      await api.post("/api/pools/pay/verify", { payment_ref: reference });
      if (search.auto_debit === 1 && search.membership_id) {
        await api.post("/api/pools/pay/auto-debit", {
          membership_id: search.membership_id,
          reference,
        });
      }
      setSuccess(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Payment verification failed");
      doneRef.current = false;
    } finally {
      setVerifying(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Payment received</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your contribution of <strong>₦{(amount || 0).toLocaleString()}</strong> has been recorded.
          {search.auto_debit === 1 &&
            " Auto-debit is now active — your card will be charged monthly."}
        </p>
        <Link
          to="/account/pools"
          className="mt-6 inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
        >
          View My Pools
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <Link
        to="/pools"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to pools
      </Link>

      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10">
          <CreditCard className="h-6 w-6 text-primary" />
        </div>
        <h1 className="mt-4 font-display text-xl font-semibold">Secure Payment</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {search.type === "lump_sum" ? "One-time contribution" : "Monthly installment"} via
          Paystack
        </p>

        {initializing ? (
          <div className="mt-8 flex flex-col items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            Initialising secure payment...
          </div>
        ) : error ? (
          <div className="mt-6">
            <p className="rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive">
              {error}
            </p>
            <button
              onClick={() => navigate({ to: "/account/pools" })}
              className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Go to My Pools
            </button>
          </div>
        ) : (
          <div className="mt-6">
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="font-display text-3xl font-bold">₦{(amount || 0).toLocaleString()}</p>
            {popupOpen && !verifying ? (
              <p className="mt-4 text-xs text-muted-foreground">
                Complete the payment in the Paystack window. If it closed, refresh this page to try
                again.
              </p>
            ) : (
              <div className="mt-4 flex flex-col items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">
                  {verifying ? "Verifying your payment..." : "Opening secure payment window..."}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Secured by Paystack · 256-bit SSL
        </div>
      </div>
    </div>
  );
}
