import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AffiliateLayout from "@/components/AffiliateLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Download,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  PieChart,
  Filter,
  Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAuthToken, affiliateApi } from "@/lib/api";

interface EarningsStats {
  totalEarnings: number;
  monthlyEarnings: number;
  yearlyEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  avgMonthlyEarnings: number;
  growthRate: number;
  nextPaymentDate: string;
  nextPaymentAmount: number;
}

interface PaymentHistory {
  id: string;
  amount: number;
  status: "paid" | "pending" | "processing" | "failed";
  paymentDate: string;
  paymentMethod: string;
  transactionId?: string;
  period: string;
  commissions: number;
  bonuses: number;
}

interface EarningsBreakdown {
  commissions: number;
  bonuses: number;
  recurringCommissions: number;
  oneTimeCommissions: number;
  tierBonuses: number;
}

interface MonthlyEarnings {
  month: string;
  earnings: number;
  commissions: number;
  referrals: number;
}

export default function AffiliateEarnings() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState<EarningsStats>({
    totalEarnings: 0,
    monthlyEarnings: 0,
    yearlyEarnings: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
    avgMonthlyEarnings: 0,
    growthRate: 0,
    nextPaymentDate: "",
    nextPaymentAmount: 0,
  });
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [earningsBreakdown, setEarningsBreakdown] = useState<EarningsBreakdown>({
    commissions: 0,
    bonuses: 0,
    recurringCommissions: 0,
    oneTimeCommissions: 0,
    tierBonuses: 0,
  });
  const [monthlyEarnings, setMonthlyEarnings] = useState<MonthlyEarnings[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");

  useEffect(() => {
    // Check authentication on component mount
    const token = getAuthToken();
    if (!token) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to access earnings data.',
        variant: 'destructive'
      });
      navigate('/affiliate/login');
      return;
    }
    fetchEarningsData();
  }, [navigate, toast]);

  const fetchEarningsData = async () => {
    try {
      setLoading(true);
      
      // Check authentication before making API calls
      const token = getAuthToken();
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to access earnings data.",
          variant: "destructive",
        });
        navigate("/affiliate/login");
        return;
      }
      
      // Fetch earnings stats (using same endpoint as dashboard for consistency)
      const statsResponse = await affiliateApi.getStats();
      if (statsResponse.data && statsResponse.data.success) {
        // Map dashboard stats to earnings stats format
        const dashboardData = statsResponse.data.data;
        setStats({
          totalEarnings: dashboardData.totalEarnings || 0,
          monthlyEarnings: dashboardData.monthlyEarnings || 0,
          yearlyEarnings: dashboardData.yearlyEarnings || 0, // Use actual yearly earnings from backend
          pendingEarnings: dashboardData.pendingCommissions || 0, // This is now count of pending signups
          paidEarnings: (dashboardData.totalEarnings || 0) - (dashboardData.potentialCommissions || 0), // Total minus potential
          avgMonthlyEarnings: dashboardData.monthlyEarnings || 0, // Use monthly earnings as average
          growthRate: 0, // This would need to be calculated
          nextPaymentDate: dashboardData.nextPayment?.date || "",
          nextPaymentAmount: dashboardData.potentialCommissions || 0, // Use potential commissions amount
        });
      }

      // Fetch payment history
      const paymentsResponse = await affiliateApi.getPaymentHistory();
      if (paymentsResponse.data && Array.isArray(paymentsResponse.data)) {
        setPaymentHistory(paymentsResponse.data);
      }

      // Fetch earnings breakdown
      const breakdownResponse = await affiliateApi.getEarningsBreakdown();
      if (breakdownResponse.data) {
        setEarningsBreakdown(breakdownResponse.data);
      }

      // Fetch monthly earnings
      const monthlyResponse = await affiliateApi.getMonthlyEarnings();
      if (monthlyResponse.data && Array.isArray(monthlyResponse.data)) {
        setMonthlyEarnings(monthlyResponse.data);
      }
    } catch (error) {
      console.error('Error fetching earnings data:', error);
      
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
        description: `Error fetching earnings data: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "processing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "processing":
        return <TrendingUp className="h-4 w-4" />;
      case "failed":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const filteredPayments = paymentHistory.filter((payment) => {
    const matchesSearch = payment.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.transactionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.period.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    const matchesPeriod = periodFilter === "all" || payment.period.includes(periodFilter);
    return matchesSearch && matchesStatus && matchesPeriod;
  });

  const exportEarnings = () => {
    const csvContent = [
      ['Payment ID', 'Amount', 'Status', 'Payment Date', 'Method', 'Period', 'Commissions', 'Bonuses'].join(','),
      ...filteredPayments.map(payment => [
        payment.id,
        payment.amount,
        payment.status,
        payment.paymentDate,
        payment.paymentMethod,
        payment.period,
        payment.commissions,
        payment.bonuses
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'affiliate-earnings.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <AffiliateLayout
      title="Earnings & Payments"
      description="Track your earnings and payment history"
    >
      <div className="space-y-6">
        {/* Earnings Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {loading ? '...' : `$${(stats?.totalEarnings || 0).toLocaleString()}`}
              </div>
              <p className="text-xs text-muted-foreground">
                All time earnings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {loading ? '...' : `$${(stats?.monthlyEarnings || 0).toLocaleString()}`}
              </div>
              <p className="text-xs text-muted-foreground">
                {loading ? '...' : `${(stats?.growthRate || 0) > 0 ? '+' : ''}${(stats?.growthRate || 0).toFixed(1)}%`} from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {loading ? '...' : `$${(stats?.pendingEarnings || 0).toLocaleString()}`}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting payment
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Payment</CardTitle>
              <CreditCard className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {loading ? '...' : `$${(stats?.nextPaymentAmount || 0).toLocaleString()}`}
              </div>
              <p className="text-xs text-muted-foreground">
                {loading ? '...' : stats?.nextPaymentDate || 'TBD'}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="payments">Payment History</TabsTrigger>
            <TabsTrigger value="breakdown">Earnings Breakdown</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Earnings Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Earnings Summary</CardTitle>
                  <CardDescription>
                    Your earnings performance overview
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Yearly Earnings</span>
                    <span className="text-lg font-bold text-green-600">
                      ${loading ? '...' : (stats?.yearlyEarnings || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Average Monthly</span>
                    <span className="text-lg font-bold">
                      ${loading ? '...' : (stats?.avgMonthlyEarnings || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Paid Out</span>
                    <span className="text-lg font-bold text-blue-600">
                      ${loading ? '...' : (stats?.paidEarnings || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="pt-4">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-600 to-teal-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: loading ? '0%' : `${Math.min(((stats?.paidEarnings || 0) / (stats?.totalEarnings || 1)) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {loading ? '...' : `${(((stats?.paidEarnings || 0) / (stats?.totalEarnings || 1)) * 100).toFixed(1)}%`} of earnings paid out
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Payments */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Payments</CardTitle>
                  <CardDescription>
                    Your latest payment transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="space-y-2">
                            <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
                            <div className="w-16 h-3 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                          <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      ))
                    ) : paymentHistory.slice(0, 3).length === 0 ? (
                      <div className="text-center py-8">
                        <CreditCard className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">No payments yet</p>
                      </div>
                    ) : (
                      paymentHistory.slice(0, 3).map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(payment.status)}
                            <div>
                              <div className="font-medium">${(payment?.amount || 0).toLocaleString()}</div>
                              <div className="text-sm text-muted-foreground">{payment.paymentDate}</div>
                            </div>
                          </div>
                          <Badge className={getStatusColor(payment.status)}>
                            {payment.status}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                  <div>
                    <CardTitle>Payment History</CardTitle>
                    <CardDescription>
                      Complete history of your affiliate payments
                    </CardDescription>
                  </div>
                  <Button onClick={exportEarnings} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search payments..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={periodFilter} onValueChange={setPeriodFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Periods</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2023">2023</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Payments Table */}
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment ID</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={7}>
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                                <div className="space-y-2">
                                  <div className="w-32 h-4 bg-gray-200 rounded animate-pulse"></div>
                                  <div className="w-24 h-3 bg-gray-200 rounded animate-pulse"></div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : filteredPayments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <div className="flex flex-col items-center space-y-2">
                              <CreditCard className="h-8 w-8 text-gray-400" />
                              <p className="text-gray-500">No payments found</p>
                              <p className="text-sm text-gray-400">
                                {searchTerm || statusFilter !== "all" || periodFilter !== "all"
                                  ? "Try adjusting your filters"
                                  : "Payments will appear here once processed"}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPayments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{payment.id}</div>
                                {payment.transactionId && (
                                  <div className="text-sm text-muted-foreground">
                                    Txn: {payment.transactionId}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium text-green-600">
                                ${(payment?.amount || 0).toLocaleString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(payment.status)}>
                                {payment.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{payment.paymentDate}</TableCell>
                            <TableCell>{payment.paymentMethod}</TableCell>
                            <TableCell>{payment.period}</TableCell>
                            <TableCell>
                              <div className="text-sm space-y-1">
                                <div>Commissions: ${(payment?.commissions || 0).toLocaleString()}</div>
                                <div>Bonuses: ${(payment?.bonuses || 0).toLocaleString()}</div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="breakdown" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Earnings Breakdown</CardTitle>
                  <CardDescription>
                    Detailed breakdown of your earnings sources
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Commissions</span>
                      <span className="font-bold text-green-600">
                        ${loading ? '...' : (earningsBreakdown?.commissions || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Bonuses</span>
                      <span className="font-bold text-blue-600">
                        ${loading ? '...' : (earningsBreakdown?.bonuses || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Recurring Commissions</span>
                      <span className="font-bold text-purple-600">
                        ${loading ? '...' : (earningsBreakdown?.recurringCommissions || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">One-time Commissions</span>
                      <span className="font-bold text-orange-600">
                        ${loading ? '...' : (earningsBreakdown?.oneTimeCommissions || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Tier Bonuses</span>
                      <span className="font-bold text-teal-600">
                        ${loading ? '...' : (earningsBreakdown?.tierBonuses || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Earnings Distribution</CardTitle>
                  <CardDescription>
                    Visual representation of your earnings sources
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/10 dark:to-teal-900/10 rounded-lg flex items-center justify-center border">
                    <div className="text-center">
                      <PieChart className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Earnings distribution chart
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Interactive pie chart showing earnings breakdown
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Earnings Trends</CardTitle>
                <CardDescription>
                  Monthly earnings performance and trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    earnings: {
                      label: "Earnings",
                      color: "hsl(var(--chart-1))",
                    },
                    commissions: {
                      label: "Commissions",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                  className="h-64 w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyEarnings}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="month" 
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString('en-US', { month: 'short' });
                        }}
                      />
                      <YAxis 
                        tickFormatter={(value) => `$${value}`}
                      />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        formatter={(value, name) => [`$${value}`, name]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="earnings" 
                        stroke="var(--color-earnings)" 
                        strokeWidth={2}
                        dot={{ fill: "var(--color-earnings)" }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="commissions" 
                        stroke="var(--color-commissions)" 
                        strokeWidth={2}
                        dot={{ fill: "var(--color-commissions)" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AffiliateLayout>
  );
}