import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Mail } from "lucide-react";

export const Route = createFileRoute("/agent/dashboard/leads")({
  head: () => ({ meta: [{ title: "Leads — AVR Homes" }] }),
  component: () => (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Leads & Inquiries</h1>
        <p className="text-sm text-muted-foreground">View and manage inquiries from potential buyers</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12">
        <Mail className="mb-3 h-12 w-12 text-muted-foreground/40" />
        <p className="font-medium">No leads yet</p>
        <p className="text-sm text-muted-foreground">Inquiries from your property listings will appear here.</p>
      </div>
    </DashboardLayout>
  ),
});
