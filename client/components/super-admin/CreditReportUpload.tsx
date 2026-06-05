import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Textarea } from '@/components/ui/textarea';
import { superAdminApi, creditReportScraperApi } from '@/lib/api';
import { FileText, CheckCircle, AlertTriangle } from 'lucide-react';

const CreditReportUpload: React.FC = () => {
  const [admins, setAdmins] = useState<any[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('');
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [jsonText, setJsonText] = useState<string>('');
  const [experianScore, setExperianScore] = useState<string>('');
  const [equifaxScore, setEquifaxScore] = useState<string>('');
  const [transunionScore, setTransunionScore] = useState<string>('');
  const [creditScore, setCreditScore] = useState<string>('');
  const [reportDate, setReportDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ message: string; path?: string } | null>(null);
  const [adminSelectOpen, setAdminSelectOpen] = useState(false);
  const [clientSelectOpen, setClientSelectOpen] = useState(false);

  const adminMap = useMemo(() => {
    const map: Record<string, any> = {};
    admins.forEach((a) => { map[String(a.id)] = a; });
    return map;
  }, [admins]);

  useEffect(() => {
    (async () => {
      try {
        const res = await superAdminApi.getAdminProfiles({ is_active: 'true', access_level: 'admin', limit: 'all' as any });
        const data = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
        setAdmins(data);
      } catch {
        setAdmins([]);
      }
      try {
        const p = await creditReportScraperApi.getPlatforms();
        const list = Array.isArray(p.data?.platforms) ? p.data.platforms : [];
        setPlatforms(list);
      } catch {
        setPlatforms(['identityiq', 'myfreescorenow']);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!selectedAdminId) { setClients([]); return; }
      const admin = adminMap[selectedAdminId];
      try {
        const res = await superAdminApi.getClients({ limit: 'all' as any, user_id: admin?.id });
        const data = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
        setClients(data);
      } catch {
        setClients([]);
      }
    })();
  }, [selectedAdminId, adminMap]);

  const toInt = (s: string): number | undefined => {
    if (!s) return undefined;
    const n = parseInt(s, 10);
    return isNaN(n) ? undefined : n;
  };

  const handleUpload = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (!selectedAdminId || !selectedClientId || !selectedPlatform || !jsonText) {
        setError('Please select admin, client, platform and paste JSON');
        return;
      }
      let parsed;
      try {
        parsed = JSON.parse(jsonText);
      } catch (e: any) {
        setError('Invalid JSON');
        return;
      }
      const res = await superAdminApi.uploadCreditReport({
        admin_id: parseInt(selectedAdminId, 10),
        client_id: parseInt(selectedClientId, 10),
        platform: selectedPlatform,
        report_json: parsed,
        experian_score: toInt(experianScore),
        equifax_score: toInt(equifaxScore),
        transunion_score: toInt(transunionScore),
        credit_score: toInt(creditScore),
        report_date: reportDate || undefined,
        notes: notes || undefined,
      });
      const path = res.data?.data?.report_path || res.data?.report_path;
      setSuccess({ message: 'Uploaded successfully', path });
      setJsonText('');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Upload Credit Report JSON</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
          <div>
            <Popover open={adminSelectOpen} onOpenChange={setAdminSelectOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between">
                  {selectedAdminId
                    ? (() => { const a = admins.find((x: any) => String(x.id) === selectedAdminId); return a ? (`${a.first_name || ''} ${a.last_name || ''}`.trim() || a.email || String(a.id)) : 'Select Admin'; })()
                    : 'Select Admin'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-72">
                <Command>
                  <CommandInput placeholder="Search admin by email..." />
                  <CommandList>
                    <CommandEmpty>No admin found.</CommandEmpty>
                    <CommandGroup>
                      {admins.map((a: any) => (
                        <CommandItem
                          key={a.id}
                          value={`${a.email || ''} ${a.first_name || ''} ${a.last_name || ''}`.trim()}
                          onSelect={() => { setSelectedAdminId(String(a.id)); setAdminSelectOpen(false); }}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm">{`${a.first_name || ''} ${a.last_name || ''}`.trim() || a.email || String(a.id)}</span>
                            {a.email ? <span className="text-xs text-muted-foreground">{a.email}</span> : null}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Popover open={clientSelectOpen} onOpenChange={setClientSelectOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between">
                  {selectedClientId
                    ? (() => { const c = clients.find((x: any) => String(x.id) === selectedClientId); return c ? (`${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || String(c.id)) : 'Select Client'; })()
                    : 'Select Client'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-72">
                <Command>
                  <CommandInput placeholder="Search client by email..." />
                  <CommandList>
                    <CommandEmpty>No client found.</CommandEmpty>
                    <CommandGroup>
                      {clients.map((c: any) => (
                        <CommandItem
                          key={c.id}
                          value={`${c.email || ''} ${c.first_name || ''} ${c.last_name || ''}`.trim()}
                          onSelect={() => { setSelectedClientId(String(c.id)); setClientSelectOpen(false); }}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm">{`${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || String(c.id)}</span>
                            {c.email ? <span className="text-xs text-muted-foreground">{c.email}</span> : null}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger>
                <SelectValue placeholder="Select Platform" />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p === 'myfreescorenow' ? 'My Free Score Now' : p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Paste JSON Report</label>
          <Textarea value={jsonText} onChange={(e) => setJsonText(e.target.value)} rows={10} placeholder={'{ "Score": [...], "Accounts": [...] }'} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs">Experian Score</label>
            <Input type="number" value={experianScore} onChange={(e) => setExperianScore(e.target.value)} min={300} max={850} />
          </div>
          <div>
            <label className="text-xs">Equifax Score</label>
            <Input type="number" value={equifaxScore} onChange={(e) => setEquifaxScore(e.target.value)} min={300} max={850} />
          </div>
          <div>
            <label className="text-xs">TransUnion Score</label>
            <Input type="number" value={transunionScore} onChange={(e) => setTransunionScore(e.target.value)} min={300} max={850} />
          </div>
          <div>
            <label className="text-xs">Primary Credit Score</label>
            <Input type="number" value={creditScore} onChange={(e) => setCreditScore(e.target.value)} min={300} max={850} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs">Report Date</label>
            <Input type="datetime-local" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs">Notes</label>
            <Input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <Button onClick={handleUpload} disabled={loading || !selectedAdminId || !selectedClientId || !selectedPlatform || !jsonText}>
            {loading ? 'Saving...' : 'Save Report'}
          </Button>
          {success && (
            <div className="flex items-center text-green-600 text-sm gap-1">
              <CheckCircle className="h-4 w-4" />
              {success.message}{success.path ? ` – ${success.path}` : ''}
            </div>
          )}
          {error && (
            <div className="flex items-center text-red-600 text-sm gap-1">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CreditReportUpload;
