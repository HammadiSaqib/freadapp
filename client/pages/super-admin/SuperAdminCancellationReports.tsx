import React, { useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { superAdminApi } from '@/lib/api';
import { Search, Phone, CalendarClock, MessageSquareText, RefreshCw } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface CancellationReportRow {
  id: number;
  user_id: number;
  plan_name: string;
  plan_type: string;
  status: string;
  cancel_at_period_end: boolean;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  cancellation_reason_code?: string | null;
  cancellation_reason_text?: string | null;
  cancellation_date?: string | null;
  current_period_end?: string | null;
  days_since_cancellation?: number;
}

const reasonLabels: Record<string, string> = {
  affordability: "Can't afford it right now",
  guidance: "Needs help using it for the business",
  other: 'Other',
};

const formatDate = (value?: string | null) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getReasonText = (row: CancellationReportRow) => {
  const base = row.cancellation_reason_code ? reasonLabels[row.cancellation_reason_code] || row.cancellation_reason_code : 'No reason recorded';
  if (row.cancellation_reason_code === 'other' && row.cancellation_reason_text) {
    return row.cancellation_reason_text;
  }
  if (row.cancellation_reason_text && row.cancellation_reason_text !== base) {
    return `${base}: ${row.cancellation_reason_text}`;
  }
  return base;
};

export default function SuperAdminCancellationReports() {
  const [rows, setRows] = useState<CancellationReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [days, setDays] = useState('30');

  const fetchRows = async () => {
    try {
      setLoading(true);
      const response = await superAdminApi.getRecentCancellations({
        page,
        limit: 20,
        days: Number(days),
        search: searchTerm || undefined,
      });

      if (response.data?.success) {
        setRows(response.data.data || []);
        const total = response.data.pagination?.totalPages || response.data.pagination?.pages || 1;
        setTotalPages(Math.max(1, total));
      }
    } catch (error) {
      console.error('Error loading cancellation reports:', error);
      toast({
        title: 'Error',
        description: 'Failed to load cancellation reports',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [page, days]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPage(1);
      fetchRows();
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  return (
    <SuperAdminLayout
      title="Cancellation Reports"
      description="See who requested cancellation, when they asked, why they left, and how to contact them."
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total visible requests</CardDescription>
              <CardTitle>{rows.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Date window</CardDescription>
              <CardTitle>Last {days} days</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Follow-up priority</CardDescription>
              <CardTitle>{rows.filter((row) => (row.days_since_cancellation || 0) <= 7).length} in 7 days</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cancellation Outreach Queue</CardTitle>
            <CardDescription>
              Review the cancellation reason and contact the admin directly from this list.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by name, email, phone, or reason"
                  className="pl-9"
                />
              </div>
              <Select value={days} onValueChange={(value) => {
                setDays(value);
                setPage(1);
              }}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchRows}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admin</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Cancellation Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Follow Up</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center">Loading cancellation reports...</TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center">No cancellation requests found for this range.</TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{`${row.first_name || ''} ${row.last_name || ''}`.trim() || 'N/A'}</div>
                            <div className="text-sm text-muted-foreground">{row.email || 'N/A'}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {row.phone ? (
                            <a href={`tel:${row.phone.replace(/\D/g, '')}`} className="inline-flex items-center gap-2 text-ocean-blue hover:underline">
                              <Phone className="h-4 w-4" />
                              {row.phone}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{row.plan_name || 'N/A'}</div>
                            <div className="text-sm text-muted-foreground capitalize">{row.plan_type || 'N/A'}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-2 text-sm font-medium">
                              <CalendarClock className="h-4 w-4 text-muted-foreground" />
                              {formatDate(row.cancellation_date)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Access ends: {formatDate(row.current_period_end)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[360px]">
                          <div className="inline-flex items-start gap-2">
                            <MessageSquareText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{getReasonText(row)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={(row.days_since_cancellation || 0) <= 7 ? 'destructive' : 'secondary'}>
                            {(row.days_since_cancellation || 0) <= 0 ? 'Today' : `${row.days_since_cancellation} day${row.days_since_cancellation === 1 ? '' : 's'} ago`}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Page {page} of {totalPages}</div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page === totalPages}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}