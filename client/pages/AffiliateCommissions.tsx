import { useState, useEffect } from "react";
import AffiliateLayout from "@/components/AffiliateLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, Search, Filter, DollarSign, Clock, CheckCircle, XCircle, AlertCircle, TrendingUp, Users, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { affiliateApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, subDays, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

interface Commission {
  id: string;
  referralId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  orderValue: number;
  commissionRate: number;
  commissionAmount: number;
  status: "pending" | "approved" | "paid" | "rejected";
  tier: string;
  product: string;
  orderDate: string;
  approvalDate?: string;
  paymentDate?: string;
  notes?: string;
  trackingCode?: string;
}

interface CommissionStats {
  totalCommissions: number;
  pendingCommissions: number;
  approvedCommissions: number;
  paidCommissions: number;
  rejectedCommissions: number;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  avgCommissionRate: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
}

interface CommissionTier {
  name: string;
  minReferrals: number;
  commissionRate: number;
  bonuses: string[];
}

export default function AffiliateCommissions() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [stats, setStats] = useState<CommissionStats | null>(null);
  const [tiers, setTiers] = useState<CommissionTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  // Get paid referrals count from stats (this tracks actual paid commissions)
  const paidReferrals = stats?.paidCommissions || 0; // Use real data, default to 0

  // Calculate tier progress based on paid referrals
  const calculateTierProgress = (paidReferrals: number) => {
    if (paidReferrals < 100) {
      // Bronze to Silver progression
      return {
        currentTier: "Bronze",
        nextTier: "Silver", 
        progress: (paidReferrals / 100) * 100,
        referralsNeeded: 100 - paidReferrals,
        currentRate: 10,
        nextRate: 15
      };
    } else {
      // Silver tier reached
      return {
        currentTier: "Silver",
        nextTier: "Gold (Pro Plan Required)",
        progress: 100,
        referralsNeeded: 0,
        currentRate: 15,
        nextRate: 20
      };
    }
  };

  const tierProgress = calculateTierProgress(paidReferrals);

  useEffect(() => {
    fetchCommissions();
    fetchStats();
    fetchTiers();
  }, [dateRange]);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateRange?.from) params.append('from', dateRange.from.toISOString());
      if (dateRange?.to) params.append('to', dateRange.to.toISOString());
      
      const response = await affiliateApi.getCommissions({ 
        from: dateRange?.from?.toISOString(),
        to: dateRange?.to?.toISOString()
      });
      
      if (response.data && response.data.success && response.data.data) {
        setCommissions(response.data.data);
      } else {
        // Fallback to demo data
        setCommissions([
          {
            id: "comm_1",
            referralId: "ref_001",
            customerId: "cust_123",
            customerName: "John Smith",
            customerEmail: "john.smith@email.com",
            orderValue: 299.99,
            commissionRate: 25,
            commissionAmount: 74.98,
            status: "paid",
            tier: "Gold",
            product: "Premium Funding",
            orderDate: "2024-01-15T10:30:00Z",
            approvalDate: "2024-01-16T14:20:00Z",
            paymentDate: "2024-01-20T09:15:00Z",
            trackingCode: "SOCIAL_JAN2024"
          },
          {
            id: "comm_2",
            referralId: "ref_002",
            customerId: "cust_124",
            customerName: "Sarah Johnson",
            customerEmail: "sarah.j@email.com",
            orderValue: 199.99,
            commissionRate: 20,
            commissionAmount: 40.00,
            status: "approved",
            tier: "Silver",
            product: "Basic Funding",
            orderDate: "2024-01-18T16:45:00Z",
            approvalDate: "2024-01-19T11:30:00Z",
            trackingCode: "EMAIL_WEEKLY"
          },
          {
            id: "comm_3",
            referralId: "ref_003",
            customerId: "cust_125",
            customerName: "Mike Davis",
            customerEmail: "mike.davis@email.com",
            orderValue: 399.99,
            commissionRate: 30,
            commissionAmount: 120.00,
            status: "pending",
            tier: "Platinum",
            product: "Enterprise Funding",
            orderDate: "2024-01-20T13:20:00Z",
            trackingCode: "BLOG_CTA_2024"
          },
          {
            id: "comm_4",
            referralId: "ref_004",
            customerId: "cust_126",
            customerName: "Lisa Wilson",
            customerEmail: "lisa.w@email.com",
            orderValue: 149.99,
            commissionRate: 15,
            commissionAmount: 22.50,
            status: "rejected",
            tier: "Bronze",
            product: "Consultation Package",
            orderDate: "2024-01-12T08:15:00Z",
            notes: "Customer requested refund within 24 hours",
            trackingCode: "YOUTUBE_VID1"
          },
          {
            id: "comm_5",
            referralId: "ref_005",
            customerId: "cust_127",
            customerName: "Robert Brown",
            customerEmail: "robert.b@email.com",
            orderValue: 299.99,
            commissionRate: 25,
            commissionAmount: 74.98,
            status: "pending",
            tier: "Gold",
            product: "Premium Funding",
            orderDate: "2024-01-22T11:45:00Z",
            trackingCode: "SOCIAL_JAN2024"
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching commissions:', error);
      toast({
        title: "Error",
        description: "Failed to load commissions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await affiliateApi.getStats();
      
      if (response.data && response.data.success && response.data.data) {
        setStats(response.data.data);
      } else {
        // Calculate stats from demo data
        const totalEarnings = commissions.reduce((sum, comm) => sum + comm.commissionAmount, 0);
        const paidEarnings = commissions.filter(c => c.status === 'paid').reduce((sum, comm) => sum + comm.commissionAmount, 0);
        const pendingEarnings = commissions.filter(c => c.status === 'pending' || c.status === 'approved').reduce((sum, comm) => sum + comm.commissionAmount, 0);
        
        setStats({
          totalCommissions: commissions.length || 5,
          pendingCommissions: commissions.filter(c => c.status === 'pending').length || 2,
          approvedCommissions: commissions.filter(c => c.status === 'approved').length || 1,
          paidCommissions: commissions.filter(c => c.status === 'paid').length || 1,
          rejectedCommissions: commissions.filter(c => c.status === 'rejected').length || 1,
          totalEarnings: totalEarnings || 332.46,
          pendingEarnings: pendingEarnings || 234.98,
          paidEarnings: paidEarnings || 74.98,
          avgCommissionRate: 23,
          thisMonthEarnings: totalEarnings || 332.46,
          lastMonthEarnings: 245.67
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchTiers = async () => {
    try {
      const response = await affiliateApi.getTiers();
      
      if (response.data && response.data.success && response.data.data) {
        setTiers(response.data.data);
      } else {
        // Updated tier structure with Bronze, Silver, Gold, and Platinum
        setTiers([
          {
            name: "Bronze",
            minReferrals: 0,
            commissionRate: 10,
            bonuses: [
              "Free tier",
              "10% commission until 100 referrals",
              "Basic marketing materials",
              "Monthly payment schedule",
              "Email support"
            ]
          },
          {
            name: "Silver", 
            minReferrals: 100,
            commissionRate: 15,
            bonuses: [
              "Free tier",
              "15% commission for 100+ referrals",
              "Enhanced marketing materials",
              "Bi-weekly payment schedule",
              "Priority email support"
            ]
          },
          {
            name: "Gold",
            minReferrals: 0,
            commissionRate: 20,
            bonuses: [
              "Pro Plan Required",
              "20% commission until 100 referrals",
              "Premium marketing materials",
              "Weekly payment schedule",
              "Priority support",
              "Custom tracking links"
            ]
          },
          {
            name: "Platinum",
            minReferrals: 100,
            commissionRate: 25,
            bonuses: [
              "Pro Plan Required",
              "25% commission for 100+ referrals",
              "Exclusive marketing materials",
              "Real-time payment processing",
              "Dedicated account manager",
              "Advanced analytics dashboard",
              "Custom landing pages"
            ]
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching tiers:', error);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (dateRange?.from) params.append('from', dateRange.from.toISOString());
      if (dateRange?.to) params.append('to', dateRange.to.toISOString());
      
      const response = await apiRequest(`/affiliate/dashboard/commissions/export?${params}`);
      
      if (response.data && response.data.success && response.data.data) {
        // Create and download CSV
        const csvContent = response.data.data;
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `commissions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Success",
          description: "Commission report exported successfully"
        });
      }
    } catch (error) {
      console.error('Error exporting commissions:', error);
      toast({
        title: "Error",
        description: "Failed to export commission report",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-800";
      case "approved": return "bg-blue-100 text-blue-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid": return <CheckCircle className="h-4 w-4" />;
      case "approved": return <CheckCircle className="h-4 w-4" />;
      case "pending": return <Clock className="h-4 w-4" />;
      case "rejected": return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "bronze": return "bg-amber-100 text-amber-800";
      case "silver": return "bg-gray-100 text-gray-800";
      case "gold": return "bg-yellow-100 text-yellow-800";
      case "platinum": return "bg-purple-100 text-purple-800";
      default: return "bg-blue-100 text-blue-800";
    }
  };

  const filteredCommissions = commissions.filter(commission => {
    const matchesSearch = commission.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         commission.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         commission.product?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (commission.trackingCode && commission.trackingCode.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || commission.status === statusFilter;
    const matchesTier = tierFilter === "all" || (commission.tier && commission.tier.toLowerCase() === tierFilter.toLowerCase());
    
    return matchesSearch && matchesStatus && matchesTier;
  });

  const tierNames = [...new Set(commissions.map(c => c.tier).filter(tier => tier))];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <AffiliateLayout>
      <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Commission Tracking</h1>
          <p className="text-gray-600 mt-1">Monitor your earnings and commission status</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[280px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="tiers">Commission Tiers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${(stats.totalEarnings || 0).toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    {(stats.thisMonthEarnings || 0) > (stats.lastMonthEarnings || 0) ? '+' : ''}
                    {(((stats.thisMonthEarnings || 0) - (stats.lastMonthEarnings || 0)) / (stats.lastMonthEarnings || 1) * 100).toFixed(1)}% from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Earnings</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${(stats.pendingEarnings || 0).toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">{stats.pendingCommissions + stats.approvedCommissions} commissions</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Paid Earnings</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${(stats.paidEarnings || 0).toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">{stats.paidCommissions} commissions</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Commission Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.avgCommissionRate}%</div>
                  <p className="text-xs text-muted-foreground">Across all tiers</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Commission Status Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Commission Status</CardTitle>
                <CardDescription>Breakdown of commission statuses</CardDescription>
              </CardHeader>
              <CardContent>
                {stats && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span>Paid</span>
                      </div>
                      <span className="font-medium">{stats.paidCommissions}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span>Approved</span>
                      </div>
                      <span className="font-medium">{stats.approvedCommissions}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span>Pending</span>
                      </div>
                      <span className="font-medium">{stats.pendingCommissions}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span>Rejected</span>
                      </div>
                      <span className="font-medium">{stats.rejectedCommissions}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest commission updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {commissions.slice(0, 5).map((commission) => (
                    <div key={commission.id} className="flex items-center space-x-3">
                      <div className={cn("p-2 rounded-full", getStatusColor(commission.status))}>
                        {getStatusIcon(commission.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{commission.customerName}</p>
                        <p className="text-xs text-gray-500">${(commission.commissionAmount || 0).toFixed(2)} • {commission.product}</p>
                      </div>
                      <div className="text-xs text-gray-400">
                        {commission.orderDate ? format(new Date(commission.orderDate), 'MMM dd') : 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="commissions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <div>
                  <CardTitle>Commission History</CardTitle>
                  <CardDescription>Track all your commission earnings and status</CardDescription>
                </div>
              </div>
              
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search commissions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={tierFilter} onValueChange={setTierFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    {tierNames.map(tier => (
                      <SelectItem key={tier} value={tier.toLowerCase()}>
                        {tier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Order Value</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCommissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="flex flex-col items-center space-y-2">
                            <DollarSign className="h-8 w-8 text-gray-400" />
                            <p className="text-gray-500">No commissions found</p>
                            <p className="text-sm text-gray-400">
                              {searchTerm || statusFilter !== "all" || tierFilter !== "all"
                                ? "Try adjusting your filters"
                                : "Start referring customers to earn commissions"}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCommissions.map((commission) => (
                        <TableRow key={commission.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{commission.customerName}</div>
                              <div className="text-sm text-gray-500">{commission.customerEmail}</div>
                            </div>
                          </TableCell>
                          <TableCell>${(commission.orderValue || 0).toFixed(2)}</TableCell>
                          <TableCell>{commission.commissionRate || 0}%</TableCell>
                          <TableCell className="font-medium">${(commission.commissionAmount || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={getTierColor(commission.tier)}>
                              {commission.tier}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(commission.status)}>
                              {commission.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {commission.orderDate ? format(new Date(commission.orderDate), 'MMM dd, yyyy') : 'N/A'}
                            </div>
                            {commission.paymentDate && (
                              <div className="text-xs text-gray-500">
                                Paid: {commission.paymentDate ? format(new Date(commission.paymentDate), 'MMM dd') : 'N/A'}
                              </div>
                            )}
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

        <TabsContent value="tiers" className="space-y-6">
          {/* Tier Progress Section */}
          <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span>Your Tier Progress</span>
              </CardTitle>
              <CardDescription>
                Track your advancement through commission tiers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg text-blue-700">
                      Current Tier: {tierProgress.currentTier}
                    </h3>
                    <p className="text-sm text-blue-600">
                      {tierProgress.currentRate}% commission rate • {paidReferrals} paid referrals
                    </p>
                  </div>
                  <Badge className="bg-blue-600 text-white">
                    {tierProgress.currentRate}%
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress to {tierProgress.nextTier}</span>
                    <span>
                      {tierProgress.referralsNeeded > 0 
                        ? `${tierProgress.referralsNeeded} more paid referrals needed`
                        : "Tier unlocked!"
                      }
                    </span>
                  </div>
                  <Progress 
                    value={tierProgress.progress} 
                    className="h-3"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{paidReferrals} paid referrals</span>
                    <span>
                      {tierProgress.referralsNeeded > 0 
                        ? `${tierProgress.nextRate}% at next tier`
                        : `Upgrade to Pro Plan for ${tierProgress.nextRate}%`
                      }
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tiers.map((tier) => (
              <Card key={tier.name} className={cn(
                "relative",
                (tier.name === "Gold" || tier.name === "Platinum") && "border-purple-200 bg-purple-50"
              )}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className={cn(
                      "text-lg",
                      (tier.name === "Gold" || tier.name === "Platinum") && "text-purple-700"
                    )}>
                      {tier.name}
                    </CardTitle>
                    <div className="flex flex-col items-end space-y-1">
                      <Badge className={getTierColor(tier.name)}>
                        {tier.commissionRate}%
                      </Badge>
                      {(tier.name === "Gold" || tier.name === "Platinum") && (
                        <Badge className="bg-purple-600 text-white text-xs">
                          Pro Plan
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription>
                    {tier.name === "Bronze" && "Free tier • 10% until 100 referrals"}
                    {tier.name === "Silver" && "Free tier • 15% for 100+ referrals"}
                    {tier.name === "Gold" && "Pro Plan • 20% until 100 referrals"}
                    {tier.name === "Platinum" && "Pro Plan • 25% for 100+ referrals"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Min Referrals: {tier.minReferrals}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Benefits:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {tier.bonuses.map((bonus, index) => (
                          <li key={index} className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                            <span>{bonus}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Commission Tier Structure</CardTitle>
              <CardDescription>Understanding our tier-based commission system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 border rounded-lg bg-blue-50">
                    <h3 className="font-semibold text-blue-800 mb-2">Free Tiers</h3>
                    <p className="text-sm text-blue-700 mb-3">No upfront cost required</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Bronze (0-99 referrals)</span>
                        <Badge className="bg-amber-100 text-amber-800">10%</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Silver (100+ referrals)</span>
                        <Badge className="bg-gray-100 text-gray-800">15%</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg bg-purple-50">
                    <h3 className="font-semibold text-purple-800 mb-2">Pro Plan Tiers</h3>
                    <p className="text-sm text-purple-700 mb-3">Requires Pro Plan subscription</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Gold (0-99 referrals)</span>
                        <Badge className="bg-yellow-100 text-yellow-800">20%</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Platinum (100+ referrals)</span>
                        <Badge className="bg-purple-100 text-purple-800">25%</Badge>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">How It Works:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Start with Bronze tier (10% commission) - completely free</li>
                    <li>• Reach 100 referrals to unlock Silver tier (15% commission)</li>
                    <li>• Upgrade to Pro Plan to access Gold tier (20% commission)</li>
                    <li>• Combine Pro Plan + 100 referrals for Platinum tier (25% commission)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </AffiliateLayout>
  );
}
