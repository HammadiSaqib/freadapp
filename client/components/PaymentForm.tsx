import React, { useState, useEffect, useRef } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Loader2, CreditCard, Lock, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { api } from '../lib/api';

interface PaymentFormProps {
  clientSecret: string;
  amount: number;
  planName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  clientSecret,
  amount,
  planName,
  onSuccess,
  onCancel
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [elementReady, setElementReady] = useState(false);
  const [elementError, setElementError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();
  const cardElementRef = useRef<any>(null);

  console.log('PaymentForm received clientSecret:', clientSecret);
  console.log('PaymentForm received amount:', amount);
  console.log('PaymentForm received planName:', planName);

  // Enhanced error handling for Stripe Elements
  useEffect(() => {
    if (!elements) return;

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    cardElementRef.current = cardElement;

    // Handle element ready state
    const handleReady = () => {
      console.log('✅ Stripe CardElement is ready');
      setElementReady(true);
      setElementError(null);
      
      // Clear any previous errors when element is ready
      setPaymentError(null);
      
      toast({
        title: 'Payment Form Ready',
        description: 'You can now enter your card details.',
        variant: 'default'
      });
    };

    // Handle element changes and errors
    const handleChange = (event: any) => {
      console.log('Stripe CardElement change event:', event);
      
      if (event.error) {
        console.error('❌ Stripe CardElement error:', event.error);
        
        let errorMessage = event.error.message;
        
        // Check for specific ERR_ABORTED or iframe loading errors
        if (event.error.message?.includes('ERR_ABORTED') || 
            event.error.message?.includes('elements-inner-card') ||
            event.error.message?.includes('iframe') ||
            event.error.code === 'element_not_found') {
          
          errorMessage = 'Card element failed to load properly. This is usually a temporary network issue.';
          
          // Show retry option for ERR_ABORTED errors
          if (retryCount < 3) {
            errorMessage += ' Please try the retry button below.';
          } else {
            errorMessage += ' Please refresh the page to try again.';
          }
          
          console.error('🚨 ERR_ABORTED or iframe error detected:', event.error);
        }
        
        setElementError(errorMessage);
        
        // Show toast for critical errors
        if (event.error.message?.includes('ERR_ABORTED') || 
            event.error.message?.includes('elements-inner-card')) {
          toast({
            title: 'Payment Form Error',
            description: errorMessage,
            variant: 'destructive'
          });
        }
      } else {
        setElementError(null);
        
        // Show validation feedback
        if (event.complete) {
          console.log('✅ Card information is complete and valid');
        }
      }
    };

    // Handle focus events
    const handleFocus = () => {
      console.log('Stripe CardElement focused');
      // Clear errors when user starts interacting
      setElementError(null);
      setPaymentError(null);
    };

    // Handle blur events  
    const handleBlur = () => {
      console.log('Stripe CardElement blurred');
    };

    // Add event listeners
    cardElement.on('ready', handleReady);
    cardElement.on('change', handleChange);
    cardElement.on('focus', handleFocus);
    cardElement.on('blur', handleBlur);

    // Cleanup function
    return () => {
      if (cardElement) {
        cardElement.off('ready', handleReady);
        cardElement.off('change', handleChange);
        cardElement.off('focus', handleFocus);
        cardElement.off('blur', handleBlur);
      }
    };
  }, [elements, retryCount, toast]);

  const handleRetryElement = () => {
    if (retryCount >= 3) {
      toast({
        title: 'Maximum Retries Reached',
        description: 'Please refresh the page and try again. If the problem persists, try using a different browser or clearing your browser cache.',
        variant: 'destructive'
      });
      return;
    }

    console.log(`🔄 Retrying Stripe Elements initialization (attempt ${retryCount + 1}/3)`);
    
    setRetryCount(prev => prev + 1);
    setElementError(null);
    setElementReady(false);
    setPaymentError(null);
    
    toast({
      title: 'Retrying Payment Form',
      description: 'Attempting to reload the payment form...',
      variant: 'default'
    });
    
    // Force page reload as the most reliable way to reset Stripe Elements
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setPaymentError('Stripe is not properly initialized. Please refresh the page.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setPaymentError('Card element is not available. Please refresh the page.');
      return;
    }

    if (!elementReady) {
      setPaymentError('Card element is still loading. Please wait a moment and try again.');
      return;
    }

    setProcessing(true);
    setPaymentError(null);

    try {
      // Confirm the payment with Stripe
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: 'Customer', // You can get this from user data
          },
        },
      });

      if (error) {
        console.error('Payment error:', error);
        
        // Enhanced error handling for different error types
        let errorMessage = error.message || 'Payment failed';
        
        if (error.code === 'card_declined') {
          errorMessage = 'Your card was declined. Please try a different payment method.';
        } else if (error.code === 'expired_card') {
          errorMessage = 'Your card has expired. Please use a different card.';
        } else if (error.code === 'insufficient_funds') {
          errorMessage = 'Insufficient funds. Please try a different payment method.';
        } else if (error.code === 'incorrect_cvc') {
          errorMessage = 'Your card\'s security code is incorrect.';
        } else if (error.code === 'processing_error') {
          errorMessage = 'An error occurred while processing your card. Please try again.';
        } else if (error.code === 'payment_intent_unexpected_state') {
          errorMessage = 'This payment has already been processed or is in an invalid state. Please refresh the page and try again.';
          console.error('🚨 Payment intent unexpected state error - likely already processed or expired');
        } else if (error.message?.includes('ERR_ABORTED') || error.message?.includes('network')) {
          errorMessage = 'Network error occurred. Please check your connection and try again.';
        }
        
        setPaymentError(errorMessage);
        toast({
          title: 'Payment Failed',
          description: errorMessage,
          variant: 'destructive'
        });
      } else if (paymentIntent) {
        console.log('Payment intent status:', paymentIntent.status);
        
        if (paymentIntent.status === 'succeeded') {
          // Payment succeeded, confirm with backend
          const confirmResponse = await api.post('/api/billing/confirm-payment', {
            paymentIntentId: paymentIntent.id
          });

          if (confirmResponse.data && confirmResponse.data.success) {
            toast({
              title: 'Payment Successful',
              description: 'Your subscription is now active!'
            });
            onSuccess();

            // Automatically refresh the page after successful payment
            setTimeout(() => {
              window.location.reload();
            }, 2000); // Wait 2 seconds to show the success message
          } else {
            const errorMessage = confirmResponse.error || 'Payment processed but subscription activation failed';
            setPaymentError(errorMessage);
            toast({
              title: 'Error',
              description: errorMessage,
              variant: 'destructive'
            });
          }
        } else if (paymentIntent.status === 'processing') {
          setPaymentError('Payment is still processing. Please wait a moment and check your account status.');
          toast({
            title: 'Payment Processing',
            description: 'Your payment is being processed. Please wait...',
            variant: 'default'
          });
        } else if (paymentIntent.status === 'requires_action') {
          setPaymentError('Additional authentication is required. Please complete the authentication and try again.');
          toast({
            title: 'Authentication Required',
            description: 'Please complete the additional authentication steps.',
            variant: 'destructive'
          });
        } else {
          setPaymentError(`Payment failed with status: ${paymentIntent.status}. Please try again.`);
          toast({
            title: 'Payment Failed',
            description: `Payment status: ${paymentIntent.status}`,
            variant: 'destructive'
          });
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setPaymentError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
    hidePostalCode: false,
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Complete Payment
        </CardTitle>
        <div className="text-sm text-gray-600">
          <p>Plan: <span className="font-medium">{planName}</span></p>
          <p>Amount: <span className="font-medium">${(amount / 100).toFixed(2)}</span></p>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <div className="p-4 border border-gray-200 rounded-md">
              <CardElement options={cardElementOptions} />
            </div>
            
            {/* Loading indicator for card element */}
            {!elementReady && !elementError && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-md">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading secure payment form...
                </div>
              </div>
            )}
          </div>
          
          {/* Element-specific error handling */}
          {elementError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-600">{elementError}</p>
                  {retryCount < 3 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRetryElement}
                      className="mt-2 text-xs"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry Loading ({retryCount}/3)
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Payment error */}
          {paymentError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-600">{paymentError}</p>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Lock className="h-3 w-3" />
            <span>Your payment information is secure and encrypted</span>
          </div>
          
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={processing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!stripe || processing || !elementReady || !!elementError}
              className="flex-1 gradient-primary"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay $${(amount / 100).toFixed(2)}`
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default PaymentForm;