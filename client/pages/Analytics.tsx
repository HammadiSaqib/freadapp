import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/DashboardLayout";
import { useState, useEffect } from "react";
import { analyticsApi, clientsApi, creditReportScraperApi } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Calendar,
  Target,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  MessageSquare,
  Zap,
  Download,
  Filter,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Eye,
  PieChart,
  LineChart,
  Activity,
  CreditCard,
  Building,
  Star,
  Sparkles,
  Rocket,
} from "lucide-react";

// Mock data for overview stats
const overviewStats = {
  totalRevenue: 127500,
  revenueGrowth: 23.5,
  totalClients: 247,
  clientGrowth: 12.3,
  avgScoreIncrease: 89,
  scoreGrowth: 8.7,
  successRate: 94.2,
  successGrowth: 3.1,
};

const monthlyData = [
  { month: "Jan", revenue: 8500, clients: 23, disputes: 156, success: 91.2 },
  { month: "Feb", revenue: 9200, clients: 31, disputes: 178, success: 92.1 },
  { month: "Mar", revenue: 10100, clients: 28, disputes: 194, success: 93.5 },
  { month: "Apr", revenue: 11800, clients: 35, disputes: 213, success: 94.8 },
  { month: "May", revenue: 12300, clients: 42, disputes: 231, success: 95.2 },
  { month: "Jun", revenue: 13600, clients: 38, disputes: 267, success: 94.1 },
];

const disputeBreakdown = [
  { type: "Credit Cards", count: 145, success: 96.5, avgDays: 42 },
  { type: "Collections", count: 89, success: 91.2, avgDays: 38 },
  { type: "Personal Info", count: 67, success: 98.1, avgDays: 28 },
  { type: "Inquiries", count: 54, success: 87.3, avgDays: 35 },
  { type: "Student Loans", count: 23, success: 82.6, avgDays: 52 },
];

const bureauPerformance = [
  { bureau: "Experian", disputes: 187, success: 95.7, avgDays: 38 },
  { bureau: "TransUnion", disputes: 234, success: 92.8, avgDays: 41 },
  { bureau: "Equifax", disputes: 201, success: 94.1, avgDays: 39 },
];

const topPerformers = [
  {
    name: "Sarah Johnson",
    scoreIncrease: 156,
    improvement: "+28%",
    status: "Excellent",
  },
  {
    name: "Michael Chen",
    scoreIncrease: 134,
    improvement: "+31%",
    status: "Excellent",
  },
  {
    name: "Emma Davis",
    scoreIncrease: 127,
    improvement: "+19%",
    status: "Good",
  },
  {
    name: "Robert Wilson",
    scoreIncrease: 118,
    improvement: "+23%",
    status: "Good",
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Excellent":
      return "bg-green-100 text-green-800 border-green-200";
    case "Good":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export default function Analytics() {
  const [selectedPeriod, setSelectedPeriod] = useState("last-30-days");
  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState(overviewStats);
  const [ga4Realtime, setGa4Realtime] = useState<{
    active_users: number;
    top_screens: Array<{ screen: string; active_users: number }>;
    generated_at: string;
  } | null>(null);
  const [ga4RealtimeError, setGa4RealtimeError] = useState<string | null>(null);
  const [revenueData, setRevenueData] = useState({
    monthlySubscriptions: 89500,
    oneTimeServices: 28000,
    consultationFees: 10000,
    projections: {
      nextMonth: { amount: 142000, growth: 11.4 },
      nextQuarter: { amount: 425000, growth: 18.2 },
      nextYear: { amount: 1800000, growth: 24.7 }
    }
  });
  const [clientData, setClientData] = useState({
    topPerformers: topPerformers,
    statusDistribution: [
      { status: "Active", count: 156, percentage: 63.2 },
      { status: "Completed", count: 67, percentage: 27.1 },
      { status: "On Hold", count: 18, percentage: 7.3 },
      { status: "Inactive", count: 6, percentage: 2.4 }
    ],
    recentActivities: [
      { client: "John Smith", action: "Score improved by 45 points", time: "2 hours ago", type: "success" },
      { client: "Lisa Brown", action: "Dispute resolved successfully", time: "4 hours ago", type: "info" },
      { client: "David Lee", action: "New client onboarded", time: "6 hours ago", type: "pending" },
      { client: "Maria Garcia", action: "Payment processed", time: "8 hours ago", type: "success" }
    ]
  });
  
  // New state for performance tab data
  const [reportPullHistory, setReportPullHistory] = useState([
    { client: "John Smith", platform: "MyFreeScoreNow", date: "2024-01-15", status: "completed" },
    { client: "Sarah Johnson", platform: "IdentityIQ", date: "2024-01-14", status: "completed" },
    { client: "Michael Chen", platform: "SmartCredit", date: "2024-01-13", status: "completed" },
    { client: "Emma Davis", platform: "MyScoreIQ", date: "2024-01-12", status: "completed" }
  ]);
  
  const [bureauScores, setBureauScores] = useState([
    { client: "John Smith", experian: 720, transunion: 715, equifax: 710, lastUpdated: "2024-01-15" },
    { client: "Sarah Johnson", experian: 680, transunion: 685, equifax: 675, lastUpdated: "2024-01-14" },
    { client: "Michael Chen", experian: 750, transunion: 745, equifax: 740, lastUpdated: "2024-01-13" },
    { client: "Emma Davis", experian: 620, transunion: 625, equifax: 615, lastUpdated: "2024-01-12" }
  ]);
  const { toast } = useToast();

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        
        // Fetch dashboard analytics for overview
        try {
          const dashboardResponse = await analyticsApi.getDashboardAnalytics();
          if (dashboardResponse.data && !dashboardResponse.error) {
            const data = dashboardResponse.data;
            
            // Update overview stats with real data
            setOverviewData({
              totalRevenue: data.revenue_metrics?.total_revenue || overviewStats.totalRevenue,
              revenueGrowth: data.revenue_metrics?.growth_rate || overviewStats.revenueGrowth,
              totalClients: data.client_metrics?.total_clients || overviewStats.totalClients,
              clientGrowth: data.client_metrics?.growth_rate || overviewStats.clientGrowth,
              avgScoreIncrease: data.client_metrics?.avg_score_improvement || overviewStats.avgScoreIncrease,
              scoreGrowth: data.client_metrics?.score_improvement_rate || overviewStats.scoreGrowth,
              successRate: data.dispute_metrics?.success_rate || overviewStats.successRate,
              successGrowth: data.dispute_metrics?.success_rate_change || overviewStats.successGrowth,
            });
          }
        } catch (dashboardError) {
          console.log('Dashboard API not available, using default data');
        }

        // Fetch revenue data for financial tab
        try {
          const revenueResponse = await analyticsApi.getRevenue({ period: selectedPeriod });
          if (revenueResponse.data && !revenueResponse.error) {
            const revData = revenueResponse.data;
            
            setRevenueData({
              monthlySubscriptions: revData.monthly_subscriptions || 89500,
              oneTimeServices: revData.one_time_services || 28000,
              consultationFees: revData.consultation_fees || 10000,
              projections: {
                nextMonth: { 
                  amount: revData.projections?.next_month?.amount || 142000, 
                  growth: revData.projections?.next_month?.growth || 11.4 
                },
                nextQuarter: { 
                  amount: revData.projections?.next_quarter?.amount || 425000, 
                  growth: revData.projections?.next_quarter?.growth || 18.2 
                },
                nextYear: { 
                  amount: revData.projections?.next_year?.amount || 1800000, 
                  growth: revData.projections?.next_year?.growth || 24.7 
                }
              }
            });
          }
        } catch (revenueError) {
          console.log('Revenue API not available, using default data');
        }

        // Fetch client analytics data
        try {
          const clientAnalyticsResponse = await analyticsApi.getClients();
          if (clientAnalyticsResponse.data && !clientAnalyticsResponse.error) {
            const clientAnalytics = clientAnalyticsResponse.data;
            
            // Update client data with real analytics
            setClientData(prevData => ({
              ...prevData,
              statusDistribution: clientAnalytics.status_distribution || prevData.statusDistribution,
              topPerformers: clientAnalytics.top_performers || prevData.topPerformers
            }));
          }
        } catch (clientAnalyticsError) {
          console.log('Client analytics API not available, using default data');
        }

        // Fetch recent client activities
        try {
          const activitiesResponse = await analyticsApi.getRecentActivities(10);
          if (activitiesResponse.data && !activitiesResponse.error) {
            const activities = activitiesResponse.data;
            
            setClientData(prevData => ({
              ...prevData,
              recentActivities: activities.map((activity: any) => ({
                client: activity.client_name || activity.name,
                action: activity.description || activity.action,
                time: activity.created_at ? new Date(activity.created_at).toLocaleString() : activity.time,
                type: activity.type || 'general'
              })) || prevData.recentActivities
            }));
          }
        } catch (activitiesError) {
          console.log('Activities API not available, using default data');
        }

        // Fetch report pull history
        try {
          const reportHistoryResponse = await creditReportScraperApi.getReportHistory();
          if (reportHistoryResponse.data && !reportHistoryResponse.error) {
            const history = reportHistoryResponse.data;
            
            setReportPullHistory(history.map((report: any) => ({
              client: report.client_name || `Client ${report.client_id}`,
              platform: report.platform || 'Unknown',
              date: report.created_at ? new Date(report.created_at).toLocaleDateString() : 'Unknown',
              status: report.status || 'completed'
            })).slice(0, 10) || reportPullHistory);
          }
        } catch (reportHistoryError) {
          console.log('Report history API not available, using default data');
        }

        // Fetch bureau scores from clients
        try {
          const clientsResponse = await clientsApi.getClients();
          if (clientsResponse.data && !clientsResponse.error) {
            const clients = clientsResponse.data;
            
            // Transform client data to bureau scores format
            setBureauScores(clients.map((client: any) => ({
              client: `${client.first_name} ${client.last_name}`,
              experian: client.experian_score || Math.floor(Math.random() * 200) + 600,
              transunion: client.transunion_score || Math.floor(Math.random() * 200) + 600,
              equifax: client.equifax_score || Math.floor(Math.random() * 200) + 600,
              lastUpdated: client.updated_at ? new Date(client.updated_at).toLocaleDateString() : new Date().toLocaleDateString()
            })).slice(0, 10) || bureauScores);
          }
        } catch (bureauScoresError) {
          console.log('Bureau scores API not available, using default data');
        }
        
      } catch (error) {
        console.log('Analytics API not fully available, using default data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [selectedPeriod]);

  useEffect(() => {
    let cancelled = false;

    const fetchGa4Realtime = async () => {
      try {
        const response = await analyticsApi.getGa4Realtime();
        const payload: any = response?.data;

        if (!payload) return;

        if (payload.success && payload.data) {
          if (cancelled) return;
          setGa4Realtime(payload.data);
          setGa4RealtimeError(null);
          return;
        }

        if (cancelled) return;
        setGa4RealtimeError(payload.error || payload.message || "GA4 realtime unavailable");
      } catch (error: any) {
        if (cancelled) return;
        setGa4RealtimeError(error?.response?.data?.error || error?.message || "GA4 realtime unavailable");
      }
    };

    fetchGa4Realtime();
    const intervalId = window.setInterval(fetchGa4Realtime, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="relative">
        <div className="blur-sm pointer-events-none select-none">
          <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-4xl font-bold gradient-text-primary">
                  Analytics Dashboard
                </h1>
                <p className="text-muted-foreground mt-2">
                  Comprehensive insights into your credit repair business performance
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last-7-days">Last 7 days</SelectItem>
                    <SelectItem value="last-30-days">Last 30 days</SelectItem>
                    <SelectItem value="last-90-days">Last 90 days</SelectItem>
                    <SelectItem value="last-year">Last year</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-6">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-800 dark:to-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Revenue
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-ocean-blue" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold gradient-text-primary">
                    ${overviewData.totalRevenue.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600 font-medium">
                      +{overviewData.revenueGrowth}%
                    </span>{" "}
                    from last month
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-emerald-50/50 dark:from-slate-800 dark:to-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Clients
                  </CardTitle>
                  <Users className="h-4 w-4 text-sea-green" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold gradient-text-secondary">
                    {overviewData.totalClients}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600 font-medium">
                      +{overviewData.clientGrowth}%
                    </span>{" "}
                    from last month
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-purple-50/50 dark:from-slate-800 dark:to-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Avg Score Increase
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold gradient-text-primary">
                    +{overviewData.avgScoreIncrease}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600 font-medium">
                      +{overviewData.scoreGrowth}%
                    </span>{" "}
                    from last month
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-emerald-50/50 dark:from-slate-800 dark:to-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Success Rate
                  </CardTitle>
                  <Target className="h-4 w-4 text-sea-green" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold gradient-text-secondary">
                    {overviewData.successRate}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600 font-medium">
                      +{overviewData.successGrowth}%
                    </span>{" "}
                    from last month
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-medium">
                    Live Visitors (GA4)
                  </CardTitle>
                  <CardDescription>
                    Active users right now
                  </CardDescription>
                </div>
                <Activity className="h-4 w-4 text-ocean-blue" />
              </CardHeader>
              <CardContent>
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                  <div>
                    <div className="text-3xl font-bold gradient-text-primary">
                      {ga4Realtime?.active_users ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {ga4RealtimeError ? ga4RealtimeError : "Updates every 15 seconds"}
                    </p>
                  </div>
                  <div className="w-full lg:max-w-md">
                    <div className="text-sm font-medium mb-2">
                      Top screens
                    </div>
                    <div className="space-y-2">
                      {(ga4Realtime?.top_screens || []).slice(0, 5).map((row, idx) => (
                        <div key={`${row.screen}-${idx}`} className="flex items-center justify-between p-2 bg-gradient-light rounded-md">
                          <div className="text-sm text-muted-foreground truncate max-w-[70%]">
                            {row.screen}
                          </div>
                          <div className="text-sm font-semibold">
                            {row.active_users}
                          </div>
                        </div>
                      ))}
                      {!ga4Realtime?.top_screens?.length && (
                        <div className="text-sm text-muted-foreground">
                          No realtime screen data available
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Monthly Performance Chart */}
              <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="gradient-text-primary">
                    Monthly Performance
                  </CardTitle>
                  <CardDescription>
                    Revenue and client acquisition trends
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {monthlyData.map((month, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gradient-light rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-ocean-blue to-sea-green rounded-lg flex items-center justify-center text-white font-bold text-sm">
                            {month.month}
                          </div>
                          <div>
                            <div className="font-medium">{month.month} 2024</div>
                            <div className="text-sm text-muted-foreground">
                              {month.clients} new clients
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">
                            ${month.revenue.toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {month.success}% success
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Success Rate Chart */}
              <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="gradient-text-secondary">
                    Success Rate Trends
                  </CardTitle>
                  <CardDescription>
                    Monthly success rate progression
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {monthlyData.map((month, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gradient-light rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                            {month.month}
                          </div>
                          <div>
                            <div className="font-medium">{month.month} 2024</div>
                            <div className="text-sm text-muted-foreground">
                              {month.disputes} disputes
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-purple-600">
                            {month.success}%
                          </div>
                          <Progress value={month.success} className="w-20 mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-8">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Report Pull History */}
              <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="gradient-text-primary">
                    Report Pull History
                  </CardTitle>
                  <CardDescription>
                    Recent credit report pulls by platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportPullHistory.map((report, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gradient-light rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                            <Download className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <div className="font-medium">{report.client}</div>
                            <div className="text-sm text-muted-foreground">
                              {report.platform} • {report.date}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={report.status === 'completed' ? 'default' : 'secondary'}
                            className={report.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                          >
                            {report.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Client Scores from All 3 Bureaus */}
              <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="gradient-text-secondary">
                    Client Scores from All 3 Bureaus
                  </CardTitle>
                  <CardDescription>
                    Credit scores across Experian, TransUnion, and Equifax
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {bureauScores.map((client, index) => (
                      <div key={index} className="p-4 bg-gradient-light rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-medium">{client.client}</div>
                          <div className="text-xs text-muted-foreground">
                            Updated: {client.lastUpdated}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground mb-1">Experian</div>
                            <div className="text-lg font-bold text-blue-600">{client.experian}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground mb-1">TransUnion</div>
                            <div className="text-lg font-bold text-green-600">{client.transunion}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground mb-1">Equifax</div>
                            <div className="text-lg font-bold text-purple-600">{client.equifax}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Performers */}
            <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="gradient-text-primary">
                  Top Performing Clients
                </CardTitle>
                <CardDescription>
                  Clients with the highest score improvements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {clientData.topPerformers.map((client, index) => (
                    <div key={index} className="p-4 bg-gradient-light rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <Badge
                          variant="outline"
                          className={getStatusColor(client.status)}
                        >
                          {client.status}
                        </Badge>
                      </div>
                      <div>
                        <div className="font-medium text-sm">{client.name}</div>
                        <div className="text-2xl font-bold text-green-600 mt-1">
                          +{client.scoreIncrease}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {client.improvement} improvement
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-8">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Client Status Distribution */}
              <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="gradient-text-primary">
                    Client Status
                  </CardTitle>
                  <CardDescription>
                    Current client distribution
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {clientData.statusDistribution.map((statusItem, index) => {
                      const getStatusIcon = (status: string) => {
                        switch (status.toLowerCase()) {
                          case 'active':
                            return <CheckCircle className="h-5 w-5 text-green-600" />;
                          case 'completed':
                            return <Award className="h-5 w-5 text-blue-600" />;
                          case 'on hold':
                            return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
                          case 'inactive':
                            return <XCircle className="h-5 w-5 text-red-600" />;
                          default:
                            return <Clock className="h-5 w-5 text-gray-600" />;
                        }
                      };

                      const getStatusColor = (status: string) => {
                        switch (status.toLowerCase()) {
                          case 'active':
                            return 'bg-green-50 dark:bg-green-900/20 text-green-600';
                          case 'completed':
                            return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600';
                          case 'on hold':
                            return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600';
                          case 'inactive':
                            return 'bg-red-50 dark:bg-red-900/20 text-red-600';
                          default:
                            return 'bg-gray-50 dark:bg-gray-900/20 text-gray-600';
                        }
                      };

                      return (
                        <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${getStatusColor(statusItem.status)}`}>
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(statusItem.status)}
                            <span className="font-medium">{statusItem.status}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold">{statusItem.count}</span>
                            <div className="text-xs opacity-75">
                              {statusItem.percentage}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="lg:col-span-2 border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="gradient-text-secondary">
                    Recent Client Activity
                  </CardTitle>
                  <CardDescription>
                    Latest updates and milestones
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {clientData.recentActivities.map((activity, index) => (
                      <div key={index} className="flex items-center space-x-4 p-3 bg-gradient-light rounded-lg">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.type === 'success' ? 'bg-green-500' :
                          activity.type === 'info' ? 'bg-blue-500' : 'bg-yellow-500'
                        }`} />
                        <div className="flex-1">
                          <div className="font-medium">{activity.client}</div>
                          <div className="text-sm text-muted-foreground">
                            {activity.action}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {activity.time}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-8">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Revenue Breakdown */}
              <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="gradient-text-primary">
                    Revenue Breakdown
                  </CardTitle>
                  <CardDescription>
                    Revenue sources and trends
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gradient-light rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full" />
                        <span className="font-medium">Monthly Subscriptions</span>
                      </div>
                      <span className="font-bold text-green-600">${revenueData.monthlySubscriptions.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gradient-light rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full" />
                        <span className="font-medium">One-time Services</span>
                      </div>
                      <span className="font-bold text-blue-600">${revenueData.oneTimeServices.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gradient-light rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-purple-500 rounded-full" />
                        <span className="font-medium">Consultation Fees</span>
                      </div>
                      <span className="font-bold text-purple-600">${revenueData.consultationFees.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Projections */}
              <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="gradient-text-secondary">
                    Financial Projections
                  </CardTitle>
                  <CardDescription>
                    Projected revenue for upcoming periods
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="text-center p-4 bg-gradient-light rounded-lg">
                      <div className="text-sm font-medium text-muted-foreground mb-2">
                        Next Month
                      </div>
                      <div className="text-3xl font-bold text-green-600">
                        ${(revenueData.projections.nextMonth.amount / 1000).toFixed(0)}K
                      </div>
                      <div className="text-sm text-green-600 mt-1">+{revenueData.projections.nextMonth.growth}%</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-light rounded-lg">
                      <div className="text-sm font-medium text-muted-foreground mb-2">
                        Next Quarter
                      </div>
                      <div className="text-3xl font-bold text-blue-600">
                        ${(revenueData.projections.nextQuarter.amount / 1000).toFixed(0)}K
                      </div>
                      <div className="text-sm text-blue-600 mt-1">+{revenueData.projections.nextQuarter.growth}%</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-light rounded-lg">
                      <div className="text-sm font-medium text-muted-foreground mb-2">
                        Next Year
                      </div>
                      <div className="text-3xl font-bold text-purple-600">
                        ${(revenueData.projections.nextYear.amount / 1000000).toFixed(1)}M
                      </div>
                      <div className="text-sm text-green-600 mt-1">+{revenueData.projections.nextYear.growth}%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Coming Soon Overlay Card */}
        <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm">
          <Card className="w-full max-w-md mx-4 border-0 shadow-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-ocean-blue to-sea-green rounded-full flex items-center justify-center mb-4">
                <Rocket className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold gradient-text-primary">
                Coming Soon
              </CardTitle>
              <CardDescription className="text-base">
                Advanced Analytics & Insights
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                We’re building deep analytics, performance dashboards, and growth projections to power smarter decisions.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-center text-muted-foreground">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  Real-time KPIs and trend tracking
                </div>
                <div className="flex items-center justify-center text-muted-foreground">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  Client performance insights
                </div>
                <div className="flex items-center justify-center text-muted-foreground">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  Revenue forecasting
                </div>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm font-medium text-ocean-blue">Expected Launch: Q3 2026</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
