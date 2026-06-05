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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DashboardLayout from "@/components/DashboardLayout";
import AddClientDialog from "@/components/AddClientDialog";
import EliteClients from "@/components/EliteClients";
// Force refresh to clear cached Select references - 1703123456789
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { clientsApi, creditReportScraperApi, contractsApi } from "@/lib/api";
import { buildAliasUrl } from "@/lib/hostRouting";
import {
  closeReportPullLoading,
  openReportPullLoading,
  showReportPullError,
} from "@/lib/reportPullFeedback";
import { useToast } from "@/hooks/use-toast";
import { useScoreMachineEliteStatus } from "@/hooks/useScoreMachineEliteStatus";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useAuthContext } from "@/contexts/AuthContext";
import { usePagePermissions } from "@/hooks/usePagePermissions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Search,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Calendar,
  UserPlus,
  Filter,
  Download,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Star,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUp,
  ArrowDown,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  Target,
  Plus,
  X,
  UserX,
  UserCheck,
  Lock,
  Unlock,
  RefreshCw,
  Copy,
} from "lucide-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  disputesActive: number;
  disputesTotal: number;
  progress: string;
  joinDate: string;
  totalPaid: number;
  nextPayment: string | null;
  notes: string;
  fundingStatus: string;
  change: number;
  amount: number;
  lastReportPull: string | null;
  platform?: string | null;
  manuallyAdded?: boolean;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Active":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "New":
      return "bg-green-100 text-green-800 border-green-200";
    case "In Progress":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Completed":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "On Hold":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getProgressIcon = (progress: string) => {
  switch (progress) {
    case "improving":
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    case "stable":
      return <CheckCircle className="h-4 w-4 text-blue-600" />;
    case "new":
      return <Clock className="h-4 w-4 text-yellow-600" />;
    case "improved":
      return <Star className="h-4 w-4 text-green-600" />;
    case "paused":
      return <AlertCircle className="h-4 w-4 text-gray-600" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-600" />;
  }
};

const getScoreChange = (current: number, previous: number) => {
  const change = current - previous;
  return {
    value: change,
    isPositive: change >= 0,
    icon: change >= 0 ? ArrowUp : ArrowDown,
    color: change >= 0 ? "text-green-600" : "text-red-600",
  };
  };
  
  export default function Clients() {
    const subscriptionStatus = useSubscriptionStatus();
    const { isEliteActive } = useScoreMachineEliteStatus();

  // Updated to use AddClientDialog component
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(() => {
    const loginStatus = searchParams.get('loginStatus');
    if (loginStatus === 'enabled') return 'login-enabled';
    if (loginStatus === 'disabled') return 'login-disabled';
    return 'all';
  });
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddClientManual, setShowAddClientManual] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fundingEstimateNoticeOpen, setFundingEstimateNoticeOpen] = useState(false);
  const [pendingFundingClientId, setPendingFundingClientId] = useState<number | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const { toast } = useToast();

  // Inline Add Client form state
  const [addPlatform, setAddPlatform] = useState<string>("");
  const [addEmail, setAddEmail] = useState<string>("");
  const [addPassword, setAddPassword] = useState<string>("");
  const [addSsnLast4, setAddSsnLast4] = useState<string>("");
  const [addAuthorization, setAddAuthorization] = useState(false);
  const [isAddingClient, setIsAddingClient] = useState<boolean>(false);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [showInlinePassword, setShowInlinePassword] = useState(false);
  const clientLoginUrl = buildAliasUrl("member", "/login");

  // Fetch clients from backend
  const fetchClients = async () => {
    try {
      setLoading(true);
      const statusParam = (() => {
        if (statusFilter === "all") return undefined;
        if (statusFilter.startsWith("login-")) return undefined;
        const map: Record<string, string> = {
          Active: "active",
          Inactive: "inactive",
          Completed: "completed",
          Pending: "pending",
          "On Hold": "on_hold",
        };
        return map[statusFilter] || undefined;
      })();

      const response = await clientsApi.getClients({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm || undefined,
        status: statusParam,
      });

      if (response.data?.error) {
        toast({
          title: "Error",
          description: "Failed to load clients",
          variant: "destructive",
        });
        return;
      }

      // Transform backend data to match component expectations
      const transformedClients = await Promise.all((response.data?.clients || []).map(async (client: any) => {
        const creditScore = client.credit_score || 650;
        const previousScore = client.previous_credit_score || 600;
        
        const notesText = String(client.notes || "").toLowerCase();
        const manuallyAdded =
          Boolean((client as any).manually_added) ||
          Boolean((client as any).manuallyAdded) ||
          Boolean((client as any).is_manual) ||
          notesText.includes("created manually") ||
          notesText.includes("added manually") ||
          notesText.includes("manually added") ||
          (!client.platform && !client.platform_email && !client.platform_password) ||
          client.platform === "other";
        const fundingStatus = manuallyAdded
          ? "Manually Added"
          : client.fundable_status === "fundable"
          ? "Fundable"
          : client.fundable_status === "not_fundable"
          ? "Not Fundable"
          : creditScore > 650
          ? "Fundable"
          : "Not Fundable";
        
        // Calculate funding amount based on credit score and other factors
        let fundingAmount = 0;
        if (fundingStatus === 'Fundable') {
          // Base amount on credit score: higher score = higher funding
          const baseAmount = Math.max(0, (creditScore - 650) * 200); // $200 per point above 650
          const randomMultiplier = 0.8 + Math.random() * 0.4; // 0.8 to 1.2 multiplier
          fundingAmount = Math.floor((baseAmount + 10000) * randomMultiplier); // Minimum $10k base
        }

        // Get last report pull date from report history
        let lastReportPull: string | null = null;
        try {
          const reportHistory = await creditReportScraperApi.getReportHistory(client.id);
          if (reportHistory.data?.success && reportHistory.data.data?.length > 0) {
            // Get the most recent report date
            const latestReport = reportHistory.data.data[0];
            lastReportPull = new Date(latestReport.created_at).toISOString().split('T')[0];
          }
        } catch (error) {
          console.log(`Could not fetch report history for client ${client.id}:`, error);
          // Fallback to mock data if API fails
          lastReportPull = Math.random() > 0.3 ? 
            new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : 
            null;
        }
        
        return {
          id: client.id,
          name: `${client.first_name} ${client.last_name}`,
          email: client.email,
          phone: client.phone,
          address: client.address || "No address provided",
          status: client.status === "active" ? "Active" :
                  client.status === "inactive" ? "Inactive" :
                  client.status === "completed" ? "Completed" : "On Hold",
          creditScore,
          previousScore,
          targetScore: (client.credit_score || 650) + 100,
          lastReport: new Date(client.updated_at).toISOString().split("T")[0],
          disputesActive: 0, // Will be populated when we integrate disputes
          disputesTotal: 0,
          progress: client.credit_score && client.previous_credit_score
            ? client.credit_score > client.previous_credit_score ? "improving" : "stable"
            : "new",
          joinDate: new Date(client.created_at).toISOString().split("T")[0],
          totalPaid: Math.floor(Math.random() * 5000) + 500, // Mock data for now
          nextPayment: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          notes: client.notes || "No notes available",
          // New fields with real logic
          fundingStatus,
          change: creditScore - previousScore, // Real credit score change
          amount: fundingAmount,
          lastReportPull,
          platform: client.platform || null,
          manuallyAdded,
        };
      }));

      setClients(transformedClients);
      setPagination(response.data?.pagination || pagination);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast({
        title: "Error",
        description: "Failed to load clients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle client login status toggle (enable/disable login)
  const handleToggleLoginStatus = async (clientId: number, currentStatus: string) => {
    try {
      // Toggle between active (login enabled) and inactive (login disabled)
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      
      await clientsApi.updateClient(clientId.toString(), { 
        status: newStatus
      });
      
      // Update the client in the local state
      setClients(prevClients => 
        prevClients.map(client => 
          client.id === clientId 
            ? { ...client, status: newStatus === 'active' ? 'Active' : 'Inactive' }
            : client
        )
      );
      
      toast({
        title: "Success",
        description: `Client login ${newStatus === 'active' ? 'enabled' : 'disabled'} successfully`,
      });
      
      // Refresh the data to update counts
      fetchClients();
    } catch (error) {
      console.error('Error updating client login status:', error);
      toast({
        title: "Error",
        description: "Failed to update client login status",
        variant: "destructive",
      });
    }
  };

  // Toggle all client logins for this admin (enable/disable)
  const handleToggleAllClientLogins = async (enable: boolean) => {
    try {
      const targetStatus = enable ? 'active' : 'inactive';
      const targetDisplay = enable ? 'Active' : 'Inactive';

      const ids = clients.map((c) => c.id);
      if (ids.length === 0) return;

      // Use bulk endpoint when available for efficiency
      try {
        const res = await fetch('/api/clients/bulk', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_ids: ids, updates: { status: targetStatus } }),
        });
        if (!res.ok) throw new Error(`Bulk update failed: ${res.status}`);
      } catch (bulkErr) {
        // Fallback to sequential updates if bulk fails
        console.warn('Bulk update failed, falling back to sequential updates:', bulkErr);
        for (const id of ids) {
          try {
            await clientsApi.updateClient(id.toString(), { status: targetStatus });
          } catch (err) {
            console.error(`Failed updating client ${id}:`, err);
          }
        }
      }

      // Update local state
      setClients((prev) => prev.map((c) => ({ ...c, status: targetDisplay })));

      toast({
        title: enable ? 'Enabled all logins' : 'Disabled all logins',
        description: enable ? 'All client logins enabled' : 'All client logins disabled',
      });

      // Refresh server data for accuracy
      fetchClients();
    } catch (error) {
      console.error('Error toggling all client logins:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle all client logins',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClient = async (clientId: number) => {
    try {
      const confirmed = window.confirm('Delete this client?');
      if (!confirmed) return;
      await clientsApi.deleteClient(clientId.toString());
      setClients((prev) => prev.filter((c) => c.id !== clientId));
      toast({
        title: 'Success',
        description: 'Client deleted successfully',
      });
      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete client',
        variant: 'destructive',
      });
    }
  };

  const handleEditClient = (clientId: number) => {
    navigate(`/clients/${clientId}`, { state: { openEdit: true } });
  };

  const handleViewReports = (client: ClientData) => {
    if (client.manuallyAdded) {
      toast({
        title: "No Reports Available",
        description: "This client was added manually and does not have a credit report JSON.",
      });
      return;
    }
    navigate(`/credit-report/${client.id}`);
  };

  const handleCopyClientLoginLink = async () => {
    try {
      await navigator.clipboard.writeText(clientLoginUrl);
      toast({ title: "Link copied", description: "Client login link copied to clipboard" });
    } catch (error) {
      toast({ title: "Copy failed", description: "Please copy the link manually", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchClients();
  }, [pagination.page, pagination.limit, searchTerm, statusFilter]);

  const goToDiyFundingForClient = (clientId: number) => {
    setPendingFundingClientId(clientId);
    setFundingEstimateNoticeOpen(true);
  };

  const acknowledgeFundingEstimateNotice = () => {
    const clientId = pendingFundingClientId;
    setFundingEstimateNoticeOpen(false);
    setPendingFundingClientId(null);
    if (clientId && clientId > 0) {
      navigate(`/funding/diy/personal`, { state: { clientId } });
    }
  };

  // Load available scraper platforms
  useEffect(() => {
    const loadPlatforms = async () => {
      try {
        const res = await creditReportScraperApi.getPlatforms?.();
        const list = res?.data?.platforms || [
          "identityiq",
          "smartcredit",
          "experian",
          "equifax",
          "transunion",
        ];
        setPlatforms(list);
      } catch (err) {
        setPlatforms([
          "identityiq",
          "smartcredit",
          "experian",
          "equifax",
          "transunion",
        ]);
      }
    };
    loadPlatforms();
  }, []);

  // Inline Add Client handler
  const handleAddClientInline = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingClient(true);
    let reportPullFeedbackOpen = false;

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to add a new client.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      if (!addPlatform || !addEmail || !addPassword) {
        toast({
          title: "Missing Information",
          description: "Platform, email and password are required.",
          variant: "destructive",
        });
        return;
      }
      if (!addAuthorization) {
        toast({
          title: "Authorization Required",
          description: "Please confirm authorization to use the credit report for educational analysis.",
          variant: "destructive",
        });
        return;
      }

      // Scrape credit report to extract personal info
  openReportPullLoading();
  reportPullFeedbackOpen = true;
      const scrapeResponse = await fetch("/api/credit-reports/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          platform: addPlatform,
          credentials: {
            username: addEmail,
            password: addPassword,
          },
          options: {
            saveHtml: false,
            takeScreenshots: false,
            ...(((addPlatform === "identityiq" || addPlatform === "myscoreiq") && addSsnLast4)
              ? { ssnLast4: addSsnLast4 }
              : {}),
          },
        }),
      });
      const contentType = scrapeResponse.headers.get("content-type") || "";
      let scraperData: any = null;
      if (scrapeResponse.ok) {
        if (contentType.includes("application/json")) {
          scraperData = await scrapeResponse.json();
        }
      } else {
        if (scrapeResponse.status === 401 || scrapeResponse.status === 403) {
          closeReportPullLoading();
          reportPullFeedbackOpen = false;
          toast({
            title: "Authentication Error",
            description: "Your session has expired. Please log in again.",
            variant: "destructive",
          });
          localStorage.removeItem("auth_token");
          navigate("/login");
          return;
        }
        if (contentType.includes("application/json")) {
          try {
            const errorData = await scrapeResponse.json();
            const msg = errorData?.message || "Failed to scrape credit report";
            if (scrapeResponse.status >= 500 || scrapeResponse.status === 504) {
              scraperData = null;
            } else {
              throw new Error(msg);
            }
          } catch {
            if (scrapeResponse.status >= 500 || scrapeResponse.status === 504) {
              scraperData = null;
            } else {
              throw new Error("Failed to scrape credit report");
            }
          }
        } else {
          try { await scrapeResponse.text(); } catch {}
          if (scrapeResponse.status >= 500 || scrapeResponse.status === 504) {
            scraperData = null;
          } else {
            throw new Error("Failed to scrape credit report");
          }
        }
      }
      if (!scraperData) {
        const start = Date.now();
        const timeoutMs = 120000;
        const intervalMs = 3000;
        let reportPath: string | null = null;
        while (Date.now() - start < timeoutMs && !reportPath) {
          const histResp = await fetch("/api/credit-reports/history", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (histResp.ok) {
            const histJson = await histResp.json();
            const list = (histJson?.data ?? histJson) as any[];
            if (Array.isArray(list) && list.length > 0) {
              const match = list.find((item: any) =>
                String(item?.platform || '').toLowerCase() === String(addPlatform || '').toLowerCase() &&
                String(item?.status || '').toLowerCase() === 'completed' &&
                item?.report_path
              );
              if (match) {
                reportPath = String(match.report_path);
              }
            }
          }
          if (!reportPath) {
            await new Promise((r) => setTimeout(r, intervalMs));
          }
        }
        if (reportPath) {
          const fileResp = await fetch(`/api/credit-reports/json-file?path=${encodeURIComponent(reportPath)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (fileResp.ok && (fileResp.headers.get("content-type") || "").includes("application/json")) {
            const fileJson = await fileResp.json();
            scraperData = { data: fileJson?.data ?? fileJson };
          }
        }
      }
      if (!scraperData) {
        throw new Error("Scrape is taking longer than expected. Please try again shortly.");
      }

      // Extract personal information with robust fallbacks
      let firstName = "";
      let lastName = "";
      let dateOfBirth = "";

      if (scraperData.data && scraperData.data.reportData) {
        const reportData = scraperData.data.reportData;

        if (reportData.Name && Array.isArray(reportData.Name) && reportData.Name.length > 0) {
          const primaryName = reportData.Name.find((n: any) => n.NameType === "Primary") || reportData.Name[0];
          firstName = primaryName.FirstName || "";
          lastName = primaryName.LastName || "";
        }

        if (reportData.DOB && Array.isArray(reportData.DOB) && reportData.DOB.length > 0) {
          const dobData = reportData.DOB[0];
          dateOfBirth = dobData.DOB || "";
        }

        if (!firstName && !lastName) {
          if (scraperData.data.Name && Array.isArray(scraperData.data.Name) && scraperData.data.Name.length > 0) {
            const primaryName = scraperData.data.Name.find((n: any) => n.NameType === "Primary") || scraperData.data.Name[0];
            firstName = primaryName.FirstName || "";
            lastName = primaryName.LastName || "";
          }
          if (scraperData.data.DOB && Array.isArray(scraperData.data.DOB) && scraperData.data.DOB.length > 0) {
            const dobData = scraperData.data.DOB[0];
            dateOfBirth = dobData.DOB || "";
          }
          if (!firstName && !lastName && reportData.reportData) {
            const nestedReportData = reportData.reportData;
            if (nestedReportData.Name && Array.isArray(nestedReportData.Name) && nestedReportData.Name.length > 0) {
              const primaryName = nestedReportData.Name.find((n: any) => n.NameType === "Primary") || nestedReportData.Name[0];
              firstName = primaryName.FirstName || "";
              lastName = primaryName.LastName || "";
            }
            if (nestedReportData.DOB && Array.isArray(nestedReportData.DOB) && nestedReportData.DOB.length > 0) {
              const dobData = nestedReportData.DOB[0];
              dateOfBirth = dobData.DOB || "";
            }
          }
        }
      }

      if (!firstName && !lastName && scraperData.data) {
        if (scraperData.data.Name && Array.isArray(scraperData.data.Name) && scraperData.data.Name.length > 0) {
          const primaryName = scraperData.data.Name.find((n: any) => n.NameType === "Primary") || scraperData.data.Name[0];
          firstName = primaryName.FirstName || "";
          lastName = primaryName.LastName || "";
        }
        if (scraperData.data.DOB && Array.isArray(scraperData.data.DOB) && scraperData.data.DOB.length > 0) {
          const dobData = scraperData.data.DOB[0];
          dateOfBirth = dobData.DOB || "";
        }
      }

      if (!firstName && !lastName) {
        throw new Error("Could not extract personal information from credit report. Please verify the credentials and try again.");
      }

      closeReportPullLoading();
      reportPullFeedbackOpen = false;

      const clientData = {
        first_name: firstName,
        last_name: lastName,
        email: addEmail,
        date_of_birth: dateOfBirth || undefined,
        status: "active" as const,
        platform: addPlatform,
        platform_email: addEmail,
        platform_password: addPassword,
        ...(addSsnLast4 ? { ssn_last_four: addSsnLast4 } : {}),
        notes: `Client created via credit report scraping from ${addPlatform}`,
      };

      const createResponse = await clientsApi.createClient(clientData);
      const createResponseData = createResponse?.data ?? createResponse;
      if (createResponseData?.error) {
        throw new Error(createResponseData.error);
      }

      const reusedExisting = createResponseData?.reusedExisting === true || createResponseData?.created === false;

      // Reset inline form
      setAddPlatform("");
      setAddEmail("");
      setAddPassword("");
      setAddSsnLast4("");
      setAddAuthorization(false);

      // Refresh client list
      await fetchClients();

      toast({
        title: "Success!",
        description: reusedExisting
          ? `Client ${firstName} ${lastName} already existed. A fresh credit report was added to the existing profile.`
          : `Client ${firstName} ${lastName} has been added successfully.`,
      });

      const clientId = createResponseData?.id;
      const clientName = `${firstName} ${lastName}`;
      if (clientId) {
        if (subscriptionStatus.hasActiveSubscription) {
          navigate(`/credit-report?clientId=${clientId}&clientName=${encodeURIComponent(clientName)}`);
        } else {
          navigate(`/clients/${clientId}`);
        }
      }
    } catch (error: any) {
      if (reportPullFeedbackOpen) {
        showReportPullError();
        reportPullFeedbackOpen = false;
      }
      if (error.response?.status === 403 && error.response?.data?.error === "Client quota exceeded") {
        const planLimits = error.response.data.planLimits;
        toast({
          title: "Client Quota Exceeded",
          description:
            error.response.data.message || `You have reached the maximum of ${planLimits?.maxClients || 1} client(s) allowed on your plan. Please upgrade to add more clients.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error Adding Client",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsAddingClient(false);
    }
  };

  // Handle client status toggle (disable/enable login)
  const handleToggleClientStatus = async (clientId: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'Active' ? 'inactive' : 'active';
      const displayStatus = newStatus === 'active' ? 'Active' : 'Inactive';
      
      await clientsApi.updateClient(clientId.toString(), { status: newStatus });
      
      // Update the client in the local state
      setClients(prevClients => 
        prevClients.map(client => 
          client.id === clientId 
            ? { ...client, status: displayStatus }
            : client
        )
      );
      
      toast({
        title: "Success",
        description: `Client ${newStatus === 'active' ? 'enabled' : 'disabled'} successfully`,
      });
    } catch (error) {
      console.error('Error updating client status:', error);
      toast({
        title: "Error",
        description: "Failed to update client status",
        variant: "destructive",
      });
    }
  };

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const filteredClients = clients.filter((c) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "login-enabled") return c.status === "Active";
    if (statusFilter === "login-disabled") return c.status === "Inactive";
    if (statusFilter === "New") {
      const d = new Date(c.joinDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }
    if (statusFilter === "Report Pull This Month") {
      if (!c.lastReportPull) return false;
      const d = new Date(c.lastReportPull);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }
    return c.status === statusFilter;
  });

  const statusCounts = {
    all: clients.length,
    "Login Enabled": clients.filter((c) => c.status === "Active").length,
    "Login Disabled": clients.filter((c) => c.status === "Inactive").length,
    New: clients.filter((c) => {
      // Filter clients added in current month
      const joinDate = new Date(c.joinDate);
      return joinDate.getMonth() === currentMonth && joinDate.getFullYear() === currentYear;
    }).length,
    "Report Pull This Month": clients.filter((c) => {
      // Filter clients with report pulls this month
      if (!c.lastReportPull) return false;
      const reportDate = new Date(c.lastReportPull);
      return reportDate.getMonth() === currentMonth && reportDate.getFullYear() === currentYear;
    }).length,
  };

  if (isEliteActive) {
    return (
      <DashboardLayout
        title="Client Management"
        description="Manage your clients and their funding progress"
        onAddClient={() => setShowAddClient(true)}
      >
        <EliteClients
          clients={clients}
          filteredClients={filteredClients}
          statusCounts={statusCounts}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          pagination={pagination}
          setPagination={setPagination}
          handleDeleteClient={handleDeleteClient}
          handleToggleLoginStatus={handleToggleLoginStatus}
          setShowAddClient={setShowAddClient}
          setShowAddClientManual={setShowAddClientManual}
          clientLoginUrl={clientLoginUrl}
          handleCopyClientLoginLink={async () => {
            try {
              await navigator.clipboard.writeText(clientLoginUrl);
              toast({
                title: "Link Copied",
                description: "Client login link copied to clipboard",
              });
            } catch (err) {
              toast({
                title: "Failed to Copy",
                description: "Could not copy link to clipboard",
                variant: "destructive",
              });
            }
          }}
          navigate={navigate}
          loading={loading}
        />

        <AddClientDialog
          isOpen={showAddClient}
          onClose={() => setShowAddClient(false)}
          onSuccess={() => {
            fetchClients();
          }}
        />
        <AddClientDialog
          isOpen={showAddClientManual}
          onClose={() => setShowAddClientManual(false)}
          onSuccess={() => {
            fetchClients();
          }}
          mode="manual"
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Client Management"
      description="Manage your clients and their funding progress"
      onAddClient={() => setShowAddClient(true)}
    >
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {Object.entries(statusCounts).map(([status, count]) => (
          <Card
            key={status}
            className={`border-0 shadow-md cursor-pointer transition-all duration-200 hover:shadow-lg ${
              statusFilter === (status === "Login Enabled" ? "login-enabled" : status === "Login Disabled" ? "login-disabled" : status)
                ? "gradient-primary text-white"
                : "bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm hover:bg-gradient-soft"
            }`}
            onClick={() =>
              setStatusFilter(
                status === "Login Enabled"
                  ? "login-enabled"
                  : status === "Login Disabled"
                  ? "login-disabled"
                  : status
              )
            }
          >
            <CardContent className="p-4 text-center">
              <div
                className={`text-2xl font-bold ${
                  statusFilter === (status === "Login Enabled" ? "login-enabled" : status === "Login Disabled" ? "login-disabled" : status)
                    ? "text-white"
                    : "gradient-text-primary"
                }`}
              >
                {count}
              </div>
              <div
                className={`text-xs ${
                  statusFilter === (status === "Login Enabled" ? "login-enabled" : status === "Login Disabled" ? "login-disabled" : status)
                    ? "text-white/80"
                    : "text-muted-foreground"
                }`}
              >
                {status === "all" ? "Total" : status}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="gradient-text-primary text-2xl">
                Client Database
              </CardTitle>
              <CardDescription>
                Comprehensive view of all your funding clients
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-6">
            <div className="flex-1 min-w-[260px]">
              <Label htmlFor="client-login-link" className="text-sm font-medium">Client Login Link</Label>
              <div className="mt-2 flex items-center gap-2">
                <Input id="client-login-link" value={clientLoginUrl} readOnly className="font-mono text-xs bg-slate-50 dark:bg-slate-800" />
                <Button size="sm" className="gradient-primary hover:opacity-90" onClick={handleCopyClientLoginLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients by name, email, or phone..."
                className="pl-10 bg-gradient-light border-border/40"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap items-start">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                  <SelectItem value="login-enabled">Login Enabled</SelectItem>
                  <SelectItem value="login-disabled">Login Disabled</SelectItem>
                </SelectContent>
              </Select>
            <Button size="sm" onClick={() => setShowAddClientManual(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Client Manually
            </Button>

              {/* Inline Add Client form */}
              <form className="flex items-center gap-2 flex-wrap" onSubmit={handleAddClientInline}>
                <Select value={addPlatform} onValueChange={setAddPlatform}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="myfreescorenow">MyFreeScoreNow</SelectItem>
                    <SelectItem value="identityiq">IdentityIQ</SelectItem>
                    <SelectItem value="myscoreiq">MyScoreIQ</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className="w-full sm:w-48"
                  placeholder="Platform Email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                />
                <div className="relative w-full sm:w-44">
                  <Input
                    className="w-full pr-10"
                    type={showInlinePassword ? "text" : "password"}
                    placeholder="Platform Password"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowInlinePassword(!showInlinePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showInlinePassword ? "Hide password" : "Show password"}
                    aria-pressed={showInlinePassword}
                    title={showInlinePassword ? "Hide password" : "Show password"}
                  >
                    {showInlinePassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {(addPlatform === "identityiq" || addPlatform === "myscoreiq") && (
                  <Input
                    className="w-full sm:w-28"
                    placeholder="SSN Last 4"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    value={addSsnLast4}
                    onChange={(e) => setAddSsnLast4(e.target.value.replace(/[^0-9]/g, ""))}
                  />
                )}
                <div className="flex items-start space-x-2 w-full sm:w-auto">
                  <Checkbox
                    id="inline-authorization"
                    checked={addAuthorization}
                    onCheckedChange={(checked) => setAddAuthorization(checked === true)}
                  />
                  <Label htmlFor="inline-authorization" className="text-sm text-slate-600">
                    I confirm this is my client credit report and I am authorized to use for educational analysis.
                  </Label>
                </div>
                <Button type="submit" size="sm" disabled={isAddingClient}>
                  {isAddingClient ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>Add Client</>
                  )}
                </Button>
              </form>
            </div>
          </div>

          {/* Client Table */}
          <div className="rounded-lg border border-border/40">
            <div className="overflow-x-auto">
              <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="gradient-light">
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Funding Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Next Payment</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Report Pull</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xs text-muted-foreground">Logins</span>
                      <Switch
                        checked={clients.length > 0 && clients.every((c) => c.status === 'Active')}
                        onClick={(e) => e.stopPropagation()}
                        onCheckedChange={(checked) => handleToggleAllClientLogins(checked)}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        <span>Loading clients...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="text-muted-foreground">
                        No clients found matching your criteria
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredClients.map((client) => {
                  const scoreChange = getScoreChange(
                    client.creditScore,
                    client.previousScore,
                  );
                  const ChangeIcon = scoreChange.icon;
                  const progressPercent = Math.round(
                    ((client.creditScore - client.previousScore) /
                      (client.targetScore - client.previousScore)) *
                      100,
                  );

                  return (
                    <TableRow
                      key={client.id}
                      className="hover:bg-gradient-light/50 cursor-pointer"
                      onClick={() => navigate(`/clients/${client.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="gradient-primary text-white text-sm">
                              {client.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{client.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Client since{" "}
                              {new Date(client.joinDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Mail className="h-3 w-3 mr-1 text-muted-foreground" />
                            {client.email}
                          </div>
                          <div className="flex items-center text-sm">
                            <Phone className="h-3 w-3 mr-1 text-muted-foreground" />
                            {client.phone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStatusColor(client.status)}
                        >
                          {client.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge
                          variant="outline"
                          className={getStatusColor(client.fundingStatus || 'Unknown')}
                        >
                          {client.fundingStatus || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="text-sm">
                          {client.nextPayment ? (
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span>
                                {new Date(
                                  client.nextPayment,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              Completed
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="text-sm">
                          {client.lastReportPull ? (
                            <div className="flex items-center space-x-1">
                              <FileText className="h-3 w-3 text-muted-foreground" />
                              <span>
                                {new Date(
                                  client.lastReportPull,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              Never
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={client.status === 'Active'}
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={() => {
                            handleToggleLoginStatus(client.id, client.status.toLowerCase());
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          {client.manuallyAdded && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                goToDiyFundingForClient(client.id);
                              }}
                            >
                              <CreditCard className="h-4 w-4 mr-2" />
                              DIY Funding
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/clients/${client.id}`);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditClient(client.id);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Client
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewReports(client);
                                }}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                View Reports
                              </DropdownMenuItem>
                              {client.manuallyAdded && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    goToDiyFundingForClient(client.id);
                                  }}
                                >
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  DIY Funding
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleLoginStatus(client.id, client.status.toLowerCase());
                                }}
                                className={client.status === 'Inactive' ? 'text-green-600' : 'text-orange-600'}
                              >
                                {client.status === 'Inactive' ? (
                                  <>
                                    <Unlock className="h-4 w-4 mr-2" />
                                    Enable Login
                                  </>
                                ) : (
                                  <>
                                    <Lock className="h-4 w-4 mr-2" />
                                    Disable Login
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Client
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              </Table>
            </div>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Page {pagination.page} of {Math.max(1, pagination.pages || Math.ceil((pagination.total || 0) / (pagination.limit || 20)))}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: Math.max(1, prev.page - 1),
                  }))
                }
                disabled={pagination.page <= 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: Math.min(
                      Math.max(1, prev.pages || Math.ceil((prev.total || 0) / (prev.limit || 20))),
                      prev.page + 1
                    ),
                  }))
                }
                disabled={
                  pagination.page >=
                  Math.max(1, pagination.pages || Math.ceil((pagination.total || 0) / (pagination.limit || 20)))
                }
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows per page</span>
                <Select
                  value={String(pagination.limit)}
                  onValueChange={(val) =>
                    setPagination((prev) => ({
                      ...prev,
                      limit: parseInt(val, 10) || 20,
                      page: 1,
                    }))
                  }
                >
                  <SelectTrigger className="w-[90px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Dialog
        open={fundingEstimateNoticeOpen}
        onOpenChange={(open) => {
          setFundingEstimateNoticeOpen(open);
          if (!open) setPendingFundingClientId(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Funding Estimate Notice</DialogTitle>
            <DialogDescription>
              Funding amounts and terms shown are estimates generated by our software.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              These figures are not a guarantee of approval, rates, limits, or final terms. Banks and lenders make the final
              decision based on their underwriting criteria.
            </p>
            <p>Please verify all details with the lender before applying.</p>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={acknowledgeFundingEstimateNotice}>Acknowledge &amp; Continue</Button>
          </div>
        </DialogContent>
      </Dialog>
      <AddClientDialog
        isOpen={showAddClient}
        onClose={() => setShowAddClient(false)}
        onSuccess={() => {
          fetchClients();
        }}
      />
      <AddClientDialog
        isOpen={showAddClientManual}
        onClose={() => setShowAddClientManual(false)}
        onSuccess={() => {
          fetchClients();
        }}
        mode="manual"
      />
    </DashboardLayout>
  );
}
