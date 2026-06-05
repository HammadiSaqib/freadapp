import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

type PayslipData = {
  payslip_number: string | null;
  commission_month: string;
  payout_month: string;
  amount: number;
  status: string;
  paid_at: string | null;
  notes: string | null;
  affiliate: {
    id: number;
    name: string;
    email: string | null;
    company_name: string | null;
    bank_name: string | null;
    account_holder_name: string | null;
    account_number: string | null;
    routing_number: string | null;
    account_type: string | null;
    swift_code: string | null;
    iban: string | null;
    bank_address: string | null;
  };
  sender: {
    email: string | null;
    company_name: string | null;
    logo_url: string | null;
  };
  public_url: string;
};

export default function PayslipPublic() {
  const { token } = useParams();
  const [data, setData] = useState<PayslipData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await api.get(`/api/payslips/public/${token}`);
        const d = resp.data?.data || resp.data;
        setData(d);
      } catch (e: any) {
        setError(e?.message || 'Failed to load payslip');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  }
  if (error || !data) {
    return <div className="min-h-screen flex items-center justify-center">{error || 'Payslip not found'}</div>;
  }

  const paid = String(data.status || '').toLowerCase() === 'paid';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl py-10 px-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {data.sender.logo_url ? (
                  <img src={data.sender.logo_url} alt="Logo" className="h-8 w-8 rounded" />
                ) : null}
                <div>
                  <CardTitle>Payslip</CardTitle>
                  <div className="text-sm text-muted-foreground">{data.sender.company_name || 'CreditRepairPro'}</div>
                </div>
              </div>
              <Badge className={paid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                {paid ? 'Paid' : 'Generated'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-muted-foreground">Payslip Number</div>
                <div className="font-medium">{data.payslip_number || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Period</div>
                <div className="font-medium">{data.commission_month} → {data.payout_month}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Affiliate</div>
                <div className="font-medium">{data.affiliate.name}</div>
                <div className="text-sm text-muted-foreground">{data.affiliate.email || ''}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Net Amount</div>
                <div className="text-2xl font-semibold">${Number(data.amount || 0).toFixed(2)}</div>
              </div>
            </div>

            <div className="mt-8">
              <div className="text-sm text-muted-foreground mb-2">Bank Details</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div>Bank: {data.affiliate.bank_name || '-'}</div>
                  <div>Account Holder: {data.affiliate.account_holder_name || '-'}</div>
                  <div>Account #: {data.affiliate.account_number || '-'}</div>
                  <div>Routing #: {data.affiliate.routing_number || '-'}</div>
                  <div>Type: {data.affiliate.account_type || '-'}</div>
                </div>
                <div>
                  <div>SWIFT: {data.affiliate.swift_code || '-'}</div>
                  <div>IBAN: {data.affiliate.iban || '-'}</div>
                  <div>Bank Address: {data.affiliate.bank_address || '-'}</div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Sender: {data.sender.email || '-'}</div>
              <Button variant="outline" onClick={() => window.print()}>Print</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
