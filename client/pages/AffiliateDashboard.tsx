import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { affiliateApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import AffiliateLayout from "@/components/AffiliateLayout";
import AffiliateLeaderboard from "@/components/AffiliateLeaderboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingUp,
  Users,
  Target,
  Timer,
  Crown,
  Link,
  BarChart3,
  Activity,
  Clock,
  X,
  Zap,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  CreditCard,
  Calendar,
  TrendingDown,
  Award,
} from "lucide-react";

interface EarningsStats {
  totalEarnings: number;
  monthlyEarnings: number;
  yearlyEarnings?: number;
  commissionRate?: number;
  totalReferrals?: number;
  pendingCommissions: number;
  paidCommissions: number;
  conversionRate: string | number;
  avgCommission: number;
  planType?: string;
  actualPlanName?: string;
  subscriptionStatus?: string;
  paidReferralsCount?: number;
  currentTierRate?: number;
  tierInfo?: {
    currentTier: string;
    nextTier: string;
    progressToNext: number;
    referralsToNext: number;
  };
  nonRenewalsCount?: number;
  nonRenewalsAmount?: number;
  lostCommissionAmount?: number;
  estimatedLostCommission?: number;
  atRiskReferrals?: number;
  pendingSignupCount?: number;
  churnedReferrals?: number;
  churnedCommission?: number;
  lastPayment?: { amount: number; date: string };
  nextPayment?: { date: string; status: string };
  paymentMethod?: string;
  totalEarningsChange?: { percentage: number; period: string };
  conversionRateChange?: { percentage: number; period: string };
  currentMonthReferralLeads?: number;
  currentMonthConversionCount?: number;
  currentMonthConversionRate?: number;
  currentMonthAverageCommission?: number;
  currentMonthPaidCommissionCount?: number;
  activePayingClients?: number;
  unpaidClients?: number;
  cancelledClients?: number;
  totalPayouts?: number;
  lastPayoutDate?: string | null;
  currentMRR?: number;
  mrrBase?: number;
}

interface TierInfo {
  currentTier: string;
  nextTier: string;
  progressToNext: number;
  referralsToNext: number;
}

interface RecentReferral {
  id: string;
  customerName: string;
  email: string;
  status: "pending" | "paid" | "cancelled" | "churned" | "unpaid";
  commission: number;
  dateReferred: string;
  conversionDate?: string;
  transactionId?: string;
  planName?: string;
  planValue?: number;
  subscriptionStatus?: string;
  isStripePaid?: boolean;
  lastPaymentDate?: string;
  lastTransactionId?: string;
}

interface ReferralListItem {
  id: string;
  status: "pending" | "paid" | "cancelled" | "churned" | "unpaid" | "expired";
  signupDate?: string;
}

interface ReferralPurchaseItem {
  id: string;
  amount: number;
  createdAt: string;
  commissionEarned: number;
}

const getStartOfMonth = (monthOffset: number = 0) => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() + monthOffset, 1);
};

const calculatePercentageChange = (currentValue: number, previousValue: number) => {
  if (previousValue > 0) {
    return Number((((currentValue - previousValue) / previousValue) * 100).toFixed(1));
  }

  return currentValue > 0 ? 100 : 0;
};

const getTierProgress = (planType?: string, subscriptionStatus?: string | null, paidReferralsCount: number = 0) => {
  const normalizedPlanType = String(planType || "").toLowerCase();
  const hasPaidPlan = subscriptionStatus === "active" || ["paid_partner", "partner", "pro", "premium"].includes(normalizedPlanType);

  if (!hasPaidPlan || normalizedPlanType === "free" || normalizedPlanType === "starter") {
    if (paidReferralsCount >= 100) {
      return {
        currentTierRate: 15,
        tierInfo: {
          currentTier: "Free - Advanced",
          nextTier: "Upgrade to Pro Partner for higher rates",
          progressToNext: 100,
          referralsToNext: 0,
        } satisfies TierInfo,
      };
    }

    return {
      currentTierRate: 10,
      tierInfo: {
        currentTier: "Free - Starter",
        nextTier: "Free - Advanced (15%)",
        progressToNext: paidReferralsCount,
        referralsToNext: Math.max(100 - paidReferralsCount, 0),
      } satisfies TierInfo,
    };
  }

  if (paidReferralsCount >= 100) {
    return {
      currentTierRate: 25,
      tierInfo: {
        currentTier: "Pro - Premium",
        nextTier: "Maximum tier reached",
        progressToNext: 100,
        referralsToNext: 0,
      } satisfies TierInfo,
    };
  }

  return {
    currentTierRate: 20,
    tierInfo: {
      currentTier: "Pro - Standard",
      nextTier: "Pro - Premium (25%)",
      progressToNext: paidReferralsCount,
      referralsToNext: Math.max(100 - paidReferralsCount, 0),
    } satisfies TierInfo,
  };
};

// Animated count-up number component
function AnimatedNumber({ value, prefix = "", suffix = "", decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) { setDisplay(0); return; }
    const duration = 900;
    const stepTime = 16;
    const steps = Math.ceil(duration / stepTime);
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (end - start) * eased);
      if (step >= steps) { setDisplay(end); clearInterval(timer); }
    }, stepTime);
    return () => clearInterval(timer);
  }, [value]);
  const fmt = decimals > 0
    ? display.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : Math.round(display).toLocaleString("en-US");
  return <span>{prefix}{fmt}{suffix}</span>;
}

function SkeletonPill() {
  return <div className="h-8 w-24 bg-gray-200 rounded-lg animate-pulse" />;
}

export default function AffiliateDashboard() {
  const formatCurrency = (v: number | null | undefined) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v ?? 0);
  const formatCount = (v: number | null | undefined) =>
    new Intl.NumberFormat("en-US").format(v ?? 0);
  const formatPercentage = (v: number | string | null | undefined) => {
    if (v === null || v === undefined) return "0%";
    if (typeof v === "number") return `${v}%`;
    const t = v.trim();
    if (!t) return "0%";
    if (t.endsWith("%")) return t;
    const n = Number(t);
    return Number.isNaN(n) ? "0%" : `${n}%`;
  };

  const [earningsStats, setEarningsStats] = useState<EarningsStats>({
    totalEarnings: 0, monthlyEarnings: 0, yearlyEarnings: 0,
    pendingCommissions: 0, paidCommissions: 0, conversionRate: "0%", avgCommission: 0,
    nonRenewalsCount: 0, nonRenewalsAmount: 0, lostCommissionAmount: 0, estimatedLostCommission: 0,
    atRiskReferrals: 0, pendingSignupCount: 0, churnedReferrals: 0, churnedCommission: 0,
    currentMonthReferralLeads: 0, currentMonthConversionCount: 0, currentMonthConversionRate: 0,
    currentMonthAverageCommission: 0, currentMonthPaidCommissionCount: 0,
  });
  const [recentReferrals, setRecentReferrals] = useState<RecentReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [hideUpgradeSection, setHideUpgradeSection] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const { userProfile } = useAuthContext();
  const subscriptionStatus = useSubscriptionStatus();
  const navigate = useNavigate();

  useEffect(() => {
    const isHidden = localStorage.getItem("hidePartnerUpgrade") === "true";
    setHideUpgradeSection(isHidden);
  }, []);

  const handleDontShowAgain = () => {
    localStorage.setItem("hidePartnerUpgrade", "true");
    setHideUpgradeSection(true);
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsResponse, refResp, referralsResponse, purchasesResponse] = await Promise.all([
          affiliateApi.getStats(),
          affiliateApi.getRecentReferrals(10),
          affiliateApi.getReferrals(),
          affiliateApi.getReferralPurchases().catch(() => null),
        ]);

        const statsData = statsResponse.data?.success ? statsResponse.data.data : null;
        let nextStatsPatch: Partial<EarningsStats> = {};

        if (statsData) {
          const d = statsData;
          const total = d.totalReferrals || 0;
          const baseStats: EarningsStats = {
            totalEarnings: d.totalEarnings || 0,
            monthlyEarnings: d.monthlyEarnings || 0,
            yearlyEarnings: d.yearlyEarnings || 0,
            pendingCommissions: d.pendingCommissions || 0,
            paidCommissions: d.totalEarnings || 0,
            conversionRate: typeof d.conversionRate === "number" ? `${d.conversionRate}%` : (d.conversionRate || "0%"),
            avgCommission: total > 0 ? (d.totalEarnings || 0) / total : 0,
            planType: d.planType,
            paidReferralsCount: d.paidReferralsCount,
            currentTierRate: d.currentTierRate,
            tierInfo: d.tierInfo,
            pendingSignupCount: d.pendingSignupCount || 0,
            churnedReferrals: d.churnedReferrals || 0,
            churnedCommission: d.churnedCommission || 0,
            nonRenewalsCount: d.nonRenewalsCount || 0,
            nonRenewalsAmount: d.nonRenewalsAmount || 0,
            lostCommissionAmount: d.lostCommissionAmount || 0,
            estimatedLostCommission: d.estimatedLostCommission || 0,
            atRiskReferrals: d.atRiskReferrals || 0,
            lastPayment: d.lastPayment,
            nextPayment: d.nextPayment,
            paymentMethod: d.paymentMethod,
            totalEarningsChange: d.totalEarningsChange,
            conversionRateChange: d.conversionRateChange,
            totalReferrals: total,
            activePayingClients: d.activePayingClients || 0,
            unpaidClients: d.unpaidClients || 0,
            cancelledClients: d.cancelledClients || 0,
            totalPayouts: d.totalPayouts || 0,
            lastPayoutDate: d.lastPayoutDate || null,
            currentMRR: d.currentMRR || 0,
            mrrBase: d.mrrBase || 0,
          };
          setEarningsStats(baseStats);
        }

        if (refResp.data?.success) {
          const refs = refResp.data.data || [];
          setRecentReferrals(refs);
        }

        const referralRows: ReferralListItem[] = referralsResponse.data?.success ? (referralsResponse.data.data || []) : [];
        const purchaseRows: ReferralPurchaseItem[] = purchasesResponse?.data?.success ? (purchasesResponse.data.data || []) : [];
        const hasPurchaseData = Boolean(purchasesResponse?.data?.success);

        if (referralRows.length > 0 || hasPurchaseData) {
          const currentMonthStart = getStartOfMonth();
          const previousMonthStart = getStartOfMonth(-1);
          const paidReferralCount = referralRows.filter((row) => row.status === "paid").length;
          const pendingReferralCount = referralRows.filter((row) => row.status === "pending").length;
          const unpaidReferralCount = referralRows.filter((row) => row.status === "unpaid").length;
          const cancelledReferralCount = referralRows.filter((row) => row.status === "cancelled" || row.status === "churned").length;
          const totalReferralCount = referralRows.length;
          const currentMonthReferralLeads = referralRows.filter((row) => row.signupDate && new Date(row.signupDate) >= currentMonthStart).length;
          const { currentTierRate, tierInfo } = getTierProgress(statsData?.planType, statsData?.subscriptionStatus, paidReferralCount);

          nextStatsPatch = {
            totalReferrals: totalReferralCount,
            activePayingClients: paidReferralCount,
            pendingSignupCount: pendingReferralCount,
            unpaidClients: unpaidReferralCount,
            cancelledClients: cancelledReferralCount,
            paidReferralsCount: paidReferralCount,
            currentTierRate,
            tierInfo,
            currentMonthReferralLeads,
            conversionRate: totalReferralCount > 0 ? Number(((paidReferralCount / totalReferralCount) * 100).toFixed(1)) : 0,
          };

          if (hasPurchaseData) {
            const totalCommissionEarned = purchaseRows.reduce((sum, row) => sum + (Number(row.commissionEarned) || 0), 0);
            const payoutsSent = Number(statsData?.totalPayouts) || 0;
            const currentMonthPurchases = purchaseRows.filter((row) => {
              const purchaseDate = new Date(row.createdAt);
              return purchaseDate >= currentMonthStart;
            });
            const previousMonthPurchases = purchaseRows.filter((row) => {
              const purchaseDate = new Date(row.createdAt);
              return purchaseDate >= previousMonthStart && purchaseDate < currentMonthStart;
            });
            const monthlyCommissionEarned = currentMonthPurchases.reduce((sum, row) => sum + (Number(row.commissionEarned) || 0), 0);
            const priorMonthCommissionEarned = previousMonthPurchases.reduce((sum, row) => sum + (Number(row.commissionEarned) || 0), 0);
            const serverMonthlyEarnings = Number(statsData?.monthlyEarnings) || 0;
            const effectiveMonthlyCommissionEarned = Math.max(monthlyCommissionEarned, serverMonthlyEarnings);
            const latestPurchase = purchaseRows
              .slice()
              .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];
            const currentMonthConversionCount = currentMonthPurchases.length;
            const currentMonthConversionRate = currentMonthReferralLeads > 0 ? (currentMonthConversionCount / currentMonthReferralLeads) * 100 : 0;

            nextStatsPatch = {
              ...nextStatsPatch,
              totalEarnings: Number(totalCommissionEarned.toFixed(2)),
              monthlyEarnings: Number(effectiveMonthlyCommissionEarned.toFixed(2)),
              pendingCommissions: Number(Math.max(totalCommissionEarned - payoutsSent, 0).toFixed(2)),
              avgCommission: paidReferralCount > 0 ? Number((totalCommissionEarned / paidReferralCount).toFixed(2)) : 0,
              currentMonthAverageCommission: currentMonthConversionCount > 0 ? Number((effectiveMonthlyCommissionEarned / currentMonthConversionCount).toFixed(2)) : 0,
              currentMonthConversionCount,
              currentMonthConversionRate: Number(currentMonthConversionRate.toFixed(1)),
              totalEarningsChange: {
                percentage: calculatePercentageChange(effectiveMonthlyCommissionEarned, priorMonthCommissionEarned),
                period: "last month",
              },
              lastPayment: latestPurchase ? {
                amount: latestPurchase.commissionEarned,
                date: new Date(latestPurchase.createdAt).toLocaleDateString(),
              } : undefined,
            };
          }

          setEarningsStats((prev) => ({
            ...prev,
            ...nextStatsPatch,
          }));
        }
      } catch (e) {
        console.error("Dashboard fetch error:", e);
      } finally {
        setLoading(false);
        setTimeout(() => setDataLoaded(true), 100);
      }
    };
    fetchDashboardData();
  }, []);

  const statusConfig: Record<string, { label: string; dot: string; text: string; bg: string }> = {
    paid:      { label: "Paid",      dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
    pending:   { label: "Pending",   dot: "bg-amber-500",   text: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
    unpaid:    { label: "Unpaid",    dot: "bg-orange-500",  text: "text-orange-700",  bg: "bg-orange-50 border-orange-200" },
    cancelled: { label: "Cancelled", dot: "bg-red-500",     text: "text-red-700",     bg: "bg-red-50 border-red-200" },
    churned:   { label: "Churned",   dot: "bg-rose-500",    text: "text-rose-700",    bg: "bg-rose-50 border-rose-200" },
  };

  const hasActiveSubscription = subscriptionStatus.hasActiveSubscription || earningsStats?.subscriptionStatus === "active";
  const showUpgradeCTA = !subscriptionStatus.isLoading && !hasActiveSubscription && !hideUpgradeSection;
  const currentPlan = earningsStats?.actualPlanName || earningsStats?.planType;
  const canUpgrade = !currentPlan || currentPlan === "free" || currentPlan === "starter" || earningsStats?.planType === "free";
  const nextTierRate = earningsStats?.tierInfo?.nextTier === "Pro - Advanced" ? "15%" : "20-25%";

  const totalRef = earningsStats?.totalReferrals ?? 0;
  const active = earningsStats?.activePayingClients ?? 0;
  const pending = earningsStats?.pendingSignupCount ?? 0;
  const unpaid = earningsStats?.unpaidClients ?? 0;
  const cancelled = earningsStats?.cancelledClients ?? 0;
  const pipelineMax = Math.max(totalRef, 1);
  const commissionRateBadge = earningsStats?.currentTierRate ?? earningsStats?.commissionRate ?? 10;

  return (
    <AffiliateLayout title="Dashboard" description="Your affiliate command center">
      <div className="space-y-8 pb-8">

        {/* ── GAMIFIED HERO + TIER PROGRESS ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-[#0b1120] to-indigo-950 text-white shadow-2xl">
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-500/10 blur-[80px]" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-72 w-72 rounded-full bg-emerald-500/10 blur-[80px]" />
          <div className="pointer-events-none absolute right-1/3 bottom-0 h-48 w-48 rounded-full bg-purple-500/10 blur-[60px]" />

          <div className="relative px-6 sm:px-8 pt-8 pb-0">
            {/* Greeting row */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider mb-3">
                  <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
                  <span className="text-yellow-300">Partner Dashboard</span>
                </div>
                <h1 className="text-3xl lg:text-4xl font-black tracking-tight mb-1">
                  {userProfile?.first_name
                    ? `Let's go, ${userProfile.first_name} 🚀`
                    : "Let's go 🚀"}
                </h1>
                <p className="text-blue-300 text-sm mt-1">
                  {earningsStats?.tierInfo?.currentTier || "Free – Starter"} &nbsp;·&nbsp; <span className="text-white font-semibold">{earningsStats?.currentTierRate || 10}% commission</span>
                </p>
              </div>
              {earningsStats?.tierInfo && (
                <div className="flex-shrink-0 flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <Crown className="h-7 w-7 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
                  <div>
                    <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Current Rank</div>
                    <div className="text-lg font-black text-white">{earningsStats.tierInfo.currentTier}</div>
                  </div>
                  {earningsStats.tierInfo.referralsToNext > 0 && (
                    <div className="ml-2 border-l border-white/10 pl-3">
                      <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Next Rank</div>
                      <div className="text-sm font-bold text-amber-400">{earningsStats.tierInfo.nextTier}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Big Earnings Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* All-Time — biggest, spans 2 on lg */}
              <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-600/10 border border-emerald-500/25 p-6 hover:border-emerald-400/40 transition-all group">
                <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-emerald-400/10 blur-2xl" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 shadow-[0_0_16px_rgba(16,185,129,0.35)]">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest">All-Time Revenue</span>
                  <span className="ml-auto flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300">
                    {commissionRateBadge}% rate
                  </span>
                </div>
                <div className="text-5xl sm:text-6xl font-black text-white tracking-tight drop-shadow-lg">
                  {loading ? <SkeletonPill /> : <AnimatedNumber value={earningsStats.totalEarnings} prefix="$" decimals={2} />}
                </div>
                <p className="text-emerald-400 text-sm font-semibold mt-2">Total earned since joining</p>
              </div>

              {/* This Month */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500/20 to-blue-600/10 border border-sky-500/25 p-6 hover:border-sky-400/40 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-[0_0_16px_rgba(56,189,248,0.35)]">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs font-bold text-sky-300 uppercase tracking-widest">This Month</span>
                </div>
                <div className="text-4xl font-black text-white tracking-tight">
                  {loading ? <SkeletonPill /> : <AnimatedNumber value={earningsStats.monthlyEarnings} prefix="$" decimals={2} />}
                </div>
                <p className="text-sky-400 text-sm font-semibold mt-2">Monthly earnings</p>
              </div>

              {/* MRR */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/10 border border-violet-500/25 p-6 hover:border-violet-400/40 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-purple-700 shadow-[0_0_16px_rgba(139,92,246,0.35)]">
                    <Activity className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs font-bold text-violet-300 uppercase tracking-widest">Active MRR</span>
                </div>
                <div className="text-4xl font-black text-white tracking-tight">
                  {loading ? <SkeletonPill /> : <AnimatedNumber value={earningsStats.currentMRR ?? 0} prefix="$" decimals={2} />}
                </div>
                <p className="text-violet-400 text-sm font-semibold mt-2">Recurring revenue</p>
              </div>
            </div>

            {/* Milestone Progress Bar — only when tierInfo exists */}
            {earningsStats?.tierInfo && (
              <div className="mb-0 pb-8">
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Award className="h-5 w-5 text-amber-400" />
                      <h2 className="text-lg font-black text-white">Tier Progress</h2>
                    </div>
                    {earningsStats.tierInfo.referralsToNext > 0 ? (
                      <p className="text-gray-300 text-sm">
                        You're{" "}
                        <span className="text-yellow-400 font-black text-base">
                          {Math.round(earningsStats.tierInfo.progressToNext)}% there!
                        </span>
                        {" "}Only{" "}
                        <span className="text-white font-bold">{earningsStats.tierInfo.referralsToNext} more paid referrals</span>
                        {" "}to reach{" "}
                        <span className="text-amber-400 font-bold">{earningsStats.tierInfo.nextTier}</span>.
                      </p>
                    ) : (
                      <p className="text-emerald-400 font-black text-base">🏆 Max Tier Achieved — you're at the top!</p>
                    )}
                  </div>
                  <div className="flex items-center gap-6 text-center">
                    <div>
                      <div className="text-3xl font-black text-white">{earningsStats.paidReferralsCount || 0}</div>
                      <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Paid Referrals</div>
                    </div>
                    <div>
                      <div className="text-3xl font-black text-emerald-400">{earningsStats.currentTierRate || 10}%</div>
                      <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Commission Rate</div>
                    </div>
                  </div>
                </div>

                {/* The giant bar with milestone markers */}
                <div className="relative">
                  {/* Milestone number labels — above bar */}
                  <div className="relative h-8 mb-1">
                    {[25, 50, 75, 100].map((m) => {
                      const reached = (earningsStats.paidReferralsCount || 0) >= m;
                      return (
                        <div
                          key={m}
                          className="absolute flex flex-col items-center"
                          style={{ left: `${m}%`, transform: "translateX(-50%)" }}
                        >
                          <span className={`text-sm font-black transition-all ${
                            reached
                              ? "text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.9)] scale-110"
                              : "text-gray-600"
                          }`}>{m}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bar track */}
                  <div className="relative h-8 bg-white/5 rounded-full border border-white/10 overflow-hidden shadow-inner">
                    {/* Milestone tick lines inside bar */}
                    {[25, 50, 75].map((m) => (
                      <div
                        key={m}
                        className="absolute top-0 bottom-0 w-px bg-white/20 z-10"
                        style={{ left: `${m}%` }}
                      />
                    ))}

                    {/* Fill */}
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 transition-all duration-[1200ms] ease-out relative"
                      style={{ width: `${Math.min(Math.max(((earningsStats.paidReferralsCount || 0) / 100) * 100, earningsStats.tierInfo.referralsToNext > 0 ? Math.max(earningsStats.tierInfo.progressToNext, 2) : 100), 100)}%` }}
                    >
                      {/* Glow pulse */}
                      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white/30 rounded-full" />
                      {/* Shimmer */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full animate-[shimmer_2s_ease-in-out_infinite]" style={{ backgroundSize: "200% 100%" }} />
                    </div>
                  </div>

                  {/* Milestone dot markers below bar */}
                  <div className="relative h-6 mt-1">
                    {[25, 50, 75, 100].map((m) => {
                      const reached = (earningsStats.paidReferralsCount || 0) >= m;
                      return (
                        <div
                          key={m}
                          className="absolute flex flex-col items-center"
                          style={{ left: `${m}%`, transform: "translateX(-50%)" }}
                        >
                          <div className={`h-3 w-3 rounded-full border-2 transition-all duration-500 ${
                            reached
                              ? "bg-yellow-400 border-yellow-300 shadow-[0_0_8px_rgba(250,204,21,1)]"
                              : "bg-gray-800 border-gray-600"
                          }`} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>



        {/* ── UPGRADE CTA (if applicable) ── moved here ── */}
        {showUpgradeCTA && canUpgrade && (
          <div className="relative overflow-hidden rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 via-fuchsia-50 to-pink-50 px-6 py-5 shadow-sm">
            <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-purple-200/40 blur-2xl" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 shadow-md">
                  <Crown className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-purple-900">Unlock the Partner Program</p>
                  <p className="text-sm text-purple-600">Earn up to {nextTierRate} commission with co-marketing &amp; advanced support</p>
                  {earningsStats?.tierInfo?.referralsToNext ? (
                    <p className="text-xs text-fuchsia-600 font-medium mt-0.5">
                      Only {earningsStats.tierInfo.referralsToNext} more referrals to unlock {earningsStats.tierInfo.nextTier}!
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button onClick={() => navigate("/affiliate/subscription")} className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white shadow-md">
                  Upgrade Now <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                <button onClick={handleDontShowAgain} className="p-1.5 rounded-full text-purple-400 hover:text-purple-600 hover:bg-purple-100 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CLIENT PIPELINE + FINANCIAL CARDS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Client Pipeline — spanning 2 cols */}
          <div className="lg:col-span-2 rounded-2xl bg-white border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Client Pipeline</h3>
                <p className="text-sm text-gray-500">Referral status breakdown</p>
              </div>
              <span className="text-3xl font-extrabold text-gray-800">{loading ? "—" : formatCount(totalRef)}</span>
            </div>

              <div className="space-y-4">
              {[
                { label: "Active Paying", count: active, icon: <CheckCircle2 className="h-4 w-4" />, color: "bg-emerald-500", light: "bg-emerald-50", text: "text-emerald-700", sub: "Live subscriptions" },
                { label: "Pending", count: pending, icon: <Timer className="h-4 w-4" />, color: "bg-amber-500", light: "bg-amber-50", text: "text-amber-700", sub: "Signed up but not converted" },
                { label: "Unpaid", count: unpaid, icon: <AlertTriangle className="h-4 w-4" />, color: "bg-orange-500", light: "bg-orange-50", text: "text-orange-700", sub: "Converted with payment still due" },
                { label: "Cancelled / Churned", count: cancelled, icon: <XCircle className="h-4 w-4" />, color: "bg-red-500", light: "bg-red-50", text: "text-red-700", sub: "Lost clients" },
              ].map((row) => (
                <div key={row.label} className={`flex items-center gap-4 rounded-xl ${row.light} px-4 py-3`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${row.color} text-white`}>
                    {row.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-semibold ${row.text}`}>{row.label}</span>
                      <span className={`text-lg font-extrabold ${row.text}`}>{loading ? "—" : row.count}</span>
                    </div>
                    <div className="w-full bg-white/60 rounded-full h-2 overflow-hidden">
                      <div
                        className={`${row.color} h-2 rounded-full transition-all duration-700`}
                        style={{ width: `${Math.round((row.count / pipelineMax) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{row.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial sidebar */}
          <div className="flex flex-col gap-4">
            {/* Payout summary */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 shadow-md">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Payouts</p>
                  <p className="text-xs text-gray-500">Sent to you by admin</p>
                </div>
              </div>
              <div className="text-2xl font-extrabold text-indigo-700">
                {loading ? <SkeletonPill /> : <AnimatedNumber value={earningsStats.totalPayouts ?? 0} prefix="$" decimals={2} />}
              </div>
              {earningsStats.lastPayoutDate && (
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Last: {new Date(earningsStats.lastPayoutDate).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Pending Payouts */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-md">
                  <Timer className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Pending Payouts</p>
                  <p className="text-xs text-gray-500">Awaiting payment</p>
                </div>
              </div>
              <div className="text-2xl font-extrabold text-amber-600">
                {loading ? <SkeletonPill /> : <AnimatedNumber value={earningsStats.pendingCommissions} prefix="$" decimals={2} />}
              </div>
              <p className="text-xs text-gray-500 mt-1">Processed on the 5th</p>
            </div>

            {/* MRR */}
            <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-5 text-white shadow-md">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-violet-200" />
                <span className="text-xs font-semibold text-violet-200 uppercase tracking-wide">MRR</span>
              </div>
              <div className="text-2xl font-extrabold">
                {loading ? "—" : <AnimatedNumber value={earningsStats.currentMRR ?? 0} prefix="$" decimals={2} />}
              </div>
              <p className="text-xs text-violet-300 mt-1">Monthly recurring commission</p>
            </div>
          </div>
        </div>

        {/* ── RISK / PERFORMANCE ROW ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { label: "Lost Commission", value: formatCurrency(earningsStats.lostCommissionAmount), icon: <TrendingDown className="h-5 w-5 text-white" />, grad: "from-rose-500 to-red-600", sub: "From non-renewals", warn: true },
            { label: "Non-Renewals", value: formatCurrency(earningsStats.nonRenewalsAmount), icon: <Activity className="h-5 w-5 text-white" />, grad: "from-orange-500 to-red-500", sub: "Missed renewal value", warn: true },
            ].map((item) => (
            <div key={item.label} className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 hover:shadow-md transition-all">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${item.grad} shadow mb-3`}>
                {item.icon}
              </div>
              <div className={`text-xl font-extrabold ${item.warn ? "text-red-600" : "text-gray-900"}`}>
                {loading ? "—" : item.value}
              </div>
              <p className="text-xs font-semibold text-gray-700 mt-0.5">{item.label}</p>
              <p className="text-xs text-gray-400">{item.sub}</p>
            </div>
          ))}
        </div>



        {/* ── QUICK ACTIONS ── */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 text-lg mb-1">Quick Actions</h3>
          <p className="text-sm text-gray-500 mb-5">Jump to the tools you use most</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => navigate("/affiliate/links")}
              className="group relative overflow-hidden flex items-center gap-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-4 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20">
                <Link className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="font-bold">Generate Referral Link</p>
                <p className="text-xs text-emerald-100">Share & earn instantly</p>
              </div>
              <ChevronRight className="h-5 w-5 ml-auto text-white/60 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate("/affiliate/referrals")}
              className="group flex items-center gap-4 rounded-xl border-2 border-gray-200 bg-white px-5 py-4 text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:-translate-y-0.5 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Users className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-800">View All Referrals</p>
                <p className="text-xs text-gray-500">Track every lead</p>
              </div>
              <ChevronRight className="h-5 w-5 ml-auto text-gray-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* ── RECENT REFERRALS + LEADERBOARD ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent Referrals */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Recent Referrals</h3>
                <p className="text-sm text-gray-500">Latest leads & conversions</p>
              </div>
              <button onClick={() => navigate("/affiliate/referrals")} className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                See all <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            <div className="space-y-3">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 animate-pulse">
                    <div className="h-9 w-9 rounded-full bg-gray-200 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-gray-200 rounded w-32" />
                      <div className="h-3 bg-gray-200 rounded w-24" />
                    </div>
                    <div className="h-4 w-16 bg-gray-200 rounded" />
                  </div>
                ))
              ) : recentReferrals.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No referrals yet — share your link!</p>
                </div>
              ) : (
                recentReferrals.map((r) => {
                  const sc = statusConfig[r.status] || statusConfig.pending;
                  const initials = r.customerName?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "??";
                  return (
                    <div key={r.id} className={`flex items-center gap-3 p-3 rounded-xl border ${sc.bg} hover:shadow-sm transition-all`}>
                      <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-xs font-bold">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${sc.text}`}>{r.customerName}</p>
                        <p className="text-xs text-gray-500 truncate">{r.planName || "No Plan"} · {r.dateReferred}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gray-800">{formatCurrency(r.commission)}</p>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${sc.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                          {sc.label}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Leaderboard */}
          <AffiliateLeaderboard />
        </div>

      </div>
    </AffiliateLayout>
  );
}
