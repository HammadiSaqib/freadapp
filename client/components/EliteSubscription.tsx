import React from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  Crown,
  CheckCircle,
  Clock,
  XCircle,
  Star,
  TrendingUp,
  Users,
  Shield,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import BillingHistory from "@/components/BillingHistory";

interface EliteSubscriptionProps {
  subscription: any;
  availablePlans: any[];
  billingFilter: 'monthly' | 'yearly';
  setBillingFilter: (val: 'monthly' | 'yearly') => void;
  recurringConsent: boolean;
  setRecurringConsent: (val: boolean) => void;
  upgrading: boolean;
  handleSelectPlan: (planId: string) => void;
  handleOpenCancelDialog: () => void;
  navigate: (url: string) => void;
  getStatusBadge: (status: string) => React.ReactNode;
}

export default function EliteSubscription({
  subscription,
  availablePlans,
  billingFilter,
  setBillingFilter,
  recurringConsent,
  setRecurringConsent,
  upgrading,
  handleSelectPlan,
  handleOpenCancelDialog,
  navigate,
  getStatusBadge
}: EliteSubscriptionProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="elite-page-shell">
        {/* Background Electric Glows */}
      <div className="elite-page-glow-primary"></div>
      <div className="elite-page-glow-secondary" style={{ animationDelay: "2s" }}></div>

        <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-[1600px] mx-auto space-y-8 relative z-10 elite-nested-wrapper">
          
          {/* Current Subscription Elite Card */}
          {subscription && (
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-3xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#77dd77]/10 to-[#004225]/10 rounded-full blur-3xl -translate-y-16 translate-x-16 pointer-events-none"></div>
                <CardHeader className="relative pb-4 border-b border-slate-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-[#77dd77] to-[#004225] rounded-2xl text-white shadow-[0_0_15px_rgba(27,139,0,0.28)]">
                        <Crown className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-black text-slate-800 flex items-center gap-2">
                          {subscription.plan.name} Plan
                        </CardTitle>
                        <CardDescription className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">
                          Active Elite Subscription
                        </CardDescription>
                      </div>
                    </div>
                    <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                      {subscription.status}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6 relative">
                  <div className="grid lg:grid-cols-3 gap-6">
                    {/* Price and Dates */}
                    <div className="lg:col-span-1 space-y-4">
                      <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
                        <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 dark:from-white to-[#77dd77] mb-1">
                          ${subscription.plan.price}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">per {subscription.billing_cycle}</div>
                      </div>
                      
                      <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-blue-50 rounded-lg"><Clock className="h-3.5 w-3.5 text-blue-500" /></div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Started</div>
                            <div className="text-xs font-bold text-slate-700">{new Date(subscription.current_period_start).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-emerald-50 rounded-lg"><TrendingUp className="h-3.5 w-3.5 text-emerald-500" /></div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Next billing</div>
                            <div className="text-xs font-bold text-slate-700">{new Date(subscription.current_period_end).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Elite Features */}
                    <div className="lg:col-span-2 bg-slate-50/30 p-6 rounded-2xl border border-slate-100">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4">
                        <Shield className="h-4 w-4 text-[#77dd77]" />
                        Elite Access Granted
                      </h4>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {subscription.plan.features.map((feature: string, index: number) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                            <div className="p-1 bg-gradient-to-br from-[#77dd77]/10 to-[#004225]/10 rounded-full">
                              <CheckCircle className="h-3.5 w-3.5 text-[#004225]" />
                            </div>
                            <span className="text-xs font-bold text-slate-600">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3 pt-6 mt-6 border-t border-slate-50">
                    {subscription.status === 'pending' && (
                      <Button 
                        onClick={() => navigate('/pricing')}
                        className="bg-gradient-to-r from-[#004225] to-[#77dd77] text-white font-black border-0 shadow-[0_0_15px_rgba(27,139,0,0.28)] hover:shadow-[0_0_25px_rgba(119,221,119,0.28)] rounded-xl uppercase tracking-wider transition-all h-12 px-6"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Complete Payment
                      </Button>
                    )}
                    
                    {subscription.status === 'active' && !subscription.cancel_at_period_end && (
                      <Button 
                        onClick={handleOpenCancelDialog}
                        disabled={upgrading}
                        variant="outline"
                        className="border-red-100 bg-red-50/50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-xl font-bold uppercase tracking-wider h-12 px-6 transition-all"
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
                    <div className="mt-4 p-4 bg-orange-50 border border-orange-100 rounded-xl">
                      <p className="text-xs font-bold text-orange-800 flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        Your subscription will be canceled at the end of the current billing period on {new Date(subscription.current_period_end).toLocaleDateString()}.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Elite Plans Selection */}
          <motion.div variants={itemVariants} className="space-y-6 pt-8">
            <div className="text-center mb-10">
              <Badge variant="outline" className="mb-4 border-[#1B8B00]/20 text-[#004225] bg-green-50 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                Upgrade Path
              </Badge>
              <h2 className="text-3xl font-black text-slate-900 mb-2">Elevate Your Business</h2>
              <p className="text-sm font-bold text-slate-500">Select the premium tier that fits your growth</p>
            </div>

            <div className="flex justify-center mb-8">
              <Tabs value={billingFilter} onValueChange={(val) => setBillingFilter(val as 'monthly' | 'yearly')} className="w-full max-w-xs">
                <TabsList className="h-14 w-full bg-white border border-slate-100 rounded-2xl shadow-sm p-1">
                  <TabsTrigger value="monthly" className="w-1/2 rounded-xl text-xs font-bold uppercase tracking-wider data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-900 data-[state=active]:to-slate-800 data-[state=active]:text-white">Monthly</TabsTrigger>
                  <TabsTrigger value="yearly" className="w-1/2 rounded-xl text-xs font-bold uppercase tracking-wider data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-900 data-[state=active]:to-slate-800 data-[state=active]:text-white">Yearly</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {availablePlans.filter((p) => p.billing_cycle === billingFilter).map((plan) => {
                const isCurrentPlan = subscription?.plan_name === plan.name && subscription?.billing_cycle === plan.billing_cycle && subscription?.status === 'active';
                const isPendingPlan = subscription?.plan_name === plan.name && subscription?.billing_cycle === plan.billing_cycle && subscription?.status === 'pending';
                
                return (
                  <Card key={plan.id} className={`relative border border-slate-100 rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-2 bg-white ${plan.popular ? 'shadow-[0_20px_50px_rgba(112,0,255,0.15)] scale-105 z-10' : 'shadow-sm hover:shadow-xl'}`}>
                    {plan.popular && (
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#004225] via-[#1B8B00] to-[#77dd77]"></div>
                    )}
                    {plan.popular && (
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-gradient-to-r from-[#1B8B00] to-[#77dd77] text-white font-bold border-0 shadow-[0_0_10px_rgba(27,139,0,0.25)] text-[9px] uppercase tracking-widest px-3 py-1">
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    
                    <CardHeader className={`text-center pb-8 pt-8 ${plan.popular ? 'bg-[#040816] text-white relative overflow-hidden' : 'bg-white'}`}>
                      {plan.popular && <div className="absolute inset-0 bg-gradient-to-br from-[#2a0c66] via-[#00000b] to-[#00000b] pointer-events-none z-0"></div>}
                      
                      <div className={`relative z-10 mx-auto p-4 rounded-2xl w-fit mb-4 ${plan.popular ? 'bg-white/8 backdrop-blur-md border border-white/10' : 'bg-slate-50 text-slate-700'}`}>
                        {plan.icon || <Crown className="h-6 w-6" />}
                      </div>
                      
                      <CardTitle className={`relative z-10 text-2xl font-black ${plan.popular ? 'text-white' : 'text-slate-900'}`}>{plan.name}</CardTitle>
                      <CardDescription className={`relative z-10 text-xs font-bold uppercase tracking-widest mt-2 ${plan.popular ? 'text-slate-200' : 'text-slate-500'}`}>{plan.description}</CardDescription>
                      
                      <div className="relative z-10 mt-6">
                        <span className={`text-5xl font-black ${plan.popular ? 'text-transparent bg-clip-text bg-gradient-to-r from-[#004225] to-[#77dd77]' : 'text-slate-900'}`}>
                          ${plan.price}
                        </span>
                        <span className={`text-xs font-bold uppercase tracking-widest ml-2 ${plan.popular ? 'text-slate-200' : 'text-slate-400'}`}>
                          / {plan.billing_cycle}
                        </span>
                      </div>
                    </CardHeader>
                    
                    <CardContent className={`space-y-6 pt-8 pb-8 ${plan.popular ? 'bg-white' : ''}`}>
                      <ul className="space-y-4">
                        {plan.features.map((feature: string, index: number) => (
                          <li key={index} className="flex items-start gap-3">
                            <div className={`p-1 rounded-full flex-shrink-0 mt-0.5 ${plan.popular ? 'bg-emerald-50 text-[#004225]' : 'bg-green-50 text-[#1B8B00]'}`}>
                              <CheckCircle className="h-3 w-3" />
                            </div>
                            <span className="text-sm font-bold text-slate-600">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="border-t border-slate-100 pt-6 space-y-3">
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Max Users</span>
                          <span className="text-xs font-black text-slate-800">{plan.max_users ?? 'Unlimited'}</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Max Clients</span>
                          <span className="text-xs font-black text-slate-800">{plan.max_clients ?? 'Unlimited'}</span>
                        </div>
                      </div>
                      
                      <div className="pt-6 space-y-4">
                        {!isCurrentPlan && !isPendingPlan && (
                          <div className="flex items-start gap-3 border-t border-slate-100 pt-4">
                            <Checkbox
                              id={`recurring-consent-${plan.id}`}
                              checked={recurringConsent}
                              onCheckedChange={(checked) => setRecurringConsent(checked === true)}
                              className="mt-1"
                            />
                            <Label htmlFor={`recurring-consent-${plan.id}`} className="text-xs font-bold text-slate-600 leading-relaxed cursor-pointer">
                              By checking this box, I agree that my account will be automatically charged on a recurring basis until I cancel.
                            </Label>
                          </div>
                        )}
                        {isCurrentPlan ? (
                          <Button disabled className="w-full bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-50 opacity-100 rounded-xl font-black uppercase tracking-wider h-12">
                            <CheckCircle className="h-4 w-4 mr-2" /> Current Plan
                          </Button>
                        ) : isPendingPlan ? (
                          <Button onClick={() => navigate('/subscription')} className="w-full bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100 rounded-xl font-black uppercase tracking-wider h-12 transition-all">
                            <CreditCard className="h-4 w-4 mr-2" /> Complete Payment
                          </Button>
                        ) : (
                          <Button 
                            onClick={() => handleSelectPlan(plan.id)}
                            disabled={upgrading || !recurringConsent}
                            className={`w-full h-12 rounded-xl font-black uppercase tracking-wider transition-all ${
                              plan.popular 
                                ? 'bg-gradient-to-r from-[#004225] to-[#77dd77] text-white shadow-[0_0_15px_rgba(27,139,0,0.28)] hover:shadow-[0_0_25px_rgba(119,221,119,0.28)] border-0' 
                                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-md'
                            }`}
                          >
                            {upgrading ? (
                              <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                              <>
                                {plan.price === 1 || plan.name.toLowerCase().includes('trial') ? "Start Your 7-Day Free Trial for $1" : "Select Plan"} <ArrowRight className="h-4 w-4 ml-2" />
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </motion.div>

          {/* Billing History (Wrapped in Elite Theme) */}
          <motion.div variants={itemVariants} className="pt-8">
            <BillingHistory />
          </motion.div>

        </motion.div>
      </div>
  );
}
