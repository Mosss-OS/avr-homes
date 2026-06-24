import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/agent/dashboard/verification")({
  head: () => ({ meta: [{ title: "Verification — AVR Homes" }] }),
  component: () => (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Verification Center</h1>
        <p className="text-sm text-muted-foreground">Upload documents and track property verification status</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12">
        <ShieldCheck className="mb-3 h-12 w-12 text-muted-foreground/40" />
        <p className="font-medium">No pending verifications</p>
        <p className="text-sm text-muted-foreground">Upload documents for your listings to start the verification process.</p>
      </div>
    </DashboardLayout>
  ),
});
