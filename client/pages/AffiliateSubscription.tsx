import React, { useEffect, useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import AffiliateLayout from '@/components/AffiliateLayout';
import PaymentForm from '@/components/PaymentForm';
import BillingHistory from '@/components/BillingHistory';
import { billingApi, pricingApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Crown, TrendingUp, Users, Sparkles, Calendar, Shield, CheckCircle, ArrowRight } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billing_cycle: 'monthly' | 'yearly';
  features: string[];
  popular?: boolean;
  description?: string;
  icon?: React.ReactNode;
}

interface UserSubscription {
  id: string;
  plan_id: string;
  plan_name: string;
  status: 'active' | 'pending' | 'expired' | 'cancelled';
  current_period_start: string;
  current_period_end: string;
  billing_cycle: 'monthly' | 'yearly';
  plan: SubscriptionPlan;
}

let stripePromise: Promise<any> | null = null;
const getStripePromise = async () => {
  if (!stripePromise) {
    try {
      const response = await billingApi.getStripeConfig();
      const publishableKey = response.data?.publishableKey;
      stripePromise = loadStripe(publishableKey || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');
    } catch (e) {
      stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');
    }
  }
  return stripePromise;
};

const AffiliateSubscription: React.FC = () => {
  const { toast } = useToast();
  const [stripe, setStripe] = useState<any>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState<{ clientSecret: string; amount: number; planName: string } | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch real subscription plans from database
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);

  // Hardcoded fallback plans for consistency
  const fallbackPlans: SubscriptionPlan[] = [
    {
      id: '1',
      name: 'Starter',
      price: 49,
      billing_cycle: 'monthly',
      description: 'Perfect for individuals getting started',
      icon: <Users className="h-6 w-6" />,
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

  useEffect(() => {
    (async () => {
      const s = await getStripePromise();
      setStripe(s);
    })();
    
    // Load subscription plans and current subscription
    (async () => {
      try {
        setLoading(true);
        
        // Fetch real subscription plans from database
        console.log('🔄 [AFFILIATE] Fetching subscription plans from database...');
        const plansResponse = await pricingApi.getPlans();
        console.log('📡 [AFFILIATE] Plans API Response:', plansResponse);
        
        let databasePlans: SubscriptionPlan[] = [];
        
        if (plansResponse.data && plansResponse.data.success && plansResponse.data.data) {
          // Convert database plans to frontend format
          databasePlans = plansResponse.data.data.map((dbPlan: any) => ({
            id: dbPlan.id.toString(),
            name: dbPlan.name,
            price: parseFloat(dbPlan.price),
            billing_cycle: dbPlan.billing_cycle,
            features: Array.isArray(dbPlan.features) ? dbPlan.features : [],
            description: dbPlan.description || `${dbPlan.name} subscription plan`,
            icon: dbPlan.name === 'Starter' ? <Users className="h-6 w-6" /> :
                  dbPlan.name === 'Professional' ? <TrendingUp className="h-6 w-6" /> :
                  <Crown className="h-6 w-6" />,
            popular: dbPlan.name === 'Professional'
          }));
          
          console.log('✅ [AFFILIATE] Loaded database plans:', databasePlans);
          setAvailablePlans(databasePlans);
        } else {
          console.log('⚠️ [AFFILIATE] Failed to load database plans, falling back to hardcoded plans');
          setAvailablePlans(fallbackPlans);
          databasePlans = fallbackPlans;
        }
        
        // Fetch current subscription
        console.log('🔄 [AFFILIATE] Fetching subscription data...');
        const subscriptionResponse = await billingApi.getSubscription();
        console.log('📡 [AFFILIATE] Subscription API Response:', subscriptionResponse);
        
        if (subscriptionResponse.data && subscriptionResponse.data.success && subscriptionResponse.data.subscription) {
          const dbSubscription = subscriptionResponse.data.subscription;
          console.log('📊 [AFFILIATE] Raw subscription data:', dbSubscription);
          
          // Find matching plan from database plans
          const matchingPlan = databasePlans.find(p => p.name === dbSubscription.plan_name);
          console.log('🔍 [AFFILIATE] Matching plan found:', matchingPlan);
          
          if (matchingPlan) {
            const formattedSubscription: UserSubscription = {
              id: dbSubscription.id?.toString?.() || String(dbSubscription.id),
              plan_id: matchingPlan.id,
              plan_name: dbSubscription.plan_name,
              status: dbSubscription.status,
              current_period_start: dbSubscription.current_period_start,
              current_period_end: dbSubscription.current_period_end,
              billing_cycle: dbSubscription.plan_type === 'monthly' ? 'monthly' : 'yearly',
              plan: { ...matchingPlan, price: Number(matchingPlan.price) }
            };
            
            console.log('✅ [AFFILIATE] Setting formatted subscription:', formattedSubscription);
            setSubscription(formattedSubscription);
          } else {
            console.log('❌ [AFFILIATE] No matching plan found for:', dbSubscription.plan_name);
            console.log('Available plan names:', databasePlans.map(p => p.name));
          }
        } else {
          console.log('❌ [AFFILIATE] No subscription data or API call failed');
        }
      } catch (error) {
        console.error('❌ [AFFILIATE] Error loading subscription data:', error);
        // Non-blocking: show toast for visibility
        toast({ title: 'Error', description: 'Failed to load subscription information', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    try {
      console.log('🔵 [AFFILIATE] Starting plan selection:', {
        planId: plan.id,
        planName: plan.name,
        price: plan.price,
        billingCycle: plan.billing_cycle
      });
      
      const response = await billingApi.createSubscriptionCheckout({
        planId: plan.id,
        billingCycle: plan.billing_cycle,
        affiliateId: resolveAffiliateId(),
      });

      console.log('🔵 [AFFILIATE] Checkout session response:', response);

      if (response.data?.success && response.data?.url) {
        console.log('🔵 [AFFILIATE] Redirecting to Stripe Checkout:', response.data.url);
        window.location.href = response.data.url;
      } else {
        console.error('🔴 [AFFILIATE] Checkout session creation failed:', response);
        toast({ title: 'Checkout Error', description: 'Could not start checkout.', variant: 'destructive' });
      }
    } catch (e) {
      console.error('🔴 [AFFILIATE] Error in handleSelectPlan:', e);
      toast({ title: 'Error', description: 'Failed to create checkout session', variant: 'destructive' });
    }
  };

  return (
    <AffiliateLayout title="Subscription" description="Manage your Partner Program subscription">
      <div className="space-y-8 max-w-7xl mx-auto">
        {loading && (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-emerald-100 rounded-full"></div>
                <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin absolute top-0"></div>
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-gray-900">Loading Your Subscription</h3>
                <p className="text-gray-600">Please wait while we fetch your subscription details...</p>
              </div>
            </div>
          </div>
        )}
        <div className="text-center space-y-4 py-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sea-green to-ocean-blue text-white rounded-full text-sm font-medium shadow-sm">
            <Sparkles className="h-4 w-4" />
            Subscription Management
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-sea-green via-teal-green to-ocean-blue bg-clip-text text-transparent">
            {subscription && subscription.status === 'active' ? 'Your Current Plan' : 'Choose Your Perfect Plan'}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {subscription && subscription.status === 'active' 
              ? 'Manage your current subscription or explore other plans.' 
              : 'Select a plan that fits your affiliate goals. Upgrade anytime.'
            }
          </p>
        </div>

        {/* Current Subscription Card - Show first when user has active subscription */}
        {subscription && subscription.status === 'active' && (
          <>
            <Card className="border-0 shadow-2xl bg-gradient-to-br from-white to-emerald-50/30 overflow-hidden mb-8">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sea-green/10 to-teal-green/10 rounded-full -translate-y-16 translate-x-16"></div>
              <CardHeader className="relative">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-sea-green to-teal-green rounded-lg text-white">
                        {subscription.plan.icon || <Crown className="h-5 w-5" />}
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-bold text-gray-900">
                          {subscription.plan.name} Plan
                        </CardTitle>
                        <CardDescription className="text-base">
                          Your current subscription
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize bg-green-50 text-green-700 border-green-200">
                    {subscription.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 relative">
                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Plan Details */}
                  <div className="lg:col-span-1 space-y-4">
                    <div className="text-center p-6 bg-white rounded-xl shadow-sm border">
                      <div className="text-3xl font-bold text-emerald-600 mb-1">
                        ${subscription.plan.price}
                      </div>
                      <div className="text-gray-600 text-sm">per {subscription.billing_cycle}</div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm">
                        <Calendar className="h-4 w-4 text-teal-500" />
                        <div>
                          <div className="font-medium">Started</div>
                          <div className="text-gray-600">{new Date(subscription.current_period_start).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Calendar className="h-4 w-4 text-green-500" />
                        <div>
                          <div className="font-medium">Next billing</div>
                          <div className="text-gray-600">{new Date(subscription.current_period_end).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Features */}
                  <div className="lg:col-span-2">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-500" />
                      Your Plan Features
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {subscription.plan.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Other Available Plans</h2>
              <p className="text-gray-600">Explore other plans or upgrade your current subscription</p>
            </div>
          </>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {availablePlans.map((p) => {
            const isCurrentPlan = subscription && subscription.plan_id === p.id;
            const hasActiveSubscription = subscription && subscription.status === 'active';
            
            return (
              <Card key={p.id} className={`${p.popular ? 'border-emerald-500 shadow-emerald-100 shadow-lg' : ''} ${isCurrentPlan ? 'border-blue-500 bg-blue-50/50' : ''}`}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    {p.icon}
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {p.name}
                        {p.popular && !isCurrentPlan && (
                          <Badge className="bg-green-50 text-emerald-700 border-emerald-200">Popular</Badge>
                        )}
                        {isCurrentPlan && (
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200">Current Plan</Badge>
                        )}
                      </CardTitle>
                      {p.description && (
                        <CardDescription>{p.description}</CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-600 mb-1">
                    ${p.price}
                  </div>
                  <div className="text-gray-600 text-sm">per {p.billing_cycle}</div>
                  <ul className="mt-4 space-y-2 text-sm">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <span>•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {isCurrentPlan ? (
                    <div className="mt-6 space-y-2">
                      <Button 
                        className="w-full bg-blue-600 text-white hover:bg-blue-700" 
                        disabled
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Current Plan
                      </Button>
                      <p className="text-xs text-center text-gray-500">
                        Active until {subscription ? new Date(subscription.current_period_end).toLocaleDateString() : ''}
                      </p>
                    </div>
                  ) : hasActiveSubscription ? (
                    <div className="mt-6 space-y-2">
                      <Button 
                        className="w-full bg-gradient-to-r from-sea-green to-ocean-blue text-white hover:from-teal-green hover:to-ocean-blue" 
                        onClick={() => handleSelectPlan(p)}
                      >
                        {subscription && subscription.plan.price < p.price ? (
                          <>
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Upgrade to {p.name}
                          </>
                        ) : subscription && subscription.plan.price > p.price ? (
                          <>
                            <ArrowRight className="h-4 w-4 mr-2" />
                            Downgrade to {p.name}
                          </>
                        ) : (
                          <>
                            <ArrowRight className="h-4 w-4 mr-2" />
                            Switch to {p.name}
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-center text-gray-500">
                        {subscription && subscription.plan.price < p.price 
                          ? "Upgrade takes effect immediately with prorated billing"
                          : "Changes take effect at next billing cycle"
                        }
                      </p>
                    </div>
                  ) : (
                    <Button 
                      className="mt-6 w-full bg-gradient-to-r from-sea-green to-ocean-blue text-white hover:from-teal-green hover:to-ocean-blue" 
                      onClick={() => handleSelectPlan(p)}
                    >
                      Select Plan
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Separator className="my-8" />

        {stripe && showPaymentForm && paymentData && (
          <Elements stripe={stripe} options={{ clientSecret: paymentData.clientSecret }}>
            <PaymentForm
              clientSecret={paymentData.clientSecret}
              amount={paymentData.amount}
              planName={paymentData.planName}
              onSuccess={() => {
                    console.log('🟢 [AFFILIATE] Payment successful, processing...');
                    setShowPaymentForm(false);
                    toast({ title: 'Payment Successful', description: 'Your partner plan is active!' });
                    console.log('🟢 [AFFILIATE] Reloading page in 600ms...');
                    setTimeout(() => {
                      window.location.reload();
                    }, 600);
                  }}
              onCancel={() => setShowPaymentForm(false)}
            />
          </Elements>
        )}

        {/* Current Subscription Card (mirrors admin layout) */}
        {subscription && (
          <Card className="border-0 shadow-2xl bg-gradient-to-br from-white to-emerald-50/30 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sea-green/10 to-teal-green/10 rounded-full -translate-y-16 translate-x-16"></div>
            <CardHeader className="relative">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-sea-green to-teal-green rounded-lg text-white">
                      {subscription.plan.icon || <Crown className="h-5 w-5" />}
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-gray-900">
                        {subscription.plan.name} Plan
                      </CardTitle>
                      <CardDescription className="text-base">
                        Your current subscription
                      </CardDescription>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">
                  {subscription.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 relative">
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Plan Details */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="text-center p-6 bg-white rounded-xl shadow-sm border">
                    <div className="text-3xl font-bold text-emerald-600 mb-1">
                      ${subscription.plan.price}
                    </div>
                    <div className="text-gray-600 text-sm">per {subscription.billing_cycle}</div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="h-4 w-4 text-teal-500" />
                      <div>
                        <div className="font-medium">Started</div>
                        <div className="text-gray-600">{new Date(subscription.current_period_start).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="h-4 w-4 text-green-500" />
                      <div>
                        <div className="font-medium">Next billing</div>
                        <div className="text-gray-600">{new Date(subscription.current_period_end).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Features */}
                <div className="lg:col-span-2">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-500" />
                    Your Plan Features
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {subscription.plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => window.location.reload()}>
                  <>
                    Refresh
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Billing History */}
        <div className="pt-8">
          <BillingHistory />
        </div>
      </div>
    </AffiliateLayout>
  );
};

export default AffiliateSubscription;