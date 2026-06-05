import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/use-toast';
import { superAdminApi } from '@/lib/api';
import { Search, Filter, Download, Eye, Edit, Trash2, RefreshCw, Calendar, DollarSign, Users, TrendingUp, AlertTriangle } from 'lucide-react';

interface Subscription {
  id: number;
  user_id: number;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  plan_name: string;
  plan_type: string;
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface SubscriptionStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  expiredSubscriptions: number;
  monthlyRevenue: number;
  renewalRate: number;
  churnRate: number;
  averageLifetime: number;
}

const SubscriptionManagement: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [upcomingRenewals, setUpcomingRenewals] = useState<Subscription[]>([]);
  const [recentCancellations, setRecentCancellations] = useState<Subscription[]>([]);
  const [availableAdmins, setAvailableAdmins] = useState<string[]>([]);
  const [stats, setStats] = useState<SubscriptionStats>({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    cancelledSubscriptions: 0,
    expiredSubscriptions: 0,
    monthlyRevenue: 0,
    renewalRate: 0,
    churnRate: 0,
    averageLifetime: 0
  });
  const [loading, setLoading] = useState(true);
  const [renewalsLoading, setRenewalsLoading] = useState(false);
  const [cancellationsLoading, setCancellationsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [adminFilter, setAdminFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [renewalsPage, setRenewalsPage] = useState(1);
  const [renewalsTotalPages, setRenewalsTotalPages] = useState(1);
  const [cancellationsPage, setCancellationsPage] = useState(1);
  const [cancellationsTotalPages, setCancellationsTotalPages] = useState(1);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    status: '',
    current_period_end: '',
    cancel_at_period_end: false
  });

  useEffect(() => {
    fetchSubscriptions();
    fetchStats();
  }, [currentPage, searchTerm, statusFilter, adminFilter]);

  // Load upcoming renewals when component mounts or page changes
  useEffect(() => {
    fetchUpcomingRenewals();
  }, [renewalsPage]);

  // Load recent cancellations when component mounts or page changes
  useEffect(() => {
    fetchRecentCancellations();
  }, [cancellationsPage]);

  const fetchUpcomingRenewals = async () => {
    try {
      setRenewalsLoading(true);
      const response = await superAdminApi.getUpcomingRenewals({
        page: renewalsPage,
        limit: 10,
        days: 30 // Get renewals due in next 30 days
      });
      
      if (response.data && response.data.success) {
        const renewalsData = response.data.data || [];
        setUpcomingRenewals(renewalsData);
        
        const total = response.data.pagination?.total || renewalsData.length;
        setRenewalsTotalPages(Math.ceil(total / 10));
      }
    } catch (error) {
      console.error('Error fetching upcoming renewals:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch upcoming renewals',
        variant: 'destructive'
      });
    } finally {
      setRenewalsLoading(false);
    }
  };

  const fetchRecentCancellations = async () => {
    try {
      setCancellationsLoading(true);
      const response = await superAdminApi.getRecentCancellations({
        page: cancellationsPage,
        limit: 10,
        days: 30 // Get cancellations from last 30 days
      });
      
      if (response.data && response.data.success) {
        const cancellationsData = response.data.data || [];
        setRecentCancellations(cancellationsData);
        
        const total = response.data.pagination?.total || cancellationsData.length;
        setCancellationsTotalPages(Math.ceil(total / 10));
      }
    } catch (error) {
      console.error('Error fetching recent cancellations:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch recent cancellations',
        variant: 'destructive'
      });
    } finally {
      setCancellationsLoading(false);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await superAdminApi.getSubscriptions({
        page: currentPage,
        limit: 10,
        search: searchTerm,
        status: statusFilter === 'all' ? undefined : statusFilter,
        admin: adminFilter === 'all' ? undefined : adminFilter
      });
      
      if (response.data && response.data.success) {
        // The API returns data with nested data array
        const subscriptionsData = response.data.data || [];
        setSubscriptions(subscriptionsData);
        
        // Get total from pagination data
        const total = response.data.pagination?.total || subscriptionsData.length;
        setTotalPages(Math.ceil(total / 10));
        
        // Extract unique admin names for filter dropdown
        const adminNames = [...new Set(
          subscriptionsData
            .map((sub: any) => `${sub.first_name} ${sub.last_name}`.trim())
            .filter((name: string) => name)
        )];
        setAvailableAdmins(adminNames);
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch subscriptions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await superAdminApi.getSubscriptionAnalytics();
      if (response.data && response.data.success && response.data.data) {
        const statsData = response.data.data;
        setStats({
          totalSubscriptions: statsData.totalSubscriptions || 0,
          activeSubscriptions: statsData.activeSubscriptions || 0,
          cancelledSubscriptions: statsData.cancelledSubscriptions || 0,
          expiredSubscriptions: statsData.expiredSubscriptions || 0,
          monthlyRevenue: parseFloat(statsData.monthlyRevenue) || 0,
          renewalRate: statsData.renewalRate || 0,
          churnRate: statsData.churnRate || 0,
          averageLifetime: statsData.averageLifetime || 0
        });
      }
    } catch (error) {
      console.error('Error fetching subscription stats:', error);
    }
  };

  const handleViewSubscription = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setIsViewDialogOpen(true);
  };

  const handleEditSubscription = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setEditForm({
      status: subscription.status,
      current_period_end: subscription.current_period_end.split('T')[0],
      cancel_at_period_end: subscription.cancel_at_period_end
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateSubscription = async () => {
    if (!selectedSubscription) return;

    try {
      const response = await superAdminApi.updateSubscription(selectedSubscription.id, {
        status: editForm.status as any,
        current_period_end: editForm.current_period_end,
        cancel_at_period_end: editForm.cancel_at_period_end
      });

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Subscription updated successfully'
        });
        setIsEditDialogOpen(false);
        fetchSubscriptions();
        fetchStats();
        // Refresh the renewals and cancellations data as well
        fetchUpcomingRenewals();
        fetchRecentCancellations();
      } else {
        throw new Error(response.message || 'Failed to update subscription');
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to update subscription',
        variant: 'destructive'
      });
    }
  };

  const handleCancelSubscription = async (subscriptionId: number) => {
    try {
      const response = await superAdminApi.cancelSubscription(subscriptionId);
      
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Subscription cancelled successfully'
        });
        fetchSubscriptions();
        fetchStats();
        // Refresh the renewals and cancellations data as well
        fetchUpcomingRenewals();
        fetchRecentCancellations();
      } else {
        throw new Error(response.message || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel subscription',
        variant: 'destructive'
      });
    }
  };

  const handleRenewSubscription = async (subscriptionId: number) => {
    try {
      // Calculate new expiration date (30 days from now)
      const newExpirationDate = new Date();
      newExpirationDate.setDate(newExpirationDate.getDate() + 30);
      const expires_at = newExpirationDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      
      const response = await superAdminApi.renewSubscription(subscriptionId, expires_at);
      
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Subscription renewed successfully'
        });
        fetchSubscriptions();
        fetchStats();
        // Refresh the renewals and cancellations data as well
        fetchUpcomingRenewals();
        fetchRecentCancellations();
      } else {
        throw new Error(response.message || 'Failed to renew subscription');
      }
    } catch (error) {
      console.error('Error renewing subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to renew subscription',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default' as const, color: 'bg-green-500' },
      cancelled: { variant: 'secondary' as const, color: 'bg-red-500' },
      expired: { variant: 'outline' as const, color: 'bg-gray-500' },
      pending: { variant: 'outline' as const, color: 'bg-yellow-500' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Badge variant={config.variant} className={`${config.color} text-white`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeSubscriptions} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              From active subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Renewal Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.renewalRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Churn rate: {stats.churnRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Lifetime</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageLifetime} days</div>
            <p className="text-xs text-muted-foreground">
              Customer lifetime value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Management</CardTitle>
          <CardDescription>
            Monitor and manage all user subscriptions, renewals, and cancellations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="subscriptions" className="space-y-4">
            <TabsList>
              <TabsTrigger value="subscriptions">All Subscriptions</TabsTrigger>
              <TabsTrigger value="renewals">Upcoming Renewals</TabsTrigger>
              <TabsTrigger value="cancellations">Recent Cancellations</TabsTrigger>
            </TabsList>

            <TabsContent value="subscriptions" className="space-y-4">
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by user name, email, or plan..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={adminFilter} onValueChange={setAdminFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Users className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter by admin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Admins</SelectItem>
                    {availableAdmins.map((adminName) => (
                      <SelectItem key={adminName} value={adminName}>
                        {adminName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>

              {/* Subscriptions Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Plan Type</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Auto Renew</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-4">
                          Loading subscriptions...
                        </TableCell>
                      </TableRow>
                    ) : subscriptions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-4">
                          No subscriptions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      subscriptions.map((subscription) => (
                        <TableRow key={subscription.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{`${subscription.first_name} ${subscription.last_name}`.trim() || 'N/A'}</div>
                              <div className="text-sm text-muted-foreground">{subscription.email || 'N/A'}</div>
                            </div>
                          </TableCell>
                          <TableCell>{subscription.plan_name || 'N/A'}</TableCell>
                          <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                          <TableCell>{subscription.plan_type || 'N/A'}</TableCell>
                          <TableCell>{formatDate(subscription.current_period_start)}</TableCell>
                          <TableCell>{formatDate(subscription.current_period_end)}</TableCell>
                          <TableCell>
                            <Badge variant={!subscription.cancel_at_period_end ? 'default' : 'secondary'}>
                              {!subscription.cancel_at_period_end ? 'Yes' : 'No'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewSubscription(subscription)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditSubscription(subscription)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {subscription.status === 'active' && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to cancel this subscription? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleCancelSubscription(subscription.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Cancel Subscription
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                              {(subscription.status === 'expired' || subscription.status === 'cancelled') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRenewSubscription(subscription.id)}
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="renewals" className="space-y-4">
              {/* Upcoming Renewals Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Current Status</TableHead>
                      <TableHead>Renewal Date</TableHead>
                      <TableHead>Days Until Renewal</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renewalsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4">
                          Loading upcoming renewals...
                        </TableCell>
                      </TableRow>
                    ) : upcomingRenewals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4">
                          No upcoming renewals found
                        </TableCell>
                      </TableRow>
                    ) : (
                      upcomingRenewals.map((subscription) => {
                        const renewalDate = new Date(subscription.current_period_end);
                        const today = new Date();
                        const daysUntilRenewal = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        
                        return (
                          <TableRow key={subscription.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{`${subscription.first_name} ${subscription.last_name}`.trim() || 'N/A'}</div>
                                <div className="text-sm text-muted-foreground">{subscription.email || 'N/A'}</div>
                              </div>
                            </TableCell>
                            <TableCell>{subscription.plan_name || 'N/A'}</TableCell>
                            <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                            <TableCell>{formatDate(subscription.current_period_end)}</TableCell>
                            <TableCell>
                              <Badge variant={daysUntilRenewal <= 7 ? 'destructive' : daysUntilRenewal <= 14 ? 'secondary' : 'default'}>
                                {daysUntilRenewal} days
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewSubscription(subscription)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditSubscription(subscription)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Renewals Pagination */}
              {renewalsTotalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Page {renewalsPage} of {renewalsTotalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRenewalsPage(prev => Math.max(1, prev - 1))}
                      disabled={renewalsPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRenewalsPage(prev => Math.min(renewalsTotalPages, prev + 1))}
                      disabled={renewalsPage === renewalsTotalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="cancellations" className="space-y-4">
              {/* Recent Cancellations Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cancellation Date</TableHead>
                      <TableHead>Days Since Cancelled</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cancellationsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4">
                          Loading recent cancellations...
                        </TableCell>
                      </TableRow>
                    ) : recentCancellations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4">
                          No recent cancellations found
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentCancellations.map((subscription) => {
                        const cancellationDate = new Date(subscription.updated_at);
                        const today = new Date();
                        const daysSinceCancelled = Math.floor((today.getTime() - cancellationDate.getTime()) / (1000 * 60 * 60 * 24));
                        
                        return (
                          <TableRow key={subscription.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{`${subscription.first_name} ${subscription.last_name}`.trim() || 'N/A'}</div>
                                <div className="text-sm text-muted-foreground">{subscription.email || 'N/A'}</div>
                              </div>
                            </TableCell>
                            <TableCell>{subscription.plan_name || 'N/A'}</TableCell>
                            <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                            <TableCell>{formatDate(subscription.updated_at)}</TableCell>
                            <TableCell>
                              <Badge variant={daysSinceCancelled <= 7 ? 'destructive' : daysSinceCancelled <= 14 ? 'secondary' : 'default'}>
                                {daysSinceCancelled} days ago
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewSubscription(subscription)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRenewSubscription(subscription.id)}
                                  title="Reactivate subscription"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Cancellations Pagination */}
              {cancellationsTotalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Page {cancellationsPage} of {cancellationsTotalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCancellationsPage(prev => Math.max(1, prev - 1))}
                      disabled={cancellationsPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCancellationsPage(prev => Math.min(cancellationsTotalPages, prev + 1))}
                      disabled={cancellationsPage === cancellationsTotalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* View Subscription Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Subscription Details</DialogTitle>
            <DialogDescription>
              View detailed information about this subscription
            </DialogDescription>
          </DialogHeader>
          {selectedSubscription && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">User</Label>
                <p className="text-sm">{`${selectedSubscription.first_name} ${selectedSubscription.last_name}`.trim() || 'N/A'}</p>
                <p className="text-xs text-muted-foreground">{selectedSubscription.email || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Plan</Label>
                <p className="text-sm">{selectedSubscription.plan_name || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <div className="mt-1">{getStatusBadge(selectedSubscription.status)}</div>
              </div>
              <div>
                <Label className="text-sm font-medium">Plan Type</Label>
                <p className="text-sm">{selectedSubscription.plan_type || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Start Date</Label>
                <p className="text-sm">{formatDate(selectedSubscription.current_period_start)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">End Date</Label>
                <p className="text-sm">{formatDate(selectedSubscription.current_period_end)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Stripe Customer ID</Label>
                <p className="text-sm">{selectedSubscription.stripe_customer_id || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Auto Renew</Label>
                <Badge variant={!selectedSubscription.cancel_at_period_end ? 'default' : 'secondary'}>
                  {!selectedSubscription.cancel_at_period_end ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium">Created</Label>
                <p className="text-sm">{formatDate(selectedSubscription.created_at)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Last Updated</Label>
                <p className="text-sm">{formatDate(selectedSubscription.updated_at)}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Subscription Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>
              Update subscription details and settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={editForm.status} onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="current_period_end">End Date</Label>
              <Input
                id="current_period_end"
                type="date"
                value={editForm.current_period_end}
                onChange={(e) => setEditForm(prev => ({ ...prev, current_period_end: e.target.value }))}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="cancel_at_period_end"
                checked={!editForm.cancel_at_period_end}
                onChange={(e) => setEditForm(prev => ({ ...prev, cancel_at_period_end: !e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="cancel_at_period_end">Enable Auto Renewal</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSubscription}>
              Update Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionManagement;