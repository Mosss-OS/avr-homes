import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Home, Plus } from "lucide-react";

export const Route = createFileRoute("/agent/dashboard/listings")({
  head: () => ({ meta: [{ title: "My Listings — AVR Homes" }] }),
  component: () => (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">My Listings</h1>
          <p className="text-sm text-muted-foreground">Manage your property listings</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> Add Property
        </button>
      </div>
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12">
        <Home className="mb-3 h-12 w-12 text-muted-foreground/40" />
        <p className="font-medium">No listings yet</p>
        <p className="text-sm text-muted-foreground">Create your first property listing to get started.</p>
      </div>
    </DashboardLayout>
  ),
});
