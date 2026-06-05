export interface CommissionItem {
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
  commission_type?: string;
  order_date: string;
  payment_date?: string;
}

export interface ReferralItem {
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
  // Stripe / subscription fields
  user_status?: string | null;
  subscription_status?: string | null;
  stripe_subscription_id?: string | null;
  payment_state?: string | null;
  is_stripe_paid?: boolean;
  plan_price?: number | null;
  last_payment_date?: string | null;
  stripe_transaction_id?: string | null;
  current_period_end?: string | null;
}

export interface Filters {
  packageType: string;
  dateFrom?: string;
  dateTo?: string;
}

export type MonthlyPoint = { month: string; amount: number };

export function aggregateMonthlyEarnings(items: CommissionItem[], from?: string, to?: string): MonthlyPoint[] {
  const fromTs = from ? new Date(from).getTime() : undefined;
  const toTs = to ? new Date(to).getTime() : undefined;
  const map = new Map<string, number>();
  items.forEach((c) => {
    const t = new Date(c.order_date).getTime();
    if (fromTs && t < fromTs) return;
    if (toTs && t > toTs) return;
    const ym = new Date(c.order_date).toISOString().slice(0, 7);
    map.set(ym, (map.get(ym) || 0) + (Number(c.commission_amount) || 0));
  });
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([month, amount]) => ({ month, amount: Number(amount.toFixed(2)) }));
}

export function mergeReferralsWithCommissions(referrals: ReferralItem[], commissions: CommissionItem[]) {
  const byEmail = new Map<string, CommissionItem[]>();
  commissions.forEach((c) => {
    const key = (c.customer_email || '').toLowerCase();
    if (!key) return;
    const arr = byEmail.get(key) || [];
    arr.push(c);
    byEmail.set(key, arr);
  });
  return referrals.map((r) => {
    const key = (r.referred_user_email || '').toLowerCase();
    const cs = key ? byEmail.get(key) || [] : [];
    const latest = cs.slice().sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())[0];
    return {
      ...r,
      package_name: latest?.product || null,
      package_price: latest?.order_value || null,
      last_purchase_date: latest?.order_date || null,
      purchase_type: latest?.product || null,
      commission_earned: cs.reduce((sum, x) => sum + (Number(x.commission_amount) || 0), 0),
    } as any;
  });
}

export function filterReferrals(items: any[], filters: Filters) {
  return items.filter((i) => {
    if (filters.packageType && filters.packageType !== 'all') {
      const name = (i.plan_name || i.package_name || '').toLowerCase();
      if (name !== filters.packageType.toLowerCase()) return false;
    }
    const dd = i.conversion_date || i.referral_date || i.last_purchase_date;
    if (filters.dateFrom && dd && new Date(dd).getTime() < new Date(filters.dateFrom).getTime()) return false;
    if (filters.dateTo && dd && new Date(dd).getTime() > new Date(filters.dateTo).getTime()) return false;
    return true;
  });
}
