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
import { Textarea } from "@/components/ui/textarea";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Users,
  DollarSign,
  MousePointer,
  TrendingUp,
  Copy,
  Download,
  Eye,
  Share2,
  LinkIcon,
  Calculator,
  Calendar,
  Trophy,
  Target,
  Zap,
  Award,
  BarChart3,
  ExternalLink,
  Star,
  Sparkles,
  CreditCard,
  Wallet,
  Gift,
  Crown,
  CheckCircle,
  Clock,
  ArrowRight,
  Plus,
  FileText,
  Mail,
  MessageSquare,
  Image as ImageIcon,
  Video,
  Smartphone,
  Monitor,
  Globe,
  TrendingDown,
  Percent,
  RefreshCw,
  Settings,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthToken, affiliateApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

interface AffiliateStats {
  totalEarnings: number;
  monthlyEarnings: number;
  totalReferrals: number;
  activeReferrals: number;
  clickThroughRate: number;
  conversionRate: number;
  pendingCommissions: number;
  nextPayment: string;
}

interface Referral {
  id: number;
  name?: string;
  customerName?: string;
  email: string;
  status: "active" | "inactive" | "converted";
  signupDate?: string;
  dateReferred?: string;
  commissionEarned?: number;
  commission?: number;
  lifetime_value?: number;
  lifetimeValue?: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
}

interface Commission {
  id: number;
  referralName: string;
  amount: number;
  date: string;
  status: "paid" | "pending" | "processing";
  type: "signup" | "monthly" | "upgrade";
}

interface MarketingMaterial {
  id: number;
  title: string;
  type: "banner" | "email" | "social" | "video" | "landing";
  format: string;
  size?: string;
  downloads: number;
}

interface AdminEarnings {
  totalEarnings: number;
  monthlyGrowth: number;
  directCommissions: number;
  overrideCommissions: number;
  monthlyBreakdown: Array<{
    month: string;
    direct: number;
    override: number;
    total: number;
  }>;
}

interface AffiliateEarning {
  id: number;
  name: string;
  email: string;
  level: string;
  totalEarnings: number;
  monthlyEarnings: number;
  commissionRate: string;
  recruits: number;
  status: "Active" | "Inactive";
  joinDate: string;
}

interface TeamPerformance {
  level1: {
    count: number;
    earnings: number;
  };
  level2: {
    count: number;
    earnings: number;
  };
  level3: {
    count: number;
    earnings: number;
  };
}

export default function Affiliate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const subscriptionStatus = useSubscriptionStatus();
  const [isLinkGeneratorOpen, setIsLinkGeneratorOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [customTrackingCode, setCustomTrackingCode] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AffiliateStats>({
    totalEarnings: 0,
    monthlyEarnings: 0,
    totalReferrals: 0,
    activeReferrals: 0,
    clickThroughRate: 0,
    conversionRate: 0,
    pendingCommissions: 0,
    nextPayment: ""
  });
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [performanceData, setPerformanceData] = useState<{
    clickThroughRate?: number;
    conversionRate?: number;
  }>({});
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [earningsBreakdown, setEarningsBreakdown] = useState<any>({
    commissions: 0,
    bonuses: 0,
    recurringCommissions: 0,
    oneTimeCommissions: 0,
    tierBonuses: 0
  });
  const [monthlyEarnings, setMonthlyEarnings] = useState<any[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance>({
    level1: { count: 0, earnings: 0 },
    level2: { count: 0, earnings: 0 },
    level3: { count: 0, earnings: 0 }
  });
  
  // Calculator state
  const [calculatorReferrals, setCalculatorReferrals] = useState(0);
  const [calculatorConversion, setCalculatorConversion] = useState(12.8);
  const [calculatedEarnings, setCalculatedEarnings] = useState(0);

  // Function to calculate tier progress
  const calculateTierProgress = () => {
    const totalReferrals = stats.totalReferrals || 0;
    const activeReferrals = stats.activeReferrals || 0;
    
    // Define tier thresholds
    const tierThresholds = {
      bronze: 0,
      silver: 5,
      gold: 15,
      platinum: 30
    };
    
    // Current tier logic based on active referrals
    let currentTier = 'bronze';
    let nextTier = 'silver';
    let progressPercentage = 0;
    let referralsNeeded = 0;
    
    if (activeReferrals >= tierThresholds.platinum) {
      currentTier = 'platinum';
      nextTier = 'platinum';
      progressPercentage = 100;
      referralsNeeded = 0;
    } else if (activeReferrals >= tierThresholds.gold) {
      currentTier = 'gold';
      nextTier = 'platinum';
      const progress = activeReferrals - tierThresholds.gold;
      const needed = tierThresholds.platinum - tierThresholds.gold;
      progressPercentage = Math.min((progress / needed) * 100, 100);
      referralsNeeded = tierThresholds.platinum - activeReferrals;
    } else if (activeReferrals >= tierThresholds.silver) {
      currentTier = 'silver';
      nextTier = 'gold';
      const progress = activeReferrals - tierThresholds.silver;
      const needed = tierThresholds.gold - tierThresholds.silver;
      progressPercentage = Math.min((progress / needed) * 100, 100);
      referralsNeeded = tierThresholds.gold - activeReferrals;
    } else {
      currentTier = 'bronze';
      nextTier = 'silver';
      progressPercentage = Math.min((activeReferrals / tierThresholds.silver) * 100, 100);
      referralsNeeded = tierThresholds.silver - activeReferrals;
    }
    
    return {
      currentTier,
      nextTier,
      progressPercentage: Math.round(progressPercentage),
      referralsNeeded: Math.max(referralsNeeded, 0)
    };
  };

  // Load data on component mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Check authentication before making API calls
      const token = getAuthToken();
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to access dashboard data.",
          variant: "destructive",
        });
        navigate("/affiliate/login");
        return;
      }
      
      // Load stats
      const statsResponse = await affiliateApi.getStats();
      if (statsResponse.data && statsResponse.data.success) {
        setStats({
          totalEarnings: statsResponse.data.data.totalEarnings || 0,
          monthlyEarnings: statsResponse.data.data.monthlyEarnings || 0,
          totalReferrals: statsResponse.data.data.totalReferrals || 0,
          activeReferrals: statsResponse.data.data.activeReferrals || 0,
          clickThroughRate: statsResponse.data.data.clickThroughRate || 0,
          conversionRate: statsResponse.data.data.conversionRate || 0,
          pendingCommissions: statsResponse.data.data.pendingCommissions || 0,
          nextPayment: statsResponse.data.data.nextPayment || ""
        });
      }
      
      // Load recent referrals
      const referralsResponse = await affiliateApi.getRecentReferrals(10);
      if (referralsResponse.data && referralsResponse.data.success) {
        setReferrals(referralsResponse.data.data);
      }
      
      // Load commissions
      const commissionsResponse = await affiliateApi.getCommissions({ limit: 10 });
      if (commissionsResponse.data && commissionsResponse.data.success) {
        setCommissions(commissionsResponse.data.data);
      }
      
      // Load performance data
      const performanceResponse = await affiliateApi.getAnalytics();
      if (performanceResponse.data && performanceResponse.data.success) {
        setPerformanceData(performanceResponse.data.data);
      }
      
      // Load payment history (using new payment history endpoint)
      const paymentResponse = await affiliateApi.getPaymentHistory();
      if (paymentResponse.data && paymentResponse.data.success) {
        setPaymentHistory(Array.isArray(paymentResponse.data.data) ? paymentResponse.data.data : []);
      } else {
        setPaymentHistory([]);
      }

      // Load earnings breakdown
      const breakdownResponse = await affiliateApi.getEarningsBreakdown();
      if (breakdownResponse.data && breakdownResponse.data.success) {
        setEarningsBreakdown(breakdownResponse.data.data);
      }

      // Load monthly earnings
      const monthlyResponse = await affiliateApi.getMonthlyEarnings();
      if (monthlyResponse.data && monthlyResponse.data.success) {
        setMonthlyEarnings(monthlyResponse.data.data);
      }

      // Load team performance data
      const teamPerformanceResponse = await affiliateApi.getTeamPerformance();
      if (teamPerformanceResponse.data && teamPerformanceResponse.data.success) {
        setTeamPerformance(teamPerformanceResponse.data.data);
      }
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      
      // Handle authentication errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        });
        navigate("/affiliate/login");
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate earnings function for the calculator
  const calculateEarnings = () => {
    if (calculatorReferrals > 0) {
      const conversions = calculatorReferrals * (calculatorConversion / 100);
      // Assuming $100 signup bonus + $37.50/month recurring
      const signupEarnings = conversions * 100;
      const recurringEarnings = conversions * 37.50;
      const totalEarnings = signupEarnings + recurringEarnings;
      setCalculatedEarnings(totalEarnings);
    } else {
      setCalculatedEarnings(0);
    }
  };

  // Mock referrals data as fallback
  const mockReferrals: Referral[] = [
    {
      id: 1,
      name: "Sarah Thompson",
      email: "sarah@example.com",
      status: "active",
      signupDate: "2024-01-15",
      commissionEarned: 450.00,
      lifetime_value: 2400.00,
      tier: "gold"
    },
    {
      id: 2,
      name: "Michael Rodriguez",
      email: "michael@example.com",
      status: "converted",
      signupDate: "2024-01-12",
      commissionEarned: 320.00,
      lifetime_value: 1800.00,
      tier: "silver"
    },
    {
      id: 3,
      name: "Jessica Chen",
      email: "jessica@example.com",
      status: "active",
      signupDate: "2024-01-10",
      commissionEarned: 680.00,
      lifetime_value: 3200.00,
      tier: "platinum"
    }
  ];

  // Mock data for admin earnings
  const adminEarnings: AdminEarnings = {
    totalEarnings: 45750,
    monthlyGrowth: 18.5,
    directCommissions: 28500,
    overrideCommissions: 17250,
    monthlyBreakdown: [
      { month: "Jan", direct: 4200, override: 2100, total: 6300 },
      { month: "Feb", direct: 4800, override: 2400, total: 7200 },
      { month: "Mar", direct: 5100, override: 2850, total: 7950 },
      { month: "Apr", direct: 5600, override: 3200, total: 8800 },
      { month: "May", direct: 4900, override: 2950, total: 7850 },
      { month: "Jun", direct: 3900, override: 3750, total: 7650 },
    ]
  };

  // Mock data for affiliate earnings
  const affiliateEarningsData: AffiliateEarning[] = [
    {
      id: 1,
      name: "John Smith",
      email: "john@example.com",
      level: "Level 1",
      totalEarnings: 12500,
      monthlyEarnings: 2100,
      commissionRate: "15%",
      recruits: 8,
      status: "Active",
      joinDate: "2024-01-15"
    },
    {
      id: 2,
      name: "Sarah Wilson",
      email: "sarah@example.com",
      level: "Level 2",
      totalEarnings: 8750,
      monthlyEarnings: 1450,
      commissionRate: "12%",
      recruits: 5,
      status: "Active",
      joinDate: "2024-02-20"
    },
    {
      id: 3,
      name: "Mike Johnson",
      email: "mike@example.com",
      level: "Level 1",
      totalEarnings: 15200,
      monthlyEarnings: 2800,
      commissionRate: "15%",
      recruits: 12,
      status: "Active",
      joinDate: "2023-11-10"
    },
    {
      id: 4,
      name: "Emily Davis",
      email: "emily@example.com",
      level: "Level 3",
      totalEarnings: 4200,
      monthlyEarnings: 650,
      commissionRate: "8%",
      recruits: 2,
      status: "Active",
      joinDate: "2024-03-05"
    },
    {
      id: 5,
      name: "David Brown",
      email: "david@example.com",
      level: "Level 2",
      totalEarnings: 9800,
      monthlyEarnings: 1750,
      commissionRate: "12%",
      recruits: 7,
      status: "Inactive",
      joinDate: "2024-01-28"
    }
  ];

  const marketingMaterials: MarketingMaterial[] = [
    {
      id: 1,
      title: "Hero Banner - Funding Success",
      type: "banner",
      format: "PNG",
      size: "1200x600px",
      downloads: 145
    },
    {
      id: 2,
      title: "Email Template - Free Funding Report",  
      type: "email",
      format: "HTML",
      downloads: 89
    },
    {
      id: 3,
      title: "Social Media Kit - Instagram Stories",
      type: "social",
      format: "JPG",
      size: "1080x1920px",
      downloads: 203
    },
    {
      id: 4,
      title: "Product Demo Video",
      type: "video",
      format: "MP4",
      size: "1920x1080px",
      downloads: 67
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "inactive":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "converted":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "paid":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "processing":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "bronze":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "silver":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "gold":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "platinum":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "bronze":
        return <Award className="h-3 w-3" />;
      case "silver":
        return <Star className="h-3 w-3" />;
      case "gold":
        return <Trophy className="h-3 w-3" />;
      case "platinum":
        return <Crown className="h-3 w-3" />;
      default:
        return <Award className="h-3 w-3" />;
    }
  };

  const generateAffiliateLink = async () => {
    if (!selectedCampaign) {
      toast({
        title: "Error",
        description: "Please select a campaign type",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const response = await affiliateApi.generateLink({
        campaign: selectedCampaign,
        customCode: customTrackingCode
      });
      
      if (response.data && response.data.success) {
        const data = response.data.data;
        const linkOut = typeof data === 'string' ? data : (data.link || data.productLink || data.affiliateOnlyLink);
        setGeneratedLink(linkOut);
        toast({
          title: "Success",
          description: "Affiliate link generated successfully!",
          variant: "default"
        });
      } else {
        throw new Error('Failed to generate link');
      }
    } catch (error) {
      console.error('Error generating affiliate link:', error);
      toast({
        title: "Error",
        description: "Failed to generate affiliate link",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Success",
      description: "Copied to clipboard!",
      variant: "default"
    });
  };

  return (
    <DashboardLayout
      title="Affiliate Dashboard"
      description="Grow your income by referring clients to CreditRepairPro"
    >
      {/* Program Tier Information */}
      <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Affiliate Program (Free) */}
        <Card className={`border-2 ${!subscriptionStatus.hasActiveSubscription ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-800' : 'border-gray-200 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900/20 dark:to-slate-800'}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Share2 className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-lg text-emerald-700 dark:text-emerald-400">Affiliate Program</CardTitle>
              </div>
              {!subscriptionStatus.hasActiveSubscription && (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                  Current Plan
                </Badge>
              )}
            </div>
            <CardDescription className="text-emerald-600 dark:text-emerald-300 font-medium">
              Free to join • 10–15% recurring commission
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span>Free entry with instant approval</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span>10–15% commission on all paid referrals</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span>Complete tracking links, dashboards & marketing assets</span>
            </div>
          </CardContent>
        </Card>

        {/* Partner Program (Paid) */}
        <Card className={`border-2 ${subscriptionStatus.hasActiveSubscription ? 'border-purple-200 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-slate-800' : 'border-purple-300 bg-gradient-to-br from-purple-100 to-white dark:from-purple-900/30 dark:to-slate-800'} relative overflow-hidden`}>
          <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-500 to-purple-600 text-white px-3 py-1 text-xs font-semibold">
            PREMIUM
          </div>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Crown className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-lg text-purple-700 dark:text-purple-400">Partner Program</CardTitle>
              </div>
              {subscriptionStatus.hasActiveSubscription ? (
                <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">
                  Current Plan
                </Badge>
              ) : (
                <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50">
                  Upgrade Available
                </Badge>
              )}
            </div>
            <CardDescription className="text-purple-600 dark:text-purple-300 font-medium">
              Paid tier • 20–25% recurring commission
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300">
              <Star className="h-4 w-4 text-purple-500" />
              <span>20–25% commission tier with premium support</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300">
              <Star className="h-4 w-4 text-purple-500" />
              <span>Co-marketing opportunities & advanced training</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300">
              <Star className="h-4 w-4 text-purple-500" />
              <span>Perfect for agencies & high-volume partners</span>
            </div>
            {!subscriptionStatus.hasActiveSubscription && (
              <>
                <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-800 dark:text-purple-300 mb-2 flex items-center">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Partner Program Benefits
                  </h4>
                  <ul className="space-y-1 text-sm text-purple-700 dark:text-purple-300">
                    <li className="flex items-center">
                      <ArrowRight className="h-3 w-3 mr-2" />
                      Higher commission rates (20-25%)
                    </li>
                    <li className="flex items-center">
                      <ArrowRight className="h-3 w-3 mr-2" />
                      Priority support & dedicated account manager
                    </li>
                    <li className="flex items-center">
                      <ArrowRight className="h-3 w-3 mr-2" />
                      Exclusive marketing materials & co-branding
                    </li>
                    <li className="flex items-center">
                      <ArrowRight className="h-3 w-3 mr-2" />
                      Advanced analytics & performance insights
                    </li>
                    <li className="flex items-center">
                      <ArrowRight className="h-3 w-3 mr-2" />
                      Early access to new features & beta programs
                    </li>
                  </ul>
                </div>
              </>
            )}
            <Button 
              className="w-full mt-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
              onClick={() => navigate('/affiliate/subscription')}
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Partner Program
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-9 lg:w-auto lg:grid-cols-9">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="admin-earnings">My Earnings</TabsTrigger>
          <TabsTrigger value="affiliate-earnings">Affiliate Earnings</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-emerald-50/50 dark:from-slate-800 dark:to-slate-700 hover:shadow-xl transition-all duration-300 relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Total Earnings
                </CardTitle>
                <div className="gradient-secondary p-2 rounded-lg">
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                {loading ? (
                  <div className="space-y-2">
                    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold gradient-text-secondary">
                      ${(stats.totalEarnings || 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center">
                      <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                      +23% from last month
                    </p>
                  </>
                )}
              </CardContent>
              {/* Earnings Chart Background */}
              <div className="absolute bottom-0 right-0 opacity-20">
                <svg width="80" height="40" viewBox="0 0 80 40" className="text-emerald-500">
                  <path
                    d="M0,35 Q10,30 20,25 T40,15 T60,10 T80,5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="animate-pulse"
                  />
                  <circle cx="20" cy="25" r="2" fill="currentColor" className="animate-pulse" style={{animationDelay: '0.5s'}} />
                  <circle cx="40" cy="15" r="2" fill="currentColor" className="animate-pulse" style={{animationDelay: '1s'}} />
                  <circle cx="60" cy="10" r="2" fill="currentColor" className="animate-pulse" style={{animationDelay: '1.5s'}} />
                </svg>
              </div>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-800 dark:to-slate-700 hover:shadow-xl transition-all duration-300 relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Monthly Earnings
                </CardTitle>
                <div className="gradient-primary p-2 rounded-lg">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                {loading ? (
                  <div className="space-y-2">
                    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold gradient-text-primary">
                      ${(stats.monthlyEarnings || 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This month's earnings
                    </p>
                  </>
                )}
              </CardContent>
              {/* Monthly Progress Chart */}
              <div className="absolute bottom-0 right-0 opacity-20">
                <svg width="70" height="35" viewBox="0 0 70 35" className="text-blue-500">
                  <rect x="5" y="20" width="6" height="15" fill="currentColor" className="animate-pulse" style={{animationDelay: '0.2s'}} />
                  <rect x="15" y="15" width="6" height="20" fill="currentColor" className="animate-pulse" style={{animationDelay: '0.4s'}} />
                  <rect x="25" y="10" width="6" height="25" fill="currentColor" className="animate-pulse" style={{animationDelay: '0.6s'}} />
                  <rect x="35" y="5" width="6" height="30" fill="currentColor" className="animate-pulse" style={{animationDelay: '0.8s'}} />
                  <rect x="45" y="8" width="6" height="27" fill="currentColor" className="animate-pulse" style={{animationDelay: '1s'}} />
                  <rect x="55" y="3" width="6" height="32" fill="currentColor" className="animate-pulse" style={{animationDelay: '1.2s'}} />
                </svg>
              </div>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-purple-50/50 dark:from-slate-800 dark:to-slate-700 hover:shadow-xl transition-all duration-300 relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Total Referrals
                </CardTitle>
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-lg">
                  <Users className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                {loading ? (
                  <div className="space-y-2">
                    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {stats.totalReferrals}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {stats.activeReferrals} active clients
                    </p>
                  </>
                )}
              </CardContent>
              {/* Referral Network Visual */}
              <div className="absolute bottom-0 right-0 opacity-20">
                <svg width="60" height="40" viewBox="0 0 60 40" className="text-purple-500">
                  <circle cx="30" cy="20" r="3" fill="currentColor" className="animate-pulse" />
                  <circle cx="15" cy="10" r="2" fill="currentColor" className="animate-pulse" style={{animationDelay: '0.3s'}} />
                  <circle cx="45" cy="10" r="2" fill="currentColor" className="animate-pulse" style={{animationDelay: '0.6s'}} />
                  <circle cx="15" cy="30" r="2" fill="currentColor" className="animate-pulse" style={{animationDelay: '0.9s'}} />
                  <circle cx="45" cy="30" r="2" fill="currentColor" className="animate-pulse" style={{animationDelay: '1.2s'}} />
                  <line x1="30" y1="20" x2="15" y2="10" stroke="currentColor" strokeWidth="1" className="animate-pulse" />
                  <line x1="30" y1="20" x2="45" y2="10" stroke="currentColor" strokeWidth="1" className="animate-pulse" />
                  <line x1="30" y1="20" x2="15" y2="30" stroke="currentColor" strokeWidth="1" className="animate-pulse" />
                  <line x1="30" y1="20" x2="45" y2="30" stroke="currentColor" strokeWidth="1" className="animate-pulse" />
                </svg>
              </div>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-orange-50/50 dark:from-slate-800 dark:to-slate-700 hover:shadow-xl transition-all duration-300 relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Conversion Rate
                </CardTitle>
                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 rounded-lg">
                  <Target className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                {loading ? (
                  <div className="space-y-2">
                    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                      {stats.conversionRate}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Above industry average
                    </p>
                  </>
                )}
              </CardContent>
              {/* Conversion Funnel Visual */}
              <div className="absolute bottom-0 right-0 opacity-20">
                <svg width="50" height="40" viewBox="0 0 50 40" className="text-orange-500">
                  <polygon points="10,5 40,5 35,15 15,15" fill="currentColor" className="animate-pulse" />
                  <polygon points="15,15 35,15 30,25 20,25" fill="currentColor" className="animate-pulse" style={{animationDelay: '0.5s'}} />
                  <polygon points="20,25 30,25 28,35 22,35" fill="currentColor" className="animate-pulse" style={{animationDelay: '1s'}} />
                </svg>
              </div>
            </Card>
          </div>

          {/* Performance Overview */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="gradient-text-primary">
                    Performance Analytics
                  </CardTitle>
                  <CardDescription>
                    Track your affiliate performance over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Click-through Rate</span>
                          <span className="text-sm text-muted-foreground">
                            {loading ? '...' : `${performanceData.clickThroughRate || stats.clickThroughRate}%`}
                          </span>
                        </div>
                        <Progress value={(performanceData.clickThroughRate || stats.clickThroughRate) * 10} className="h-2" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Conversion Rate</span>
                          <span className="text-sm text-muted-foreground">
                            {loading ? '...' : `${performanceData.conversionRate || stats.conversionRate}%`}
                          </span>
                        </div>
                        <Progress value={(performanceData.conversionRate || stats.conversionRate) * 7} className="h-2" />
                      </div>
                    </div>

                    {/* Earnings Chart Placeholder */}
                    <div className="h-64 bg-gradient-light rounded-lg flex items-center justify-center border border-border/40">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Interactive earnings chart would go here
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Showing monthly earnings, referrals, and conversion trends
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

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
                    onClick={() => setIsLinkGeneratorOpen(true)}
                    className="w-full justify-start gradient-primary hover:opacity-90"
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Generate Link
                  </Button>
                  <Button
                    onClick={() => setActiveTab("materials")}
                    variant="outline"
                    className="w-full justify-start border-ocean-blue/30 text-ocean-blue hover:bg-gradient-soft"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Marketing Materials
                  </Button>
                  <Button
                    onClick={() => setActiveTab("referrals")}
                    variant="outline"
                    className="w-full justify-start border-sea-green/30 text-sea-green hover:bg-gradient-soft"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    View Referrals
                  </Button>
                </CardContent>
              </Card>

              {/* Affiliate Tier */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-yellow-50/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="gradient-text-primary">
                      Your Tier
                    </CardTitle>
                    <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                      <Crown className="h-3 w-3 mr-1" />
                      {calculateTierProgress().currentTier.charAt(0).toUpperCase() + calculateTierProgress().currentTier.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress to {calculateTierProgress().nextTier.charAt(0).toUpperCase() + calculateTierProgress().nextTier.slice(1)}</span>
                      <span>{calculateTierProgress().progressPercentage}%</span>
                    </div>
                    <Progress value={calculateTierProgress().progressPercentage} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {calculateTierProgress().referralsNeeded > 0 
                        ? `${calculateTierProgress().referralsNeeded} more referrals to reach ${calculateTierProgress().nextTier.charAt(0).toUpperCase() + calculateTierProgress().nextTier.slice(1)} tier`
                        : `🎉 You've reached the highest tier!`
                      }
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Current Benefits:</h4>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      <li className="flex items-center">
                        <CheckCircle className="h-3 w-3 text-green-600 mr-1" />
                        25% commission rate
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-3 w-3 text-green-600 mr-1" />
                        Priority support
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-3 w-3 text-green-600 mr-1" />
                        Custom materials
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Next Payment */}
              <Card className="border-0 shadow-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="gradient-text-secondary flex items-center">
                    <Wallet className="h-4 w-4 mr-2" />
                    Next Payment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Pending:</span>
                      <span className="font-bold text-lg gradient-text-secondary">
                        ${stats.pendingCommissions}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Date:</span>
                      <span className="text-sm font-medium">
                        {new Date(stats.nextPayment).toLocaleDateString()}
                      </span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      <Clock className="h-4 w-4 mr-2" />
                      Payment History
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Admin Referral Link Section */}
          <div className="mt-8">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-indigo-50/50 dark:from-slate-800 dark:to-slate-700 hover:shadow-2xl transition-all duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="gradient-text-primary flex items-center text-xl">
                      <Crown className="h-5 w-5 mr-2" />
                      Admin Referral Program
                    </CardTitle>
                    <CardDescription className="mt-2">
                      Invite other admins to join and earn exclusive commissions on their success
                    </CardDescription>
                  </div>
                  <Badge className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Commission Structure */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg border border-purple-200/50">
                    <div className="text-2xl font-bold text-purple-600 mb-1">15%</div>
                    <div className="text-sm text-muted-foreground">Direct Admin Commission</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-lg border border-indigo-200/50">
                    <div className="text-2xl font-bold text-indigo-600 mb-1">5%</div>
                    <div className="text-sm text-muted-foreground">Override Commission</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-lg border border-emerald-200/50">
                    <div className="text-2xl font-bold text-emerald-600 mb-1">$500</div>
                    <div className="text-sm text-muted-foreground">Signup Bonus</div>
                  </div>
                </div>

                {/* Referral Link */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="admin-referral-link" className="text-sm font-medium">
                      Your Admin Referral Link
                    </Label>
                    <div className="flex mt-2 space-x-2">
                      <Input
                        id="admin-referral-link"
                        value="https://creditrepairpro.com/admin-signup?ref=ADM123456"
                        readOnly
                        className="font-mono text-sm bg-slate-50 dark:bg-slate-800"
                      />
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText("https://creditrepairpro.com/admin-signup?ref=ADM123456");
                          toast({
                            title: "Link Copied!",
                            description: "Admin referral link copied to clipboard",
                            variant: "default"
                          });
                        }}
                        size="sm"
                        className="gradient-primary hover:opacity-90"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Quick Share Options */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const subject = "Join CreditRepairPro as an Admin";
                        const body = `Hi there!\n\nI'd like to invite you to join CreditRepairPro as an admin. You'll get access to our premium admin dashboard and earn commissions from day one.\n\nSign up here: https://creditrepairpro.com/admin-signup?ref=ADM123456\n\nBest regards!`;
                        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                      }}
                      className="border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const text = "Join CreditRepairPro as an admin and start earning commissions! https://creditrepairpro.com/admin-signup?ref=ADM123456";
                        if (navigator.share) {
                          navigator.share({ title: "CreditRepairPro Admin Invitation", text });
                        } else {
                          navigator.clipboard.writeText(text);
                          toast({
                            title: "Text Copied!",
                            description: "Share text copied to clipboard",
                            variant: "default"
                          });
                        }
                      }}
                      className="border-green-200 text-green-600 hover:bg-green-50"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = "https://creditrepairpro.com/admin-signup?ref=ADM123456";
                        const text = "Join CreditRepairPro as an admin and start earning commissions!";
                        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
                      }}
                      className="border-sky-200 text-sky-600 hover:bg-sky-50"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Twitter
                    </Button>
                  </div>
                </div>

                {/* Admin Referral Stats */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-sm mb-3 flex items-center">
                    <Trophy className="h-4 w-4 mr-2 text-yellow-600" />
                    Your Admin Referral Performance
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">3</div>
                      <div className="text-xs text-muted-foreground">Admins Referred</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-indigo-600">$2,250</div>
                      <div className="text-xs text-muted-foreground">Total Earned</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-emerald-600">$450</div>
                      <div className="text-xs text-muted-foreground">This Month</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-600">12</div>
                      <div className="text-xs text-muted-foreground">Link Clicks</div>
                    </div>
                  </div>
                </div>

                {/* Benefits Highlight */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10 p-4 rounded-lg border border-purple-200/50">
                  <h4 className="font-medium text-sm mb-2 flex items-center">
                    <Gift className="h-4 w-4 mr-2 text-purple-600" />
                    Why Refer Admins?
                  </h4>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li className="flex items-center">
                      <CheckCircle className="h-3 w-3 text-green-600 mr-2" />
                      Higher commission rates than regular affiliates
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-3 w-3 text-green-600 mr-2" />
                      Earn from their entire network's performance
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-3 w-3 text-green-600 mr-2" />
                      Exclusive admin-only bonuses and rewards
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-3 w-3 text-green-600 mr-2" />
                      Build a premium admin network
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Team Overview */}
            <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="gradient-text-primary flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  My Team
                </CardTitle>
                <CardDescription>
                  Manage your affiliate network and track team performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">12</div>
                    <div className="text-sm text-muted-foreground">Direct Recruits</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">47</div>
                    <div className="text-sm text-muted-foreground">Total Network</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Team Commission</span>
                    <span className="text-lg font-bold gradient-text-secondary">$2,847.50</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">This Month</span>
                    <span className="text-lg font-bold text-green-600">$485.20</span>
                  </div>
                </div>

                <Button className="w-full" onClick={() => navigate('/affiliate-management')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Recruit New Affiliate
                </Button>
              </CardContent>
            </Card>

            {/* Team Performance */}
            <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="gradient-text-secondary flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Team Performance
                </CardTitle>
                <CardDescription>
                  Track your network's growth and earnings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Level 1 (Direct)</span>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{teamPerformance.level1.count} affiliates</Badge>
                      <span className="text-sm font-medium">${teamPerformance.level1.earnings.toFixed(2)}</span>
                    </div>
                  </div>
                  <Progress value={teamPerformance.level1.count > 0 ? Math.min((teamPerformance.level1.count / 20) * 100, 100) : 0} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Level 2</span>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{teamPerformance.level2.count} affiliates</Badge>
                      <span className="text-sm font-medium">${teamPerformance.level2.earnings.toFixed(2)}</span>
                    </div>
                  </div>
                  <Progress value={teamPerformance.level2.count > 0 ? Math.min((teamPerformance.level2.count / 30) * 100, 100) : 0} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Level 3</span>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{teamPerformance.level3.count} affiliates</Badge>
                      <span className="text-sm font-medium">${teamPerformance.level3.earnings.toFixed(2)}</span>
                    </div>
                  </div>
                  <Progress value={teamPerformance.level3.count > 0 ? Math.min((teamPerformance.level3.count / 15) * 100, 100) : 0} className="h-2" />
                </div>

                <div className="pt-4 border-t border-border/40">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Growth Rate</span>
                    <div className="flex items-center text-green-600">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      <span className="text-sm font-bold">+23%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Team Members Table */}
          <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="gradient-text-primary">Team Members</span>
                <Button variant="outline" size="sm" onClick={() => navigate('/affiliate-management')}>
                  <Eye className="h-4 w-4 mr-2" />
                  View All
                </Button>
              </CardTitle>
              <CardDescription>
                Your direct recruits and their performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Referrals</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>JD</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">John Doe</div>
                          <div className="text-xs text-muted-foreground">john@example.com</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Level 1
                      </Badge>
                    </TableCell>
                    <TableCell>Jan 15, 2024</TableCell>
                    <TableCell>8</TableCell>
                    <TableCell className="font-medium">$425.80</TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        Active
                      </Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>SM</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">Sarah Miller</div>
                          <div className="text-xs text-muted-foreground">sarah@example.com</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Level 1
                      </Badge>
                    </TableCell>
                    <TableCell>Dec 8, 2023</TableCell>
                    <TableCell>15</TableCell>
                    <TableCell className="font-medium">$782.40</TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        Active
                      </Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>MJ</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">Mike Johnson</div>
                          <div className="text-xs text-muted-foreground">mike@example.com</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        Level 2
                      </Badge>
                    </TableCell>
                    <TableCell>Nov 22, 2023</TableCell>
                    <TableCell>3</TableCell>
                    <TableCell className="font-medium">$156.20</TableCell>
                    <TableCell>
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                        Inactive
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="gradient-text-primary">
                  Link Generator
                </CardTitle>
                <CardDescription>
                  Create custom tracking links for your campaigns
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="campaign">Campaign Type</Label>
                  <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select campaign type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Referral</SelectItem>
                      <SelectItem value="social">Social Media</SelectItem>
                      <SelectItem value="email">Email Campaign</SelectItem>
                      <SelectItem value="blog">Blog/Content</SelectItem>
                      <SelectItem value="webinar">Webinar</SelectItem>
                      <SelectItem value="paid">Paid Advertising</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tracking">Custom Tracking Code (Optional)</Label>
                  <Input
                    id="tracking"
                    placeholder="e.g., BLOG_JAN2024"
                    value={customTrackingCode}
                    onChange={(e) => setCustomTrackingCode(e.target.value)}
                  />
                </div>

                <Button 
                  onClick={generateAffiliateLink}
                  className="w-full gradient-primary hover:opacity-90"
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Generate Link
                </Button>

                {generatedLink && (
                  <div className="space-y-2 p-4 bg-gradient-light rounded-lg border border-border/40">
                    <Label>Your Affiliate Link:</Label>
                    <div className="flex items-center space-x-2">
                      <Input value={generatedLink} readOnly className="text-xs" />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(generatedLink)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button size="sm" variant="outline">
                        <Share2 className="h-4 w-4 mr-1" />
                        Share
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="gradient-text-secondary">
                  Link Performance
                </CardTitle>
                <CardDescription>
                  Track how your links are performing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border border-border/40 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-sm">Social Media Campaign</div>
                        <div className="text-xs text-muted-foreground">SOCIAL_JAN2024</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm">156 clicks</div>
                        <div className="text-xs text-green-600">12 conversions</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border border-border/40 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-sm">Email Newsletter</div>
                        <div className="text-xs text-muted-foreground">EMAIL_WINTER2024</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm">89 clicks</div>
                        <div className="text-xs text-green-600">8 conversions</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border border-border/40 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-sm">Blog Content</div>
                        <div className="text-xs text-muted-foreground">BLOG_GUIDE2024</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm">234 clicks</div>
                        <div className="text-xs text-green-600">18 conversions</div>
                      </div>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Detailed Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="materials" className="space-y-6">
          <div className="grid gap-6">
            <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="gradient-text-primary">
                  Marketing Materials
                </CardTitle>
                <CardDescription>
                  Download professionally designed materials to promote CreditRepairPro
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {marketingMaterials.map((material) => {
                    const getTypeIcon = (type: string) => {
                      switch (type) {
                        case "banner":
                          return <ImageIcon className="h-5 w-5" />;
                        case "email":
                          return <Mail className="h-5 w-5" />;
                        case "social":
                          return <Smartphone className="h-5 w-5" />;
                        case "video":
                          return <Video className="h-5 w-5" />;
                        case "landing":
                          return <Monitor className="h-5 w-5" />;
                        default:
                          return <FileText className="h-5 w-5" />;
                      }
                    };

                    return (
                      <Card key={material.id} className="border border-border/40 hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="gradient-primary p-2 rounded-lg">
                                {getTypeIcon(material.type)}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {material.format}
                              </Badge>
                            </div>
                            
                            <div>
                              <h3 className="font-medium text-sm">{material.title}</h3>
                              {material.size && (
                                <p className="text-xs text-muted-foreground">{material.size}</p>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{material.downloads} downloads</span>
                              <span className="capitalize">{material.type}</span>
                            </div>

                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline" className="flex-1">
                                <Eye className="h-3 w-3 mr-1" />
                                Preview
                              </Button>
                              <Button size="sm" className="flex-1 gradient-primary hover:opacity-90">
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-6">
          <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="gradient-text-primary">
                    Your Referrals
                  </CardTitle>
                  <CardDescription>
                    Track your referred clients and their progress
                  </CardDescription>
                </div>
                <Button className="gradient-primary hover:opacity-90">
                  <Plus className="h-4 w-4 mr-2" />
                  Invite Client
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border/40 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-light">
                      <TableHead>Client</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Signup Date</TableHead>
                      <TableHead>Commission Earned</TableHead>
                      <TableHead>Lifetime Value</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      // Loading skeleton rows
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
                              <div className="space-y-1">
                                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                                <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div></TableCell>
                          <TableCell><div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div></TableCell>
                          <TableCell><div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        </TableRow>
                      ))
                    ) : referrals.length > 0 ? (
                      referrals.map((referral) => (
                      <TableRow key={referral.id} className="hover:bg-gradient-light/50">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="gradient-primary text-white text-xs">
                                {(referral.name || referral.customerName || referral.email)
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-sm">{referral.name || referral.customerName || 'Unknown'}</div>
                              <div className="text-xs text-muted-foreground">
                                {referral.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getStatusColor(referral.status)}
                          >
                            {referral.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getTierColor(referral.tier)}
                          >
                            {getTierIcon(referral.tier)}
                            <span className="ml-1 capitalize">{referral.tier}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {new Date(referral.signupDate || referral.dateReferred || new Date()).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-sm gradient-text-secondary">
                            ${(referral.commissionEarned || referral.commission || 0).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-sm">
                            ${(referral.lifetime_value || referral.lifetimeValue || 0).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex flex-col items-center space-y-2">
                            <Users className="h-8 w-8 text-gray-400" />
                            <p className="text-gray-500">No referrals found</p>
                            <p className="text-sm text-gray-400">Start sharing your affiliate links to see referrals here</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions" className="space-y-6">
          {/* Commission Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">Direct Commissions</p>
                    <p className="text-2xl font-bold text-green-800 dark:text-green-200">$3,247.80</p>
                    <p className="text-xs text-green-600 dark:text-green-400">From your referrals</p>
                  </div>
                  <div className="p-3 bg-green-200 dark:bg-green-800 rounded-full">
                    <DollarSign className="h-6 w-6 text-green-700 dark:text-green-300" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Team Commissions</p>
                    <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">$1,892.40</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">From your team</p>
                  </div>
                  <div className="p-3 bg-blue-200 dark:bg-blue-800 rounded-full">
                    <Users className="h-6 w-6 text-blue-700 dark:text-blue-300" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Total Earnings</p>
                    <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">$5,140.20</p>
                    <p className="text-xs text-purple-600 dark:text-purple-400">All time</p>
                  </div>
                  <div className="p-3 bg-purple-200 dark:bg-purple-800 rounded-full">
                    <Trophy className="h-6 w-6 text-purple-700 dark:text-purple-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="gradient-text-primary">
                    Commission History
                  </CardTitle>
                  <CardDescription>
                    Track your earnings and payment status across all levels
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-border/40 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-light">
                          <TableHead>Source</TableHead>
                          <TableHead>Level</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          // Loading skeleton rows
                          Array.from({ length: 5 }).map((_, index) => (
                            <TableRow key={index}>
                              <TableCell><div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div></TableCell>
                              <TableCell><div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div></TableCell>
                              <TableCell><div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div></TableCell>
                              <TableCell><div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div></TableCell>
                              <TableCell><div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div></TableCell>
                              <TableCell><div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div></TableCell>
                            </TableRow>
                          ))
                        ) : commissions.length > 0 ? (
                          [
                            // Sample hierarchical commission data
                            { id: 1, referralName: "John Doe (Direct)", level: "Direct", type: "signup", amount: 125.00, date: "2024-02-15", status: "paid" },
                            { id: 2, referralName: "Sarah Miller (Direct)", level: "Direct", type: "monthly", amount: 45.80, date: "2024-02-14", status: "paid" },
                            { id: 3, referralName: "Mike Johnson (Level 2)", level: "Level 2", type: "signup", amount: 62.50, date: "2024-02-13", status: "pending" },
                            { id: 4, referralName: "Emma Wilson (Level 2)", level: "Level 2", type: "monthly", amount: 22.90, date: "2024-02-12", status: "paid" },
                            { id: 5, referralName: "David Brown (Level 3)", level: "Level 3", type: "signup", amount: 31.25, date: "2024-02-11", status: "processing" },
                          ].map((commission) => (
                          <TableRow key={commission.id} className="hover:bg-gradient-light/50">
                            <TableCell>
                              <span className="font-medium text-sm">
                                {commission.referralName}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={
                                  commission.level === "Direct" 
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : commission.level === "Level 2"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-purple-50 text-purple-700 border-purple-200"
                                }
                              >
                                {commission.level}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {commission.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-bold gradient-text-secondary">
                                ${commission.amount.toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {new Date(commission.date).toLocaleDateString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={getStatusColor(commission.status)}
                              >
                                {commission.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              <div className="flex flex-col items-center space-y-2">
                                <DollarSign className="h-8 w-8 text-gray-400" />
                                <p className="text-gray-500">No commissions found</p>
                                <p className="text-sm text-gray-400">Commissions will appear here when your referrals make purchases</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Commission Breakdown by Level */}
              <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="gradient-text-secondary">
                    Commission Breakdown
                  </CardTitle>
                  <CardDescription>
                    Earnings by affiliate level this month
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium">Direct Referrals</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">${earningsBreakdown.commissions?.toFixed(2) || '0.00'}</div>
                        <div className="text-xs text-muted-foreground">
                          {earningsBreakdown.commissions > 0 ? 
                            Math.round((earningsBreakdown.commissions / (earningsBreakdown.commissions + earningsBreakdown.bonuses + earningsBreakdown.tierBonuses)) * 100) : 0}% of total
                        </div>
                      </div>
                    </div>
                    <Progress value={earningsBreakdown.commissions > 0 ? 
                      Math.round((earningsBreakdown.commissions / (earningsBreakdown.commissions + earningsBreakdown.bonuses + earningsBreakdown.tierBonuses)) * 100) : 0} 
                      className="h-2" />
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium">Recurring Commissions</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">${earningsBreakdown.recurringCommissions?.toFixed(2) || '0.00'}</div>
                        <div className="text-xs text-muted-foreground">
                          {earningsBreakdown.recurringCommissions > 0 ? 
                            Math.round((earningsBreakdown.recurringCommissions / (earningsBreakdown.commissions + earningsBreakdown.bonuses + earningsBreakdown.tierBonuses)) * 100) : 0}% of total
                        </div>
                      </div>
                    </div>
                    <Progress value={earningsBreakdown.recurringCommissions > 0 ? 
                      Math.round((earningsBreakdown.recurringCommissions / (earningsBreakdown.commissions + earningsBreakdown.bonuses + earningsBreakdown.tierBonuses)) * 100) : 0} 
                      className="h-2" />
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span className="text-sm font-medium">Bonuses & Tier Rewards</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">${(earningsBreakdown.bonuses + earningsBreakdown.tierBonuses)?.toFixed(2) || '0.00'}</div>
                        <div className="text-xs text-muted-foreground">
                          {(earningsBreakdown.bonuses + earningsBreakdown.tierBonuses) > 0 ? 
                            Math.round(((earningsBreakdown.bonuses + earningsBreakdown.tierBonuses) / (earningsBreakdown.commissions + earningsBreakdown.bonuses + earningsBreakdown.tierBonuses)) * 100) : 0}% of total
                        </div>
                      </div>
                    </div>
                    <Progress value={(earningsBreakdown.bonuses + earningsBreakdown.tierBonuses) > 0 ? 
                      Math.round(((earningsBreakdown.bonuses + earningsBreakdown.tierBonuses) / (earningsBreakdown.commissions + earningsBreakdown.bonuses + earningsBreakdown.tierBonuses)) * 100) : 0} 
                      className="h-2" />
                  </div>

                  <div className="pt-4 border-t border-border/40">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total This Month</span>
                      <span className="text-lg font-bold gradient-text-primary">
                        ${(earningsBreakdown.commissions + earningsBreakdown.bonuses + earningsBreakdown.tierBonuses)?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Schedule */}
              <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="gradient-text-secondary">
                    Payment Schedule
                  </CardTitle>
                  <CardDescription>
                    Upcoming and historical payment dates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-4">
                      <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                      <div className="space-y-3">
                        {Array.from({ length: 2 }).map((_, index) => (
                          <div key={index} className="p-4 border rounded-lg">
                            <div className="flex justify-between items-start">
                              <div className="space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                                <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                              </div>
                              <div className="space-y-2">
                                <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
                                <div className="h-5 bg-gray-200 rounded w-16 animate-pulse"></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Upcoming Payments */}
                      <div>
                        <h3 className="text-sm font-semibold mb-3 flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                          Upcoming Payments
                        </h3>
                      <div className="space-y-3">
                        {stats.pendingCommissions > 0 ? (
                          <Card className="border border-blue-200 bg-blue-50/50">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-sm">Next Payment</div>
                                  <div className="text-xs text-muted-foreground">Due: {stats.nextPayment || 'TBD'}</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-lg gradient-text-secondary">${stats.pendingCommissions.toFixed(2)}</div>
                                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Pending
                                  </Badge>
                                </div>
                              </div>
                              <div className="mt-3 text-xs text-muted-foreground">
                                <div className="flex justify-between">
                                  <span>Commission Period:</span>
                                  <span>Current Month</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Payment Method:</span>
                                  <span>Bank Transfer</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No pending payments</p>
                            <p className="text-xs">Earn commissions to see upcoming payments</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Payment History */}
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                        Payment History
                      </h3>
                      <div className="space-y-2">
                        {paymentHistory.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-sm">No payment history available</p>
                            <p className="text-xs">Payments will appear here once processed</p>
                          </div>
                        ) : (
                          paymentHistory.map((payment, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border border-border/40 rounded-lg">
                              <div>
                                <div className="font-medium text-sm">{payment.description || `Payment ${index + 1}`}</div>
                                <div className="text-xs text-muted-foreground">{payment.date || 'Date not available'}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-sm">${payment.amount || '0.00'}</div>
                                <Badge className="bg-green-100 text-green-800 border-green-200">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {payment.status || 'Paid'}
                                </Badge>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Payment Settings */}
                    <div className="pt-4 border-t border-border/40">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">Payment Settings</div>
                          <div className="text-xs text-muted-foreground">
                            Payments are processed on the 1st of each month
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-2" />
                          Update
                        </Button>
                      </div>
                    </div>
                  </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-0 shadow-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="gradient-text-secondary">
                    Commission Calculator
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Potential Referrals</Label>
                    <Input 
                      placeholder="Enter number" 
                      type="number" 
                      value={calculatorReferrals}
                      onChange={(e) => setCalculatorReferrals(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Conversion Rate (%)</Label>
                    <Input 
                      placeholder="12.8" 
                      type="number" 
                      value={calculatorConversion}
                      onChange={(e) => setCalculatorConversion(Number(e.target.value) || 12.8)}
                    />
                  </div>
                  <Button 
                    className="w-full gradient-primary hover:opacity-90"
                    onClick={calculateEarnings}
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Calculate Earnings
                  </Button>
                  <div className="p-3 bg-gradient-light rounded-lg">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Estimated Monthly Earnings</div>
                      <div className="text-2xl font-bold gradient-text-secondary">
                        ${calculatedEarnings.toFixed(2)}
                      </div>
                      {calculatorReferrals > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Based on {Math.round(calculatorReferrals * (calculatorConversion / 100))} conversions
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-green-50/50">
                <CardHeader>
                  <CardTitle className="gradient-text-primary">
                    Commission Structure
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Signup Bonus</span>
                      <span className="font-bold">$100</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Monthly Recurring (25%)</span>
                      <span className="font-bold">$37.50/mo</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Upgrade Bonus</span>
                      <span className="font-bold">$50</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    View Full Terms
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="resources" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="gradient-text-primary">
                  Training Resources
                </CardTitle>
                <CardDescription>
                  Learn how to maximize your affiliate success
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border border-border/40 rounded-lg hover:bg-gradient-light/50 transition-colors cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="gradient-primary p-2 rounded-lg">
                        <Video className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">Affiliate Marketing Basics</div>
                        <div className="text-xs text-muted-foreground">15 min video course</div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="flex items-center justify-between p-3 border border-border/40 rounded-lg hover:bg-gradient-light/50 transition-colors cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="gradient-secondary p-2 rounded-lg">
                        <FileText className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">Best Practices Guide</div>
                        <div className="text-xs text-muted-foreground">PDF download</div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="flex items-center justify-between p-3 border border-border/40 rounded-lg hover:bg-gradient-light/50 transition-colors cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-lg">
                        <Globe className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">Webinar Series</div>
                        <div className="text-xs text-muted-foreground">Live training sessions</div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="flex items-center justify-between p-3 border border-border/40 rounded-lg hover:bg-gradient-light/50 transition-colors cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 rounded-lg">
                        <Users className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">Community Forum</div>
                        <div className="text-xs text-muted-foreground">Connect with other affiliates</div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="gradient-text-secondary">
                  Support & Contact
                </CardTitle>
                <CardDescription>
                  Get help when you need it
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Mail className="h-4 w-4 mr-2" />
                    Email Affiliate Manager
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Live Chat Support
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Knowledge Base
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Call
                  </Button>
                </div>

                <div className="mt-6 p-4 bg-gradient-light rounded-lg border border-border/40">
                  <h4 className="font-medium text-sm mb-2">Quick Tips</h4>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>• Share your personal success story</li>
                    <li>• Focus on the value of funding</li>
                    <li>• Use multiple marketing channels</li>
                    <li>• Follow up with potential referrals</li>
                    <li>• Track your link performance</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Admin Earnings Tab */}
        <TabsContent value="admin-earnings" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="gradient-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold gradient-text-primary">
                  ${adminEarnings.totalEarnings.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+{adminEarnings.monthlyGrowth}%</span> from last month
                </p>
              </CardContent>
            </Card>

            <Card className="gradient-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Direct Commissions</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${adminEarnings.directCommissions.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  From direct sales
                </p>
              </CardContent>
            </Card>

            <Card className="gradient-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Override Commissions</CardTitle>
                <Crown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${adminEarnings.overrideCommissions.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  From team performance
                </p>
              </CardContent>
            </Card>

            <Card className="gradient-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Commission Rate</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold gradient-text-primary">15%</div>
                <p className="text-xs text-muted-foreground">
                  Admin override rate
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="gradient-border">
            <CardHeader>
              <CardTitle className="gradient-text-primary">Monthly Breakdown</CardTitle>
              <CardDescription>
                Detailed monthly earnings breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Direct</TableHead>
                    <TableHead>Override</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminEarnings.monthlyBreakdown.map((month, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{month.month}</TableCell>
                      <TableCell>${month.direct.toLocaleString()}</TableCell>
                      <TableCell>${month.override.toLocaleString()}</TableCell>
                      <TableCell className="font-bold">
                        ${month.total.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Affiliate Earnings Tab */}
        <TabsContent value="affiliate-earnings" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="gradient-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Affiliates</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold gradient-text-primary">
                  {affiliateEarningsData.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active team members
                </p>
              </CardContent>
            </Card>

            <Card className="gradient-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Total Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${affiliateEarningsData.reduce((sum, affiliate) => sum + affiliate.totalEarnings, 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  All-time team earnings
                </p>
              </CardContent>
            </Card>

            <Card className="gradient-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Team Earnings</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${affiliateEarningsData.reduce((sum, affiliate) => sum + affiliate.monthlyEarnings, 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  This month's team performance
                </p>
              </CardContent>
            </Card>

            <Card className="gradient-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Recruits</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold gradient-text-primary">
                  {affiliateEarningsData.reduce((sum, affiliate) => sum + affiliate.recruits, 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Team recruitment total
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="gradient-border">
            <CardHeader>
              <CardTitle className="gradient-text-primary">Affiliate Earnings Details</CardTitle>
              <CardDescription>
                Detailed breakdown of each affiliate's performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Total Earnings</TableHead>
                    <TableHead>Monthly</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Recruits</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {affiliateEarningsData.map((affiliate) => (
                    <TableRow key={affiliate.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{affiliate.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {affiliate.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gradient-border">
                          {affiliate.level}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold">
                        ${affiliate.totalEarnings.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        ${affiliate.monthlyEarnings.toLocaleString()}
                      </TableCell>
                      <TableCell>{affiliate.commissionRate}</TableCell>
                      <TableCell>{affiliate.recruits}</TableCell>
                      <TableCell>
                        <Badge
                          variant={affiliate.status === "Active" ? "default" : "secondary"}
                        >
                          {affiliate.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="gradient-border">
              <CardHeader>
                <CardTitle className="gradient-text-primary">Top Performers</CardTitle>
                <CardDescription>
                  Best performing affiliates this month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {affiliateEarningsData
                    .sort((a, b) => b.monthlyEarnings - a.monthlyEarnings)
                    .slice(0, 5)
                    .map((affiliate, index) => (
                      <div key={affiliate.id} className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <Badge variant="outline" className="gradient-border">
                            #{index + 1}
                          </Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {affiliate.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {affiliate.level}
                          </p>
                        </div>
                        <div className="text-sm font-bold">
                          ${affiliate.monthlyEarnings.toLocaleString()}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card className="gradient-border">
              <CardHeader>
                <CardTitle className="gradient-text-primary">Level Distribution</CardTitle>
                <CardDescription>
                  Affiliate distribution by commission level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {["Diamond", "Platinum", "Gold", "Silver", "Bronze"].map((level) => {
                    const count = affiliateEarningsData.filter(
                      (affiliate) => affiliate.level === level
                    ).length;
                    const percentage = Math.round((count / affiliateEarningsData.length) * 100);
                    
                    return (
                      <div key={level} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{level}</span>
                          <span className="text-muted-foreground">
                            {count} ({percentage}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Link Generator Dialog */}
      <Dialog open={isLinkGeneratorOpen} onOpenChange={setIsLinkGeneratorOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="gradient-text-primary">
              Generate Affiliate Link
            </DialogTitle>
            <DialogDescription>
              Create a custom tracking link for your campaign
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quickCampaign">Campaign Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select campaign type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Referral</SelectItem>
                  <SelectItem value="social">Social Media</SelectItem>
                  <SelectItem value="email">Email Campaign</SelectItem>
                  <SelectItem value="blog">Blog/Content</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quickTracking">Custom Code (Optional)</Label>
              <Input
                id="quickTracking"
                placeholder="e.g., PROMO2024"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsLinkGeneratorOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="gradient-primary"
              onClick={() => {
                generateAffiliateLink();
                setIsLinkGeneratorOpen(false);
              }}
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              Generate Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
