import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FundingManagerLayout from "@/components/FundingManagerLayout";
import { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Wallet,
  Target,
  PieChart,
  BarChart3,
  Calculator,
  Building2,
  CreditCard,
  Banknote,
  HandCoins,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Eye,
  Filter,
  Download,
  RefreshCw,
  Zap,
  Globe,
  Shield,
  Award,
  Star,
  FileText,
} from "lucide-react";

interface OverviewStats {
  totalPortfolioValue: number;
  totalFunded: number;
  activeInvestments: number;
  monthlyROI: number;
  totalClients: number;
  activeClients: number;
  pendingApplications: number;
  completedDeals: number;
  averageDealSize: number;
  successRate: number;
  monthlyRevenue: number;
  yearlyGrowth: number;
}

interface RecentActivity {
  id: string;
  type: 'funding' | 'payment' | 'application' | 'completion';
  client: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  date: string;
  description: string;
}

interface TopPerformer {
  id: string;
  name: string;
  totalFunded: number;
  roi: number;
  deals: number;
  status: 'excellent' | 'good' | 'average';
}

export default function FundingManagerOverview() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OverviewStats>({
    totalPortfolioValue: 15750000,
    totalFunded: 12500000,
    activeInvestments: 45,
    monthlyROI: 8.5,
    totalClients: 128,
    activeClients: 89,
    pendingApplications: 23,
    completedDeals: 156,
    averageDealSize: 85000,
    successRate: 92.5,
    monthlyRevenue: 1250000,
    yearlyGrowth: 24.8,
  });

  const [recentActivity] = useState<RecentActivity[]>([
    {
      id: '1',
      type: 'funding',
      client: 'TechStart Solutions',
      amount: 150000,
      status: 'completed',
      date: '2024-01-15',
      description: 'Series A funding approved and disbursed'
    },
    {
      id: '2',
      type: 'payment',
      client: 'GreenEnergy Corp',
      amount: 25000,
      status: 'completed',
      date: '2024-01-14',
      description: 'Monthly interest payment received'
    },
    {
      id: '3',
      type: 'application',
      client: 'HealthTech Innovations',
      amount: 200000,
      status: 'pending',
      date: '2024-01-13',
      description: 'New funding application under review'
    },
    {
      id: '4',
      type: 'completion',
      client: 'RetailMax Inc',
      amount: 75000,
      status: 'completed',
      date: '2024-01-12',
      description: 'Loan fully repaid with interest'
    },
    {
      id: '5',
      type: 'funding',
      client: 'AI Dynamics',
      amount: 300000,
      status: 'pending',
      date: '2024-01-11',
      description: 'Large funding request in final approval'
    }
  ]);

  const [topPerformers] = useState<TopPerformer[]>([
    {
      id: '1',
      name: 'TechStart Solutions',
      totalFunded: 450000,
      roi: 15.2,
      deals: 3,
      status: 'excellent'
    },
    {
      id: '2',
      name: 'GreenEnergy Corp',
      totalFunded: 380000,
      roi: 12.8,
      deals: 2,
      status: 'excellent'
    },
    {
      id: '3',
      name: 'HealthTech Innovations',
      totalFunded: 320000,
      roi: 11.5,
      deals: 4,
      status: 'good'
    },
    {
      id: '4',
      name: 'RetailMax Inc',
      totalFunded: 280000,
      roi: 9.8,
      deals: 2,
      status: 'good'
    },
    {
      id: '5',
      name: 'AI Dynamics',
      totalFunded: 250000,
      roi: 8.5,
      deals: 1,
      status: 'average'
    }
  ]);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const StatCard = ({ 
    title, 
    value, 
    change, 
    changeType, 
    icon: Icon, 
    className = "",
    description 
  }: {
    title: string;
    value: string | number;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    icon: any;
    className?: string;
    description?: string;
  }) => (
    <Card className={`relative overflow-hidden ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-emerald-600" />
          </div>
        </div>
        {change && (
          <div className="flex items-center mt-4">
            {changeType === 'positive' ? (
              <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
            ) : changeType === 'negative' ? (
              <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
            ) : null}
            <p className={`text-sm ${
              changeType === 'positive' ? 'text-green-600' : 
              changeType === 'negative' ? 'text-red-600' : 
              'text-muted-foreground'
            }`}>
              {change} from last month
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <FundingManagerLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      </FundingManagerLayout>
    );
  }

  return (
    <FundingManagerLayout 
      title="Portfolio Overview" 
      description="Comprehensive view of your funding portfolio performance and metrics"
    >
      <div className="space-y-8">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Date Range
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Key Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Portfolio Value"
            value={`$${(stats.totalPortfolioValue / 1000000).toFixed(1)}M`}
            change="+12.5%"
            changeType="positive"
            icon={Wallet}
            className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200"
            description="Total value of all investments"
          />
          <StatCard
            title="Total Funded"
            value={`$${(stats.totalFunded / 1000000).toFixed(1)}M`}
            change="+18.2%"
            changeType="positive"
            icon={DollarSign}
            className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 border-teal-200"
            description="Total amount funded to clients"
          />
          <StatCard
            title="Monthly ROI"
            value={`${stats.monthlyROI}%`}
            change="+2.1%"
            changeType="positive"
            icon={TrendingUp}
            className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200"
            description="Average return on investment"
          />
          <StatCard
            title="Active Investments"
            value={stats.activeInvestments}
            change="+5"
            changeType="positive"
            icon={Target}
            className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200"
            description="Currently active funding deals"
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Clients"
            value={stats.totalClients}
            change="+8"
            changeType="positive"
            icon={Users}
            description="All registered clients"
          />
          <StatCard
            title="Success Rate"
            value={`${stats.successRate}%`}
            change="+1.2%"
            changeType="positive"
            icon={CheckCircle}
            description="Successful funding rate"
          />
          <StatCard
            title="Average Deal Size"
            value={`$${(stats.averageDealSize / 1000).toFixed(0)}K`}
            change="+$5K"
            changeType="positive"
            icon={Calculator}
            description="Average funding amount"
          />
          <StatCard
            title="Monthly Revenue"
            value={`$${(stats.monthlyRevenue / 1000000).toFixed(2)}M`}
            change="+15.8%"
            changeType="positive"
            icon={Banknote}
            description="Revenue from all sources"
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            <TabsTrigger value="clients">Top Performers</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Portfolio Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <PieChart className="h-5 w-5 text-emerald-600" />
                    <span>Portfolio Distribution</span>
                  </CardTitle>
                  <CardDescription>
                    Breakdown of investments by category
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Technology</span>
                      <span className="text-sm text-muted-foreground">45%</span>
                    </div>
                    <Progress value={45} className="h-2" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Healthcare</span>
                      <span className="text-sm text-muted-foreground">25%</span>
                    </div>
                    <Progress value={25} className="h-2" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Retail</span>
                      <span className="text-sm text-muted-foreground">20%</span>
                    </div>
                    <Progress value={20} className="h-2" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Energy</span>
                      <span className="text-sm text-muted-foreground">10%</span>
                    </div>
                    <Progress value={10} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Risk Assessment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-emerald-600" />
                    <span>Risk Assessment</span>
                  </CardTitle>
                  <CardDescription>
                    Current portfolio risk analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">Low Risk</div>
                    <p className="text-sm text-muted-foreground">
                      Portfolio is well-diversified with stable returns
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Diversification Score</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Excellent
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Volatility Index</span>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        Moderate
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Liquidity Rating</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        High
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-emerald-600" />
                  <span>Performance Trends</span>
                </CardTitle>
                <CardDescription>
                  Monthly performance over the last 12 months
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Performance chart would be displayed here</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Integration with charting library required
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-emerald-600" />
                  <span>Recent Activity</span>
                </CardTitle>
                <CardDescription>
                  Latest funding activities and transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-4 border border-border/40 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          activity.type === 'funding' ? 'bg-emerald-100 dark:bg-emerald-900/20' :
                          activity.type === 'payment' ? 'bg-teal-100 dark:bg-teal-900/20' :
                          activity.type === 'application' ? 'bg-blue-100 dark:bg-blue-900/20' :
                          'bg-green-100 dark:bg-green-900/20'
                        }`}>
                          {activity.type === 'funding' && <DollarSign className="h-5 w-5 text-emerald-600" />}
                          {activity.type === 'payment' && <Banknote className="h-5 w-5 text-teal-600" />}
                          {activity.type === 'application' && <FileText className="h-5 w-5 text-blue-600" />}
                          {activity.type === 'completion' && <CheckCircle className="h-5 w-5 text-green-600" />}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {activity.client}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {activity.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(activity.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          ${activity.amount.toLocaleString()}
                        </p>
                        <Badge 
                          variant={activity.status === 'completed' ? 'default' : 
                                  activity.status === 'pending' ? 'secondary' : 'destructive'}
                          className="text-xs mt-1"
                        >
                          {activity.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <Button variant="outline" className="w-full">
                    <Eye className="h-4 w-4 mr-2" />
                    View All Activity
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5 text-emerald-600" />
                  <span>Top Performing Clients</span>
                </CardTitle>
                <CardDescription>
                  Clients with highest ROI and funding amounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topPerformers.map((performer, index) => (
                    <div key={performer.id} className="flex items-center justify-between p-4 border border-border/40 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-yellow-100 text-yellow-800' :
                            index === 1 ? 'bg-gray-100 text-gray-800' :
                            index === 2 ? 'bg-orange-100 text-orange-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {index + 1}
                          </div>
                          {index < 3 && <Star className="h-4 w-4 text-yellow-500" />}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {performer.name}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {performer.deals} deals completed
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          ${performer.totalFunded.toLocaleString()}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge 
                            variant={performer.status === 'excellent' ? 'default' : 
                                    performer.status === 'good' ? 'secondary' : 'outline'}
                            className="text-xs"
                          >
                            {performer.roi}% ROI
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="h-5 w-5 text-emerald-600" />
                    <span>Key Insights</span>
                  </CardTitle>
                  <CardDescription>
                    AI-powered portfolio insights
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <TrendingUp className="h-5 w-5 text-emerald-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-emerald-900 dark:text-emerald-100">
                          Strong Performance
                        </p>
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">
                          Your portfolio is outperforming market average by 15.2%
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <Target className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-900 dark:text-blue-100">
                          Diversification Opportunity
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Consider expanding into renewable energy sector
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-900 dark:text-yellow-100">
                          Attention Required
                        </p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          3 clients approaching payment due dates
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Globe className="h-5 w-5 text-emerald-600" />
                    <span>Market Trends</span>
                  </CardTitle>
                  <CardDescription>
                    Current market conditions and opportunities
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Technology Sector</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Bullish
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Healthcare</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Stable
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Retail</span>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        Volatile
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Energy</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Growing
                      </Badge>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Market sentiment is positive with increased funding opportunities in tech and renewable energy sectors.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </FundingManagerLayout>
  );
}