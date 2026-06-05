import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FundingManagerLayout from "@/components/FundingManagerLayout";
import { clientsApi, creditReportScraperApi } from "@/lib/api";
import { extractCreditScores } from "@/lib/creditReportFormatter";
import { useToast } from "@/hooks/use-toast";
import { Users, Search, Eye } from "lucide-react";

// Type definitions for client data
type ClientData = {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: string;
  creditScore: number;
  previousScore: number;
  targetScore: number;
  lastReport: string;
  progress: string;
  joinDate: string;
  totalPaid: number;
  nextPayment: string | null;
  notes: string;
  fundabilityScore: number;
  isFundable: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  estimatedFunding: number;
};

// Funding Request type (subset)
type FundingRequest = {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  user_email: string;
  home_phone?: string;
  mobile_phone?: string;
  business_email?: string;
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  requested_date: string;
};

type AppliedClient = {
  userId: number;
  name: string;
  email: string;
  phone?: string;
  scores: { equifax: string; transunion: string; experian: string };
  fundingStatus: 'pending' | 'approved' | 'rejected' | 'under_review';
};

const getStatusBadge = (status: string) => {
  const statusConfig = {
    pending: { color: "bg-yellow-100 text-yellow-800" },
    approved: { color: "bg-green-100 text-green-800" },
    rejected: { color: "bg-red-100 text-red-800" },
    under_review: { color: "bg-blue-100 text-blue-800" },
  } as const;

  const config = statusConfig[status as keyof typeof statusConfig] || { color: "bg-gray-100 text-gray-800" };
  return <Badge className={`${config.color}`}>{status.replace("_", " ").toUpperCase()}</Badge>;
};

export default function FundingManagerClients() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedClients, setAppliedClients] = useState<AppliedClient[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch applied clients (users with funding requests) and their latest report scores
  const fetchAppliedClients = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to view applied clients.",
          variant: "destructive",
        });
        return;
      }

      // Fetch funding requests
      const frResponse = await fetch(`/api/funding-requests`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!frResponse.ok) {
        throw new Error(`Failed to fetch funding requests: ${frResponse.status} ${frResponse.statusText}`);
      }

      const frData = await frResponse.json();
      const requests: FundingRequest[] = frData.requests || [];

      // Group requests by user and pick the latest request for status
      const byUser: Record<number, FundingRequest[]> = {};
      for (const req of requests) {
        if (!byUser[req.user_id]) byUser[req.user_id] = [];
        byUser[req.user_id].push(req);
      }

      // Fetch all clients (funding managers can see all); build indexes
      const clientsResp = await clientsApi.getClients({ page: 1, limit: 2000 });
      const allClients = clientsResp.data?.clients || [];
      const clientsById: Record<number, any> = {};
      const clientsByAdmin: Record<number, any[]> = {};
      for (const c of allClients) {
        const uid = Number(c.user_id);
        clientsById[Number(c.id)] = c;
        if (!clientsByAdmin[uid]) clientsByAdmin[uid] = [];
        clientsByAdmin[uid].push(c);
      }

      const normalizePhone = (p?: string) => (p || '').replace(/\D/g, '').replace(/^1/, '');

      // Build applied client list with report scores
      const applied: AppliedClient[] = await Promise.all(
        Object.keys(byUser).map(async (uidStr) => {
          const uid = Number(uidStr);
          const latest = byUser[uid].sort((a, b) => new Date(b.requested_date).getTime() - new Date(a.requested_date).getTime())[0];

          // Prefer using funding manager credit report to resolve the end client
          let displayName = `${latest.first_name} ${latest.last_name}`;
          // Prefer the end-client email captured in funding request; fallback to admin email
          let displayEmail = latest.business_email || latest.user_email || 'N/A';
          // Prefer phones from the funding request entry
          let displayPhone = latest.mobile_phone || latest.home_phone || 'N/A';
          let scores = { equifax: 'N/A', transunion: 'N/A', experian: 'N/A' };

          try {
            const fmResp = await creditReportScraperApi.getFundingManagerReport(String(uid));
            const fmData = fmResp.data?.data || {};
            const metadata = fmData.metadata || {};
            const reportData = fmData.reportData;

            if (metadata?.client_id) {
              const clientId = Number(metadata.client_id);
              const clientRecord = clientsById[clientId];
              displayName = metadata.client_name || displayName;
              displayEmail = metadata.client_email || displayEmail;
              displayPhone = clientRecord?.phone || displayPhone;

              if (reportData) {
                scores = extractCreditScores(reportData);
              } else {
                // Fallback: fetch latest history for this client to extract scores
                try {
                  const historyResp = await creditReportScraperApi.getReportHistory(clientId);
                  const historyList = historyResp.data?.data || historyResp.data || [];
                  const latestHistory = Array.isArray(historyList) ? historyList[0] : null;
                  if (latestHistory?.reportData) {
                    scores = extractCreditScores(latestHistory.reportData);
                  } else {
                    // If JSON not loaded, use inline score columns if present
                    if (latestHistory?.experian_score || latestHistory?.equifax_score || latestHistory?.transunion_score) {
                      scores = {
                        experian: String(latestHistory?.experian_score ?? 'N/A'),
                        equifax: String(latestHistory?.equifax_score ?? 'N/A'),
                        transunion: String(latestHistory?.transunion_score ?? 'N/A'),
                      } as any;
                    }
                  }
                } catch (err) {
                  console.warn(`No history available for client ${clientId}:`, err);
                }
              }
            }
          } catch (err) {
            // If funding manager endpoint fails, attempt heuristic match as a fallback
            const candidates = (clientsByAdmin[uid] || []) as any[];
            const reqPhones = [latest.mobile_phone, latest.home_phone].map(normalizePhone).filter(Boolean);
            const match = candidates.find((c) => {
              const cPhone = normalizePhone(c.phone);
              const phoneMatches = reqPhones.length > 0 && reqPhones.includes(cPhone);
              const nameMatches = (
                (latest.first_name || '').trim().toLowerCase() === (c.first_name || '').trim().toLowerCase() &&
                (latest.last_name || '').trim().toLowerCase() === (c.last_name || '').trim().toLowerCase()
              );
              const emailMatches = !!latest.business_email && latest.business_email.trim().toLowerCase() === (c.email || '').trim().toLowerCase();
              return phoneMatches || nameMatches || emailMatches;
            });

            if (match?.id) {
              displayName = `${match.first_name || ''} ${match.last_name || ''}`.trim() || displayName;
              displayEmail = match.email || displayEmail;
              displayPhone = match.phone || displayPhone;
              try {
                const historyResp = await creditReportScraperApi.getReportHistory(Number(match.id));
                const historyList = historyResp.data?.data || historyResp.data || [];
                const latestHistory = Array.isArray(historyList) ? historyList[0] : null;
                if (latestHistory?.reportData) {
                  scores = extractCreditScores(latestHistory.reportData);
                }
              } catch (e) {
                console.warn(`Fallback history fetch failed for client ${match.id}:`, e);
              }
            } else {
              // Keep showing funding request details (name/phone/email) when client resolution fails
              console.warn(`Unable to resolve end client for user ${uid}; using funding request details`);
            }
          }

          return {
            userId: uid,
            name: displayName,
            email: displayEmail,
            phone: displayPhone,
            scores,
            fundingStatus: latest.status,
          };
        })
      );

      setAppliedClients(applied);

    } catch (error) {
      console.error("Error fetching clients:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load applied clients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppliedClients();
  }, []);

  const filteredApplied = appliedClients.filter(c => {
    const q = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  return (
    <FundingManagerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Applied Clients</h1>
          <p className="text-muted-foreground">Only clients with funding applications</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Applied Clients List</CardTitle>
            <CardDescription>Showing clients who have applied for funding</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search clients by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Email</th>
                    <th className="text-left p-3">Phone</th>
                    <th className="text-left p-3">Scores (TU/EQ/EX)</th>
                    <th className="text-left p-3">Funding Status</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8">Loading...</td>
                    </tr>
                  ) : filteredApplied.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8">No applied clients found</td>
                    </tr>
                  ) : (
                    filteredApplied.map((c) => (
                      <tr key={c.userId} className="border-b">
                        <td className="p-3 font-medium">{c.name}</td>
                        <td className="p-3 text-muted-foreground">{c.email}</td>
                        <td className="p-3">{c.phone || 'N/A'}</td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Badge variant="outline">TU {c.scores.transunion}</Badge>
                            <Badge variant="outline">EQ {c.scores.equifax}</Badge>
                            <Badge variant="outline">EX {c.scores.experian}</Badge>
                          </div>
                        </td>
                        <td className="p-3">{getStatusBadge(c.fundingStatus)}</td>
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/funding-manager/credit-report/${c.userId}`)}
                            title="View Credit Report"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </FundingManagerLayout>
  );
}