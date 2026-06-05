import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../ui/tabs';
import { apiRequest, superAdminApi } from '../../lib/api';
import { stageCrossSubdomainAuthTransfer } from '../../lib/authStorage';
import { buildAliasUrl, buildReferralLandingUrl } from '../../lib/hostRouting';
import {
  Users,
  DollarSign,
  TrendingUp,
  UserPlus,
  Edit,
  Trash2,
  Eye,
  Ban,
  CheckCircle,
  AlertTriangle,
  Search,
  Filter,
  Download,
  RefreshCw,
  MoreHorizontal,
  Mail,
  Phone,
  Calendar,
  Building,
  Percent,
  Target,
  LogIn
} from 'lucide-react';
import { Copy } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { format } from 'date-fns';

interface Affiliate {
  id: number;
  admin_id: number;
  email: string;
  first_name: string;
  last_name: string;
  company_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  logo_url?: string;
  commission_rate: number;
  total_earnings: number;
  total_referrals: number;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  email_verified: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  referral_slug?: string;
  elite_landing_page?: 'allow' | 'deny';
  // Bank Details
  bank_name?: string;
  account_holder_name?: string;
  account_number?: string;
  routing_number?: string;
  account_type?: 'checking' | 'savings';
  swift_code?: string;
  iban?: string;
  bank_address?: string;
  payment_method?: 'bank_transfer' | 'paypal' | 'stripe' | 'check';
  paypal_email?: string;
  stripe_account_id?: string;
}

interface AffiliateStats {
  totalAffiliates: number;
  activeAffiliates: number;
  totalEarnings: number;
  totalReferrals: number;
  avgCommissionRate: number;
  monthlyGrowth: number;
}

interface AffiliateCommission {
  id: number;
  affiliate_id: number;
  customer_name: string;
  customer_email: string;
  order_value: number;
  commission_rate: number;
  commission_amount: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  tier: string;
  product: string;
  order_date: string;
  payment_date?: string;
  tracking_code?: string;
}

interface PaymentForm {
  affiliate_id: number;
  amount: number;
  transaction_id: string;
  payment_method: string;
  notes: string;
  proof_of_payment?: File;
}

interface CommissionPayment {
  id: number;
  affiliate_id: number;
  amount: number;
  transaction_id: string;
  payment_method: string;
  status: 'pending' | 'completed' | 'failed';
  payment_date: string;
  notes?: string;
  proof_of_payment_url?: string;
  created_at: string;
}

interface BankDetails {
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  routing_number: string;
  account_type: 'checking' | 'savings';
  swift_code?: string;
}

type AffiliateFormState = {
  email: string;
  first_name: string;
  last_name: string;
  company_name: string;
  phone: string;
  commission_rate: number;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  password: string;
  elite_landing_page: boolean;
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  routing_number: string;
  account_type: 'checking' | 'savings' | '';
  swift_code: string;
  iban: string;
  bank_address: string;
  payment_method: 'bank_transfer' | 'paypal' | 'stripe' | 'check';
  paypal_email: string;
  stripe_account_id: string;
};

const createDefaultAffiliateForm = (): AffiliateFormState => ({
  email: '',
  first_name: '',
  last_name: '',
  company_name: '',
  phone: '',
  commission_rate: 20,
  status: 'pending' as const,
  password: '',
  elite_landing_page: false,
  bank_name: '',
  account_holder_name: '',
  account_number: '',
  routing_number: '',
  account_type: 'checking' as const,
  swift_code: '',
  iban: '',
  bank_address: '',
  payment_method: 'bank_transfer' as const,
  paypal_email: '',
  stripe_account_id: ''
});

const AffiliateManagement: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [stats, setStats] = useState<AffiliateStats>({
    totalAffiliates: 0,
    activeAffiliates: 0,
    totalEarnings: 0,
    totalReferrals: 0,
    avgCommissionRate: 0,
    monthlyGrowth: 0
  });
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'affiliates' | 'commissions' | 'pay-commission'>('overview');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedAffiliateForPayment, setSelectedAffiliateForPayment] = useState<Affiliate | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    affiliate_id: 0,
    amount: 0,
    transaction_id: '',
    payment_method: 'bank_transfer',
    notes: '',
    proof_of_payment: undefined
  });

  const openAffiliateProfile = (affiliate: Affiliate) => {
    const affiliateId = Number.isFinite(Number(affiliate?.id)) ? String(affiliate.id) : '';
    if (!affiliateId) {
      toast({
        title: 'Invalid affiliate',
        description: 'This affiliate record is missing a valid ID.',
        variant: 'destructive'
      });
      return;
    }

    navigate(`/super-admin/affiliates/${affiliateId}`);
  };
  const [commissionPayments, setCommissionPayments] = useState<CommissionPayment[]>([]);
  const [isPaymentHistoryDialogOpen, setIsPaymentHistoryDialogOpen] = useState(false);
  const [selectedAffiliatePayments, setSelectedAffiliatePayments] = useState<CommissionPayment[]>([]);
  const [lastPayoutStatus, setLastPayoutStatus] = useState<Record<number, { isPaid: boolean; amount: number; commission_month: string; payout_month: string; invoice_url?: string }>>({});

  // Form state for creating/editing affiliates
  const [affiliateForm, setAffiliateForm] = useState<AffiliateFormState>(createDefaultAffiliateForm);

  useEffect(() => {
    fetchAffiliates();
    fetchCommissions();
    fetchCommissionPayments();
  }, []);

  // Calculate stats whenever affiliates data changes
  useEffect(() => {
    if (affiliates.length > 0) {
      fetchStats();
      fetchLastMonthStatuses();
    }
  }, [affiliates]);

  const fetchAffiliates = async () => {
    try {
      setLoading(true);
      const response = await superAdminApi.getAffiliates();
      // Extract the actual data array from the response
      const affiliatesData = response.data?.data || response.data || [];
      setAffiliates(affiliatesData);
    } catch (error) {
      console.error('Error fetching affiliates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load affiliates',
        variant: 'destructive'
      });
      setAffiliates([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Ensure affiliates is an array before calculating stats
      const affiliateArray = Array.isArray(affiliates) ? affiliates : [];
      
      const totalAffiliates = affiliateArray.length;
      const activeAffiliates = affiliateArray.filter(a => a.status === 'active').length;
      const totalEarnings = affiliateArray.reduce((sum, a) => sum + (a.total_earnings || 0), 0);
      const totalReferrals = affiliateArray.reduce((sum, a) => sum + (a.total_referrals || 0), 0);
      const avgCommissionRate = totalAffiliates > 0 
        ? affiliateArray.reduce((sum, a) => sum + a.commission_rate, 0) / totalAffiliates 
        : 0;
      
      const calculatedStats: AffiliateStats = {
        totalAffiliates,
        activeAffiliates,
        totalEarnings,
        totalReferrals,
        avgCommissionRate,
        monthlyGrowth: 0 // This would need historical data to calculate properly
      };
      
      setStats(calculatedStats);
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  const fetchCommissions = async () => {
    try {
      const response = await superAdminApi.getCommissionHistory();
      setCommissions(response.data || []);
    } catch (error) {
      console.error('Error fetching commissions:', error);
      setCommissions([]);
    }
  };

  const fetchLastMonthStatuses = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const entries: Record<number, { isPaid: boolean; amount: number; commission_month: string; payout_month: string; invoice_url?: string }> = {};
      const ids = Array.isArray(affiliates) ? affiliates.map(a => a.id) : [];
      await Promise.all(ids.map(async (id) => {
        try {
          const resp = await fetch(`/api/commissions/payout-status/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const json = await resp.json();
          const d = json?.data || json || null;
          if (d) {
            entries[id] = {
              isPaid: !!d.isPaid,
              amount: Number(d.amount || 0),
              commission_month: String(d.commission_month || ''),
              payout_month: String(d.payout_month || ''),
              invoice_url: d.invoice_url || undefined
            };
          }
        } catch {}
      }));
      setLastPayoutStatus(entries);
    } catch {}
  };

  const renderLastMonthPaymentBadge = (affiliateId: number) => {
    const s = lastPayoutStatus[affiliateId];
    const paid = !!s?.isPaid;
    return (
      <Badge className={paid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
        {paid ? 'Paid' : 'Unpaid'}
      </Badge>
    );
  };

  const renderLastMonthPaymentCell = (affiliateId: number) => {
    const s = lastPayoutStatus[affiliateId];
    const amountStr = `$${Number(s?.amount || 0).toFixed(2)}`;
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{amountStr}</span>
        {renderLastMonthPaymentBadge(affiliateId)}
      </div>
    );
  };

  const handleCreateAffiliate = async () => {
    try {
      await superAdminApi.createAffiliate({
        email: affiliateForm.email,
        firstName: affiliateForm.first_name,
        first_name: affiliateForm.first_name,
        lastName: affiliateForm.last_name,
        last_name: affiliateForm.last_name,
        companyName: affiliateForm.company_name,
        company_name: affiliateForm.company_name,
        phone: affiliateForm.phone,
        commissionRate: affiliateForm.commission_rate,
        commission_rate: affiliateForm.commission_rate,
        status: affiliateForm.status,
        password: affiliateForm.password,
        eliteLandingPage: affiliateForm.elite_landing_page ? 'allow' : 'deny',
        elite_landing_page: affiliateForm.elite_landing_page ? 'allow' : 'deny'
      });
      
      toast({
        title: 'Success',
        description: 'Affiliate created successfully'
      });
      
      setIsCreateDialogOpen(false);
      setAffiliateForm(createDefaultAffiliateForm());
      
      // Refresh data
      fetchAffiliates();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.error || 'Failed to create affiliate',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateAffiliate = async () => {
    if (!selectedAffiliate) return;
    
    try {
      await superAdminApi.updateAffiliate(String(selectedAffiliate.id), {
        firstName: affiliateForm.first_name,
        first_name: affiliateForm.first_name,
        lastName: affiliateForm.last_name,
        last_name: affiliateForm.last_name,
        companyName: affiliateForm.company_name,
        company_name: affiliateForm.company_name,
        phone: affiliateForm.phone,
        commissionRate: affiliateForm.commission_rate,
        commission_rate: affiliateForm.commission_rate,
        status: affiliateForm.status,
        bank_name: affiliateForm.bank_name,
        account_holder_name: affiliateForm.account_holder_name,
        account_number: affiliateForm.account_number,
        routing_number: affiliateForm.routing_number,
        account_type: affiliateForm.account_type,
        swift_code: affiliateForm.swift_code,
        iban: affiliateForm.iban,
        bank_address: affiliateForm.bank_address,
        payment_method: affiliateForm.payment_method,
        paypal_email: affiliateForm.paypal_email,
        stripe_account_id: affiliateForm.stripe_account_id,
        eliteLandingPage: affiliateForm.elite_landing_page ? 'allow' : 'deny',
        elite_landing_page: affiliateForm.elite_landing_page ? 'allow' : 'deny'
      });
      
      toast({
        title: 'Success',
        description: 'Affiliate updated successfully'
      });
      
      setIsEditDialogOpen(false);
      setSelectedAffiliate(null);
      
      // Refresh data
      fetchAffiliates();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.error || 'Failed to update affiliate',
        variant: 'destructive'
      });
    }
  };

  const handleLoginAsAffiliate = async (affiliate: Affiliate) => {
    try {
      const response = await superAdminApi.loginAsAffiliate(affiliate.id);
      if (response.data?.token) {
        const targetUrl = buildAliasUrl('affiliate', '/session-transfer');
        const targetUser = response.data.user || affiliate;
        const transferRedirectPath = '/dashboard';
        const returnLabel = 'Back To Super Admin Dashboard';
        const returnTargetUrl = buildAliasUrl('super-admin', '/affiliates');

        const encoded = stageCrossSubdomainAuthTransfer(targetUrl, {
          auth: {
            auth_token: response.data.token,
            token: response.data.token,
            refresh_token: response.data.refresh_token,
            userRole: targetUser.role || 'affiliate',
            userId: String(targetUser.id),
            userName: `${targetUser.first_name || affiliate.first_name} ${targetUser.last_name || affiliate.last_name}`.trim(),
          },
          returnContext: {
            label: returnLabel,
            targetUrl: returnTargetUrl,
          },
          transferRedirectPath,
        });

        const directParams = new URLSearchParams();
        directParams.set('__sm_direct_token', response.data.token);
        if (response.data.refresh_token) {
          directParams.set('__sm_direct_refresh', response.data.refresh_token);
        }
        directParams.set('__sm_direct_role', targetUser.role || 'affiliate');
        directParams.set('__sm_direct_user_id', String(targetUser.id));
        directParams.set(
          '__sm_direct_user_name',
          `${targetUser.first_name || affiliate.first_name} ${targetUser.last_name || affiliate.last_name}`.trim(),
        );
        directParams.set('__sm_direct_redirect', transferRedirectPath);
        directParams.set('__sm_direct_return_label', returnLabel);
        directParams.set('__sm_direct_return_target', returnTargetUrl);

        const hashParts: string[] = [];
        if (encoded) {
          hashParts.push(`${"__sm_auth_transfer__:"}${encoded}`);
        }
        if (directParams.toString()) {
          hashParts.push(directParams.toString());
        }

        const finalUrl = hashParts.length > 0
          ? `${targetUrl}#${hashParts.join('&')}`
          : targetUrl;

        window.location.href = finalUrl;
        toast({
          title: "Success",
          description: `Logged in as ${affiliate.first_name} ${affiliate.last_name}`
        });
      }
    } catch (error: any) {
      console.error('Error logging in as affiliate:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to login as affiliate",
        variant: "destructive"
      });
    }
  };

  const handleStatusChange = async (affiliateId: number, newStatus: string) => {
    try {
      await apiRequest(`/api/affiliate-management/${affiliateId}/toggle-status`, {
        method: 'POST',
        body: JSON.stringify({ status: newStatus })
      });
      
      toast({
        title: 'Success',
        description: `Affiliate status updated to ${newStatus}`
      });
      
      // Refresh data
      fetchAffiliates();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update affiliate status',
        variant: 'destructive'
      });
    }
  };

  const handlePayNow = (affiliate: Affiliate) => {
    setSelectedAffiliateForPayment(affiliate);
    setPaymentForm({
      affiliate_id: affiliate.id,
      amount: Number(affiliate.total_earnings || 0),
      transaction_id: '',
      payment_method: 'bank_transfer',
      notes: '',
      proof_of_payment: undefined
    });
    setIsPaymentDialogOpen(true);
  };

  // Generate unique transaction ID
  const generateTransactionId = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `TXN-${timestamp}-${random}`;
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('affiliate_id', paymentForm.affiliate_id.toString());
      formData.append('amount', paymentForm.amount.toString());
      formData.append('transaction_id', paymentForm.transaction_id);
      formData.append('payment_method', paymentForm.payment_method);
      formData.append('notes', paymentForm.notes);
      
      if (paymentForm.proof_of_payment) {
        formData.append('proof_of_payment', paymentForm.proof_of_payment);
      }

      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/commission-payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Commission payment recorded successfully",
        });
        setIsPaymentDialogOpen(false);
        fetchAffiliates(); // Refresh the data
        fetchLastMonthStatuses();
        
        // Refresh payment history if dialog is open
        if (isPaymentHistoryDialogOpen && selectedAffiliateForPayment) {
          handleViewPaymentHistory(selectedAffiliateForPayment);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to record commission payment",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPaymentForm(prev => ({ ...prev, proof_of_payment: file }));
    }
  };

  const fetchCommissionPayments = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/commission-payments', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCommissionPayments(data.data || data || []);
      }
    } catch (error) {
      console.error('Error fetching commission payments:', error);
    }
  };

  const handleViewPaymentHistory = async (affiliate: Affiliate) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/commission-payments/affiliate/${affiliate.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedAffiliatePayments(data.data || data || []);
        setIsPaymentHistoryDialogOpen(true);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payment history",
        variant: "destructive",
      });
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
      failed: { label: 'Failed', className: 'bg-red-100 text-red-800' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      inactive: { color: 'bg-gray-100 text-gray-800', icon: Ban },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
      suspended: { color: 'bg-red-100 text-red-800', icon: Ban }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const filteredAffiliates = Array.isArray(affiliates) ? affiliates.filter(affiliate => {
    const matchesSearch = 
      affiliate.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      affiliate.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      affiliate.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (affiliate.company_name && affiliate.company_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || affiliate.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) : [];

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Affiliates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAffiliates}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeAffiliates} active
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(stats.totalEarnings || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.monthlyGrowth}% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReferrals}</div>
            <p className="text-xs text-muted-foreground">
              Across all affiliates
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Commission Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgCommissionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Standard rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="affiliates">Affiliates</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="pay-commission">Pay Commission</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Affiliates */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Affiliates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.isArray(affiliates) ? affiliates.slice(0, 5).map((affiliate) => (
                    <div key={affiliate.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {affiliate.first_name?.charAt(0) || ''}{affiliate.last_name?.charAt(0) || ''}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {affiliate.first_name} {affiliate.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">{affiliate.email}</p>
                        </div>
                      </div>
                      {getStatusBadge(affiliate.status)}
                    </div>
                  )) : []}
                </div>
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.isArray(affiliates) ? affiliates
                    .sort((a, b) => b.total_earnings - a.total_earnings)
                    .slice(0, 5)
                    .map((affiliate) => (
                    <div key={affiliate.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {affiliate.first_name?.charAt(0) || ''}{affiliate.last_name?.charAt(0) || ''}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {affiliate.first_name} {affiliate.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {affiliate.total_referrals} referrals
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                          <p className="text-sm font-medium">${Number(affiliate.total_earnings || 0).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{affiliate.commission_rate}% rate</p>
                      </div>
                    </div>
                  )) : []}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="affiliates" className="space-y-4">
          {/* Filters and Actions */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search affiliates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchAffiliates}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Affiliate
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Affiliate</DialogTitle>
                    <DialogDescription>
                      Add a new affiliate partner to your program.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first_name">First Name</Label>
                        <Input
                          id="first_name"
                          value={affiliateForm.first_name}
                          onChange={(e) => setAffiliateForm({...affiliateForm, first_name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name">Last Name</Label>
                        <Input
                          id="last_name"
                          value={affiliateForm.last_name}
                          onChange={(e) => setAffiliateForm({...affiliateForm, last_name: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={affiliateForm.email}
                        onChange={(e) => setAffiliateForm({...affiliateForm, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company_name">Company Name (Optional)</Label>
                      <Input
                        id="company_name"
                        value={affiliateForm.company_name}
                        onChange={(e) => setAffiliateForm({...affiliateForm, company_name: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone (Optional)</Label>
                        <Input
                          id="phone"
                          value={affiliateForm.phone}
                          onChange={(e) => setAffiliateForm({...affiliateForm, phone: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="commission_rate">Commission Rate (%)</Label>
                        <Input
                          id="commission_rate"
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={affiliateForm.commission_rate}
                          onChange={(e) => setAffiliateForm({...affiliateForm, commission_rate: parseFloat(e.target.value) || 0})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={affiliateForm.password}
                        onChange={(e) => setAffiliateForm({...affiliateForm, password: e.target.value})}
                        placeholder="Set affiliate login password"
                      />
                    </div>
                    <div className="flex items-start space-x-3 rounded-lg border border-slate-200 p-4">
                      <Checkbox
                        id="elite_landing_page"
                        checked={affiliateForm.elite_landing_page}
                        onCheckedChange={(checked) => setAffiliateForm({
                          ...affiliateForm,
                          elite_landing_page: checked === true,
                        })}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="elite_landing_page" className="cursor-pointer">Allow Elite Landing page</Label>
                        <p className="text-sm text-muted-foreground">
                          When enabled, this affiliate&apos;s referral link can offer both Score Machine Pro and Score Machine Elite landing pages.
                        </p>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateAffiliate}>
                      Create Affiliate
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Affiliates Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Affiliate</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Month Payment</TableHead>
                    <TableHead>Logo URL</TableHead>
                    <TableHead>Referral Link</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                        Loading affiliates...
                      </TableCell>
                    </TableRow>
                  ) : filteredAffiliates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No affiliates found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAffiliates.map((affiliate) => (
                      <TableRow key={affiliate.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                              {affiliate.first_name.charAt(0)}{affiliate.last_name.charAt(0)}
                            </div>
                            <div>
                              <p
                                className="font-medium cursor-pointer text-blue-600 hover:text-blue-800 hover:underline"
                                onClick={() => openAffiliateProfile(affiliate)}
                              >
                                {affiliate.first_name} {affiliate.last_name}
                              </p>
                              {affiliate.company_name && (
                                <p className="text-sm text-muted-foreground flex items-center">
                                  <Building className="h-3 w-3 mr-1" />
                                  {affiliate.company_name}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {affiliate.email}
                            </p>
                            {affiliate.phone && (
                              <p className="text-sm text-muted-foreground flex items-center">
                                <Phone className="h-3 w-3 mr-1" />
                                {affiliate.phone}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">
                              ${Number(affiliate.total_earnings || 0).toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {affiliate.total_referrals} referrals
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {affiliate.commission_rate}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(affiliate.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3 mr-1" />
                            {format(new Date(affiliate.created_at), 'MMM dd, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>
                          {renderLastMonthPaymentCell(affiliate.id)}
                        </TableCell>
                        <TableCell>
                          {affiliate.logo_url ? (
                            <Input
                              value={affiliate.logo_url}
                              readOnly
                              className="font-mono text-xs bg-slate-50 dark:bg-slate-800"
                            />
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {(() => { const refPart = affiliate.referral_slug && affiliate.referral_slug.length > 0 ? affiliate.referral_slug : String(affiliate.id); const link = buildReferralLandingUrl(refPart); return (
                              <>
                                <Input
                                  value={link}
                                  readOnly
                                  className="font-mono text-xs bg-slate-50 dark:bg-slate-800"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const refPart = affiliate.referral_slug && affiliate.referral_slug.length > 0 ? affiliate.referral_slug : String(affiliate.id);
                                    const link = buildReferralLandingUrl(refPart);
                                    navigator.clipboard.writeText(link);
                                    toast({ title: 'Link Copied!', description: 'Referral link copied to clipboard' });
                                  }}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </>
                            ); })()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLoginAsAffiliate(affiliate)}
                              className="hover:bg-green-50 text-green-600 hover:text-green-700"
                              title="Login as this affiliate"
                            >
                              <LogIn className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAffiliateProfile(affiliate)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Profile
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedAffiliate(affiliate);
                                setAffiliateForm({
                                  email: affiliate.email,
                                  first_name: affiliate.first_name,
                                  last_name: affiliate.last_name,
                                  company_name: affiliate.company_name || '',
                                  phone: affiliate.phone || '',
                                  commission_rate: affiliate.commission_rate,
                                  status: affiliate.status,
                                  bank_name: affiliate.bank_name || '',
                                  account_holder_name: affiliate.account_holder_name || '',
                                  account_number: affiliate.account_number || '',
                                  routing_number: affiliate.routing_number || '',
                                  account_type: affiliate.account_type || '',
                                  swift_code: affiliate.swift_code || '',
                                  iban: affiliate.iban || '',
                                  bank_address: affiliate.bank_address || '',
                                  payment_method: affiliate.payment_method || 'bank_transfer',
                                  paypal_email: affiliate.paypal_email || '',
                                  stripe_account_id: affiliate.stripe_account_id || '',
                                  password: '',
                                  elite_landing_page: affiliate.elite_landing_page === 'allow'
                                });
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Select
                              value={affiliate.status}
                              onValueChange={(value) => handleStatusChange(affiliate.id, value)}
                            >
                              <SelectTrigger className="w-[100px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Commissions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Order Value</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(commissions) ? commissions.map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{commission.customer_name}</p>
                          <p className="text-sm text-muted-foreground">{commission.customer_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{commission.product}</p>
                          <Badge variant="outline" className="mt-1">{commission.tier}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>${Number(commission.order_value || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">${Number(commission.commission_amount || 0).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">{commission.commission_rate}% rate</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            commission.status === 'paid' ? 'bg-green-100 text-green-800' :
                            commission.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                            commission.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }
                        >
                          {commission.status.charAt(0).toUpperCase() + commission.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(commission.order_date), 'MMM dd, yyyy')}
                      </TableCell>
                    </TableRow>
                  )) : []}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pay-commission" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pay Commission</CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage commission payments for affiliates. View bank details, process payments, and track payment status.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Affiliate</TableHead>
                    <TableHead>Total Earnings</TableHead>
                    <TableHead>Pending Amount</TableHead>
                    <TableHead>Bank Details</TableHead>
                    <TableHead>Last Month Payment</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(affiliates) ? affiliates.map((affiliate) => (
                    <TableRow key={affiliate.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {affiliate.first_name?.charAt(0) || ''}{affiliate.last_name?.charAt(0) || ''}
                          </div>
                          <div>
                            <p className="font-medium">{affiliate.first_name} {affiliate.last_name}</p>
                            <p className="text-sm text-muted-foreground">{affiliate.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">${Number(affiliate.total_earnings || 0).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">{affiliate.commission_rate}% rate</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-orange-600">${Number(affiliate.total_earnings || 0).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">Unpaid</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {affiliate.bank_name || affiliate.paypal_email || affiliate.stripe_account_id ? (
                            <div>
                              {affiliate.payment_method === 'bank_transfer' && affiliate.bank_name && (
                                <div>
                                  <p className="text-sm font-medium">{affiliate.bank_name}</p>
                                  <p className="text-xs text-muted-foreground">{affiliate.account_holder_name}</p>
                                  <p className="text-xs text-muted-foreground">****{affiliate.account_number?.slice(-4)}</p>
                                </div>
                              )}
                              {affiliate.payment_method === 'paypal' && affiliate.paypal_email && (
                                <div>
                                  <p className="text-sm font-medium">PayPal</p>
                                  <p className="text-xs text-muted-foreground">{affiliate.paypal_email}</p>
                                </div>
                              )}
                              {affiliate.payment_method === 'stripe' && affiliate.stripe_account_id && (
                                <div>
                                  <p className="text-sm font-medium">Stripe</p>
                                  <p className="text-xs text-muted-foreground">Account: {affiliate.stripe_account_id}</p>
                                </div>
                              )}
                              {affiliate.payment_method === 'check' && (
                                <div>
                                  <p className="text-sm font-medium">Check Payment</p>
                                  <p className="text-xs text-muted-foreground">{affiliate.account_holder_name || 'Address on file'}</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm text-muted-foreground">Not provided</p>
                              <Button variant="link" className="p-0 h-auto text-xs">
                                Request details
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {renderLastMonthPaymentCell(affiliate.id)}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                             variant="outline" 
                             size="sm"
                             onClick={() => handleViewPaymentHistory(affiliate)}
                           >
                             <Eye className="h-4 w-4 mr-1" />
                             View Details
                           </Button>
                          <Button 
                            size="sm"
                            onClick={() => handlePayNow(affiliate)}
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Pay Now
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <p className="text-muted-foreground">No affiliates found</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Affiliate Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Affiliate</DialogTitle>
            <DialogDescription>
              Update affiliate information and settings.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_first_name">First Name</Label>
                <Input
                  id="edit_first_name"
                  value={affiliateForm.first_name}
                  onChange={(e) => setAffiliateForm({...affiliateForm, first_name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_last_name">Last Name</Label>
                <Input
                  id="edit_last_name"
                  value={affiliateForm.last_name}
                  onChange={(e) => setAffiliateForm({...affiliateForm, last_name: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_email">Email</Label>
              <Input
                id="edit_email"
                type="email"
                value={affiliateForm.email}
                onChange={(e) => setAffiliateForm({...affiliateForm, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_company_name">Company Name</Label>
              <Input
                id="edit_company_name"
                value={affiliateForm.company_name}
                onChange={(e) => setAffiliateForm({...affiliateForm, company_name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_phone">Phone</Label>
                <Input
                  id="edit_phone"
                  value={affiliateForm.phone}
                  onChange={(e) => setAffiliateForm({...affiliateForm, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_commission_rate">Commission Rate (%)</Label>
                <Input
                  id="edit_commission_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={affiliateForm.commission_rate}
                  onChange={(e) => setAffiliateForm({...affiliateForm, commission_rate: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_status">Status</Label>
              <Select
                value={affiliateForm.status}
                onValueChange={(value) => setAffiliateForm({...affiliateForm, status: value as any})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-start space-x-3 rounded-lg border border-slate-200 p-4">
              <Checkbox
                id="edit_elite_landing_page"
                checked={affiliateForm.elite_landing_page}
                onCheckedChange={(checked) => setAffiliateForm({
                  ...affiliateForm,
                  elite_landing_page: checked === true,
                })}
              />
              <div className="space-y-1">
                <Label htmlFor="edit_elite_landing_page" className="cursor-pointer">Allow Elite Landing page</Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, this affiliate&apos;s public referral link shows a chooser for Pro and Elite landing pages.
                </p>
              </div>
            </div>
            
            {/* Bank Details Section */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium text-sm text-gray-700">Bank Details</h4>
              
              <div className="space-y-2">
                <Label htmlFor="edit_payment_method">Payment Method</Label>
                <Select
                  value={affiliateForm.payment_method}
                  onValueChange={(value) => setAffiliateForm({...affiliateForm, payment_method: value as any})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {affiliateForm.payment_method === 'bank_transfer' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit_bank_name">Bank Name</Label>
                      <Input
                        id="edit_bank_name"
                        value={affiliateForm.bank_name}
                        onChange={(e) => setAffiliateForm({...affiliateForm, bank_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_account_holder_name">Account Holder Name</Label>
                      <Input
                        id="edit_account_holder_name"
                        value={affiliateForm.account_holder_name}
                        onChange={(e) => setAffiliateForm({...affiliateForm, account_holder_name: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit_account_number">Account Number</Label>
                      <Input
                        id="edit_account_number"
                        value={affiliateForm.account_number}
                        onChange={(e) => setAffiliateForm({...affiliateForm, account_number: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_routing_number">Routing Number</Label>
                      <Input
                        id="edit_routing_number"
                        value={affiliateForm.routing_number}
                        onChange={(e) => setAffiliateForm({...affiliateForm, routing_number: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit_account_type">Account Type</Label>
                    <Select
                      value={affiliateForm.account_type}
                      onValueChange={(value) => setAffiliateForm({...affiliateForm, account_type: value as any})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checking">Checking</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              
              {affiliateForm.payment_method === 'paypal' && (
                <div className="space-y-2">
                  <Label htmlFor="edit_paypal_email">PayPal Email</Label>
                  <Input
                    id="edit_paypal_email"
                    type="email"
                    value={affiliateForm.paypal_email}
                    onChange={(e) => setAffiliateForm({...affiliateForm, paypal_email: e.target.value})}
                  />
                </div>
              )}
              
              {affiliateForm.payment_method === 'stripe' && (
                <div className="space-y-2">
                  <Label htmlFor="edit_stripe_account_id">Stripe Account ID</Label>
                  <Input
                    id="edit_stripe_account_id"
                    value={affiliateForm.stripe_account_id}
                    onChange={(e) => setAffiliateForm({...affiliateForm, stripe_account_id: e.target.value})}
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAffiliate}>
              Update Affiliate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Commission Payment</DialogTitle>
            <DialogDescription>
              Record payment for {selectedAffiliateForPayment?.first_name} {selectedAffiliateForPayment?.last_name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="transaction_id">Transaction ID</Label>
              <div className="flex gap-2">
                <Input
                  id="transaction_id"
                  value={paymentForm.transaction_id}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, transaction_id: e.target.value }))}
                  placeholder="Enter transaction/reference ID"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPaymentForm(prev => ({ ...prev, transaction_id: generateTransactionId() }))}
                  className="whitespace-nowrap"
                >
                  Generate ID
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select
                value={paymentForm.payment_method}
                onValueChange={(value) => setPaymentForm(prev => ({ ...prev, payment_method: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="proof_of_payment">Proof of Payment (Optional)</Label>
              <Input
                id="proof_of_payment"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileUpload}
              />
              <p className="text-xs text-muted-foreground">
                Upload receipt, screenshot, or other proof of payment
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about this payment"
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Record Payment
              </Button>
            </DialogFooter>
          </form>
         </DialogContent>
       </Dialog>

       {/* Payment History Dialog */}
       <Dialog open={isPaymentHistoryDialogOpen} onOpenChange={setIsPaymentHistoryDialogOpen}>
         <DialogContent className="max-w-4xl">
           <DialogHeader>
             <DialogTitle>Payment History</DialogTitle>
             <DialogDescription>
               Commission payment history for {selectedAffiliateForPayment?.first_name} {selectedAffiliateForPayment?.last_name}
             </DialogDescription>
           </DialogHeader>
           <div className="space-y-4">
             {selectedAffiliatePayments.length === 0 ? (
               <p className="text-center text-muted-foreground py-8">
                 No payment history found for this affiliate.
               </p>
             ) : (
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>Date</TableHead>
                     <TableHead>Amount</TableHead>
                     <TableHead>Transaction ID</TableHead>
                     <TableHead>Method</TableHead>
                     <TableHead>Status</TableHead>
                     <TableHead>Notes</TableHead>
                     <TableHead>Proof</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {selectedAffiliatePayments.map((payment) => (
                     <TableRow key={payment.id}>
                       <TableCell>
                         {format(new Date(payment.payment_date), 'MMM dd, yyyy')}
                       </TableCell>
                       <TableCell className="font-medium">
                         ${Number(payment.amount).toFixed(2)}
                       </TableCell>
                       <TableCell className="font-mono text-sm">
                         {payment.transaction_id}
                       </TableCell>
                       <TableCell className="capitalize">
                         {payment.payment_method.replace('_', ' ')}
                       </TableCell>
                       <TableCell>
                         {getPaymentStatusBadge(payment.status)}
                       </TableCell>
                       <TableCell>
                         {payment.notes || '-'}
                       </TableCell>
                       <TableCell>
                         {payment.proof_of_payment_url ? (
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => window.open(payment.proof_of_payment_url, '_blank')}
                           >
                             <Eye className="h-4 w-4 mr-1" />
                             View
                           </Button>
                         ) : (
                           '-'
                         )}
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             )}
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setIsPaymentHistoryDialogOpen(false)}>
               Close
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>
   );
};

export default AffiliateManagement;
