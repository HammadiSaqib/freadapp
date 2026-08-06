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

const normalizePlanName = (plan: any) => String(plan?.name || '').trim().toLowerCase();

const isBasicPlan = (plan: any) => normalizePlanName(plan).includes('basic');

const isUpgradePlan = (plan: any) => {
  const name = normalizePlanName(plan);
  return name.includes('elite') || name.includes('pro') || name.includes('professional');
};

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
  const filteredPlans = availablePlans.filter((plan) => plan.billing_cycle === billingFilter);
  const basicPlans = filteredPlans.filter(isBasicPlan);
  const upgradePlans = filteredPlans.filter((plan) => isUpgradePlan(plan) && !isBasicPlan(plan));

  const renderPlanCard = (plan: any, sectionType: 'basic' | 'upgrade') => {
    const isCurrentPlan = subscription?.plan_id === plan.id && subscription?.status !== 'canceled';
    const isDisabled = !recurringConsent || upgrading || isCurrentPlan;
    const isUpgrade = sectionType === 'upgrade';

    return (
      <div
        key={plan.id}
        className={`relative flex h-full flex-col rounded-[24px] border p-5 ${
          plan.popular || isUpgrade
            ? 'border-sky-300 bg-gradient-to-br from-sky-50 to-emerald-50 shadow-[0_16px_40px_rgba(125,211,252,0.18)] dark:border-sky-500/20 dark:from-slate-900 dark:to-slate-950 dark:shadow-none'
            : 'border-sky-100/80 bg-white/90 dark:border-slate-800 dark:bg-slate-950/80'
        }`}
      >
        {(plan.popular || isUpgrade) && (
          <div className="absolute right-4 top-4 rounded-full border border-sky-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700 dark:border-sky-500/20 dark:bg-slate-900 dark:text-sky-300">
            {isUpgrade ? 'Upgrade' : 'Popular'}
          </div>
        )}
        <div className="space-y-3">
          <h3 className="pr-24 text-lg font-black uppercase tracking-[0.08em] text-slate-900 dark:text-white">{plan.name}</h3>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            ${plan.price}
            <span className="ml-1 text-sm font-medium text-slate-500 dark:text-slate-400">/{plan.billing_cycle === 'monthly' ? 'mo' : 'yr'}</span>
          </div>
          <p className="min-h-[2.5rem] text-sm text-slate-600 dark:text-slate-300">{plan.description}</p>
        </div>

        <ul className="mb-6 mt-5 flex-grow space-y-3 text-sm text-slate-700 dark:text-slate-300">
          {plan.features.map((feature: string, index: number) => (
            <li key={index} className="flex gap-3">
              <span className="font-black text-sky-600 dark:text-sky-300">+</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto border-t border-sky-100/80 pt-4 dark:border-slate-800">
          <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-sky-100/80 bg-sky-50/60 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
            <input
              type="checkbox"
              checked={recurringConsent}
              onChange={(e) => setRecurringConsent(e.target.checked)}
              className="mt-0.5 border-slate-400"
            />
            <span className="text-xs font-semibold uppercase tracking-[0.14em]">I Agree to Recurring Billing</span>
          </label>
          <button
            disabled={isDisabled}
            onClick={() => handleSelectPlan(plan.id)}
            className={`inline-flex w-full items-center justify-center rounded-xl border px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] transition-all ${
              isDisabled
                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500'
                : 'border-sky-300 bg-gradient-to-r from-sky-500 to-emerald-400 text-white shadow-sm shadow-sky-200 hover:brightness-105 dark:border-sky-500/20 dark:shadow-none'
            }`}
          >
            {upgrading
              ? 'Processing...'
              : isCurrentPlan
                ? 'Current Plan'
                : plan.price === 1 || plan.name.toLowerCase().includes('trial')
                  ? 'Start Your 7-Day Free Trial for $1'
                  : isUpgrade
                    ? 'Upgrade Plan'
                    : 'Select Plan'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="basic-admin-page-shell">
      <div className="basic-admin-page-hero">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <span className="basic-admin-page-badge">Basic billing center</span>
            <div className="space-y-2">
              <h1 className="basic-admin-page-title">Subscription Management</h1>
              <p className="basic-admin-page-description">
                Review your current plan, compare upgrade options, and keep billing history close without the old plain shell.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="basic-admin-page-pill">Billing mode: {billingFilter}</div>
            {subscription && <div className="basic-admin-page-pill">Current plan: {subscription.plan.name}</div>}
          </div>
        </div>
      </div>

      {subscription && (
        <div className="basic-admin-page-panel space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <span className="basic-admin-page-badge">Current subscription</span>
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">{subscription.plan.name}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">{subscription.plan.price} / {subscription.billing_cycle}</p>
              </div>
            </div>
            <div>{getStatusBadge(subscription.status)}</div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="basic-admin-page-section space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Plan details</div>
              <div className="text-3xl font-black text-slate-900 dark:text-white">${subscription.plan.price}</div>
              <div className="text-sm text-slate-600 dark:text-slate-300">Billed per {subscription.billing_cycle}</div>
            </div>
            <div className="basic-admin-page-section space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <div className="flex justify-between border-b border-sky-100/80 pb-2 dark:border-slate-800">
                <span className="font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Period Start</span>
                <span>{new Date(subscription.current_period_start).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between border-b border-sky-100/80 pb-2 dark:border-slate-800">
                <span className="font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Next Billing</span>
                <span>{new Date(subscription.current_period_end).toLocaleDateString()}</span>
              </div>
              {subscription.cancel_at_period_end && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 dark:border-rose-500/20 dark:bg-rose-950/20 dark:text-rose-300">
                  Cancels on {new Date(subscription.current_period_end).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          {subscription.status === 'active' && !subscription.cancel_at_period_end && (
            <div className="flex justify-end">
              <button
                onClick={handleOpenCancelDialog}
                className="text-xs font-bold uppercase tracking-[0.16em] text-rose-600 transition-colors hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-200"
              >
                Cancel Subscription
              </button>
            </div>
          )}
        </div>
      )}

      <div className="basic-admin-page-panel space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Available Plans</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Manage Basic separately, or choose Pro and Elite if you want to upgrade.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setBillingFilter('monthly')}
              className={billingFilter === 'monthly' ? 'basic-admin-page-tab-active' : 'basic-admin-page-tab'}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingFilter('yearly')}
              className={billingFilter === 'yearly' ? 'basic-admin-page-tab-active' : 'basic-admin-page-tab'}
            >
              Yearly
            </button>
          </div>
        </div>

        <div className="space-y-8">
          <section className="space-y-4">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Basic Plan</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Keep or start the Basic plan for the Basic dashboard.</p>
            </div>
            {basicPlans.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {basicPlans.map((plan) => renderPlanCard(plan, 'basic'))}
              </div>
            ) : (
              <div className="basic-admin-page-section p-6 text-sm text-slate-600 dark:text-slate-300">
                No {billingFilter} Basic plan is available right now.
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Upgrade to Pro or Elite</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Choose one of these plans when you are ready to move beyond Basic.</p>
            </div>
            {upgradePlans.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {upgradePlans.map((plan) => renderPlanCard(plan, 'upgrade'))}
              </div>
            ) : (
              <div className="basic-admin-page-section p-6 text-sm text-slate-600 dark:text-slate-300">
                No {billingFilter} Pro or Elite upgrade plan is available right now.
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="basic-admin-page-panel space-y-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Billing History</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Past charges and payment records for the active account.</p>
        </div>
        <div className="basic-admin-page-section">
          <BillingHistory />
        </div>
      </div>
    </div>
  );
}
