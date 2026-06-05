import { describe, it, expect } from 'vitest';
import { aggregateMonthlyEarnings, mergeReferralsWithCommissions, filterReferrals, CommissionItem, ReferralItem } from '@/utils/affiliateProfile';

describe('aggregateMonthlyEarnings', () => {
  it('aggregates by YYYY-MM and sums amounts', () => {
    const input: CommissionItem[] = [
      { id:1, affiliate_id:1, customer_name:'A', customer_email:'a@test.com', order_value:100, commission_rate:10, commission_amount:10, status:'paid', tier:'', product:'Basic', order_date:'2024-01-15', payment_date:'2024-01-20' },
      { id:2, affiliate_id:1, customer_name:'B', customer_email:'b@test.com', order_value:200, commission_rate:10, commission_amount:20, status:'paid', tier:'', product:'Pro', order_date:'2024-01-31', payment_date:'2024-02-02' },
      { id:3, affiliate_id:1, customer_name:'C', customer_email:'c@test.com', order_value:300, commission_rate:10, commission_amount:30, status:'paid', tier:'', product:'Pro', order_date:'2024-02-01' }
    ];
    const out = aggregateMonthlyEarnings(input);
    expect(out).toEqual([
      { month: '2024-01', amount: 30 },
      { month: '2024-02', amount: 30 }
    ]);
  });

  it('respects date range filters', () => {
    const input: CommissionItem[] = [
      { id:1, affiliate_id:1, customer_name:'A', customer_email:'a@test.com', order_value:100, commission_rate:10, commission_amount:10, status:'paid', tier:'', product:'Basic', order_date:'2024-01-15' },
      { id:2, affiliate_id:1, customer_name:'B', customer_email:'b@test.com', order_value:200, commission_rate:10, commission_amount:20, status:'paid', tier:'', product:'Pro', order_date:'2024-02-01' }
    ];
    const out = aggregateMonthlyEarnings(input, '2024-02-01', '2024-12-31');
    expect(out).toEqual([{ month: '2024-02', amount: 20 }]);
  });
});

describe('mergeReferralsWithCommissions', () => {
  it('matches commissions by email and computes commission_earned', () => {
    const refs: ReferralItem[] = [
      { id:11, referred_user_id:101, referred_user_email:'x@test.com', referred_user_first_name:'X', referred_user_last_name:'Y' },
      { id:12, referred_user_id:102, referred_user_email:'z@test.com', referred_user_first_name:'Z', referred_user_last_name:'Q' }
    ];
    const comms: CommissionItem[] = [
      { id:1, affiliate_id:1, customer_name:'X Y', customer_email:'x@test.com', order_value:100, commission_rate:10, commission_amount:10, status:'paid', tier:'', product:'Basic', order_date:'2024-01-15' },
      { id:2, affiliate_id:1, customer_name:'X Y', customer_email:'x@test.com', order_value:200, commission_rate:10, commission_amount:20, status:'paid', tier:'', product:'Pro', order_date:'2024-02-01' }
    ];
    const out = mergeReferralsWithCommissions(refs, comms) as any[];
    const x = out.find(r => r.referred_user_email === 'x@test.com');
    const z = out.find(r => r.referred_user_email === 'z@test.com');
    expect(x.commission_earned).toBe(30);
    expect(x.package_name).toBe('Pro');
    expect(z.commission_earned).toBe(0);
  });
});

describe('filterReferrals', () => {
  const baseRows: any[] = [
    { package_name:'Basic', referral_date:'2024-01-02' },
    { package_name:'Pro', conversion_date:'2024-02-10' },
    { package_name:'Pro', last_purchase_date:'2024-03-01' }
  ];

  it('filters by package', () => {
    const out = filterReferrals(baseRows, { packageType:'Pro' });
    expect(out.length).toBe(2);
  });

  it('filters by date range', () => {
    const out = filterReferrals(baseRows, { packageType:'all', dateFrom:'2024-02-01', dateTo:'2024-02-28' });
    expect(out.length).toBe(1);
    expect(out[0].conversion_date).toBe('2024-02-10');
  });
});

