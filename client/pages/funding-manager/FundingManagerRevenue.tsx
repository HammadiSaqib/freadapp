import React, { useState, useEffect } from 'react';
import FundingManagerLayout from '@/components/FundingManagerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Download,
  Filter,
  Search,
  BarChart3,
  PieChart,
  LineChart,
  Target,
  Percent,
  Clock,
  Users,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';

interface RevenueData {
  id: string;
  client_name: string;
  funding_amount: number;
  revenue_generated: number;
  commission_rate: number;
  commission_earned: number;
  date: string;
  status: 'active' | 'completed' | 'pending';
  roi: number;
}

interface RevenueMetrics {
  total_revenue: number;
  monthly_revenue: number;
  average_commission_rate: number;
  total_clients: number;
  active_fundings: number;
  revenue_growth: number;
  commission_growth: number;
  roi_average: number;
}

const FundingManagerRevenue: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [metrics, setMetrics] = useState<RevenueMetrics>({
    total_revenue: 0,
    monthly_revenue: 0,
    average_commission_rate: 0,
    total_clients: 0,
    active_fundings: 0,
    revenue_growth: 0,
    commission_growth: 0,
    roi_average: 0
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('30');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchRevenueData();
  }, [dateRange]);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      
      // Simulate API call with mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockRevenueData: RevenueData[] = [
        {
          id: '1',
          client_name: 'John Smith',
          funding_amount: 50000,
          revenue_generated: 12500,
          commission_rate: 15,
          commission_earned: 1875,
          date: '2024-01-15',
          status: 'active',
          roi: 25
        },
        {
          id: '2',
          client_name: 'Sarah Johnson',
          funding_amount: 75000,
          revenue_generated: 22500,
          commission_rate: 18,
          commission_earned: 4050,
          date: '2024-01-10',
          status: 'completed',
          roi: 30
        },
        {
          id: '3',
          client_name: 'Michael Brown',
          funding_amount: 30000,
          revenue_generated: 6000,
          commission_rate: 12,
          commission_earned: 720,
          date: '2024-01-20',
          status: 'active',
          roi: 20
        },
        {
          id: '4',
          client_name: 'Emily Davis',
          funding_amount: 100000,
          revenue_generated: 35000,
          commission_rate: 20,
          commission_earned: 7000,
          date: '2024-01-05',
          status: 'completed',
          roi: 35
        },
        {
          id: '5',
          client_name: 'Robert Wilson',
          funding_amount: 25000,
          revenue_generated: 3750,
          commission_rate: 10,
          commission_earned: 375,
          date: '2024-01-25',
          status: 'pending',
          roi: 15
        }
      ];

      const mockMetrics: RevenueMetrics = {
        total_revenue: 79750,
        monthly_revenue: 25000,
        average_commission_rate: 15,
        total_clients: 5,
        active_fundings: 2,
        revenue_growth: 12.5,
        commission_growth: 18.3,
        roi_average: 25
      };

      setRevenueData(mockRevenueData);
      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = revenueData.filter(item => {
    const matchesSearch = item.client_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const StatCard = ({ title, value, change, icon: Icon, trend }: {
    title: string;
    value: string;
    change: string;
    icon: React.ElementType;
    trend: 'up' | 'down';
  }) => (
    <Card className="border-0 shadow-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <div className="flex items-center space-x-1">
              {trend === 'up' ? (
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-600" />
              )}
              <span className={`text-sm font-medium ${
                trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {change}
              </span>
            </div>
          </div>
          <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full">
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <FundingManagerLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Revenue Analytics
                </h1>
                <p className="text-muted-foreground mt-2">
                  Track your funding revenue, commissions, and performance metrics
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 3 months</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={fetchRevenueData}
                  disabled={loading}
                  className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
                <Button className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Revenue"
              value={formatCurrency(metrics.total_revenue)}
              change={`+${metrics.revenue_growth}%`}
              icon={DollarSign}
              trend="up"
            />
            <StatCard
              title="Monthly Revenue"
              value={formatCurrency(metrics.monthly_revenue)}
              change={`+${metrics.commission_growth}%`}
              icon={TrendingUp}
              trend="up"
            />
            <StatCard
              title="Avg Commission Rate"
              value={`${metrics.average_commission_rate}%`}
              change="+2.1%"
              icon={Percent}
              trend="up"
            />
            <StatCard
              title="Active Clients"
              value={metrics.total_clients.toString()}
              change="+3"
              icon={Users}
              trend="up"
            />
          </div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <LineChart className="h-5 w-5 text-emerald-600" />
                        <span>Revenue Trend</span>
                      </CardTitle>
                      <CardDescription>
                        Monthly revenue performance over time
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80 flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-lg">
                        <div className="text-center space-y-2">
                          <BarChart3 className="h-12 w-12 text-emerald-600 mx-auto" />
                          <p className="text-muted-foreground">Revenue Chart</p>
                          <p className="text-sm text-muted-foreground">Interactive chart would be displayed here</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Target className="h-5 w-5 text-emerald-600" />
                        <span>Performance</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Revenue Goal</span>
                          <span className="font-medium">75%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Commission Target</span>
                          <span className="font-medium">82%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full" style={{ width: '82%' }}></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>ROI Average</span>
                          <span className="font-medium">68%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-gradient-to-r from-orange-500 to-red-600 h-2 rounded-full" style={{ width: '68%' }}></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <PieChart className="h-5 w-5 text-emerald-600" />
                        <span>Revenue Sources</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                            <span className="text-sm">Direct Funding</span>
                          </div>
                          <span className="text-sm font-medium">65%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="text-sm">Referral Commissions</span>
                          </div>
                          <span className="text-sm font-medium">25%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                            <span className="text-sm">Performance Bonus</span>
                          </div>
                          <span className="text-sm font-medium">10%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions" className="space-y-6">
              <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <CreditCard className="h-5 w-5 text-emerald-600" />
                        <span>Revenue Transactions</span>
                      </CardTitle>
                      <CardDescription>
                        Detailed view of all revenue-generating transactions
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search clients..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 w-64"
                        />
                      </div>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                      <p className="mt-2 text-muted-foreground">Loading transactions...</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Client</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Funding Amount</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Revenue</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Commission</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">ROI</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredData.map((transaction) => (
                            <tr key={transaction.id} className="border-b hover:bg-gray-50 dark:hover:bg-slate-800/50">
                              <td className="py-4 px-4">
                                <div className="font-medium">{transaction.client_name}</div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="font-medium">{formatCurrency(transaction.funding_amount)}</div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="font-medium text-green-600">{formatCurrency(transaction.revenue_generated)}</div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="font-medium">{formatCurrency(transaction.commission_earned)}</div>
                                <div className="text-sm text-muted-foreground">{transaction.commission_rate}% rate</div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="font-medium text-emerald-600">{transaction.roi}%</div>
                              </td>
                              <td className="py-4 px-4">
                                <Badge className={getStatusColor(transaction.status)}>
                                  {transaction.status}
                                </Badge>
                              </td>
                              <td className="py-4 px-4">
                                <div className="text-sm text-muted-foreground">
                                  {new Date(transaction.date).toLocaleDateString()}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5 text-emerald-600" />
                      <span>Revenue by Month</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-lg">
                      <div className="text-center space-y-2">
                        <BarChart3 className="h-8 w-8 text-emerald-600 mx-auto" />
                        <p className="text-sm text-muted-foreground">Monthly Revenue Chart</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <PieChart className="h-5 w-5 text-emerald-600" />
                      <span>Commission Distribution</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-lg">
                      <div className="text-center space-y-2">
                        <PieChart className="h-8 w-8 text-blue-600 mx-auto" />
                        <p className="text-sm text-muted-foreground">Commission Breakdown</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports" className="space-y-6">
              <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Download className="h-5 w-5 text-emerald-600" />
                    <span>Revenue Reports</span>
                  </CardTitle>
                  <CardDescription>
                    Generate and download detailed revenue reports
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <Download className="h-5 w-5" />
                      <span>Monthly Report</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <Download className="h-5 w-5" />
                      <span>Quarterly Report</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <Download className="h-5 w-5" />
                      <span>Annual Report</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <Download className="h-5 w-5" />
                      <span>Commission Report</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <Download className="h-5 w-5" />
                      <span>Client Performance</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <Download className="h-5 w-5" />
                      <span>ROI Analysis</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </FundingManagerLayout>
  );
};

export default FundingManagerRevenue;