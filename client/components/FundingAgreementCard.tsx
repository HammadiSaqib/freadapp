import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Check, Copy, FileSignature, Loader2, ShieldCheck } from 'lucide-react';
import { fundingAgreementsApi } from '@/lib/api';
import { buildAliasUrl } from '@/lib/hostRouting';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FundingAgreementCardProps {
  clientId: string | number;
  isFundable?: boolean;
  source?: 'admin_dashboard' | 'member_dashboard';
}

export default function FundingAgreementCard({ clientId, isFundable, source = 'admin_dashboard' }: FundingAgreementCardProps) {
  const { userProfile } = useAuthContext();
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [signature, setSignature] = useState('');
  const [signing, setSigning] = useState(false);
  const [copied, setCopied] = useState(false);
  const canSign = String(userProfile?.role || '') === 'client';

  const load = useCallback(async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      const response = await fundingAgreementsApi.getClientAgreement(clientId);
      setData(response.data?.data || null);
    } catch (error) {
      console.error('Failed to load funding agreement:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { void load(); }, [load]);

  const agreement = data?.agreement;
  const fundable = typeof data?.is_fundable === 'boolean' ? data.is_fundable : Boolean(isFundable);
  const signed = String(agreement?.status || '') === 'signed';

  const sign = async () => {
    if (!signature.trim()) return;
    try {
      setSigning(true);
      await fundingAgreementsApi.signClientAgreement(clientId, { signature: signature.trim(), source });
      toast({ title: 'Funding Agreement signed', description: 'Your request has been submitted to the internal Funding Team.' });
      setOpen(false);
      await load();
    } catch (error: any) {
      toast({ title: 'Unable to sign agreement', description: error?.response?.data?.error || 'Please try again.', variant: 'destructive' });
    } finally {
      setSigning(false);
    }
  };

  const copyClientSigningLink = async () => {
    const signingUrl = buildAliasUrl('member', '/funding', {
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      port: window.location.port,
      search: '?source=admin_dashboard',
      hash: '',
    });

    try {
      await navigator.clipboard.writeText(signingUrl);
      setCopied(true);
      toast({ title: 'Client signing link copied', description: 'Send this link to the client. They must sign in to complete the agreement.' });
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({ title: 'Unable to copy link', description: signingUrl, variant: 'destructive' });
    }
  };

  if (loading) return null;
  if (!fundable) return null;

  return (
    <>
      <Card className="border-emerald-200 bg-emerald-50/40">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-emerald-900"><BadgeCheck className="h-5 w-5" />You are Fundable / Funding Ready</CardTitle>
              <CardDescription className="mt-1">Only the internal Funding Team manages strategy, bank matching, and applications.</CardDescription>
            </div>
            <Badge className={signed ? 'bg-emerald-600' : 'bg-amber-500'}>{signed ? 'Agreement Signed' : 'Signature Required'}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div><span className="text-muted-foreground">Funding Agreement:</span> <strong>{signed ? 'Complete' : 'Pending'}</strong></div>
            <div><span className="text-muted-foreground">Funding progress:</span> <strong>{data?.funding_progress}</strong></div>
          </div>
          <Button onClick={() => setOpen(true)} variant={signed ? 'outline' : 'default'}>
            <FileSignature className="mr-2 h-4 w-4" />
            {signed ? 'View Signed Funding Agreement' : canSign ? 'Review & Sign Funding Agreement' : 'Open Funding Agreement'}
          </Button>
          {!canSign && !signed && (
            <Button type="button" variant="outline" onClick={copyClientSigningLink}>
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? 'Client Link Copied' : 'Copy Client Signing Link'}
            </Button>
          )}
          {!canSign && !signed && <p className="text-xs text-muted-foreground">The actual client must sign. The Admin can review the agreement but cannot sign for the client.</p>}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{agreement?.title_snapshot || 'Funding Agreement'}</DialogTitle>
            <DialogDescription>Agreement version {agreement?.agreement_version} · Success fee {Number(agreement?.success_fee_percentage || 0).toFixed(2)}%</DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm max-w-none rounded-md border bg-white p-5" dangerouslySetInnerHTML={{ __html: agreement?.content_snapshot || '' }} />
          <div className="rounded-md border p-4 text-sm"><strong>Success fee accepted:</strong> {Number(agreement?.success_fee_percentage || 0).toFixed(2)}%</div>
          {signed ? (
            <div className="space-y-2 rounded-md bg-emerald-50 p-4 text-sm text-emerald-900">
              <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" />Signed and submitted to the Funding Team</div>
              <p>Signed by {agreement?.signer_name} as “{agreement?.signature_text}” on {agreement?.signed_at ? new Date(agreement.signed_at).toLocaleString() : ''}.</p>
              <p>Source: {agreement?.signed_source === 'admin_dashboard' ? 'Admin Dashboard client flow' : 'Member Dashboard'}</p>
            </div>
          ) : canSign ? (
            <div className="space-y-2">
              <Label htmlFor="funding-signature">Electronic signature (type your full legal name)</Label>
              <Input id="funding-signature" value={signature} onChange={(event) => setSignature(event.target.value)} placeholder={data?.client_name || 'Full legal name'} />
              <p className="text-xs text-muted-foreground">By signing, you consent to this electronic signature and electronic records.</p>
            </div>
          ) : (
            <p className="rounded-md bg-amber-50 p-4 text-sm text-amber-900">For legal attribution, ask the client to sign in to their Member Dashboard and complete this agreement.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            {!signed && !canSign && <Button type="button" onClick={copyClientSigningLink}>{copied ? 'Client Link Copied' : 'Copy Client Signing Link'}</Button>}
            {!signed && canSign && <Button onClick={sign} disabled={signing || signature.trim().length < 2}>{signing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Sign Agreement</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
