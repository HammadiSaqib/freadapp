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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DashboardLayout from "@/components/DashboardLayout";
import EliteDashboard from "@/components/EliteDashboard";
import {
  closeReportPullLoading,
  openReportPullLoading,
  showReportPullError,
} from "@/lib/reportPullFeedback";
import {
  Users,
  FileText,
  Search,
  MoreHorizontal,
  TrendingUp,
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
  Target,
  Zap,
  Award,
  BarChart3,
  Crown,
  DollarSign,
  Settings,
  Lock,
  Unlock,
  Copy,
  Share2,
  Building2,
  CreditCard,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { clientsApi, analyticsApi, apiRequest, api, creditReportScraperApi, authApi } from "@/lib/api";
import { contractsApi } from "@/lib/api";
import { usePagePermissions } from "@/hooks/usePagePermissions";
import axios from 'axios';
import { stageCrossSubdomainAuthTransfer } from "@/lib/authStorage";
import { buildAliasUrl, buildOnboardingIntakeUrl, buildReferralLandingUrl } from "@/lib/hostRouting";
import { useToast } from "@/hooks/use-toast";
import { useScoreMachineEliteStatus } from "@/hooks/useScoreMachineEliteStatus";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useAuthContext } from "@/contexts/AuthContext";
import PaymentPrompt from "@/components/PaymentPrompt";
import RestrictedFeature from "@/components/RestrictedFeature";
import AdminCalendar from "@/components/AdminCalendar";
import { EmailVerificationModal } from "@/components/EmailVerificationModal";
import AdminContractPrompt from "@/components/AdminContractPrompt";
import { hasAdminBasicPortalAccess } from "@/lib/adminPortalAccess";
import {
  getRememberedBasicAdminClientId,
  rememberBasicAdminClientId,
  rememberBasicAdminLastPulledClientId,
} from "@/lib/basicAdminReportPull";

type DashboardStats = {
  totalClients: number;
  loginEnabled: number;
  loginDisabled: number;
  fundable: number;
  notFundable: number;
  reportPulls: number;
  fundingInvoicesPaid: number;
  totalBanks: number;
  totalCards: number;
};

type DashboardClient = {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
  creditScore: number;
  previousScore: number;
  lastReport: string;
  disputesActive: number;
  progress: string;
  joinDate: string;
  fundableStatus?: string;
};

type Activity = {
  id: number;
  type: string;
  client: string;
  description: string;
  time: string;
  status: string;
};

type DashboardOverviewCache = {
  stats: DashboardStats;
  clients: DashboardClient[];
  recentActivity: Activity[];
  eliteData: any;
  hasAffiliateAccess: boolean;
  affiliateVerificationStatus: string | null;
  affiliateId: string | null;
  affiliateLink: string;
  partnerMonitoringLink: string | null;
};

const createDefaultDashboardStats = (): DashboardStats => ({
  totalClients: 0,
  loginEnabled: 0,
  loginDisabled: 0,
  fundable: 0,
  notFundable: 0,
  reportPulls: 0,
  fundingInvoicesPaid: 0,
  totalBanks: 0,
  totalCards: 0,
});

const createEmptyDashboardOverviewCache = (): DashboardOverviewCache => ({
  stats: createDefaultDashboardStats(),
  clients: [],
  recentActivity: [],
  eliteData: null,
  hasAffiliateAccess: false,
  affiliateVerificationStatus: null,
  affiliateId: null,
  affiliateLink: "",
  partnerMonitoringLink: null,
});

const dashboardOverviewCacheByUser = new Map<string, DashboardOverviewCache>();
const eliteDashboardOverviewAnimatedUsers = new Set<string>();

const getStatusColor = (status: string) => {
  switch (status) {
    case "Active":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case "New":
      return "bg-green-100 text-green-800 border-green-200";
    case "In Progress":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Completed":
      return "bg-purple-100 text-purple-800 border-purple-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getProgressIcon = (progress: string) => {
  switch (progress) {
    case "improving":
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    case "stable":
      return <CheckCircle className="h-4 w-4 text-indigo-600" />;
    case "new":
      return <Clock className="h-4 w-4 text-yellow-600" />;
    case "improved":
      return <Star className="h-4 w-4 text-green-600" />;
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

type DashboardQrType = "credit-report" | "referral";

const buildQrUrls = (link: string) => {
  const encodedLink = link ? encodeURIComponent(link) : "";
  const baseUrl = encodedLink
    ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodedLink}&margin=2`
    : "";

  return {
    previewUrl: baseUrl ? `${baseUrl}&size=400x400` : "",
    downloadUrl: baseUrl ? `${baseUrl}&size=1200x1200` : "",
  };
};

const fetchObjectUrl = async (src: string) => {
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`Unable to load image: ${response.status}`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load image: ${src}`));
    image.src = src;
  });

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userProfile, refreshProfile, isLoading: authLoading } = useAuthContext();
  const subscriptionStatus = useSubscriptionStatus();
  const dashboardOverviewCacheKey = userProfile?.id ? String(userProfile.id) : null;
  const cachedDashboardOverview = dashboardOverviewCacheKey
    ? dashboardOverviewCacheByUser.get(dashboardOverviewCacheKey) ?? null
    : null;
  const isDashboardOverviewCached = !!cachedDashboardOverview;
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAffiliateAccess, setHasAffiliateAccess] = useState(() => cachedDashboardOverview?.hasAffiliateAccess ?? false);
  const [affiliateVerificationStatus, setAffiliateVerificationStatus] = useState<string | null>(() => cachedDashboardOverview?.affiliateVerificationStatus ?? null);
  const [affiliateId, setAffiliateId] = useState<string | null>(() => cachedDashboardOverview?.affiliateId ?? null);
  const [affiliateLink, setAffiliateLink] = useState<string>(() => cachedDashboardOverview?.affiliateLink ?? "");
  const [isEmailVerificationModalOpen, setIsEmailVerificationModalOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats>(() => cachedDashboardOverview?.stats ?? createDefaultDashboardStats());
  const [clients, setClients] = useState<DashboardClient[]>(() => cachedDashboardOverview?.clients ?? []);
  const [recentActivity, setRecentActivity] = useState<Activity[]>(() => cachedDashboardOverview?.recentActivity ?? []);
  const [loading, setLoading] = useState(() => !cachedDashboardOverview);
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState([
    { date: 20, month: new Date().getMonth(), year: new Date().getFullYear(), client: "John Smith", type: "Letter", description: "Letter sending day" },
    { date: 15, month: new Date().getMonth(), year: new Date().getFullYear(), client: "Sarah Johnson", type: "Class", description: "Class online" },
    { date: 25, month: new Date().getMonth(), year: new Date().getFullYear(), client: "Michael Brown", type: "Meeting", description: "Client consultation" },
    { date: new Date().getDate(), month: new Date().getMonth(), year: new Date().getFullYear(), client: "Current Client", type: "Review", description: "Credit report review" }
  ]);
  const [newClient, setNewClient] = useState({
    platform: "",
    email: "",
    password: "",
    ssnLast4: "",
  });
  const [dashboardAuthorization, setDashboardAuthorization] = useState(false);
  const [showDashboardPassword, setShowDashboardPassword] = useState(false);
  const defaultMonitoringLink = "https://www.myscoreiq.com/get-fico-preferred.aspx?offercode=432142UK";
  const [partnerMonitoringLink, setPartnerMonitoringLink] = useState<string | null>(() => cachedDashboardOverview?.partnerMonitoringLink ?? null);
  const clientLoginUrl = buildAliasUrl("member", "/login");
  const [clientIntakeLink, setClientIntakeLink] = useState("");
  const [isGeneratingIntakeLink, setIsGeneratingIntakeLink] = useState(false);
  const [isClientIntakeShareOpen, setIsClientIntakeShareOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrModalType, setQrModalType] = useState<DashboardQrType>("credit-report");
  const [eliteData, setEliteData] = useState<any>(() => cachedDashboardOverview?.eliteData ?? null);
  const { isEliteActive } = useScoreMachineEliteStatus();

  const isSuperAdminUser = userProfile?.role === "super_admin";
  const isBasicAdminPortalUser = userProfile?.role === "admin" && hasAdminBasicPortalAccess(userProfile);
  const showEliteDashboard = isSuperAdminUser || isEliteActive;
  const shouldAnimateEliteDashboardOnMount = dashboardOverviewCacheKey
    ? !eliteDashboardOverviewAnimatedUsers.has(dashboardOverviewCacheKey)
    : true;

  const updateDashboardOverviewCache = (updates: Partial<DashboardOverviewCache>) => {
    if (!dashboardOverviewCacheKey) {
      return;
    }

    const current = dashboardOverviewCacheByUser.get(dashboardOverviewCacheKey) ?? createEmptyDashboardOverviewCache();
    dashboardOverviewCacheByUser.set(dashboardOverviewCacheKey, {
      ...current,
      ...updates,
    });
  };

  const onboardingSlug = (userProfile?.onboarding_slug || "").trim();
  const onboardingIdentifier = onboardingSlug || (userProfile?.id ? String(userProfile.id) : "");
  const onboardingIntakeLink = useMemo(() => {
    if (!onboardingIdentifier) return "";
    return buildOnboardingIntakeUrl({ slugOrId: onboardingIdentifier });
  }, [onboardingIdentifier]);
  const clientIntakeEmbedCode = useMemo(() => {
    if (!clientIntakeLink) return "";
    return `<iframe src="${clientIntakeLink}" style="width:100%; height:900px; border:0;" title="Client Intake"></iframe>`;
  }, [clientIntakeLink]);
  const creditReportLink = useMemo(() => {
    const trimmed = partnerMonitoringLink?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : defaultMonitoringLink;
  }, [partnerMonitoringLink]);
  const referralLink = affiliateLink.trim();
  const hasReferralQrLink = referralLink.length > 0;
  const { previewUrl: creditReportQrCodeUrl, downloadUrl: creditReportQrDownloadUrl } = useMemo(
    () => buildQrUrls(creditReportLink),
    [creditReportLink],
  );
  const { previewUrl: referralQrCodeUrl, downloadUrl: referralQrDownloadUrl } = useMemo(
    () => buildQrUrls(referralLink),
    [referralLink],
  );
  const activeQrLink = qrModalType === "referral" ? referralLink : creditReportLink;
  const activeQrCodeUrl = qrModalType === "referral" ? referralQrCodeUrl : creditReportQrCodeUrl;
  const activeQrDownloadUrl = qrModalType === "referral" ? referralQrDownloadUrl : creditReportQrDownloadUrl;
  const qrModalTitle = qrModalType === "referral" ? "Referral Link QR" : "Credit Report Registration QR";
  const qrModalDescription = qrModalType === "referral"
    ? "Scan the code below, open the referral page, or download the QR image to share it."
    : "Scan the code below, open the registration page, or download the QR image to share it.";
  const qrModalAlt = qrModalType === "referral" ? "Referral link QR code" : "Credit report registration QR code";
  const qrLogoPath = "/company-logo.svg";
  const basicDashboardClient = useMemo(() => {
    if (!isBasicAdminPortalUser) {
      return null;
    }

    const rememberedClientId = getRememberedBasicAdminClientId();
    const matchedClient = rememberedClientId
      ? clients.find((client) => String(client.id) === rememberedClientId)
      : null;

    return matchedClient || clients[0] || null;
  }, [clients, isBasicAdminPortalUser]);
  const basicProfileHref = basicDashboardClient
    ? `/clients/${basicDashboardClient.id}?tab=info`
    : "/clients";
  const basicWorkAreaHref = basicDashboardClient
    ? `/credit-report/${basicDashboardClient.id}?tab=overview`
    : "/credit-report";

  useEffect(() => {
    if (authLoading || isDashboardOverviewCached) {
      return;
    }

    fetchDashboardData();
    fetchReferralPartnerLink();
    checkAffiliateAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isDashboardOverviewCached, userProfile?.id]);

  useEffect(() => {
    if (!dashboardOverviewCacheKey || !showEliteDashboard || loading) {
      return;
    }

    eliteDashboardOverviewAnimatedUsers.add(dashboardOverviewCacheKey);
  }, [dashboardOverviewCacheKey, loading, showEliteDashboard]);

  useEffect(() => {
    if (!cachedDashboardOverview) {
      return;
    }

    setHasAffiliateAccess(cachedDashboardOverview.hasAffiliateAccess);
    setAffiliateVerificationStatus(cachedDashboardOverview.affiliateVerificationStatus);
    setAffiliateId(cachedDashboardOverview.affiliateId);
    setAffiliateLink(cachedDashboardOverview.affiliateLink);
    setStats(cachedDashboardOverview.stats);
    setClients(cachedDashboardOverview.clients);
    setRecentActivity(cachedDashboardOverview.recentActivity);
    setPartnerMonitoringLink(cachedDashboardOverview.partnerMonitoringLink);
    setEliteData(cachedDashboardOverview.eliteData);
    setLoading(false);
  }, [cachedDashboardOverview]);

  // Elite welcome popup (shown after cinematic transition completes)
  const [showEliteWelcome, setShowEliteWelcome] = useState(false);
  useEffect(() => {
    const handler = () => setShowEliteWelcome(true);
    window.addEventListener('elite-show-welcome', handler);
    return () => window.removeEventListener('elite-show-welcome', handler);
  }, []);

  useEffect(() => {
    if (onboardingIntakeLink) {
      setClientIntakeLink(onboardingIntakeLink);
    }
  }, [onboardingIntakeLink]);

  useEffect(() => {
    if (authLoading) return;
    if (
      userProfile &&
      ['admin', 'super_admin'].includes(userProfile.role) &&
      (!userProfile.phone || !String(userProfile.phone).trim())
    ) {
      setPhoneInput('');
      setPhoneError(null);
      setShowPhoneDialog(true);
    } else {
      setShowPhoneDialog(false);
    }
  }, [authLoading, userProfile]);

  // Open email verification modal ONLY after purchase (active subscription)
  useEffect(() => {
    // Auto-open verification modal after first purchase if email not verified
    const shouldOpen =
      !subscriptionStatus.isLoading &&
      subscriptionStatus.hasActiveSubscription &&
      (userProfile?.role === 'admin' || userProfile?.role === 'super_admin') &&
      !userProfile?.email_verified;

    setIsEmailVerificationModalOpen(!!shouldOpen);
  }, [userProfile, subscriptionStatus.hasActiveSubscription, subscriptionStatus.isLoading]);

  const checkAffiliateAccess = async () => {
    if (userProfile?.role === 'admin' || userProfile?.role === 'super_admin') {
      try {
        const affiliateResponse = await api.get('/api/auth/affiliate/status');
        const { status, affiliate_id, referral_slug, partner_monitoring_link } = affiliateResponse.data || {};
        const nextVerificationStatus = status || null;
        const nextAffiliateId = affiliate_id ? String(affiliate_id) : null;
        const refPart = referral_slug && typeof referral_slug === 'string' && referral_slug.length > 0
          ? referral_slug
          : nextAffiliateId;
        const nextAffiliateLink = refPart ? buildReferralLandingUrl(refPart) : "";
        const nextPartnerMonitoringLink = typeof partner_monitoring_link === 'string' && partner_monitoring_link.trim().length > 0
          ? partner_monitoring_link.trim()
          : undefined;

        setHasAffiliateAccess(true);
        setAffiliateVerificationStatus(nextVerificationStatus);
        setAffiliateId(nextAffiliateId);
        setAffiliateLink(nextAffiliateLink);

        if (nextPartnerMonitoringLink !== undefined) {
          setPartnerMonitoringLink(nextPartnerMonitoringLink);
        }

        updateDashboardOverviewCache({
          hasAffiliateAccess: true,
          affiliateVerificationStatus: nextVerificationStatus,
          affiliateId: nextAffiliateId,
          affiliateLink: nextAffiliateLink,
          ...(nextPartnerMonitoringLink !== undefined ? { partnerMonitoringLink: nextPartnerMonitoringLink } : {}),
        });
      } catch (error) {
        setHasAffiliateAccess(false);
        setAffiliateVerificationStatus(null);
        setAffiliateId(null);
        setAffiliateLink("");

        updateDashboardOverviewCache({
          hasAffiliateAccess: false,
          affiliateVerificationStatus: null,
          affiliateId: null,
          affiliateLink: "",
        });
      }
    }
  };

  // For referred users: fetch affiliate partner link and set it
  const fetchReferralPartnerLink = async () => {
    try {
      const resp = await authApi.getReferralPartnerLink();
      const link = resp?.data?.partnerMonitoringLink;
      if (typeof link === 'string' && link.trim().length > 0) {
        const nextLink = link.trim();
        setPartnerMonitoringLink(nextLink);
        updateDashboardOverviewCache({ partnerMonitoringLink: nextLink });
      } else {
        setPartnerMonitoringLink(null);
        updateDashboardOverviewCache({ partnerMonitoringLink: null });
      }
    } catch (error) {
      // Swallow errors silently; fallback to default
      setPartnerMonitoringLink(null);
      updateDashboardOverviewCache({ partnerMonitoringLink: null });
    }
  };

  const openAffiliatePortal = (pathname: string) => {
    const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
    const targetUrl = buildAliasUrl('affiliate', '/session-transfer');

    const encoded = stageCrossSubdomainAuthTransfer(targetUrl, {
      returnContext: {
        label: 'Back To Admin Dashboard',
        targetUrl: buildAliasUrl('admin', '/dashboard'),
      },
      transferRedirectPath: normalizedPath,
    });

    const finalUrl = encoded
      ? `${targetUrl}#${"__sm_auth_transfer__:"}${encoded}`
      : targetUrl;

    window.location.href = finalUrl;
  };

  const handleAffiliateProAccess = () => {
    if (affiliateVerificationStatus === 'pending_verification') {
      openAffiliatePortal('/verify-email');
    } else if (affiliateVerificationStatus === 'active') {
      openAffiliatePortal('/dashboard');
    } else {
      // Show error or contact support
      toast({
        title: "Access Issue",
        description: "Please contact support to activate your affiliate access.",
        variant: "destructive",
      });
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Test basic API connectivity using our axios-based API client
      try {
        console.log("Testing basic API connectivity...");
        const pingResponse = await api.get("/api/ping");
        console.log("Ping response:", pingResponse.data);
      } catch (pingError) {
        console.error("Ping test failed:", pingError);
      }

      // Try to fetch real data from API with error handling
      const [statsResponse, clientsResponse, activityResponse, banksStatsResponse, cardsStatsResponse, eliteDataResponse] =
        await Promise.all([
          analyticsApi
            .getDashboardAnalytics()
            .catch((err) => ({ error: err.message })),
          clientsApi
            .getClients({ limit: 500 })
            .catch((err) => ({ error: err.message })),
          analyticsApi
            .getRecentActivities(4)
            .catch((err) => ({ error: err.message })),
          api
            .get('/api/banks/stats')
            .catch((err) => ({ error: err.message })),
          api
            .get('/api/cards/stats')
            .catch((err) => ({ error: err.message })),
          analyticsApi
            .getEliteDashboard()
            .catch((err) => ({ error: err.message })),
        ]);

      // Store elite dashboard aggregate data
      if (eliteDataResponse?.data && !(eliteDataResponse as any).error) {
        setEliteData(eliteDataResponse.data);
        updateDashboardOverviewCache({ eliteData: eliteDataResponse.data });
      }

      console.log("Dashboard API Responses:", {
        statsResponse,
        clientsResponse,
        activityResponse,
        banksStatsResponse,
        cardsStatsResponse,
      });

      // Use API data if available, otherwise use mock data
      if (statsResponse.data && !statsResponse.error) {
        console.log("Using API stats data:", statsResponse.data);
        
        // Calculate fundable clients (credit score > 650), report pulls, and login status
        let fundableCount = 0;
        let notFundableCount = 0;
        let reportPullsCount = 0;
        let loginEnabledCount = 0;
        let loginDisabledCount = 0;
        
        // If we have clients data, calculate counts
        if (clientsResponse.data && !clientsResponse.error && clientsResponse.data.clients) {
          const clients = clientsResponse.data.clients;
          
          fundableCount = clients.filter(client => 
            client.fundable_status === 'fundable'
          ).length;
          notFundableCount = clients.filter(client => 
            client.fundable_status === 'not_fundable'
          ).length;
          
          // Count login enabled/disabled clients
          // Consider login_disabled, is_locked, and inactive status
          loginEnabledCount = clients.filter(client => 
            !client.login_disabled && !client.is_locked && client.status?.toLowerCase() === 'active'
          ).length;
          
          loginDisabledCount = clients.filter(client => 
            client.login_disabled || client.is_locked || client.status?.toLowerCase() === 'inactive'
          ).length;
        }
        
        // Get report pulls count from credit report history
        try {
          const reportHistoryResponse = await creditReportScraperApi.getReportHistory();
          if (reportHistoryResponse.data?.success && reportHistoryResponse.data.data) {
            // Count reports from this month
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            reportPullsCount = reportHistoryResponse.data.data.filter(report => {
              const reportDate = new Date(report.created_at);
              return reportDate.getMonth() === currentMonth && reportDate.getFullYear() === currentYear;
            }).length;
          }
        } catch (error) {
          console.log("Could not fetch report history for dashboard stats:", error);
          reportPullsCount = Math.floor(Math.random() * 50) + 10; // Fallback to mock data
        }
        
        const nextStats = {
          totalClients: statsResponse.data.total_clients?.current || 0,
          loginEnabled: loginEnabledCount,
          loginDisabled: loginDisabledCount,
          fundable: typeof statsResponse.data.fundable === 'number' ? statsResponse.data.fundable : fundableCount,
          notFundable: typeof statsResponse.data.notFundable === 'number' ? statsResponse.data.notFundable : notFundableCount,
          reportPulls: reportPullsCount,
          fundingInvoicesPaid: statsResponse.data.funding_invoices_paid_this_month || 0,
          totalBanks: banksStatsResponse?.data?.total ? Number(banksStatsResponse.data.total) : 0,
          totalCards: cardsStatsResponse?.data?.total ? Number(cardsStatsResponse.data.total) : 0,
        };

        setStats(nextStats);
        updateDashboardOverviewCache({ stats: nextStats });
      } else {
        console.log("Using fallback stats, API error:", statsResponse.error);
        // Fallback to mock stats
        const nextStats = {
          totalClients: 127,
          loginEnabled: 123,
          loginDisabled: 4,
          fundable: 67,
          notFundable: 60,
          reportPulls: 23,
          fundingInvoicesPaid: 5,
          totalBanks: 0,
          totalCards: 0,
        };

        setStats(nextStats);
        updateDashboardOverviewCache({ stats: nextStats });
      }

      if (clientsResponse.data && !clientsResponse.error) {
        const transformedClients = (clientsResponse.data.clients || []).map(
          (client) => ({
            id: client.id,
            name: `${client.first_name} ${client.last_name}`,
            email: client.email,
            phone: client.phone,
            status:
              client.status === "active"
                ? "Active"
                : client.status === "inactive"
                  ? "Inactive"
                  : client.status === "completed"
                    ? "Completed"
                    : "On Hold",
            creditScore: client.credit_score || 650,
            previousScore: client.previous_credit_score || 600,
            lastReport: new Date(client.updated_at).toISOString().split("T")[0],
            disputesActive: 0, // Will be populated when we integrate disputes
            progress:
              client.credit_score && client.previous_credit_score
                ? client.credit_score > client.previous_credit_score
                  ? "improving"
                  : "stable"
                : "new",
            joinDate: client.created_at,
            fundableStatus:
              client.fundable_status === 'fundable'
                ? 'Fundable'
                : client.fundable_status === 'not_fundable'
                ? 'Not Fundable'
                : (client.credit_score || 650) > 650
                ? 'Fundable'
                : 'Not Fundable',
          }),
        );
        setClients(transformedClients);
        updateDashboardOverviewCache({ clients: transformedClients });
      } else {
        // Fallback to mock clients
        const fallbackClients = [
          {
            id: 1,
            name: "Sarah Johnson",
            email: "sarah.j@email.com",
            phone: "(555) 123-4567",
            status: "Active",
            creditScore: 650,
            previousScore: 580,
            lastReport: "2024-01-15",
            disputesActive: 2,
            progress: "improving",
            joinDate: "2024-01-15T10:30:00Z",
          },
          {
            id: 2,
            name: "Michael Chen",
            email: "m.chen@email.com",
            phone: "(555) 234-5678",
            status: "Active",
            creditScore: 580,
            previousScore: 560,
            progress: "improving",
            disputesActive: 1,
            lastReport: "2024-01-14",
            joinDate: "2024-01-14T09:15:00Z",
          },
          {
            id: 3,
            name: "Emma Davis",
            email: "emma.d@email.com",
            phone: "(555) 345-6789",
            status: "Completed",
            creditScore: 720,
            previousScore: 680,
            progress: "improving",
            disputesActive: 0,
            lastReport: "2024-01-13",
            joinDate: "2024-01-13T14:20:00Z",
          },
        ];

        setClients(fallbackClients);
        updateDashboardOverviewCache({ clients: fallbackClients });
      }

      if (activityResponse.data && !activityResponse.error) {
        // Ensure we have an array - the API might return data in different formats
        let activities = [];
        if (Array.isArray(activityResponse.data)) {
          activities = activityResponse.data;
        } else if (
          activityResponse.data &&
          Array.isArray(activityResponse.data.activities)
        ) {
          activities = activityResponse.data.activities;
        } else if (
          activityResponse.data &&
          typeof activityResponse.data === "object"
        ) {
          // If data is an object but not an array, wrap it in an array if it has activity-like properties
          if (activityResponse.data.id && activityResponse.data.type) {
            activities = [activityResponse.data];
          }
        }
        setRecentActivity(activities);
        updateDashboardOverviewCache({ recentActivity: activities });
      } else {
        // Fallback to mock activities
        const fallbackActivities = [
          {
            id: 1,
            type: "dispute_filed",
            description: "Dispute filed for Sarah Johnson - Medical Collection",
            time: "2024-01-15T10:30:00Z",
            client: "Sarah Johnson",
            status: "success",
          },
          {
            id: 2,
            type: "score_updated",
            description:
              "Credit score increased from 680 to 720 for Emma Davis",
            time: "2024-01-14T16:45:00Z",
            client: "Emma Davis",
            status: "success",
          },
          {
            id: 3,
            type: "client_added",
            description: "New client Michael Chen added to system",
            time: "2024-01-14T09:15:00Z",
            client: "Michael Chen",
            status: "info",
          },
          {
            id: 4,
            type: "payment_received",
            description: "Payment received from Sarah Johnson - $299",
            time: "2024-01-13T11:20:00Z",
            client: "Sarah Johnson",
            status: "success",
          },
        ];

        setRecentActivity(fallbackActivities);
        updateDashboardOverviewCache({ recentActivity: fallbackActivities });
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);

      // Complete fallback in case of any unexpected errors
      const fallbackStats = {
        totalClients: 127,
        loginEnabled: 124,
        loginDisabled: 3,
        fundable: 89,
        notFundable: 38,
        reportPulls: 156,
        fundingInvoicesPaid: 12,
        totalBanks: 0,
        totalCards: 0,
      };

      const fallbackClients = [
        {
          id: 1,
          name: "Demo Client",
          email: "demo@email.com",
          phone: "(555) 123-4567",
          status: "Active",
          creditScore: 650,
          previousScore: 580,
          lastReport: "2024-01-15",
          disputesActive: 2,
          progress: "improving",
          joinDate: "2024-01-15T10:30:00Z",
        },
      ];

      const fallbackActivities = [
        {
          id: 1,
          type: "system_info",
          description: "Demo mode - API unavailable",
          time: new Date().toISOString(),
          client: "System",
          status: "info",
        },
      ];

      setStats(fallbackStats);
      setClients(fallbackClients);
      setRecentActivity(fallbackActivities);
      updateDashboardOverviewCache({
        stats: fallbackStats,
        clients: fallbackClients,
        recentActivity: fallbackActivities,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = () => {
    setIsAddClientOpen(true);
  };

  const handleToggleLoginStatus = async (clientId: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active";

      await clientsApi.updateClient(clientId.toString(), {
        status: newStatus,
      });

      setClients((prevClients) =>
        prevClients.map((client) =>
          client.id === clientId
            ? { ...client, status: newStatus === "active" ? "Active" : "Inactive" }
            : client,
        ),
      );

      toast({
        title: "Success",
        description: `Client login ${newStatus === "active" ? "enabled" : "disabled"} successfully`,
      });

      fetchDashboardData();
    } catch (error) {
      console.error("Error updating client login status:", error);
      toast({
        title: "Error",
        description: "Failed to update client login status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClient = async (clientId: number) => {
    try {
      const confirmed = window.confirm("Delete this client?");
      if (!confirmed) return;

      await clientsApi.deleteClient(clientId.toString());
      setClients((prevClients) => prevClients.filter((client) => client.id !== clientId));

      toast({
        title: "Success",
        description: "Client deleted successfully",
      });

      fetchDashboardData();
    } catch (error) {
      console.error("Error deleting client:", error);
      toast({
        title: "Error",
        description: "Failed to delete client",
        variant: "destructive",
      });
    }
  };

  const handleCreditReports = () => {
    navigate("/reports");
  };

  const handleSettings = () => {
    navigate("/settings");
  };

  const handleFilterClients = () => {
    navigate("/clients");
  };

  const handleViewProfile = (clientId: number) => {
    navigate(`/clients/${clientId}`);
  };

  const handleEditClient = (clientId: number) => {
    // TODO: Open edit client modal
    console.log("Edit client:", clientId);
    toast({
      title: "Feature Coming Soon",
      description: `Client editing for ID: ${clientId} will be available soon.`,
    });
  };

  const handleCopyCreditReportLink = async () => {
    try {
      await navigator.clipboard.writeText(creditReportLink);
      toast({ title: "Link copied", description: "Credit report link copied to clipboard" });
    } catch (e) {
      toast({ title: "Copy failed", description: "Please copy the link manually", variant: "destructive" });
    }
  };

  const handleCopyClientLoginLink = async () => {
    try {
      await navigator.clipboard.writeText(clientLoginUrl);
      toast({ title: "Link copied", description: "Client login link copied to clipboard" });
    } catch (e) {
      toast({ title: "Copy failed", description: "Please copy the link manually", variant: "destructive" });
    }
  };

  const handleGenerateClientIntakeLink = async () => {
    setIsGeneratingIntakeLink(true);
    try {
      if (onboardingIntakeLink) {
        setClientIntakeLink(onboardingIntakeLink);
        toast({ title: "Onboarding link ready", description: "Share this link with your client." });
        return;
      }
      const response = await clientsApi.getClientIntakeToken();
      const token = response.data?.token || response.data?.data?.token;
      if (!token) {
        throw new Error("Unable to generate onboarding link.");
      }
      const link = buildOnboardingIntakeUrl({ token });
      setClientIntakeLink(link);
      toast({ title: "Onboarding link ready", description: "Share this link with your client." });
    } catch (e: any) {
      toast({
        title: "Unable to generate link",
        description: e?.response?.data?.error || e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingIntakeLink(false);
    }
  };

  const handleCopyClientIntakeLink = async () => {
    if (!clientIntakeLink) {
      toast({ title: "Generate a link first", description: "Create an onboarding link to copy." });
      return;
    }
    try {
      await navigator.clipboard.writeText(clientIntakeLink);
      toast({ title: "Link copied", description: "Client onboarding link copied to clipboard" });
    } catch (e) {
      toast({ title: "Copy failed", description: "Please copy the link manually", variant: "destructive" });
    }
  };

  const handleOpenClientIntakeShare = () => {
    if (!clientIntakeLink) {
      toast({ title: "Generate a link first", description: "Create an onboarding link to share." });
      return;
    }
    setIsClientIntakeShareOpen(true);
  };

  const handleCopyClientIntakeEmbedCode = async () => {
    if (!clientIntakeEmbedCode) {
      toast({ title: "Generate a link first", description: "Create an onboarding link to embed." });
      return;
    }
    try {
      await navigator.clipboard.writeText(clientIntakeEmbedCode);
      toast({ title: "Embed copied", description: "Iframe embed code copied to clipboard" });
    } catch (e) {
      toast({ title: "Copy failed", description: "Please copy the iframe manually", variant: "destructive" });
    }
  };

  const handleSavePhone = async () => {
    const normalizedPhone = phoneInput.replace(/[^\d+]/g, '');
    if (!normalizedPhone) {
      setPhoneError('Phone number is required');
      return;
    }
    if (!/^\+?[0-9]{7,15}$/.test(normalizedPhone)) {
      setPhoneError('Please enter a valid phone number');
      return;
    }

    try {
      setIsSavingPhone(true);
      setPhoneError(null);
      await authApi.updateProfile({ phone: normalizedPhone });
      await refreshProfile();
      setShowPhoneDialog(false);
      toast({ title: 'Phone number saved', description: 'Thanks! Your profile is now complete.' });
    } catch (error: any) {
      console.error('Failed to save phone number:', error);
      const message = error?.response?.data?.error || error?.message || 'Failed to save phone number';
      setPhoneError(message);
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleOpenCreditReportLink = () => {
    window.open(creditReportLink, "_blank", "noopener,noreferrer");
  };

  const openQrModal = (type: DashboardQrType) => {
    setQrModalType(type);
    setIsQrModalOpen(true);
  };

  const handleOpenQrLink = () => {
    if (!activeQrLink) {
      toast({
        title: "Link unavailable",
        description: qrModalType === "referral" ? "No referral link is ready yet." : "No credit report link is ready yet.",
        variant: "destructive",
      });
      return;
    }

    window.open(activeQrLink, "_blank", "noopener,noreferrer");
  };

  const handleDownloadQrCode = async () => {
    if (!activeQrDownloadUrl) {
      toast({ title: "QR unavailable", description: "The QR code is not ready yet.", variant: "destructive" });
      return;
    }

    const objectUrls: string[] = [];

    try {
      const [qrObjectUrl, logoObjectUrl] = await Promise.all([
        fetchObjectUrl(activeQrDownloadUrl),
        fetchObjectUrl(qrLogoPath),
      ]);

      objectUrls.push(qrObjectUrl, logoObjectUrl);

      const [qrImage, logoImage] = await Promise.all([
        loadImage(qrObjectUrl),
        loadImage(logoObjectUrl),
      ]);

      const size = Math.max(qrImage.naturalWidth || 0, qrImage.naturalHeight || 0, 1200);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Unable to prepare QR download.");
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, size, size);
      context.drawImage(qrImage, 0, 0, size, size);

      const badgeSize = size * 0.2;
      const badgeRadius = badgeSize / 2;
      const badgeX = size / 2;
      const badgeY = size / 2;

      context.beginPath();
      context.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
      context.fillStyle = "rgba(255, 255, 255, 0.96)";
      context.fill();
      context.lineWidth = Math.max(4, size * 0.006);
      context.strokeStyle = "#e2e8f0";
      context.stroke();

      const logoSize = size * 0.14;
      context.drawImage(logoImage, badgeX - logoSize / 2, badgeY - logoSize / 2, logoSize, logoSize);

      const downloadLink = document.createElement("a");
      downloadLink.href = canvas.toDataURL("image/png");
      downloadLink.download = qrModalType === "referral" ? "referral-link-qr.png" : "credit-report-link-qr.png";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      toast({
        title: "QR downloaded",
        description: qrModalType === "referral" ? "Referral QR code downloaded." : "Credit report QR code downloaded.",
      });
    } catch (error) {
      console.error("Failed to download QR code:", error);
      toast({
        title: "Download failed",
        description: "Unable to download the QR code right now.",
        variant: "destructive",
      });
    } finally {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    }
  };

  const handleViewReports = (clientId: number) => {
    navigate(`/credit-report?clientId=${clientId}`);
  };

  const handleSubmitClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dashboardAuthorization) {
      toast({
        title: "Authorization Required",
        description: "Please confirm authorization to use the credit report for educational analysis.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    let reportPullFeedbackOpen = false;

    try {
      // Check if user is authenticated
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

      // First, scrape the credit report to get personal information
      console.log("Starting credit report scraping...");
      openReportPullLoading();
      reportPullFeedbackOpen = true;
      
      const scraperResponse = await fetch("/api/credit-reports/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          platform: newClient.platform,
          credentials: {
            username: newClient.email,
            password: newClient.password,
          },
          options: {
            saveHtml: false,
            takeScreenshots: false,
            ...(((newClient.platform === "identityiq" || newClient.platform === "myscoreiq") && newClient.ssnLast4)
              ? { ssnLast4: newClient.ssnLast4 }
              : {}),
          },
        }),
      });
      const contentType = scraperResponse.headers.get("content-type") || "";
      let scraperData: any = null;
      if (scraperResponse.ok) {
        if (contentType.includes("application/json")) {
          scraperData = await scraperResponse.json();
        }
      } else {
        if (scraperResponse.status === 401 || scraperResponse.status === 403) {
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
            const errorData = await scraperResponse.json();
            const msg = errorData?.message || "Failed to scrape credit report";
            if (scraperResponse.status >= 500 || scraperResponse.status === 504) {
              scraperData = null;
            } else {
              throw new Error(msg);
            }
          } catch {
            if (scraperResponse.status >= 500 || scraperResponse.status === 504) {
              scraperData = null;
            } else {
              throw new Error("Failed to scrape credit report");
            }
          }
        } else {
          try { await scraperResponse.text(); } catch {}
          if (scraperResponse.status >= 500 || scraperResponse.status === 504) {
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
            headers: { "Authorization": `Bearer ${token}` },
          });
          if (histResp.ok) {
            const histJson = await histResp.json();
            const list = (histJson?.data ?? histJson) as any[];
            if (Array.isArray(list) && list.length > 0) {
              const match = list.find((item: any) =>
                String(item?.platform || '').toLowerCase() === String(newClient.platform || '').toLowerCase() &&
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
            headers: { "Authorization": `Bearer ${token}` },
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
      console.log("Scraper response:", scraperData);
      console.log("Scraper response keys:", Object.keys(scraperData));
      console.log("Report data structure:", scraperData.data ? Object.keys(scraperData.data) : "No data");

      // Extract personal information from the scraped data
      let firstName = "";
      let lastName = "";
      let dateOfBirth = "";

      // The scraper returns data in the format: { success: true, message: "...", data: { reportData: { ... } } }
      if (scraperData.data && scraperData.data.reportData) {
        const reportData = scraperData.data.reportData;
        console.log("Found reportData, checking Name array:", reportData.Name);
        
        // Try to extract name from Name section (based on scraper structure)
        if (reportData.Name && Array.isArray(reportData.Name) && reportData.Name.length > 0) {
          // Find the primary name entry (BureauId 1 or first entry with Primary type)
          const primaryName = reportData.Name.find(name => name.NameType === "Primary") || reportData.Name[0];
          console.log("Primary name data:", primaryName);
          
          firstName = primaryName.FirstName || "";
          lastName = primaryName.LastName || "";
          console.log("Extracted names:", { firstName, lastName });
        }

        // Try to extract date of birth from DOB section
        if (reportData.DOB && Array.isArray(reportData.DOB) && reportData.DOB.length > 0) {
          const dobData = reportData.DOB[0];
          dateOfBirth = dobData.DOB || "";
          console.log("Extracted DOB:", dateOfBirth);
        }

        // Fallback: try to extract from nested reportData structure or direct data access
        if (!firstName && !lastName) {
          console.log("Trying fallback data access");
          
          // Try direct access to scraperData.data (in case reportData is at the top level)
          if (scraperData.data.Name && Array.isArray(scraperData.data.Name) && scraperData.data.Name.length > 0) {
            const primaryName = scraperData.data.Name.find(name => name.NameType === "Primary") || scraperData.data.Name[0];
            firstName = primaryName.FirstName || "";
            lastName = primaryName.LastName || "";
            console.log("Extracted names from direct data:", { firstName, lastName });
          }
          
          // Try DOB section in direct data
          if (scraperData.data.DOB && Array.isArray(scraperData.data.DOB) && scraperData.data.DOB.length > 0) {
            const dobData = scraperData.data.DOB[0];
            dateOfBirth = dobData.DOB || "";
            console.log("Extracted DOB from direct data:", dateOfBirth);
          }
          
          // Try nested reportData structure
          if (!firstName && !lastName && reportData.reportData) {
            console.log("Trying nested reportData structure");
            const nestedReportData = reportData.reportData;
            
            // Try Name section in nested data
            if (nestedReportData.Name && Array.isArray(nestedReportData.Name) && nestedReportData.Name.length > 0) {
              const primaryName = nestedReportData.Name.find(name => name.NameType === "Primary") || nestedReportData.Name[0];
              firstName = primaryName.FirstName || "";
              lastName = primaryName.LastName || "";
              console.log("Extracted names from nested:", { firstName, lastName });
            }
            
            // Try DOB section in nested data
            if (nestedReportData.DOB && Array.isArray(nestedReportData.DOB) && nestedReportData.DOB.length > 0) {
              const dobData = nestedReportData.DOB[0];
              dateOfBirth = dobData.DOB || "";
              console.log("Extracted DOB from nested:", dateOfBirth);
            }
          }
        }
      }

      // Additional fallback: try direct access to scraperData.data if no reportData wrapper
      if (!firstName && !lastName && scraperData.data) {
        console.log("Trying direct scraperData.data access");
        
        if (scraperData.data.Name && Array.isArray(scraperData.data.Name) && scraperData.data.Name.length > 0) {
          const primaryName = scraperData.data.Name.find(name => name.NameType === "Primary") || scraperData.data.Name[0];
          firstName = primaryName.FirstName || "";
          lastName = primaryName.LastName || "";
          console.log("Extracted names from scraperData.data:", { firstName, lastName });
        }
        
        if (scraperData.data.DOB && Array.isArray(scraperData.data.DOB) && scraperData.data.DOB.length > 0) {
          const dobData = scraperData.data.DOB[0];
          dateOfBirth = dobData.DOB || "";
          console.log("Extracted DOB from scraperData.data:", dateOfBirth);
        }
      }

      console.log("Final extracted data:", { firstName, lastName, dateOfBirth });

      // If we couldn't extract the name, show an error
      if (!firstName && !lastName) {
        throw new Error("Could not extract personal information from credit report. Please verify the credentials and try again.");
      }

      closeReportPullLoading();
      reportPullFeedbackOpen = false;

      // Create client with extracted information
      const clientData = {
        first_name: firstName,
        last_name: lastName,
        email: newClient.email,
        date_of_birth: dateOfBirth || undefined,
        status: "active" as const,
        platform: newClient.platform,
        platform_email: newClient.email,
        platform_password: newClient.password,
        ...(newClient.ssnLast4 ? { ssn_last_four: newClient.ssnLast4 } : {}),
        notes: `Client created via credit report scraping from ${newClient.platform}`,
      };

      console.log("Creating client with extracted data:", clientData);
      const response = await clientsApi.createClient(clientData);
      console.log("Create client response:", response);
      const responseData = response?.data ?? response;

      if (responseData?.error) {
        throw new Error(responseData.error);
      }

      const reusedExisting = responseData?.reusedExisting === true || responseData?.created === false;

      // Reset form and close modal
      setNewClient({
        platform: "",
        email: "",
        password: "",
        ssnLast4: "",
      });
      setDashboardAuthorization(false);
      setIsAddClientOpen(false);

      // Refresh dashboard data
      fetchDashboardData();

      toast({
        title: "Success!",
        description: reusedExisting
          ? `Client ${firstName} ${lastName} already existed. A fresh credit report was added to the existing profile.`
          : `Client ${firstName} ${lastName} has been added successfully with information from their credit report.`,
      });

      // Redirect post-add: paid admins → credit report; unpaid → client profile
      const clientId = responseData?.id;
      const clientName = `${firstName} ${lastName}`;
      if (clientId) {
        if (isBasicAdminPortalUser) {
          rememberBasicAdminClientId(clientId);
          rememberBasicAdminLastPulledClientId(clientId);
        }

        if (subscriptionStatus.hasActiveSubscription) {
          navigate(`/credit-report?clientId=${clientId}&clientName=${encodeURIComponent(clientName)}`);
        } else {
          navigate(`/clients/${clientId}`);
        }
      }
    } catch (error: any) {
      console.error("Error adding client:", error);
      if (reportPullFeedbackOpen) {
        showReportPullError();
        reportPullFeedbackOpen = false;
      }
      
      // Handle quota exceeded error specifically
      if (error.response?.status === 403 && error.response?.data?.error === 'Client quota exceeded') {
        const planLimits = error.response.data.planLimits;
        toast({
          title: "Client Quota Exceeded",
          description: error.response.data.message || `You have reached the maximum of ${planLimits?.maxClients || 1} client(s) allowed on your plan. Please upgrade to add more clients.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error Adding Client",
          description:
            error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setNewClient((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddClientDialogChange = (open: boolean) => {
    setIsAddClientOpen(open);
    if (!open) {
      setNewClient({
        platform: "",
        email: "",
        password: "",
        ssnLast4: "",
      });
      setDashboardAuthorization(false);
    }
  };

  return (
    <DashboardLayout
      title={isBasicAdminPortalUser ? "Basic Dashboard" : "Dashboard Overview"}
      description={isBasicAdminPortalUser ? "Profile, report, and Work Area" : "Monitor your funding business performance and client progress"}
      onAddClient={handleAddClient}
    >
      <Dialog open={showPhoneDialog} onOpenChange={(open) => {
        if (!open) {
          setShowPhoneDialog(true);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Complete Your Profile</DialogTitle>
            <DialogDescription>
              Please add a contact phone number to continue using the dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="phone-required-input">Phone Number</Label>
              <Input
                id="phone-required-input"
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="e.g. +15551234567"
                autoFocus
              />
            </div>
            {phoneError && (
              <p className="text-sm text-red-600">{phoneError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={handleSavePhone}
              disabled={isSavingPhone}
              className="bg-gradient-to-r from-violet-600 to-indigo-900 hover:from-violet-600/90 hover:to-indigo-900/90 text-white"
            >
              {isSavingPhone ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </div>
              ) : (
                'Save Phone Number'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Prompt for Unpaid Users */}
      {!subscriptionStatus.hasActiveSubscription && !subscriptionStatus.isLoading && (
        <div className="mb-8">
          <PaymentPrompt planName={subscriptionStatus.planName} />
        </div>
      )}

      {/* ── Elite Dashboard (Fread App Elite + Agreement Signed) ── */}
      {isBasicAdminPortalUser ? (
        <div className="space-y-6">
          <section className="overflow-hidden rounded-lg border border-sky-100 bg-white shadow-sm shadow-sky-100/70 dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
            <div className="flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl space-y-3">
                <Badge className="border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50 dark:border-sky-900 dark:bg-slate-900 dark:text-sky-300">
                  Fread App Basic
                </Badge>
                <div>
                  <h2 className="text-2xl font-semibold tracking-normal text-slate-950 dark:text-white sm:text-3xl">
                    Welcome back{userProfile?.first_name ? `, ${userProfile.first_name}` : ""}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                    Profile, report review, and Work Area are ready in one place.
                  </p>
                </div>
              </div>
              <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:min-w-[360px]">
                <Button
                  onClick={() => navigate(basicProfileHref)}
                  className="h-12 justify-start bg-slate-900 text-white hover:bg-slate-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Open Profile
                </Button>
                <Button
                  onClick={() => navigate(basicWorkAreaHref)}
                  variant="outline"
                  className="h-12 justify-start border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-900 dark:bg-slate-900 dark:text-sky-300 dark:hover:bg-slate-800"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Open Work Area
                </Button>
              </div>
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-sky-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Profile</CardTitle>
                <Users className="h-4 w-4 text-sky-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-slate-950 dark:text-white">
                  {loading ? "--" : (basicDashboardClient ? "Ready" : "Add")}
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {basicDashboardClient ? basicDashboardClient.name : "Create your first profile"}
                </p>
              </CardContent>
            </Card>

            <Card className="border-sky-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Report Pulls</CardTitle>
                <FileText className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-slate-950 dark:text-white">
                  {loading ? "--" : (stats.reportPulls || 0).toLocaleString()}
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">This month</p>
              </CardContent>
            </Card>

            <Card className="border-sky-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Funding Status</CardTitle>
                <Target className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-slate-950 dark:text-white">
                  {loading ? "--" : `${stats.fundable || 0}/${stats.notFundable || 0}`}
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Fundable / not fundable</p>
              </CardContent>
            </Card>

            <Card className="border-sky-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Access</CardTitle>
                <CheckCircle className="h-4 w-4 text-sky-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-slate-950 dark:text-white">Basic</div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Profile and Work Area</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
            <Card className="border-sky-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader>
                <CardTitle className="text-slate-950 dark:text-white">Your Current Profile</CardTitle>
                <CardDescription>Continue from the most recent client/report you added.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    <div className="h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-4 w-64 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-10 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  </div>
                ) : basicDashboardClient ? (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950">
                          {basicDashboardClient.name
                            .split(" ")
                            .filter(Boolean)
                            .map((namePart) => namePart[0])
                            .join("")
                            .slice(0, 2) || "SM"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold text-slate-950 dark:text-white">{basicDashboardClient.name}</div>
                        <div className="truncate text-sm text-slate-500 dark:text-slate-400">{basicDashboardClient.email}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => navigate(basicProfileHref)} variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                        <Eye className="mr-2 h-4 w-4" />
                        Profile
                      </Button>
                      <Button onClick={() => navigate(basicWorkAreaHref)} className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400">
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Work Area
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-sky-200 bg-sky-50/70 p-5 text-center dark:border-sky-900 dark:bg-slate-900">
                    <UserPlus className="mx-auto h-8 w-8 text-sky-500" />
                    <h3 className="mt-3 text-base font-semibold text-slate-950 dark:text-white">Add your first report</h3>
                    <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                      Profile and Work Area appear after the first report is added.
                    </p>
                    <Button onClick={handleAddClient} className="mt-4 bg-slate-900 text-white hover:bg-slate-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Report
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-sky-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader>
                <CardTitle className="text-slate-950 dark:text-white">Next Steps</CardTitle>
                <CardDescription>Profile, report, and settings shortcuts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={() => navigate(basicProfileHref)} variant="outline" className="h-11 w-full justify-start border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                  <Users className="mr-2 h-4 w-4" />
                  Review profile details
                </Button>
                <Button onClick={() => navigate(basicWorkAreaHref)} variant="outline" className="h-11 w-full justify-start border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                  <FileText className="mr-2 h-4 w-4" />
                  Review credit report
                </Button>
                <Button onClick={handleAddClient} className="h-11 w-full justify-start bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add or re-pull report
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : showEliteDashboard ? (
        <EliteDashboard
          stats={stats}
          clients={clients}
          recentActivity={recentActivity}
          loading={loading}
          animateOnMount={shouldAnimateEliteDashboardOnMount}
          creditReportLink={creditReportLink}
          clientLoginUrl={clientLoginUrl}
          clientIntakeLink={clientIntakeLink}
          qrCodeUrl={creditReportQrCodeUrl}
          referralQrCodeUrl={referralQrCodeUrl}
          qrLogoPath={qrLogoPath}
          hasAffiliateAccess={hasAffiliateAccess}
          affiliateVerificationStatus={affiliateVerificationStatus}
          affiliateLink={affiliateLink}
          eliteData={eliteData}
          onAddClient={handleAddClient}
          onCopyCreditReportLink={handleCopyCreditReportLink}
          onCopyClientLoginLink={handleCopyClientLoginLink}
          onCopyClientIntakeLink={handleCopyClientIntakeLink}
          onOpenCreditReportLink={handleOpenCreditReportLink}
          onOpenQrModal={() => openQrModal("credit-report")}
          onOpenReferralQrModal={() => openQrModal("referral")}
          onOpenClientIntakeShare={handleOpenClientIntakeShare}
          onHandleAffiliateProAccess={handleAffiliateProAccess}
          onNavigateSubscription={() => navigate("/subscription")}
          onCopyAffiliateLink={() => {
            if (affiliateLink) {
              navigator.clipboard.writeText(affiliateLink);
              toast({ title: "Link Copied!", description: "Referral link copied to clipboard" });
            }
          }}
          onCreditReports={handleCreditReports}
          onSettings={handleSettings}
          handleDeleteClient={handleDeleteClient}
          handleToggleLoginStatus={handleToggleLoginStatus}
          subscriptionHasActive={!!subscriptionStatus.hasActiveSubscription}
        />
      ) : (
      <>
      {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 mb-8">
        <Card
          className="border-0 shadow-lg bg-gradient-to-br from-white to-violet-50/60 dark:from-slate-800 dark:to-slate-700 hover:shadow-xl transition-all duration-300 cursor-pointer relative overflow-hidden"
          onClick={() => navigate("/clients")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Total Clients
            </CardTitle>
            <div className="gradient-primary p-2 rounded-lg">
              <Users className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold gradient-text-primary">
              {loading ? "--" : (stats.totalClients || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              <ArrowUp className="h-3 w-3 text-green-600 mr-1" />
              {loading ? "Loading..." : "Active clients"}
            </p>
          </CardContent>
          {/* Progress Chart Background */}
          <div className="absolute bottom-0 right-0 opacity-20">
            <svg
              width="80"
              height="40"
              viewBox="0 0 80 40"
              className="text-indigo-500"
            >
              <path
                d="M0,35 Q10,25 20,30 T40,20 T60,15 T80,10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="animate-pulse"
              />
              <circle
                cx="20"
                cy="30"
                r="2"
                fill="currentColor"
                className="animate-pulse"
                style={{ animationDelay: "0.5s" }}
              />
              <circle
                cx="40"
                cy="20"
                r="2"
                fill="currentColor"
                className="animate-pulse"
                style={{ animationDelay: "1s" }}
              />
              <circle
                cx="60"
                cy="15"
                r="2"
                fill="currentColor"
                className="animate-pulse"
                style={{ animationDelay: "1.5s" }}
              />
            </svg>
          </div>
        </Card>

        <Card
          className="border-0 shadow-lg bg-gradient-to-br from-white to-purple-50/50 dark:from-slate-800 dark:to-slate-700 hover:shadow-xl transition-all duration-300 cursor-pointer relative overflow-hidden"
          onClick={() => navigate("/clients?status=fundable")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Fundable
            </CardTitle>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-2 rounded-lg">
              <Award className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {loading ? "--" : (stats.fundable || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {loading ? "Loading..." : "Clients fundable"}
            </p>
          </CardContent>
          <div className="absolute bottom-0 right-0 opacity-20">
            <svg width="60" height="60" viewBox="0 0 60 60" className="text-purple-500">
              <circle cx="30" cy="30" r="20" fill="none" stroke="currentColor" strokeWidth="2" className="animate-pulse" />
              <circle cx="30" cy="30" r="10" fill="none" stroke="currentColor" strokeWidth="2" className="animate-pulse" style={{ animationDelay: "0.5s" }} />
              <path d="M30,10 L30,15 M30,45 L30,50 M10,30 L15,30 M45,30 L50,30" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
        </Card>

        <Card
          className="border-0 shadow-lg bg-gradient-to-br from-white to-orange-50/50 dark:from-slate-800 dark:to-slate-700 hover:shadow-xl transition-all duration-300 cursor-pointer relative overflow-hidden"
          onClick={() => navigate("/clients?status=notfundable")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Not Fundable
            </CardTitle>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-2 rounded-lg">
              <Target className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {loading ? "--" : (stats.notFundable || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {loading ? "Loading..." : "Clients not fundable"}
            </p>
          </CardContent>
          <div className="absolute bottom-0 right-0 opacity-20">
            <svg width="60" height="60" viewBox="0 0 60 60" className="text-orange-500">
              <circle cx="30" cy="30" r="25" fill="none" stroke="currentColor" strokeWidth="2" className="animate-pulse" />
              <circle cx="30" cy="30" r="15" fill="none" stroke="currentColor" strokeWidth="2" className="animate-pulse" style={{ animationDelay: "0.5s" }} />
              <circle cx="30" cy="30" r="5" fill="currentColor" />
            </svg>
          </div>
        </Card>

        <Card
          className="border-0 shadow-lg bg-gradient-to-br from-white to-green-50/50 dark:from-slate-800 dark:to-slate-700 hover:shadow-xl transition-all duration-300 cursor-pointer relative overflow-hidden"
          onClick={() => navigate("/clients?loginStatus=enabled")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Login Enabled
            </CardTitle>
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-2 rounded-lg">
              <Unlock className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {loading ? "--" : (stats.loginEnabled || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {loading ? "Loading..." : "Clients with login access"}
            </p>
          </CardContent>
          <div className="absolute bottom-0 right-0 opacity-20">
            <svg
              width="75"
              height="38"
              viewBox="0 0 75 38"
              className="text-green-500"
            >
              <path
                d="M5,30 L15,25 L25,20 L35,15 L45,10 L55,8 L65,5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="animate-pulse"
              />
              <polygon
                points="60,5 65,5 65,10"
                fill="currentColor"
                className="animate-pulse"
                style={{ animationDelay: "1s" }}
              />
            </svg>
          </div>
        </Card>

        <Card
          className="border-0 shadow-lg bg-gradient-to-br from-white to-red-50/50 dark:from-slate-800 dark:to-slate-700 hover:shadow-xl transition-all duration-300 cursor-pointer relative overflow-hidden"
          onClick={() => navigate("/clients?loginStatus=disabled")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Login Disabled
            </CardTitle>
            <div className="bg-gradient-to-br from-red-500 to-red-600 p-2 rounded-lg">
              <Lock className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              {loading ? "--" : (stats.loginDisabled || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {loading ? "Loading..." : "Clients locked by admin"}
            </p>
          </CardContent>
          <div className="absolute bottom-0 right-0 opacity-20">
            <svg
              width="75"
              height="38"
              viewBox="0 0 75 38"
              className="text-red-500"
            >
              <path
                d="M5,5 L15,10 L25,15 L35,20 L45,25 L55,30 L65,35"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="animate-pulse"
              />
              <polygon
                points="60,35 65,35 65,30"
                fill="currentColor"
                className="animate-pulse"
                style={{ animationDelay: "1s" }}
              />
            </svg>
          </div>
      </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Card
          className="border-0 shadow-lg bg-gradient-to-br from-white to-indigo-50/50 dark:from-slate-800 dark:to-slate-700 hover:shadow-xl transition-all duration-300 cursor-pointer relative overflow-hidden"
         
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Total Banks
            </CardTitle>
            <div className="gradient-primary p-2 rounded-lg">
              <Building2 className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold gradient-text-primary">
              {loading ? "--" : (stats.totalBanks || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {loading ? "Loading..." : "Registered banks"}
            </p>
          </CardContent>
          <div className="absolute bottom-0 right-0 opacity-20">
            <svg width="80" height="40" viewBox="0 0 80 40" className="text-indigo-500">
              <path d="M0,35 Q10,25 20,30 T40,20 T60,15 T80,10" fill="none" stroke="currentColor" strokeWidth="2" className="animate-pulse" />
            </svg>
          </div>
        </Card>

        <Card
          className="border-0 shadow-lg bg-gradient-to-br from-white to-indigo-50/60 dark:from-slate-800 dark:to-slate-700 hover:shadow-xl transition-all duration-300 cursor-pointer relative overflow-hidden"
          
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Total Products
            </CardTitle>
            <div className="bg-gradient-to-br from-violet-600 to-indigo-900 p-2 rounded-lg">
              <CreditCard className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">
              {loading ? "--" : (stats.totalCards || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {loading ? "Loading..." : "Available products"}
            </p>
          </CardContent>
          <div className="absolute bottom-0 right-0 opacity-20">
            <svg width="60" height="60" viewBox="0 0 60 60" className="text-indigo-500">
              <circle cx="30" cy="30" r="20" fill="none" stroke="currentColor" strokeWidth="2" className="animate-pulse" />
              <circle cx="30" cy="30" r="10" fill="none" stroke="currentColor" strokeWidth="2" className="animate-pulse" />
            </svg>
          </div>
        </Card>
      </div>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-violet-50/60 dark:from-slate-800 dark:to-slate-700 mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="text-xl font-bold gradient-text-primary">Get Your Credit Report</div>
                <div className="text-sm text-gray-700 dark:text-gray-300">If you don't have credit reports, register and pull your reports.</div>
              </div>
              <div className="flex-1 min-w-[280px]">
                <Label htmlFor="credit-report-link" className="text-sm font-medium">Credit Report Link</Label>
                <div className="mt-2 flex items-center gap-2">
                  <Input id="credit-report-link" value={creditReportLink} readOnly className="font-mono text-xs bg-slate-50 dark:bg-slate-800" />
                  <Button
                    size="sm"
                    className="gradient-primary hover:opacity-90"
                    onClick={handleCopyCreditReportLink}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={handleOpenCreditReportLink} className="bg-gradient-to-r from-ocean-blue to-sea-green hover:from-ocean-blue/90 hover:to-sea-green/90">
                  Register Now
                </Button>
              </div>
              <div className="flex flex-col items-center gap-3 p-4 bg-white/80 dark:bg-slate-800/70 rounded-xl border border-violet-100/80 dark:border-slate-700/80 shadow-sm min-w-[160px]">
                <button
                  type="button"
                  onClick={() => openQrModal("credit-report")}
                  className="relative h-32 w-32 rounded-lg overflow-hidden shadow-inner focus:outline-none focus:ring-2 focus:ring-ocean-blue/60"
                  aria-label="Open large QR code"
                >
                  <img
                    src={creditReportQrCodeUrl}
                    alt="Credit report registration QR code"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-8 w-8 rounded-full bg-white/90 backdrop-blur border border-slate-200 shadow-sm flex items-center justify-center">
                      <img
                        src={qrLogoPath}
                        alt="Fread App logo"
                        className="h-5 w-5 object-contain"
                      />
                    </div>
                  </div>
                </button>
                <div className="text-xs text-center text-slate-600 dark:text-slate-300 px-1">
                  Scan or tap to preview the registration link
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-indigo-50/60 dark:from-slate-800 dark:to-slate-700 mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="text-xl font-bold gradient-text-primary">Client Login Link</div>
                <div className="text-sm text-gray-700 dark:text-gray-300">Share this link with clients to access their login page.</div>
              </div>
              <div className="flex-1 min-w-[280px]">
                <Label htmlFor="client-login-link" className="text-sm font-medium">Client Login Link</Label>
                <div className="mt-2 flex items-center gap-2">
                  <Input id="client-login-link" value={clientLoginUrl} readOnly className="font-mono text-xs bg-slate-50 dark:bg-slate-800" />
                  <Button
                    size="sm"
                    className="gradient-primary hover:opacity-90"
                    onClick={handleCopyClientLoginLink}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-violet-50/60 dark:from-slate-800 dark:to-slate-700 mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="text-xl font-bold gradient-text-primary">Client Onboarding Link</div>
                <div className="text-sm text-gray-700 dark:text-gray-300">Share this link to collect client credentials and start onboarding.</div>
              </div>
              <div className="flex-1 min-w-[280px]">
                <Label htmlFor="client-intake-link" className="text-sm font-medium">Client Onboarding Link</Label>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    id="client-intake-link"
                    value={clientIntakeLink}
                    readOnly
                    placeholder="Generate a link to share"
                    className="font-mono text-xs bg-slate-50 dark:bg-slate-800"
                  />
                  <Button
                    size="sm"
                    className="gradient-primary hover:opacity-90"
                    onClick={handleCopyClientIntakeLink}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleOpenClientIntakeShare}
                    className="flex items-center gap-1"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                </div>
              </div>
              {!clientIntakeLink && !onboardingIntakeLink && (
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleGenerateClientIntakeLink}
                    disabled={isGeneratingIntakeLink}
                    className="bg-gradient-to-r from-violet-600 to-indigo-900 hover:from-violet-600/90 hover:to-indigo-900/90"
                  >
                    {isGeneratingIntakeLink ? "Generating..." : "Generate Onboarding Link"}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        

     

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Client Management Section */}
          <div className="lg:col-span-2">
            
        <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm mb-8">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="gradient-text-primary">
                Calendar
              </CardTitle>
              <CardDescription>
                Client report reminders and scheduled meetings
              </CardDescription>
            </div>
            <div className="gradient-primary p-2 rounded-lg">
              <Calendar className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <AdminCalendar />
          </CardContent>
        </Card>
          <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="gradient-text-primary">
                    Recent Clients
                  </CardTitle>
                  <CardDescription>
                    Track your clients and their report progress
                  </CardDescription>
                </div>
                <div className="flex items-center flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFilterClients}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                  <Button
                    onClick={handleAddClient}
                    size="sm"
                    className="gradient-primary hover:opacity-90"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Client
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-3 sm:space-y-0 mb-6">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search clients..."
                    className="pl-10 bg-gradient-light border-border/40"
                  />
                </div>
              </div>

              {/* Client Table */}
              <div className="rounded-lg border border-border/40 overflow-x-auto overflow-y-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-light">
                      <TableHead>Client</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Funding Status</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                              <div className="space-y-1">
                                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                                <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-6 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : clients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="text-gray-500 dark:text-gray-400">
                            No clients found. Add your first client to get
                            started!
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      clients.map((client) => {
                        const scoreChange = getScoreChange(
                          client.creditScore,
                          client.previousScore,
                        );
                        const ChangeIcon = scoreChange.icon;

                        return (
                          <TableRow
                            key={client.id}
                            className="hover:bg-gradient-light/50"
                          >
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="gradient-primary text-white text-xs">
                                    {client.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">
                                    {client.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {client.email}
                                  </div>
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
                            <TableCell>
                            <Badge
                              variant="outline"
                              className={`${
                                client.fundableStatus === 'Fundable' ? "border-green-500/30 text-green-600" : 
                                "border-red-500/30 text-red-600"
                              }`}
                            >
                              {client.fundableStatus}
                            </Badge>
                            </TableCell>
                            <TableCell>
                              <div
                                className={`flex items-center space-x-1 ${scoreChange.color}`}
                              >
                                <ChangeIcon className="h-3 w-3" />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                  {scoreChange.isPositive ? "+" : ""}
                                  {scoreChange.value}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="border-ocean-blue/30 text-ocean-blue"
                              >
                                ${client.creditScore > 650 ? (client.disputesActive * 1000) : 0}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleViewProfile(client.id)}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Profile
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleViewReports(client.id)}
                                  >
                                    <FileText className="h-4 w-4 mr-2" />
                                    View Reports
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          </div>

        {/* Right sidebar with activity and quick stats */}
          <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="border-0 shadow-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="gradient-text-primary">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handleAddClient}
                className="w-full justify-start gradient-primary hover:black"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add New Client
              </Button>
              <Button
                  onClick={handleCreditReports}
                  variant="outline"
                  className="w-full justify-start border-ocean-blue/30 text-ocean-blue hover:black"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Credit Reports
              </Button>
              <Button
                  onClick={handleSettings}
                  variant="outline"
                  className="w-full justify-start border-sea-green/30 text-sea-green hover:black"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
              </Button>
              
              {/* Affiliate Pro Plan Access for Admin Users */}
              {hasAffiliateAccess && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    onClick={handleAffiliateProAccess}
                    variant="outline"
                    className="w-full justify-start border-purple-500/30 text-purple-600"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    {affiliateVerificationStatus === 'active' 
                      ? 'Affiliate Pro Dashboard'
                      : 'Verify Affiliate Access'
                    }
                  </Button>
                  {affiliateVerificationStatus === 'pending_verification' && (
                    <p className="text-xs text-muted-foreground mt-1 px-2">
                      Complete email verification to access your affiliate pro features
                    </p>
                  )}
                </div>
              )}

              {/* Admin Referral Link / Affiliate CTA */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
                {(!subscriptionStatus.isLoading && !subscriptionStatus.hasActiveSubscription) ? (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      Get plan to unlock Pro affiliate dashboard access and earn 20–25% commission.
                    </div>
                    <Button onClick={() => navigate('/subscription')} className="w-full gradient-primary">
                      Get Plan
                    </Button>
                  </div>
                ) : hasAffiliateAccess ? (
                  affiliateVerificationStatus === 'active' ? (
                    <div className="space-y-2">
                      <Label htmlFor="admin-referral-link" className="text-sm font-medium">Your Referral Link</Label>
                      <div className="flex items-center gap-2">
                        <Input id="admin-referral-link" value={affiliateLink} readOnly className="font-mono text-xs bg-slate-50 dark:bg-slate-800" />
                        <Button
                          size="sm"
                          className="gradient-primary hover:opacity-90"
                          onClick={() => {
                            if (affiliateLink) {
                              navigator.clipboard.writeText(affiliateLink);
                              toast({ title: 'Link Copied!', description: 'Referral link copied to clipboard' });
                            }
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-violet-100 bg-violet-50/70 p-3 dark:border-violet-900/40 dark:bg-violet-950/20">
                        <div>
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Referral QR</div>
                          <div className="text-xs text-muted-foreground">Open the referral QR preview and download it.</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => openQrModal("referral")}
                          disabled={!referralQrCodeUrl}
                          className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-violet-200 bg-white p-0.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-900/50"
                          aria-label="Open referral QR code"
                        >
                          <img
                            src={referralQrCodeUrl}
                            alt="Referral link QR code"
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-5 w-5 rounded-full bg-white/90 backdrop-blur border border-slate-200 shadow-sm flex items-center justify-center">
                              <img
                                src={qrLogoPath}
                                alt="Fread App logo"
                                className="h-3 w-3 object-contain"
                              />
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Verify your affiliate access to get your referral link.</div>
                      <Button onClick={() => openAffiliatePortal('/verify-email')} variant="outline" className="w-full justify-start">
                        Verify Affiliate Access
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Affiliate account not set up.</div>
                    <Button onClick={() => navigate('/join-affiliate')} variant="outline" className="w-full justify-start">
                      Set it up now
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-0 shadow-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="gradient-text-secondary">
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest updates from your clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex space-x-3">
                      <div className="w-2 h-2 rounded-full mt-2 bg-gray-200 dark:bg-gray-700 animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </div>
                    </div>
                  ))
                ) : !Array.isArray(recentActivity) ||
                  recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No recent activity
                  </div>
                ) : (
                  (recentActivity || []).map((activity) => (
                    <div key={activity.id} className="flex space-x-3">
                      <div
                        className={`w-2 h-2 rounded-full mt-2 ${
                          activity.status === "success"
                            ? "bg-green-500"
                            : activity.status === "info"
                              ? "bg-indigo-600"
                              : "bg-yellow-500"
                        }`}
                      />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          {activity.client}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Performance Summary */}
          <Card className="border-0 shadow-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="gradient-text-primary dark:text-white">
                This Month's Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-ocean-blue" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    New Clients
                  </span>
                </div>
                <span className="text-sm font-bold text-ocean-blue">
                  {loading
                    ? "--"
                    : (stats.totalClients || 0) > 0
                      ? Math.floor((stats.totalClients || 0) * 0.15)
                      : "0"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-sea-green" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Got Funded
                  </span>
                </div>
                <span className="text-sm font-bold text-sea-green">
                  {loading
                    ? "--"
                    : (stats.fundable || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Award className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Reports Pulls
                  </span>
                </div>
                <span className="text-sm font-bold text-purple-600">
                  {loading ? "--" : (stats.reportPulls || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-indigo-700 dark:text-indigo-300" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Funding Invoice Paid
                  </span>
                </div>
                <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                  {loading ? "--" : (stats.fundingInvoicesPaid || 0)}
                </span>
              </div>
            </CardContent>
          </Card>
          </div>
      </div>
      </>
      )}

      <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">{qrModalTitle}</DialogTitle>
            <DialogDescription>{qrModalDescription}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="relative h-80 w-80 max-w-full rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700 bg-white/95">
              <img
                src={activeQrCodeUrl}
                alt={qrModalAlt}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-16 w-16 rounded-full bg-white/95 backdrop-blur border border-slate-200 shadow flex items-center justify-center">
                  <img
                    src={qrLogoPath}
                    alt="Fread App logo"
                    className="h-12 w-12 object-contain"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" onClick={handleOpenQrLink}>Open Link</Button>
              <Button onClick={handleDownloadQrCode} className="gap-2">
                <Download className="h-4 w-4" />
                Download QR
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQrModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isClientIntakeShareOpen} onOpenChange={setIsClientIntakeShareOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Client Intake Sharing</DialogTitle>
            <DialogDescription>Copy the link or iframe to share with clients or embed on your site.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Share I</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={clientIntakeLink}
                  readOnly
                  className="font-mono text-xs bg-slate-50 dark:bg-slate-800"
                />
                <Button size="sm" className="gradient-primary hover:opacity-90" onClick={handleCopyClientIntakeLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Share II</Label>
              <Textarea
                value={clientIntakeEmbedCode}
                readOnly
                className="font-mono text-xs bg-slate-50 dark:bg-slate-800 min-h-[120px]"
              />
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={handleCopyClientIntakeEmbedCode}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Iframe
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsClientIntakeShareOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Client Dialog */}
        <Dialog open={isAddClientOpen} onOpenChange={handleAddClientDialogChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="gradient-text-primary">
              Add New Client
            </DialogTitle>
            <DialogDescription>
              Enter the client's information to get started with their credit
              repair journey.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitClient} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platform">Platform *</Label>
                <Select
                  value={newClient.platform}
                  onValueChange={(value) =>
                    handleInputChange("platform", value)
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="myfreescorenow">MyFreeScoreNow</SelectItem>
                    <SelectItem value="identityiq">IdentityIQ</SelectItem>
                    <SelectItem value="myscoreiq">MyScoreIQ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newClient.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="john.doe@email.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showDashboardPassword ? "text" : "password"}
                    value={newClient.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    placeholder="••••••••"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDashboardPassword(!showDashboardPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showDashboardPassword ? "Hide password" : "Show password"}
                    aria-pressed={showDashboardPassword}
                    title={showDashboardPassword ? "Hide password" : "Show password"}
                  >
                    {showDashboardPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {(newClient.platform === "identityiq" || newClient.platform === "myscoreiq") && (
                <div className="space-y-2">
                  <Label htmlFor="ssnLast4">SSN Last 4 *</Label>
                  <Input
                    id="ssnLast4"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    autoComplete="off"
                    title="Please enter 4 digits (e.g., 1234)"
                    value={newClient.ssnLast4}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
                      handleInputChange("ssnLast4", digitsOnly);
                    }}
                    placeholder="1234"
                    required
                  />
                </div>
              )}
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                className="mt-0.5 border-slate-400 bg-white data-[state=checked]:border-slate-900"
                id="dashboard-authorization"
                checked={dashboardAuthorization}
                onCheckedChange={(checked) => setDashboardAuthorization(checked === true)}
              />
              <Label htmlFor="dashboard-authorization" className="text-sm leading-5 text-slate-600 cursor-pointer">
                I confirm this is my client credit report and I am authorized to use for educational analysis.
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleAddClientDialogChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="gradient-primary"
                disabled={
                  isSubmitting ||
                  !newClient.platform ||
                  !newClient.email ||
                  !newClient.password ||
                  !dashboardAuthorization ||
                  ((newClient.platform === "identityiq" || newClient.platform === "myscoreiq") && (!newClient.ssnLast4 || newClient.ssnLast4.length !== 4))
                }
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Adding Client...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Client
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
        </Dialog>

      {/* Email Verification Modal */}
      <EmailVerificationModal
        isOpen={isEmailVerificationModalOpen}
        onClose={() => setIsEmailVerificationModalOpen(false)}
      />
      {/* Admin Contract Prompt (post-purchase signing) */}
      <AdminContractPrompt />

      {/* ── Elite Welcome Popup (after cinematic transition) ── */}
      <AnimatePresence>
        {showEliteWelcome && (
          <motion.div
            key="elite-welcome-popup"
            className="fixed inset-0 z-[9998] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowEliteWelcome(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
            {/* Popup Card */}
            <motion.div
              className="relative w-[90vw] max-w-lg rounded-3xl overflow-hidden shadow-2xl"
              style={{ boxShadow: '0 0 80px rgba(0,212,255,0.3), 0 0 160px rgba(112,0,255,0.15)' }}
              initial={{ opacity: 0, scale: 0.7, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            >
              {/* Neon top border */}
              <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #00d4ff, #7000ff, #ff00ff, #00ffcc, #00d4ff)' }} />
              {/* Content */}
              <div className="relative px-8 py-10 text-center" style={{ background: 'linear-gradient(180deg, #0a0a1a 0%, #0d0d2b 100%)' }}>
                {/* Background particles */}
                {Array.from({ length: 20 }).map((_, i) => (
                  <motion.div
                    key={`wp-${i}`}
                    className="absolute rounded-full"
                    style={{
                      width: 2 + Math.random() * 3,
                      height: 2 + Math.random() * 3,
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      background: ['#00d4ff', '#7000ff', '#ff00ff', '#00ffcc'][i % 4],
                      opacity: 0.3,
                    }}
                    animate={{ opacity: [0.1, 0.5, 0.1], y: [0, -10, 0] }}
                    transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, repeatType: 'loop' }}
                  />
                ))}

                {/* Crown icon */}
                <motion.div
                  className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6"
                  style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(112,0,255,0.2))', border: '2px solid rgba(0,212,255,0.3)', boxShadow: '0 0 30px rgba(0,212,255,0.2)' }}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: 'spring', damping: 12 }}
                >
                  <Crown className="h-10 w-10 text-cyan-400" />
                </motion.div>

                {/* Title */}
                <motion.h2
                  className="text-3xl sm:text-4xl font-black mb-3"
                  style={{ background: 'linear-gradient(135deg, #00d4ff 0%, #7000ff 50%, #ff00ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                >
                  Welcome to Elite!
                </motion.h2>

                {/* Description */}
                <motion.p
                  className="text-cyan-200/80 text-sm sm:text-base mb-8 max-w-sm mx-auto leading-relaxed"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45, duration: 0.5 }}
                >
                  Your dashboard has been upgraded with premium Fread App Elite features. Enjoy the enhanced experience!
                </motion.p>

                {/* Feature highlights */}
                <motion.div
                  className="grid grid-cols-3 gap-3 mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                >
                  {[
                    { icon: '⚡', label: 'Elite CRM' },
                    { icon: '📊', label: 'Pro Analytics' },
                    { icon: '🛡️', label: 'Premium Tools' },
                  ].map((feat, idx) => (
                    <div key={idx} className="rounded-xl p-3 border border-cyan-800/30" style={{ background: 'rgba(0,212,255,0.05)' }}>
                      <div className="text-2xl mb-1">{feat.icon}</div>
                      <div className="text-xs text-cyan-300/70 font-medium">{feat.label}</div>
                    </div>
                  ))}
                </motion.div>

                {/* CTA Button */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.75, duration: 0.5 }}
                >
                  <Button
                    onClick={() => setShowEliteWelcome(false)}
                    className="px-10 py-3 text-base font-bold rounded-xl text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #00d4ff, #7000ff)', boxShadow: '0 0 30px rgba(0,212,255,0.3)' }}
                  >
                    🚀 Let's Go!
                  </Button>
                </motion.div>

                {/* Bottom neon line */}
                <motion.div
                  className="mt-8 h-0.5 mx-auto rounded-full"
                  style={{ background: 'linear-gradient(90deg, transparent, #00d4ff, #7000ff, #ff00ff, transparent)' }}
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 200, opacity: 0.5 }}
                  transition={{ delay: 0.9, duration: 0.6 }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
