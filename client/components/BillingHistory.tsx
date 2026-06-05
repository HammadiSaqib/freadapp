import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Loader2, CreditCard, Calendar, DollarSign, Download, RefreshCw } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useToast } from '../hooks/use-toast';
import { api } from '../lib/api';

interface BillingTransaction {
  id: number;
  stripe_payment_intent_id: string;
  stripe_customer_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  plan_name: string;
  plan_type: 'monthly' | 'yearly' | 'lifetime' | 'course';
  description: string;
  created_at: string;
  updated_at: string;
}

interface Subscription {
  id: number;
  user_id: number;
  stripe_customer_id: string;
  plan_name: string;
  plan_type: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

const BillingHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);
  const { toast } = useToast();
  const location = useLocation();

  const fetchBillingData = async () => {
    try {
      console.log('🔄 Fetching billing data...');
      
      // Check authentication state
      const token = localStorage.getItem('auth_token');
      const user = localStorage.getItem('user');
      console.log('🔐 Auth state - Token exists:', !!token);
      console.log('👤 Auth state - User:', user && user !== 'undefined' ? JSON.parse(user) : null);
      
      const [transactionsResponse, subscriptionResponse] = await Promise.all([
        api.get('/api/billing/stripe-history'),
        api.get('/api/billing/subscription')
      ]);

      console.log('📊 Transactions Response:', transactionsResponse);
      console.log('📋 Subscription Response:', subscriptionResponse);

      if (transactionsResponse.data?.success) {
        console.log('✅ Setting transactions:', transactionsResponse.data.transactions);
        setTransactions(transactionsResponse.data.transactions || []);
      } else {
        console.log('❌ Transactions response not successful:', transactionsResponse);
        // Fallback to DB history if Stripe route fails or unauthorized
        try {
          const fallback = await api.get('/api/billing/history');
          if (fallback.data?.success) {
            setTransactions(fallback.data.transactions || []);
          }
        } catch {}
      }

      if (subscriptionResponse.data?.success) {
        console.log('✅ Setting subscription:', subscriptionResponse.data.subscription);
        setSubscription(subscriptionResponse.data.subscription);
      } else {
        console.log('❌ Subscription response not successful:', subscriptionResponse);
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load billing information',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBillingData();
  };

  const handleUpdatePaymentMethod = async () => {
    try {
      setPortalLoading(true);
      const response = await api.post('/api/billing/billing-portal');
      const url = response.data?.url;
      if (url) {
        window.location.href = url;
        return;
      }
      toast({
        title: 'Error',
        description: 'Unable to open billing portal',
        variant: 'destructive'
      });
    } catch (error) {
      console.error('Error opening billing portal:', error);
      toast({
        title: 'Error',
        description: 'Unable to open billing portal',
        variant: 'destructive'
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleRetryPayment = async () => {
    try {
      setRetryLoading(true);
      const response = await api.post('/api/billing/retry-payment');
      if (response.data?.success) {
        toast({
          title: 'Payment retry sent',
          description: 'Stripe is re-processing your payment now'
        });
        await fetchBillingData();
        return;
      }
      toast({
        title: 'Error',
        description: response.data?.error || 'Unable to retry payment',
        variant: 'destructive'
      });
    } catch (error) {
      console.error('Error retrying payment:', error);
      toast({
        title: 'Error',
        description: 'Unable to retry payment',
        variant: 'destructive'
      });
    } finally {
      setRetryLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
      case 'canceled':
      case 'past_due':
      case 'unpaid':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleManageCancellation = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    toast({
      title: 'Use the cancellation options above',
      description:
        location.pathname.includes('/affiliate/')
          ? 'Use the main subscription section to choose your cancellation reason first.'
          : 'Use the main subscription section to choose your cancellation reason first.'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading billing information...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing History</h1>
          <p className="text-gray-600">Manage your subscription and view payment history</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Current Subscription */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Plan</p>
                <p className="text-lg font-semibold">{subscription.plan_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Type</p>
                <p className="text-lg font-semibold capitalize">{subscription.plan_type}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <Badge className={getStatusColor(subscription.status)}>
                  {subscription.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Next Billing</p>
                <p className="text-lg font-semibold">
                  {formatDate(subscription.current_period_end)}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-3">
              <Button
                onClick={handleUpdatePaymentMethod}
                variant="outline"
                disabled={portalLoading}
              >
                {portalLoading ? 'Opening...' : 'Update Payment Method'}
              </Button>
              {(subscription.status === 'past_due' || subscription.status === 'unpaid') && (
                <Button
                  onClick={handleRetryPayment}
                  disabled={retryLoading}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {retryLoading ? 'Retrying...' : 'Retry Payment'}
                </Button>
              )}
              {subscription.status === 'active' && !subscription.cancel_at_period_end && (
                <Button
                  onClick={handleManageCancellation}
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Manage Cancellation
                </Button>
              )}
            </div>
            
            {subscription.cancel_at_period_end && (
              <div className="mt-4 pt-4 border-t">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-sm text-yellow-800">
                    Your subscription will be canceled at the end of the current billing period on{' '}
                    {formatDate(subscription.current_period_end)}.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No payment history found</p>
              <p className="text-sm text-gray-400 mt-1">
                Your payment transactions will appear here once you make a purchase.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <CreditCard className="h-8 w-8 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {transaction.description || `Payment for ${transaction.plan_name}`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {transaction.plan_name} • {transaction.plan_type}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(transaction.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </p>
                      <Badge className={getStatusColor(transaction.status)}>
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Billing Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="font-medium text-blue-900 mb-2">Need Help?</h4>
              <p className="text-sm text-blue-800 mb-3">
                If you have questions about your billing or need to update your payment method,
                please contact our support team.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-300"
                onClick={() => window.open('https://thescoremachine.com/contact')}
              >
                Contact Support
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Payment Methods</h4>
                <p className="text-gray-600">
                  We accept all major credit cards and process payments securely through Stripe.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Billing Cycle</h4>
                <p className="text-gray-600">
                  Subscriptions are billed automatically based on your selected plan frequency.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingHistory;
