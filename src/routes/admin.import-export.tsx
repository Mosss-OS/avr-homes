import { toast } from "sonner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useRef, useState } from "react";
import { Download, Upload, FileDown, FileUp, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/import-export")({
  component: AdminImportExport,
});

interface ImportResult {
  inserted: number; updated?: number; errors?: string[];
}

const entities = [
  { key: "properties", label: "Properties", description: "Import/export property listings with details" },
  { key: "users", label: "Users", description: "Import/export user accounts" },
  { key: "agents", label: "Agents", description: "Import/export agent profiles" },
  { key: "bookings", label: "Bookings", description: "Export booking records (read-only)" },
] as const;

function AdminImportExport() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [result, setResult] = useState<{ entity: string; data: ImportResult } | null>(null);

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    navigate({ to: "/admin/login" }); return null;
  }

  const handleExport = async (entity: string) => {
    const url = `${import.meta.env.VITE_API_URL || ""}/api/admin/export/${entity}`;
    const token = localStorage.getItem("token");
    const toastId = toast.loading(`Exporting ${entity}...`);
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { throw new Error("Export failed"); }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${entity}-export.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(`${entity} exported`, { id: toastId });
    } catch {
      toast.error(`Failed to export ${entity}`, { id: toastId });
    }
  };

  const handleDownloadSample = async (entity: string) => {
    const url = `${import.meta.env.VITE_API_URL || ""}/api/admin/export/sample?entity=${entity}`;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${entity}-sample.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error("Failed to download sample");
    }
  };

  const handleImport = async (entity: string) => {
    const file = fileRef.current?.files?.[0];
    if (!file) { toast.error("Select a CSV file first"); return; }
    if (!file.name.endsWith(".csv")) { toast.error("Only CSV files are supported"); return; }

    setImporting(entity);
    setResult(null);
    const toastId = toast.loading(`Importing ${entity}...`);

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post<ImportResult>(`/api/admin/import/${entity}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult({ entity, data: res.data });
      toast.success(`Imported ${res.data.inserted} ${entity}`, { id: toastId });
    } catch {
      toast.error(`Import failed`, { id: toastId });
    }
    setImporting(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Bulk Import / Export</h1>
        <p className="text-sm text-muted-foreground">Import and export data in CSV format</p>
      </div>

      {result && (
        <div className={`mb-6 rounded-2xl border p-4 ${result.data.errors?.length ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
          <div className="flex items-center gap-2 font-medium">
            {result.data.errors?.length ? (
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            )}
            {result.data.inserted} {result.entity} imported
            {result.data.updated ? ` (${result.data.updated} updated)` : ""}
          </div>
          {result.data.errors && result.data.errors.length > 0 && (
            <ul className="mt-2 max-h-32 overflow-y-auto space-y-1">
              {result.data.errors.map((e, i) => (
                <li key={i} className="text-sm text-amber-700">{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {entities.map((e) => {
          const isExportOnly = e.key === "bookings";
          return (
            <div key={e.key} className="rounded-2xl border border-border p-5">
              <h3 className="font-display text-lg font-semibold capitalize">{e.label}</h3>
              <p className="mb-4 text-sm text-muted-foreground">{e.description}</p>

              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleExport(e.key)}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90">
                  <Download className="h-4 w-4" /> Export CSV
                </button>

                {!isExportOnly && (
                  <>
                    <button onClick={() => handleDownloadSample(e.key)}
                      className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">
                      <FileDown className="h-4 w-4" /> Sample
                    </button>

                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">
                      <FileUp className="h-4 w-4" /> Import
                      <input ref={fileRef} type="file" accept=".csv" className="hidden"
                        onChange={() => handleImport(e.key)} />
                    </label>
                  </>
                )}
              </div>

              {importing === e.key && (
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Importing...
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-2xl border border-border p-5">
        <h3 className="font-display text-lg font-semibold">Instructions</h3>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          <li>• Download a <strong>Sample CSV</strong> for the correct column format before importing.</li>
          <li>• Import files must be <strong>.csv</strong> format with headers in the first row.</li>
          <li>• For properties, use the <strong>agent_email</strong> column to assign listings to existing agents.</li>
          <li>• Bookings are <strong>export only</strong> — no import supported.</li>
          <li>• Large imports may take a few seconds to process.</li>
        </ul>
      </div>
    </div>
  );
}
