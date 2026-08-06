import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, Check, Star, Users, Shield, Zap, TrendingUp, Award, Clock, Phone, Mail, Globe, ArrowRight, CheckCircle, DollarSign, Target, BarChart3 } from 'lucide-react';
import SiteHeader from '../components/SiteHeader';

interface PricingPlan {
  id: number;
  name: string;
  description: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  maxUsers?: number | null;
  maxClients?: number | null;
  maxDisputes?: number | null;
  isPopular?: boolean;
  commissionRate?: number;
}

interface AffiliateInfo {
  id: number;
  firstName: string;
  lastName: string;
  companyName?: string;
  isActive: boolean;
}

const AffiliateLanding: React.FC = () => {
  const { affiliateId } = useParams<{ affiliateId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [affiliateInfo, setAffiliateInfo] = useState<AffiliateInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [processingPurchase, setProcessingPurchase] = useState(false);

  useEffect(() => {
    fetchPricingPlans();
    if (affiliateId) {
      fetchAffiliateInfo();
      // Track the affiliate link visit
      trackAffiliateVisit();
      // Persist referral affiliate id for cross-page registration attribution
      try {
        localStorage.setItem('referral_affiliate_id', affiliateId);
      } catch (e) {
        // Ignore storage errors
      }
    }
  }, [affiliateId]);

  const fetchPricingPlans = async () => {
    try {
      const response = await fetch(`/api/landing/pricing${affiliateId ? `?ref=${affiliateId}` : ''}`);
      const data = await response.json();
      
      if (data.success) {
        setPlans(data.data);
      } else {
        setError('Failed to load pricing plans');
      }
    } catch (error) {
      console.error('Error fetching pricing plans:', error);
      setError('Failed to load pricing plans');
    }
  };

  const fetchAffiliateInfo = async () => {
    if (!affiliateId) return;
    
    try {
      const response = await fetch(`/api/landing/referral/${affiliateId}`);
      const data = await response.json();
      
      if (data.success) {
        setAffiliateInfo(data.data);
      } else {
        setError('Invalid affiliate link');
      }
    } catch (error) {
      console.error('Error fetching affiliate info:', error);
      setError('Failed to load affiliate information');
    } finally {
      setLoading(false);
    }
  };

  const trackAffiliateVisit = async () => {
    if (!affiliateId) return;
    
    try {
      await fetch('/api/landing/track-visit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          affiliateId: parseInt(affiliateId),
          source: searchParams.get('source') || 'direct',
          userAgent: navigator.userAgent,
          referrer: document.referrer
        }),
      });
    } catch (error) {
      console.error('Error tracking affiliate visit:', error);
    }
  };

  const handlePlanSelect = async (planId: number) => {
    setSelectedPlan(planId);
    setProcessingPurchase(true);
    
    try {
      // Simulate purchase process - in real implementation, this would integrate with Stripe
      const response = await fetch('/api/landing/track-conversion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          affiliateId: affiliateId ? parseInt(affiliateId) : null,
          amount: plans.find(p => p.id === planId)?.price || 0,
          source: searchParams.get('source') || 'direct'
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Redirect to actual payment processing or success page
        navigate(`/checkout?plan=${planId}${affiliateId ? `&ref=${affiliateId}` : ''}`);
      } else {
        setError('Failed to process selection. Please try again.');
      }
    } catch (error) {
      console.error('Error processing plan selection:', error);
      setError('Failed to process selection. Please try again.');
    } finally {
      setProcessingPurchase(false);
      setSelectedPlan(null);
    }
  };

  if (loading && affiliateId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading affiliate information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Top Navigation with Score Machine logo */}
      <SiteHeader />
      {/* Hero Section with Affiliate Info */}
      <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>
        
        <div className="relative container mx-auto px-4 py-16 lg:py-24">
          <div className="text-center max-w-4xl mx-auto">
            {affiliateInfo && (
              <div className="mb-8">
                <Badge className="bg-white/20 text-white border-white/30 mb-4 px-4 py-2 text-sm">
                  <Award className="w-4 h-4 mr-2" />
                  Trusted Partner: {affiliateInfo.firstName} {affiliateInfo.lastName}
                  {affiliateInfo.companyName && ` • ${affiliateInfo.companyName}`}
                </Badge>
                <div className="flex items-center justify-center gap-4 text-sm opacity-90">
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {affiliateInfo.totalReferrals || 0} Successful Referrals
                  </span>
                  <span className="flex items-center">
                    <Star className="w-4 h-4 mr-1" />
                    Verified Partner
                  </span>
                </div>
              </div>
            )}
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Transform Your
              <span className="block bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                Credit Score
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 opacity-90 leading-relaxed">
              {affiliateInfo 
                ? `Join thousands who've improved their credit with our proven system, recommended by ${affiliateInfo.firstName}`
                : 'Professional funding services trusted by over 50,000 customers'
              }
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <div className="flex items-center bg-white/10 rounded-full px-6 py-3">
                <CheckCircle className="w-5 h-5 mr-2 text-green-300" />
                <span>Average 100+ Point Increase</span>
              </div>
              <div className="flex items-center bg-white/10 rounded-full px-6 py-3">
                <Clock className="w-5 h-5 mr-2 text-blue-300" />
                <span>Results in 30-90 Days</span>
              </div>
              <div className="flex items-center bg-white/10 rounded-full px-6 py-3">
                <Shield className="w-5 h-5 mr-2 text-purple-300" />
                <span>100% Money-Back Guarantee</span>
              </div>
            </div>
            
            {affiliateInfo && (
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-xl p-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-center mb-3">
                  <DollarSign className="w-6 h-6 mr-2 text-green-300" />
                  <span className="text-lg font-semibold">Exclusive Partner Offer</span>
                </div>
                <p className="text-green-100">
                  🎉 Special pricing and priority support through {affiliateInfo.firstName}'s trusted partnership!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="container mx-auto px-4 py-6">
          <Alert className="border-red-200 bg-red-50 max-w-2xl mx-auto">
            <AlertDescription className="text-red-600">
              {error}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Pricing Plans */}
      <div id="pricing-section" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="bg-blue-100 text-blue-800 px-4 py-2 mb-6">
              <Target className="w-4 h-4 mr-2" />
              Choose Your Success Plan
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Transparent Pricing,
              <span className="block text-blue-600">Guaranteed Results</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Select the perfect plan for your funding journey. All plans include our money-back guarantee and dedicated support.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative group ${plan.isPopular ? 'border-2 border-blue-500 shadow-2xl scale-105 bg-gradient-to-b from-blue-50 to-white' : 'border border-gray-200 hover:border-blue-300'} transition-all duration-500 hover:shadow-xl hover:-translate-y-2`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 text-sm font-semibold shadow-lg">
                      <Star className="w-4 h-4 mr-2" />
                      Most Popular Choice
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-6 pt-8">
                  <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="text-gray-600 text-base leading-relaxed">
                    {plan.description}
                  </CardDescription>
                  
                  <div className="mt-6">
                    <div className="text-5xl font-bold text-gray-900 mb-2">
                      ${plan.price}
                      <span className="text-xl font-normal text-gray-500">
                        /{plan.billingCycle === 'monthly' ? 'mo' : 'yr'}
                      </span>
                    </div>
                    
                    {affiliateInfo && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                        <div className="flex items-center justify-center text-green-700 text-sm font-medium">
                          <DollarSign className="w-4 h-4 mr-1" />
                          {affiliateInfo.commissionRate || 15}% Partner Commission
                        </div>
                        <div className="text-green-600 text-xs mt-1">
                          Earned by {affiliateInfo.firstName} on your purchase
                        </div>
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="px-6 pb-8">
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <div className="bg-green-100 rounded-full p-1 mr-3 mt-0.5">
                          <Check className="w-3 h-3 text-green-600" />
                        </div>
                        <span className="text-gray-700 text-sm leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="border-t pt-4 mb-8 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Max Users:</span>
                      <span className="font-medium text-gray-900">{plan.maxUsers ?? 'Unlimited'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Max Clients:</span>
                      <span className="font-medium text-gray-900">{plan.maxClients ?? 'Unlimited'}</span>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => handlePlanSelect(plan.id)}
                    disabled={processingPurchase}
                    className={`w-full py-4 text-lg font-semibold transition-all duration-300 ${
                      plan.isPopular 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg' 
                        : 'bg-gray-900 hover:bg-gray-800'
                    }`}
                  >
                    {processingPurchase && selectedPlan === plan.id ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Get Started Now
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                  
                  <p className="text-center text-xs text-gray-500 mt-3">
                    30-day money-back guarantee
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Platform Features Section */}
      <div className="bg-gradient-to-b from-gray-50 to-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="bg-purple-100 text-purple-800 px-4 py-2 mb-6">
              <BarChart3 className="w-4 h-4 mr-2" />
              Proven Platform Features
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Why 50,000+ Customers
              <span className="block text-purple-600">Trust Our Platform</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our comprehensive funding platform combines cutting-edge technology with expert human support
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-12 max-w-6xl mx-auto">
            <div className="group">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-center">Enterprise-Grade Security</h3>
              <p className="text-gray-600 text-center leading-relaxed mb-6">
                Your sensitive financial data is protected with 256-bit SSL encryption and multi-factor authentication
              </p>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Security Rating</span>
                  <span className="font-semibold text-blue-600">A+ Grade</span>
                </div>
              </div>
            </div>
            
            <div className="group">
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-center">Proven Results</h3>
              <p className="text-gray-600 text-center leading-relaxed mb-6">
                Our AI-powered dispute system has successfully removed over 2 million negative items from credit reports
              </p>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">Average Score Increase</span>
                  <span className="font-semibold text-green-600">+127 Points</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Success Rate</span>
                  <span className="font-semibold text-green-600">94.2%</span>
                </div>
              </div>
            </div>
            
            <div className="group">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-center">Expert Support Team</h3>
              <p className="text-gray-600 text-center leading-relaxed mb-6">
                Certified credit specialists with 10+ years experience guide you through every step of your journey
              </p>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">Response Time</span>
                  <span className="font-semibold text-purple-600">&lt; 2 Hours</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Satisfaction Rate</span>
                  <span className="font-semibold text-purple-600">98.7%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              How Our Platform Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Simple, transparent process that gets results in 30-90 days
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Credit Analysis</h3>
              <p className="text-gray-600 text-sm">
                We analyze your credit reports from all 3 bureaus to identify negative items
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Dispute Strategy</h3>
              <p className="text-gray-600 text-sm">
                Our AI creates personalized dispute letters targeting inaccurate items
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Bureau Communication</h3>
              <p className="text-gray-600 text-sm">
                We handle all communication with credit bureaus and creditors on your behalf
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-gradient-to-br from-orange-100 to-orange-200 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-orange-600">4</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Score Improvement</h3>
              <p className="text-gray-600 text-sm">
                Watch your credit score improve as negative items are removed or updated
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="bg-gradient-to-b from-blue-50 to-indigo-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Success Stories
            </h2>
            <p className="text-xl text-gray-600">
              Real results from real customers
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="bg-white border-0 shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">
                  "My credit score went from 520 to 720 in just 4 months! The team was incredibly professional and kept me updated throughout the entire process."
                </p>
                <div className="flex items-center">
                  <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mr-4">
                    <span className="text-blue-600 font-semibold">SM</span>
                  </div>
                  <div>
                    <div className="font-semibold">Sarah Martinez</div>
                    <div className="text-gray-500 text-sm">Small Business Owner</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white border-0 shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">
                  "I was able to qualify for a mortgage after using their services. They removed 8 negative items from my report and my score increased by 150 points!"
                </p>
                <div className="flex items-center">
                  <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mr-4">
                    <span className="text-green-600 font-semibold">MJ</span>
                  </div>
                  <div>
                    <div className="font-semibold">Michael Johnson</div>
                    <div className="text-gray-500 text-sm">First-time Home Buyer</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white border-0 shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">
                  "The customer service is outstanding. They explained everything clearly and I could track my progress in real-time through their dashboard."
                </p>
                <div className="flex items-center">
                  <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mr-4">
                    <span className="text-purple-600 font-semibold">LW</span>
                  </div>
                  <div>
                    <div className="font-semibold">Lisa Wang</div>
                    <div className="text-gray-500 text-sm">Marketing Director</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Transform Your Credit?
            </h2>
            <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
              Join thousands of satisfied customers who have improved their credit scores and achieved their financial goals
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <div className="flex items-center text-white">
                <CheckCircle className="w-5 h-5 mr-2 text-green-300" />
                <span>No Setup Fees</span>
              </div>
              <div className="flex items-center text-white">
                <CheckCircle className="w-5 h-5 mr-2 text-green-300" />
                <span>90-Day Money Back Guarantee</span>
              </div>
              <div className="flex items-center text-white">
                <CheckCircle className="w-5 h-5 mr-2 text-green-300" />
                <span>Cancel Anytime</span>
              </div>
            </div>
            
            <Button 
              size="lg" 
              className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
              onClick={() => document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Get Started Today
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            
            <p className="text-purple-200 text-sm mt-4">
              Start your funding journey in less than 2 minutes
            </p>
          </div>
        </div>
      </div>

      {/* Enhanced Footer */}
      <div className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Score Machine</h3>
              <p className="text-gray-400 mb-4">
                Helping people achieve financial freedom through improved credit scores since 2015.
              </p>
              <div className="flex space-x-4">
                <div className="bg-gray-800 rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-700 transition-colors">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="bg-gray-800 rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-700 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="bg-gray-800 rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-700 transition-colors">
                  <Phone className="w-5 h-5" />
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-gray-400">
                <li className="hover:text-white transition-colors cursor-pointer">Credit Report Analysis</li>
                <li className="hover:text-white transition-colors cursor-pointer">Dispute Management</li>
                <li className="hover:text-white transition-colors cursor-pointer">Credit Monitoring</li>
                <li className="hover:text-white transition-colors cursor-pointer">Financial Education</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li className="hover:text-white transition-colors cursor-pointer">Help Center</li>
                <li className="hover:text-white transition-colors cursor-pointer">Contact Us</li>
                <li className="hover:text-white transition-colors cursor-pointer">Live Chat</li>
                <li className="hover:text-white transition-colors cursor-pointer">FAQ</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li className="hover:text-white transition-colors cursor-pointer">Privacy Policy</li>
                <li className="hover:text-white transition-colors cursor-pointer">Terms of Service</li>
                <li className="hover:text-white transition-colors cursor-pointer">CCPA Compliance</li>
                <li className="hover:text-white transition-colors cursor-pointer">Security</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 mb-4 md:mb-0">
                {affiliateInfo && (
                  <span className="block mb-2">
                    This page was shared by {affiliateInfo.firstName} {affiliateInfo.lastName}
                    {affiliateInfo.companyName && ` from ${affiliateInfo.companyName}`}
                  </span>
                )}
                © 2025 Score Machine. All rights reserved.
              </p>
             
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AffiliateLanding;
