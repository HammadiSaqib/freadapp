import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { superAdminApi } from '@/lib/api';
import { Download } from 'lucide-react';

const ClientCSVImport: React.FC = () => {
  const [admins, setAdmins] = useState<any[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [adminSelectOpen, setAdminSelectOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await superAdminApi.getAdminProfiles({ is_active: 'true', access_level: 'admin', limit: 'all' as any });
        const data = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
        setAdmins(data);
      } catch (e: any) {
        setAdmins([]);
      }
    })();
  }, []);

  const handleImport = async () => {
    if (!file || !selectedAdminId) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const res = await superAdminApi.importClientsCSV(file, parseInt(selectedAdminId, 10));
      setResults(Array.isArray(res.data?.results) ? res.data.results : []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'First Name','Last Name','Email','Phone','DOB','Address','City','State','Zip','Status','Experian Score','Equifax Score','TransUnion Score','Platform','Platform Email','Platform Password'
    ];
    const sample = [
      'John','Doe','john@example.com','+15551234567','1990-01-01','123 Main St','Austin','TX','78701','active','650','645','640','smartcredit','john+smartcredit@example.com','secret123'
    ];
    const csv = [headers.join(','), sample.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'client_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Import Clients via CSV</CardTitle>
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
            <Input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleImport} disabled={!file || !selectedAdminId || loading}>{loading ? 'Importing...' : 'Import'}</Button>
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download CSV Template
            </Button>
          </div>
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {results.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Client ID</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{r.email || ''}</TableCell>
                    <TableCell>{r.status || ''}</TableCell>
                    <TableCell>{r.client_id || ''}</TableCell>
                    <TableCell>{r.error || ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="text-xs text-slate-600">
          CSV columns: First Name, Last Name, Email, Phone, DOB, Address, City, State, Zip, Status, Experian Score, Equifax Score, TransUnion Score, Platform, Platform Email, Platform Password
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientCSVImport;
