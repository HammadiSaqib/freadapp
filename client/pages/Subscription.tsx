import BasicSubscription from "@/components/BasicSubscription";
import { hasAdminBasicPortalAccess } from "@/lib/adminPortalAccess";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { useToast } from '../hooks/use-toast';
import { billingApi, calendarApi, getAuthToken, kycApi, pricingApi, superAdminApi, contractsApi } from '../lib/api';
import DashboardLayout from '../components/DashboardLayout';
import PaymentForm from '../components/PaymentForm';
import BillingHistory from '../components/BillingHistory';
import EliteSubscription from '../components/EliteSubscription';
import KycVerificationDialog from '../components/KycVerificationDialog';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useScoreMachineEliteStatus } from '@/hooks/useScoreMachineEliteStatus';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  CreditCard,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Zap,
  Shield,
  Users,
  BarChart3,
  FileText,
  Settings,
  Crown,
  ArrowRight,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billing_cycle: 'monthly' | 'yearly';
  features: string[];
  max_users?: number | null;
  max_clients?: number | null;
  max_disputes?: number | null;
  popular?: boolean;
  description?: string;
  icon?: React.ReactNode;
}

interface UserSubscription {
  id: string;
  plan_id: string;
  plan_name: string;
  status: 'active' | 'pending' | 'expired' | 'canceled';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end?: boolean;
  billing_cycle: 'monthly' | 'yearly';
  plan: SubscriptionPlan;
}

type CancellationReason = 'affordability' | 'guidance' | 'other';
type GuidanceCancellationChoice = '' | 'join_class_now' | 'not_now' | 'still_cancel';

interface ClassTiming {
  id: number;
  title: string;
  type: 'webinar' | 'workshop' | 'office_hours' | string;
  date: string;
  time?: string;
  meeting_link?: string;
}

const SUPPORT_PHONE = '(475) 259-8768';
const SUPPORT_PHONE_LINK = 'tel:4752598768';
const CONSULTATION_ROUTE = '/contact';
const MAX_OTHER_REASON_WORDS = 30;
const CANCELLATION_REASON_LABELS: Record<CancellationReason, string> = {
  affordability: "Can't afford it right now",
  guidance: "Don't know how to use it for the business",
  other: 'Other',
};

const getWordCount = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;

const formatClassDateTime = (date: string, time?: string) => {
  const parsedDate = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  if (!time || time.trim().length === 0) {
    return parsedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  const parsedDateTime = new Date(`${date}T${time}`);
  if (Number.isNaN(parsedDateTime.getTime())) {
    return parsedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return parsedDateTime.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const normalizeClassTypeLabel = (type: string) =>
  type
    .replace(/_/g, ' ')
    .split(' ')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

// Initialize Stripe with dynamic configuration
let stripePromise: Promise<any> | null = null;

const getStripePromise = async () => {
  if (!stripePromise) {
    try {
      // Try to get Stripe config from backend first
      const response = await billingApi.getStripeConfig();
      const publishableKey = response.data?.publishableKey;
      
      if (publishableKey) {
        console.log('✅ Using Stripe publishable key from backend');
        stripePromise = loadStripe(publishableKey);
      } else {
        // Fallback to environment variable
        console.log('⚠️ Using fallback Stripe publishable key from environment');
        stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');
      }
    } catch (error: any) {
      console.error('❌ Error fetching Stripe config, using fallback:', error);
      // Fallback to environment variable
      stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');
    }
  }
  return stripePromise;
};

const SubscriptionContent: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isEliteActive } = useScoreMachineEliteStatus();
  const { userProfile, refreshProfile } = useAuthContext();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState<{
    clientSecret: string;
    amount: number;
    planName: string;
  } | null>(null);
  const [billingFilter, setBillingFilter] = useState<'monthly' | 'yearly'>('monthly');
  const [recurringConsent, setRecurringConsent] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState<CancellationReason | ''>('');
  const [otherCancellationReason, setOtherCancellationReason] = useState('');
  const [guidanceChoice, setGuidanceChoice] = useState<GuidanceCancellationChoice>('');
  const [classTimings, setClassTimings] = useState<ClassTiming[]>([]);
  const [loadingClassTimings, setLoadingClassTimings] = useState(false);
  const [kycDialogOpen, setKycDialogOpen] = useState(false);
  const [kycLoading, setKycLoading] = useState(true);
  const [kycState, setKycState] = useState<{
    kyc_required: boolean;
    kyc_status: 'not_started' | 'pending' | 'approved' | 'failed' | 'manual_review';
    admin_notes?: string | null;
    support_phone?: string;
  } | null>(null);

  // Enhanced plan data with better descriptions and icons
  const enhancedPlans: SubscriptionPlan[] = [
    {
      id: '1',
      name: 'Starter',
      price: 49,
      billing_cycle: 'monthly',
      description: 'Perfect for individuals getting started',
      icon: <Users className="h-6 w-6" />,
      max_users: 2,
      max_clients: 50,
      max_disputes: 500,
      features: [
        'Up to 10 clients',
        'Basic dispute letters',
        'Credit report analysis',
        'Email support',
        'Mobile app access'
      ]
    },
    {
      id: '2',
      name: 'Professional',
      price: 99,
      billing_cycle: 'monthly',
      popular: true,
      description: 'Ideal for growing businesses',
      icon: <TrendingUp className="h-6 w-6" />,
      max_users: 5,
      max_clients: 200,
      max_disputes: 2000,
      features: [
        'Up to 50 clients',
        'Advanced dispute letters',
        'Automated workflows',
        'Priority support',
        'Analytics dashboard',
        'Custom branding',
        'API access'
      ]
    },
    {
      id: '3',
      name: 'Enterprise',
      price: 199,
      billing_cycle: 'monthly',
      description: 'For large organizations',
      icon: <Crown className="h-6 w-6" />,
      max_users: null,
      max_clients: null,
      max_disputes: null,
      features: [
        'Unlimited clients',
        'All dispute templates',
        'White-label solution',
        '24/7 phone support',
        'Advanced analytics',
        'Custom integrations',
        'Dedicated account manager',
        'Priority feature requests'
      ]
    }
  ];

  // Check authentication on component mount
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to access subscription features.',
        variant: 'destructive'
      });
      navigate('/login');
      return;
    }
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      
      // Fetch subscription plans: prefer authenticated admin endpoint to include restricted plans if allowed
      console.log('🔄 Fetching subscription plans for dashboard...');
      let databasePlans: SubscriptionPlan[] = [];
      try {
        const adminResp = await superAdminApi.getPlans({ page: 1, limit: 100, is_active: true, plan_category: 'admin' });
        console.log('📡 Admin Plans API Response:', adminResp);
        const plansData = adminResp.data?.data || [];
        const activePlansData = Array.isArray(plansData)
          ? plansData.filter(
              (dbPlan: any) =>
                dbPlan?.is_active !== false &&
                dbPlan?.is_active !== 0 &&
                dbPlan?.is_active !== '0' &&
                dbPlan?.is_active !== 'false' &&
                (dbPlan?.plan_category || 'admin') === 'admin'
            )
          : [];
        if (activePlansData.length > 0) {
          databasePlans = activePlansData.map((dbPlan: any) => ({
            id: String(dbPlan.id),
            name: dbPlan.name,
            price: parseFloat(dbPlan.price),
            billing_cycle: dbPlan.billing_cycle,
            features: Array.isArray(dbPlan.features) ? dbPlan.features : [],
            max_users: dbPlan.max_users == null ? null : Number(dbPlan.max_users),
            max_clients: dbPlan.max_clients == null ? null : Number(dbPlan.max_clients),
            max_disputes: dbPlan.max_disputes == null ? null : Number(dbPlan.max_disputes),
            description: dbPlan.description || `${dbPlan.name} subscription plan`,
            icon: dbPlan.name === 'Starter' ? <Users className="h-6 w-6" /> :
                  dbPlan.name === 'Professional' ? <TrendingUp className="h-6 w-6" /> :
                  <Crown className="h-6 w-6" />,
            popular: dbPlan.name === 'Professional'
          }));
          console.log('✅ Loaded admin-filtered plans:', databasePlans);
          setAvailablePlans(databasePlans);
        } else {
          throw new Error('Empty admin plans');
        }
      } catch (adminErr) {
        console.warn('ℹ️ Admin plans endpoint unavailable or unauthorized, falling back to public pricing:', adminErr);
        try {
          const plansResponse = await pricingApi.getPlans();
          console.log('📡 Public Plans API Response:', plansResponse);
          if (plansResponse.data && plansResponse.data.success && plansResponse.data.data) {
            databasePlans = plansResponse.data.data
              .filter((dbPlan: any) => (dbPlan?.plan_category || 'admin') === 'admin')
              .map((dbPlan: any) => ({
              id: dbPlan.id.toString(),
              name: dbPlan.name,
              price: parseFloat(dbPlan.price),
              billing_cycle: dbPlan.billing_cycle,
              features: Array.isArray(dbPlan.features) ? dbPlan.features : [],
              max_users: dbPlan.max_users == null ? null : Number(dbPlan.max_users),
              max_clients: dbPlan.max_clients == null ? null : Number(dbPlan.max_clients),
              max_disputes: dbPlan.max_disputes == null ? null : Number(dbPlan.max_disputes),
              description: dbPlan.description || `${dbPlan.name} subscription plan`,
              icon: dbPlan.name === 'Starter' ? <Users className="h-6 w-6" /> :
                    dbPlan.name === 'Professional' ? <TrendingUp className="h-6 w-6" /> :
                    <Crown className="h-6 w-6" />,
              popular: dbPlan.name === 'Professional'
            }));
            console.log('✅ Loaded public plans:', databasePlans);
            setAvailablePlans(databasePlans);
          } else {
            console.log('⚠️ Plans API returned unexpected structure, using fallback plans');
            setAvailablePlans(enhancedPlans);
            databasePlans = enhancedPlans;
          }
        } catch (plansError) {
          console.warn('⚠️ Failed to fetch public subscription plans, falling back to hardcoded plans:', plansError);
          setAvailablePlans(enhancedPlans);
          databasePlans = enhancedPlans;
        }
      }
      
      // Fetch current subscription
      console.log('🔄 Fetching subscription data...');
      const subscriptionResponse = await billingApi.getSubscription();
      console.log('📡 Subscription API Response:', subscriptionResponse);
      
      // Fix: Check for the correct response structure
      if (subscriptionResponse.data && subscriptionResponse.data.success && subscriptionResponse.data.subscription) {
        const dbSubscription = subscriptionResponse.data.subscription;
        console.log('📊 Raw subscription data:', dbSubscription);
        
        // Find matching plan from database plans with correct billing cycle
        const desiredCycle = dbSubscription.plan_type === 'monthly' ? 'monthly' : 'yearly';
        const matchingPlan =
          databasePlans.find(p => p.name === dbSubscription.plan_name && p.billing_cycle === desiredCycle) ||
          databasePlans.find(p => p.name === dbSubscription.plan_name);
        console.log('🔍 Matching plan found:', matchingPlan);
        
        if (matchingPlan) {
          const formattedSubscription: UserSubscription = {
            id: dbSubscription.id.toString(),
            plan_id: matchingPlan.id,
            plan_name: dbSubscription.plan_name,
            status: dbSubscription.status,
            current_period_start: dbSubscription.current_period_start,
            current_period_end: dbSubscription.current_period_end,
            cancel_at_period_end: !!dbSubscription.cancel_at_period_end,
            billing_cycle: desiredCycle,
            plan: {
              ...matchingPlan,
              price: parseFloat(matchingPlan.price.toString())
            }
          };
          
          console.log('✅ Setting formatted subscription:', formattedSubscription);
          setSubscription(formattedSubscription);
        } else {
          console.log('❌ No matching plan found for:', dbSubscription.plan_name);
          console.log('Available plan names:', databasePlans.map(p => p.name));
        }
      } else {
        console.log('❌ No subscription data or API call failed');
        console.log('Response structure:', subscriptionResponse);
        console.log('Has data:', !!subscriptionResponse.data);
        console.log('Has success:', !!subscriptionResponse.data?.success);
        console.log('Has subscription:', !!subscriptionResponse.data?.subscription);
      }
    } catch (error: any) {
      console.error('❌ Error fetching subscription data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subscription information',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Default selected tab aligns with current subscription if available
  useEffect(() => {
    if (subscription?.billing_cycle) {
      setBillingFilter(subscription.billing_cycle);
    }
  }, [subscription]);

  // Resolve affiliateId from URL (?ref=) or localStorage (referral_affiliate_id)
  const resolveAffiliateId = (): string | undefined => {
    try {
      const urlRef = new URLSearchParams(window.location.search).get('ref');
      const storedRef = localStorage.getItem('referral_affiliate_id');
      return (urlRef || storedRef) || undefined;
    } catch {
      return undefined;
    }
  };

  const handleSelectPlan = async (planId: string) => {
    try {
      setUpgrading(true);
      
      const selectedPlan = availablePlans.find(p => p.id === planId);
      if (!selectedPlan) return;

      console.log('🟡 [REGULAR] Starting plan selection:', {
        planId: planId,
        planName: selectedPlan.name,
        price: selectedPlan.price,
        billingCycle: selectedPlan.billing_cycle
      });
      
      const response = await billingApi.createSubscriptionCheckout({
        planId: planId,
        billingCycle: selectedPlan.billing_cycle,
        affiliateId: resolveAffiliateId()
      });

      console.log('🟡 [REGULAR] Checkout session response:', response);
      
      if (response.data && response.data.success && response.data.url) {
        console.log('🟡 [REGULAR] Redirecting to Stripe Checkout:', response.data.url);
        window.location.href = response.data.url;
      } else {
        console.error('🔴 [REGULAR] Failed to create checkout session:', response.data);
        toast({
          title: 'Checkout Error',
          description: 'Could not start checkout. Please try again.',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('🔴 [REGULAR] Plan selection error:', error);
      const errorCode = error?.response?.data?.code;
      const kycStatus = error?.response?.data?.kyc_status;

      if (errorCode === 'KYC_REQUIRED') {
        await loadKycState();
        if (kycStatus === 'not_started' || kycStatus === 'failed') {
          setKycDialogOpen(true);
        } else {
          toast({
            title: 'KYC required',
            description: error?.response?.data?.error || 'Your KYC is still under review before checkout can continue.',
            variant: 'destructive'
          });
        }
      } else {
        toast({
          title: 'Error',
          description: 'Failed to select plan. Please try again.',
          variant: 'destructive'
        });
      }
    } finally {
      setUpgrading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    console.log('🟢 [REGULAR] Payment successful, processing...');
    setShowPaymentForm(false);
    setPaymentData(null);
    await fetchSubscriptionData();
    
    toast({
      title: 'Payment Successful! 🎉',
      description: 'Your subscription is now active. Welcome to the full experience!'
    });

    console.log('🟢 [REGULAR] Reloading page in 2000ms...');
    // Automatically refresh the page after successful payment
    setTimeout(() => {
      window.location.reload();
    }, 2000); // Wait 2 seconds to show the success message
  };

  const handlePaymentCancel = () => {
    setShowPaymentForm(false);
    setPaymentData(null);
  };

  const resetCancelDialog = () => {
    setCancelReason('');
    setOtherCancellationReason('');
    setGuidanceChoice('');
    setClassTimings([]);
    setLoadingClassTimings(false);
  };

  const handleCancelDialogChange = (open: boolean) => {
    setCancelDialogOpen(open);
    if (!open) {
      resetCancelDialog();
    }
  };

  const handleOpenCancelDialog = () => {
    if (!subscription || subscription.status !== 'active') {
      toast({
        title: 'Cannot Cancel',
        description: 'No active subscription found to cancel.',
        variant: 'destructive'
      });
      return;
    }

    setCancelDialogOpen(true);
  };

  const handleBookConsultation = () => {
    setCancelDialogOpen(false);
    resetCancelDialog();
    navigate(CONSULTATION_ROUTE);
  };

  const handleCallSupport = () => {
    if (typeof window !== 'undefined') {
      window.location.href = SUPPORT_PHONE_LINK;
    }
  };

  const loadKycState = async () => {
    setKycLoading(true);
    try {
      const response = await kycApi.getMe();
      setKycState({
        kyc_required: !!response.data?.kyc_required,
        kyc_status: response.data?.kyc_status || 'not_started',
        admin_notes: response.data?.admin_notes || null,
        support_phone: response.data?.support_phone || SUPPORT_PHONE,
      });
    } catch (error: any) {
      console.error('Failed to load KYC state:', error);
      setKycState({
        kyc_required: false,
        kyc_status: 'not_started',
        admin_notes: null,
        support_phone: SUPPORT_PHONE,
      });
    } finally {
      setKycLoading(false);
    }
  };

  useEffect(() => {
    void loadKycState();
  }, []);

  const fetchClassTimings = async () => {
    try {
      setLoadingClassTimings(true);

      const today = new Date().toISOString().split('T')[0];
      const response: any = await calendarApi.getEvents({
        page: 1,
        limit: 100,
        date_from: today,
      });

      const rawEvents = Array.isArray(response?.data?.data)
        ? response.data.data
        : Array.isArray(response?.data)
          ? response.data
          : [];

      const classTypes = new Set(['webinar', 'workshop', 'office_hours']);
      const nowTimestamp = Date.now();

      const upcomingClassTimings = rawEvents
        .filter((event: any) => classTypes.has(String(event?.type || '').toLowerCase()))
        .map((event: any) => {
          const normalizedType = String(event?.type || 'other').toLowerCase();
          const dateValue = String(event?.date || '');
          const timeValue = event?.time ? String(event.time) : '23:59:59';
          const timestamp = new Date(`${dateValue}T${timeValue}`).getTime();

          return {
            id: Number(event?.id || 0),
            title: String(event?.title || 'Class Session'),
            type: normalizedType,
            date: dateValue,
            time: event?.time ? String(event.time) : undefined,
            meeting_link: event?.meeting_link ? String(event.meeting_link) : undefined,
            timestamp,
          };
        })
        .filter((event: any) => Number.isFinite(event.timestamp) && event.timestamp >= nowTimestamp)
        .sort((a: any, b: any) => a.timestamp - b.timestamp)
        .slice(0, 20)
        .map(({ timestamp, ...event }: any) => event as ClassTiming);

      setClassTimings(upcomingClassTimings);
    } catch (error) {
      console.error('Failed to load class timings for cancellation guidance:', error);
      toast({
        title: 'Unable to load classes',
        description: 'We could not fetch class timings right now. Please try again.',
        variant: 'destructive',
      });
      setClassTimings([]);
    } finally {
      setLoadingClassTimings(false);
    }
  };

  const handleGuidanceChoiceChange = (value: GuidanceCancellationChoice) => {
    setGuidanceChoice(value);

    if (value) {
      void billingApi.trackCancellationGuidanceChoice({ guidanceChoice: value }).catch((error) => {
        console.error('Failed to track cancellation guidance choice:', error);
      });
    }

    if (value === 'join_class_now' && classTimings.length === 0 && !loadingClassTimings) {
      void fetchClassTimings();
    }
  };

  const otherReasonWordCount = getWordCount(otherCancellationReason);
  const isOtherReasonWithinLimit = otherReasonWordCount <= MAX_OTHER_REASON_WORDS;

  const canContinueCancellation =
    !!cancelReason &&
    (cancelReason !== 'guidance' || guidanceChoice === 'still_cancel') &&
    (cancelReason !== 'other' || (otherCancellationReason.trim().length > 0 && isOtherReasonWithinLimit));

  const visiblePlans = availablePlans.filter((plan) => plan.billing_cycle === billingFilter);
  const planGridClassName =
    visiblePlans.length <= 1
      ? 'grid-cols-1'
      : visiblePlans.length === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';

  const handleCancelSubscription = async () => {
    if (!canContinueCancellation) {
      if (cancelReason === 'guidance' && guidanceChoice !== 'still_cancel') {
        toast({
          title: 'Class Help Available',
          description: 'Choose "Still want to cancel" only if you still want to proceed after class support.',
          variant: 'destructive'
        });
        return;
      }

      if (cancelReason === 'other' && !isOtherReasonWithinLimit) {
        toast({
          title: 'Maximum 30 Words',
          description: 'Please keep the "Other" explanation within 30 words.',
          variant: 'destructive'
        });
        return;
      }

      toast({
        title: 'Reason Required',
        description: 'Please tell us why you are leaving before continuing.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setUpgrading(true);
      
      // Show loading toast
      toast({
        title: 'Processing...',
        description: 'Cancelling your subscription...',
      });

      const response = await billingApi.cancelSubscription({
        reasonCode: cancelReason,
        reasonText:
          cancelReason === 'other'
            ? otherCancellationReason.trim()
            : cancelReason === 'guidance' && guidanceChoice === 'still_cancel'
              ? `${CANCELLATION_REASON_LABELS[cancelReason]} (still wants to cancel)`
            : CANCELLATION_REASON_LABELS[cancelReason],
        guidanceChoice:
          cancelReason === 'guidance' && guidanceChoice
            ? guidanceChoice
            : undefined,
      });
      
      // Fix: Check response.data.success instead of response.success (Axios wraps response in data)
      if (response.data && response.data.success) {
        setSubscription(prev => prev ? {
          ...prev,
          ...(response.data.subscription && {
            current_period_end: response.data.subscription.current_period_end,
            plan_name: response.data.subscription.plan_name,
            cancel_at_period_end: true
          })
        } : null);
        const endDate = response.data.subscription?.current_period_end ? new Date(response.data.subscription.current_period_end) : (subscription ? new Date(subscription.current_period_end) : null);
        toast({
          title: 'Subscription Cancellation Scheduled',
          description: `Your ${response.data.subscription?.plan_name || 'subscription'} will end on ${endDate ? endDate.toLocaleDateString() : 'the end of your billing period'}.`
        });
        setCancelDialogOpen(false);
        resetCancelDialog();
        setTimeout(() => {
          fetchSubscriptionData();
        }, 500);
      } else {
        // Handle API error response
        const errorMessage = response.data?.error || response.data?.message || 'Unknown error occurred';
        console.error('Subscription cancellation failed:', response);
        
        toast({
          title: 'Cancellation Failed',
          description: `Failed to cancel subscription: ${errorMessage}`,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      
      // Extract detailed error information
      let errorMessage = 'Failed to cancel subscription. Please try again.';
      
      if (error.response) {
        // HTTP error response
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
          // Redirect to login if unauthorized
          setTimeout(() => navigate('/login'), 2000);
        } else if (status === 404) {
          errorMessage = 'No active subscription found to cancel.';
        } else if (status === 400) {
          errorMessage = data?.error || 'Invalid request. Please check your subscription status.';
        } else if (status >= 500) {
          errorMessage = 'Server error occurred. Please try again later.';
        } else if (data?.error) {
          errorMessage = data.error;
        }
      } else if (error.message) {
        // Network or other errors
        errorMessage = `Network error: ${error.message}`;
      }
      
      toast({
        title: 'Error Cancelling Subscription',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setUpgrading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      active: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, text: 'Active' },
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, text: 'Pending' },
      expired: { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle, text: 'Expired' },
      canceled: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: XCircle, text: 'Canceled' }
    } as const;
    
    const config = configs[status as keyof typeof configs] || configs.pending;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} border flex items-center gap-1.5 px-3 py-1`}>
        <Icon className="h-3.5 w-3.5" />
        {config.text}
      </Badge>
    );
  };

  const cancellationDialog = (
    <Dialog open={cancelDialogOpen} onOpenChange={handleCancelDialogChange}>
      <DialogContent className="max-w-2xl border-0 bg-white p-0 shadow-2xl sm:rounded-2xl">
        <div className="overflow-hidden rounded-2xl">
          <div className="bg-gradient-to-r from-slate-900 via-ocean-blue to-sea-green px-6 py-6 text-white">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="text-2xl font-bold text-white">
                We&apos;ll miss you
              </DialogTitle>
              <DialogDescription className="text-sm text-white/80">
                Before you cancel, tell us what&apos;s getting in the way. We may have a better option for you.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-6 px-6 py-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-900">Why are you thinking about canceling?</p>
              <RadioGroup
                value={cancelReason}
                onValueChange={(value) => {
                  const nextReason = value as CancellationReason;
                  setCancelReason(nextReason);

                  if (nextReason !== 'guidance') {
                    setGuidanceChoice('');
                    setClassTimings([]);
                    setLoadingClassTimings(false);
                  }
                }}
                className="mt-4 space-y-3"
              >
                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-ocean-blue/40 hover:bg-blue-50/40">
                  <RadioGroupItem value="affordability" id="cancel-reason-affordability" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="cancel-reason-affordability" className="cursor-pointer text-sm font-semibold text-slate-900">
                      I can&apos;t afford it right now
                    </Label>
                    <p className="mt-1 text-sm text-slate-600">
                      Show me a lower-cost option so I can keep my access and benefits.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-ocean-blue/40 hover:bg-blue-50/40">
                  <RadioGroupItem value="guidance" id="cancel-reason-guidance" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="cancel-reason-guidance" className="cursor-pointer text-sm font-semibold text-slate-900">
                      I don&apos;t know how to use it for my business
                    </Label>
                    <p className="mt-1 text-sm text-slate-600">
                      I need help getting value from the platform and want guidance.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-ocean-blue/40 hover:bg-blue-50/40">
                  <RadioGroupItem value="other" id="cancel-reason-other" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="cancel-reason-other" className="cursor-pointer text-sm font-semibold text-slate-900">
                      Other
                    </Label>
                    <p className="mt-1 text-sm text-slate-600">
                      Share anything else you want us to know before you leave.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {cancelReason === 'affordability' && (
              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-blue-50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Save your benefits</p>
                    <h3 className="mt-1 text-xl font-bold text-slate-900">Switch to a $25/month retention option</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      If budget is the issue, contact us and we&apos;ll help you move to a $25/month option so you can keep your benefits and lock in your future pricing.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
                    <div className="text-2xl font-bold text-emerald-600">$25</div>
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">per month</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    onClick={handleCallSupport}
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Call {SUPPORT_PHONE}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleBookConsultation}>
                    Talk to our team first
                  </Button>
                </div>
              </div>
            )}

            {cancelReason === 'guidance' && (
              <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5">
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Free consultation</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">Let us help you use it for your business</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Book a free consultation and we&apos;ll walk you through the platform, show you how to use it in your workflow, and help you get results faster.
                </p>

                <div className="mt-4 rounded-xl border border-blue-200 bg-white p-4">
                  <p className="text-sm font-medium text-slate-900">Are you joining the class?</p>
                  <RadioGroup
                    value={guidanceChoice}
                    onValueChange={(value) => handleGuidanceChoiceChange(value as GuidanceCancellationChoice)}
                    className="mt-3 space-y-3"
                  >
                    <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                      <RadioGroupItem value="join_class_now" id="guidance-join-class-now" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="guidance-join-class-now" className="cursor-pointer text-sm font-semibold text-slate-900">
                          Yes, show class timings now
                        </Label>
                        <p className="mt-1 text-xs text-slate-600">We&apos;ll show live timings directly from the calendar.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                      <RadioGroupItem value="not_now" id="guidance-not-now" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="guidance-not-now" className="cursor-pointer text-sm font-semibold text-slate-900">
                          Not now
                        </Label>
                        <p className="mt-1 text-xs text-slate-600">I&apos;ll book a class or consultation later.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
                      <RadioGroupItem value="still_cancel" id="guidance-still-cancel" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="guidance-still-cancel" className="cursor-pointer text-sm font-semibold text-rose-800">
                          Still want to cancel
                        </Label>
                        <p className="mt-1 text-xs text-rose-700">Select this if you still want to proceed with cancellation.</p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {guidanceChoice === 'join_class_now' && (
                  <div className="mt-4 rounded-xl border border-blue-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">Upcoming class timings from calendar</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 px-3 text-xs"
                        onClick={() => void fetchClassTimings()}
                        disabled={loadingClassTimings}
                      >
                        {loadingClassTimings ? (
                          <>
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            Loading
                          </>
                        ) : (
                          'Refresh'
                        )}
                      </Button>
                    </div>

                    {loadingClassTimings ? (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading class timings...
                      </div>
                    ) : classTimings.length === 0 ? (
                      <p className="text-sm text-slate-600">No upcoming class timings found right now.</p>
                    ) : (
                      <div className="space-y-2">
                        {classTimings.map((classTiming) => (
                          <div key={`${classTiming.id}-${classTiming.date}`} className="rounded-lg border border-slate-200 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{classTiming.title}</p>
                                <p className="text-xs text-slate-600">
                                  {normalizeClassTypeLabel(classTiming.type)} · {formatClassDateTime(classTiming.date, classTiming.time)}
                                </p>
                              </div>
                              {classTiming.meeting_link && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-8 px-3 text-xs"
                                  onClick={() => window.open(classTiming.meeting_link, '_blank', 'noopener,noreferrer')}
                                >
                                  Open class link
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 rounded-xl border border-blue-200 bg-white p-4">
                  <p className="text-sm text-slate-500">Call us directly</p>
                  <p className="text-lg font-bold text-slate-900">{SUPPORT_PHONE}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Button type="button" onClick={handleCallSupport} className="bg-ocean-blue text-white hover:bg-ocean-blue/90">
                    Call now
                  </Button>
                  <Button type="button" variant="outline" onClick={handleBookConsultation}>
                    Book free consultation
                  </Button>
                </div>
              </div>
            )}

            {cancelReason === 'other' && (
              <div className="space-y-2">
                <Label htmlFor="other-cancellation-reason" className="text-sm font-medium text-slate-900">
                  Tell us more
                </Label>
                <Textarea
                  id="other-cancellation-reason"
                  value={otherCancellationReason}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    const wordCount = getWordCount(nextValue);

                    if (wordCount <= MAX_OTHER_REASON_WORDS) {
                      setOtherCancellationReason(nextValue);
                    }
                  }}
                  placeholder="What made you decide to cancel?"
                  rows={4}
                  className="resize-none border-slate-200"
                />
                <p className="text-xs text-slate-500">
                  {otherReasonWordCount}/{MAX_OTHER_REASON_WORDS} words
                </p>
              </div>
            )}

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              If you still cancel, your access stays active until the end of your current billing period.
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200 px-6 py-4 sm:justify-between sm:space-x-0">
            <Button type="button" variant="ghost" onClick={() => handleCancelDialogChange(false)}>
              Keep my plan
            </Button>
            <Button
              type="button"
              onClick={handleCancelSubscription}
              disabled={upgrading || !canContinueCancellation}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {upgrading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Continue cancellation'
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[500px]">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-100 rounded-full"></div>
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0"></div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">Loading Your Subscription</h3>
              <p className="text-gray-600">Please wait while we fetch your subscription details...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (isEliteActive) {
    return (
      <DashboardLayout>
        <EliteSubscription
          subscription={subscription}
          availablePlans={availablePlans}
          billingFilter={billingFilter}
          setBillingFilter={setBillingFilter}
          recurringConsent={recurringConsent}
          setRecurringConsent={setRecurringConsent}
          upgrading={upgrading}
          handleSelectPlan={handleSelectPlan}
          handleOpenCancelDialog={handleOpenCancelDialog}
          navigate={navigate}
          getStatusBadge={getStatusBadge}
        />
        {cancellationDialog}
      </DashboardLayout>
    );
  }

  const isBasicAdminPortalUser = userProfile?.role === "admin" && hasAdminBasicPortalAccess(userProfile);

  if (isBasicAdminPortalUser && !isEliteActive) {
    return (
      <DashboardLayout>
        <BasicSubscription
          subscription={subscription}
          availablePlans={availablePlans}
          billingFilter={billingFilter}
          setBillingFilter={setBillingFilter}
          recurringConsent={recurringConsent}
          setRecurringConsent={setRecurringConsent}
          upgrading={upgrading}
          handleSelectPlan={handleSelectPlan}
          handleOpenCancelDialog={handleOpenCancelDialog}
          navigate={navigate}
          getStatusBadge={getStatusBadge}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="text-center space-y-4 py-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Subscription Management
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-ocean-blue to-sea-green bg-clip-text text-transparent">
            Choose Your Perfect Plan
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Unlock powerful funding tools and grow your business with our comprehensive platform
          </p>
        </div>

        {/* Payment Form Modal */}
        {showPaymentForm && paymentData && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
              <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-emerald-50">
                <h3 className="text-lg font-semibold text-gray-900">Complete Your Payment</h3>
                <p className="text-gray-600 text-sm mt-1">Secure payment powered by Stripe</p>
              </div>
              <div className="p-6">
                <PaymentForm
                  clientSecret={paymentData.clientSecret}
                  amount={paymentData.amount}
                  planName={paymentData.planName}
                  onSuccess={handlePaymentSuccess}
                  onCancel={handlePaymentCancel}
                />
              </div>
            </div>
          </div>
        )}

        {cancellationDialog}
        <KycVerificationDialog
          open={kycDialogOpen}
          onOpenChange={setKycDialogOpen}
          status={kycState?.kyc_status || 'not_started'}
          adminNotes={kycState?.admin_notes || null}
          onSubmitted={async () => {
            await loadKycState();
            await refreshProfile();
          }}
        />

        {kycLoading ? (
          <Card className="border border-slate-200 bg-white">
            <CardContent className="flex items-center gap-3 py-4 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading KYC status...
            </CardContent>
          </Card>
        ) : kycState?.kyc_required && kycState.kyc_status !== 'approved' ? (
          <Card className="border-amber-200 bg-amber-50/80 shadow-sm">
            <CardContent className="flex flex-col gap-4 py-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-amber-900">Identity verification required for additional client profiles</div>
                <div className="text-sm text-amber-900/80">
                  {kycState.kyc_status === 'pending'
                    ? 'Your KYC has been submitted and is waiting for review.'
                    : kycState.kyc_status === 'manual_review'
                      ? 'Your verification is undergoing manual review.'
                      : kycState.kyc_status === 'failed'
                        ? 'Your verification needs to be resubmitted before you can add another client.'
                        : 'Complete identity verification before adding another client profile.'}
                </div>
                {kycState.admin_notes ? (
                  <div className="text-sm text-amber-900/80">Admin notes: {kycState.admin_notes}</div>
                ) : null}
                <div className="text-sm text-amber-900/80">
                  Need same-time help? Call{" "}
                  <a href={SUPPORT_PHONE_LINK} className="font-semibold underline underline-offset-2">
                    {kycState.support_phone || SUPPORT_PHONE}
                  </a>
                  .
                </div>
              </div>
              {(kycState.kyc_status === 'not_started' || kycState.kyc_status === 'failed') ? (
                <Button onClick={() => setKycDialogOpen(true)} className="bg-amber-600 text-white hover:bg-amber-700">
                  <Shield className="mr-2 h-4 w-4" />
                  {kycState.kyc_status === 'failed' ? 'Resubmit Verification' : 'Start Verification'}
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {/* Current Subscription Card */}
        {subscription && (
          <Card className="border-0 shadow-2xl bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-800 dark:to-slate-700 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-sea-green/10 rounded-full -translate-y-16 translate-x-16"></div>
            <CardHeader className="relative">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-ocean-blue to-sea-green rounded-lg text-white">
                      {subscription.plan.icon || <Crown className="h-5 w-5" />}
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                        {subscription.plan.name} Plan
                      </CardTitle>
                      <CardDescription className="text-base dark:text-gray-300">
                        Your current subscription
                      </CardDescription>
                    </div>
                  </div>
                </div>
                {getStatusBadge(subscription.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-6 relative">
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Plan Details */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="text-center p-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-sm border">
                    <div className="text-3xl font-bold text-blue-600 dark:text-white mb-1">
                      ${subscription.plan.price}
                    </div>
                    <div className="text-gray-600 dark:text-gray-300 text-sm">per {subscription.billing_cycle}</div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <div>
                        <div className="font-medium dark:text-white">Started</div>
                        <div className="text-gray-600 dark:text-gray-300">{new Date(subscription.current_period_start).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="h-4 w-4 text-green-500" />
                      <div>
                        <div className="font-medium dark:text-white">Next billing</div>
                        <div className="text-gray-600 dark:text-gray-300">{new Date(subscription.current_period_end).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="lg:col-span-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-500" />
                    Your Plan Features
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {subscription.plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg border">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-200">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4 border-t">
                {subscription.status === 'pending' && (
                  <Button 
                    onClick={() => navigate('/pricing')}
                    className="bg-gradient-to-r from-ocean-blue to-sea-green hover:from-ocean-blue/90 hover:to-sea-green/90"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Complete Payment
                  </Button>
                )}
                
                {subscription.status === 'active' && !subscription.cancel_at_period_end && (
                  <Button 
                    onClick={handleOpenCancelDialog}
                    disabled={upgrading}
                    size="lg"
                    className="bg-red-600 hover:bg-red-700 text-white border border-red-700 shadow-lg px-6 py-3 text-base font-semibold"
                  >
                    {upgrading ? (
                      <div className="w-4 h-4 mr-2 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Cancel Subscription
                  </Button>
                )}
              </div>
              {subscription.cancel_at_period_end && (
                <div className="mt-4 pt-4 border-t">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <p className="text-sm text-yellow-800">
                      Your subscription will be canceled at the end of the current billing period on {new Date(subscription.current_period_end).toLocaleDateString()}.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Available Plans */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Choose Your Plan</h2>
            <p className="text-gray-600 dark:text-gray-300">Select the perfect plan for your funding business</p>
          </div>

          {/* Billing Cycle Tabs */}
          <div className="flex justify-center">
            <Tabs
              value={billingFilter}
              onValueChange={(val) => setBillingFilter(val as 'monthly' | 'yearly')}
            >
              <TabsList>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">Yearly</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className={`grid gap-8 ${planGridClassName}`}>
            {visiblePlans.map((plan) => {
              // Enhanced debugging for button logic
              console.log('🔍 Plan Button Debug:', {
                planName: plan.name,
                subscriptionPlanName: subscription?.plan_name,
                subscriptionStatus: subscription?.status,
                subscriptionData: subscription,
                planData: plan
              });
              
              const isCurrentPlan =
                subscription?.plan_name === plan.name &&
                subscription?.billing_cycle === plan.billing_cycle &&
                subscription?.status === 'active';
              const isPendingPlan =
                subscription?.plan_name === plan.name &&
                subscription?.billing_cycle === plan.billing_cycle &&
                subscription?.status === 'pending';
              
              console.log('🎯 Button State for', plan.name, ':', {
                isCurrentPlan,
                isPendingPlan,
                comparison: `"${subscription?.plan_name}" === "${plan.name}"`,
                statusCheck: `"${subscription?.status}" === "active"`
              });
              
              return (
                <Card 
                  key={plan.id} 
                  className={`relative border-0 shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
                    plan.popular ? 'ring-2 ring-blue-500 scale-105' : ''
                  } ${isCurrentPlan ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-700' : 'bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm'}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-ocean-blue to-sea-green text-white px-4 py-1 shadow-lg">
                        <Star className="h-3 w-3 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center space-y-4 pb-4">
                    <div className="mx-auto p-3 bg-gradient-to-br from-ocean-blue to-sea-green rounded-xl text-white w-fit">
                      {plan.icon}
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">{plan.name}</CardTitle>
                      <CardDescription className="text-base mt-2 dark:text-gray-300">{plan.description}</CardDescription>
                    </div>
                    <div className="space-y-2">
                      <div className="text-4xl font-bold text-gray-900 dark:text-white">
                        ${plan.price}
                      </div>
                      <div className="text-gray-600 dark:text-gray-300">per {plan.billing_cycle}</div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    <ul className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-700 dark:text-gray-200">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300">Max Users:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{plan.max_users ?? 'Unlimited'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300">Max Clients:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{plan.max_clients ?? 'Unlimited'}</span>
                      </div>
                    </div>
                    
                    <div className="pt-4 space-y-4">
                      {!isCurrentPlan && !isPendingPlan && (
                        <div className="flex items-start gap-3 border-t pt-4">
                          <Checkbox
                            id={`recurring-consent-${plan.id}`}
                            checked={recurringConsent}
                            onCheckedChange={(checked) => setRecurringConsent(checked === true)}
                          />
                          <Label htmlFor={`recurring-consent-${plan.id}`} className="text-sm text-slate-700 dark:text-slate-300">
                            By checking this box, I agree that my account will be automatically charged on a recurring basis until I cancel.
                          </Label>
                        </div>
                      )}
                      {isCurrentPlan ? (
                        <Button 
                          disabled
                          className="w-full bg-green-100 text-green-800 hover:bg-green-100 cursor-not-allowed"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Currently Active
                        </Button>
                      ) : isPendingPlan ? (
                        <Button 
                          onClick={() => navigate('/subscription')}
                          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Complete Payment
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => handleSelectPlan(plan.id)}
                          disabled={upgrading || !recurringConsent}
                          className={`w-full ${
                            plan.popular 
                              ? 'bg-gradient-to-r from-ocean-blue to-sea-green hover:from-ocean-blue/90 hover:to-sea-green/90' 
                              : 'bg-gray-900 hover:bg-gray-800'
                          }`}
                        >
                          {upgrading ? (
                            <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          ) : (
                            <>
                              {plan.price === 1 || plan.name.toLowerCase().includes('trial') 
                                ? "Start Your 7-Day Free Trial for $1" 
                                : "Select Plan"}
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {visiblePlans.length === 0 && (
              <div className="text-center text-gray-600 xl:col-span-3 md:col-span-2">
                No {billingFilter} plans available.
              </div>
            )}
          </div>
        </div>

        {/* Billing History */}
        <div className="pt-8">
          <BillingHistory />
        </div>
      </div>
    </DashboardLayout>
  );
};

const Subscription: React.FC = () => {
  const [stripeInstance, setStripeInstance] = useState<any>(null);
  const [stripeLoading, setStripeLoading] = useState(true);
  const [stripeError, setStripeError] = useState<string | null>(null);

  useEffect(() => {
    const initializeStripe = async () => {
      try {
        setStripeLoading(true);
        setStripeError(null);
        const stripe = await getStripePromise();
        setStripeInstance(stripe);
      } catch (error) {
        console.error('❌ Failed to initialize Stripe:', error);
        setStripeError('Failed to load payment system. Please refresh the page.');
      } finally {
        setStripeLoading(false);
      }
    };

    initializeStripe();
  }, []);

  if (stripeLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading payment system...</p>
        </div>
      </div>
    );
  }

  if (stripeError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-600" />
          <p className="text-red-600 mb-4">{stripeError}</p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripeInstance}>
      <SubscriptionContent />
    </Elements>
  );
};

export default Subscription;
