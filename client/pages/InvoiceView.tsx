import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Download, Printer, Share2, Loader2, CheckCircle, AlertCircle, CreditCard, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LineItem {
  description?: string;
  quantity: number;
  unit_price: number;
}

interface InvoiceData {
  invoice_number: string;
  recipient_name?: string;
  recipient_email?: string;
  currency: string;
  subtotal: number | string;
  tax: number | string;
  total: number | string;
  amount_paid: number | string;
  balance_due: number | string;
  status: string;
  issued_date: string;
  due_date?: string;
  line_items: LineItem[];
  test_mode_enabled?: boolean;
  sender?: {
    email?: string | null;
    company_name?: string | null;
    logo_url?: string | null;
  };
  from_email?: string | null;
  from_company_name?: string | null;
  from_logo_url?: string | null;
}

const InvoiceView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [paying, setPaying] = useState(false);
  const [ccNumber, setCcNumber] = useState<string>('');
  const [ccExp, setCcExp] = useState<string>('');
  const [cvv, setCvv] = useState<string>('');
  const [declineMessage, setDeclineMessage] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const { toast } = useToast();

  const currencyCode = useMemo(() => {
    // Try to infer a valid ISO currency code, fall back to USD
    const c = invoice?.currency?.toUpperCase?.() || 'USD';
    // Simple validation: 3-letter alpha code
    return /^[A-Z]{3}$/.test(c) ? c : 'USD';
  }, [invoice?.currency]);

  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode }).format(amount);
    } catch {
      return `$${amount.toFixed(2)}`;
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  };

  useEffect(() => {
    async function loadInvoice() {
      try {
        setLoading(true);
        const res = await fetch(`/api/invoices/public/${token}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to load invoice');
        setInvoice(json.data as InvoiceData);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    }
    if (token) loadInvoice();
  }, [token]);

  // Ensure hooks run consistently by computing normalized values and funding breakdowns
  // before any conditional early returns.
  const toNumber = (n: any): number => {
    if (typeof n === 'number') return n;
    const parsed = Number(n);
    return isNaN(parsed) ? 0 : parsed;
  };

  const normalized = useMemo(() => {
    if (!invoice) {
      return {
        invoice_number: '',
        recipient_name: undefined,
        recipient_email: undefined,
        currency: 'USD',
        subtotal: 0,
        tax: 0,
        total: 0,
        amount_paid: 0,
        balance_due: 0,
        status: '',
        issued_date: '',
        due_date: undefined,
        line_items: [],
      } as InvoiceData;
    }
    return {
      ...invoice,
      subtotal: toNumber(invoice.subtotal),
      tax: toNumber(invoice.tax),
      total: toNumber(invoice.total),
      amount_paid: toNumber(invoice.amount_paid),
      balance_due:
        (invoice as any).balance_due !== undefined
          ? toNumber((invoice as any).balance_due)
          : undefined,
      line_items: (invoice.line_items || []).map((li) => ({
        ...li,
        quantity: toNumber(li.quantity),
        unit_price: toNumber(li.unit_price),
      })),
    } as InvoiceData;
  }, [invoice]);

  // Branding derived from server response with sensible fallbacks
  const brand = useMemo(() => {
    const name = (invoice?.sender?.company_name || invoice?.from_company_name || 'Score Machine').trim();
    const email = (invoice?.sender?.email || invoice?.from_email || 'support@scoremachine.com').trim();
    const logo = invoice?.sender?.logo_url || invoice?.from_logo_url || '/image.png';
    return { name, email, logo };
  }, [invoice?.sender, invoice?.from_company_name, invoice?.from_email, invoice?.from_logo_url]);

  // Attempt to parse funding-related information from line item descriptions
  type FundingItem = {
    card: string;
    approved: number;
    adminFeePercent: number;
    adminFeeAmount: number;
  };

  const parseCurrencyToNumber = (raw: string): number => {
    try {
      const cleaned = raw.replace(/[^0-9.\-]/g, '');
      const n = Number(cleaned);
      return isNaN(n) ? 0 : n;
    } catch {
      return 0;
    }
  };

  const fundingItems = useMemo<FundingItem[]>(() => {
    const items: FundingItem[] = [];
    (normalized.line_items || []).forEach((li) => {
      const d = (li.description || '').trim();
      if (!d) return;

      // Strategy 1: JSON in description
      let parsed: any = null;
      if (d.startsWith('{') && d.endsWith('}')) {
        try {
          parsed = JSON.parse(d);
        } catch {
          parsed = null;
        }
      }
      if (parsed && (parsed.card || parsed.card_name) && (parsed.approved || parsed.funding || parsed.amount)) {
        const card = String(parsed.card || parsed.card_name || 'Card');
        const approved = parseCurrencyToNumber(String(parsed.approved ?? parsed.funding ?? parsed.amount));
        const adminFeePercent = Number(parsed.adminFeePercent ?? parsed.admin_fee_percent ?? 0) || 0;
        const adminFeeAmount = approved * (adminFeePercent / 100);
        items.push({ card, approved, adminFeePercent, adminFeeAmount });
        return;
      }

      // Strategy 2: Text format e.g. "Card: Chase Ink | Approved: $12,000 | Admin Fee: 12%"
      const cardMatch = d.match(/Card\s*[:\-]\s*([^|•\-]+)(?:[|•\-]|$)/i);
      const approvedMatch = d.match(/(Approved|Funding Amount|Funding|Amount)\s*[:\-]?\s*\$?([0-9,]+(?:\.[0-9]+)?)/i);
      const feeMatch = d.match(/Admin Fee\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*%/i);

      if (cardMatch && approvedMatch && feeMatch) {
        const card = cardMatch[1].trim();
        const approved = parseCurrencyToNumber(approvedMatch[2]);
        const adminFeePercent = Number(feeMatch[1]);
        const adminFeeAmount = approved * (adminFeePercent / 100);
        items.push({ card, approved, adminFeePercent, adminFeeAmount });
        return;
      }

      // Strategy 3: If description includes card name and unit_price seems to be fee, infer fee % from text
      const feePercentInline = d.match(/([0-9]+(?:\.[0-9]+)?)\s*%/);
      const possiblePercent = feePercentInline ? Number(feePercentInline[1]) : undefined;
      if (possiblePercent !== undefined && li.unit_price > 0) {
        // We know fee amount (unit_price * quantity). If percent is present, infer approved funding.
        const feeAmount = (li.unit_price || 0) * (li.quantity || 1);
        const approved = possiblePercent > 0 ? feeAmount / (possiblePercent / 100) : 0;
        items.push({
          card: d.replace(/\s*[-|•].*$/, '').slice(0, 60),
          approved,
          adminFeePercent: possiblePercent,
          adminFeeAmount: feeAmount,
        });
      }
    });
    return items;
  }, [normalized.line_items]);

  const fundingSummary = useMemo(() => {
    const totalFunding = fundingItems.reduce((sum, i) => sum + (i.approved || 0), 0);
    const totalAdminFees = fundingItems.reduce((sum, i) => sum + (i.adminFeeAmount || 0), 0);
    return { totalFunding, totalAdminFees };
  }, [fundingItems]);

  const handlePay = async () => {
    if (!token || paying) return;
    try {
      setPaying(true);
      setDeclineMessage(null);
      // In test mode, send raw test card values; otherwise require a secure payment token.
      if (!invoice?.test_mode_enabled) {
        setPaying(false);
        toast({
          title: 'Payment method required',
          description: 'Please use the secure payment form to provide card details.',
          variant: 'destructive',
        });
        return;
      }

      const payload = {
        ccnumber: (ccNumber || '4111111111111111').replace(/\s+/g, ''),
        ccexp: (ccExp || '1225').replace(/\D/g, ''),
        cvv: cvv || '123',
      };

      const res = await fetch(`/api/invoices/public/${token}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        const msg = json.error || 'Payment declined';
        setDeclineMessage(String(msg));
        throw new Error(msg);
      }
      // Refresh invoice after payment
      const refreshed = await fetch(`/api/invoices/public/${token}`);
      const data = await refreshed.json();
      setInvoice(data.data as InvoiceData);
      toast({ title: 'Payment successful', description: 'Thank you! Your invoice has been paid.' });
    } catch (err: any) {
      setError(err.message || 'Payment failed');
      toast({ title: 'Payment failed', description: err.message || 'Something went wrong.', duration: 4000 });
    } finally {
      setPaying(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Link copied', description: 'Invoice URL copied to clipboard.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Unable to copy invoice link.', duration: 4000 });
    }
  };

  const handlePayNowClick = async () => {
    // First click reveals card fields (test mode). Second click submits payment.
    if (!invoice?.test_mode_enabled) {
      toast({
        title: 'Secure payment required',
        description: 'This invoice requires our hosted secure form. Please contact support.',
        variant: 'destructive',
      });
      return;
    }
    if (!showPaymentForm) {
      setShowPaymentForm(true);
      setDeclineMessage(null);
      setTimeout(() => {
        const el = document.getElementById('payment-form');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }
    await handlePay();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading invoice...</div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">{error || 'Invoice not found'}</div>
      </div>
    );
  }


  const due =
    normalized.balance_due !== undefined
      ? normalized.balance_due
      : normalized.total - (normalized.amount_paid || 0);
  const isPaid = invoice.status === 'paid';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white print:bg-white">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 print:mb-4 rounded-xl border bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 p-4">
          <div>
            <div className="flex items-center gap-3">
              {brand.logo ? (
                <img src={brand.logo} alt={brand.name} className="max-h-12 w-auto" />
              ) : (
                <div className="px-3 py-2 rounded-lg bg-black text-white flex items-center justify-center font-bold">SM</div>
              )}
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Invoice</h1>
                <p className="text-sm text-muted-foreground">#{invoice.invoice_number}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {invoice.status === 'paid' ? (
                <Badge className="bg-green-600 text-white"><CheckCircle className="mr-1 h-4 w-4" /> Paid</Badge>
              ) : (
                <Badge variant="outline" className="border-amber-500 text-amber-700"><AlertCircle className="mr-1 h-4 w-4" /> Unpaid</Badge>
              )}
              <span className="text-xs text-muted-foreground">Issued {formatDate(invoice.issued_date)}{invoice.due_date ? ` · Due ${formatDate(invoice.due_date)}` : ''}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 print:hidden">
            <Button variant="ghost" onClick={() => history.back()} className="hidden md:flex" aria-label="Go back">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button variant="outline" onClick={handleCopyLink} aria-label="Copy link">
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
            <Button variant="outline" onClick={handlePrint} aria-label="Print invoice">
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            {/* Keep header lean; full payment form shown below */}
          </div>
        </div>

        {/* Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 print:hidden">
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-2xl font-semibold">{formatCurrency(normalized.total)}</div>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="text-xs text-muted-foreground">Paid</div>
            <div className="text-2xl font-semibold">{formatCurrency(normalized.amount_paid || 0)}</div>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="text-xs text-muted-foreground">Balance Due</div>
            <div className="text-2xl font-semibold">{formatCurrency(Number(due))}</div>
          </div>
        </div>

        {/* Body */}
        <Card className="shadow-sm print:shadow-none print:border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Bill From */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">From</h3>
                <div className="mt-2 text-sm">
                  <p className="font-medium">{brand.name}</p>
                  <p className="text-muted-foreground">{brand.email}</p>
                </div>
              </div>
              {/* Bill To */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Bill To</h3>
                <div className="mt-2 text-sm">
                  <p className="font-medium">{invoice.recipient_name || 'Recipient'}</p>
                  {invoice.recipient_email && (
                    <p className="text-muted-foreground">{invoice.recipient_email}</p>
                  )}
                </div>
              </div>
              {/* Invoice Meta */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Summary</h3>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span className="font-medium">{formatCurrency(normalized.subtotal)}</span></div>
                  <div className="flex justify-between"><span>Tax</span><span className="font-medium">{formatCurrency(normalized.tax)}</span></div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-base"><span>Total</span><span className="font-semibold">{formatCurrency(normalized.total)}</span></div>
                  <div className="flex justify-between"><span>Paid</span><span className="font-medium">{formatCurrency(normalized.amount_paid || 0)}</span></div>
                  <div className="flex justify-between"><span>Due</span><span className="font-medium">{formatCurrency(Number(due))}</span></div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              {fundingItems.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Funding Charges</h3>
                    <Badge variant="outline" className="text-xs">Admin Fee Breakdown</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <div className="text-muted-foreground">Total Funding</div>
                      <div className="font-medium">{formatCurrency(fundingSummary.totalFunding)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-muted-foreground">Total Admin Fees</div>
                      <div className="font-medium">{formatCurrency(fundingSummary.totalAdminFees)}</div>
                    </div>
                  </div>
                  <div className="rounded-xl border overflow-hidden shadow-sm">
                    <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted text-sm font-semibold">
                      <div className="col-span-6">Card</div>
                      <div className="col-span-2 text-right">Funding Amount</div>
                      <div className="col-span-2 text-right">Admin Fee (%)</div>
                      <div className="col-span-2 text-right">Admin Fee Amount</div>
                    </div>
                    {fundingItems.map((fi, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 px-4 py-2 border-t text-sm odd:bg-muted/20">
                        <div className="col-span-6">{fi.card}</div>
                        <div className="col-span-2 text-right">{formatCurrency(fi.approved)}</div>
                        <div className="col-span-2 text-right">{fi.adminFeePercent}%</div>
                        <div className="col-span-2 text-right">{formatCurrency(fi.adminFeeAmount)}</div>
                      </div>
                    ))}
                    <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/60 border-t text-sm font-semibold">
                      <div className="col-span-10">Total Admin Fees Due</div>
                      <div className="col-span-2 text-right">{formatCurrency(fundingSummary.totalAdminFees)}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">Items reflect card funding and admin fees for transparency.</div>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Items</h3>
                  <div className="overflow-hidden rounded-xl border shadow-sm">
                    <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted text-sm font-semibold">
                      <div className="col-span-6">Description</div>
                      <div className="col-span-2 text-right">Qty</div>
                      <div className="col-span-2 text-right">Unit Price</div>
                      <div className="col-span-2 text-right">Amount</div>
                    </div>
                    {normalized.line_items?.length ? (
                      normalized.line_items.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 px-4 py-2 border-t text-sm odd:bg-muted/20">
                          <div className="col-span-6">{item.description || 'Item'}</div>
                          <div className="col-span-2 text-right">{item.quantity}</div>
                          <div className="col-span-2 text-right">{formatCurrency(item.unit_price)}</div>
                          <div className="col-span-2 text-right">{formatCurrency(item.quantity * item.unit_price)}</div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-sm text-muted-foreground">No line items</div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Payment CTA */}
            {invoice.status !== 'paid' && (
              <div className="mt-8 print:hidden">
                <div className="rounded-xl border bg-gradient-to-r from-emerald-50 to-teal-50 p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Balance Due</div>
                    <div className="text-2xl font-semibold">{formatCurrency(Number(due))}</div>
                  </div>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handlePayNowClick} disabled={paying} aria-label={showPaymentForm ? 'Submit payment' : 'Reveal payment form'}>
                    {showPaymentForm ? (<><ShieldCheck className="mr-2 h-4 w-4" /> Submit Payment</>) : (<><CreditCard className="mr-2 h-4 w-4" /> Pay Now</>)}
                  </Button>
                </div>

                {showPaymentForm && invoice.test_mode_enabled && (
                  <div id="payment-form" className="mt-4 border rounded-xl p-4 bg-white shadow-sm">
                    <h3 className="text-sm font-medium mb-3 flex items-center"><CreditCard className="mr-2 h-4 w-4" /> Card Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cc-number">Card Number</Label>
                        <Input id="cc-number" placeholder="4111 1111 1111 1111" value={ccNumber} onChange={(e) => setCcNumber(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cc-exp">Expiry (MMYY)</Label>
                        <Input id="cc-exp" placeholder="1225" value={ccExp} onChange={(e) => setCcExp(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvv">CVV</Label>
                        <Input id="cvv" placeholder="123" value={cvv} onChange={(e) => setCvv(e.target.value)} />
                      </div>
                    </div>
                    {declineMessage && (
                      <div className="mt-3 text-sm text-red-600">
                        <AlertCircle className="inline h-4 w-4 mr-1" /> {declineMessage}
                      </div>
                    )}
                    <div className="mt-4">
                      <Button onClick={handlePay} disabled={paying} aria-label="Pay invoice">
                        {paying ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing</>) : (<>Submit Payment</>)}
                      </Button>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">Use test card values like 4111 1111 1111 1111, 1225, 123.</div>
                  </div>
                )}
              </div>
            )}

            {/* Footer Note */}
            <div className="mt-6 text-xs text-muted-foreground">
              <p>Thank you for your business. For questions, contact {brand.email}.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InvoiceView;