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
  Receipt,
  Percent,
  TrendingUpIcon,
  Handshake,
} from "lucide-react";

interface CommissionStats {
  totalEarnings: number;
  monthlyEarnings: number;
  pendingCommissions: number;
  commissionRate: number;
  totalClients: number;
  activeDeals: number;
  avgDealSize: number;
  conversionRate: number;
}

interface CommissionRecord {
  id: string;
  clientName: string;
  dealAmount: number;
  commissionAmount: number;
  commissionRate: number;
  status: 'paid' | 'pending' | 'processing';
  date: string;
  paymentDate?: string;
  dealType: string;
}

interface PaymentHistory {
  id: string;
  amount: number;
  date: string;
  method: string;
  status: 'completed' | 'pending' | 'failed';
  reference: string;
}

const StatCard = ({ title, value, change, icon: Icon, trend }: {
  title: string;
  value: string;
  change: string;
  icon: any;
  trend: 'up' | 'down' | 'neutral';
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <div className="flex items-center text-xs text-muted-foreground">
        {trend === 'up' && <ArrowUpRight className="mr-1 h-3 w-3 text-green-500" />}
        {trend === 'down' && <ArrowDownRight className="mr-1 h-3 w-3 text-red-500" />}
        <span className={trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : ''}>
          {change}
        </span>
      </div>
    </CardContent>
  </Card>
);

export default function FundingManagerCommissions() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CommissionStats>({
    totalEarnings: 0,
    monthlyEarnings: 0,
    pendingCommissions: 0,
    commissionRate: 0,
    totalClients: 0,
    activeDeals: 0,
    avgDealSize: 0,
    conversionRate: 0,
  });

  const [commissionRecords, setCommissionRecords] = useState<CommissionRecord[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setStats({
        totalEarnings: 125000,
        monthlyEarnings: 18500,
        pendingCommissions: 7200,
        commissionRate: 3.5,
        totalClients: 45,
        activeDeals: 12,
        avgDealSize: 85000,
        conversionRate: 68.5,
      });

      setCommissionRecords([
        {
          id: '1',
          clientName: 'Tech Innovations LLC',
          dealAmount: 150000,
          commissionAmount: 5250,
          commissionRate: 3.5,
          status: 'paid',
          date: '2024-01-15',
          paymentDate: '2024-01-20',
          dealType: 'Equipment Financing'
        },
        {
          id: '2',
          clientName: 'Green Energy Solutions',
          dealAmount: 200000,
          commissionAmount: 7000,
          commissionRate: 3.5,
          status: 'pending',
          date: '2024-01-18',
          dealType: 'Working Capital'
        },
        {
          id: '3',
          clientName: 'Metro Construction',
          dealAmount: 75000,
          commissionAmount: 2625,
          commissionRate: 3.5,
          status: 'processing',
          date: '2024-01-20',
          dealType: 'Invoice Factoring'
        },
        {
          id: '4',
          clientName: 'Digital Marketing Pro',
          dealAmount: 50000,
          commissionAmount: 1750,
          commissionRate: 3.5,
          status: 'paid',
          date: '2024-01-12',
          paymentDate: '2024-01-17',
          dealType: 'Business Line of Credit'
        },
      ]);

      setPaymentHistory([
        {
          id: '1',
          amount: 12500,
          date: '2024-01-20',
          method: 'Direct Deposit',
          status: 'completed',
          reference: 'PAY-2024-001'
        },
        {
          id: '2',
          amount: 8750,
          date: '2024-01-17',
          method: 'ACH Transfer',
          status: 'completed',
          reference: 'PAY-2024-002'
        },
        {
          id: '3',
          amount: 5200,
          date: '2024-01-15',
          method: 'Wire Transfer',
          status: 'completed',
          reference: 'PAY-2024-003'
        },
        {
          id: '4',
          amount: 7200,
          date: '2024-01-25',
          method: 'Direct Deposit',
          status: 'pending',
          reference: 'PAY-2024-004'
        },
      ]);

      setLoading(false);
    }, 1000);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <FundingManagerLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </FundingManagerLayout>
    );
  }

  return (
    <FundingManagerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Commissions</h1>
            <p className="text-muted-foreground">
              Track your earnings, commission rates, and payment history
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
            <Button>
              <Receipt className="mr-2 h-4 w-4" />
              Request Payment
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Earnings"
            value={`$${stats.totalEarnings.toLocaleString()}`}
            change="+12.5% from last month"
            icon={DollarSign}
            trend="up"
          />
          <StatCard
            title="Monthly Earnings"
            value={`$${stats.monthlyEarnings.toLocaleString()}`}
            change="+8.2% from last month"
            icon={TrendingUp}
            trend="up"
          />
          <StatCard
            title="Pending Commissions"
            value={`$${stats.pendingCommissions.toLocaleString()}`}
            change="3 deals pending"
            icon={Clock}
            trend="neutral"
          />
          <StatCard
            title="Commission Rate"
            value={`${stats.commissionRate}%`}
            change="Standard rate"
            icon={Percent}
            trend="neutral"
          />
        </div>

        {/* Performance Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Clients"
            value={stats.totalClients.toString()}
            change="+5 this month"
            icon={Users}
            trend="up"
          />
          <StatCard
            title="Active Deals"
            value={stats.activeDeals.toString()}
            change="2 closing this week"
            icon={Handshake}
            trend="up"
          />
          <StatCard
            title="Avg Deal Size"
            value={`$${stats.avgDealSize.toLocaleString()}`}
            change="+15% from last quarter"
            icon={Calculator}
            trend="up"
          />
          <StatCard
            title="Conversion Rate"
            value={`${stats.conversionRate}%`}
            change="+3.2% improvement"
            icon={Target}
            trend="up"
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="commissions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="commissions">Commission Records</TabsTrigger>
            <TabsTrigger value="payments">Payment History</TabsTrigger>
            <TabsTrigger value="analytics">Performance Analytics</TabsTrigger>
            <TabsTrigger value="structure">Commission Structure</TabsTrigger>
          </TabsList>

          <TabsContent value="commissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Commission Records</CardTitle>
                <CardDescription>
                  Track commissions from your funded deals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {commissionRecords.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <Building2 className="h-8 w-8 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{record.clientName}</p>
                          <p className="text-sm text-muted-foreground">{record.dealType}</p>
                          <p className="text-xs text-muted-foreground">Deal Date: {record.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${record.commissionAmount.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">
                          {record.commissionRate}% of ${record.dealAmount.toLocaleString()}
                        </p>
                        <div className="mt-1">
                          {getStatusBadge(record.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>
                  View your commission payment records
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paymentHistory.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <CreditCard className="h-8 w-8 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">${payment.amount.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">{payment.method}</p>
                          <p className="text-xs text-muted-foreground">Ref: {payment.reference}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">{payment.date}</p>
                        <div className="mt-1">
                          {getStatusBadge(payment.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Commission Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">January 2024</span>
                      <span className="font-medium">$18,500</span>
                    </div>
                    <Progress value={85} className="h-2" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm">December 2023</span>
                      <span className="font-medium">$16,200</span>
                    </div>
                    <Progress value={75} className="h-2" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm">November 2023</span>
                      <span className="font-medium">$14,800</span>
                    </div>
                    <Progress value={68} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Commission by Deal Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Equipment Financing</span>
                      <span className="font-medium">35%</span>
                    </div>
                    <Progress value={35} className="h-2" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Working Capital</span>
                      <span className="font-medium">28%</span>
                    </div>
                    <Progress value={28} className="h-2" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Invoice Factoring</span>
                      <span className="font-medium">22%</span>
                    </div>
                    <Progress value={22} className="h-2" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Business Line of Credit</span>
                      <span className="font-medium">15%</span>
                    </div>
                    <Progress value={15} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="structure" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Commission Structure</CardTitle>
                <CardDescription>
                  Your current commission rates and tier structure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Standard Rate</h4>
                      <p className="text-2xl font-bold text-blue-600">3.5%</p>
                      <p className="text-sm text-muted-foreground">On all funded deals</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Bonus Tier</h4>
                      <p className="text-2xl font-bold text-green-600">4.0%</p>
                      <p className="text-sm text-muted-foreground">$100K+ monthly volume</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Performance Bonuses</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span>Monthly Volume $50K+</span>
                        <Badge>+0.25% bonus</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span>Monthly Volume $100K+</span>
                        <Badge>+0.5% bonus</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span>Quarterly Volume $250K+</span>
                        <Badge>$2,500 bonus</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </FundingManagerLayout>
  );
}