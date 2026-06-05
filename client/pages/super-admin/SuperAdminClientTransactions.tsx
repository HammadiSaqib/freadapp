import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { api, superAdminApi } from '@/lib/api';
import { format } from 'date-fns';
import { ArrowLeft, Download, RefreshCw, Filter, CreditCard, Calendar, DollarSign } from 'lucide-react';

type Transaction = {
  id?: number;
  user_id?: number;
  source?: string;
  stripe_payment_intent_id?: string | null;
  stripe_customer_id?: string | null;
  amount?: number | null;
  currency?: string;
  status?: string;
  payment_method?: string | null;
  plan_name?: string | null;
  plan_type?: string | null;
  description?: string | null;
  metadata?: any;
  created_at: string;
  updated_at?: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  stripe_invoice_id?: string | null;
  stripe_payment_method_type?: string | null;
  stripe_payment_method_brand?: string | null;
  stripe_payment_method_last4?: string | null;
  stripe_fee_amount?: number | null;
};

function toCsv(filename: string, rows: any[]) {
  const headers = Object.keys(rows[0] || {});
  const lines = [headers.join(',')].concat(
    rows.map((r) => headers.map((h) => JSON.stringify((r as any)[h] ?? '')).join(','))
  );
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const SuperAdminClientTransactions: React.FC = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const userResp = await superAdminApi.getUser(String(userId));
        setUser(userResp.data?.data || userResp.data || null);
        const trxResp = await api.get('/api/super-admin/billing/stripe/transactions', { params: { user_id: userId, limit: 200 } });
        const list: Transaction[] = trxResp.data?.transactions || trxResp.data?.data || [];
        setTransactions(Array.isArray(list) ? list : []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load transactions');
        setTransactions([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [userId]);

  const filtered = useMemo(() => {
    let rows = [...transactions];
    if (statusFilter !== 'all') rows = rows.filter(r => (r.status || '').toLowerCase() === statusFilter);
    if (typeFilter !== 'all') rows = rows.filter(r => (r.plan_type || '').toLowerCase() === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        String(r.plan_name || '').toLowerCase().includes(q) ||
        String(r.description || '').toLowerCase().includes(q) ||
        String(r.email || '').toLowerCase().includes(q) ||
        String(r.stripe_invoice_id || '').toLowerCase().includes(q) ||
        String(r.stripe_payment_intent_id || '').toLowerCase().includes(q)
      );
    }
    rows.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'amount') return (Number(a.amount) - Number(b.amount)) * dir;
      if (sortBy === 'status') return String(a.status).localeCompare(String(b.status)) * dir;
      if (sortBy === 'plan_type') return String(a.plan_type).localeCompare(String(b.plan_type)) * dir;
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return (da - db) * dir;
    });
    return rows;
  }, [transactions, statusFilter, typeFilter, search, sortBy, sortDir]);

  const exportData = () => {
    const rows = filtered.map(r => ({
      id: r.id,
      payment_intent: r.stripe_payment_intent_id || '',
      invoice_id: r.stripe_invoice_id || '',
      amount: Number(r.amount || 0).toFixed(2),
      currency: r.currency || 'USD',
      status: r.status,
      payment_method_type: r.stripe_payment_method_type || r.payment_method || '',
      brand: r.stripe_payment_method_brand || '',
      last4: r.stripe_payment_method_last4 || '',
      plan_name: r.plan_name || '',
      plan_type: r.plan_type || '',
      fees: r.stripe_fee_amount != null ? Number(r.stripe_fee_amount).toFixed(2) : '',
      created_at: r.created_at
    }));
    toCsv(`client_${userId}_transactions.csv`, rows);
  };

  return (
    <SuperAdminLayout title="Client Transactions" description="Stripe billing history and details">
      <div className="space-y-6 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
            <div>
              <div className="font-semibold">
                {user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : 'Loading...'}
              </div>
              <div className="text-sm text-muted-foreground">ID #{userId}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={exportData}><Download className="h-4 w-4 mr-1" />Export</Button>
          </div>
        </div>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Transaction History</CardTitle>
            <div className="flex items-center gap-2">
              <Input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="w-[220px]" />
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="succeeded">Succeeded</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="lifetime">Lifetime</SelectItem>
                  <SelectItem value="course">Course</SelectItem>
                </SelectContent>
              </Select>
              <Select value={`${sortBy}:${sortDir}`} onValueChange={(v) => { const [b, d] = v.split(':'); setSortBy(b); setSortDir(d as any); }}>
                <SelectTrigger className="w-[220px]"><SelectValue placeholder="Sort" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at:desc">Newest first</SelectItem>
                  <SelectItem value="created_at:asc">Oldest first</SelectItem>
                  <SelectItem value="amount:desc">Amount ↓</SelectItem>
                  <SelectItem value="amount:asc">Amount ↑</SelectItem>
                  <SelectItem value="status:asc">Status A→Z</SelectItem>
                  <SelectItem value="status:desc">Status Z→A</SelectItem>
                  <SelectItem value="plan_type:asc">Type A→Z</SelectItem>
                  <SelectItem value="plan_type:desc">Type Z→A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground"><RefreshCw className="h-5 w-5 animate-spin mr-2" />Loading transactions...</div>
            ) : error ? (
              <div className="p-4 bg-red-50 text-red-700">{error}</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No transactions found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Fees</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => (
                    <TableRow key={String(t.stripe_payment_intent_id || t.stripe_invoice_id || t.created_at)}>
                      <TableCell>
                        <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-green-600" />{Number(t.amount || 0).toFixed(2)}</div>
                      </TableCell>
                      <TableCell>{t.currency || 'USD'}</TableCell>
                      <TableCell><Badge variant="outline">{t.status || 'unknown'}</Badge></TableCell>
                      <TableCell>{t.plan_name || '—'}</TableCell>
                      <TableCell>{t.plan_type || '—'}</TableCell>
                      <TableCell>{t.stripe_invoice_id || '—'}</TableCell>
                      <TableCell>
                        {t.stripe_payment_method_type ? (
                          <div className="text-sm">{t.stripe_payment_method_type}{t.stripe_payment_method_brand ? ` • ${t.stripe_payment_method_brand}` : ''}{t.stripe_payment_method_last4 ? ` • •••• ${t.stripe_payment_method_last4}` : ''}</div>
                        ) : (t.payment_method || '—')}
                      </TableCell>
                      <TableCell>{t.stripe_fee_amount != null ? `$${Number(t.stripe_fee_amount).toFixed(2)}` : '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2"><Calendar className="h-4 w-4" />{format(new Date(t.created_at), 'MMM dd, yyyy HH:mm')}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminClientTransactions;
