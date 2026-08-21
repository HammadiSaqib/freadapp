import ClientLayout from '@/components/ClientLayout';
import FundingAgreementCard from '@/components/FundingAgreementCard';
import { useAuthContext } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';

export default function ClientFunding() {
  const { userProfile } = useAuthContext();
  const [searchParams] = useSearchParams();
  const signingSource = searchParams.get('source') === 'admin_dashboard' ? 'admin_dashboard' : 'member_dashboard';

  return (
    <ClientLayout title="Funding" description="Your funding readiness and agreement status">
      <div className="mx-auto max-w-4xl space-y-5">
        <FundingAgreementCard clientId={Number(userProfile?.id || 0)} source={signingSource} />
        <div className="rounded-lg border bg-slate-50 p-5 text-sm text-slate-700">
          Your internal funding strategy, bank matching, recommendations, applications, and team notes are handled privately by the internal Funding Team. Updates relevant to you will appear here as basic funding progress.
        </div>
      </div>
    </ClientLayout>
  );
}
