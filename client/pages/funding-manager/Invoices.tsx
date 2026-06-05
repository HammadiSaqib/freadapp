import React, { useEffect, useMemo, useState } from "react";
import FundingManagerLayout from "@/components/FundingManagerLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { FileText, Search, RefreshCw, Eye, Copy, AlertCircle, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FundingInvoice {
  id?: number | string;
  invoice_number: string;
  recipient_name?: string;
  recipient_email?: string;
  currency?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  amount_paid?: number;
  balance_due?: number;
  status: string; // 'paid' | 'unpaid' | 'overdue' | other
  issued_date: string; // ISO
  due_date?: string; // ISO
  token?: string; // public token for viewing
  public_url?: string; // full URL if provided by API
}

const formatDate = (iso?: string) => {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
};

const formatCurrency = (amount?: number, currency = "USD") => {
  if (typeof amount !== "number") return "-";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
};

export default function FundingManagerInvoices() {
  const [invoices, setInvoices] = useState<FundingInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("auth_token");
      const resp = await fetch("/api/invoices", {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!resp.ok) {
        // Graceful fallback with mock data for development
        throw new Error(`Failed to load invoices (${resp.status})`);
      }

      const json = await resp.json();
      const list: FundingInvoice[] = (json?.data || json?.invoices || json || []).map((inv: any) => ({
        id: inv.id ?? inv.invoice_id ?? inv.invoice_number,
        invoice_number: inv.invoice_number ?? inv.number ?? "INV-0000",
        recipient_name: inv.recipient_name ?? inv.client_name ?? inv.to_name,
        recipient_email: inv.recipient_email ?? inv.client_email ?? inv.to_email,
        currency: inv.currency ?? "USD",
        subtotal: typeof inv.subtotal === "number" ? inv.subtotal : Number(inv.subtotal) || undefined,
        tax: typeof inv.tax === "number" ? inv.tax : Number(inv.tax) || undefined,
        total: typeof inv.total === "number" ? inv.total : Number(inv.total) || undefined,
        amount_paid: typeof inv.amount_paid === "number" ? inv.amount_paid : Number(inv.amount_paid) || undefined,
        balance_due: typeof inv.balance_due === "number" ? inv.balance_due : Number(inv.balance_due) || undefined,
        status: inv.status ?? "unpaid",
        issued_date: inv.issued_date ?? inv.created_at ?? new Date().toISOString(),
        due_date: inv.due_date ?? inv.due_on,
        token: inv.token ?? inv.public_token,
        public_url: inv.public_url ?? inv.url,
      }));
      setInvoices(list);
    } catch (err: any) {
      console.error("Invoice fetch error:", err);
      setError(err?.message || "Unable to load invoices");
      // Fallback mock data to demonstrate UI
      setInvoices([
        {
          id: 1,
          invoice_number: "INV-1024",
          recipient_name: "Jane Client",
          recipient_email: "jane@example.com",
          currency: "USD",
          subtotal: 1200,
          tax: 0,
          total: 1200,
          amount_paid: 0,
          balance_due: 1200,
          status: "unpaid",
          issued_date: new Date().toISOString(),
          due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
          token: "demo-token-1024",
          public_url: undefined,
        },
        {
          id: 2,
          invoice_number: "INV-1025",
          recipient_name: "John Client",
          recipient_email: "john@example.com",
          currency: "USD",
          subtotal: 800,
          tax: 0,
          total: 800,
          amount_paid: 800,
          balance_due: 0,
          status: "paid",
          issued_date: new Date(Date.now() - 5 * 86400000).toISOString(),
          due_date: new Date(Date.now() - 2 * 86400000).toISOString(),
          token: "demo-token-1025",
          public_url: undefined,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        !search ||
        inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
        (inv.recipient_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (inv.recipient_email || "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, statusFilter]);

  const handleView = (inv: FundingInvoice) => {
    if (inv.token) {
      navigate(`/invoice/${inv.token}`);
    } else if (inv.public_url) {
      window.open(inv.public_url, "_blank");
    } else {
      toast({ title: "No invoice link", description: "This invoice has no public URL/token.", variant: "destructive" });
    }
  };

  const handleCopyLink = async (inv: FundingInvoice) => {
    try {
      const url = inv.public_url || (inv.token ? `${window.location.origin}/invoice/${inv.token}` : "");
      if (!url) throw new Error("No URL available to copy");
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: "Invoice URL copied to clipboard." });
    } catch (err: any) {
      toast({ title: "Copy failed", description: err?.message || "Unable to copy invoice link.", variant: "destructive" });
    }
  };

  const statusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "paid") return <Badge variant="outline" className="border-green-500 text-green-600">Paid</Badge>;
    if (s === "overdue") return <Badge variant="outline" className="border-red-500 text-red-600">Overdue</Badge>;
    return <Badge variant="outline" className="border-amber-500 text-amber-600">Unpaid</Badge>;
  };

  return (
    <FundingManagerLayout title="Funding Invoices" description="Admin-created invoices for client funding charges">
      <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="gradient-text-primary flex items-center">
                <FileText className="h-5 w-5 mr-2" /> Invoices
              </CardTitle>
              <CardDescription>View funding charge invoices and their status</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchInvoices} disabled={loading}>
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-3">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by invoice #, client name, or email"
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/40">
                <tr>
                  <th className="text-left p-3 font-medium">Invoice #</th>
                  <th className="text-left p-3 font-medium">Client</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-right p-3 font-medium">Issued</th>
                  <th className="text-right p-3 font-medium">Due</th>
                  <th className="text-right p-3 font-medium">Total</th>
                  <th className="text-right p-3 font-medium">Paid</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={String(inv.id ?? inv.invoice_number)} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="p-3 font-medium">{inv.invoice_number}</td>
                    <td className="p-3">{inv.recipient_name || "-"}</td>
                    <td className="p-3">{inv.recipient_email || "-"}</td>
                    <td className="p-3 text-right">{formatDate(inv.issued_date)}</td>
                    <td className="p-3 text-right">{formatDate(inv.due_date)}</td>
                    <td className="p-3 text-right">{formatCurrency(inv.total, inv.currency)}</td>
                    <td className="p-3 text-right">{formatCurrency(inv.amount_paid, inv.currency)}</td>
                    <td className="p-3 text-center">{statusBadge(inv.status)}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleView(inv)}>
                          <Eye className="h-4 w-4 mr-1" /> View
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleCopyLink(inv)}>
                          <Copy className="h-4 w-4 mr-1" /> Copy Link
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && !loading && (
                  <tr>
                    <td className="p-4 text-center text-muted-foreground" colSpan={9}>No invoices found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" /> Loading invoices...
            </div>
          )}

          <Separator />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <span>Invoices include admin fees for approved funding charges.</span>
          </div>
        </CardContent>
      </Card>
    </FundingManagerLayout>
  );
}