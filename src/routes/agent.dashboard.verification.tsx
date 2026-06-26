import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Loader2, ShieldCheck, Upload, FileText, CheckCircle2, XCircle, Clock,
  AlertTriangle, ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/agent/dashboard/verification")({
  head: () => ({ meta: [{ title: "Verification Center — AVR Homes" }] }),
  component: AgentVerificationPage,
});

interface ListingItem {
  id: number;
  title: string;
  slug: string;
  type: string;
  purpose: string;
  price: number;
  image: string | null;
  city: string;
  community: string;
  is_verified: boolean;
  status: string;
}

interface VerificationDoc {
  id: number;
  document_type: string;
  file_path: string;
  original_name: string;
  created_at: string;
}

interface VerificationData {
  property: {
    id: number;
    title: string;
    is_verified: boolean;
    verified_at: string | null;
    verification_expires_at: string | null;
  };
  verification: {
    id: number;
    property_id: number;
    agent_id: number;
    status: string;
    admin_id: number | null;
    admin_name: string | null;
    admin_notes: string | null;
    rejection_reason: string | null;
    expires_at: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  documents: VerificationDoc[];
}

const DOCUMENT_TYPES = [
  { value: "certificate_of_occupancy", label: "Certificate of Occupancy" },
  { value: "survey_plan", label: "Survey Plan" },
  { value: "deed_of_assignment", label: "Deed of Assignment" },
  { value: "governors_consent", label: "Governor's Consent" },
  { value: "agent_lasrera_id", label: "LASRERA ID" },
  { value: "property_photo", label: "Property Photo" },
];

const VERIFICATION_BADGES: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-600 border-amber-200" },
  approved: { label: "Verified", className: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

function AgentVerificationPage() {
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<ListingItem | null>(null);
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [verifLoading, setVerifLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [docType, setDocType] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.get<{ data: ListingItem[] }>("/api/agent/listings?per_page=100")
      .then((r) => setListings(r.data.data || []))
      .catch(() => toast.error("Failed to load listings"))
      .finally(() => setLoading(false));
  }, []);

  async function openDetail(listing: ListingItem) {
    setSelectedListing(listing);
    setDetailOpen(true);
    setVerifLoading(true);
    setVerificationData(null);
    try {
      const res = await api.get<VerificationData>(`/api/agent/listings/${listing.id}/verification`);
      setVerificationData(res.data);
    } catch {
      toast.error("Failed to load verification data");
    } finally {
      setVerifLoading(false);
    }
  }

  async function handleUpload() {
    if (!docType || !selectedListing) return;
    const fileInput = document.getElementById("doc-file") as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) { toast.error("Please select a file"); return; }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("document_type", docType);
      formData.append("document", file);
      await api.post(`/api/agent/listings/${selectedListing.id}/documents`, formData);
      toast.success("Document uploaded successfully");
      setUploadOpen(false);
      setDocType("");
      fileInput.value = "";
      openDetail(selectedListing);
    } catch {
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
    }
  }

  function formatPrice(price: number) {
    if (price >= 1e9) return `₦${(price / 1e9).toFixed(1)}B`;
    if (price >= 1e6) return `₦${(price / 1e6).toFixed(1)}M`;
    return `₦${price.toLocaleString()}`;
  }

  function statusBadge(listing: ListingItem) {
    if (listing.is_verified) {
      return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Verified</Badge>;
    }
    return <Badge variant="outline" className="bg-muted text-muted-foreground">Unverified</Badge>;
  }

  function daysUntilExpiry(expiresAt: string | null): number | null {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Verification Center</h1>
        <p className="text-sm text-muted-foreground">Upload documents and track property verification status</p>
      </div>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12">
          <ShieldCheck className="mb-3 h-12 w-12 text-muted-foreground/40" />
          <p className="font-medium">No listings yet</p>
          <p className="text-sm text-muted-foreground">Create a listing first to start the verification process.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Property</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Price</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Verification</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {listings.map((listing) => (
                <tr key={listing.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{listing.title}</p>
                    <p className="text-xs text-muted-foreground">{listing.city}, {listing.community}</p>
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{listing.type}</td>
                  <td className="px-4 py-3">{formatPrice(listing.price)}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={
                      listing.status === "published" ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" :
                      listing.status === "draft" ? "bg-slate-500/10 text-slate-600 border-slate-200" :
                      "bg-muted text-muted-foreground"
                    }>{listing.status}</Badge>
                  </td>
                  <td className="px-4 py-3">{statusBadge(listing)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => openDetail(listing)} className="rounded-full text-xs">
                      {listing.is_verified ? "View Details" : "Upload Docs"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedListing && (
            <>
              <SheetHeader className="mb-6">
                <div className="flex items-center gap-2">
                  <SheetTitle>{selectedListing.title}</SheetTitle>
                  {statusBadge(selectedListing)}
                </div>
                <SheetDescription>
                  {selectedListing.city}, {selectedListing.community} &middot; {formatPrice(selectedListing.price)}
                </SheetDescription>
              </SheetHeader>

              {verifLoading ? (
                <div className="flex min-h-[200px] items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : verificationData ? (
                <div className="space-y-6">
                  {/* Verification Status */}
                  <div className="space-y-2">
                    <Label>Verification Status</Label>
                    {verificationData.verification ? (
                      <div className="rounded-lg bg-accent/50 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          {verificationData.verification.status === "approved" ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          ) : verificationData.verification.status === "rejected" ? (
                            <XCircle className="h-5 w-5 text-destructive" />
                          ) : (
                            <Clock className="h-5 w-5 text-amber-600" />
                          )}
                          <span className="font-medium capitalize">{verificationData.verification.status}</span>
                        </div>
                        {verificationData.verification.rejection_reason && (
                          <div className="mt-2 rounded bg-destructive/10 p-2 text-xs text-destructive">
                            <span className="font-medium">Reason: </span>
                            {verificationData.verification.rejection_reason}
                          </div>
                        )}
                        {verificationData.verification.admin_notes && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            <span className="font-medium">Admin notes: </span>
                            {verificationData.verification.admin_notes}
                          </p>
                        )}
                        {(() => {
                          const expiresAt = verificationData.verification!.expires_at;
                          if (!expiresAt) return null;
                          const days = daysUntilExpiry(expiresAt);
                          return (
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <AlertTriangle className="h-3 w-3" />
                              Expires {new Date(expiresAt).toLocaleDateString()}
                              {days !== null && days <= 30 && (
                                <span className="text-destructive font-medium">
                                  ({days} days left)
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="rounded-lg bg-accent/50 p-3 text-sm text-muted-foreground">
                        No verification request submitted yet
                      </div>
                    )}
                  </div>

                  {/* Documents */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Documents</Label>
                      <Button variant="outline" size="sm" onClick={() => { setDocType(""); setUploadOpen(true); }}
                        className="rounded-full text-xs">
                        <Upload className="mr-1 h-3 w-3" /> Upload
                      </Button>
                    </div>
                    {verificationData.documents.length === 0 ? (
                      <div className="rounded-lg bg-accent/50 p-3 text-sm text-muted-foreground text-center">
                        No documents uploaded yet
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {verificationData.documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between rounded-lg bg-accent/50 p-3">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">
                                  {DOCUMENT_TYPES.find((t) => t.value === doc.document_type)?.label || doc.document_type}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {doc.original_name} &middot; {new Date(doc.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">Uploaded</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Property is_verified */}
                  {(() => {
                    const expiresAt = verificationData.property.verification_expires_at;
                    if (!expiresAt) return null;
                    const days = daysUntilExpiry(expiresAt);
                    return (
                      <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>
                          Verified until {new Date(expiresAt).toLocaleDateString()}
                          {days !== null && days <= 30 && (
                            <span className="text-destructive font-medium ml-1">
                              ({days} days remaining — renew soon)
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Failed to load verification data</p>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Upload Modal */}
      <Sheet open={uploadOpen} onOpenChange={setUploadOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader className="mb-6">
            <SheetTitle>Upload Document</SheetTitle>
            <SheetDescription>
              {selectedListing?.title} — Add a verification document for this property.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doc-type">Document Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger id="doc-type">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-file">File</Label>
              <Input id="doc-file" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf"
                className="cursor-pointer" />
              <p className="text-xs text-muted-foreground">Accepted: JPG, PNG, WebP, PDF &middot; Max 10MB</p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setUploadOpen(false)} className="flex-1 rounded-full">
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={!docType || uploading} className="flex-1 rounded-full">
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}
