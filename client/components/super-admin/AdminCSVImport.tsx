import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { superAdminApi } from '../../lib/api';
import { UploadCloud } from 'lucide-react';

const AdminCSVImport: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await superAdminApi.importAdminsCSV(file);
      setResults(res.data?.results || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Import Admins via CSV</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <Button onClick={handleImport} disabled={!file || loading}>{loading ? 'Importing...' : 'Import'}</Button>
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {results.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>User ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{r.email || ''}</TableCell>
                    <TableCell>{r.status || ''}</TableCell>
                    <TableCell>{r.user_id || ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="flex items-center text-xs text-slate-600 gap-2">
          <UploadCloud className="h-4 w-4" />
          <span>CSV columns: Company Name, Refer By, Admin Code, Service Level, Phone, Email, Active, Created, Last Login, Last Payment, stripe_subscription_id, stripe_customer_id, Invoice Id, Payment ID, Plan Name, Plan Price</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminCSVImport;