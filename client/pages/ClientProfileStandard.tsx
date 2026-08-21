import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clientsApi, creditReportScraperApi } from "@/lib/api";
import { runWithReportPullFeedback, showReportPullError } from "@/lib/reportPullFeedback";
import { useToast } from "@/hooks/use-toast";
import EditClientForm from "@/components/EditClientForm";
import FundingAgreementCard from "@/components/FundingAgreementCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Edit,
  FileText,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  CreditCard,
  User,
  History,
  Code,
  MessageCircle,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";

interface ClientData {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  ssn_last_four: string;
  date_of_birth: string;
  employment_status: string;
  annual_income: number;
  joinDate: string;
  status: "Active" | "Inactive" | "Pending" | "Suspended";
  credit_score: number;
  previous_credit_score: number;
  creditScores: {
    experian: number;
    equifax: number;
    transunion: number;
  };
  previousScores: {
    experian: number;
    equifax: number;
    transunion: number;
  };
  fundingEligibility: "fundable" | "not fundable";
  fundingProgress: number;
  disputesActive: number;
  disputesTotal: number;
  totalPaid: number;
  nextPayment?: string;
  notes: string;
  platform?: string;
  platform_email?: string;
  platform_password?: string;
  chaserInfo?: any;
  chatHistory?: Array<{
    id: string;
    message: string;
    sender: "client" | "admin";
    timestamp: string;
  }>;
  creditReportHistory?: Array<{
    date: string;
    score: number;
    bureau: string;
    changes: string[];
  }>;
  latestJsonData?: any;
}

export default function ClientProfileStandard() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [scoreHistory, setScoreHistory] = useState<any[]>([]);
  const [scoreHistoryLoading, setScoreHistoryLoading] = useState(false);
  const allowedClientProfileTabs = ["info", "history", "scores", "json"] as const;
  const getClientProfileTab = () => {
    const tab = String(searchParams.get("tab") || "").trim();
    return allowedClientProfileTabs.includes(tab as typeof allowedClientProfileTabs[number]) ? tab : "info";
  };
  const activeTab = getClientProfileTab();
  const [scrapingLoading, setScrapingLoading] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [jsonSearchTerm, setJsonSearchTerm] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const jsonContainerRef = useRef<HTMLPreElement>(null);
  const [fundingDialogOpen, setFundingDialogOpen] = useState(false);
  const [selectedFundingType, setSelectedFundingType] = useState<"personal" | "business" | "both" | "">("");
  const [selectedFundingMethod, setSelectedFundingMethod] = useState<"diy" | "dfy" | "">("");
  const [startWithType, setStartWithType] = useState<"personal" | "business">("personal");

  const handleClientProfileTabChange = (nextTab: string) => {
    if (!allowedClientProfileTabs.includes(nextTab as typeof allowedClientProfileTabs[number])) {
      return;
    }

    const params = new URLSearchParams(searchParams);
    params.set("tab", nextTab);
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    const state = location.state as { openEdit?: boolean } | null;
    if (state?.openEdit) {
      setShowEditForm(true);
    }
  }, [location.state]);

  const isManuallyAddedClient = useMemo(() => {
    if (!client) return false;
    const notesText = String(client.notes || "").toLowerCase();
    return (
      notesText.includes("created manually") ||
      notesText.includes("added manually") ||
      notesText.includes("manually added") ||
      (!client.platform && !client.platform_email && !client.platform_password) ||
      String(client.platform || "").toLowerCase() === "other"
    );
  }, [client]);

  const jsonString = useMemo(() => {
    try {
      return client?.latestJsonData ? JSON.stringify(client.latestJsonData, null, 2) : "";
    } catch {
      return "";
    }
  }, [client?.latestJsonData]);

  const { highlightedNodes, matchCount } = useMemo(() => {
    if (!jsonString) {
      return { highlightedNodes: jsonString, matchCount: 0 };
    }
    if (!jsonSearchTerm) {
      return { highlightedNodes: jsonString, matchCount: 0 };
    }
    const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = escapeRegExp(jsonSearchTerm);
    const regex = new RegExp(`(${pattern})`, "gi");
    const parts = jsonString.split(regex);
    const nodes = parts.map((part, index) => {
      if (index % 2 === 1) {
        const matchIndex = (index - 1) / 2;
        const isActive = matchIndex === currentMatchIndex;
        return (
          <mark
            key={index}
            className={`json-match ${isActive ? "bg-yellow-300 outline outline-2 outline-yellow-500" : "bg-yellow-200"} text-black`}
            data-index={matchIndex}
          >
            {part}
          </mark>
        );
      }
      return part;
    });
    const count = (jsonString.match(regex) || []).length;
    return { highlightedNodes: nodes, matchCount: count };
  }, [jsonString, jsonSearchTerm, currentMatchIndex]);

  const scrollToMatch = (index: number) => {
    const container = jsonContainerRef.current;
    if (!container) return;
    const marks = container.querySelectorAll<HTMLElement>("mark.json-match");
    if (!marks.length) return;
    const target = marks[Math.max(0, Math.min(index, marks.length - 1))];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [jsonSearchTerm]);

  useEffect(() => {
    if (matchCount > 0) {
      scrollToMatch(currentMatchIndex);
    }
  }, [currentMatchIndex, matchCount]);

  const handleScrapeNewReport = async () => {
    if (!client) return;

    if (!client.platform || !client.platform_email || !client.platform_password) {
      toast({
        title: "Missing Credentials",
        description: "Client credentials are not configured. Please update client profile with platform credentials.",
        variant: "destructive",
      });
      return;
    }

    setScrapingLoading(true);
    try {
      const platformLower = String(client.platform || "").toLowerCase();
      const requiresSsn = platformLower === "identityiq" || platformLower === "myscoreiq";
      const ssn = client.ssn_last_four || "";
      if (requiresSsn && (!ssn || String(ssn).length !== 4)) {
        toast({
          title: "SSN Last 4 Required",
          description: "Please set SSN Last 4 on the client profile for IdentityIQ/MyScoreIQ.",
          variant: "destructive",
        });
        setScrapingLoading(false);
        return;
      }

      const response = await runWithReportPullFeedback(() =>
        creditReportScraperApi.scrapeReport({
          platform: client.platform,
          credentials: {
            username: client.platform_email,
            password: client.platform_password,
          },
          options: {
            ...(requiresSsn ? { ssnLast4: ssn } : {}),
          },
          clientId: client.id,
        }),
      );
      if ((response as any)?.data?.error) {
        showReportPullError();
        throw new Error((response as any).data.error);
      }

      toast({
        title: "Report Scraping Started",
        description: "Credit report scraping has been initiated successfully.",
      });

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Error scraping report:", error);
      toast({
        title: "Scraping Failed",
        description:
          (error as any)?.response?.data?.message ||
          (error instanceof Error ? error.message : "Failed to start credit report scraping. Please try again."),
        variant: "destructive",
      });
    } finally {
      setScrapingLoading(false);
    }
  };

  const handleViewReports = () => {
    if (!clientId) return;
    if (isManuallyAddedClient) {
      toast({
        title: "No Reports Available",
        description: "This client was added manually and does not have a credit report JSON.",
      });
      return;
    }
    navigate(`/credit-report/${clientId}`);
  };

  const handleApplyFunding = () => {
    if (!client) return;
    setFundingDialogOpen(true);
  };

  const handleFundingContinue = () => {
    if (!clientId || !selectedFundingType || !selectedFundingMethod) return;
    const typeToUse = selectedFundingType === "both" ? startWithType : selectedFundingType;
    const base = selectedFundingMethod === "diy" ? "/funding/diy" : "/funding/apply";
    setFundingDialogOpen(false);
    navigate(`${base}/${typeToUse}?clientId=${clientId}`);
  };

  const handleEditClient = () => {
    setShowEditForm(true);
  };

  const fetchClientData = async () => {
    if (!clientId) return;

    try {
      setLoading(true);
      console.log("Starting to fetch client data for clientId:", clientId);

      console.log("Fetching client data...");
      const clientResponse = await clientsApi.getClient(clientId);
      console.log("Client response:", clientResponse);

      if (clientResponse.error) {
        console.error("Client response error:", clientResponse.error);
        toast({
          title: "Error",
          description: "Failed to load client data",
          variant: "destructive",
        });
        return;
      }

      console.log("Fetching credit report data...");
      let reportData = null;
      try {
        const reportResponse = await creditReportScraperApi.getClientReport(clientId);
        console.log("Report response:", reportResponse);
        if (reportResponse && reportResponse.data) {
          reportData = reportResponse.data;
        }
      } catch (error: any) {
        const status = error?.response?.status;
        if (status === 404) {
          console.log("No credit report found for this client. Continuing without JSON data.");
        } else {
          console.error("Error fetching credit report data:", error);
        }
      }

      console.log("Fetching credit report history...");
      let historyResponse;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        historyResponse = await Promise.race([
          creditReportScraperApi.getReportHistory(parseInt(clientId, 10)),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Request timeout")), 20000)),
        ]);

        clearTimeout(timeoutId);
        console.log("✅ Credit report history response received:", historyResponse);
      } catch (error) {
        console.error("❌ Error fetching credit report history:", error);
        historyResponse = null;
      }

      let creditReportHistory: any[] = [];
      let latestJsonData = null;

      console.log("Credit report history response:", historyResponse);

      if (historyResponse && historyResponse.data && historyResponse.data.success && historyResponse.data.data) {
        if (Array.isArray(historyResponse.data.data)) {
          creditReportHistory = historyResponse.data.data.map((report: any) => ({
            id: report.id,
            date: new Date(report.created_at).toISOString().split("T")[0],
            platform: report.platform,
            status: report.status,
            reportPath: report.report_path,
            reportName: report.report_path ? report.report_path.split(/[\\/]/).pop() : "Unknown Report",
            clientName: report.first_name && report.last_name ? `${report.first_name} ${report.last_name}` : "Unknown",
            reportData: report.reportData || null,
          }));
        }
      }

      try {
        console.log("🔍 DEBUG: Fetching client report data...");
        const clientReportResponse = await creditReportScraperApi.getClientReport(clientId);
        console.log("🔍 DEBUG: Client report response:", clientReportResponse);

        if (clientReportResponse && clientReportResponse.data && clientReportResponse.data.success) {
          latestJsonData = clientReportResponse.data.data.reportData;
          console.log("🔍 DEBUG: Successfully loaded latestJsonData:", latestJsonData ? Object.keys(latestJsonData) : "null");

          if (latestJsonData && latestJsonData.reportData) {
            console.log("🔍 DEBUG: Found reportData.Score:", latestJsonData.reportData.Score);
          }
        } else {
          console.log("🔍 DEBUG: No client report data found");
        }
      } catch (clientReportError) {
        console.error("🔍 DEBUG: Error fetching client report:", clientReportError);
      }

      console.log("Transforming client data...");

      const clientData = clientResponse.data;

      let extractedScores = {
        experian: 0,
        equifax: 0,
        transunion: 0,
      };

      let extractedPreviousScores = {
        experian: 0,
        equifax: 0,
        transunion: 0,
      };

      console.log("🔍 DEBUG: Checking latestJsonData:", latestJsonData);
      console.log("🔍 DEBUG: latestJsonData keys:", latestJsonData ? Object.keys(latestJsonData) : "null");

      let scoreArray = null;

      if (latestJsonData) {
        if (latestJsonData.reportData && latestJsonData.reportData.Score) {
          scoreArray = latestJsonData.reportData.Score;
          console.log("🔍 DEBUG: Found scores in reportData.Score:", scoreArray);
        } else if (latestJsonData.Score) {
          scoreArray = latestJsonData.Score;
          console.log("🔍 DEBUG: Found scores in direct Score array:", scoreArray);
        } else if (Array.isArray(latestJsonData) && latestJsonData[0] && latestJsonData[0].BureauId) {
          scoreArray = latestJsonData;
          console.log("🔍 DEBUG: latestJsonData is the score array:", scoreArray);
        }

        if (scoreArray && Array.isArray(scoreArray)) {
          console.log("🔍 DEBUG: Processing score array:", scoreArray);

          scoreArray.forEach((scoreData: any) => {
            console.log("🔍 DEBUG: Processing score data:", scoreData);
            const bureauId = scoreData.BureauId;
            const score = parseInt(scoreData.Score, 10) || 0;

            console.log(`🔍 DEBUG: Bureau ${bureauId}, Score: ${score}`);

            if (bureauId === 1) {
              extractedScores.transunion = score;
              console.log("🔍 DEBUG: Set TransUnion score to:", score);
            } else if (bureauId === 2) {
              extractedScores.experian = score;
              console.log("🔍 DEBUG: Set Experian score to:", score);
            } else if (bureauId === 3) {
              extractedScores.equifax = score;
              console.log("🔍 DEBUG: Set Equifax score to:", score);
            }
          });

          console.log("🔍 DEBUG: Final extracted scores:", extractedScores);
        } else {
          console.log("🔍 DEBUG: No valid score array found");
          try {
            const unified = latestJsonData.scores || latestJsonData.reportData?.scores;
            if (unified && typeof unified === "object") {
              extractedScores.experian = parseInt(unified.experian, 10) || extractedScores.experian;
              extractedScores.equifax = parseInt(unified.equifax, 10) || extractedScores.equifax;
              extractedScores.transunion = parseInt(unified.transunion, 10) || extractedScores.transunion;
              console.log("🔍 DEBUG: Extracted scores from unified object:", extractedScores);
            }
          } catch (error) {
            console.log("🔍 DEBUG: Unified scores fallback failed:", error);
          }
        }
      } else {
        console.log("🔍 DEBUG: No latestJsonData available");
      }

      if (
        extractedScores.experian === 0 &&
        extractedScores.equifax === 0 &&
        extractedScores.transunion === 0 &&
        historyResponse &&
        historyResponse.data &&
        Array.isArray(historyResponse.data.data) &&
        historyResponse.data.data.length > 0
      ) {
        try {
          const latest = historyResponse.data.data[0];
          extractedScores.experian = parseInt(latest.experian_score, 10) || 0;
          extractedScores.equifax = parseInt(latest.equifax_score, 10) || 0;
          extractedScores.transunion = parseInt(latest.transunion_score, 10) || 0;
          console.log("🔍 DEBUG: Scores from history fallback:", extractedScores);
        } catch (error) {
          console.log("🔍 DEBUG: History scores fallback failed:", error);
        }
      }

      const transformedClient: ClientData = {
        id: clientData.id.toString(),
        first_name: clientData.first_name,
        last_name: clientData.last_name,
        name: `${clientData.first_name} ${clientData.last_name}`,
        email: clientData.email,
        phone: clientData.phone || "",
        address: clientData.address || "No address provided",
        ssn_last_four: clientData.ssn_last_four || "",
        date_of_birth: clientData.date_of_birth || "",
        employment_status: clientData.employment_status || "",
        annual_income: clientData.annual_income || 0,
        credit_score: clientData.credit_score || 0,
        previous_credit_score: clientData.previous_credit_score || 0,
        joinDate: new Date(clientData.created_at).toISOString().split("T")[0],
        status:
          clientData.status === "active"
            ? "Active"
            : clientData.status === "inactive"
              ? "Inactive"
              : clientData.status === "completed"
                ? "Completed"
                : "Pending",
        creditScores: extractedScores,
        previousScores: extractedPreviousScores,
        fundingEligibility:
          clientData.fundable_status === "fundable"
            ? "fundable"
            : clientData.fundable_status === "not_fundable"
              ? "not fundable"
              : (reportData?.funding_eligible ? "fundable" : "not fundable"),
        fundingProgress: reportData?.funding_progress || 0,
        disputesActive: clientData.disputes_active || 0,
        disputesTotal: clientData.disputes_total || 0,
        totalPaid: clientData.total_paid || 0,
        nextPayment: clientData.next_payment,
        notes: clientData.notes || "",
        platform: clientData.platform,
        platform_email: clientData.platform_email,
        platform_password: clientData.platform_password,
        chaserInfo: reportData?.chaser_info || {},
        chatHistory: clientData.chat_history || [],
        creditReportHistory,
        latestJsonData: latestJsonData || reportData?.raw_data || null,
      };

      setClient(transformedClient);
    } catch (error) {
      console.error("Error fetching client data:", error);
      toast({
        title: "Error",
        description: "Failed to load client data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditSuccess = () => {
    setShowEditForm(false);
    fetchClientData();
  };

  const fetchScoreHistory = async () => {
    if (!clientId) return;

    try {
      setScoreHistoryLoading(true);
      console.log("Fetching score history for clientId:", clientId);

      const response = await creditReportScraperApi.getReportHistory(parseInt(clientId, 10));
      console.log("Score history response:", response);

      if (response && response.data && response.data.success && response.data.data) {
        const historyData = response.data.data;

        const scoreHistoryData = historyData
          .map((report: any) => ({
            id: report.id,
            date: new Date(report.created_at).toISOString().split("T")[0],
            platform: report.platform,
            status: report.status,
            scores: {
              experian: parseInt(report.experian_score, 10) || 0,
              equifax: parseInt(report.equifax_score, 10) || 0,
              transunion: parseInt(report.transunion_score, 10) || 0,
            },
            reportData: report.reportData,
          }))
          .filter((report: any) => report.scores.experian > 0 || report.scores.equifax > 0 || report.scores.transunion > 0);

        setScoreHistory(scoreHistoryData);
        console.log("Processed score history:", scoreHistoryData);
      }
    } catch (error) {
      console.error("Error fetching score history:", error);
      toast({
        title: "Error",
        description: "Failed to load score history",
        variant: "destructive",
      });
    } finally {
      setScoreHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, [clientId, toast]);

  useEffect(() => {
    if (activeTab === "scores" && clientId && !scoreHistory.length && !scoreHistoryLoading) {
      fetchScoreHistory();
    }
  }, [activeTab, clientId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "border-green-500/30 text-green-600 bg-green-50";
      case "Inactive":
        return "border-gray-500/30 text-gray-600 bg-gray-50";
      case "Pending":
        return "border-yellow-500/30 text-yellow-600 bg-yellow-50";
      case "Suspended":
        return "border-red-500/30 text-red-600 bg-red-50";
      default:
        return "border-gray-500/30 text-gray-600 bg-gray-50";
    }
  };

  const getProgressIcon = (progress: string) => {
    switch (progress) {
      case "Improving":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "Declining":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!client) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Client not found</h2>
          <p className="text-gray-600 mt-2">The requested client could not be found.</p>
          <Button onClick={() => navigate("/clients")} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clients
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={() => navigate("/clients")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Clients
            </Button>
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="gradient-primary text-white">
                  {client.name
                    .split(" ")
                    .map((namePart) => namePart[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold gradient-text-primary">{client.name}</h1>
                <p className="text-muted-foreground">Client since {new Date(client.joinDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center flex-wrap gap-2">
            <Badge variant="outline" className={getStatusColor(client.status)}>
              {client.status}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleEditClient}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Client
            </Button>
            <Button variant="default" size="sm" onClick={handleScrapeNewReport} disabled={scrapingLoading}>
              {scrapingLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {scrapingLoading ? "Fetching..." : "Fetch New Report"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="gradient-light border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Experian</p>
                  <p className="text-2xl font-bold gradient-text-primary">{client.creditScores.experian}</p>
                  <p className="text-xs text-muted-foreground">Previous: {client.previousScores.experian}</p>
                </div>
                <img src="/Experian_logo.svg.png" alt="Experian" className="h-8 w-auto" />
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-light border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Equifax</p>
                  <p className="text-2xl font-bold gradient-text-primary">{client.creditScores.equifax}</p>
                  <p className="text-xs text-muted-foreground">Previous: {client.previousScores.equifax}</p>
                </div>
                <img src="/Equifax_Logo.svg.png" alt="Equifax" className="h-8 w-auto" />
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-light border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">TransUnion</p>
                  <p className="text-2xl font-bold gradient-text-primary">{client.creditScores.transunion}</p>
                  <p className="text-xs text-muted-foreground">Previous: {client.previousScores.transunion}</p>
                </div>
                <img src="/TransUnion_logo.svg.png" alt="TransUnion" className="h-8 w-auto" />
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-light border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Funding Status</p>
                  <p className={`text-2xl font-bold ${client.fundingEligibility === "fundable" ? "text-green-600" : "text-red-600"}`}>
                    {client.fundingEligibility === "fundable" ? "Fundable" : "Not Fundable"}
                  </p>
                  <p className="text-xs text-muted-foreground">Progress: {client.fundingProgress}%</p>
                </div>
                {client.fundingEligibility === "fundable" ? (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                ) : (
                  <AlertCircle className="h-8 w-8 text-red-500" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <FundingAgreementCard clientId={client.id} isFundable={client.fundingEligibility === 'fundable'} source="admin_dashboard" />

        <Tabs value={activeTab} onValueChange={handleClientProfileTabChange} className="space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-2 min-w-[520px] sm:min-w-0">
              <TabsTrigger value="info" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Client Info</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center space-x-2">
                <History className="h-4 w-4" />
                <span>Credit Report History</span>
              </TabsTrigger>
              <TabsTrigger value="scores" className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>Score History</span>
              </TabsTrigger>
              <TabsTrigger value="json" className="flex items-center space-x-2">
                <Code className="h-4 w-4" />
                <span>JSON</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="info" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="gradient-light border-0">
                <CardHeader>
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{client.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{client.phone}</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="text-sm">{client.address}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="gradient-light border-0">
                <CardHeader>
                  <CardTitle className="text-lg">Funding Eligibility Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${client.fundingEligibility === "fundable" ? "text-green-600" : "text-red-600"}`}>
                      {client.fundingEligibility === "fundable" ? "Fundable" : "Not Fundable"}
                    </div>
                    <div className="text-sm text-muted-foreground">Current Status</div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Progress: {client.fundingProgress}%</span>
                    <span>Target: 100%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${client.fundingEligibility === "fundable" ? "bg-green-500" : "bg-red-500"}`}
                      style={{ width: `${Math.min(Math.max(client.fundingProgress, 0), 100)}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="gradient-light border-0">
                <CardHeader>
                  <CardTitle className="text-lg">Account Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Paid:</span>
                    <span className="font-medium">${client.totalPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Active Disputes:</span>
                    <span className="font-medium">{client.disputesActive}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Disputes:</span>
                    <span className="font-medium">{client.disputesTotal}</span>
                  </div>
                  {client.nextPayment && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Next Payment:</span>
                      <span className="font-medium">{new Date(client.nextPayment).toLocaleDateString()}</span>
                    </div>
                  )}
                  {client.chaserInfo && Object.keys(client.chaserInfo).length > 0 && (
                    <>
                      <div className="border-t pt-3 mt-3">
                        <h4 className="text-sm font-medium mb-2">Chaser Information</h4>
                        {Object.entries(client.chaserInfo).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-xs">
                            <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span>
                            <span className="font-medium">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {client.chatHistory && client.chatHistory.length > 0 && (
              <Card className="gradient-light border-0">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Chat History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {client.chatHistory.map((chat) => (
                      <div key={chat.id} className={`flex ${chat.sender === "admin" ? "justify-start" : "justify-end"}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${chat.sender === "admin" ? "bg-gray-100 text-gray-800" : "bg-blue-500 text-white"}`}>
                          <p className="text-sm">{chat.message}</p>
                          <p className="text-xs opacity-70 mt-1">{new Date(chat.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="gradient-light border-0">
              <CardHeader>
                <CardTitle className="text-lg">Client Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{client.notes}</p>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-4 border-t">
              <Button variant="outline" size="sm" onClick={handleEditClient}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Client
              </Button>
              <Button variant="outline" size="sm" onClick={handleViewReports}>
                <FileText className="h-4 w-4 mr-2" />
                View Reports
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card className="gradient-light border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg">Credit Report History</CardTitle>
                <Button
                  onClick={() => {
                    console.log("Fetch New Report button clicked!");
                    handleScrapeNewReport();
                  }}
                  disabled={scrapingLoading}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2 border-2 border-red-800"
                  style={{ minWidth: "150px", minHeight: "40px" }}
                >
                  {scrapingLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scraping...
                    </>
                  ) : (
                    "FETCH NEW REPORT"
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {client.creditReportHistory && client.creditReportHistory.length > 0 ? (
                    client.creditReportHistory.map((report, index) => (
                      <div key={report.id || index} className="border-l-2 border-blue-200 pl-4 pb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full -ml-6 border-2 border-white"></div>
                            <span className="font-medium capitalize">{report.platform}</span>
                            <Badge variant="outline" className="text-xs">
                              {report.status}
                            </Badge>
                            {report.reportData && (
                              <Badge variant="secondary" className="text-xs">
                                Has Data
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">{new Date(report.date).toLocaleDateString()}</span>
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm text-muted-foreground">• Client: {report.clientName}</div>
                          <div className="text-sm text-muted-foreground">• Report: {report.reportName}</div>
                          {report.reportData && <div className="text-sm text-blue-600">• JSON data available - view in JSON tab</div>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No credit report history found for this client.</p>
                      <p className="text-sm">Reports will appear here once they are generated.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scores" className="space-y-6">
            <Card className="gradient-light border-0">
              <CardHeader>
                <CardTitle className="text-lg">Credit Score History</CardTitle>
              </CardHeader>
              <CardContent>
                {scoreHistoryLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Loading score history...</p>
                  </div>
                ) : scoreHistory.length > 0 ? (
                  <div className="space-y-4">
                    <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm p-6 rounded-lg border border-border/40 dark:border-slate-700">
                      <h3 className="text-lg font-semibold mb-4">Score Trends</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="text-center p-4 bg-red-50 dark:bg-white/10 rounded-lg">
                          <div className="text-2xl font-bold text-red-600 dark:text-white">{scoreHistory[0]?.scores.experian || 0}</div>
                          <div className="text-sm text-muted-foreground">Experian (Latest)</div>
                        </div>
                        <div className="text-center p-4 bg-blue-50 dark:bg-white/10 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600 dark:text-white">{scoreHistory[0]?.scores.equifax || 0}</div>
                          <div className="text-sm text-muted-foreground">Equifax (Latest)</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 dark:bg-white/10 rounded-lg">
                          <div className="text-2xl font-bold text-green-600 dark:text-white">{scoreHistory[0]?.scores.transunion || 0}</div>
                          <div className="text-sm text-muted-foreground">TransUnion (Latest)</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg border border-border/40 dark:border-slate-700 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-slate-800">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">Date</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">Platform</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">Report Pull Date</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">Experian</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">Equifax</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">TransUnion</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                            {scoreHistory.map((report) => (
                              <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-white/10">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-200">{new Date(report.date).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-200">
                                  <Badge variant="outline" className="capitalize dark:border-slate-600 dark:text-slate-200">
                                    {report.platform}
                                  </Badge>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-200">{new Date(report.date).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <span className={`${report.scores.experian > 0 ? "text-red-600" : "text-gray-400"}`}>{report.scores.experian > 0 ? report.scores.experian : "N/A"}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <span className={`${report.scores.equifax > 0 ? "text-blue-600" : "text-gray-400"}`}>{report.scores.equifax > 0 ? report.scores.equifax : "N/A"}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <span className={`${report.scores.transunion > 0 ? "text-green-600" : "text-gray-400"}`}>{report.scores.transunion > 0 ? report.scores.transunion : "N/A"}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <Badge variant={report.status === "completed" ? "default" : "secondary"} className="capitalize">
                                    {report.status}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No score history found for this client.</p>
                    <p className="text-sm">Score history will appear here once credit reports are generated.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="json" className="space-y-6">
            <Card className="gradient-light border-0">
              <CardHeader>
                <CardTitle className="text-lg">Latest Credit Report Data (JSON)</CardTitle>
              </CardHeader>
              <CardContent>
                {client.latestJsonData ? (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="text"
                        value={jsonSearchTerm}
                        onChange={(event) => setJsonSearchTerm(event.target.value)}
                        placeholder="Find text..."
                        className="flex-1 px-3 py-2 border rounded-md text-sm"
                        onKeyDown={(event) => {
                          if (matchCount === 0) return;
                          if (event.key === "ArrowDown") {
                            event.preventDefault();
                            setCurrentMatchIndex((previous) => (previous + 1) % matchCount);
                          } else if (event.key === "ArrowUp") {
                            event.preventDefault();
                            setCurrentMatchIndex((previous) => (previous - 1 + matchCount) % matchCount);
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={matchCount === 0}
                        onClick={() => {
                          if (matchCount === 0) return;
                          setCurrentMatchIndex((previous) => (previous - 1 + matchCount) % matchCount);
                        }}
                      >
                        Prev
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={matchCount === 0}
                        onClick={() => {
                          if (matchCount === 0) return;
                          setCurrentMatchIndex((previous) => (previous + 1) % matchCount);
                        }}
                      >
                        Next
                      </Button>
                      {jsonSearchTerm && (
                        <Button variant="outline" size="sm" onClick={() => setJsonSearchTerm("")}>Clear</Button>
                      )}
                      <span className="text-xs text-muted-foreground">{matchCount > 0 ? `${currentMatchIndex + 1}/${matchCount}` : "0/0"} matches</span>
                    </div>
                    <pre ref={jsonContainerRef} className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-sm w-full h-[70vh] md:h-[80vh] lg:h-[85vh]">
                      {highlightedNodes}
                    </pre>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No JSON data available for this client.</p>
                    <p className="text-sm">Credit report data will appear here once available.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {showEditForm && client && (
        <EditClientForm
          client={{
            ...client,
            id: parseInt(client.id, 10),
            user_id: 1,
            status: (() => {
              switch (client.status) {
                case "Active":
                  return "active";
                case "Inactive":
                  return "inactive";
                case "Pending":
                  return "on_hold";
                case "Suspended":
                  return "inactive";
                default:
                  return "active";
              }
            })() as "active" | "inactive" | "completed" | "on_hold",
            created_at: client.joinDate,
            updated_at: new Date().toISOString(),
          }}
          onClose={() => setShowEditForm(false)}
          onSuccess={handleEditSuccess}
        />
      )}

      <Dialog open={fundingDialogOpen} onOpenChange={setFundingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply for Funding</DialogTitle>
            <DialogDescription>Select type and method to continue</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-sm">Funding Type</Label>
              <RadioGroup value={selectedFundingType} onValueChange={(value) => setSelectedFundingType(value as any)} className="grid gap-3">
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="personal" id="type-personal" />
                  <Label htmlFor="type-personal" className="cursor-pointer">Personal</Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="business" id="type-business" />
                  <Label htmlFor="type-business" className="cursor-pointer">Business</Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="both" id="type-both" />
                  <Label htmlFor="type-both" className="cursor-pointer">Both</Label>
                </div>
              </RadioGroup>
            </div>
            {selectedFundingType === "both" && (
              <div className="space-y-3">
                <Label className="text-sm">Start With</Label>
                <RadioGroup value={startWithType} onValueChange={(value) => setStartWithType(value as any)} className="grid gap-3">
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <RadioGroupItem value="personal" id="start-personal" />
                    <Label htmlFor="start-personal" className="cursor-pointer">Personal</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <RadioGroupItem value="business" id="start-business" />
                    <Label htmlFor="start-business" className="cursor-pointer">Business</Label>
                  </div>
                </RadioGroup>
              </div>
            )}
            <div className="space-y-3">
              <Label className="text-sm">Funding Method</Label>
              <RadioGroup value={selectedFundingMethod} onValueChange={(value) => setSelectedFundingMethod(value as any)} className="grid gap-3">
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="dfy" id="method-dfy" />
                  <Label htmlFor="method-dfy" className="cursor-pointer">Done For You</Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="diy" id="method-diy" />
                  <Label htmlFor="method-diy" className="cursor-pointer">DIY</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFundingDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleFundingContinue} disabled={!selectedFundingType || !selectedFundingMethod}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
