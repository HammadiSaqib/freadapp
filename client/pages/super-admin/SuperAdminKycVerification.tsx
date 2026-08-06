import { useEffect, useMemo, useState } from "react";
import SuperAdminLayout from "@/components/SuperAdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getAuthToken, superAdminApi } from "@/lib/api";
import { CheckCircle2, Eye, Loader2, RefreshCw, Search, ShieldCheck } from "lucide-react";

type KycSubmission = {
  id?: number | null;
  user_id: number;
  user_name: string;
  email: string;
  status: "not_started" | "pending" | "approved" | "failed" | "manual_review";
  kyc_required?: boolean;
  kyc_status?: string | null;
  admin_notes?: string | null;
  image_url?: string | null;
  created_at?: string | null;
  reviewed_at?: string | null;
};

const statusOptions = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "failed", label: "Failed" },
  { value: "manual_review", label: "Manual Review" },
  { value: "not_started", label: "Not Started" },
];

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function getStatusBadgeClass(status: KycSubmission["status"]) {
  switch (status) {
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "manual_review":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "failed":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export default function SuperAdminKycVerification() {
  const { toast } = useToast();
  const token = getAuthToken();
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<KycSubmission | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [resubmitDialogOpen, setResubmitDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const imageUrl = useMemo(() => {
    if (!selectedSubmission?.id || !token || typeof window === "undefined") {
      return null;
    }
    return `${window.location.origin}/api/super-admin/kyc/${selectedSubmission.id}/image?token=${encodeURIComponent(token)}`;
  }, [selectedSubmission, token]);

  const stats = useMemo(() => ({
    pending: submissions.filter((entry) => entry.status === "pending").length,
    approved: submissions.filter((entry) => entry.status === "approved").length,
    resubmit: submissions.filter((entry) => entry.status === "failed").length,
  }), [submissions]);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const response = await superAdminApi.getKycSubmissions({
        status: statusFilter || undefined,
        search: search.trim() || undefined,
      });
      setSubmissions(response.data?.submissions || []);
    } catch (error: any) {
      toast({
        title: "Unable to load KYC submissions",
        description: error?.response?.data?.error || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSubmissions();
  }, [statusFilter]);

  const handleApprove = async (submission: KycSubmission) => {
    setActionLoading(submission.id);
    try {
      await superAdminApi.approveKyc(submission.id);
      toast({ title: "KYC approved" });
      await loadSubmissions();
    } catch (error: any) {
      toast({
        title: "Unable to approve KYC",
        description: error?.response?.data?.error || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const openResubmitDialog = (submission: KycSubmission) => {
    setSelectedSubmission(submission);
    setAdminNotes(submission.admin_notes || "");
    setResubmitDialogOpen(true);
  };

  const handleManualReview = async (submission: KycSubmission) => {
    if (!submission.id) return;
    setActionLoading(submission.id);
    try {
      await superAdminApi.moveKycToManualReview(submission.id, { admin_notes: submission.admin_notes || undefined });
      toast({ title: "KYC moved to manual review" });
      await loadSubmissions();
    } catch (error: any) {
      toast({
        title: "Unable to update KYC",
        description: error?.response?.data?.error || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestResubmission = async () => {
    if (!selectedSubmission) {
      return;
    }

    setActionLoading(selectedSubmission.id);
    try {
      await superAdminApi.requestKycResubmission(selectedSubmission.id, {
        admin_notes: adminNotes.trim(),
      });
      toast({ title: "Resubmission requested" });
      setResubmitDialogOpen(false);
      setAdminNotes("");
      await loadSubmissions();
    } catch (error: any) {
      toast({
        title: "Unable to update KYC",
        description: error?.response?.data?.error || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <SuperAdminLayout
      title="KYC Verification"
      description="Review and approve new admin KYC submissions before first purchase"
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-amber-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-emerald-600">{stats.approved}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Resubmit Required</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-orange-600">{stats.resubmit}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>KYC Queue</CardTitle>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-[220px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name or email"
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value || "all"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Button variant="outline" onClick={loadSubmissions} disabled={loading}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Admin Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-500">
                      <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" />
                      Loading KYC submissions...
                    </TableCell>
                  </TableRow>
                ) : submissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-500">
                      No KYC submissions found.
                    </TableCell>
                  </TableRow>
                ) : submissions.map((submission) => (
                  <TableRow key={`${submission.user_id}-${submission.id || "no-record"}`}>
                    <TableCell>
                      <div className="font-medium text-slate-900">{submission.user_name}</div>
                      <div className="text-sm text-slate-500">{submission.email}</div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{formatDate(submission.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusBadgeClass(submission.status)}>
                        {submission.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[280px] text-sm text-slate-600">
                      {submission.admin_notes || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSubmission(submission);
                            setImageDialogOpen(true);
                          }}
                          disabled={!submission.id}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => void handleApprove(submission)}
                          disabled={!submission.id || actionLoading === submission.user_id || submission.status === "approved" || submission.status === "not_started"}
                          className="bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          {actionLoading === submission.user_id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openResubmitDialog(submission)}
                          disabled={!submission.id || actionLoading === submission.user_id || submission.status === "not_started"}
                        >
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          Request Resubmission
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleManualReview(submission)}
                          disabled={!submission.id || actionLoading === submission.id || submission.status === "not_started" || submission.status === "approved"}
                        >
                          {actionLoading === submission.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Manual Review
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedSubmission?.user_name}</DialogTitle>
            <DialogDescription>{selectedSubmission?.email}</DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            {imageUrl ? (
              <img src={imageUrl} alt="KYC submission" className="max-h-[75vh] w-full object-contain" />
            ) : (
              <div className="flex h-72 items-center justify-center text-sm text-slate-500">Image unavailable.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={resubmitDialogOpen} onOpenChange={setResubmitDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Request KYC Resubmission</DialogTitle>
            <DialogDescription>
              Add notes so the admin knows what to fix before submitting again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="kyc-admin-notes">Admin Notes</Label>
            <Textarea
              id="kyc-admin-notes"
              value={adminNotes}
              onChange={(event) => setAdminNotes(event.target.value)}
              placeholder="Example: Please retake the image with your face and ID more clearly visible."
              rows={5}
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setResubmitDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleRequestResubmission()} disabled={!selectedSubmission || !selectedSubmission.id || actionLoading === selectedSubmission.user_id}>
              {selectedSubmission && actionLoading === selectedSubmission.user_id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save and Notify User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}
