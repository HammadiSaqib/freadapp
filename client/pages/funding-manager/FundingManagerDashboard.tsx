import React, { useState, useEffect } from "react";
import FundingManagerLayout from "@/components/FundingManagerLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Wallet,
  PieChart,
  BarChart3,
  Target,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  CreditCard,
  Banknote,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";

interface DashboardStats {
  totalFunded: { value: number; change: number };
  activeInvestments: { value: number; change: number };
  monthlyROI: { value: number; change: number };
  portfolioValue: { value: number; change: number };
  fundedClients: { value: number; change: number };
  pendingApplications: { value: number; change: number };
  averageTicketSize: { value: number; change: number };
  successRate: { value: number; change: number };
  // New banking metrics
  numberOfBanks: { value: number; change: number };
  numberOfCards: { value: number; change: number };
  readyForFunding: { value: number; change: number };
  notReadyForFunding: { value: number; change: number };
}

interface RecentActivity {
  id: number;
  type: 'funding' | 'application' | 'approval' | 'rejection';
  title: string;
  description: string;
  amount?: number;
  timestamp: string;
  status: 'success' | 'pending' | 'failed';
}

export default function FundingManagerDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalFunded: { value: 0, change: 0 },
    activeInvestments: { value: 0, change: 0 },
    monthlyROI: { value: 0, change: 0 },
    portfolioValue: { value: 0, change: 0 },
    fundedClients: { value: 0, change: 0 },
    pendingApplications: { value: 0, change: 0 },
    averageTicketSize: { value: 0, change: 0 },
    successRate: { value: 0, change: 0 },
    numberOfBanks: { value: 0, change: 0 },
    numberOfCards: { value: 0, change: 0 },
    readyForFunding: { value: 0, change: 0 },
    notReadyForFunding: { value: 0, change: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  // Fetch dashboard stats from API
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
          throw new Error('Authentication required. Please log in as a funding manager.');
        }
        
        const response = await fetch('/api/funding-manager/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        }
        
        if (response.status === 403) {
          throw new Error('Access denied. You need funding manager privileges to view dashboard statistics.');
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to fetch dashboard stats (${response.status})`);
        }

        const data = await response.json();
        console.log('API Response:', data);
        
        // Handle different response structures
        const rawStatsData = data.data || data;
        const statsData = rawStatsData && typeof rawStatsData === 'object'
          ? {
              ...rawStatsData,
              averageTicketSize: rawStatsData.averageTicketSize ?? rawStatsData.avgTicketSize ?? 0,
            }
          : rawStatsData;
        console.log('Stats Data:', statsData);
        
        if (statsData && typeof statsData === 'object') {
          setStats(statsData);
          setError(null);
        } else {
          throw new Error('Invalid response structure');
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError('Failed to load dashboard data');
        // Set fallback data for development
        setStats({
          totalFunded: { value: 2500000, change: 15.2 },
          activeInvestments: { value: 156, change: 8.1 },
          monthlyROI: { value: 12.5, change: 2.3 },
          portfolioValue: { value: 3200000, change: 12.7 },
          fundedClients: { value: 89, change: 5.4 },
          pendingApplications: { value: 23, change: -12.3 },
          averageTicketSize: { value: 27500, change: 8.9 },
          successRate: { value: 87.3, change: 3.2 },
          numberOfBanks: { value: 45, change: 7.1 },
          numberOfCards: { value: 128, change: 12.8 },
          readyForFunding: { value: 34, change: 4.2 },
          notReadyForFunding: { value: 11, change: 0 }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  // Mock recent activity data
  useEffect(() => {
    setRecentActivity([
      {
        id: 1,
        type: 'funding',
        title: 'Funding Approved',
        description: 'John Smith - Equipment Purchase',
        amount: 45000,
        timestamp: '2024-01-15T10:30:00Z',
        status: 'success'
      },
      {
        id: 2,
        type: 'application',
        title: 'New Application',
        description: 'Sarah Johnson - Marketing Campaign',
        amount: 25000,
        timestamp: '2024-01-15T09:15:00Z',
        status: 'pending'
      },
      {
        id: 3,
        type: 'approval',
        title: 'Application Approved',
        description: 'Mike Davis - Inventory Expansion',
        amount: 60000,
        timestamp: '2024-01-14T16:45:00Z',
        status: 'success'
      }
    ]);
  }, []);

  // Helper function to format currency
  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  // Helper function to format percentage change
  const formatPercentageChange = (change: number): string => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  // StatCard component with updated props
  const StatCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    className = '',
    isCurrency = false,
    isPercentage = false
  }: {
    title: string;
    value: number;
    change: number;
    icon: any;
    className?: string;
    isCurrency?: boolean;
    isPercentage?: boolean;
  }) => {
    const changeType = change >= 0 ? 'positive' : 'negative';
    
    return (
      <Card className={`${className} hover:shadow-lg transition-shadow duration-200`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {title}
          </CardTitle>
          <Icon className="h-4 w-4 text-emerald-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {isCurrency ? formatCurrency(value) : 
             isPercentage ? `${value}%` : 
             value.toLocaleString()}
          </div>
          <p className={`text-xs flex items-center mt-1 ${
            changeType === 'positive' ? 'text-emerald-600' : 'text-red-600'
          }`}>
            {changeType === 'positive' ? (
              <ArrowUpRight className="h-3 w-3 mr-1" />
            ) : (
              <ArrowDownRight className="h-3 w-3 mr-1" />
            )}
            {formatPercentageChange(change)} from last month
          </p>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <FundingManagerLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      </FundingManagerLayout>
    );
  }

  // Add safety check for stats
  if (!stats || !stats.totalFunded) {
    return (
      <FundingManagerLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-lg font-semibold text-slate-600 dark:text-slate-400">
              Loading dashboard data...
            </div>
          </div>
        </div>
      </FundingManagerLayout>
    );
  }

  return (
    <FundingManagerLayout 
      title="Funding Manager Dashboard" 
      description="Monitor your funding portfolio and client performance"
    >
      <div className="space-y-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Funded"
            value={stats.totalFunded?.value || 0}
            change={stats.totalFunded?.change || 0}
            icon={DollarSign}
            isCurrency={true}
            className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200"
          />
          <StatCard
            title="Active Investments"
            value={stats.activeInvestments?.value || 0}
            change={stats.activeInvestments?.change || 0}
            icon={Wallet}
            className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 border-teal-200"
          />
          <StatCard
            title="Monthly ROI"
            value={stats.monthlyROI?.value || 0}
            change={stats.monthlyROI?.change || 0}
            icon={TrendingUp}
            isPercentage={true}
            className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200"
          />
          <StatCard
            title="Portfolio Value"
            value={stats.portfolioValue?.value || 0}
            change={stats.portfolioValue?.change || 0}
            icon={PieChart}
            isCurrency={true}
            className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20 border-cyan-200"
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Funded Clients"
            value={stats.fundedClients?.value || 0}
            change={stats.fundedClients?.change || 0}
            icon={Users}
          />
          <StatCard
            title="Pending Applications"
            value={stats.pendingApplications?.value || 0}
            change={stats.pendingApplications?.change || 0}
            icon={Clock}
          />
          <StatCard
            title="Avg Ticket Size"
            value={stats.averageTicketSize?.value || 0}
            change={stats.averageTicketSize?.change || 0}
            icon={Calculator}
            isCurrency={true}
          />
          <StatCard
            title="Success Rate"
            value={stats.successRate?.value || 0}
            change={stats.successRate?.change || 0}
            icon={Target}
            isPercentage={true}
          />
        </div>

        {/* Banking Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Number of Banks"
            value={stats.numberOfBanks?.value || 0}
            change={stats.numberOfBanks?.change || 0}
            icon={Building2}
            className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200"
          />
          <StatCard
            title="Number of Cards"
            value={stats.numberOfCards?.value || 0}
            change={stats.numberOfCards?.change || 0}
            icon={CreditCard}
            className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200"
          />
          <StatCard
            title="Ready for Funding"
            value={stats.readyForFunding?.value || 0}
            change={stats.readyForFunding?.change || 0}
            icon={CheckCircle}
            className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200"
          />
          <StatCard
            title="Not Ready for Funding"
            value={stats.notReadyForFunding?.value || 0}
            change={stats.notReadyForFunding?.change || 0}
            icon={XCircle}
            className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-emerald-600" />
                <span>Recent Activity</span>
              </CardTitle>
              <CardDescription>
                Latest funding activities and client interactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-full ${
                        activity.type === 'funding' ? 'bg-emerald-100 dark:bg-emerald-900/20' :
                        activity.type === 'payment' ? 'bg-teal-100 dark:bg-teal-900/20' :
                        'bg-blue-100 dark:bg-blue-900/20'
                      }`}>
                        {activity.type === 'funding' && <DollarSign className="h-4 w-4 text-emerald-600" />}
                        {activity.type === 'payment' && <CreditCard className="h-4 w-4 text-teal-600" />}
                        {activity.type === 'application' && <Banknote className="h-4 w-4 text-blue-600" />}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {activity.client}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {activity.type === 'funding' ? 'Funding Approved' :
                           activity.type === 'payment' ? 'Payment Received' :
                           'Application Submitted'}
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
                        className="text-xs"
                      >
                        {activity.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Button variant="outline" className="w-full">
                  View All Activity
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-emerald-600" />
                <span>Quick Actions</span>
              </CardTitle>
              <CardDescription>
                Common funding management tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
                <DollarSign className="h-4 w-4 mr-2" />
                Fund New Client
              </Button>
              <Button variant="outline" className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
              <Button variant="outline" className="w-full border-teal-200 text-teal-700 hover:bg-teal-50">
                <Calculator className="h-4 w-4 mr-2" />
                ROI Calculator
              </Button>
              <Button variant="outline" className="w-full border-green-200 text-green-700 hover:bg-green-50">
                <Users className="h-4 w-4 mr-2" />
                Client Portfolio
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Performance Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <span>Performance Overview</span>
            </CardTitle>
            <CardDescription>
              Key performance indicators and trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <div className="text-3xl font-bold text-emerald-600 mb-2">
                  ${(stats.totalFunded?.value && stats.fundedClients?.value ? 
                    (stats.totalFunded?.value / stats.fundedClients?.value) : 0).toLocaleString()}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Average Funding per Client
                </p>
              </div>
              <div className="text-center p-6 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                <div className="text-3xl font-bold text-teal-600 mb-2">
                  {Math.round((stats.fundedClients?.value && stats.pendingApplications?.value ? 
                    (stats.fundedClients?.value / (stats.fundedClients?.value + stats.pendingApplications?.value)) * 100 : 0))}%
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Approval Rate
                </p>
              </div>
              <div className="text-center p-6 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  ${Math.round(stats.portfolioValue?.value && stats.monthlyROI?.value ? 
                    (stats.portfolioValue?.value * (stats.monthlyROI?.value / 100)) : 0).toLocaleString()}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Monthly Revenue
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </FundingManagerLayout>
  );
}