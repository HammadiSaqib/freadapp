import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { api, superAdminApi } from '@/lib/api';
import { format } from 'date-fns';
import { Download, RefreshCw, Calendar, DollarSign, Users, Mail, Phone, Building, TrendingUp, CreditCard, Activity, XCircle, AlertTriangle, BarChart2, Clock, Pencil, Trash2, Check, X } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { aggregateMonthlyEarnings, mergeReferralsWithCommissions, filterReferrals } from '@/utils/affiliateProfile';

interface Affiliate {
  id: number;
  admin_id: number;
  email: string;
  first_name: string;
  last_name: string;
  company_name?: string;
  phone?: string;
  commission_rate: number;
  total_earnings: number;
  total_referrals: number;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  email_verified: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

interface ReferralItem {
  id: number;
  referred_user_id: number | null;
  referred_user_email?: string | null;
  referred_user_first_name?: string | null;
  referred_user_last_name?: string | null;
  commission_amount?: number | null;
  commission_status?: string | null;
  referral_date?: string | null;
  conversion_date?: string | null;
  notes?: string | null;
}

interface CommissionItem {
  id: number;
  affiliate_id: number;
  customer_name: string;
  customer_email: string;
  order_value: number;
  commission_rate: number;
  commission_amount: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  tier: string;
  product: string;
  order_date: string;
  payment_date?: string;
}

interface ChildReferral {
  id: string | number;
  childAffiliateId?: number;
  childAffiliateName: string;
  customerName: string;
  customerEmail: string;
  product: string;
  orderValue: number;
  commissionRate: number;
  commissionAmount: number;
  childCommissionRate?: number;
  childCommissionAmount?: number;
  childOrderValue?: number;
  status: string;
  orderDate: string;
  paymentDate?: string;
  level: number;
}

interface AffiliateStats {
  totalAllTimeReferrals: number;
  activeClients: number;
  unpaidClients: number;
  cancelledClients: number;
  pendingClients: number;
  monthlyEarnings: number;
  allTimeEarnings: number;
  totalPayouts: number;
  pendingPayouts: number;
  lastPayoutDate: string | null;
  currentMRR: number;
}

interface PaymentHistoryItem {
  id: number;
  affiliate_id: number;
  amount: number;
  transaction_id: string;
  payment_method: string;
  status: string;
  payment_date: string;
  notes?: string;
  created_at: string;
}

interface ProfileReferralRow {
  id: string | number;
  referred_user_id?: number | null;
  referred_user_email?: string | null;
  referred_user_first_name?: string | null;
  referred_user_last_name?: string | null;
  plan_name?: string | null;
  package_name?: string | null;
  plan_type?: string | null;
  purchase_type?: string | null;
  package_price?: number | null;
  commission_earned?: number | null;
  referral_date?: string | null;
  conversion_date?: string | null;
  last_purchase_date?: string | null;
  payment_state?: string | null;
  plan_price?: number | null;
  is_stripe_paid?: boolean;
  last_payment_date?: string | null;
  stripe_transaction_id?: string | null;
}

interface Filters {
  packageType: string;
  dateFrom?: string;
  dateTo?: string;
}

type MonthlyPoint = { month: string; amount: number };

function toCsv(filename: string, rows: any[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')].concat(
    rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(','))
  );
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getChildStatusColor(status: string) {
  const s = String(status || '').toLowerCase();
  if (s === 'paid') return 'bg-green-100 text-green-800';
  if (s === 'approved') return 'bg-blue-100 text-blue-800';
  if (s === 'rejected') return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
}

function formatChildStatusLabel(status: string) {
  const s = String(status || '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const SuperAdminAffiliateProfile: React.FC = () => {
  const { id: routeId, affiliateId: routeAffiliateId } = useParams<{ id?: string; affiliateId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const affiliateId = useMemo(() => {
    const pathMatch = location.pathname.match(/\/affiliates\/([^/?#]+)/i);
    const rawValue = (routeId ?? routeAffiliateId ?? pathMatch?.[1] ?? '').trim();
    if (!rawValue) {
      return '';
    }

    const cleanedValue = rawValue.replace(/^AFF-/i, '').trim();
    if (!/^\d+$/.test(cleanedValue)) {
      return '';
    }

    return cleanedValue;
  }, [location.pathname, routeAffiliateId, routeId]);
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [commissions, setCommissions] = useState<CommissionItem[]>([]);
  const [profileReferrals, setProfileReferrals] = useState<ProfileReferralRow[]>([]);
  const [affiliateStats, setAffiliateStats] = useState<AffiliateStats | null>(null);
  const [childReferrals, setChildReferrals] = useState<ChildReferral[]>([]);
  const [childSummary, setChildSummary] = useState<{ totalReferrals: number; totalCommission: number }>({ totalReferrals: 0, totalCommission: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ packageType: 'all' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [lastPayout, setLastPayout] = useState<{ isPaid: boolean; amount: number; commission_month: string; payout_month: string; invoice_url?: string; payslip_url?: string } | null>(null);
  const [paying, setPaying] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [editingPaymentAmount, setEditingPaymentAmount] = useState(false);
  const [customPaymentAmount, setCustomPaymentAmount] = useState('');
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState('');
  const [editPaymentNotes, setEditPaymentNotes] = useState('');
  const [savingPaymentEdit, setSavingPaymentEdit] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(null);

  useEffect(() => {
    if (!affiliateId) {
      setAffiliate(null);
      setReferrals([]);
      setCommissions([]);
      setProfileReferrals([]);
      setAffiliateStats(null);
      setChildReferrals([]);
      setChildSummary({ totalReferrals: 0, totalCommission: 0 });
      setLastPayout(null);
      setPaymentHistory([]);
      setError('Invalid affiliate ID');
      setLoading(false);
      return;
    }

    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [affResp, refs, earnResp, commResp, statsResp, dashboardRefsResp, childResp, payHistResp] = await Promise.all([
          superAdminApi.getAffiliates(),
          api.get(`/api/affiliate-management/${affiliateId}/referrals`),
          api.get(`/api/affiliate-management/${affiliateId}/earnings/monthly`),
          superAdminApi.getCommissionHistory({ affiliate_id: affiliateId }),
          api.get(`/api/affiliate-management/${affiliateId}/dashboard-summary`).catch(() => ({ data: null })),
          api.get(`/api/affiliate-management/${affiliateId}/dashboard-referrals`).catch(() => ({ data: null })),
          api.get(`/api/affiliate-management/${affiliateId}/referrals/child`).catch(() => ({ data: null })),
          api.get(`/api/commission-payments/affiliate/${affiliateId}`).catch(() => ({ data: null })),
        ]);

        const list: Affiliate[] = affResp.data?.data || affResp.data || [];
        const found = list.find((a) => String(a.id) === affiliateId);
        if (mounted) setAffiliate(found || null);

        const refData: ReferralItem[] = refs.data?.data || refs.data || [];
        if (mounted) setReferrals(refData);

        const commData: CommissionItem[] = Array.isArray(commResp.data?.data)
          ? commResp.data.data
          : Array.isArray(commResp.data)
          ? commResp.data
          : [];
        if (mounted) setCommissions(commData);

        const dashboardReferralData = Array.isArray(dashboardRefsResp.data?.data) ? dashboardRefsResp.data.data : [];
        if (mounted) {
          setProfileReferrals(
            dashboardReferralData.map((row: any) => {
              const fullName = String(row.customerName || '').trim();
              const nameParts = fullName ? fullName.split(/\s+/) : [];
              const firstName = nameParts[0] || '';
              const lastName = nameParts.slice(1).join(' ');

              return {
                id: row.id,
                referred_user_id: row.referredUserId ?? null,
                referred_user_email: row.email || null,
                referred_user_first_name: firstName,
                referred_user_last_name: lastName,
                plan_name: row.planName || null,
                package_name: row.planName || null,
                plan_type: row.tier || null,
                purchase_type: 'Subscription',
                package_price: typeof row.planPrice === 'number' ? row.planPrice : null,
                commission_earned: typeof row.commission === 'number' ? row.commission : 0,
                referral_date: row.signupDate || null,
                conversion_date: row.conversionDate || null,
                last_purchase_date: row.lastPaymentDate || null,
                payment_state: row.status || null,
                plan_price: typeof row.planPrice === 'number' ? row.planPrice : null,
                is_stripe_paid: Boolean(row.isStripePaid),
                last_payment_date: row.lastPaymentDate || null,
                stripe_transaction_id: row.stripeTransactionId || row.transactionId || null,
              } satisfies ProfileReferralRow;
            })
          );
        }

        // Dashboard-parity summary so super-admin sees the same headline numbers as the affiliate dashboard
        const stats: AffiliateStats | null = statsResp.data?.data || null;
        if (mounted && stats) setAffiliateStats(stats);

        // Payment history for this affiliate
        if (mounted && payHistResp.data?.success) {
          setPaymentHistory(payHistResp.data.data || []);
        }

        // Child referrals
        if (mounted && childResp.data) {
          setChildReferrals(childResp.data?.data || []);
          setChildSummary(childResp.data?.summary || { totalReferrals: 0, totalCommission: 0 });
        }

        // Last month payment card ” earnings first from stats, fallback to commission scan
        const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
        const now = new Date();
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const nextPrev = new Date(now.getFullYear(), now.getMonth(), 1);
        const startPrevMonthStr = `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}-01`;
        const startThisMonthStr = `${nextPrev.getFullYear()}-${pad(nextPrev.getMonth() + 1)}-01`;

        const isInLastMonth = (d: string | undefined | null) => {
          if (!d) return false;
          const t = new Date(d);
          return t >= new Date(`${startPrevMonthStr}T00:00:00`) && t < new Date(`${startThisMonthStr}T00:00:00`);
        };
        const statusOk = (s: string | undefined | null, list: string[]) =>
          list.includes(String(s || '').toLowerCase());

        const grossFromCommissions = commData.reduce((sum, c) => {
          const ok = statusOk(c.status, ['pending', 'approved', 'paid']);
          const inRange =
            isInLastMonth(c.order_date) ||
            isInLastMonth((c as any).created_at) ||
            isInLastMonth(c.payment_date || undefined);
          return ok && inRange ? sum + Number(c.commission_amount || 0) : sum;
        }, 0);

        const grossFromReferrals = refData.reduce((sum, r) => {
          const ok = statusOk(r.commission_status, ['pending', 'approved', 'paid', 'converted']);
          const inRange =
            isInLastMonth(r.referral_date || undefined) ||
            isInLastMonth(r.conversion_date || undefined);
          return ok && inRange ? sum + Number(r.commission_amount || 0) : sum;
        }, 0);

        const gross = grossFromCommissions > 0 ? grossFromCommissions : grossFromReferrals;

        try {
          const payoutResp = await api.get(`/api/commissions/payout-status/${affiliateId}`, { params: { strict: true } });
          const d = payoutResp.data?.data || payoutResp.data || null;
          if (mounted) {
            if (d) {
              setLastPayout({
                isPaid: !!d.isPaid,
                amount: gross,
                commission_month: String(d.commission_month || ''),
                payout_month: String(d.payout_month || ''),
                invoice_url: d.invoice_url || undefined,
                payslip_url: d.payslip_url || undefined,
              });
            } else {
              setLastPayout({
                isPaid: false,
                amount: gross,
                commission_month: `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}`,
                payout_month: `${now.getFullYear()}-${pad(now.getMonth() + 1)}`,
              } as any);
            }
          }
        } catch {
          if (mounted)
            setLastPayout({
              isPaid: false,
              amount: gross,
              commission_month: `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}`,
              payout_month: `${now.getFullYear()}-${pad(now.getMonth() + 1)}`,
            } as any);
        }
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load affiliate profile');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 60000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [affiliateId]);

  const mergedReferrals = useMemo(
    () => mergeReferralsWithCommissions(referrals, commissions),
    [referrals, commissions]
  );
  const referralRowsForProfile = useMemo(
    () => (profileReferrals.length > 0 ? profileReferrals : (mergedReferrals as ProfileReferralRow[])),
    [profileReferrals, mergedReferrals]
  );
  const filteredReferrals = useMemo(
    () => filterReferrals(referralRowsForProfile as any[], filters),
    [referralRowsForProfile, filters]
  );
  const pagedReferrals = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredReferrals.slice(start, start + pageSize);
  }, [filteredReferrals, page, pageSize]);

  const monthly = useMemo(
    () => aggregateMonthlyEarnings(commissions, filters.dateFrom, filters.dateTo),
    [commissions, filters]
  );

  const packageOptions = useMemo(() => {
    const set = new Set<string>();
    referralRowsForProfile.forEach((r: any) => {
      const name = r.plan_name || r.package_name;
      if (name) set.add(name);
    });
    return Array.from(set);
  }, [referralRowsForProfile]);

  const exportEarnings = () => {
    toCsv(
      `affiliate_${affiliateId}_earnings.csv`,
      monthly.map((m) => ({ month: m.month, amount: m.amount }))
    );
  };

  const exportReferralBreakdown = () => {
    toCsv(
      `affiliate_${affiliateId}_referrals.csv`,
      referralRowsForProfile.map((r: any) => ({
        email: r.referred_user_email || '',
        name: `${r.referred_user_first_name || ''} ${r.referred_user_last_name || ''}`.trim(),
        package: r.package_name || '',
        price: r.package_price || '',
        commission: Number(r.commission_earned || 0).toFixed(2),
        referral_date: r.referral_date || '',
        conversion_date: r.conversion_date || r.last_purchase_date || '',
      }))
    );
  };

  return (
    <SuperAdminLayout title="Affiliate Profile" description="Detailed performance and referral network">
      <div className="space-y-6 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" /> Loading profile...
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
        ) : !affiliate ? (
          <div className="p-4 bg-yellow-50 text-yellow-700 rounded-md">Affiliate not found</div>
        ) : (
          <div className="space-y-6">
            {/* â”€â”€ Top row: Details + Performance + Last Month Payment â”€â”€ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Affiliate Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-lg font-semibold">
                        {affiliate.first_name.charAt(0)}{affiliate.last_name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold">{affiliate.first_name} {affiliate.last_name}</div>
                        <div className="text-sm text-muted-foreground">ID #{affiliate.id}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span className="text-sm">{affiliate.email}</span>
                    </div>
                    {affiliate.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span className="text-sm">{affiliate.phone}</span>
                      </div>
                    )}
                    {affiliate.company_name && (
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        <span className="text-sm">{affiliate.company_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">Joined {format(new Date(affiliate.created_at), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{affiliate.status}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Total Earnings</div>
                      <div className="text-xl font-semibold">${Number(affiliateStats?.allTimeEarnings ?? affiliate.total_earnings ?? 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Referrals</div>
                      <div className="text-xl font-semibold">{affiliateStats?.totalAllTimeReferrals ?? affiliate.total_referrals ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Commission Rate</div>
                      <div className="text-xl font-semibold">{affiliate.commission_rate}%</div>
                    </div>
                    <div className="col-span-3 mt-4 h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthly}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pending Payouts & Payments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Pending payout amount */}
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Pending Payouts</div>
                    <div className="text-2xl font-bold text-orange-600">${Number(affiliateStats?.pendingPayouts ?? 0).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">Awaiting payment</div>
                  </div>

                  {/* Mark as Paid with editable amount */}
                  <div className="border-t pt-3 space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Record a payment</div>
                    {editingPaymentAmount ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={customPaymentAmount}
                          onChange={(e) => setCustomPaymentAmount(e.target.value)}
                          placeholder="Enter amount"
                          className="h-9 w-32"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingPaymentAmount(false);
                            setCustomPaymentAmount('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          ${Number(customPaymentAmount || affiliateStats?.pendingPayouts || lastPayout?.amount || 0).toFixed(2)}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingPaymentAmount(true);
                            setCustomPaymentAmount(String(Number(affiliateStats?.pendingPayouts || lastPayout?.amount || 0).toFixed(2)));
                          }}
                        >
                          Edit Amount
                        </Button>
                      </div>
                    )}
                    <Button
                      disabled={paying}
                      className="w-full"
                      onClick={async () => {
                        const payAmount = Number(customPaymentAmount || affiliateStats?.pendingPayouts || lastPayout?.amount || 0);
                        if (payAmount <= 0) return;
                        try {
                          setPaying(true);
                          const txn = `AFF-${affiliateId}-${Date.now()}`;
                          const fd = new FormData();
                          fd.append('affiliate_id', affiliateId);
                          fd.append('amount', String(payAmount));
                          fd.append('transaction_id', txn);
                          fd.append('payment_method', 'manual');
                          fd.append('notes', `Manual payout by admin`);
                          await api.post('/api/commission-payments', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                          // Refresh payment history and stats
                          const [payHistResp2, statsResp2, payoutResp2] = await Promise.all([
                            api.get(`/api/commission-payments/affiliate/${affiliateId}`).catch(() => ({ data: null })),
                            api.get(`/api/affiliate-management/${affiliateId}/dashboard-summary`).catch(() => ({ data: null })),
                            api.get(`/api/commissions/payout-status/${affiliateId}`, { params: { strict: true } }).catch(() => ({ data: null })),
                          ]);
                          if (payHistResp2.data?.success) setPaymentHistory(payHistResp2.data.data || []);
                          if (statsResp2.data?.data) setAffiliateStats(statsResp2.data.data);
                          const d = payoutResp2.data?.data || payoutResp2.data || null;
                          if (d) setLastPayout({ isPaid: !!d.isPaid, amount: Number(d.amount || 0), commission_month: String(d.commission_month || ''), payout_month: String(d.payout_month || ''), invoice_url: d.invoice_url || undefined, payslip_url: d.payslip_url || undefined });
                          setEditingPaymentAmount(false);
                          setCustomPaymentAmount('');
                        } finally {
                          setPaying(false);
                        }
                      }}
                    >
                      {paying ? 'Processing...' : 'Mark as Paid'}
                    </Button>
                  </div>

                  {/* Payment history */}
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-medium text-muted-foreground">Payment History</div>
                      {paymentHistory.length > 3 && (
                        <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => setShowAllPayments(!showAllPayments)}>
                          {showAllPayments ? 'Show Less' : `See All (${paymentHistory.length})`}
                        </Button>
                      )}
                    </div>
                    {paymentHistory.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-2">No payments recorded yet</div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {(showAllPayments ? paymentHistory : paymentHistory.slice(0, 3)).map((p) => (
                          <div key={p.id} className="p-2 bg-muted/50 rounded-md text-sm">
                            {editingPaymentId === p.id ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground w-14">Amount</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editPaymentAmount}
                                    onChange={(e) => setEditPaymentAmount(e.target.value)}
                                    className="h-7 text-sm"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground w-14">Notes</span>
                                  <Input
                                    value={editPaymentNotes}
                                    onChange={(e) => setEditPaymentNotes(e.target.value)}
                                    placeholder="Notes (optional)"
                                    className="h-7 text-sm"
                                  />
                                </div>
                                <div className="flex justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2"
                                    disabled={savingPaymentEdit}
                                    onClick={() => { setEditingPaymentId(null); setEditPaymentAmount(''); setEditPaymentNotes(''); }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="h-7 px-2"
                                    disabled={savingPaymentEdit || !editPaymentAmount}
                                    onClick={async () => {
                                      try {
                                        setSavingPaymentEdit(true);
                                        await api.put(`/api/commission-payments/${p.id}`, { amount: Number(editPaymentAmount), notes: editPaymentNotes });
                                        setEditingPaymentId(null);
                                        const [payHistResp, statsResp2] = await Promise.all([
                                          api.get(`/api/commission-payments/affiliate/${affiliateId}`).catch(() => ({ data: null })),
                                          api.get(`/api/affiliate-management/${affiliateId}/dashboard-summary`).catch(() => ({ data: null })),
                                        ]);
                                        if (payHistResp.data?.success) setPaymentHistory(payHistResp.data.data || []);
                                        if (statsResp2.data?.data) setAffiliateStats(statsResp2.data.data);
                                      } finally { setSavingPaymentEdit(false); }
                                    }}
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">${Number(p.amount).toFixed(2)}</div>
                                  <div className="text-xs text-muted-foreground">{p.payment_method} · {format(new Date(p.created_at), 'MMM dd, yyyy')}</div>
                                  {p.notes && <div className="text-xs text-muted-foreground">{p.notes}</div>}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Badge className={p.status === 'completed' || p.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                    {p.status}
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={() => {
                                      setEditingPaymentId(p.id);
                                      setEditPaymentAmount(String(Number(p.amount).toFixed(2)));
                                      setEditPaymentNotes(p.notes || '');
                                    }}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                    disabled={deletingPaymentId === p.id}
                                    onClick={async () => {
                                      if (!confirm('Delete this payment record? This will affect pending payout calculations.')) return;
                                      try {
                                        setDeletingPaymentId(p.id);
                                        await api.delete(`/api/commission-payments/${p.id}`);
                                        const [payHistResp, statsResp2] = await Promise.all([
                                          api.get(`/api/commission-payments/affiliate/${affiliateId}`).catch(() => ({ data: null })),
                                          api.get(`/api/affiliate-management/${affiliateId}/dashboard-summary`).catch(() => ({ data: null })),
                                        ]);
                                        if (payHistResp.data?.success) setPaymentHistory(payHistResp.data.data || []);
                                        if (statsResp2.data?.data) setAffiliateStats(statsResp2.data.data);
                                      } finally { setDeletingPaymentId(null); }
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {lastPayout?.payslip_url ? (
                    <Button variant="link" className="p-0 h-auto text-xs" onClick={() => window.open(lastPayout?.payslip_url as string, '_blank')}>View Latest Payslip</Button>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            {/* â”€â”€ Stats Cards Row â”€â”€ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="pt-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="text-xs text-muted-foreground">Total Referrals</span>
                  </div>
                  <div className="text-2xl font-bold">{affiliateStats?.totalAllTimeReferrals ?? affiliate.total_referrals ?? 0}</div>
                  <div className="text-xs text-muted-foreground mt-1">All-time</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-muted-foreground">Active Paying</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">{affiliateStats?.activeClients ?? 0}</div>
                  <div className="text-xs text-muted-foreground mt-1">Clients</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-blue-400" />
                    <span className="text-xs text-muted-foreground">Pending</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-500">{affiliateStats?.pendingClients ?? 0}</div>
                  <div className="text-xs text-muted-foreground mt-1">Signed up</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-xs text-muted-foreground">Unpaid</span>
                  </div>
                  <div className="text-2xl font-bold text-amber-600">{affiliateStats?.unpaidClients ?? 0}</div>
                  <div className="text-xs text-muted-foreground mt-1">Clients</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-xs text-muted-foreground">Cancelled / Churned</span>
                  </div>
                  <div className="text-2xl font-bold text-red-600">{affiliateStats?.cancelledClients ?? 0}</div>
                  <div className="text-xs text-muted-foreground mt-1">Clients</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart2 className="h-4 w-4 text-purple-500" />
                    <span className="text-xs text-muted-foreground">Current MRR</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-600">${Number(affiliateStats?.currentMRR ?? 0).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Driven by affiliate</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-5">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs text-muted-foreground">Monthly Earnings</span>
                  </div>
                  <div className="text-2xl font-bold text-emerald-600">${Number(affiliateStats?.monthlyEarnings ?? 0).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground mt-1">This month (earned)</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span className="text-xs text-muted-foreground">All-Time Earnings</span>
                  </div>
                  <div className="text-2xl font-bold">${Number(affiliateStats?.allTimeEarnings ?? affiliate.total_earnings ?? 0).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Total commissions earned</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="h-4 w-4 text-violet-500" />
                    <span className="text-xs text-muted-foreground">Total Payouts</span>
                  </div>
                  <div className="text-2xl font-bold text-violet-600">${Number(affiliateStats?.totalPayouts ?? 0).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Paid out by admin</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span className="text-xs text-muted-foreground">Pending Payouts</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-600">${Number(affiliateStats?.pendingPayouts ?? 0).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Awaiting payment</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-xs text-muted-foreground">Last Payout Date</span>
                  </div>
                  <div className="text-lg font-bold">
                    {affiliateStats?.lastPayoutDate
                      ? format(new Date(affiliateStats.lastPayoutDate), 'MMM dd, yyyy')
                      : '—'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Most recent payment</div>
                </CardContent>
              </Card>
            </div>

            {/* â”€â”€ Earnings This Month (filter/export) â”€â”€ */}
            <Card>
              <CardHeader>
                <CardTitle>Earnings This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <DollarSign className="h-6 w-6 text-green-600" />
                  <div className="text-2xl font-semibold">${Number(affiliateStats?.monthlyEarnings ?? 0).toFixed(2)}</div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Input type="date" value={filters.dateFrom || ''} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
                  <Input type="date" value={filters.dateTo || ''} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
                  <Button variant="outline" onClick={() => setFilters({ packageType: 'all' })}><RefreshCw className="h-4 w-4 mr-1" />Reset</Button>
                  <Button onClick={exportEarnings}><Download className="h-4 w-4 mr-1" />Export Earnings</Button>
                </div>
              </CardContent>
            </Card>

            {/* â”€â”€ Referral Network â”€â”€ */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Referral Network</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={filters.packageType} onValueChange={(v) => setFilters({ ...filters, packageType: v })}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by package" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All packages</SelectItem>
                      {packageOptions.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={exportReferralBreakdown}><Download className="h-4 w-4 mr-1" />Export Referrals</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Plan Name</TableHead>
                      <TableHead>Plan Type</TableHead>
                      <TableHead>Purchase Type</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Commission Earned</TableHead>
                      <TableHead>Referral Date</TableHead>
                      <TableHead>Conversion Date</TableHead>
                      <TableHead>Subscription Status</TableHead>
                      <TableHead>Plan Price</TableHead>
                      <TableHead>Stripe Paid</TableHead>
                      <TableHead>Last Payment</TableHead>
                      <TableHead>Transaction ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedReferrals.map((r: any) => (
                      <TableRow key={r.id} className={r.referred_user_id ? 'cursor-pointer hover:bg-muted/50' : ''} onClick={() => { if (r.referred_user_id) navigate(`/super-admin/clients/${r.referred_user_id}/transactions`); }}>
                        <TableCell>
                          <div className="font-medium">{r.referred_user_first_name} {r.referred_user_last_name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">{r.referred_user_email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.plan_name || r.package_name || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.plan_type || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.purchase_type || 'Subscription'}</Badge>
                        </TableCell>
                        <TableCell>${Number(r.package_price || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-600" />${Number(r.commission_earned || 0).toFixed(2)}</div>
                        </TableCell>
                        <TableCell>{r.referral_date ? format(new Date(r.referral_date), 'MMM dd, yyyy') : '”'}</TableCell>
                        <TableCell>{r.conversion_date ? format(new Date(r.conversion_date), 'MMM dd, yyyy') : (r.last_purchase_date ? format(new Date(r.last_purchase_date), 'MMM dd, yyyy') : '”')}</TableCell>
                        <TableCell>
                          {(() => {
                            const state = r.payment_state || 'unknown';
                            const colorMap: Record<string, string> = {
                              paid: 'bg-emerald-100 text-emerald-800',
                              active: 'bg-green-100 text-green-800',
                              unpaid: 'bg-amber-100 text-amber-800',
                              cancelled: 'bg-red-100 text-red-800',
                              churned: 'bg-orange-100 text-orange-800',
                              pending: 'bg-gray-100 text-gray-800',
                              unknown: 'bg-gray-100 text-gray-800',
                            };
                            return <Badge className={colorMap[state] || colorMap.unknown}>{state.charAt(0).toUpperCase() + state.slice(1)}</Badge>;
                          })()}
                        </TableCell>
                        <TableCell>{r.plan_price ? `$${Number(r.plan_price).toFixed(2)}` : '”'}</TableCell>
                        <TableCell>
                          {r.is_stripe_paid ? (
                            <Badge className="bg-emerald-100 text-emerald-800">Yes</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800">No</Badge>
                          )}
                        </TableCell>
                        <TableCell>{r.last_payment_date ? format(new Date(r.last_payment_date), 'MMM dd, yyyy') : '”'}</TableCell>
                        <TableCell>
                          {r.stripe_transaction_id ? (
                            <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{r.stripe_transaction_id}</span>
                          ) : '”'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {pagedReferrals.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">No referrals found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between p-4">
                  <div className="text-sm">Page {page} of {Math.max(1, Math.ceil(filteredReferrals.length / pageSize))}</div>
                  <div className="flex items-center gap-2">
                    <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                      <SelectTrigger className="w-[120px]"><SelectValue placeholder="Page size" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
                    <Button variant="outline" disabled={page >= Math.ceil(filteredReferrals.length / pageSize)} onClick={() => setPage((p) => p + 1)}>Next</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* â”€â”€ Affiliate Override Referrals â”€â”€ */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Affiliate Override Referrals
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Referrals and earnings coming from affiliates recruited by{' '}
                      <span className="font-medium text-foreground">{affiliate.first_name} {affiliate.last_name}</span>
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end text-sm gap-1">
                    <div className="text-muted-foreground">
                      Total override referrals:{' '}
                      <span className="font-medium text-foreground">{(childSummary.totalReferrals || 0).toLocaleString()}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Total earnings from child referrals:{' '}
                      <span className="font-medium text-foreground">${(childSummary.totalCommission || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Affiliate Override</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead>Commission</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {childReferrals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Users className="h-8 w-8" />
                            <p>No affiliate override referrals found</p>
                            <p className="text-xs">This affiliate has no affiliates override with referrals yet</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      childReferrals.map((referral) => (
                        <TableRow key={referral.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{referral.childAffiliateName}</div>
                              <div className="text-xs text-muted-foreground">ID: {referral.childAffiliateId ?? '”'}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{referral.customerName}</div>
                              <div className="text-sm text-muted-foreground">{referral.customerEmail}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{referral.product}</div>
                              <div className="text-sm text-muted-foreground">
                                ${referral.orderValue.toLocaleString()} Â· {referral.commissionRate.toFixed(2)}%
                              </div>
                              {typeof referral.childCommissionRate === 'number' && typeof referral.childOrderValue === 'number' ? (
                                <div className="text-xs text-muted-foreground">
                                  Child: ${referral.childOrderValue.toLocaleString()} Â· {referral.childCommissionRate.toFixed(2)}%
                                </div>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getChildStatusColor(referral.status)}>
                              {formatChildStatusLabel(referral.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {referral.orderDate
                                ? format(new Date(referral.orderDate), 'MMM dd, yyyy')
                                : '”'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium text-green-600">
                                You: ${referral.commissionAmount.toLocaleString()}
                              </div>
                              {typeof referral.childCommissionAmount === 'number' ? (
                                <div className="text-xs text-muted-foreground">
                                  Child: ${referral.childCommissionAmount.toLocaleString()}
                                </div>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminAffiliateProfile;
