import React from "react";
import { Button } from "@/components/ui/button";
import BillingHistory from "@/components/BillingHistory";

interface BasicSubscriptionProps {
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

export default function BasicSubscription({
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
}: BasicSubscriptionProps) {
  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 bg-white border border-gray-300">
      
      {/* Header */}
      <div className="border-b border-gray-300 pb-4 mb-4">
        <h1 className="text-xl font-bold text-gray-900 uppercase">Subscription Management</h1>
        <p className="text-sm text-gray-600">Standard Billing & Plans</p>
      </div>

      {subscription && (
        <div className="border border-gray-300 mb-8">
          <div className="bg-gray-100 border-b border-gray-300 p-3 flex justify-between items-center">
            <h2 className="text-sm font-bold text-gray-800 uppercase">Current Subscription</h2>
            <div className="text-xs uppercase font-bold">{getStatusBadge(subscription.status)}</div>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Plan Details</div>
              <div className="text-2xl font-bold text-gray-900">{subscription.plan.name}</div>
              <div className="text-lg font-mono text-gray-700">${subscription.plan.price} / {subscription.billing_cycle}</div>
            </div>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span className="font-semibold uppercase text-xs text-gray-500">Period Start</span>
                <span>{new Date(subscription.current_period_start).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span className="font-semibold uppercase text-xs text-gray-500">Next Billing</span>
                <span>{new Date(subscription.current_period_end).toLocaleDateString()}</span>
              </div>
              {subscription.cancel_at_period_end && (
                <div className="bg-red-50 text-red-700 p-2 text-xs border border-red-200 font-semibold uppercase mt-2">
                  Cancels on {new Date(subscription.current_period_end).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
          {subscription.status === 'active' && !subscription.cancel_at_period_end && (
            <div className="bg-gray-50 border-t border-gray-300 p-3 text-right">
              <button onClick={handleOpenCancelDialog} className="text-xs text-red-600 hover:text-red-800 font-bold uppercase underline">
                Cancel Subscription
              </button>
            </div>
          )}
        </div>
      )}

      {/* Available Plans */}
      <div className="border border-gray-300 mb-8">
        <div className="bg-gray-100 border-b border-gray-300 p-3 flex justify-between items-center">
          <h2 className="text-sm font-bold text-gray-800 uppercase">Available Plans</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => setBillingFilter('monthly')} 
              className={`text-xs font-bold uppercase px-3 py-1 border ${billingFilter === 'monthly' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-300'}`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setBillingFilter('yearly')} 
              className={`text-xs font-bold uppercase px-3 py-1 border ${billingFilter === 'yearly' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-300'}`}
            >
              Yearly
            </button>
          </div>
        </div>
        
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          {availablePlans.filter(p => p.billing_cycle === billingFilter).map((plan) => (
            <div key={plan.id} className={`border p-4 flex flex-col ${plan.popular ? 'border-black shadow-md relative' : 'border-gray-300'}`}>
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-black text-white text-[10px] font-bold uppercase px-2 py-1">
                  Popular
                </div>
              )}
              <h3 className="text-lg font-bold text-gray-900 uppercase">{plan.name}</h3>
              <div className="text-2xl font-mono font-bold my-2">${plan.price}<span className="text-sm text-gray-500 font-sans">/{plan.billing_cycle === 'monthly' ? 'mo' : 'yr'}</span></div>
              <p className="text-xs text-gray-600 mb-4 h-10">{plan.description}</p>
              
              <ul className="text-sm text-gray-700 space-y-2 mb-6 flex-grow">
                {plan.features.map((feature: string, i: number) => (
                  <li key={i} className="flex gap-2 items-start">
                    <span className="text-black font-bold">+</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <div className="mt-auto border-t border-gray-200 pt-4">
                <label className="flex items-center gap-2 mb-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={recurringConsent} 
                    onChange={(e) => setRecurringConsent(e.target.checked)}
                    className="border-gray-400"
                  />
                  <span className="text-xs font-semibold text-gray-700 uppercase">I Agree to Recurring Billing</span>
                </label>
                <button
                  disabled={!recurringConsent || upgrading || (subscription?.plan_id === plan.id && subscription?.status !== 'canceled')}
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`w-full py-2 text-xs font-bold uppercase border ${
                    !recurringConsent || upgrading || (subscription?.plan_id === plan.id && subscription?.status !== 'canceled')
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-black text-white border-black hover:bg-gray-800'
                  }`}
                >
                  {upgrading ? 'Processing...' : subscription?.plan_id === plan.id && subscription?.status !== 'canceled' ? 'Current Plan' : 'Select Plan'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-gray-300">
        <div className="bg-gray-100 border-b border-gray-300 p-3">
          <h2 className="text-sm font-bold text-gray-800 uppercase">Billing History</h2>
        </div>
        <div className="p-4">
          <BillingHistory />
        </div>
      </div>

    </div>
  );
}
