import React, { useEffect, useState } from 'react';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import { useParams } from 'react-router-dom';
import { api, superAdminApi } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Download } from 'lucide-react';

type AgreementHistoryTab = 'admin-contracts' | 'score-machine-elite';

function toCsv(filename: string, headers: string[], rows: Array<Record<string, any>>) {
  const lines = [headers.join(',')].concat(
    (rows || []).map((r) => headers.map((h) => JSON.stringify(r?.[h] ?? '')).join(','))
  );
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminDetails() {
  const { id } = useParams();
  const adminId = Number(id);
  const [activeAgreementTab, setActiveAgreementTab] = useState<AgreementHistoryTab>('admin-contracts');
  const [adminAgreements, setAdminAgreements] = useState<any[]>([]);
  const [tsmEliteAgreements, setTsmEliteAgreements] = useState<any[]>([]);
  const [showAgreementsDropdown, setShowAgreementsDropdown] = useState(false);
  const [selectedAdminAgreement, setSelectedAdminAgreement] = useState<any | null>(null);
  const [selectedTsmEliteAgreement, setSelectedTsmEliteAgreement] = useState<any | null>(null);
  const [admin, setAdmin] = useState<any>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingAgreement, setDownloadingAgreement] = useState(false);

  const getAgreementStatusLabel = (status?: string | null) => {
    switch (status) {
      case 'pending_signature':
        return 'Pending Signature';
      case 'void':
        return 'Void';
      case 'signed':
        return 'Signed';
      case 'draft':
        return 'Draft';
      case 'expired':
        return 'Expired';
      default:
        return status ? status.replace(/_/g, ' ') : 'Unknown';
    }
  };

  const getAgreementTimestampLabel = (agreement: any) => {
    if (agreement?.signed_at) {
      return `Signed ${new Date(agreement.signed_at).toLocaleString()}`;
    }
    if (agreement?.created_at) {
      return `Created ${new Date(agreement.created_at).toLocaleDateString()}`;
    }
    return 'No timestamp';
  };

  const currentAgreements = activeAgreementTab === 'admin-contracts' ? adminAgreements : tsmEliteAgreements;
  const currentSelectedAgreement = activeAgreementTab === 'admin-contracts' ? selectedAdminAgreement : selectedTsmEliteAgreement;
  const currentAgreementPdfLabel = activeAgreementTab === 'admin-contracts' ? 'Admin Contract PDF' : 'Score Machine Elite PDF';

  const selectAgreement = (agreement: any) => {
    if (activeAgreementTab === 'admin-contracts') {
      setSelectedAdminAgreement(agreement);
      return;
    }

    setSelectedTsmEliteAgreement(agreement);
  };

  const getEmptyAgreementHistoryMessage = () => {
    if (activeAgreementTab === 'score-machine-elite') {
      return 'No Score Machine Elite history found for this admin yet.';
    }

    return 'No admin contract history found for this admin yet.';
  };

  const renderAgreementSignaturePreview = (agreement: any) => {
    if (agreement?.signature_image_url) {
      return (
        <div className="grid gap-2 pt-1">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Signature Preview</div>
          <div className="w-fit rounded-md border bg-white p-2">
            <img
              src={agreement.signature_image_url}
              alt={`${agreement.title || 'Agreement'} signature`}
              className="max-h-24 w-auto object-contain"
            />
          </div>
        </div>
      );
    }

    if (agreement?.signature_text) {
      return (
        <div className="grid gap-2 pt-1">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Signature Preview</div>
          <div className="rounded-md border bg-white px-3 py-2 text-sm text-gray-700">
            {agreement.signature_text}
          </div>
        </div>
      );
    }

    return (
      <div className="grid gap-2 pt-1">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Signature Preview</div>
        <div className="rounded-md border border-dashed bg-white px-3 py-2 text-sm text-gray-500">
          No signature preview available for this agreement.
        </div>
      </div>
    );
  };

  const exportTransactions = () => {
    const headers = ['Date', 'Status', 'Amount', 'Method', 'Plan'];
    const rows = transactions.map((t) => ({
      Date: t.created_at ? new Date(t.created_at).toISOString().slice(0, 10) : '',
      Status: t.status ?? '',
      Amount: typeof t.amount === 'number' ? Number(t.amount).toFixed(2) : '',
      Method: t.payment_method ?? '',
      Plan: t.plan_name ?? '',
    }));
    toCsv(`admin_${adminId}_transactions.csv`, headers, rows);
  };

  const exportClients = () => {
    const headers = ['Name', 'Email', 'Status', 'Created'];
    const rows = clients.map((c) => ({
      Name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
      Email: c.email ?? '',
      Status: c.status ?? '',
      Created: c.created_at ? new Date(c.created_at).toISOString().slice(0, 10) : '',
    }));
    toCsv(`admin_${adminId}_clients.csv`, headers, rows);
  };

  const exportActivityLogs = () => {
    const headers = ['Time', 'Type', 'Description', 'IP'];
    const rows = activities.map((a) => ({
      Time: a.created_at ? new Date(a.created_at).toISOString() : '',
      Type: a.activity_type ?? '',
      Description: a.description ?? '',
      IP: a.ip_address ?? '',
    }));
    toCsv(`admin_${adminId}_activity_logs.csv`, headers, rows);
  };

  const downloadAgreementPdf = async () => {
    try {
      setDownloadingAgreement(true);
      const params = new URLSearchParams();
      if (activeAgreementTab === 'score-machine-elite') {
        params.set('type', 'score-machine-elite');
        if (currentSelectedAgreement?.id) {
          params.set('templateId', String(currentSelectedAgreement.id));
        }
      } else if (currentSelectedAgreement?.id) {
        params.set('contractId', String(currentSelectedAgreement.id));
      }

      const url = `/api/super-admin/admins/${adminId}/agreement.pdf${params.toString() ? `?${params.toString()}` : ''}`;
      const resp = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([resp.data], { type: 'application/pdf' });
      const urlObj = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlObj;
      a.download = activeAgreementTab === 'score-machine-elite'
        ? `admin_${adminId}_score_machine_elite_agreement.pdf`
        : `admin_${adminId}_agreement.pdf`;
      a.click();
      URL.revokeObjectURL(urlObj);
    } finally {
      setDownloadingAgreement(false);
    }
  };

  useEffect(() => {
    setShowAgreementsDropdown(false);
  }, [activeAgreementTab]);

  useEffect(() => {
    let isActive = true;

    (async () => {
      if (!Number.isFinite(adminId)) {
        if (isActive) {
          setAdmin(null);
          setAdminError('Invalid admin id.');
            setAdminAgreements([]);
            setTsmEliteAgreements([]);
            setSelectedAdminAgreement(null);
            setSelectedTsmEliteAgreement(null);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setAdminError(null);

        try {
          const adminRes = await superAdminApi.getAdminProfile(adminId);
          if (!isActive) return;
          setAdmin(adminRes.data?.data || adminRes.data || null);
        } catch (adminFetchError) {
          console.error('Failed to load admin details:', adminFetchError);
          if (!isActive) return;
          setAdmin(null);
          setAdminError('Failed to load admin details.');
        }

        const [agreementsRes, tsmEliteAgreementsRes, txnRes, clientsRes, logsRes] = await Promise.allSettled([
          superAdminApi.getAdminAgreements(adminId),
          superAdminApi.getAdminTsmEliteAgreements(adminId),
          superAdminApi.getBillingTransactions({ user_id: String(adminId), limit: 50 }),
          superAdminApi.getClients({ page: 1, limit: 50, user_id: String(adminId) }),
          superAdminApi.getUserActivity(adminId, { page: 1, limit: 50 })
        ]);

        if (!isActive) return;

        if (agreementsRes.status === 'fulfilled') {
          const agreementData = agreementsRes.value.data?.data || agreementsRes.value.data;
          const nextAgreements = Array.isArray(agreementData) ? agreementData : [];
          setAdminAgreements(nextAgreements);
          setSelectedAdminAgreement((currentAgreement: any) => {
            if (!currentAgreement) {
              return nextAgreements[0] || null;
            }
            return nextAgreements.find((agreement: any) => agreement.id === currentAgreement.id) || nextAgreements[0] || null;
          });
        } else {
          console.error('Failed to load admin agreements:', agreementsRes.reason);
          setAdminAgreements([]);
          setSelectedAdminAgreement(null);
        }

        if (tsmEliteAgreementsRes.status === 'fulfilled') {
          const agreementData = tsmEliteAgreementsRes.value.data?.data || tsmEliteAgreementsRes.value.data;
          const nextAgreements = Array.isArray(agreementData) ? agreementData : [];
          setTsmEliteAgreements(nextAgreements);
          setSelectedTsmEliteAgreement((currentAgreement: any) => {
            if (!currentAgreement) {
              return nextAgreements[0] || null;
            }
            return nextAgreements.find((agreement: any) => agreement.id === currentAgreement.id) || nextAgreements[0] || null;
          });
        } else {
          console.error('Failed to load admin Score Machine Elite agreements:', tsmEliteAgreementsRes.reason);
          setTsmEliteAgreements([]);
          setSelectedTsmEliteAgreement(null);
        }

        if (txnRes.status === 'fulfilled') {
          setTransactions(Array.isArray(txnRes.value.data?.transactions) ? txnRes.value.data.transactions : []);
        } else {
          console.error('Failed to load billing transactions:', txnRes.reason);
          setTransactions([]);
        }

        if (clientsRes.status === 'fulfilled') {
          const clientData = clientsRes.value.data?.data || clientsRes.value.data;
          setClients(Array.isArray(clientData) ? clientData : []);
        } else {
          console.error('Failed to load admin clients:', clientsRes.reason);
          setClients([]);
        }

        if (logsRes.status === 'fulfilled') {
          const logsData = logsRes.value.data?.data || logsRes.value.data;
          setActivities(Array.isArray(logsData) ? logsData : []);
        } else {
          console.error('Failed to load user activity:', logsRes.reason);
          setActivities([]);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [adminId]);

  return (
    <SuperAdminLayout title="Admin Details" description="Transactions, clients, and activity logs">
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Admin</CardTitle>
          </CardHeader>
          <CardContent>
            {admin ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">{admin.first_name} {admin.last_name}</div>
                  <div className="text-sm text-gray-600">{admin.email}</div>
                </div>
                <div className="flex gap-3">
                  <div className="relative">
                    <div className="flex">
                      <Button
                        variant="outline"
                        onClick={downloadAgreementPdf}
                        disabled={downloadingAgreement || !adminId || currentAgreements.length === 0}
                        className="rounded-r-none"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        {downloadingAgreement ? 'Downloading…' : currentAgreementPdfLabel}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-l-none px-2"
                        disabled={currentAgreements.length === 0}
                        onClick={() => setShowAgreementsDropdown((v: boolean) => !v)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" /></svg>
                      </Button>
                    </div>
                    {showAgreementsDropdown && currentAgreements.length > 0 && (
                      <div
                        className="absolute right-0 mt-2 w-56 max-h-64 overflow-auto bg-white border rounded shadow-lg z-50"
                        style={{ top: '100%', minWidth: 200 }}
                      >
                        {currentAgreements.map((agreement) => (
                          <div
                            key={agreement.id}
                            className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${currentSelectedAgreement?.id === agreement.id ? 'bg-gray-100 font-semibold' : ''}`}
                            onClick={() => {
                              selectAgreement(agreement);
                              setShowAgreementsDropdown(false);
                            }}
                          >
                            {agreement.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline">{admin.role}</Badge>
                  {admin.plan_name && <Badge variant="secondary">{admin.plan_name} {admin.plan_type ? `(${admin.plan_type})` : ''}</Badge>}
                </div>
              </div>
            ) : loading ? (
              <div className="text-gray-500">Loading admin…</div>
            ) : (
              <div className="text-red-600">{adminError || 'Admin not found.'}</div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Agreement History Card */}
  <Card className="lg:col-span-2">
    <CardHeader>
      <CardTitle>Agreement History</CardTitle>
    </CardHeader>
    <CardContent>
      <Tabs value={activeAgreementTab} onValueChange={(value) => setActiveAgreementTab(value as AgreementHistoryTab)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="admin-contracts">Admin Contracts</TabsTrigger>
          <TabsTrigger value="score-machine-elite">Score Machine Elite</TabsTrigger>
        </TabsList>

        <TabsContent value="admin-contracts" className="space-y-3">
          {adminAgreements.length === 0 && (
            <div className="text-gray-500">{getEmptyAgreementHistoryMessage()}</div>
          )}
          {adminAgreements.map((agreement) => (
            <div
              key={agreement.id}
              className={`flex items-start justify-between gap-4 border rounded p-3 ${selectedAdminAgreement?.id === agreement.id ? 'border-gray-900 bg-gray-50' : ''}`}
            >
              <div className="space-y-2">
                <div className="font-semibold">{agreement.title}</div>
                <div className="text-gray-600 text-sm line-clamp-2 max-w-xl">{agreement.content || 'No agreement content stored for this contract.'}</div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Badge variant="outline" className="capitalize">{getAgreementStatusLabel(agreement.status)}</Badge>
                  <span>{getAgreementTimestampLabel(agreement)}</span>
                </div>
                {selectedAdminAgreement?.id === agreement.id && renderAgreementSignaturePreview(agreement)}
              </div>
              <Button variant={selectedAdminAgreement?.id === agreement.id ? 'default' : 'outline'} onClick={() => setSelectedAdminAgreement(agreement)}>
                {selectedAdminAgreement?.id === agreement.id ? 'Selected' : 'Select'}
              </Button>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="score-machine-elite" className="space-y-3">
          {tsmEliteAgreements.length === 0 && (
            <div className="text-gray-500">{getEmptyAgreementHistoryMessage()}</div>
          )}
          {tsmEliteAgreements.map((agreement) => (
            <div
              key={agreement.id}
              className={`flex items-start justify-between gap-4 border rounded p-3 ${selectedTsmEliteAgreement?.id === agreement.id ? 'border-gray-900 bg-gray-50' : ''}`}
            >
              <div className="space-y-2">
                <div className="font-semibold">{agreement.title}</div>
                <div className="text-gray-600 text-sm line-clamp-2 max-w-xl">{agreement.content || 'No agreement content stored for this Score Machine Elite template.'}</div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Badge variant="outline" className="capitalize">{getAgreementStatusLabel(agreement.status)}</Badge>
                  <span>{getAgreementTimestampLabel(agreement)}</span>
                </div>
                {selectedTsmEliteAgreement?.id === agreement.id && renderAgreementSignaturePreview(agreement)}
              </div>
              <Button variant={selectedTsmEliteAgreement?.id === agreement.id ? 'default' : 'outline'} onClick={() => setSelectedTsmEliteAgreement(agreement)}>
                {selectedTsmEliteAgreement?.id === agreement.id ? 'Selected' : 'Select'}
              </Button>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </CardContent>
  </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>Transactions</CardTitle>
              <Button variant="outline" onClick={exportTransactions} disabled={transactions.length === 0}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Plan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t) => (
                      <TableRow key={`${t.id}-${t.created_at}`}>
                        <TableCell>{t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</TableCell>
                        <TableCell><Badge className="capitalize" variant="outline">{t.status || '—'}</Badge></TableCell>
                        <TableCell>{typeof t.amount === 'number' ? `$${Number(t.amount).toFixed(2)}` : '—'}</TableCell>
                        <TableCell>{t.payment_method || '—'}</TableCell>
                        <TableCell>{t.plan_name || '—'}</TableCell>
                      </TableRow>
                    ))}
                    {transactions.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-gray-500">No transactions</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>Clients</CardTitle>
              <Button variant="outline" onClick={exportClients} disabled={clients.length === 0}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.first_name} {c.last_name}</TableCell>
                        <TableCell>{c.email}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{c.status}</Badge></TableCell>
                        <TableCell>{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</TableCell>
                      </TableRow>
                    ))}
                    {clients.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-gray-500">No clients</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Activity Logs</CardTitle>
            <Button variant="outline" onClick={exportActivityLogs} disabled={activities.length === 0}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.created_at ? new Date(a.created_at).toLocaleString() : '—'}</TableCell>
                      <TableCell className="capitalize">{a.activity_type}</TableCell>
                      <TableCell>{a.description}</TableCell>
                      <TableCell>{a.ip_address || '—'}</TableCell>
                    </TableRow>
                  ))}
                  {activities.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-gray-500">No activity</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}
