import { useCallback, useEffect, useMemo, useState } from "react";
import SupportLayout from "@/components/SupportLayout";
import SuperAdminLayout from "@/components/SuperAdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Upload, Send, RefreshCw, Trash2 } from "lucide-react";
import { apiRequest, getAuthToken } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";

type Recipient = {
  id?: number;
  email: string;
  firstName?: string;
  lastName?: string;
  subscriptionStatus?: string | null;
  planName?: string | null;
  planType?: string | null;
  cancelAtPeriodEnd?: boolean;
};

const filterOptions = [
  { value: "all", label: "All Admins" },
  { value: "paid", label: "Paid Subscriptions" },
  { value: "unpaid", label: "Unpaid Admins" },
  { value: "cancelled", label: "Cancelled Subscriptions" },
];

export default function EmailCampaign() {
  const { toast } = useToast();
  const { userProfile } = useAuthContext();
  const role = userProfile?.role || localStorage.getItem("userRole");
  const Layout = role === "super_admin" ? SuperAdminLayout : SupportLayout;

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [importedEmails, setImportedEmails] = useState<string[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  const combinedRecipients = useMemo(() => {
    const existing = new Set(recipients.map((r) => r.email.toLowerCase()));
    const imported = importedEmails
      .filter((email) => !existing.has(email.toLowerCase()))
      .map((email) => ({
        email,
        subscriptionStatus: "imported",
      }));
    return [...recipients, ...imported];
  }, [recipients, importedEmails]);

  const loadRecipients = useCallback(async () => {
    setLoadingRecipients(true);
    try {
      const query = new URLSearchParams({ filter });
      if (search.trim()) {
        query.set("search", search.trim());
      }
      const data = await apiRequest(`/api/email-campaign/recipients?${query.toString()}`);
      const rows = Array.isArray(data?.data) ? data.data : [];
      const normalized = rows.map((row: any) => ({
        id: row.id,
        email: String(row.email || "").toLowerCase(),
        firstName: row.firstName,
        lastName: row.lastName,
        subscriptionStatus: row.subscriptionStatus || null,
        planName: row.planName || null,
        planType: row.planType || null,
        cancelAtPeriodEnd: !!row.cancelAtPeriodEnd,
      }));
      setRecipients(normalized);
      setSelectedEmails([]);
    } catch (error: any) {
      toast({
        title: "Failed to load recipients",
        description: error?.message || "Unable to fetch recipients",
        variant: "destructive",
      });
    } finally {
      setLoadingRecipients(false);
    }
  }, [filter, search, toast]);

  useEffect(() => {
    loadRecipients();
  }, [loadRecipients]);

  const handleSelectAll = () => {
    setSelectedEmails(combinedRecipients.map((recipient) => recipient.email));
  };

  const handleClearSelection = () => {
    setSelectedEmails([]);
  };

  const toggleRecipient = (email: string) => {
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((item) => item !== email) : [...prev, email]
    );
  };

  const handleImportCsv = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = getAuthToken();
      const res = await fetch("/api/email-campaign/import", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to import CSV");
      }
      const data = await res.json();
      const emails = Array.isArray(data?.emails) ? data.emails : [];
      const next = Array.from(new Set([...importedEmails, ...emails.map((email: string) => email.toLowerCase())]));
      setImportedEmails(next);
      toast({
        title: "Email list imported",
        description: `${emails.length} emails ready to select`,
      });
    } catch (error: any) {
      toast({
        title: "CSV import failed",
        description: error?.message || "Unable to import CSV",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !html.trim()) {
      toast({
        title: "Missing email content",
        description: "Subject and HTML template are required",
        variant: "destructive",
      });
      return;
    }
    if (selectedEmails.length === 0) {
      toast({
        title: "No recipients selected",
        description: "Select at least one recipient to send",
        variant: "destructive",
      });
      return;
    }
    setSending(true);
    try {
      const response = await apiRequest("/api/email-campaign/send", {
        method: "POST",
        body: JSON.stringify({
          subject,
          html,
          recipients: selectedEmails,
        }),
      });
      const summary = response?.data || {};
      toast({
        title: "Email campaign sent",
        description: `Sent: ${summary.sent || 0} • Failed: ${summary.failed || 0}`,
      });
    } catch (error: any) {
      toast({
        title: "Send failed",
        description: error?.message || "Unable to send emails",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout title="Email Campaign" description="Send HTML email campaigns to admins and imported lists">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Recipients</CardTitle>
            <CardDescription>Filter admins or import a CSV list</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid gap-2">
                <Label>Filter</Label>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Select filter" />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="recipientSearch">Search</Label>
                <Input
                  id="recipientSearch"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name or email"
                  className="w-[260px]"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" onClick={loadRecipients} disabled={loadingRecipients} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  {loadingRecipients ? "Loading..." : "Refresh"}
                </Button>
                <Label className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImportCsv(file);
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                  <Button variant="outline" disabled={uploading} className="gap-2">
                    <Upload className="h-4 w-4" />
                    {uploading ? "Importing..." : "Import CSV"}
                  </Button>
                </Label>
                {importedEmails.length > 0 && (
                  <Button
                    variant="ghost"
                    className="gap-2"
                    onClick={() => {
                      setImportedEmails([]);
                      setSelectedEmails([]);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear Imported
                  </Button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" onClick={handleSelectAll} disabled={combinedRecipients.length === 0}>
                Select All
              </Button>
              <Button variant="ghost" onClick={handleClearSelection} disabled={selectedEmails.length === 0}>
                Clear Selection
              </Button>
              <Badge variant="outline">Selected: {selectedEmails.length}</Badge>
              <Badge variant="outline">Total: {combinedRecipients.length}</Badge>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Plan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {combinedRecipients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                        No recipients available
                      </TableCell>
                    </TableRow>
                  ) : (
                    combinedRecipients.map((recipient) => {
                      const fullName = [recipient.firstName, recipient.lastName].filter(Boolean).join(" ");
                      const displayStatus =
                        recipient.subscriptionStatus === "imported" ? "Imported" : recipient.subscriptionStatus || "none";
                      return (
                        <TableRow key={recipient.email}>
                          <TableCell>
                            <Checkbox
                              checked={selectedEmails.includes(recipient.email)}
                              onCheckedChange={() => toggleRecipient(recipient.email)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{recipient.email}</TableCell>
                          <TableCell>{fullName || "—"}</TableCell>
                          <TableCell className="capitalize">{displayStatus}</TableCell>
                          <TableCell>
                            {recipient.planName ? `${recipient.planName} (${recipient.planType || "plan"})` : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Content</CardTitle>
            <CardDescription>Paste your HTML template and subject line</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Campaign subject" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="html">HTML Template</Label>
              <Textarea
                id="html"
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                placeholder="<html>Paste your email template here</html>"
                className="min-h-[240px]"
              />
            </div>
            <div className="flex items-center justify-end">
              <Button onClick={handleSend} disabled={sending} className="gap-2">
                <Send className="h-4 w-4" />
                {sending ? "Sending..." : "Send Campaign"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
