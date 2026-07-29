import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Copy,
  Share2,
  Users,
  Award,
  Crown,
  Target,
  Activity,
  CheckCircle,
  AlertCircle,
  Clock,
  UserX,
  Plus,
  ShieldAlert,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Eye,
  Trash2,
  Building2,
  CreditCard,
  FileText,
  Settings,
  DollarSign,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AdminCalendar from "@/components/AdminCalendar";

/* ─────────────────────── Types ─────────────────────── */

type DashboardStats = {
  totalClients: number;
  loginEnabled: number;
  loginDisabled: number;
  fundable: number;
  notFundable: number;
  reportPulls: number;
  fundingInvoicesPaid: number;
  totalBanks: number;
  totalCards: number;
};

type DashboardClient = {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
  creditScore: number;
  previousScore: number;
  lastReport: string;
  disputesActive: number;
  progress: string;
  joinDate: string;
  fundableStatus?: string;
};

type ActivityItem = {
  id: number;
  type: string;
  client: string;
  description: string;
  time: string;
  status: string;
};

type EliteData = {
  revenue: {
    this_month: number;
    collected: number;
    outstanding: number;
    last_month: number;
    invoice_count: number;
    paid_count: number;
    overdue_count: number;
    sent_count: number;
    growth_pct: number;
    collected_growth_pct: number;
    outstanding_growth_pct: number;
  };
  disputes: {
    total: number;
    active: number;
    resolved: number;
    successful: number;
    this_month: number;
    this_week: number;
  };
  client_status: { status: string; count: number }[];
  credit_score_distribution: { score_range: string; count: number }[];
  client_attention: {
    no_score: number;
    stale: number;
    improving: number;
    declining_or_stable: number;
    ready_for_matching: number;
    need_dispute_work: number;
    locked_active: number;
  };
  bureau_fundability: {
    transunion: number;
    experian: number;
    equifax: number;
    total_assessed: number;
  };
  client_growth: {
    new_this_month: number;
    new_last_month: number;
    total: number;
    growth_pct: number;
  };
  overdue_clients: { client_id: number; name: string; total_overdue: number }[];
  clients_with_letters: number;
};

interface EliteDashboardProps {
  stats: DashboardStats;
  clients: DashboardClient[];
  recentActivity: ActivityItem[];
  loading: boolean;
  animateOnMount?: boolean;
  creditReportLink: string;
  clientLoginUrl: string;
  clientIntakeLink: string;
  qrCodeUrl: string;
  referralQrCodeUrl: string;
  qrLogoPath: string;
  hasAffiliateAccess: boolean;
  affiliateVerificationStatus: string | null;
  affiliateLink: string;
  eliteData: EliteData | null;
  subscriptionHasActive: boolean;
  onAddClient: () => void;
  onCopyCreditReportLink: () => void;
  onCopyClientLoginLink: () => void;
  onCopyClientIntakeLink: () => void;
  onOpenCreditReportLink: () => void;
  onOpenQrModal: () => void;
  onOpenReferralQrModal: () => void;
  onOpenClientIntakeShare: () => void;
  onHandleAffiliateProAccess: () => void;
  onNavigateSubscription: () => void;
  onCopyAffiliateLink: () => void;
  onCreditReports: () => void;
  onSettings: () => void;
  handleDeleteClient: (clientId: number) => void;
  handleToggleLoginStatus: (clientId: number, currentStatus: string) => void;
}

/* ═══════════════════ Helpers ═══════════════════ */

function pct(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) : 0; }
function pctDec(a: number, b: number) { return b > 0 ? ((a / b) * 100).toFixed(1) : "0.0"; }

/* ── Fundability Gauge (SVG) ── */
function FundabilityGauge({ score, animateOnMount = true }: { score: number; animateOnMount?: boolean }) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const startAngle = -180;
  const endAngle = 0;
  const range = endAngle - startAngle;
  const needleAngle = startAngle + (clampedScore / 100) * range;

  const cx = 150, cy = 140, r = 110;

  function polarToCartesian(angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const arcStart = polarToCartesian(startAngle);
  const arcEnd = polarToCartesian(endAngle);
  const needleTip = polarToCartesian(needleAngle);

  const ticks = [0, 25, 50, 75, 100];
  const tickPositions = ticks.map((t) => {
    const angle = startAngle + (t / 100) * range;
    const labelPos = { x: cx + (r + 22) * Math.cos((angle * Math.PI) / 180), y: cy + (r + 22) * Math.sin((angle * Math.PI) / 180) };
    return { value: t, ...labelPos };
  });

  return (
    <svg viewBox="0 0 300 175" className="w-full max-w-[280px] mx-auto drop-shadow-xl">
      <defs>
        <linearGradient id="gaugeGradElectric" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#002f1b" />
          <stop offset="25%" stopColor="#004225" />
          <stop offset="50%" stopColor="#77dd77" />
          <stop offset="75%" stopColor="#5fcf74" />
          <stop offset="100%" stopColor="#dfffe0" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {/* Background arc */}
      <path d={`M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 0 1 ${arcEnd.x} ${arcEnd.y}`} fill="none" className="stroke-slate-100 dark:stroke-slate-700" strokeWidth="18" strokeLinecap="round" />
      {/* Colored arc */}
      <motion.path
        initial={animateOnMount ? { strokeDasharray: "0 1000" } : false}
        animate={{ strokeDasharray: `${(clampedScore / 100) * (Math.PI * r)} 1000` }}
        transition={animateOnMount ? { duration: 1.5, ease: "easeOut" } : { duration: 0 }}
        d={`M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 0 1 ${arcEnd.x} ${arcEnd.y}`}
        fill="none" stroke="url(#gaugeGradElectric)" strokeWidth="18" strokeLinecap="round" filter="url(#glow)"
      />
      {/* Tick labels */}
      {tickPositions.map((t) => (
        <text key={t.value} x={t.x} y={t.y} textAnchor="middle" dominantBaseline="middle" className="fill-slate-400 dark:fill-slate-500" fontSize="11" fontWeight="600">{t.value}</text>
      ))}
      {/* Needle */}
      <motion.line
        initial={animateOnMount ? { x2: cx - r, y2: cy } : false}
        animate={{ x2: needleTip.x, y2: needleTip.y }}
        transition={animateOnMount ? { duration: 1.5, ease: "easeOut" } : { duration: 0 }}
        x1={cx} y1={cy} className="stroke-slate-800 dark:stroke-slate-100" strokeWidth="3" strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r="6" className="fill-slate-800 dark:fill-slate-100" />
      <circle cx={cx} cy={cy} r="2.5" className="fill-white dark:fill-slate-950" />
      {/* Score text */}
      <text x={cx} y={cy - 25} textAnchor="middle" className="fill-slate-800 dark:fill-slate-100" fontSize="48" fontWeight="800" letterSpacing="-1">{clampedScore}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" className="fill-[#77dd77]" fontSize="11" fontWeight="800" letterSpacing="2">AVG FUNDABILITY</text>
    </svg>
  );
}

/* ── Donut Chart ── */
function DonutChart({ segments, centerLabel, animateOnMount = true }: { segments: { label: string; value: number; color: string }[]; centerLabel: string; animateOnMount?: boolean }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return <div className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 text-center py-6">No data</div>;
  const size = 160, r = 55, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto drop-shadow-lg">
      <defs>
        <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {segments.map((seg, i) => {
        const pctVal = seg.value / total;
        const dash = c * pctVal;
        const o = offset;
        offset += dash;
        return (
          <motion.circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={seg.color} strokeWidth="18"
            initial={animateOnMount ? { strokeDasharray: `0 ${c}` } : false}
            animate={{ strokeDasharray: `${dash} ${c - dash}` }}
            transition={animateOnMount ? { duration: 1.2, delay: i * 0.1, ease: "easeOut" } : { duration: 0 }}
            strokeDashoffset={-o}
            filter="url(#neonGlow)"
          />
        );
      })}
      <text x="50%" y="46%" textAnchor="middle" className="fill-slate-800 dark:fill-slate-100" fontSize="28" fontWeight="800">{total}</text>
      <text x="50%" y="62%" textAnchor="middle" className="fill-slate-400 dark:fill-slate-500" fontSize="10" fontWeight="600" letterSpacing="1">{centerLabel}</text>
    </svg>
  );
}

/* ── Status bar ── */
function StatusBar({ label, value, total, gradient, animateOnMount = true }: { label: string; value: number; total: number; gradient: string; animateOnMount?: boolean }) {
  const p = pct(value, total);
  return (
    <div className="flex items-center gap-3 group">
      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 dark:text-slate-400 dark:text-slate-500 w-24 shrink-0 uppercase tracking-wide">{label}</span>
      <div className="flex-1 h-3.5 rounded-full bg-slate-100 dark:bg-slate-800 dark:bg-slate-800 overflow-hidden shadow-inner">
        <motion.div
          initial={animateOnMount ? { width: 0 } : false}
          animate={{ width: `${Math.max(p, 2)}%` }}
          transition={animateOnMount ? { duration: 1, ease: "easeOut" } : { duration: 0 }}
          className={`h-full rounded-full bg-gradient-to-r ${gradient} shadow-[0_0_10px_rgba(0,0,0,0.2)]`}
        />
      </div>
      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 dark:text-slate-100 w-16 text-right">{value} <span className="text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium">({pctDec(value, total)}%)</span></span>
    </div>
  );
}

/* ── Progress Segment Bar ── */
function ProgressSegmentBar({ segments, totalPct, animateOnMount = true }: { segments: { label: string; pct: number; gradient: string }[]; totalPct: number; animateOnMount?: boolean }) {
  return (
    <div className="mt-6 p-4 bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Overall Client Progress</span>
        <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#004225] to-[#77dd77] drop-shadow-sm">{totalPct}%</span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 dark:bg-slate-800 shadow-inner">
        {segments.map((seg, i) => (
          <motion.div key={i}
            initial={animateOnMount ? { width: 0 } : false}
            animate={{ width: `${seg.pct}%` }}
            transition={animateOnMount ? { duration: 1, delay: i * 0.1 } : { duration: 0 }}
            className={`bg-gradient-to-r ${seg.gradient} shadow-[0_0_8px_rgba(0,0,0,0.2)]`}
          />
        ))}
      </div>
      <div className="flex mt-3 gap-4 flex-wrap justify-between">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${seg.gradient}`} />
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wide">{seg.pct}% {seg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════ Main Component ═══════════════════════ */

export default function EliteDashboard({
  stats,
  clients,
  recentActivity,
  loading,
  animateOnMount = true,
  creditReportLink,
  clientLoginUrl,
  clientIntakeLink,
  qrCodeUrl,
  referralQrCodeUrl,
  qrLogoPath,
  hasAffiliateAccess,
  affiliateVerificationStatus,
  affiliateLink,
  eliteData: ed,
  subscriptionHasActive,
  onOpenCreditReportLink,
  onOpenQrModal,
  onOpenReferralQrModal,
  onOpenClientIntakeShare,
  onHandleAffiliateProAccess,
  onNavigateSubscription,
  onCopyAffiliateLink,
  onCreditReports,
  onSettings,
  onCopyCreditReportLink,
  onCopyClientLoginLink,
  onCopyClientIntakeLink,
  handleDeleteClient,
  handleToggleLoginStatus
}: EliteDashboardProps) {
  const navigate = useNavigate();
  const [pipelineTab, setPipelineTab] = useState("all");
  const [pipelinePage, setPipelinePage] = useState(1);
  const pageSize = 5;

  /* ── Derived real values ── */
  const rev = ed?.revenue;
  const disp = ed?.disputes;
  const attn = ed?.client_attention;
  const overdue = ed?.overdue_clients ?? [];
  const total = stats.totalClients || 1;

  const getStatusCount = (key: string) => {
    const found = (ed?.client_status ?? []).find((s) => s.status?.toLowerCase() === key);
    return found?.count ?? 0;
  };
  const inProgressCount = ed?.clients_with_letters ?? 0;
  const inactiveCount = getStatusCount("inactive");
  const newThisMonthCount = ed?.client_growth?.new_this_month ?? 0;
  const fundabilityScore = pct(stats.fundable, stats.totalClients);

  const totalAttn = (attn?.no_score ?? 0) + (attn?.improving ?? 0) + (attn?.declining_or_stable ?? 0) + (attn?.ready_for_matching ?? 0);
  const progressSegments = [
    { label: "Analysis", pct: pct(attn?.no_score ?? 0, totalAttn || 1), gradient: "from-[#002f1b] to-[#004225]" },
    { label: "In Progress", pct: pct(attn?.improving ?? 0, totalAttn || 1), gradient: "from-[#004225] to-[#77dd77]" },
    { label: "Verifying", pct: pct(attn?.declining_or_stable ?? 0, totalAttn || 1), gradient: "from-[#77dd77] to-[#5fcf74]" },
    { label: "Match Ready", pct: pct(attn?.ready_for_matching ?? 0, totalAttn || 1), gradient: "from-[#dfffe0] to-[#77dd77]" },
  ];

  const scoreColors: Record<string, string> = { Poor: "#002f1b", Fair: "#004225", Good: "#77dd77", "Very Good": "#5fcf74", Excellent: "#dfffe0" };
  const donutSegments = (ed?.credit_score_distribution ?? []).map((d) => ({
    label: d.score_range, value: d.count, color: scoreColors[d.score_range] || "#cbd5e1",
  }));
  const totalScored = donutSegments.reduce((s, x) => s + x.value, 0);

  const statusBarData = [
    { label: "Fundable", value: stats.fundable, gradient: "from-[#dfffe0] to-[#77dd77]" },
    { label: "In Progress", value: inProgressCount, gradient: "from-[#004225] to-[#77dd77]" },
    { label: "Match Ready", value: attn?.ready_for_matching ?? 0, gradient: "from-[#77dd77] to-[#5fcf74]" },
    { label: "Not Fundable", value: stats.notFundable, gradient: "from-[#002f1b] to-[#004225]" },
    { label: "New This Month", value: newThisMonthCount, gradient: "from-[#dfffe0] to-[#5fcf74]" },
    { label: "Inactive", value: inactiveCount || stats.loginDisabled, gradient: "from-[#004225] to-[#002f1b]" },
  ];

  const filteredClients = useMemo(() => {
    switch (pipelineTab) {
      case "fundable": return clients.filter((c) => c.fundableStatus === "Fundable");
      case "matchready": return clients.filter((c) => c.fundableStatus === "Fundable" && c.creditScore > 700);
      case "notfundable": return clients.filter((c) => c.fundableStatus !== "Fundable");
      case "overdue": return clients.filter((c) => c.status === "Active");
      case "inactive": return clients.filter((c) => c.status === "Inactive" || c.status === "Completed");
      default: return clients;
    }
  }, [clients, pipelineTab]);

  const pipelineTotalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  const pipelineClients = filteredClients.slice((pipelinePage - 1) * pageSize, pipelinePage * pageSize);

  const openClientProfile = (clientId: number) => {
    navigate(`/clients/${clientId}`);
  };

  const tasks = [
    { label: "Analyze new credit reports", count: attn?.no_score ?? 0 },
    { label: "Review dispute results", count: disp?.this_week ?? 0 },
    { label: "Follow up on overdue payments", count: overdue.length || (rev?.overdue_count ?? 0) },
    { label: "Send client updates", count: attn?.stale ?? 0 },
    { label: "Review match-ready clients", count: attn?.ready_for_matching ?? 0 },
  ];

  const pipelineTabs = [
    { key: "all", label: "All Clients", count: stats.totalClients },
    { key: "fundable", label: "Fundable", count: stats.fundable },
    { key: "matchready", label: "Match Ready", count: attn?.ready_for_matching ?? 0 },
    { key: "notfundable", label: "Not Fundable", count: stats.notFundable },
    { key: "new", label: "New This Month", count: newThisMonthCount },
    { key: "inactive", label: "Inactive", count: inactiveCount || stats.loginDisabled },
  ];

  const visibleRecentActivity = Array.isArray(recentActivity) ? recentActivity.slice(0, 4) : [];
  const performanceItems = [
    {
      label: "New Clients",
      value: stats.totalClients > 0 ? Math.floor(stats.totalClients * 0.15) : 0,
      icon: Target,
      iconClassName: "text-[#004225]",
      valueClassName: "text-[#004225]",
    },
    {
      label: "Got Funded",
      value: stats.fundable || 0,
      icon: Zap,
      iconClassName: "text-[#77dd77]",
      valueClassName: "text-[#77dd77]",
    },
    {
      label: "Reports Pulls",
      value: stats.reportPulls || 0,
      icon: Award,
      iconClassName: "text-[#5fcf74]",
      valueClassName: "text-[#5fcf74]",
    },
    {
      label: "Funding Invoice Paid",
      value: stats.fundingInvoicesPaid || 0,
      icon: DollarSign,
      iconClassName: "text-[#77dd77]",
      valueClassName: "text-[#77dd77]",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse p-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bg-white dark:bg-slate-900 dark:bg-slate-900 shadow-sm" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 h-80 rounded-2xl bg-white dark:bg-slate-900 dark:bg-slate-900 shadow-sm" />
          <div className="h-80 rounded-2xl bg-white dark:bg-slate-900 dark:bg-slate-900 shadow-sm" />
        </div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  const containerInitial = animateOnMount ? "hidden" : false;

  return (
    <div className="elite-page-shell">
      {/* Background Electric Glows */}
      <div className="elite-page-glow-primary"></div>
      <div className="elite-page-glow-secondary" style={{ animationDelay: "2s" }}></div>

      <motion.div variants={containerVariants} initial={containerInitial} animate="show" className="max-w-[1600px] mx-auto space-y-6 relative z-10 elite-nested-wrapper">
        
        {/* ════════ HEADER ════════ */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 dark:bg-slate-900/60 dark:bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-white dark:border-slate-800 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 dark:from-white via-[#77dd77] to-[#004225] tracking-tight">
              The Capsol Elite
            </h1>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Professional Command Center</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-900 to-slate-800 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.2)]">
              <Crown className="h-4 w-4 text-[#dfffe0]" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Elite Access Active</span>
            </div>
          </div>
        </motion.div>

        {/* ════════ TOP 6 STAT CARDS (White Neon Premium) ════════ */}
        <motion.div variants={containerVariants} className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">

          <motion.div variants={itemVariants} onClick={() => navigate("/clients")} className="group cursor-pointer bg-white dark:bg-slate-900 dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 dark:border-slate-800 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(148,163,184,0.2)] transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-slate-400 to-slate-500"></div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-slate-600 dark:text-slate-400 dark:text-slate-400 dark:text-slate-500 transition-colors">Total Clients</span>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50 group-hover:bg-slate-100 dark:bg-slate-800 dark:bg-slate-800 transition-colors shadow-inner"><Users className="h-4 w-4 text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500" /></div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-800 dark:text-slate-100 dark:text-slate-100">{stats.totalClients}</span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">{pctDec(stats.totalClients, total)}%</span>
            </div>
          </motion.div>
          
          <motion.div variants={itemVariants} onClick={() => navigate("/clients?status=notfundable")} className="group cursor-pointer bg-white dark:bg-slate-900 dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 dark:border-slate-800 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,66,37,0.16)] transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#002f1b] to-[#004225]"></div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-slate-600 dark:text-slate-400 dark:text-slate-400 dark:text-slate-500 transition-colors">Not Fundable</span>
              <div className="p-2 rounded-xl bg-[#dfffe0]/45 dark:bg-[#004225]/50 group-hover:bg-[#dfffe0]/60 transition-colors shadow-inner"><Target className="h-4 w-4 text-[#002f1b] dark:text-[#dfffe0]" /></div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-800 dark:text-slate-100 dark:text-slate-100">{stats.notFundable}</span>
              <span className="text-xs font-bold text-[#002f1b] dark:text-[#dfffe0]">{pctDec(stats.notFundable, total)}%</span>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} onClick={() => navigate("/clients")} className="group cursor-pointer bg-white dark:bg-slate-900 dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 dark:border-slate-800 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(119,221,119,0.18)] transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#004225] to-[#77dd77]"></div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-slate-600 dark:text-slate-400 dark:text-slate-400 dark:text-slate-500 transition-colors">In Progress</span>
              <div className="p-2 rounded-xl bg-[#dfffe0]/45 dark:bg-[#004225]/50 group-hover:bg-[#dfffe0]/60 transition-colors shadow-inner"><Activity className="h-4 w-4 text-[#77dd77] dark:text-[#5fcf74]" /></div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-800 dark:text-slate-100 dark:text-slate-100">{inProgressCount}</span>
              <span className="text-xs font-bold text-[#77dd77] dark:text-[#5fcf74]">{pctDec(inProgressCount, total)}%</span>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} onClick={() => navigate("/clients?status=fundable")} className="group cursor-pointer bg-white dark:bg-slate-900 dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 dark:border-slate-800 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(119,221,119,0.16)] transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#dfffe0] to-[#77dd77]"></div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-slate-600 dark:text-slate-400 dark:text-slate-400 dark:text-slate-500 transition-colors">Match Ready</span>
              <div className="p-2 rounded-xl bg-[#dfffe0]/45 dark:bg-[#004225]/50 group-hover:bg-[#dfffe0]/60 transition-colors shadow-inner"><Award className="h-4 w-4 text-[#77dd77] dark:text-[#5fcf74]" /></div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-800 dark:text-slate-100 dark:text-slate-100">{stats.fundable}</span>
              <span className="text-xs font-bold text-[#77dd77] dark:text-[#5fcf74]">{pctDec(stats.fundable, total)}%</span>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} onClick={() => navigate("/clients")} className="group cursor-pointer bg-white dark:bg-slate-900 dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 dark:border-slate-800 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(95,207,116,0.16)] transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#77dd77] to-[#5fcf74]"></div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-slate-600 dark:text-slate-400 dark:text-slate-400 dark:text-slate-500 transition-colors">New This Month</span>
              <div className="p-2 rounded-xl bg-[#dfffe0]/45 dark:bg-[#004225]/50 group-hover:bg-[#dfffe0]/60 transition-colors shadow-inner"><Plus className="h-4 w-4 text-[#5fcf74] dark:text-[#77dd77]" /></div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-800 dark:text-slate-100 dark:text-slate-100">{newThisMonthCount}</span>
              <span className="text-xs font-bold text-[#5fcf74] dark:text-[#77dd77]">{pctDec(newThisMonthCount, total)}%</span>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} onClick={() => navigate("/clients?loginStatus=disabled")} className="group cursor-pointer bg-white dark:bg-slate-900 dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 dark:border-slate-800 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,66,37,0.16)] transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#002f1b] to-[#77dd77]"></div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-slate-600 dark:text-slate-400 dark:text-slate-400 dark:text-slate-500 transition-colors">Inactive</span>
              <div className="p-2 rounded-xl bg-[#dfffe0]/45 dark:bg-[#004225]/50 group-hover:bg-[#dfffe0]/60 transition-colors shadow-inner"><UserX className="h-4 w-4 text-[#004225] dark:text-[#dfffe0]" /></div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-800 dark:text-slate-100 dark:text-slate-100">{inactiveCount || stats.loginDisabled}</span>
              <span className="text-xs font-bold text-[#004225] dark:text-[#dfffe0]">{pctDec(inactiveCount || stats.loginDisabled, total)}%</span>
            </div>
          </motion.div>

        </motion.div>

        <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <motion.div variants={itemVariants} className="group bg-white dark:bg-slate-900 dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 dark:border-slate-800 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,66,37,0.14)] transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#002f1b] to-[#77dd77]"></div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-slate-600 dark:text-slate-400 dark:text-slate-400 dark:text-slate-500 transition-colors">Total Banks</span>
              <div className="p-2 rounded-xl bg-[#dfffe0]/45 dark:bg-[#004225]/50 group-hover:bg-[#dfffe0]/60 transition-colors shadow-inner"><Building2 className="h-4 w-4 text-[#004225] dark:text-[#dfffe0]" /></div>
            </div>
            <div className="flex items-end justify-between gap-3">
              <div>
                <span className="text-4xl font-black text-slate-800 dark:text-slate-100 dark:text-slate-100">{stats.totalBanks}</span>
                <p className="mt-2 text-xs font-semibold text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wide">Registered banks in your network</p>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#dfffe0] via-white to-[#77dd77] flex items-center justify-center shadow-inner">
                <Building2 className="h-6 w-6 text-[#004225]" />
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="group bg-white dark:bg-slate-900 dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 dark:border-slate-800 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(119,221,119,0.14)] transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#dfffe0] to-[#77dd77]"></div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-slate-600 dark:text-slate-400 dark:text-slate-400 dark:text-slate-500 transition-colors">Total Products</span>
              <div className="p-2 rounded-xl bg-[#dfffe0]/45 dark:bg-[#004225]/50 group-hover:bg-[#dfffe0]/60 transition-colors shadow-inner"><CreditCard className="h-4 w-4 text-[#77dd77] dark:text-[#5fcf74]" /></div>
            </div>
            <div className="flex items-end justify-between gap-3">
              <div>
                <span className="text-4xl font-black text-slate-800 dark:text-slate-100 dark:text-slate-100">{stats.totalCards}</span>
                <p className="mt-2 text-xs font-semibold text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wide">Available funding products</p>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#dfffe0] via-white to-[#77dd77] flex items-center justify-center shadow-inner">
                <CreditCard className="h-6 w-6 text-[#004225]" />
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* ════════ MIDDLE SECTION: Fundability + Access Links ════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          
          {/* Left: Client Fundability Overview + Credit Report */}
          <div className="lg:col-span-3 space-y-6">
            <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-white dark:border-slate-800 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#77dd77] rounded-full mix-blend-multiply filter blur-[100px] opacity-10"></div>
              <div className="flex items-center justify-between mb-8 relative z-10">
                <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 dark:text-slate-100 uppercase tracking-widest">AI Fundability Overview</h2>
                <div className="px-3 py-1 bg-gradient-to-r from-[#004225] to-[#77dd77] rounded-full shadow-[0_0_15px_rgba(119,221,119,0.3)]">
                  <span className="text-[10px] font-black text-slate-900 dark:text-white dark:text-white tracking-wider">LIVE ANALYSIS</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 items-center">
                <div className="flex justify-center">
                  <FundabilityGauge score={fundabilityScore} animateOnMount={animateOnMount} />
                </div>
                <div className="space-y-6">
                  <div>
                    <p className="text-sm font-bold text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Portfolio Readiness</p>
                    <p className="text-3xl font-black text-slate-800 dark:text-slate-100 dark:text-slate-100">
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#004225] to-[#77dd77]">{fundabilityScore}%</span> Match Ready
                    </p>
                  </div>
                  
                  <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 dark:border-slate-800 shadow-inner">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-white dark:bg-slate-900 dark:bg-slate-900 shadow-sm flex items-center justify-center shrink-0"><ShieldAlert className="h-4 w-4 text-[#002f1b] dark:text-[#dfffe0]" /></div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 dark:text-slate-300">{attn?.need_dispute_work ?? 0} clients need negative items removed</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-white dark:bg-slate-900 dark:bg-slate-900 shadow-sm flex items-center justify-center shrink-0"><Clock className="h-4 w-4 text-[#77dd77] dark:text-[#5fcf74]" /></div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 dark:text-slate-300">{attn?.stale ?? 0} clients have stale profiles (30+ days)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-white dark:bg-slate-900 dark:bg-slate-900 shadow-sm flex items-center justify-center shrink-0"><CheckCircle className="h-4 w-4 text-[#004225] dark:text-[#dfffe0]" /></div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 dark:text-slate-300">{attn?.ready_for_matching ?? 0} clients are fully matched</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative z-10">
                <ProgressSegmentBar segments={progressSegments} totalPct={fundabilityScore} animateOnMount={animateOnMount} />
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(119,221,119,0.16)] transition-all">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 dark:text-slate-100 uppercase tracking-widest">Get Your Credit Report</h3>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-wide">Register, copy the link, or share the QR preview with clients.</p>
                </div>
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-[#002f1b] to-[#77dd77] flex items-center justify-center shadow-[0_0_20px_rgba(119,221,119,0.18)] shrink-0">
                  <FileText className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Credit Report Link</p>
                  <div className="flex items-center gap-2">
                    <Input value={creditReportLink} readOnly className="h-10 text-[10px] font-mono bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 dark:border-slate-700" />
                    <Button size="sm" variant="outline" className="h-10 px-3 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 dark:border-slate-700" onClick={onCopyCreditReportLink}><Copy className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400 dark:text-slate-400 dark:text-slate-500" /></Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-center">
                  <Button className="h-11 rounded-2xl bg-slate-900 hover:bg-slate-800 text-[10px] font-bold uppercase tracking-[0.2em]" onClick={onOpenCreditReportLink}>
                    Register Now
                  </Button>
                  <button type="button" onClick={onOpenQrModal} className="relative mx-auto sm:mx-0 h-36 w-36 rounded-2xl border-4 border-slate-50 overflow-hidden bg-white dark:bg-slate-900 dark:bg-slate-900 p-1.5 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#77dd77]/60">
                    <img src={qrCodeUrl} alt="Credit report registration QR code" className="h-full w-full object-contain" loading="lazy" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="h-8 w-8 rounded-full bg-white dark:bg-slate-900 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 dark:border-slate-700 shadow flex items-center justify-center">
                        <img src={qrLogoPath} alt="The Capsol logo" className="h-5 w-5 object-contain" />
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right: Client Access Links */}
          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 dark:bg-slate-900 p-6 rounded-3xl border border-white dark:border-slate-800 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-xl bg-[#dfffe0]/45 dark:bg-[#004225]/50 flex items-center justify-center mb-3"><UserX className="h-5 w-5 text-[#004225] dark:text-[#dfffe0]" /></div>
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 dark:text-slate-100 uppercase tracking-widest mb-1">Client Login</h4>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">Share portal access</p>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Input value={clientLoginUrl} readOnly className="h-8 text-[10px] font-mono bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 dark:border-slate-700" />
                <Button size="sm" variant="outline" className="h-8 px-3 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50" onClick={onCopyClientLoginLink}><Copy className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400 dark:text-slate-400 dark:text-slate-500" /></Button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 dark:bg-slate-900 p-6 rounded-3xl border border-white dark:border-slate-800 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-xl bg-[#dfffe0]/45 dark:bg-[#004225]/50 flex items-center justify-center mb-3"><Target className="h-5 w-5 text-[#77dd77] dark:text-[#5fcf74]" /></div>
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 dark:text-slate-100 uppercase tracking-widest mb-1">Onboarding Link</h4>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">Send intake forms</p>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Input value={clientIntakeLink} readOnly className="h-8 text-[10px] font-mono bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 dark:border-slate-700" />
                <Button size="sm" variant="outline" className="h-8 px-2.5 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50" onClick={onCopyClientIntakeLink}><Copy className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400 dark:text-slate-400 dark:text-slate-500" /></Button>
                <Button size="sm" variant="outline" className="h-8 px-2.5 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50" onClick={onOpenClientIntakeShare}><Share2 className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400 dark:text-slate-400 dark:text-slate-500" /></Button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 dark:bg-slate-900 p-6 rounded-3xl border border-white dark:border-slate-800 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/50 dark:bg-emerald-900/50 flex items-center justify-center mb-3"><Share2 className="h-5 w-5 text-emerald-600" /></div>
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 dark:text-slate-100 uppercase tracking-widest mb-1">Your Referral Link</h4>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">
                  {!subscriptionHasActive
                    ? "Unlock Affiliate Pro access"
                    : hasAffiliateAccess
                      ? affiliateVerificationStatus === "active"
                        ? "Share and earn commissions"
                        : "Verify affiliate access to activate"
                      : "Join the affiliate program"}
                </p>
              </div>
              {!subscriptionHasActive ? (
                <div className="mt-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">Get plan to unlock Pro affiliate dashboard access and earn 20-25% commission.</p>
                  <Button size="sm" className="w-full bg-slate-800 hover:bg-slate-900 text-[10px] font-bold uppercase tracking-wider" onClick={onNavigateSubscription}>Get Plan</Button>
                </div>
              ) : hasAffiliateAccess ? (
                affiliateVerificationStatus === "active" ? (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Input value={affiliateLink} readOnly className="h-8 text-[10px] font-mono bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 dark:border-slate-700" />
                      <Button size="sm" variant="outline" className="h-8 px-3 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50" onClick={onCopyAffiliateLink} disabled={!affiliateLink}><Copy className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400 dark:text-slate-400 dark:text-slate-500" /></Button>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 dark:bg-emerald-900/50 dark:bg-emerald-900/50/70 p-3">
                      <div>
                        <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 dark:text-slate-300 uppercase tracking-wider">Referral QR</p>
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">Tap to open and download the referral QR.</p>
                      </div>
                      <button type="button" onClick={onOpenReferralQrModal} disabled={!referralQrCodeUrl} className="relative h-24 w-24 shrink-0 rounded-2xl overflow-hidden border border-emerald-200 bg-white dark:bg-slate-900 dark:bg-slate-900 p-0.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50">
                        <img src={referralQrCodeUrl} alt="Referral link QR code" className="h-full w-full object-contain" loading="lazy" />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="h-5 w-5 rounded-full bg-white dark:bg-slate-900 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 dark:border-slate-700 shadow flex items-center justify-center">
                            <img src={qrLogoPath} alt="The Capsol logo" className="h-3 w-3 object-contain" />
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">Verify your affiliate access to get your referral link.</p>
                    <Button size="sm" variant="outline" className="w-full bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50 text-[10px] font-bold uppercase tracking-wider border-slate-200 dark:border-slate-700 dark:border-slate-700 hover:bg-emerald-50 dark:bg-emerald-900/50 dark:bg-emerald-900/50 hover:border-emerald-200" onClick={onHandleAffiliateProAccess}>Verify Affiliate Access</Button>
                  </div>
                )
              ) : (
                <div className="mt-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">Affiliate account not set up.</p>
                  <Button size="sm" variant="outline" className="w-full bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50 text-[10px] font-bold uppercase tracking-wider border-slate-200 dark:border-slate-700 dark:border-slate-700 hover:bg-emerald-50 dark:bg-emerald-900/50 dark:bg-emerald-900/50 hover:border-emerald-200" onClick={() => navigate("/join-affiliate")}>Set It Up Now</Button>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 dark:bg-slate-900 p-6 rounded-3xl border border-white dark:border-slate-800 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-[0_0_20px_rgba(15,23,42,0.15)]">
                  <Activity className="h-5 w-5 text-[#77dd77]" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 dark:text-slate-100 uppercase tracking-widest">Quick Actions</h4>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">Jump into daily admin work</p>
                </div>
              </div>
              <div className="space-y-3">
                <Button onClick={onCreditReports} variant="outline" className="w-full justify-start h-10 rounded-xl border-slate-200 dark:border-slate-700 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 dark:text-slate-300 hover:bg-[#004225] hover:text-white hover:border-[#004225] transition-colors">
                  <FileText className="h-4 w-4 mr-2" />
                  Credit Reports
                </Button>
                <Button onClick={onSettings} variant="outline" className="w-full justify-start h-10 rounded-xl border-slate-200 dark:border-slate-700 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 dark:text-slate-300 hover:bg-[#77dd77] hover:text-[#002f1b] hover:border-[#77dd77] transition-colors">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                {hasAffiliateAccess && (
                  <div className="space-y-2">
                    <Button onClick={onHandleAffiliateProAccess} variant="outline" className="w-full justify-start h-10 rounded-xl border-emerald-200 bg-emerald-50 dark:bg-emerald-900/50 dark:bg-emerald-900/50 text-emerald-700 hover:bg-emerald-50 dark:bg-emerald-900/50 dark:bg-emerald-900/500 hover:text-white hover:border-emerald-500 transition-colors">
                      <Crown className="h-4 w-4 mr-2" />
                      {affiliateVerificationStatus === "active" ? "Affiliate Pro Dashboard" : "Verify Affiliate Access"}
                    </Button>
                    {affiliateVerificationStatus === "pending_verification" && (
                      <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wide">Complete email verification to access affiliate pro features</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            
          </motion.div>
        </div>

        {/* ════════ CALENDAR + RIGHT RAIL ANALYTICS ════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          <motion.div variants={itemVariants} className="lg:col-span-3 bg-white dark:bg-slate-900 dark:bg-slate-900 p-6 rounded-3xl border border-white dark:border-slate-800 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#004225] rounded-full mix-blend-multiply filter blur-[100px] opacity-10"></div>
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 dark:text-slate-100 uppercase tracking-widest">Calendar</h3>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Client report reminders and scheduled meetings</p>
              </div>
              <div className="p-2.5 rounded-xl bg-gradient-to-r from-[#004225] to-[#77dd77] shadow-[0_0_15px_rgba(119,221,119,0.28)]">
                <Calendar className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="relative z-10">
              <AdminCalendar />
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 dark:bg-slate-900 p-6 rounded-3xl border border-white dark:border-slate-800 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 dark:text-slate-100 uppercase tracking-widest mb-6">Client Status Breakdown</h3>
              <div className="space-y-5">
                {statusBarData.map((bar) => (
                  <StatusBar key={bar.label} label={bar.label} value={bar.value} total={stats.totalClients} gradient={bar.gradient} animateOnMount={animateOnMount} />
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 dark:bg-slate-900 p-6 rounded-3xl border border-white dark:border-slate-800 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 dark:text-slate-100 uppercase tracking-widest">Recent Activity</h3>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-wide">Latest updates from your client pipeline</p>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#004225] to-[#77dd77] flex items-center justify-center shadow-[0_0_20px_rgba(119,221,119,0.18)]">
                  <Activity className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="space-y-4">
                {visibleRecentActivity.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50 px-5 py-8 text-center text-sm font-bold text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">No recent activity</div>
                ) : (
                  visibleRecentActivity.map((activity) => (
                    <div key={activity.id} className="flex gap-3 rounded-2xl border border-slate-100 dark:border-slate-800 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50/70 px-4 py-4">
                      <div
                        className={`mt-1.5 h-2.5 w-2.5 rounded-full ${
                          activity.status === "success"
                            ? "bg-emerald-50 dark:bg-emerald-900/50 dark:bg-emerald-900/500"
                            : activity.status === "info"
                              ? "bg-[#004225]"
                              : "bg-amber-50 dark:bg-amber-900/50 dark:bg-amber-900/500"
                        }`}
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 dark:text-slate-100">{activity.client}</p>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">{activity.description}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">{activity.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 dark:bg-slate-900 p-6 rounded-3xl border border-white dark:border-slate-800 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 dark:text-slate-100 uppercase tracking-widest">This Month's Performance</h3>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-wide">High-level production metrics for this month</p>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#dfffe0] to-[#77dd77] flex items-center justify-center shadow-[0_0_20px_rgba(119,221,119,0.18)]">
                  <Award className="h-5 w-5 text-slate-900 dark:text-white dark:text-white" />
                </div>
              </div>
              <div className="space-y-4">
                {performanceItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-100 dark:border-slate-800 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50/80 dark:bg-slate-800/80 px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-white dark:bg-slate-900 dark:bg-slate-900 flex items-center justify-center shadow-sm">
                          <Icon className={`h-4 w-4 ${item.iconClassName}`} />
                        </div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 dark:text-slate-300">{item.label}</span>
                      </div>
                      <span className={`text-lg font-black ${item.valueClassName}`}>{item.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>

        {/* ════════ CLIENT PIPELINE ════════ */}
          <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-3xl border border-white dark:border-slate-800 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100 dark:border-slate-800 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 dark:text-slate-100 uppercase tracking-widest">Client Pipeline</h3>
              <button onClick={() => navigate("/clients")} className="text-[10px] font-bold text-[#77dd77] hover:text-[#004225] uppercase tracking-wider flex items-center gap-1">
                View All <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            
            <div className="flex items-center gap-2 p-4 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50/50 dark:bg-slate-800/50 overflow-x-auto border-b border-slate-100 dark:border-slate-800 dark:border-slate-800">
              {pipelineTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setPipelineTab(tab.key); setPipelinePage(1); }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap transition-all ${
                    pipelineTab === tab.key
                      ? "bg-slate-800 text-white shadow-md"
                      : "bg-white dark:bg-slate-900 dark:bg-slate-900 text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 dark:border-slate-700 hover:border-slate-300 dark:border-slate-600 dark:border-slate-600"
                  }`}
                >
                  {tab.label} <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${pipelineTab === tab.key ? "bg-slate-700 text-white" : "bg-slate-100 dark:bg-slate-800 dark:bg-slate-800 text-slate-600 dark:text-slate-400 dark:text-slate-400 dark:text-slate-500"}`}>{tab.count}</span>
                </button>
              ))}
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50/80 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 dark:border-slate-800">
                    <TableHead className="text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest py-4">Client</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest py-4">Fundability</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest py-4">Status</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest py-4 text-right pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pipelineClients.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12 text-sm font-bold text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">No clients match this view</TableCell></TableRow>
                  ) : pipelineClients.map((client) => (
                    <TableRow key={client.id} className="cursor-pointer hover:bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50/50 dark:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800 dark:border-slate-800" onClick={() => openClientProfile(client.id)}>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                            <AvatarFallback className="bg-gradient-to-br from-[#002f1b] to-[#77dd77] text-white font-black">{client.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 dark:text-slate-100">{client.name}</div>
                            <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">Updated: {client.lastReport}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-sm ${
                            client.creditScore >= 700 ? "bg-gradient-to-br from-[#dfffe0] to-[#77dd77] text-[#002f1b]" : client.creditScore >= 600 ? "bg-gradient-to-br from-[#004225] to-[#77dd77]" : "bg-gradient-to-br from-[#002f1b] to-[#004225]"
                          }`}>{client.creditScore > 0 ? Math.round(client.creditScore / 10) : "?"}</div>
                          <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 ${
                            client.fundableStatus === "Fundable" ? "border-[#dfffe0]/50 text-[#004225] bg-[#dfffe0]/35 dark:bg-[#004225]/35 dark:text-[#dfffe0]" :
                            "border-[#004225]/50 text-[#002f1b] bg-[#dfffe0]/20 dark:bg-[#002f1b]/50 dark:text-[#dfffe0]"
                          }`}>{client.fundableStatus === "Fundable" ? "Match Ready" : "Not Fundable"}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 border-0 shadow-sm ${
                          client.progress === "improving" ? "bg-gradient-to-r from-[#004225] to-[#77dd77] text-white" :
                          client.status === "Completed" ? "bg-gradient-to-r from-[#dfffe0] to-[#77dd77] text-[#002f1b] dark:text-[#002f1b]" :
                          "bg-gradient-to-r from-[#002f1b] to-[#004225] text-white"
                        }`}>{client.progress === "improving" ? "In Progress" : client.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-8 px-3 text-xs font-bold uppercase tracking-wider text-[#004225] hover:bg-[#004225] hover:text-white"
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(`/credit-report?clientId=${client.id}&clientName=${encodeURIComponent(client.name)}`);
                            }}
                            title="View Work Area">
                            View Work Area
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-500 hover:bg-blue-50 dark:bg-blue-900/50 dark:bg-blue-900/500 rounded-lg"
                            onClick={(event) => {
                              event.stopPropagation();
                              openClientProfile(client.id);
                            }}
                            title="View Full Profile">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className={`h-8 w-8 p-0 rounded-lg ${client.status === "Active" ? "text-rose-500 hover:bg-rose-50 dark:bg-rose-900/50 dark:bg-rose-900/500" : "text-emerald-500 hover:bg-emerald-50 dark:bg-emerald-900/50 dark:bg-emerald-900/500"}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleToggleLoginStatus(client.id, client.status === "Active" ? "active" : "inactive");
                            }}
                            title={client.status === "Active" ? "Disable Login" : "Enable Login"}>
                            {client.status === "Active" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:bg-red-500 rounded-lg"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteClient(client.id);
                            }}
                            title="Delete Client">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                {filteredClients.length > 0 ? `${(pipelinePage - 1) * pageSize + 1}-${Math.min(pipelinePage * pageSize, filteredClients.length)} of ${filteredClients.length}` : "0 results"}
              </span>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" className="h-7 w-7 p-0 bg-white dark:bg-slate-900 dark:bg-slate-900" disabled={pipelinePage <= 1} onClick={() => setPipelinePage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                {(() => {
                  const pages: number[] = [];
                  let start = Math.max(1, pipelinePage - 2);
                  let end = Math.min(pipelineTotalPages, start + 4);
                  start = Math.max(1, end - 4);
                  for (let i = start; i <= end; i++) pages.push(i);
                  return pages.map((p) => (
                    <button key={p} onClick={() => setPipelinePage(p)}
                      className={`h-7 w-7 rounded-lg text-[11px] font-black transition-all ${pipelinePage === p ? "bg-slate-800 text-white shadow-md" : "text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:border-slate-700 hover:border-slate-300 dark:border-slate-600 dark:border-slate-600"}`}>
                      {p}
                    </button>
                  ));
                })()}
                {pipelineTotalPages > 5 && pipelinePage < pipelineTotalPages - 2 && <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 px-1 font-bold">...</span>}
                <Button size="sm" variant="outline" className="h-7 w-7 p-0 bg-white dark:bg-slate-900 dark:bg-slate-900" disabled={pipelinePage >= pipelineTotalPages} onClick={() => setPipelinePage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </motion.div>

      </motion.div>
    </div>
  );
}
