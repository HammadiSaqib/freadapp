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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FundingManagerLayout from "@/components/FundingManagerLayout";
import { useState, useEffect } from "react";
import {
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Target,
  Calendar,
  Download,
  RefreshCw,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Zap,
  Globe,
  Building2,
  CreditCard,
  Wallet,
  Calculator,
  Clock,
  CheckCircle,
  AlertTriangle,
  Info,
  Eye,
  Settings,
  Maximize2,
  MoreHorizontal,
  FileText,
  Percent,
  Hash,
  Timer,
  Award,
  Star,
  Shield,
  Layers,
} from "lucide-react";

interface AnalyticsData {
  timeRange: string;
  totalRevenue: number;
  revenueGrowth: number;
  totalFunded: number;
  fundingGrowth: number;
  activeClients: number;
  clientGrowth: number;
  averageROI: number;
  roiGrowth: number;
  conversionRate: number;
  conversionGrowth: number;
  averageDealTime: number;
  dealTimeChange: number;
}

interface ChartData {
  month: string;
  revenue: number;
  funded: number;
  clients: number;
  roi: number;
}

interface SectorPerformance {
  sector: string;
  totalFunded: number;
  roi: number;
  deals: number;
  growth: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface GeographicData {
  region: string;
  totalFunded: number;
  clients: number;
  averageROI: number;
  marketShare: number;
}

export default function FundingManagerAnalytics() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("12months");
  const [selectedMetric, setSelectedMetric] = useState("revenue");
  
  const [analyticsData] = useState<AnalyticsData>({
    timeRange: "12 months",
    totalRevenue: 15750000,
    revenueGrowth: 24.8,
    totalFunded: 125000000,
    fundingGrowth: 18.5,
    activeClients: 89,
    clientGrowth: 12.3,
    averageROI: 11.2,
    roiGrowth: 2.1,
    conversionRate: 68.5,
    conversionGrowth: 5.2,
    averageDealTime: 21,
    dealTimeChange: -3.5,
  });

  const [chartData] = useState<ChartData[]>([
    { month: "Jan", revenue: 1200000, funded: 8500000, clients: 78, roi: 10.2 },
    { month: "Feb", revenue: 1350000, funded: 9200000, clients: 81, roi: 10.8 },
    { month: "Mar", revenue: 1180000, funded: 8800000, clients: 79, roi: 9.9 },
    { month: "Apr", revenue: 1420000, funded: 10100000, clients: 84, roi: 11.5 },
    { month: "May", revenue: 1380000, funded: 9800000, clients: 82, roi: 11.1 },
    { month: "Jun", revenue: 1550000, funded: 11200000, clients: 87, roi: 12.3 },
    { month: "Jul", revenue: 1480000, funded: 10600000, clients: 85, roi: 11.8 },
    { month: "Aug", revenue: 1620000, funded: 11800000, clients: 89, roi: 12.8 },
    { month: "Sep", revenue: 1590000, funded: 11400000, clients: 88, roi: 12.5 },
    { month: "Oct", revenue: 1720000, funded: 12500000, clients: 92, roi: 13.2 },
    { month: "Nov", revenue: 1680000, funded: 12100000, clients: 90, roi: 12.9 },
    { month: "Dec", revenue: 1800000, funded: 13200000, clients: 95, roi: 13.8 },
  ]);

  const [sectorPerformance] = useState<SectorPerformance[]>([
    {
      sector: "Technology",
      totalFunded: 45000000,
      roi: 14.2,
      deals: 28,
      growth: 32.1,
      riskLevel: 'medium'
    },
    {
      sector: "Healthcare",
      totalFunded: 28000000,
      roi: 12.8,
      deals: 18,
      growth: 18.5,
      riskLevel: 'low'
    },
    {
      sector: "Retail",
      totalFunded: 22000000,
      roi: 9.5,
      deals: 22,
      growth: 8.2,
      riskLevel: 'high'
    },
    {
      sector: "Energy",
      totalFunded: 18000000,
      roi: 11.8,
      deals: 12,
      growth: 45.8,
      riskLevel: 'medium'
    },
    {
      sector: "Manufacturing",
      totalFunded: 12000000,
      roi: 8.9,
      deals: 15,
      growth: 12.3,
      riskLevel: 'low'
    }
  ]);

  const [geographicData] = useState<GeographicData[]>([
    {
      region: "North America",
      totalFunded: 65000000,
      clients: 45,
      averageROI: 12.5,
      marketShare: 52.0
    },
    {
      region: "Europe",
      totalFunded: 35000000,
      clients: 28,
      averageROI: 11.8,
      marketShare: 28.0
    },
    {
      region: "Asia Pacific",
      totalFunded: 20000000,
      clients: 12,
      averageROI: 13.2,
      marketShare: 16.0
    },
    {
      region: "Latin America",
      totalFunded: 5000000,
      clients: 4,
      averageROI: 10.5,
      marketShare: 4.0
    }
  ]);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  const MetricCard = ({ 
    title, 
    value, 
    change, 
    changeType, 
    icon: Icon, 
    className = "",
    description,
    trend = []
  }: {
    title: string;
    value: string | number;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    icon: any;
    className?: string;
    description?: string;
    trend?: number[];
  }) => (
    <Card className={`relative overflow-hidden ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-emerald-600" />
          </div>
        </div>
        
        {/* Mini trend chart */}
        {trend.length > 0 && (
          <div className="h-8 mb-3">
            <div className="flex items-end space-x-1 h-full">
              {trend.map((value, index) => (
                <div
                  key={index}
                  className="bg-emerald-200 dark:bg-emerald-800 rounded-sm flex-1"
                  style={{ height: `${(value / Math.max(...trend)) * 100}%` }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          {change && (
            <div className="flex items-center">
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
                {change}
              </p>
            </div>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
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
      title="Analytics Dashboard" 
      description="Comprehensive analytics and insights for your funding portfolio"
    >
      <div className="space-y-8">
        {/* Header Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="3months">Last 3 months</SelectItem>
                <SelectItem value="6months">Last 6 months</SelectItem>
                <SelectItem value="12months">Last 12 months</SelectItem>
                <SelectItem value="2years">Last 2 years</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Custom Range
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
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </Button>
          </div>
        </div>

        {/* Key Performance Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          <MetricCard
            title="Total Revenue"
            value={`$${(analyticsData.totalRevenue / 1000000).toFixed(1)}M`}
            change={`+${analyticsData.revenueGrowth}%`}
            changeType="positive"
            icon={DollarSign}
            className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200"
            trend={[1200000, 1350000, 1180000, 1420000, 1380000, 1550000, 1800000]}
          />
          <MetricCard
            title="Total Funded"
            value={`$${(analyticsData.totalFunded / 1000000).toFixed(0)}M`}
            change={`+${analyticsData.fundingGrowth}%`}
            changeType="positive"
            icon={Wallet}
            className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 border-teal-200"
            trend={[8500000, 9200000, 8800000, 10100000, 9800000, 11200000, 13200000]}
          />
          <MetricCard
            title="Active Clients"
            value={analyticsData.activeClients}
            change={`+${analyticsData.clientGrowth}%`}
            changeType="positive"
            icon={Users}
            className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200"
            trend={[78, 81, 79, 84, 82, 87, 95]}
          />
          <MetricCard
            title="Average ROI"
            value={`${analyticsData.averageROI}%`}
            change={`+${analyticsData.roiGrowth}%`}
            changeType="positive"
            icon={TrendingUp}
            className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200"
            trend={[10.2, 10.8, 9.9, 11.5, 11.1, 12.3, 13.8]}
          />
          <MetricCard
            title="Conversion Rate"
            value={`${analyticsData.conversionRate}%`}
            change={`+${analyticsData.conversionGrowth}%`}
            changeType="positive"
            icon={Target}
            className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200"
            trend={[65, 67, 64, 69, 68, 71, 68.5]}
          />
          <MetricCard
            title="Avg Deal Time"
            value={`${analyticsData.averageDealTime} days`}
            change={`${analyticsData.dealTimeChange} days`}
            changeType="positive"
            icon={Clock}
            className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200"
            trend={[25, 24, 26, 23, 22, 20, 21]}
          />
        </div>

        {/* Main Analytics Tabs */}
        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="sectors">Sectors</TabsTrigger>
            <TabsTrigger value="geographic">Geographic</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Trends Chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <LineChart className="h-5 w-5 text-emerald-600" />
                        <span>Performance Trends</span>
                      </CardTitle>
                      <CardDescription>
                        Revenue, funding, and client growth over time
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="revenue">Revenue</SelectItem>
                          <SelectItem value="funded">Funded</SelectItem>
                          <SelectItem value="clients">Clients</SelectItem>
                          <SelectItem value="roi">ROI</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm">
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-80 flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="text-center">
                      <LineChart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-lg font-medium text-muted-foreground mb-2">
                        Interactive Chart Placeholder
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Integration with charting library (Chart.js, Recharts, etc.) required
                      </p>
                      <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
                        {chartData.slice(-4).map((data, index) => (
                          <div key={index} className="text-center">
                            <p className="font-medium">{data.month}</p>
                            <p className="text-muted-foreground">
                              {selectedMetric === 'revenue' && `$${(data.revenue / 1000000).toFixed(1)}M`}
                              {selectedMetric === 'funded' && `$${(data.funded / 1000000).toFixed(1)}M`}
                              {selectedMetric === 'clients' && data.clients}
                              {selectedMetric === 'roi' && `${data.roi}%`}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-emerald-600" />
                    <span>Performance Metrics</span>
                  </CardTitle>
                  <CardDescription>
                    Key performance indicators breakdown
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Portfolio Growth</span>
                      <span className="text-sm font-bold text-green-600">+24.8%</span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Client Satisfaction</span>
                      <span className="text-sm font-bold text-green-600">94.2%</span>
                    </div>
                    <Progress value={94} className="h-2" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Deal Success Rate</span>
                      <span className="text-sm font-bold text-green-600">92.5%</span>
                    </div>
                    <Progress value={93} className="h-2" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Risk Management</span>
                      <span className="text-sm font-bold text-blue-600">Excellent</span>
                    </div>
                    <Progress value={88} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Top Metrics Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Award className="h-5 w-5 text-emerald-600" />
                    <span>Achievement Summary</span>
                  </CardTitle>
                  <CardDescription>
                    Notable achievements and milestones
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                    <Star className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="font-medium text-emerald-900 dark:text-emerald-100">
                        Top Performer
                      </p>
                      <p className="text-sm text-emerald-700 dark:text-emerald-300">
                        Exceeded quarterly targets by 15%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900 dark:text-blue-100">
                        Risk Management
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Maintained low default rate of 2.1%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <Layers className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-purple-900 dark:text-purple-100">
                        Diversification
                      </p>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        Well-balanced across 5 sectors
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sectors" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sector Performance Table */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5 text-emerald-600" />
                    <span>Sector Performance Analysis</span>
                  </CardTitle>
                  <CardDescription>
                    Detailed breakdown by industry sector
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sectorPerformance.map((sector, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border border-border/40 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className={`w-3 h-3 rounded-full ${
                            sector.riskLevel === 'low' ? 'bg-green-500' :
                            sector.riskLevel === 'medium' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`} />
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">
                              {sector.sector}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {sector.deals} deals • {sector.riskLevel} risk
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            ${(sector.totalFunded / 1000000).toFixed(1)}M
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {sector.roi}% ROI
                            </Badge>
                            <Badge 
                              variant={sector.growth > 20 ? 'default' : 'outline'}
                              className="text-xs"
                            >
                              +{sector.growth}%
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Sector Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <PieChart className="h-5 w-5 text-emerald-600" />
                    <span>Sector Distribution</span>
                  </CardTitle>
                  <CardDescription>
                    Portfolio allocation by sector
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sectorPerformance.map((sector, index) => {
                      const percentage = (sector.totalFunded / sectorPerformance.reduce((sum, s) => sum + s.totalFunded, 0)) * 100;
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{sector.sector}</span>
                            <span className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Technology sector leads with 36% of total funding, showing strong growth potential.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="geographic" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Geographic Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Globe className="h-5 w-5 text-emerald-600" />
                    <span>Geographic Performance</span>
                  </CardTitle>
                  <CardDescription>
                    Regional funding distribution and performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {geographicData.map((region, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border border-border/40 rounded-lg">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {region.region}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {region.clients} clients • {region.averageROI}% avg ROI
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            ${(region.totalFunded / 1000000).toFixed(1)}M
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {region.marketShare}% share
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Market Share Visualization */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-emerald-600" />
                    <span>Market Share</span>
                  </CardTitle>
                  <CardDescription>
                    Regional market penetration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {geographicData.map((region, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{region.region}</span>
                          <span className="text-sm text-muted-foreground">{region.marketShare}%</span>
                        </div>
                        <Progress value={region.marketShare} className="h-2" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      North America represents our largest market with significant growth opportunities in Asia Pacific.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  <span>Market Trends & Insights</span>
                </CardTitle>
                <CardDescription>
                  Analysis of market trends and future opportunities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                      Emerging Trends
                    </h4>
                    <div className="space-y-3">
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Zap className="h-4 w-4 text-emerald-600" />
                          <span className="font-medium text-emerald-900 dark:text-emerald-100">
                            AI & Machine Learning
                          </span>
                        </div>
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">
                          45% increase in AI-related funding requests
                        </p>
                      </div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Globe className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-900 dark:text-blue-100">
                            Sustainable Energy
                          </span>
                        </div>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Growing demand for green energy investments
                        </p>
                      </div>
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Building2 className="h-4 w-4 text-purple-600" />
                          <span className="font-medium text-purple-900 dark:text-purple-100">
                            Remote Work Solutions
                          </span>
                        </div>
                        <p className="text-sm text-purple-700 dark:text-purple-300">
                          Continued growth in remote work technologies
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                      Risk Factors
                    </h4>
                    <div className="space-y-3">
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <span className="font-medium text-yellow-900 dark:text-yellow-100">
                            Market Volatility
                          </span>
                        </div>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          Increased market uncertainty affecting valuations
                        </p>
                      </div>
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Info className="h-4 w-4 text-red-600" />
                          <span className="font-medium text-red-900 dark:text-red-100">
                            Regulatory Changes
                          </span>
                        </div>
                        <p className="text-sm text-red-700 dark:text-red-300">
                          New regulations may impact funding strategies
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="forecasting" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calculator className="h-5 w-5 text-emerald-600" />
                    <span>Revenue Forecast</span>
                  </CardTitle>
                  <CardDescription>
                    Projected revenue for next 12 months
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="text-center">
                      <LineChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Forecasting chart placeholder</p>
                      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <p className="font-medium">Q1 2024</p>
                          <p className="text-green-600">$4.8M</p>
                        </div>
                        <div className="text-center">
                          <p className="font-medium">Q3 2026</p>
                          <p className="text-green-600">$5.2M</p>
                        </div>
                        <div className="text-center">
                          <p className="font-medium">Q3 2024</p>
                          <p className="text-green-600">$5.8M</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-emerald-600" />
                    <span>Growth Projections</span>
                  </CardTitle>
                  <CardDescription>
                    Expected growth metrics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Revenue Growth</span>
                      <span className="text-sm font-bold text-green-600">+28%</span>
                    </div>
                    <Progress value={28} className="h-2" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Client Acquisition</span>
                      <span className="text-sm font-bold text-blue-600">+35%</span>
                    </div>
                    <Progress value={35} className="h-2" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Portfolio Value</span>
                      <span className="text-sm font-bold text-purple-600">+22%</span>
                    </div>
                    <Progress value={22} className="h-2" />
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Projections based on current trends and market analysis. Actual results may vary.
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