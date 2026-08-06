import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";
import { creditReportScraperApi } from "@/lib/api";
import { getBankruptcyBureaus } from "@/utils/fundingBankruptcyEligibility";
import { ChevronDown, Bot, Wrench, Plus, Check, Settings2, ShieldAlert, Gift, Building2, ChevronRight, CheckCircle, Loader2, Sparkles, ChevronUp, Maximize2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type CardType = "personal" | "business";
type GoalType = CardType | "both";
type StrategyMode = "hybrid" | "ai_matched" | "diy";
type BureauName = "Experian" | "Equifax" | "TransUnion";
type ApprovalStatus = "approved" | "not_approved";

interface FundingCard {
  id: number;
  card_image?: string;
  bank_id: number;
  bank_name?: string;
  bank_logo?: string;
  card_name: string;
  card_link: string;
  card_type: CardType;
  funding_type: string;
  credit_bureaus?: string[] | string | null;
  state?: string | null;
  states?: string[] | string | null;
  amount_approved?: number | null;
  average_amount?: number | null;
  no_of_usage?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface BankOption {
  id: number;
  name: string;
  logo?: string;
  state?: string | string[];
  credit_bureaus?: string[];
  primary_bureau?: string;
  recommended?: boolean;
  priority_rank?: number;
}

const isRecommendedBankFlag = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
};

interface SubmissionRow {
  card_id: number;
  status: string;
  amount_approved: number;
  admin_percent: number;
  description?: string;
}

interface StrategyCardEntry {
  card: FundingCard;
  bureau: BureauName | null;
  bureauOrder: number | null;
}

interface FundingStrategyStep {
  title: string;
  detail: string;
  card_id: number | null;
  bureau: string | null;
  bank_name: string | null;
  card_name: string | null;
}

interface FundingStrategyBureauStatus {
  used?: number | null;
  remaining?: number | null;
  locked?: boolean;
}

interface FundingStrategyRecommendation {
  rank?: number;
  card_name?: string;
  issuer?: string;
  card_type?: string;
  zero_apr_period?: string;
  balance_transfer_fee?: string;
  annual_fee?: string;
  bureau?: string;
  timing?: string;
  reason?: string;
  inquiry_note?: string;
}

interface FundingStrategyResult {
  summary?: string;
  summary_markdown?: string;
  picks?: Array<{
    id?: number;
    rank: number;
    bureau?: string;
    reason?: string;
    timing?: string;
    apr_terms?: string;
    annual_fee?: string;
    // AI-parsed Tier A fields (from `({Variable_Name (value)})` tags)
    card_name?: string;
    bank_name?: string;
    card_type?: string;
    apr?: string;
    credit_limit_potential?: string;
    application_timing?: string;
    inquiry_efficiency?: string;
  }>;
  inquiry_status?: {
    equifax?: FundingStrategyBureauStatus;
    experian?: FundingStrategyBureauStatus;
    transunion?: FundingStrategyBureauStatus;
  };
  recommendations?: FundingStrategyRecommendation[];
  fallback?: string | null;
  watchouts?: string[];
}

interface DiySlot {
  bankId?: number;
  fundingType?: string;
  cardId?: number;
}

const DEFAULT_CARD_IMAGE = "/uploads/card.png";
const FALLBACK_CARD_IMAGE = "/placeholder.png";
const DEFAULT_ADMIN_PERCENT = 10;
const ADMIN_PERCENT_PRESET_OPTIONS = [5, 7.5, 10, 12.5, 15, 20] as const;
const BUREAU_ORDER: BureauName[] = ["Experian", "Equifax", "TransUnion"];
const BUREAU_LOGO_PATHS: Record<BureauName, string> = {
  Experian: "/Experian_logo.svg.png",
  Equifax: "/Equifax_Logo.svg.png",
  TransUnion: "/TransUnion_logo.svg.png",
};

function formatCurrency(value: number, maximumFractionDigits = 0) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits,
    }).format(value || 0);
  } catch {
    return `$${Math.round(value || 0).toLocaleString()}`;
  }
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || "").trim()).filter(Boolean);
      }
    } catch {
      return value.split(/[|,]/).map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
}

function toPositiveNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getCardDisplayAmount(card: FundingCard): number | null {
  return toPositiveNumber(card.average_amount) ?? toPositiveNumber(card.amount_approved);
}

function formatGoalLabel(goal: GoalType) {
  return goal === "both" ? "Both" : goal === "business" ? "Business" : "Personal";
}

function formatOrdinal(value: number | null) {
  if (!value || value <= 0) return "";

  const tens = value % 100;
  if (tens >= 11 && tens <= 13) {
    return `${value}th`;
  }

  const ones = value % 10;
  if (ones === 1) return `${value}st`;
  if (ones === 2) return `${value}nd`;
  if (ones === 3) return `${value}rd`;
  return `${value}th`;
}

function openExternal(url?: string) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

function ComingSoonOverlay({
  title = "Coming Soon",
  detail,
  className = "",
}: {
  title?: string;
  detail?: string;
  className?: string;
}) {
  return (
    <div className={`absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-slate-900/70 backdrop-blur-sm ${className}`}>
      <div className="mx-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/90 px-4 py-3 text-center shadow-sm">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400 dark:text-slate-500">{title}</div>
        {detail ? <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">{detail}</div> : null}
      </div>
    </div>
  );
}

export default function FundingDIY() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { type } = useParams();
  const { userProfile } = useAuthContext();
  const { toast } = useToast();

  const routeGoal = String(type || "").toLowerCase();
  const stateGoal = String((location.state as any)?.goal || "").toLowerCase();
  const goalValue: GoalType = routeGoal === "business" || routeGoal === "personal" || routeGoal === "both"
    ? (routeGoal as GoalType)
    : stateGoal === "business" || stateGoal === "personal" || stateGoal === "both"
      ? (stateGoal as GoalType)
      : "both";

  const resolvedType: CardType | null = goalValue === "both" ? null : goalValue;

  const clientIdFromQuery = Number(
    searchParams.get("client_id") ||
    searchParams.get("clientId") ||
    searchParams.get("client") ||
    "",
  );
  const stateClientId = Number(((location.state as { clientId?: number } | null)?.clientId) ?? "");
  const clientIdFromAuth = userProfile?.role === "client" ? Number(userProfile?.id) : NaN;
  const clientId = [clientIdFromQuery, stateClientId, clientIdFromAuth].find(
    (value) => Number.isFinite(value) && (value as number) > 0,
  ) || 0;

  const [totalApprovedAmount, setTotalApprovedAmount] = useState(0);
  const [allCards, setAllCards] = useState<FundingCard[]>([]);
  const [recommendedAllCards, setRecommendedAllCards] = useState<FundingCard[]>([]);
  const [cards, setCards] = useState<FundingCard[]>([]);
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientDetails, setClientDetails] = useState<any>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [reportState, setReportState] = useState<string | null>(null);
  const [latestReportData, setLatestReportData] = useState<any>(null);
  const [reportLookupComplete, setReportLookupComplete] = useState(false);
  const [submittedRows, setSubmittedRows] = useState<SubmissionRow[]>([]);
  const [activeMode, setActiveMode] = useState<StrategyMode>("hybrid");
  const [aiStrategy, setAiStrategy] = useState<FundingStrategyResult | null>(null);
  const [aiStrategyRaw, setAiStrategyRaw] = useState<string>("");
  const [aiStrategyLoading, setAiStrategyLoading] = useState(false);
  const [aiStrategyError, setAiStrategyError] = useState<string | null>(null);
  const [aiSummaryExpanded, setAiSummaryExpanded] = useState(false);
  const [aiSummaryFullView, setAiSummaryFullView] = useState(false);
  const [lastAiRequestKey, setLastAiRequestKey] = useState<string | null>(null);
  const [aiQuota, setAiQuota] = useState<{ used: number; limit: number | null; remaining: number | null; unlimited: boolean } | null>(null);
  const [hybridManualSlots, setHybridManualSlots] = useState<DiySlot[]>([]);
  const [hybridBankSearchMap, setHybridBankSearchMap] = useState<Record<number, string>>({});
  const [diySlots, setDiySlots] = useState<DiySlot[]>([{}]);
  const [diyBankSearchMap, setDiyBankSearchMap] = useState<Record<number, string>>({});
  const [selectedDiyBureaus, setSelectedDiyBureaus] = useState<BureauName[]>([]);
  const [selectedFundingType, setSelectedFundingType] = useState<string>("all");
  const [globalAdminPercent, setGlobalAdminPercent] = useState<number>(DEFAULT_ADMIN_PERCENT);
  const [approvalDialogCard, setApprovalDialogCard] = useState<FundingCard | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>("not_approved");
  const [approvalAmount, setApprovalAmount] = useState<string>("");
  const [approvalAdminPercent, setApprovalAdminPercent] = useState<string>(String(DEFAULT_ADMIN_PERCENT));
  const [approvalComment, setApprovalComment] = useState("");
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const [invoiceMap, setInvoiceMap] = useState<Record<number, { token: string; url?: string }>>({});
  // Refs to read latest values from inside async callbacks (avoid stale closures
  // when multiple concurrent loadAiStrategy calls are in flight).
  const aiStrategyRef = useRef<FundingStrategyResult | null>(null);
  const aiStrategyRawRef = useRef<string>("");
  const aiInFlightRef = useRef<boolean>(false);
  useEffect(() => { aiStrategyRef.current = aiStrategy; }, [aiStrategy]);
  useEffect(() => { aiStrategyRawRef.current = aiStrategyRaw; }, [aiStrategyRaw]);
  const selectedDiyBureauSet = useMemo(() => new Set<BureauName>(selectedDiyBureaus), [selectedDiyBureaus]);

  const toggleDiyBureau = useCallback((bureau: BureauName) => {
    setSelectedDiyBureaus((previous) => (
      previous.includes(bureau)
        ? previous.filter((item) => item !== bureau)
        : BUREAU_ORDER.filter((item) => previous.includes(item) || item === bureau)
    ));
  }, []);

  const clearDiyBureauFilter = useCallback(() => {
    setSelectedDiyBureaus([]);
  }, []);

  const handleGoalChange = (next: string) => {
    const nextGoal = String(next || "").toLowerCase() as GoalType;
    if (!["personal", "business", "both"].includes(nextGoal)) return;
    if (nextGoal === goalValue) return;

    const search = searchParams.toString();
    navigate(
      {
        pathname: `/funding/diy/${nextGoal}`,
        search: search ? `?${search}` : "",
      },
      {
        state: {
          ...(location.state as any),
          clientId: clientId > 0 ? clientId : undefined,
          goal: nextGoal,
        },
      },
    );
  };

  // Reset to Hybrid only on FIRST load (or when the resolved client truly changes
  // from one positive id to a different positive id). Plain re-renders that
  // happen to recompute `clientId` (e.g. when userProfile reloads) must NOT
  // clobber the user's manual switch to AI-Matched.
  const lastClientIdRef = useRef<number>(0);
  useEffect(() => {
    if (clientId > 0 && lastClientIdRef.current !== clientId) {
      if (lastClientIdRef.current !== 0) {
        setActiveMode("hybrid");
      }
      lastClientIdRef.current = clientId;
    }
  }, [clientId]);

  const compareUpTo = useMemo(() => {
    const inquiriesByBureau = (location.state as any)?.inquiriesByBureau || {};
    const normalize = (value: unknown) => Math.max(0, Math.floor(Number(value || 0)));
    const mapInquiryToSlots = (inquiryCount: number) => {
      if (inquiryCount >= 4) return 0;
      if (inquiryCount === 3) return 1;
      if (inquiryCount === 2) return 2;
      if (inquiryCount === 1) return 3;
      return 4;
    };

    const total = mapInquiryToSlots(normalize(inquiriesByBureau?.Experian))
      + mapInquiryToSlots(normalize(inquiriesByBureau?.Equifax))
      + mapInquiryToSlots(normalize(inquiriesByBureau?.TransUnion));

    return total > 0 ? total : 3;
  }, [location.state]);

  const bureauPullCounts = useMemo(() => {
    const inquiriesByBureau = (location.state as any)?.inquiriesByBureau || {};
    const normalize = (value: unknown) => Math.max(0, Math.floor(Number(value || 0)));
    const mapInquiryToSlots = (inquiryCount: number) => {
      if (inquiryCount >= 4) return 0;
      if (inquiryCount === 3) return 1;
      if (inquiryCount === 2) return 2;
      if (inquiryCount === 1) return 3;
      return 4;
    };

    const Experian = mapInquiryToSlots(normalize(inquiriesByBureau?.Experian));
    const Equifax = mapInquiryToSlots(normalize(inquiriesByBureau?.Equifax));
    const TransUnion = mapInquiryToSlots(normalize(inquiriesByBureau?.TransUnion));

    return {
      Experian,
      Equifax,
      TransUnion,
      total: Experian + Equifax + TransUnion,
    };
  }, [location.state]);

  const canonicalProductType = useCallback((value: unknown) => {
    const fundingType = String(value || "").toLowerCase();
    if (fundingType.includes("sba")) return "SBA Loan";
    if (fundingType.includes("line")) return "Line of Credit";
    if (fundingType.includes("credit")) return "Credit Card";
    if (fundingType.includes("merchant cash") || fundingType.includes("cash advance") || fundingType === "mca") return "Merchant Cash Advance";
    if (fundingType.includes("sub prime") || fundingType.includes("subprime")) return "Sub Prime Lenders";
    if (fundingType.includes("loan") || fundingType.includes("term") || fundingType.includes("installment") || fundingType.includes("mortgage")) return "Loan";
    return String(value || "");
  }, []);

  const HOME_EQUITY_COMPOSITE = "Home Equity (Loan / Line)";
  const isPersonalExtraType = useCallback((value: string) => {
    return [HOME_EQUITY_COMPOSITE, "Auto Loan"].includes(String(value));
  }, [HOME_EQUITY_COMPOSITE]);

  const cardMatchesPersonalExtra = useCallback((extra: string, card: FundingCard) => {
    const text = `${String(card.card_name || "")} ${String(card.funding_type || "")}`.toLowerCase();
    const has = (token: string) => text.includes(token);

    if (extra === HOME_EQUITY_COMPOSITE) {
      const isLoan = has("loan") || has("loans") || has("lending") || has("mortgage");
      const isLine = has("line") || has("loc") || has("line of credit") || has("heloc") || has("home equity line");
      const isHome = has("home") || has("home equity") || has("mortgage");
      return isHome && (isLoan || isLine);
    }

    if (extra === "Auto Loan") {
      return has("auto loan") || has("car loan") || has("vehicle loan");
    }

    return false;
  }, [HOME_EQUITY_COMPOSITE]);

  const matchesFundingType = useCallback((card: FundingCard, fundingType?: string) => {
    const effectiveFundingType = String(fundingType || "");
    if (!effectiveFundingType || effectiveFundingType === "all") {
      return true;
    }

    if (isPersonalExtraType(effectiveFundingType)) {
      return cardMatchesPersonalExtra(effectiveFundingType, card);
    }

    const canonical = canonicalProductType(card.funding_type);
    return canonical === effectiveFundingType || String(card.funding_type || "").toLowerCase() === effectiveFundingType.toLowerCase();
  }, [canonicalProductType, cardMatchesPersonalExtra, isPersonalExtraType]);

  const productTypesFromState: string[] = Array.isArray((location.state as any)?.productTypes)
    ? ((location.state as any).productTypes as string[]).map(canonicalProductType)
    : ["Credit Card", "Line of Credit", "Loan", "SBA Loan", "Merchant Cash Advance", "Sub Prime Lenders"];

  const allowedFundingTypeSet = useMemo(() => {
    const next = new Set<string>();
    productTypesFromState.map(canonicalProductType).filter(Boolean).forEach((item) => next.add(item));
    for (const card of allCards) {
      const raw = String(card.funding_type || "").trim();
      const canonical = canonicalProductType(raw);
      if (raw) next.add(raw);
      if (canonical) next.add(canonical);
    }
    return next;
  }, [allCards, canonicalProductType, productTypesFromState]);

  const fundingTypes = useMemo(() => {
    const source = (goalValue === "both" ? allCards : cards).filter((card) => {
      const raw = String(card.funding_type || "").trim();
      const canonical = canonicalProductType(raw);
      return allowedFundingTypeSet.has(raw) || allowedFundingTypeSet.has(canonical);
    });
    const merged = Array.from(new Set(source.map((card) => canonicalProductType(card.funding_type)).filter(Boolean)));

    if (goalValue === "personal" || goalValue === "both") {
      const hasHomeEquityLike = source.some((card) => cardMatchesPersonalExtra(HOME_EQUITY_COMPOSITE, card));
      if (hasHomeEquityLike && !merged.includes(HOME_EQUITY_COMPOSITE)) {
        merged.push(HOME_EQUITY_COMPOSITE);
      }
      if (!merged.includes("Auto Loan")) {
        merged.push("Auto Loan");
      }
    }

    return ["all", ...merged];
  }, [allCards, allowedFundingTypeSet, canonicalProductType, cardMatchesPersonalExtra, cards, goalValue, HOME_EQUITY_COMPOSITE]);

  useEffect(() => {
    if (selectedFundingType === "all") return;
    if (!fundingTypes.includes(selectedFundingType)) {
      setSelectedFundingType("all");
    }
  }, [fundingTypes, selectedFundingType]);

  const loadApprovalStats = useCallback(async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    try {
      const response = await fetch("/api/funding/diy-submissions/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch approval stats: ${response.status}`);
      }

      const payload = await response.json();
      setTotalApprovedAmount(Number(payload?.data?.totalApprovedAmount || 0));
    } catch (statsError) {
      console.error("Error loading total approved amount:", statsError);
    }
  }, []);

  useEffect(() => {
    void loadApprovalStats();
  }, [loadApprovalStats]);

  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = { Authorization: `Bearer ${localStorage.getItem("auth_token")}` };
      const normalizeCards = (items: FundingCard[]) => items.map((card: FundingCard) => ({
        ...card,
        funding_type: String(card.funding_type || ""),
        credit_bureaus: parseStringArray(card.credit_bureaus),
        states: parseStringArray(card.states),
        state: card.state || null,
      })) as FundingCard[];

      const [allCardsResponse, recommendedCardsResponse] = await Promise.all([
        fetch("/api/cards?status=active&page=1&limit=2000", { headers }),
        fetch("/api/cards?status=active&page=1&limit=2000&recommended=true", { headers }),
      ]);

      if (!allCardsResponse.ok) {
        throw new Error("Failed to fetch funding cards");
      }

      if (!recommendedCardsResponse.ok) {
        throw new Error("Failed to fetch recommended funding cards");
      }

      const allCardsData = await allCardsResponse.json();
      const recommendedCardsData = await recommendedCardsResponse.json();
      const fetchedCards = normalizeCards(allCardsData.cards || []);
      const fetchedRecommendedCards = normalizeCards(recommendedCardsData.cards || []);

      setAllCards(fetchedCards);
      setRecommendedAllCards(fetchedRecommendedCards);
      setCards(goalValue === "both" ? fetchedCards : fetchedCards.filter((card) => card.card_type === goalValue));
    } catch (cardsError: any) {
      console.error("Error fetching cards:", cardsError);
      setError(cardsError?.message || "Failed to load cards");
    } finally {
      setLoading(false);
    }
  }, [goalValue]);

  useEffect(() => {
    void loadCards();
  }, [loadCards]);

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const nextBanks: BankOption[] = [];
        let page = 1;
        const limit = 1000;

        while (true) {
          const response = await fetch(`/api/banks?page=${page}&limit=${limit}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!response.ok) break;

          const data = await response.json();
          const bankItems = (data.banks || []).map((bank: any) => ({
            id: Number(bank.id),
            name: String(bank.name || bank.bank_name || `Bank #${bank.id}`),
            logo: bank.logo || bank.bank_logo,
            state: bank?.state ?? undefined,
            credit_bureaus: parseStringArray(bank?.credit_bureaus),
            primary_bureau: bank?.primary_bureau ?? bank?.primaryBureau ?? undefined,
            recommended: isRecommendedBankFlag(bank?.is_recommended),
            priority_rank: Number(bank?.priority_rank ?? bank?.rank ?? 0),
          }));

          nextBanks.push(...bankItems);

          const totalPages = Number(data?.pagination?.totalPages ?? data?.pagination?.pages ?? 1);
          if (!Number.isFinite(totalPages) || page >= totalPages) break;
          page += 1;
        }

        setBanks(nextBanks);
      } catch (banksError) {
        console.error("Error fetching banks:", banksError);
      }
    };

    fetchBanks();
  }, []);

  useEffect(() => {
    if (!clientId || clientId <= 0) return;

    const fetchClient = async () => {
      try {
        const response = await fetch(`/api/clients/${clientId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        });
        if (!response.ok) throw new Error("Failed to fetch client details");
        const data = await response.json();
        setClientDetails(data);
      } catch (clientError) {
        console.error("Error loading client details:", clientError);
      }
    };

    fetchClient();
  }, [clientId]);

  const US_STATE_CODES = useMemo(() => [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  ], []);

  const extractStateFromReportData = useCallback((raw: any): string | null => {
    if (!raw) return null;
    const payload = raw.reportData || raw.report_data || raw;
    const addresses: any[] = Array.isArray(payload.Address)
      ? payload.Address
      : Array.isArray(payload.addresses)
        ? payload.addresses
        : [];

    for (let index = 0; index < addresses.length; index += 1) {
      const address = addresses[index] || {};
      const code = String(address.State || address.state || "").trim().toUpperCase();
      if (US_STATE_CODES.includes(code)) return code;
    }

    return null;
  }, [US_STATE_CODES]);

  const resolveClientState = useCallback((): string | null => {
    const rawState = String(clientDetails?.state || "").trim();
    const upperState = rawState.toUpperCase();
    if (US_STATE_CODES.includes(upperState)) return upperState;

    const address = String(clientDetails?.address || "").toUpperCase();
    if (!address) return null;

    const tokens = address.replace(/[^A-Z0-9]/g, " ").split(/\s+/).filter(Boolean);
    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];
      if (token.length === 2 && US_STATE_CODES.includes(token)) return token;
    }

    const withZip = address.match(/\b([A-Z]{2})\s+\d{5}(?:-\d{4})?\b/);
    if (withZip && US_STATE_CODES.includes(withZip[1])) return withZip[1];

    return null;
  }, [US_STATE_CODES, clientDetails]);

  useEffect(() => {
    if (!clientId || clientId <= 0) {
      setLatestReportData(null);
      setReportLookupComplete(true);
      return;
    }

    let cancelled = false;
    setReportLookupComplete(false);

    const loadReportState = async () => {
      try {
        const response = await creditReportScraperApi.getClientReport(String(clientId));
        const payload = response?.data?.data ?? response?.data ?? {};
        const reportBlock = payload.reportData || payload.report_data || payload;
        if (!cancelled) {
          setLatestReportData(reportBlock);
        }
        const stateCode = extractStateFromReportData(reportBlock);
        if (!cancelled && stateCode) {
          setReportState(stateCode);
          setSelectedState((previous) => previous || stateCode);
        }
      } catch {
        if (!cancelled) {
          setLatestReportData(null);
        }
      } finally {
        if (!cancelled) {
          setReportLookupComplete(true);
        }
      }
    };

    loadReportState();

    return () => {
      cancelled = true;
    };
  }, [clientId, extractStateFromReportData, resolveClientState]);

  useEffect(() => {
    const stateCode = resolveClientState();
    if (stateCode) {
      setSelectedState(stateCode);
    } else if (reportState) {
      setSelectedState(reportState);
    } else {
      setSelectedState(null);
    }
  }, [reportState, resolveClientState]);

  useEffect(() => {
    if (!clientId || clientId <= 0) {
      setSubmittedRows([]);
      return;
    }

    const fetchSubmissions = async () => {
      try {
        const response = await fetch(`/api/funding/diy-submissions?client_id=${clientId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        setSubmittedRows((data?.data || []) as SubmissionRow[]);
      } catch {
        // no-op
      }
    };

    fetchSubmissions();
  }, [clientId]);

  const fundableBureaus = useMemo(() => {
    const output: string[] = [];
    const normalize = (value: unknown) => {
      if (typeof value === "boolean") return value;
      const numeric = Number(value);
      if (Number.isFinite(numeric)) return numeric === 1;
      const text = String(value || "").toLowerCase();
      return text === "true" || text === "yes" || text === "1";
    };

    try {
      const bankruptcyBureaus = getBankruptcyBureaus(latestReportData);
      if (normalize((clientDetails as any)?.fundable_in_ex) && !bankruptcyBureaus.has("Experian")) output.push("Experian");
      if (normalize((clientDetails as any)?.fundable_in_eq) && !bankruptcyBureaus.has("Equifax")) output.push("Equifax");
      if (normalize((clientDetails as any)?.fundable_in_tu) && !bankruptcyBureaus.has("TransUnion")) output.push("TransUnion");
    } catch {
      return [];
    }

    return output;
  }, [clientDetails, latestReportData]);

  const bankruptcyBureaus = useMemo(() => getBankruptcyBureaus(latestReportData), [latestReportData]);

  const goalCards = useMemo(() => (goalValue === "both" ? allCards : cards), [allCards, cards, goalValue]);
  const recommendedGoalCards = useMemo(() => (
    goalValue === "both"
      ? recommendedAllCards
      : recommendedAllCards.filter((card) => card.card_type === goalValue)
  ), [goalValue, recommendedAllCards]);
  const filteredGoalCards = useMemo(() => {
    return goalCards.filter((card) => {
      const raw = String(card.funding_type || "").trim();
      const canonical = canonicalProductType(raw);
      return (allowedFundingTypeSet.has(raw) || allowedFundingTypeSet.has(canonical))
        && matchesFundingType(card, selectedFundingType);
    });
  }, [allowedFundingTypeSet, canonicalProductType, goalCards, matchesFundingType, selectedFundingType]);
  const filteredRecommendedGoalCards = useMemo(() => {
    return recommendedGoalCards.filter((card) => {
      const raw = String(card.funding_type || "").trim();
      const canonical = canonicalProductType(raw);
      return (allowedFundingTypeSet.has(raw) || allowedFundingTypeSet.has(canonical))
        && matchesFundingType(card, selectedFundingType);
    });
  }, [allowedFundingTypeSet, canonicalProductType, matchesFundingType, recommendedGoalCards, selectedFundingType]);
  const diyRecommendedBankIds = useMemo(() => {
    return new Set(filteredRecommendedGoalCards.map((card) => card.bank_id));
  }, [filteredRecommendedGoalCards]);

  useEffect(() => {
    setDiySlots([{}]);
    setDiyBankSearchMap({});
    setHybridManualSlots([]);
    setHybridBankSearchMap({});
  }, [clientId, goalValue]);

  const allBanks = useMemo(() => {
    if (banks.length > 0) return banks;
    const nextBanks = new Map<number, BankOption>();
    for (const card of goalCards) {
      if (!nextBanks.has(card.bank_id)) {
        nextBanks.set(card.bank_id, {
          id: card.bank_id,
          name: card.bank_name || `Bank #${card.bank_id}`,
          logo: card.bank_logo,
        });
      }
    }
    return Array.from(nextBanks.values());
  }, [banks, goalCards]);

  const canonBureau = useCallback((value: string): "Experian" | "Equifax" | "TransUnion" | null => {
    const normalized = String(value || "").toLowerCase().replace(/\s+/g, "").replace(/[-_]/g, "");
    if (normalized === "experian" || normalized === "ex" || normalized === "exp") return "Experian";
    if (normalized === "equifax" || normalized === "eq" || normalized === "equ") return "Equifax";
    if (normalized === "transunion" || normalized === "tu" || normalized === "transu") return "TransUnion";
    return null;
  }, []);

  const allowedBureauSet = useMemo(() => {
    const next = new Set<BureauName>();
    fundableBureaus.forEach((bureau) => {
      const canonical = canonBureau(bureau);
      if (canonical) next.add(canonical);
    });
    return next;
  }, [canonBureau, fundableBureaus]);

  const availableBureauCounts = useMemo<Record<BureauName, number>>(() => ({
    Experian: allowedBureauSet.size === 0 || allowedBureauSet.has("Experian") ? bureauPullCounts.Experian : 0,
    Equifax: allowedBureauSet.size === 0 || allowedBureauSet.has("Equifax") ? bureauPullCounts.Equifax : 0,
    TransUnion: allowedBureauSet.size === 0 || allowedBureauSet.has("TransUnion") ? bureauPullCounts.TransUnion : 0,
  }), [allowedBureauSet, bureauPullCounts.Equifax, bureauPullCounts.Experian, bureauPullCounts.TransUnion]);

  const cardHasBureau = useCallback((card: FundingCard, bureau: "Experian" | "Equifax" | "TransUnion") => {
    if (bankruptcyBureaus.has(bureau)) return false;
    const cardBureaus = parseStringArray(card.credit_bureaus);
    const bankBureaus = allBanks.find((bank) => bank.id === card.bank_id)?.credit_bureaus || [];
    const merged = Array.from(new Set([...cardBureaus, ...bankBureaus]));
    return merged.map(canonBureau).filter(Boolean).includes(bureau);
  }, [allBanks, bankruptcyBureaus, canonBureau]);

  const bankEligibility = useCallback((bankId?: number) => {
    const stateCode = String(selectedState || resolveClientState() || "").toUpperCase();
    const cardsByBank = goalCards.filter((card) => card.bank_id === bankId);
    const bank = allBanks.find((item) => item.id === bankId);
    const normalize = (value: string) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const nationwideTokens = new Set<string>([
      "USA", "US", "ALL", "ANY", "NATIONWIDE", "ALLSTATES", "ANYSTATE", "UNITEDSTATES", "UNITEDSTATESOFAMERICA", "ANYWHERE", "50STATES",
    ]);

    let stateRank = 0;
    let isNationwide = false;

    const bankStatesArray = Array.isArray(bank?.state)
      ? bank?.state
      : typeof bank?.state === "string" && bank.state.trim().length > 0
        ? (() => {
            try {
              const parsed = JSON.parse(bank.state);
              return Array.isArray(parsed) ? parsed : [bank.state as string];
            } catch {
              return [bank.state as string];
            }
          })()
        : [];

    const bankStatesUpper = bankStatesArray.map((item) => String(item).toUpperCase());
    const bankStatesNormalized = bankStatesArray.map(normalize);

    if (bankStatesUpper.some((item) => ["USA", "US", "ALL", "ANY", "NATIONWIDE"].includes(item)) || bankStatesNormalized.some((item) => nationwideTokens.has(item))) {
      isNationwide = true;
      stateRank = Math.max(stateRank, 2);
    }

    if (stateCode && (bankStatesUpper.includes(stateCode) || bankStatesNormalized.includes(normalize(stateCode)))) {
      stateRank = Math.max(stateRank, 3);
    }

    const isCardEligible = (card: FundingCard) => {
      const statesArray = parseStringArray(card.states);
      const stateValue = String(card.state || "").toUpperCase();
      const stateValueNormalized = normalize(stateValue);
      const statesUpper = statesArray.map((item) => item.toUpperCase());
      const statesNormalized = statesArray.map(normalize);

      if (statesUpper.includes("USA") || statesUpper.includes("US") || statesUpper.includes("ALL") || statesUpper.includes("ANY") || statesNormalized.some((item) => nationwideTokens.has(item))) {
        stateRank = Math.max(stateRank, 2);
        isNationwide = true;
        return true;
      }

      if (["USA", "US", "ALL", "ANY", "NATIONWIDE"].includes(stateValue) || nationwideTokens.has(stateValueNormalized)) {
        stateRank = Math.max(stateRank, 2);
        isNationwide = true;
        return true;
      }

      if (stateValue && stateValue === stateCode) {
        stateRank = Math.max(stateRank, 3);
        return true;
      }

      if (statesUpper.length > 0 && statesUpper.includes(stateCode)) {
        stateRank = Math.max(stateRank, 3);
        return true;
      }

      if (!stateValue && statesUpper.length === 0) {
        stateRank = Math.max(stateRank, 1);
        return true;
      }

      return false;
    };

    const stateEligible = cardsByBank.some(isCardEligible)
      || isNationwide
      || Boolean(stateCode && (bankStatesUpper.includes(stateCode) || bankStatesNormalized.includes(normalize(stateCode))));

    return {
      stateEligible,
      stateRank,
      isNationwide,
      bureauEligible: {
        Experian: cardsByBank.some((card) => cardHasBureau(card, "Experian")) || Boolean(bank?.credit_bureaus?.includes("Experian")),
        Equifax: cardsByBank.some((card) => cardHasBureau(card, "Equifax")) || Boolean(bank?.credit_bureaus?.includes("Equifax")),
        TransUnion: cardsByBank.some((card) => cardHasBureau(card, "TransUnion")) || Boolean(bank?.credit_bureaus?.includes("TransUnion")),
      },
    };
  }, [allBanks, cardHasBureau, goalCards, resolveClientState, selectedState]);

  const sortedBanks = useMemo(() => {
    const allowedSet = new Set(fundableBureaus);

    return [...allBanks]
      .filter((bank) => {
        const eligibility = bankEligibility(bank.id);
        const hasAnyEligibleBureau = allowedSet.size === 0
          ? (eligibility.bureauEligible.Experian || eligibility.bureauEligible.Equifax || eligibility.bureauEligible.TransUnion)
          : Array.from(allowedSet).some((bureau) => (eligibility.bureauEligible as any)[bureau]);

        const hasRelevantProduct = filteredGoalCards.some((card) => {
          if (card.bank_id !== bank.id) return false;

          if (allowedSet.size === 0) return true;

          return (
            (allowedSet.has("Experian") && cardHasBureau(card, "Experian"))
            || (allowedSet.has("Equifax") && cardHasBureau(card, "Equifax"))
            || (allowedSet.has("TransUnion") && cardHasBureau(card, "TransUnion"))
          );
        });

        return hasAnyEligibleBureau && hasRelevantProduct;
      })
      .sort((left, right) => {
        if ((right.recommended === true) !== (left.recommended === true)) {
          return Number(right.recommended === true) - Number(left.recommended === true);
        }

        if (Number(left.priority_rank || 0) !== Number(right.priority_rank || 0)) {
          return Number(left.priority_rank || 0) - Number(right.priority_rank || 0);
        }

        const leftEligibility = bankEligibility(left.id);
        const rightEligibility = bankEligibility(right.id);
        const leftScore = Number(leftEligibility.stateRank || (leftEligibility.stateEligible ? 1 : 0));
        const rightScore = Number(rightEligibility.stateRank || (rightEligibility.stateEligible ? 1 : 0));

        if (rightScore !== leftScore) {
          return rightScore - leftScore;
        }

        return left.name.localeCompare(right.name);
      });
  }, [allBanks, bankEligibility, cardHasBureau, filteredGoalCards, fundableBureaus]);

  const cardById = useMemo(() => {
    const next = new Map<number, FundingCard>();
    goalCards.forEach((card) => next.set(card.id, card));
    return next;
  }, [goalCards]);

  // Lookup map from normalized card_name → FundingCard, used to find a card image for
  // AI-recommended cards (matching by name against the full DB catalog).
  const cardByName = useMemo(() => {
    const next = new Map<string, FundingCard>();
    const normalize = (value: string) =>
      value
        .toLowerCase()
        .replace(/[®™©]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    for (const card of allCards) {
      const key = normalize(String(card.card_name || ""));
      if (key && !next.has(key)) next.set(key, card);
    }
    return next;
  }, [allCards]);
  const findCatalogCardByName = useCallback((name: string): FundingCard | null => {
    if (!name) return null;
    const normalize = (value: string) =>
      value
        .toLowerCase()
        .replace(/[®™©]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    const key = normalize(name);
    if (!key) return null;
    return cardByName.get(key) || null;
  }, [cardByName]);

  const getCardSupportedBureaus = useCallback((card: FundingCard): BureauName[] => {
    return BUREAU_ORDER.filter((bureau) => (
      (allowedBureauSet.size === 0 || allowedBureauSet.has(bureau))
      && (selectedDiyBureauSet.size === 0 || selectedDiyBureauSet.has(bureau))
      && cardHasBureau(card, bureau)
    ));
  }, [allowedBureauSet, cardHasBureau, selectedDiyBureauSet]);

  const assignCardToRemainingBureau = useCallback((card: FundingCard, remainingCounts: Record<BureauName, number>): BureauName | null => {
    const supported = getCardSupportedBureaus(card).filter((bureau) => remainingCounts[bureau] > 0);
    if (supported.length === 0) return null;

    return [...supported].sort((left, right) => {
      if (remainingCounts[right] !== remainingCounts[left]) {
        return remainingCounts[right] - remainingCounts[left];
      }
      return BUREAU_ORDER.indexOf(left) - BUREAU_ORDER.indexOf(right);
    })[0];
  }, [getCardSupportedBureaus]);

  const evaluateDiySlots = useCallback((slots: DiySlot[], skippedIndex?: number) => {
    const remaining = { ...availableBureauCounts };

    return slots.map((slot, index) => {
      const card = slot.cardId ? cardById.get(slot.cardId) ?? null : null;
      let assignedBureau: BureauName | null = null;

      if (card && index !== skippedIndex) {
        assignedBureau = assignCardToRemainingBureau(card, remaining);
        if (assignedBureau) {
          remaining[assignedBureau] = Math.max(0, remaining[assignedBureau] - 1);
        }
      }

      return {
        card,
        assignedBureau,
        remainingAfter: { ...remaining },
      };
    });
  }, [assignCardToRemainingBureau, availableBureauCounts, cardById]);

  const diyEvaluatedSlots = useMemo(() => evaluateDiySlots(diySlots), [diySlots, evaluateDiySlots]);

  const diyRemainingCounts = useMemo<Record<BureauName, number>>(() => {
    const last = diyEvaluatedSlots[diyEvaluatedSlots.length - 1];
    return last?.remainingAfter ?? { ...availableBureauCounts };
  }, [availableBureauCounts, diyEvaluatedSlots]);

  const getRemainingCountsForDiySlot = useCallback((slotIndex: number) => {
    const evaluation = evaluateDiySlots(diySlots, slotIndex);
    const last = evaluation[evaluation.length - 1];
    return last?.remainingAfter ?? { ...availableBureauCounts };
  }, [availableBureauCounts, diySlots, evaluateDiySlots]);

  const getEligibleDiyCards = useCallback((slotIndex: number, overrides?: Partial<DiySlot>) => {
    const slot = diySlots[slotIndex] || {};
    const bankId = overrides?.bankId ?? slot.bankId;
    const slotFundingType = overrides?.fundingType ?? slot.fundingType;
    const fundingType = selectedFundingType === "all" ? slotFundingType : selectedFundingType;
    const currentCardId = overrides?.cardId ?? slot.cardId;
    const selectedElsewhere = new Set(
      diySlots.flatMap((currentSlot, index) => (index !== slotIndex && currentSlot.cardId ? [currentSlot.cardId] : [])),
    );
    const remainingCounts = getRemainingCountsForDiySlot(slotIndex);

    return goalCards
      .filter((card) => {
        if (bankId && card.bank_id !== bankId) return false;
        if (selectedElsewhere.has(card.id) && card.id !== currentCardId) return false;

        const raw = String(card.funding_type || "");
        const canonical = canonicalProductType(raw);
        if (!allowedFundingTypeSet.has(raw) && !allowedFundingTypeSet.has(canonical)) return false;
          if (!matchesFundingType(card, fundingType)) return false;

        const supported = getCardSupportedBureaus(card).filter((bureau) => remainingCounts[bureau] > 0);
        const keepCurrentSelection = card.id === currentCardId && getCardSupportedBureaus(card).length > 0;
        return supported.length > 0 || keepCurrentSelection;
      })
      .sort((left, right) => left.card_name.localeCompare(right.card_name));
        }, [allowedFundingTypeSet, canonicalProductType, diySlots, getCardSupportedBureaus, getRemainingCountsForDiySlot, goalCards, matchesFundingType, selectedFundingType]);

  const getDiyBankOptions = useCallback((slotIndex: number) => {
    const eligibleBanks = sortedBanks.filter((bank) => getEligibleDiyCards(slotIndex, { bankId: bank.id }).length > 0);
    const recommendedBanks: BankOption[] = [];
    const otherBanks: BankOption[] = [];

    eligibleBanks.forEach((bank) => {
      if (diyRecommendedBankIds.has(bank.id)) {
        recommendedBanks.push(bank);
      } else {
        otherBanks.push(bank);
      }
    });

    return [...recommendedBanks, ...otherBanks];
  }, [diyRecommendedBankIds, getEligibleDiyCards, sortedBanks]);

  const getDiyFundingTypes = useCallback((slotIndex: number) => {
    const slot = diySlots[slotIndex];
    if (!slot?.bankId) return [] as string[];

    return Array.from(new Set(
      getEligibleDiyCards(slotIndex, { bankId: slot.bankId, fundingType: undefined })
        .map((card) => canonicalProductType(card.funding_type))
        .filter(Boolean),
    )).sort((left, right) => left.localeCompare(right));
  }, [canonicalProductType, diySlots, getEligibleDiyCards]);

  useEffect(() => {
    setDiySlots((previous) => {
      let changed = false;

      const next = previous.map((slot, slotIndex) => {
        let nextSlot = slot;

        if (nextSlot.bankId) {
          const bankStillEligible = getDiyBankOptions(slotIndex).some((bank) => bank.id === nextSlot.bankId);
          if (!bankStillEligible) {
            changed = true;
            return {};
          }
        }

        if (nextSlot.fundingType && nextSlot.bankId) {
          const fundingTypeStillEligible = getDiyFundingTypes(slotIndex).includes(nextSlot.fundingType);
          if (!fundingTypeStillEligible) {
            changed = true;
            nextSlot = { ...nextSlot, fundingType: undefined, cardId: undefined };
          }
        }

        if (nextSlot.cardId) {
          const cardStillEligible = getEligibleDiyCards(slotIndex, nextSlot).some((card) => card.id === nextSlot.cardId);
          if (!cardStillEligible) {
            changed = true;
            nextSlot = { ...nextSlot, cardId: undefined };
          }
        }

        return nextSlot;
      });

      return changed ? next : previous;
    });
  }, [getDiyBankOptions, getDiyFundingTypes, getEligibleDiyCards, selectedDiyBureauSet]);

  const updateDiySlot = useCallback((slotIndex: number, patch: Partial<DiySlot>) => {
    setDiySlots((previous) => previous.map((slot, index) => (index === slotIndex ? { ...slot, ...patch } : slot)));
  }, []);

  const addDiySlot = useCallback(() => {
    setDiySlots((previous) => [...previous, {}]);
  }, []);

  const removeDiySlot = useCallback((slotIndex: number) => {
    setDiySlots((previous) => (previous.length === 1 ? previous : previous.filter((_, index) => index !== slotIndex)));
  }, []);

  const diyHasRemainingCapacity = useMemo(() => BUREAU_ORDER.some((bureau) => diyRemainingCounts[bureau] > 0), [diyRemainingCounts]);

  const strategyEntries = useMemo(() => {
    if (filteredRecommendedGoalCards.length === 0) return [] as StrategyCardEntry[];

    const allowedSet = new Set(fundableBureaus);
    const counts: Record<"Experian" | "Equifax" | "TransUnion", number> = {
      Experian: allowedSet.size === 0 || allowedSet.has("Experian") ? bureauPullCounts.Experian : 0,
      Equifax: allowedSet.size === 0 || allowedSet.has("Equifax") ? bureauPullCounts.Equifax : 0,
      TransUnion: allowedSet.size === 0 || allowedSet.has("TransUnion") ? bureauPullCounts.TransUnion : 0,
    };

    const targets: Array<{ type: CardType; bureau: "Experian" | "Equifax" | "TransUnion" }> = [];
    const desiredBureauOrder: Array<"Experian" | "Equifax" | "TransUnion"> = ["Experian", "Equifax", "TransUnion"];

    desiredBureauOrder.forEach((bureau) => {
      const slotCount = Math.max(0, Math.floor(Number(counts[bureau] || 0)));
      if (slotCount <= 0) return;

      if (goalValue === "both") {
        const businessSlots = Math.ceil(slotCount / 2);
        const personalSlots = slotCount - businessSlots;
        for (let index = 0; index < businessSlots; index += 1) {
          targets.push({ type: "business", bureau });
        }
        for (let index = 0; index < personalSlots; index += 1) {
          targets.push({ type: "personal", bureau });
        }
      } else if (resolvedType) {
        for (let index = 0; index < slotCount; index += 1) {
          targets.push({ type: resolvedType, bureau });
        }
      }
    });

    const bankOrder = new Map<number, number>();
    sortedBanks.forEach((bank, index) => bankOrder.set(bank.id, index));
    const pickedCardIds = new Set<number>();
    const bureauOrders: Record<"Experian" | "Equifax" | "TransUnion", number> = {
      Experian: 0,
      Equifax: 0,
      TransUnion: 0,
    };

    const pickFor = (target: { type: CardType; bureau: "Experian" | "Equifax" | "TransUnion" }) => {
      let pool = filteredRecommendedGoalCards.filter((card) => card.card_type === target.type);

      pool = pool.filter((card) => cardHasBureau(card, target.bureau));
      if (pool.length === 0) return null;

      const bankUsage = new Map<number, number>();
      pickedCardIds.forEach((cardId) => {
        const existing = filteredRecommendedGoalCards.find((card) => card.id === cardId);
        if (existing) {
          bankUsage.set(existing.bank_id, (bankUsage.get(existing.bank_id) || 0) + 1);
        }
      });

      const sortedPool = [...pool].sort((left, right) => {
        const leftUsage = bankUsage.get(left.bank_id) || 0;
        const rightUsage = bankUsage.get(right.bank_id) || 0;
        if (leftUsage !== rightUsage) return leftUsage - rightUsage;

        const leftBankOrder = bankOrder.get(left.bank_id) ?? 1_000_000;
        const rightBankOrder = bankOrder.get(right.bank_id) ?? 1_000_000;
        if (leftBankOrder !== rightBankOrder) return leftBankOrder - rightBankOrder;

        return left.card_name.localeCompare(right.card_name);
      });

      const picked = sortedPool.find((card) => !pickedCardIds.has(card.id)) || sortedPool[0];

      if (picked) pickedCardIds.add(picked.id);
      return picked;
    };

    const recommended = targets
      .map((target) => {
        const card = pickFor(target);
        if (!card) return null;

        bureauOrders[target.bureau] += 1;
        return {
          card,
          bureau: target.bureau,
          bureauOrder: bureauOrders[target.bureau],
        } satisfies StrategyCardEntry;
      })
      .filter(Boolean) as StrategyCardEntry[];

    return recommended;
  }, [bureauPullCounts.Equifax, bureauPullCounts.Experian, bureauPullCounts.TransUnion, cardHasBureau, compareUpTo, filteredRecommendedGoalCards, fundableBureaus, goalValue, resolvedType, sortedBanks]);

  const strategyCards = useMemo(() => strategyEntries.map((entry) => entry.card), [strategyEntries]);

  const getEligibleHybridCards = useCallback((slotIndex: number, overrides?: Partial<DiySlot>) => {
    const slot = hybridManualSlots[slotIndex] || {};
    const bankId = overrides?.bankId ?? slot.bankId;
    const slotFundingType = overrides?.fundingType ?? slot.fundingType;
    const fundingType = selectedFundingType === "all" ? slotFundingType : selectedFundingType;
    const currentCardId = overrides?.cardId ?? slot.cardId;
    const selectedElsewhere = new Set<number>([
      ...strategyCards.map((card) => card.id),
      ...hybridManualSlots.flatMap((currentSlot, index) => (index !== slotIndex && currentSlot.cardId ? [currentSlot.cardId] : [])),
    ]);

    return goalCards
      .filter((card) => {
        if (bankId && card.bank_id !== bankId) return false;
        if (selectedElsewhere.has(card.id) && card.id !== currentCardId) return false;

        const raw = String(card.funding_type || "");
        const canonical = canonicalProductType(raw);
        if (!allowedFundingTypeSet.has(raw) && !allowedFundingTypeSet.has(canonical)) return false;
        if (!matchesFundingType(card, fundingType)) return false;

        if (allowedBureauSet.size === 0) {
          return true;
        }

        const hasAllowedBureau = BUREAU_ORDER.some((bureau) => allowedBureauSet.has(bureau) && cardHasBureau(card, bureau));
        return hasAllowedBureau || card.id === currentCardId;
      })
      .sort((left, right) => left.card_name.localeCompare(right.card_name));
  }, [allowedBureauSet, allowedFundingTypeSet, canonicalProductType, cardHasBureau, goalCards, hybridManualSlots, matchesFundingType, selectedFundingType, strategyCards]);

  const getHybridBankOptions = useCallback((slotIndex: number) => {
    return sortedBanks.filter((bank) => getEligibleHybridCards(slotIndex, { bankId: bank.id }).length > 0);
  }, [getEligibleHybridCards, sortedBanks]);

  const getHybridFundingTypes = useCallback((slotIndex: number) => {
    const slot = hybridManualSlots[slotIndex];
    if (!slot?.bankId) return [] as string[];

    return Array.from(new Set(
      getEligibleHybridCards(slotIndex, { bankId: slot.bankId, fundingType: undefined })
        .map((card) => canonicalProductType(card.funding_type))
        .filter(Boolean),
    )).sort((left, right) => left.localeCompare(right));
  }, [canonicalProductType, getEligibleHybridCards, hybridManualSlots]);

  useEffect(() => {
    setHybridManualSlots((previous) => {
      let changed = false;

      const next = previous.map((slot, slotIndex) => {
        let nextSlot = slot;

        if (nextSlot.bankId) {
          const bankStillEligible = getHybridBankOptions(slotIndex).some((bank) => bank.id === nextSlot.bankId);
          if (!bankStillEligible) {
            changed = true;
            return {};
          }
        }

        if (nextSlot.fundingType && nextSlot.bankId) {
          const fundingTypeStillEligible = getHybridFundingTypes(slotIndex).includes(nextSlot.fundingType);
          if (!fundingTypeStillEligible) {
            changed = true;
            nextSlot = { ...nextSlot, fundingType: undefined, cardId: undefined };
          }
        }

        if (nextSlot.cardId) {
          const cardStillEligible = getEligibleHybridCards(slotIndex, nextSlot).some((card) => card.id === nextSlot.cardId);
          if (!cardStillEligible) {
            changed = true;
            nextSlot = { ...nextSlot, cardId: undefined };
          }
        }

        return nextSlot;
      });

      return changed ? next : previous;
    });
  }, [getEligibleHybridCards, getHybridBankOptions, getHybridFundingTypes]);

  const updateHybridManualSlot = useCallback((slotIndex: number, patch: Partial<DiySlot>) => {
    setHybridManualSlots((previous) => previous.map((slot, index) => (index === slotIndex ? { ...slot, ...patch } : slot)));
  }, []);

  const addHybridManualSlot = useCallback(() => {
    setHybridManualSlots((previous) => [...previous, {}]);
  }, []);

  const removeHybridManualSlot = useCallback((slotIndex: number) => {
    setHybridManualSlots((previous) => previous.filter((_, index) => index !== slotIndex));
    setHybridBankSearchMap({});
  }, []);

  const eligibleAiCards = useMemo(() => {
    const bankOrder = new Map<number, number>();
    sortedBanks.forEach((bank, index) => bankOrder.set(bank.id, index));

    return [...filteredGoalCards]
      .filter((card) => bankOrder.size === 0 || bankOrder.has(card.bank_id))
      .sort((left, right) => {
        const leftBankOrder = bankOrder.get(left.bank_id) ?? 1_000_000;
        const rightBankOrder = bankOrder.get(right.bank_id) ?? 1_000_000;
        if (leftBankOrder !== rightBankOrder) return leftBankOrder - rightBankOrder;
        return left.card_name.localeCompare(right.card_name);
      });
  }, [filteredGoalCards, sortedBanks]);

  const aiStrategyRequestKey = useMemo(() => JSON.stringify({
    clientId,
    goalValue,
    compareUpTo,
    selectedFundingType,
    selectedState: selectedState || "",
    hasReport: Boolean(latestReportData),
    reportLookupComplete,
    offerIds: eligibleAiCards.map((card) => card.id),
  }), [clientId, goalValue, compareUpTo, selectedFundingType, selectedState, latestReportData, reportLookupComplete, eligibleAiCards]);

  const loadAiStrategy = useCallback(async (force = false) => {
    if (!clientId || clientId <= 0) {
      setAiStrategy(null);
      setAiStrategyRaw("");
      setAiStrategyError("Select a client first to run AI-Matched.");
      return;
    }

    if (!reportLookupComplete) {
      // Will auto-fire from the AI-Matched effect once the report lookup finishes.
      console.log("[AI-Matched] Waiting for credit report lookup to complete before requesting AI strategy.");
      return;
    }

    if (!force && lastAiRequestKey === aiStrategyRequestKey && (aiStrategy?.picks?.length || aiStrategy?.summary_markdown || aiStrategyRaw || aiStrategyError)) {
      return;
    }

    // Hard guard: never allow two concurrent AI requests. The second one is the
    // root cause of the "blink success then fail" UX on live (504 from a
    // duplicated call wipes a working result).
    if (aiInFlightRef.current && !force) {
      console.log("[AI-Matched] Skipping duplicate request — one already in flight.");
      return;
    }
    aiInFlightRef.current = true;

    console.log("[AI-Matched] Requesting strategy", {
      clientId,
      hasReport: Boolean(latestReportData),
      eligibleAiCardsCount: eligibleAiCards.length,
      goal: goalValue,
      compareUpTo,
      selectedState: selectedState || null,
      force,
    });

    try {
      setAiStrategyLoading(true);
      setAiStrategyError(null);

      const response = await fetch("/api/ai/funding-diy-strategy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({
          clientId,
          report: latestReportData || undefined,
          goal: goalValue,
          compareUpTo,
          selectedState: selectedState || undefined,
          fundableBureaus,
          bureauPullCounts,
          availableCards: eligibleAiCards.map((card) => {
            const bank = allBanks.find((b) => b.id === card.bank_id);
            const cardBureaus = parseStringArray(card.credit_bureaus);
            const bankBureaus = bank?.credit_bureaus || [];
            // Fallback chain: card-level → bank-level → assume all three so the AI doesn't
            // see "empty bureaus" and bail out.
            const bureaus = cardBureaus.length > 0
              ? cardBureaus
              : bankBureaus.length > 0
                ? bankBureaus
                : ["Experian", "Equifax", "TransUnion"];
            return {
              id: card.id,
              bank_id: card.bank_id,
              bank_name: bank?.name || card.bank_name || undefined,
              card_name: card.card_name,
              card_type: (() => {
                const v = String(card.funding_type || '').toLowerCase();
                if (v.includes('business')) return 'business';
                if (v.includes('personal')) return 'personal';
                return undefined;
              })(),
              funding_type: card.funding_type,
              credit_bureaus: bureaus,
            };
          }),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (payload?.quota) {
        setAiQuota(payload.quota);
      }
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to generate AI strategy");
      }

      setAiStrategy((payload?.strategy || null) as FundingStrategyResult | null);
      setAiStrategyRaw(typeof payload?.raw === "string" ? payload.raw : "");
      setAiStrategyError(null);
      setLastAiRequestKey(aiStrategyRequestKey);
    } catch (requestError: any) {
      const message = requestError?.message || "Failed to generate AI strategy";
      // Use refs to read the LATEST state, not stale closure values from when
      // this request was initiated (concurrent requests would otherwise wipe
      // a result that landed in between).
      const latestStrategy = aiStrategyRef.current;
      const latestRaw = aiStrategyRawRef.current;
      const hasPriorSuccess = Boolean(latestStrategy?.picks?.length || latestStrategy?.summary_markdown || latestRaw);
      if (hasPriorSuccess && !force) {
        console.warn("[AI-Matched] Background refresh failed, keeping previous strategy:", message);
      } else {
        setAiStrategy(null);
        setAiStrategyRaw("");
        setAiStrategyError(message);
      }
      setLastAiRequestKey(aiStrategyRequestKey);
    } finally {
      aiInFlightRef.current = false;
      setAiStrategyLoading(false);
    }
  }, [aiStrategy, aiStrategyError, aiStrategyRequestKey, allBanks, bureauPullCounts, clientId, compareUpTo, eligibleAiCards, fundableBureaus, goalValue, lastAiRequestKey, latestReportData, reportLookupComplete, selectedState]);

  useEffect(() => {
    if (activeMode !== "ai_matched") return;
    if (!clientId || clientId <= 0) return;
    if (!reportLookupComplete) return;
    if (lastAiRequestKey === aiStrategyRequestKey && (aiStrategy?.picks?.length || aiStrategyRaw || aiStrategyError)) return;
    // If we already have a successful result for ANY key (e.g. eligibleAiCards
    // re-memoized into a new key after a late state update), do NOT auto-fire
    // a fresh request — it would risk overwriting the success on a flaky
    // upstream. The user can press "Refresh Match" to force a re-run.
    if (aiStrategy?.picks?.length || aiStrategy?.summary_markdown || aiStrategyRaw) {
      setLastAiRequestKey(aiStrategyRequestKey);
      return;
    }
    void loadAiStrategy();
    // Intentionally exclude loadAiStrategy from deps to avoid auto-refresh loops
    // when its captured state (aiStrategy, lastAiRequestKey, etc.) changes after a successful run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMode, aiStrategyRequestKey, clientId, reportLookupComplete]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch("/api/ai/funding-diy-strategy/quota", {
          headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        });
        const payload = await resp.json().catch(() => ({}));
        if (!cancelled && payload?.quota) {
          setAiQuota(payload.quota);
        }
      } catch {
        /* ignore quota fetch errors */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const submissionSourceCards = useMemo(() => (cards.length > 0 ? cards : allCards), [allCards, cards]);

  const approvedLockedEntries = useMemo(() => {
    return submittedRows
      .filter((row) => String(row.status) === "approved")
      .map((row) => {
        const card = submissionSourceCards.find((item) => item.id === row.card_id);
        if (!card) return null;

        return {
          card,
          submission: row,
          bank: allBanks.find((bank) => bank.id === card.bank_id) ?? null,
        };
      })
      .filter(Boolean) as Array<{
      card: FundingCard;
      submission: SubmissionRow;
      bank: BankOption | null;
    }>;
  }, [allBanks, submissionSourceCards, submittedRows]);

  const submittedByCardId = useMemo(() => {
    const next = new Map<number, SubmissionRow>();
    submittedRows.forEach((row) => next.set(row.card_id, row));
    return next;
  }, [submittedRows]);

  const currentClientApprovedAmount = useMemo(() => {
    return submittedRows.reduce((total, row) => {
      if (String(row.status) !== "approved") return total;
      return total + Number(row.amount_approved || 0);
    }, 0);
  }, [submittedRows]);

  const currentClientHighestApprovedAmount = useMemo(() => {
    return submittedRows.reduce((highest, row) => {
      if (String(row.status) !== "approved") return highest;
      return Math.max(highest, Number(row.amount_approved || 0));
    }, 0);
  }, [submittedRows]);

  const currentClientChargeAmount = useMemo(() => {
    const percent = Number(globalAdminPercent || 0);
    if (!Number.isFinite(percent) || percent <= 0) return 0;
    return Number((currentClientApprovedAmount * (percent / 100)).toFixed(2));
  }, [currentClientApprovedAmount, globalAdminPercent]);

  const selectedAdminPercentPreset = useMemo(() => {
    return ADMIN_PERCENT_PRESET_OPTIONS.some((value) => value === globalAdminPercent)
      ? String(globalAdminPercent)
      : "custom";
  }, [globalAdminPercent]);

  const sequenceSubmittedCount = useMemo(() => {
    const strategyIds = new Set(strategyCards.map((card) => card.id));
    return submittedRows.filter((row) => strategyIds.has(row.card_id)).length;
  }, [strategyCards, submittedRows]);

  const strategyBankOrder = useMemo(() => {
    const next = new Map<number, number>();
    sortedBanks.forEach((bank, index) => next.set(bank.id, index));
    return next;
  }, [sortedBanks]);

  const mostApprovedCard = useMemo(() => {
    const candidates = filteredGoalCards;

    const topCard = [...candidates].sort((left, right) => {
      const usageDiff = Number(right.no_of_usage || 0) - Number(left.no_of_usage || 0);
      if (usageDiff !== 0) return usageDiff;

      const rightDisplayAmount = getCardDisplayAmount(right) || 0;
      const leftDisplayAmount = getCardDisplayAmount(left) || 0;
      if (rightDisplayAmount !== leftDisplayAmount) return rightDisplayAmount - leftDisplayAmount;

      return left.card_name.localeCompare(right.card_name);
    })[0] || null;

    if (!topCard || Number(topCard.no_of_usage || 0) <= 0) {
      return null;
    }

    return topCard;
  }, [filteredGoalCards]);

  const clientName = useMemo(() => {
    const firstName = String(clientDetails?.first_name || "").trim();
    const lastName = String(clientDetails?.last_name || "").trim();
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    if (fullName) return fullName;
    return clientId > 0 ? `Client #${clientId}` : "No client selected";
  }, [clientDetails, clientId]);

  const activeModeMeta = useMemo(() => {
    if (activeMode === "ai_matched") {
      return {
        label: "AI-Matched",
        badgeClassName: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none rounded-full px-3 py-0.5 font-normal flex items-center gap-1",
        dotClassName: "bg-emerald-50 dark:bg-emerald-900/500",
      };
    }

    if (activeMode === "diy") {
      return {
        label: "DIY Builder",
        badgeClassName: "bg-amber-100 text-amber-800 hover:bg-amber-100 border-none rounded-full px-3 py-0.5 font-normal flex items-center gap-1",
        dotClassName: "bg-amber-50 dark:bg-amber-900/500",
      };
    }

    return {
      label: "Hybrid",
      badgeClassName: "bg-blue-100 text-blue-800 hover:bg-blue-100 border-none rounded-full px-3 py-0.5 font-normal flex items-center gap-1",
      dotClassName: "bg-blue-50 dark:bg-blue-900/500",
    };
  }, [activeMode]);

  const fundingProgressValue = useMemo(() => {
    return Math.min(100, Math.round((totalApprovedAmount / 50000) * 100));
  }, [totalApprovedAmount]);

  const currentClientProgressValue = useMemo(() => {
    return Math.min(100, Math.round((currentClientApprovedAmount / 50000) * 100));
  }, [currentClientApprovedAmount]);

  const sequenceProgressValue = useMemo(() => {
    if (strategyCards.length === 0) return 0;
    return Math.min(100, Math.round((sequenceSubmittedCount / strategyCards.length) * 100));
  }, [sequenceSubmittedCount, strategyCards.length]);

  const currentTier = useMemo(() => {
    if (totalApprovedAmount >= 100000) return "PLATINUM OPERATOR";
    if (totalApprovedAmount >= 50000) return "GOLD OPERATOR";
    if (totalApprovedAmount >= 25000) return "SILVER OPERATOR";
    return "BRONZE OPERATOR";
  }, [totalApprovedAmount]);

  const nextMilestoneRemaining = Math.max(0, 50000 - totalApprovedAmount);

  const resetApprovalDialog = useCallback(() => {
    setApprovalDialogCard(null);
    setApprovalStatus("not_approved");
    setApprovalAmount("");
    setApprovalAdminPercent(String(globalAdminPercent));
    setApprovalComment("");
  }, [globalAdminPercent]);

  const handleApprovalDialogOpenChange = useCallback((open: boolean) => {
    if (open || approvalSubmitting) return;
    resetApprovalDialog();
  }, [approvalSubmitting, resetApprovalDialog]);

  const openApprovalDialog = useCallback((card: FundingCard) => {
    const existing = submittedByCardId.get(card.id);
    setApprovalDialogCard(card);
    setApprovalStatus(String(existing?.status) === "approved" ? "approved" : "not_approved");
    setApprovalAmount(existing && Number(existing.amount_approved || 0) > 0 ? String(Number(existing.amount_approved || 0)) : "");
    setApprovalAdminPercent(String(Number(existing?.admin_percent ?? globalAdminPercent)));
    setApprovalComment(existing?.description || "");
  }, [globalAdminPercent, submittedByCardId]);

  const getApprovalActionMeta = useCallback((cardId: number) => {
    const submission = submittedByCardId.get(cardId);

    if (submission?.status === "approved") {
      return {
        label: "Approved",
        className: "border-emerald-200 bg-emerald-50 dark:bg-emerald-900/50 text-emerald-700 hover:bg-emerald-50 dark:bg-emerald-900/50",
        disabled: true,
      };
    }

    if (submission) {
      return {
        label: "Not Approved",
        className: "border-amber-200 bg-amber-50 dark:bg-amber-900/50 text-amber-700 hover:bg-amber-100",
        disabled: false,
      };
    }

    return {
      label: "Approved / Not Approved",
      className: "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800/50",
      disabled: false,
    };
  }, [submittedByCardId]);

  const generateInvoiceForCard = useCallback(async (card: FundingCard, amountApproved: number, adminPercent: number, description: string) => {
    if (!clientId || clientId <= 0) {
      throw new Error("Client ID is required to generate an invoice.");
    }

    const amount = Number(amountApproved || 0);
    const percent = Number(adminPercent || 0);
    const feeAmount = Number((amount * (percent / 100)).toFixed(2));

    if (!(amount > 0) || !(feeAmount > 0)) {
      return null;
    }

    const response = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: Number(userProfile?.id || 0) || 1,
        client_id: clientId,
        currency: "USD",
        line_items: [{
          description: description || `Funding admin fee for ${card.card_name}`,
          quantity: 1,
          unit_price: feeAmount,
        }],
        tax_rate: 0,
        notes: `Funding admin fee for ${card.card_name}`,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create invoice");
    }

    const payload = await response.json();
    const publicToken = payload?.data?.public_token;
    const publicUrl = payload?.data?.public_url;
    if (publicToken) {
      setInvoiceMap((previous) => ({
        ...previous,
        [card.id]: { token: publicToken, url: publicUrl },
      }));
    }
    if (publicToken) {
      fetch(`/api/invoices/public/${publicToken}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch(() => {
        // no-op
      });
    }

    return payload?.data || null;
  }, [clientId, userProfile?.id]);

  const handleViewInvoice = useCallback(async (card: FundingCard, submission?: SubmissionRow | null) => {
    const existingInvoice = invoiceMap[card.id];
    if (existingInvoice?.token) {
      navigate(`/invoice/${existingInvoice.token}`);
      return;
    }

    const sourceSubmission = submission || submittedByCardId.get(card.id);
    if (!sourceSubmission || String(sourceSubmission.status) !== "approved") {
      toast({
        title: "Invoice unavailable",
        description: "This card must be approved before an invoice can be viewed.",
        variant: "destructive",
      });
      return;
    }

    if (!(Number(sourceSubmission.admin_percent || 0) > 0)) {
      toast({
        title: "Invoice unavailable",
        description: "This approval has a 0% charge, so there is no invoice to open.",
        variant: "destructive",
      });
      return;
    }

    try {
      const invoice = await generateInvoiceForCard(
        card,
        Number(sourceSubmission.amount_approved || 0),
        Number(sourceSubmission.admin_percent || DEFAULT_ADMIN_PERCENT),
        sourceSubmission.description || `Card: ${card.card_name} | Approved: ${formatCurrency(Number(sourceSubmission.amount_approved || 0))} | Admin Fee: ${Number(sourceSubmission.admin_percent || DEFAULT_ADMIN_PERCENT)}%`,
      );

      const publicToken = invoice?.public_token;
      if (!publicToken) {
        throw new Error("Invoice token was not returned.");
      }

      navigate(`/invoice/${publicToken}`);
    } catch (invoiceError: any) {
      console.error("Error opening invoice:", invoiceError);
      toast({
        title: "Invoice error",
        description: invoiceError?.message || "Could not open the invoice for this card.",
        variant: "destructive",
      });
    }
  }, [generateInvoiceForCard, invoiceMap, navigate, submittedByCardId, toast]);

  const submitApprovalDecision = useCallback(async () => {
    if (!approvalDialogCard) return;

    if (!clientId || clientId <= 0) {
      toast({
        title: "Client required",
        description: "Select a client before submitting approval status.",
        variant: "destructive",
      });
      return;
    }

    const normalizedAmount = approvalStatus === "approved" ? Number(approvalAmount || 0) : 0;
    if (approvalStatus === "approved" && !(normalizedAmount > 0)) {
      toast({
        title: "Amount required",
        description: "Enter an approved amount before submitting an approved decision.",
        variant: "destructive",
      });
      return;
    }

    const normalizedAdminPercent = Number(approvalAdminPercent || 0);
    if (!Number.isFinite(normalizedAdminPercent) || normalizedAdminPercent < 0 || normalizedAdminPercent > 100) {
      toast({
        title: "Invalid percentage",
        description: "Enter a charge percentage between 0 and 100.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      client_id: clientId,
      card_id: approvalDialogCard.id,
      card_type: approvalDialogCard.card_type,
      status: approvalStatus,
      amount_approved: normalizedAmount,
      admin_percent: normalizedAdminPercent,
      description: approvalComment.trim(),
      credit_bureaus: parseStringArray(approvalDialogCard.credit_bureaus),
    };

    try {
      setApprovalSubmitting(true);

      const response = await fetch("/api/funding/diy-submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        if (response.status === 409) {
          const existingSubmission = errorPayload?.existing;
          if (existingSubmission?.card_id) {
            setSubmittedRows((previous) => {
              const nextRow: SubmissionRow = {
                card_id: Number(existingSubmission.card_id),
                status: String(existingSubmission.status || "approved"),
                amount_approved: Number(existingSubmission.amount_approved || 0),
                admin_percent: Number(existingSubmission.admin_percent || normalizedAdminPercent),
                description: existingSubmission.description || "",
              };
              const filtered = previous.filter((row) => row.card_id !== nextRow.card_id);
              return [nextRow, ...filtered];
            });
          }

          await Promise.all([loadApprovalStats(), loadCards()]);

          toast({
            title: "Already approved",
            description: errorPayload?.error || "This card has already been approved and locked for this client.",
            variant: "destructive",
          });
          resetApprovalDialog();
          return;
        }

        throw new Error(errorPayload?.error || "Failed to save funding decision");
      }

      setSubmittedRows((previous) => {
        const nextRow: SubmissionRow = {
          card_id: approvalDialogCard.id,
          status: approvalStatus,
          amount_approved: normalizedAmount,
          admin_percent: normalizedAdminPercent,
          description: approvalComment.trim(),
        };
        const filtered = previous.filter((row) => row.card_id !== approvalDialogCard.id);
        return [nextRow, ...filtered];
      });

      await Promise.all([loadApprovalStats(), loadCards()]);

      if (approvalStatus === "approved") {
        if (normalizedAdminPercent > 0) {
          try {
            await generateInvoiceForCard(
              approvalDialogCard,
              normalizedAmount,
              normalizedAdminPercent,
              approvalComment.trim() || `Card: ${approvalDialogCard.card_name} | Approved: ${formatCurrency(normalizedAmount)} | Admin Fee: ${normalizedAdminPercent}%`,
            );

            toast({
              title: "Approved",
              description: "Approval saved and invoice sent to the client.",
            });
          } catch (invoiceError: any) {
            console.error("Error generating invoice:", invoiceError);
            toast({
              title: "Approved",
              description: "Approval was saved, but the invoice could not be sent automatically.",
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Approved",
            description: "Approval was saved with a 0% charge, so no invoice was created.",
          });
        }
      } else {
        toast({
          title: "Updated",
          description: "Not approved decision saved for this card.",
        });
      }

      resetApprovalDialog();
    } catch (submitError: any) {
      console.error("Error saving approval decision:", submitError);
      toast({
        title: "Submission failed",
        description: submitError?.message || "Could not save this funding decision.",
        variant: "destructive",
      });
    } finally {
      setApprovalSubmitting(false);
    }
  }, [approvalAdminPercent, approvalAmount, approvalComment, approvalDialogCard, approvalStatus, clientId, generateInvoiceForCard, loadApprovalStats, loadCards, resetApprovalDialog, toast]);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <div>
            <h1 className="text-3xl font-semibold text-slate-800 dark:text-slate-100">Match Funding to Your Profile</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-600 dark:text-slate-400 flex-wrap">
              <span>Client: <span className="font-medium text-slate-900 dark:text-white">{clientName}</span></span>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-700 dark:text-slate-300">Client State</span>
                <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500">Detected from profile or latest report:</span>
                <span className="font-medium text-slate-900 dark:text-white">{selectedState || "Not detected"}</span>
                <Select value={String(selectedState || "")} onValueChange={(value) => setSelectedState(value || null)}>
                  <SelectTrigger className="h-8 w-[92px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATE_CODES.map((code) => (
                      <SelectItem key={code} value={code}>{code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1">{formatGoalLabel(goalValue)} <CheckCircle className="w-4 h-4 text-emerald-500" /></span>
              {goalValue === "both" && (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none rounded-sm px-2">Both</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-slate-200 dark:border-slate-700 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-medium text-slate-800 dark:text-slate-100">Select Your Strategy Mode</CardTitle>
                <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 text-sm">How would you like to approach your funding journey?</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className={`flex items-center justify-between p-4 rounded-lg relative transition-colors ${activeMode === "ai_matched" ? "border-2 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/50/60" : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"}`}>
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      <Bot className={`w-6 h-6 ${activeMode === "ai_matched" ? "text-emerald-600" : "text-slate-500 dark:text-slate-400 dark:text-slate-500"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-900 dark:text-white">AI-Matched</h3>
                        {activeMode === "ai_matched" ? (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none rounded-sm text-xs px-2 py-0 h-5">AI</Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Recommended Funding Sequence</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">AI ranks the eligible offers using the latest full client credit report JSON</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className={activeMode === "ai_matched" ? "text-emerald-700 border-emerald-200 rounded-md h-8 px-4" : "text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 rounded-md h-8 px-4"}
                    onClick={() => {
                      setActiveMode("ai_matched");
                      void loadAiStrategy(true);
                    }}
                  >
                    {activeMode === "ai_matched" ? "Active" : "Switch"}
                  </Button>
                </div>

                <div className={`flex items-center justify-between p-4 rounded-lg relative transition-colors ${activeMode === "hybrid" ? "border-2 border-blue-200 bg-slate-50 dark:bg-slate-800/50" : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"}`}>
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      <Settings2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-900 dark:text-white">Hybrid Mode</h3>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none rounded-sm text-xs px-2 py-0 h-5">Recommended</Badge>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Customize Funding Sequence</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">AI recommendations + your adjustments</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className={activeMode === "hybrid" ? "text-blue-700 border-blue-200 rounded-md h-8 px-4" : "text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 rounded-md h-8 px-4"}
                    onClick={() => setActiveMode("hybrid")}
                  >
                    {activeMode === "hybrid" ? "Active" : "Switch"}
                  </Button>
                </div>

                <div className={`flex items-center justify-between p-4 rounded-lg relative transition-colors ${activeMode === "diy" ? "border-2 border-amber-200 bg-amber-50 dark:bg-amber-900/50/60" : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"}`}>
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      <Wrench className={`w-6 h-6 ${activeMode === "diy" ? "text-amber-600" : "text-slate-500 dark:text-slate-400 dark:text-slate-500"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-900 dark:text-white">DIY Builder</h3>
                        {activeMode === "diy" ? (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none rounded-sm text-xs px-2 py-0 h-5">Manual</Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Manual Funding Sequence</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Hand-pick your offers and set your own order</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className={activeMode === "diy" ? "text-amber-700 border-amber-200 rounded-md h-8 px-4" : "text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 rounded-md h-8 px-4"}
                    onClick={() => setActiveMode("diy")}
                  >
                    {activeMode === "diy" ? "Active" : "Switch"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-700 shadow-sm rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800/50">
              <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl font-medium text-slate-800 dark:text-slate-100 flex items-center gap-3">
                    Your Funding Strategy
                    <Badge variant="secondary" className={activeModeMeta.badgeClassName}>
                      <span className={`w-2 h-2 rounded-full ${activeModeMeta.dotClassName}`}></span> {activeModeMeta.label}
                    </Badge>
                  </CardTitle>
                </div>
                <Select value={goalValue} onValueChange={handleGoalChange}>
                  <SelectTrigger className="w-[120px] h-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm">
                    <SelectValue placeholder="Business" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Funding Type</Label>
                  <Tabs value={selectedFundingType} onValueChange={setSelectedFundingType}>
                    <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-xl bg-transparent p-0">
                      {fundingTypes.map((fundingType) => (
                        <TabsTrigger
                          key={fundingType}
                          value={fundingType}
                          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 data-[state=active]:border-emerald-200 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 dark:data-[state=active]:border-emerald-700 dark:data-[state=active]:bg-emerald-900/40 dark:data-[state=active]:text-emerald-200"
                        >
                          {fundingType}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>

                {activeMode === "hybrid" ? (
                  <>
                    <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                      Approval Sequence <span className="text-slate-400 dark:text-slate-500">- Showing {strategyCards.length} recommended offers from {compareUpTo} bureau-pull slots</span>
                    </p>

                    {loading && (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-5 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 shadow-sm">
                        Loading recommended offers from the database...
                      </div>
                    )}

                    {!loading && error && (
                      <div className="bg-white dark:bg-slate-900 border border-red-200 rounded-lg p-5 text-sm text-red-600 shadow-sm">
                        {error}
                      </div>
                    )}

                    {!loading && !error && strategyCards.length === 0 && (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-5 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 shadow-sm">
                        No eligible recommended offers were found for this client&apos;s bureau pull limits and state profile.
                      </div>
                    )}

                    {!loading && !error && strategyEntries.map((entry, index) => {
                      const { card, bureau, bureauOrder } = entry;
                      const bank = allBanks.find((item) => item.id === card.bank_id);
                      const submission = submittedByCardId.get(card.id);
                      const displayAmount = getCardDisplayAmount(card);
                      const bureauSummary = parseStringArray(card.credit_bureaus).join(" / ");
                      const bankLogo = bank?.logo || card.bank_logo;
                      const bureauLogo = bureau ? BUREAU_LOGO_PATHS[bureau] : null;
                      const statusLabel = submission?.status === "approved"
                        ? "Applied"
                        : submission
                          ? "Submitted"
                          : "Not Applied";
                      const statusClassName = submission?.status === "approved"
                        ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/50"
                        : submission
                          ? "text-amber-700 bg-amber-50 dark:bg-amber-900/50"
                          : "text-slate-500 dark:text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800";
                      const approvalAction = getApprovalActionMeta(card.id);

                      return (
                        <div key={`${card.id}-${bureau || "none"}-${bureauOrder || index}`} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-5 flex items-center justify-between shadow-sm gap-4">
                          <div className="flex gap-4 min-w-0">
                            <div className="text-slate-400 dark:text-slate-500 font-medium text-lg pt-1">{index + 1}.</div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-3 flex-wrap">
                                {bankLogo ? (
                                  <img
                                    src={bankLogo}
                                    alt={String(bank?.name || card.bank_name || `Bank #${card.bank_id}`)}
                                    className="h-10 w-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                    onError={(event) => {
                                      event.currentTarget.style.display = "none";
                                    }}
                                  />
                                ) : null}
                                <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100 tracking-tight truncate">{String(bank?.name || card.bank_name || `Bank #${card.bank_id}`).toUpperCase()}</h4>
                                <div className={`flex items-center text-sm font-medium px-2 py-0.5 rounded ${statusClassName}`}>
                                  {statusLabel}
                                  {submission?.status === "approved" ? <Check className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                                </div>
                              </div>
                              <div className="mt-3 mb-3">
                                <img
                                  src={card.card_image || DEFAULT_CARD_IMAGE}
                                  alt={card.card_name}
                                  className="h-24 w-40 rounded-lg object-cover border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shadow-sm"
                                  onError={(event) => {
                                    const target = event.currentTarget;
                                    if (target.dataset.fallbackApplied === "true") {
                                      return;
                                    }

                                    target.dataset.fallbackApplied = "true";
                                    target.src = FALLBACK_CARD_IMAGE;
                                  }}
                                />
                              </div>
                              <p className="text-slate-800 dark:text-slate-100 font-medium mt-1 truncate">{card.card_name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-0.5">
                                {card.funding_type}{bureauSummary ? ` - ${bureauSummary}` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            {bureauLogo ? (
                              <div className="mb-3 flex items-center justify-end gap-2">
                                <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 shadow-sm">
                                  <img src={bureauLogo} alt={bureau} className="h-7 w-7 object-contain" />
                                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatOrdinal(bureauOrder) || bureau}</span>
                                </div>
                              </div>
                            ) : null}
                            {displayAmount ? (
                              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{formatCurrency(displayAmount)}</div>
                            ) : (
                              <div className="text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-2">Offer Available</div>
                            )}
                            <div className="flex flex-col items-end gap-2">
                              <Button className="bg-slate-700 hover:bg-slate-800 text-white px-6 h-9 rounded-md" onClick={() => openExternal(card.card_link)}>
                                Apply Now
                              </Button>
                              <Button
                                variant="outline"
                                className={`px-4 h-9 rounded-md ${approvalAction.className}`}
                                onClick={() => openApprovalDialog(card)}
                                disabled={approvalAction.disabled}
                              >
                                {approvalAction.label}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div className="flex items-center justify-between pt-2 gap-3 flex-wrap">
                      <Button
                        variant="ghost"
                        className="text-blue-600 hover:bg-blue-50 dark:bg-blue-900/50 font-medium h-auto p-2"
                        onClick={addHybridManualSlot}
                      >
                        <Plus className="w-4 h-4 mr-2" /> Add Funding Offer
                      </Button>
                      <div className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <Plus className="w-3 h-3" /> {strategyCards.length} recommended offers loaded from bureau pull limits
                      </div>
                    </div>

                    {hybridManualSlots.length > 0 ? (
                      <div className="space-y-4">
                        {hybridManualSlots.map((slot, index) => {
                          const bankOptions = getHybridBankOptions(index);
                          const bankSearchQuery = String(hybridBankSearchMap[index] || "").trim().toLowerCase();
                          const filteredBankOptions = bankSearchQuery
                            ? bankOptions.filter((bank) => bank.name.toLowerCase().includes(bankSearchQuery))
                            : bankOptions;
                          const fundingTypeOptions = getHybridFundingTypes(index);
                          const cardOptions = getEligibleHybridCards(index);
                          const selectedCard = slot.cardId ? cardById.get(slot.cardId) ?? null : null;
                          const selectedBank = slot.bankId ? allBanks.find((bank) => bank.id === slot.bankId) ?? null : null;
                          const bureauSummary = selectedCard ? parseStringArray(selectedCard.credit_bureaus).join(" / ") : "";
                          const displayAmount = selectedCard ? getCardDisplayAmount(selectedCard) : null;
                          const approvalAction = selectedCard ? getApprovalActionMeta(selectedCard.id) : null;

                          return (
                            <div key={`hybrid-manual-slot-${index}`} className="bg-white dark:bg-slate-900 border border-blue-200 rounded-lg p-5 shadow-sm space-y-4">
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div>
                                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Manual Funding Offer {index + 1}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Select a bank first, then narrow to a funding type, then choose the card to add alongside the recommended sequence.</p>
                                </div>
                                <Button
                                  variant="outline"
                                  className="h-8 px-3 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                                  onClick={() => removeHybridManualSlot(index)}
                                >
                                  Remove
                                </Button>
                              </div>

                              <div className={`grid grid-cols-1 gap-4 ${selectedFundingType === "all" ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Bank</p>
                                  <Select
                                    value={slot.bankId ? String(slot.bankId) : undefined}
                                    onValueChange={(value) => {
                                      updateHybridManualSlot(index, { bankId: Number(value), fundingType: undefined, cardId: undefined });
                                      setHybridBankSearchMap((previous) => ({ ...previous, [index]: "" }));
                                    }}
                                  >
                                    <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                                      <SelectValue placeholder="Select bank" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                                        <Input
                                          placeholder="Search banks..."
                                          value={hybridBankSearchMap[index] || ""}
                                          onChange={(event) => setHybridBankSearchMap((previous) => ({ ...previous, [index]: event.target.value }))}
                                          onKeyDown={(event) => event.stopPropagation()}
                                        />
                                      </div>
                                      {filteredBankOptions.length > 0 ? filteredBankOptions.map((bank) => (
                                        <SelectItem key={bank.id} value={String(bank.id)}>{bank.name}</SelectItem>
                                      )) : (
                                        <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                                          {bankSearchQuery ? "No banks match your search." : "No eligible banks available for this manual offer."}
                                        </div>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {selectedFundingType === "all" ? (
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Funding Type</p>
                                    <Select
                                      value={slot.fundingType || undefined}
                                      onValueChange={(value) => updateHybridManualSlot(index, { fundingType: value, cardId: undefined })}
                                      disabled={!slot.bankId}
                                    >
                                      <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                                        <SelectValue placeholder="Select funding type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {fundingTypeOptions.length > 0 ? fundingTypeOptions.map((fundingType) => (
                                          <SelectItem key={fundingType} value={fundingType}>{fundingType}</SelectItem>
                                        )) : (
                                          <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">Select a bank first.</div>
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                ) : null}

                                <div className="space-y-2">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Card</p>
                                  <Select
                                    value={slot.cardId ? String(slot.cardId) : undefined}
                                    onValueChange={(value) => updateHybridManualSlot(index, { cardId: Number(value) })}
                                    disabled={!slot.bankId}
                                  >
                                    <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                                      <SelectValue placeholder="Select card" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {cardOptions.length > 0 ? cardOptions.map((card) => (
                                        <SelectItem key={card.id} value={String(card.id)}>{card.card_name}</SelectItem>
                                      )) : (
                                        <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">No cards are available for this bank and funding type.</div>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {selectedCard ? (
                                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-4 flex-wrap">
                                  <div className="flex items-center gap-4 min-w-0">
                                    {(selectedBank?.logo || selectedCard.bank_logo) ? (
                                      <img
                                        src={selectedBank?.logo || selectedCard.bank_logo}
                                        alt={selectedBank?.name || selectedCard.bank_name || `Bank #${selectedCard.bank_id}`}
                                        className="h-10 w-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                        onError={(event) => {
                                          event.currentTarget.style.display = "none";
                                        }}
                                      />
                                    ) : null}
                                    <img
                                      src={selectedCard.card_image || DEFAULT_CARD_IMAGE}
                                      alt={selectedCard.card_name}
                                      className="h-20 w-32 rounded-lg object-cover border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm"
                                      onError={(event) => {
                                        const target = event.currentTarget;
                                        if (target.dataset.fallbackApplied === "true") {
                                          return;
                                        }

                                        target.dataset.fallbackApplied = "true";
                                        target.src = FALLBACK_CARD_IMAGE;
                                      }}
                                    />
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{selectedBank?.name || selectedCard.bank_name || `Bank #${selectedCard.bank_id}`}</p>
                                      <p className="text-sm text-slate-600 dark:text-slate-400 truncate mt-1">{selectedCard.card_name}</p>
                                      <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">{selectedCard.funding_type}{bureauSummary ? ` - ${bureauSummary}` : ""}</p>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    {displayAmount ? (
                                      <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">{formatCurrency(displayAmount)}</div>
                                    ) : (
                                      <div className="text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-2">Offer Available</div>
                                    )}
                                    <div className="flex flex-col items-end gap-2">
                                      <Button className="bg-slate-700 hover:bg-slate-800 text-white px-5 h-9 rounded-md" onClick={() => openExternal(selectedCard.card_link)}>
                                        Apply Now
                                      </Button>
                                      <Button
                                        variant="outline"
                                        className={`px-4 h-9 rounded-md ${approvalAction?.className || "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800/50"}`}
                                        onClick={() => openApprovalDialog(selectedCard)}
                                        disabled={Boolean(approvalAction?.disabled)}
                                      >
                                        {approvalAction?.label || "Approved / Not Approved"}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}

                    <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-2">
                      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Approved & Locked Cards</p>
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none rounded-full px-3 py-1 text-xs font-medium">
                          {approvedLockedEntries.length} locked
                        </Badge>
                      </div>

                      {approvedLockedEntries.length > 0 ? (
                        <Carousel opts={{ align: "start" }} className="w-full px-10">
                          <CarouselContent>
                            {approvedLockedEntries.map(({ card, submission, bank }) => {
                              const approvedAmount = Number(submission.amount_approved || 0);
                              const savedAdminPercent = Number(submission.admin_percent || 0);
                              const invoiceChargeAmount = savedAdminPercent > 0
                                ? Number((approvedAmount * (savedAdminPercent / 100)).toFixed(2))
                                : 0;
                              const bureauSummary = parseStringArray(card.credit_bureaus).join(" / ");

                              return (
                                <CarouselItem key={`approved-${card.id}`} className="md:basis-1/2 xl:basis-1/3">
                                  <div className="h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm flex flex-col">
                                    <div className="flex items-center justify-between gap-3 mb-3">
                                      <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{bank?.name || card.bank_name || `Bank #${card.bank_id}`}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1 truncate">{card.card_name}</p>
                                      </div>
                                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none rounded px-2 py-0.5 text-[11px] font-medium">
                                        Approved
                                      </Badge>
                                    </div>

                                    <img
                                      src={card.card_image || DEFAULT_CARD_IMAGE}
                                      alt={card.card_name}
                                      className="h-24 w-full rounded-lg object-cover border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shadow-sm mb-3"
                                      onError={(event) => {
                                        const target = event.currentTarget;
                                        if (target.dataset.fallbackApplied === "true") {
                                          return;
                                        }

                                        target.dataset.fallbackApplied = "true";
                                        target.src = FALLBACK_CARD_IMAGE;
                                      }}
                                    />

                                    <div className="space-y-1 flex-1">
                                      <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{card.funding_type}{bureauSummary ? ` - ${bureauSummary}` : ""}</p>
                                      <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{approvedAmount > 0 ? formatCurrency(approvedAmount) : "Approved"}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mt-3">
                                      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Admin Percentage</p>
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">{savedAdminPercent > 0 ? `${savedAdminPercent}%` : "0%"}</p>
                                      </div>
                                      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Amount to Charge</p>
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">{invoiceChargeAmount > 0 ? formatCurrency(invoiceChargeAmount) : "No charge"}</p>
                                      </div>
                                    </div>

                                    <Button className="mt-4 bg-slate-700 hover:bg-slate-800 text-white h-9 rounded-md" onClick={() => handleViewInvoice(card, submission)}>
                                      View Invoice
                                    </Button>
                                  </div>
                                </CarouselItem>
                              );
                            })}
                          </CarouselContent>
                          {approvedLockedEntries.length > 1 ? (
                            <>
                              <CarouselPrevious className="left-0 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-800/50" />
                              <CarouselNext className="right-0 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-800/50" />
                            </>
                          ) : null}
                        </Carousel>
                      ) : (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-5 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 shadow-sm">
                          No approved and locked cards are available for this client yet.
                        </div>
                      )}
                    </div>
                  </>
                ) : activeMode === "ai_matched" ? (
                  <>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                        AI flow <span className="text-slate-400 dark:text-slate-500">- The server sends the exact latest client report JSON and eligible offers to the AI for ranking.</span>
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {aiQuota ? (
                          aiQuota.unlimited ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                              <Sparkles className="w-3.5 h-3.5" /> Unlimited AI runs
                            </span>
                          ) : (
                            <span
                              className={
                                "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium border " +
                                ((aiQuota.remaining ?? 0) <= 0
                                  ? "border-red-200 bg-red-50 text-red-700"
                                  : (aiQuota.remaining ?? 0) <= 1
                                    ? "border-amber-200 bg-amber-50 dark:bg-amber-900/50 text-amber-700"
                                    : "border-emerald-200 bg-emerald-50 dark:bg-emerald-900/50 text-emerald-700")
                              }
                              title={`Free AI-Matched runs left for this admin workspace`}
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              {`${aiQuota.remaining ?? 0} / ${aiQuota.limit ?? 0} free AI runs left`}
                            </span>
                          )
                        ) : null}
                        <Button
                          variant="outline"
                          className="text-emerald-700 bg-emerald-50 dark:bg-emerald-900/50 border-emerald-200 rounded-md h-8 px-4"
                          onClick={() => void loadAiStrategy(true)}
                          disabled={
                            aiStrategyLoading
                            || !clientId
                            || clientId <= 0
                            || (!!aiQuota && !aiQuota.unlimited && (aiQuota.remaining ?? 0) <= 0)
                          }
                        >
                          {aiStrategyLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                          Refresh Match
                        </Button>
                      </div>
                    </div>

                    {!reportLookupComplete && clientId > 0 && (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-5 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 shadow-sm">
                        Loading the latest credit report for AI-Matched...
                      </div>
                    )}

                    {reportLookupComplete && clientId > 0 && !latestReportData && (
                      <div className="bg-white dark:bg-slate-900 border border-amber-200 rounded-lg p-5 text-sm text-amber-700 shadow-sm">
                        No stored credit report was found for this client. Pull a report for a precise AI match.
                      </div>
                    )}

                    {aiStrategyLoading && (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-5 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 shadow-sm flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> AI is analyzing the credit report.
                      </div>
                    )}

                    {!aiStrategyLoading && aiStrategyError && (
                      <div className="bg-white dark:bg-slate-900 border border-red-200 rounded-lg p-5 text-sm text-red-600 shadow-sm">
                        {aiStrategyError}
                      </div>
                    )}

                    {!aiStrategyLoading && !aiStrategyError && reportLookupComplete && clientId > 0 && !aiStrategy?.picks?.length && !aiStrategy?.summary_markdown && !aiStrategyRaw && (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-5 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 shadow-sm flex items-center justify-between gap-3">
                        <span>Click <strong>Refresh Match</strong> above to generate the AI-Matched strategy for this client.</span>
                        <Button
                          variant="outline"
                          className="text-emerald-700 bg-emerald-50 dark:bg-emerald-900/50 border-emerald-200 hover:bg-emerald-100 rounded-md h-8 px-4"
                          onClick={() => void loadAiStrategy(true)}
                          disabled={aiStrategyLoading || (!!aiQuota && !aiQuota.unlimited && (aiQuota.remaining ?? 0) <= 0)}
                        >
                          <Sparkles className="w-4 h-4 mr-2" /> Run Now
                        </Button>
                      </div>
                    )}

                    {!aiStrategyLoading && !aiStrategyError && (aiStrategy?.picks?.length || aiStrategy?.summary_markdown || aiStrategyRaw) ? (
                      <div className="space-y-4">
                        {/* Summary panel — collapsible with full-screen popup */}
                        {(aiStrategy?.summary_markdown || aiStrategyRaw) && (() => {
                          const summaryText = aiStrategy?.summary_markdown || aiStrategyRaw;
                          return (
                            <div className="bg-white dark:bg-slate-900 border border-emerald-200 rounded-lg shadow-sm overflow-hidden">
                              <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-3 border-b border-emerald-100">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <p className="text-xs uppercase tracking-wide font-semibold text-emerald-700">AI Funding Strategy</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-3 border-emerald-200 text-emerald-700"
                                    onClick={() => setAiSummaryFullView(true)}
                                  >
                                    <Maximize2 className="w-3.5 h-3.5 mr-1.5" /> Full View
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-3 text-emerald-700"
                                    onClick={() => setAiSummaryExpanded((prev) => !prev)}
                                  >
                                    {aiSummaryExpanded ? (
                                      <><ChevronUp className="w-3.5 h-3.5 mr-1.5" /> Collapse</>
                                    ) : (
                                      <><ChevronDown className="w-3.5 h-3.5 mr-1.5" /> Expand</>
                                    )}
                                  </Button>
                                </div>
                              </div>
                              <div className="relative">
                                <div
                                  className={`px-6 py-5 prose prose-slate prose-sm max-w-none prose-headings:font-semibold prose-headings:text-slate-900 dark:text-white prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-h3:uppercase prose-h3:tracking-wide prose-h3:text-slate-500 dark:text-slate-400 dark:text-slate-500 prose-strong:text-slate-900 dark:text-white prose-li:my-0.5 prose-p:my-2 prose-hr:my-4 prose-hr:border-slate-200 dark:border-slate-700 overflow-y-auto transition-all ${aiSummaryExpanded ? "max-h-[600px]" : "max-h-[260px]"}`}
                                >
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{summaryText}</ReactMarkdown>
                                </div>
                                {!aiSummaryExpanded && (
                                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Picked cards rendered Hybrid-style */}
                        {Array.isArray(aiStrategy?.picks) && aiStrategy!.picks!.length === 0 && (
                          <div className="bg-white dark:bg-slate-900 border border-amber-200 rounded-lg p-5 text-sm text-amber-700 shadow-sm">
                            The AI did not return any cards in the recommended-cards block. The summary above is from the credit report only.
                          </div>
                        )}
                        {Array.isArray(aiStrategy?.picks) && aiStrategy!.picks!.length > 0 && (
                          <>
                            <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                              AI-Matched Sequence <span className="text-slate-400 dark:text-slate-500">- {aiStrategy!.picks!.length} card{aiStrategy!.picks!.length === 1 ? "" : "s"} returned by the AI</span>
                            </p>

                            {aiStrategy!.picks!.map((pick, index) => {
                              const cardName = pick.card_name || "AI-recommended card";
                              const bankName = pick.bank_name || "";
                              const matchedCatalogCard = findCatalogCardByName(cardName);
                              const cardImageSrc = matchedCatalogCard?.card_image || FALLBACK_CARD_IMAGE;
                              const bureauRaw = String(pick.bureau || "").toLowerCase();
                              const bureau: BureauName | null = bureauRaw.startsWith("exp")
                                ? "Experian"
                                : bureauRaw.startsWith("eq") || bureauRaw.startsWith("efx")
                                  ? "Equifax"
                                  : bureauRaw.startsWith("tr") || bureauRaw.startsWith("tu")
                                    ? "TransUnion"
                                    : null;
                              const bureauLogo = bureau ? BUREAU_LOGO_PATHS[bureau] : null;

                              return (
                                <div key={`ai-${index}-${cardName}`} className="bg-white dark:bg-slate-900 border border-emerald-200 rounded-lg p-4 sm:p-5 shadow-sm overflow-hidden">
                                  {/* Header: rank + names on left, bureau pill on right */}
                                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                                    <div className="flex gap-3 min-w-0 flex-1">
                                      <div className="text-emerald-600 font-semibold text-lg leading-tight shrink-0">
                                        {pick.rank || index + 1}.
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <h4 className="font-bold text-base sm:text-lg text-slate-800 dark:text-slate-100 tracking-tight break-words leading-tight">
                                            {bankName ? bankName.toUpperCase() : cardName.toUpperCase()}
                                          </h4>
                                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none rounded-sm text-xs px-2 py-0 h-5 shrink-0">
                                            AI Pick
                                          </Badge>
                                        </div>
                                        {bankName ? (
                                          <p className="text-slate-700 dark:text-slate-300 font-medium text-sm sm:text-base mt-1 break-words leading-snug">
                                            {cardName}
                                          </p>
                                        ) : null}
                                        {pick.card_type ? (
                                          <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1 break-words">{pick.card_type}</p>
                                        ) : null}
                                      </div>
                                    </div>
                                    {(bureauLogo || pick.bureau) && (
                                      <div className="shrink-0 self-start">
                                        {bureauLogo ? (
                                          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/50 px-3 py-1.5 shadow-sm">
                                            <img src={bureauLogo} alt={bureau || ""} className="h-5 w-5 object-contain shrink-0" />
                                            <span className="text-sm font-semibold text-emerald-700 whitespace-nowrap">{bureau}</span>
                                          </div>
                                        ) : (
                                          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/50 px-3 py-1 text-sm font-semibold text-emerald-700 shadow-sm">
                                            {pick.bureau}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Body: image + details */}
                                  <div className="mt-4 flex flex-col sm:flex-row gap-4">
                                    <img
                                      src={cardImageSrc}
                                      alt={cardName}
                                      className="h-24 w-40 rounded-lg object-cover border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shadow-sm shrink-0 self-start"
                                      onError={(event) => {
                                        const target = event.currentTarget;
                                        if (target.dataset.fallbackApplied === "true") return;
                                        target.dataset.fallbackApplied = "true";
                                        target.src = FALLBACK_CARD_IMAGE;
                                      }}
                                    />
                                    <div className="flex-1 min-w-0 space-y-3 text-sm">
                                      {pick.reason ? (
                                        <div className="bg-emerald-50 dark:bg-emerald-900/50/60 border border-emerald-100 rounded-md p-3 min-w-0">
                                          <p className="text-xs uppercase tracking-wide font-semibold text-emerald-700 mb-1">Why this card</p>
                                          <p className="text-slate-700 dark:text-slate-300 leading-snug whitespace-pre-wrap break-words">{pick.reason}</p>
                                        </div>
                                      ) : null}
                                      {(pick.apr || pick.annual_fee || pick.credit_limit_potential || pick.application_timing || pick.inquiry_efficiency || pick.card_type) && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                          {[
                                            { label: "APR", value: pick.apr },
                                            { label: "Annual fee", value: pick.annual_fee },
                                            { label: "Limit potential", value: pick.credit_limit_potential },
                                            { label: "Timing", value: pick.application_timing },
                                            { label: "Inquiry efficiency", value: pick.inquiry_efficiency },
                                            { label: "Card type", value: pick.card_type },
                                          ]
                                            .filter((field) => Boolean(field.value))
                                            .map((field) => (
                                              <div
                                                key={field.label}
                                                className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 flex flex-col min-w-0"
                                              >
                                                <span className="text-[10px] uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500">
                                                  {field.label}
                                                </span>
                                                <span className="text-slate-800 dark:text-slate-100 text-sm leading-snug break-words mt-0.5">
                                                  {field.value}
                                                </span>
                                              </div>
                                            ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        )}

                        {/* Watchouts */}
                        {Array.isArray(aiStrategy?.watchouts) && aiStrategy!.watchouts!.length > 0 && (
                          <div className="bg-amber-50 dark:bg-amber-900/50 border border-amber-200 rounded-lg p-5 shadow-sm">
                            <p className="text-xs uppercase tracking-wide font-semibold text-amber-700 mb-2">Client awareness</p>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-amber-900">
                              {aiStrategy!.watchouts!.map((w, i) => (
                                <li key={i}>{w}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                      DIY Builder <span className="text-slate-400 dark:text-slate-500">- Select one or more bureau cards below to filter the bank list, then choose bank, funding type, and card manually.</span>
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {BUREAU_ORDER.map((bureau) => {
                        const total = availableBureauCounts[bureau];
                        const remaining = diyRemainingCounts[bureau];
                        const isSelected = selectedDiyBureauSet.has(bureau);
                        const isFilterActive = selectedDiyBureauSet.size > 0;

                        return (
                          <button
                            key={bureau}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => toggleDiyBureau(bureau)}
                            className={
                              "bg-white dark:bg-slate-900 border rounded-lg p-4 shadow-sm flex items-center justify-between gap-3 text-left transition-colors "
                              + (isSelected
                                ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/50/70 ring-1 ring-emerald-200"
                                : isFilterActive
                                  ? "border-slate-200 dark:border-slate-700 hover:border-emerald-200 hover:bg-emerald-50 dark:bg-emerald-900/50/40"
                                  : "border-slate-200 dark:border-slate-700 hover:border-emerald-200 hover:bg-emerald-50 dark:bg-emerald-900/50/40")
                            }
                          >
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500">{bureau}</p>
                                {isSelected ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                    <Check className="w-3 h-3" /> Selected
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Remaining {remaining} of {total}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <img src={BUREAU_LOGO_PATHS[bureau]} alt={bureau} className="h-8 w-8 object-contain" />
                              <div className="text-right">
                                <div className="text-xl font-bold text-slate-800 dark:text-slate-100">{remaining}</div>
                                <div className="text-xs text-slate-400 dark:text-slate-500">{Math.max(0, total - remaining)} used</div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                        Choose one or more bureaus to filter the DIY bank dropdown. Leave all unselected to show banks from every available bureau.
                      </p>
                      {selectedDiyBureauSet.size > 0 ? (
                        <Button
                          variant="ghost"
                          className="h-8 px-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800"
                          onClick={clearDiyBureauFilter}
                        >
                          Clear bureau filter
                        </Button>
                      ) : null}
                    </div>

                    {loading && (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-5 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 shadow-sm">
                        Loading available funding options from the database...
                      </div>
                    )}

                    {!loading && error && (
                      <div className="bg-white dark:bg-slate-900 border border-red-200 rounded-lg p-5 text-sm text-red-600 shadow-sm">
                        {error}
                      </div>
                    )}

                    {!loading && !error && !diyHasRemainingCapacity && (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-5 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 shadow-sm">
                        No bureau pull capacity is available for this client right now.
                      </div>
                    )}

                    {!loading && !error && diyHasRemainingCapacity && (
                      <div className="space-y-4">
                        {diySlots.map((slot, index) => {
                          const bankOptions = getDiyBankOptions(index);
                          const bankSearchQuery = String(diyBankSearchMap[index] || "").trim().toLowerCase();
                          const filteredBankOptions = bankSearchQuery
                            ? bankOptions.filter((bank) => bank.name.toLowerCase().includes(bankSearchQuery))
                            : bankOptions;
                          const fundingTypeOptions = getDiyFundingTypes(index);
                          const cardOptions = getEligibleDiyCards(index);
                          const selectedCard = slot.cardId ? cardById.get(slot.cardId) ?? null : null;
                          const selectedBank = slot.bankId ? allBanks.find((bank) => bank.id === slot.bankId) ?? null : null;
                          const assignedBureau = diyEvaluatedSlots[index]?.assignedBureau ?? null;
                          const bureauSummary = selectedCard ? parseStringArray(selectedCard.credit_bureaus).join(" / ") : "";
                          const displayAmount = selectedCard ? getCardDisplayAmount(selectedCard) : null;
                          const approvalAction = selectedCard ? getApprovalActionMeta(selectedCard.id) : null;

                          return (
                            <div key={`diy-slot-${index}`} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-5 shadow-sm space-y-4">
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div>
                                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">DIY Slot {index + 1}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">
                                    Choose a bank, then narrow to a funding type, then select a card.
                                    {selectedDiyBureauSet.size > 0 ? ` Banks are filtered by ${selectedDiyBureaus.join(", ")}.` : ""}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {assignedBureau ? (
                                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 dark:bg-amber-900/50 px-3 py-1.5 shadow-sm">
                                      <img src={BUREAU_LOGO_PATHS[assignedBureau]} alt={assignedBureau} className="h-6 w-6 object-contain" />
                                      <span className="text-sm font-semibold text-amber-800">{assignedBureau}</span>
                                    </div>
                                  ) : selectedCard ? (
                                    <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 shadow-sm text-red-700 text-sm font-medium">
                                      <ShieldAlert className="w-4 h-4" /> No bureau slot left
                                    </div>
                                  ) : null}
                                  {diySlots.length > 1 ? (
                                    <Button variant="outline" className="h-8 px-3 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400" onClick={() => removeDiySlot(index)}>
                                      Remove
                                    </Button>
                                  ) : null}
                                </div>
                              </div>

                              <div className={`grid grid-cols-1 gap-4 ${selectedFundingType === "all" ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Bank</p>
                                  <Select
                                    value={slot.bankId ? String(slot.bankId) : undefined}
                                    onValueChange={(value) => {
                                      updateDiySlot(index, { bankId: Number(value), fundingType: undefined, cardId: undefined });
                                      setDiyBankSearchMap((previous) => ({ ...previous, [index]: "" }));
                                    }}
                                  >
                                    <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                                      <SelectValue placeholder="Select bank" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                                        <Input
                                          placeholder="Search banks..."
                                          value={diyBankSearchMap[index] || ""}
                                          onChange={(event) => setDiyBankSearchMap((previous) => ({ ...previous, [index]: event.target.value }))}
                                          onKeyDown={(event) => event.stopPropagation()}
                                        />
                                      </div>
                                      {filteredBankOptions.length > 0 ? filteredBankOptions.map((bank) => (
                                        <SelectItem key={bank.id} value={String(bank.id)}>{bank.name}</SelectItem>
                                      )) : (
                                        <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                                          {bankSearchQuery
                                            ? "No banks match your search."
                                            : selectedDiyBureauSet.size > 0
                                              ? "No eligible banks match the selected bureau filters."
                                              : "No eligible banks available."}
                                        </div>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {selectedFundingType === "all" ? (
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Funding Type</p>
                                    <Select
                                      value={slot.fundingType || undefined}
                                      onValueChange={(value) => updateDiySlot(index, { fundingType: value, cardId: undefined })}
                                      disabled={!slot.bankId}
                                    >
                                      <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                                        <SelectValue placeholder="Select funding type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {fundingTypeOptions.length > 0 ? fundingTypeOptions.map((fundingType) => (
                                          <SelectItem key={fundingType} value={fundingType}>{fundingType}</SelectItem>
                                        )) : (
                                          <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">Select a bank first.</div>
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                ) : null}

                                <div className="space-y-2">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Card</p>
                                  <Select
                                    value={slot.cardId ? String(slot.cardId) : undefined}
                                    onValueChange={(value) => updateDiySlot(index, { cardId: Number(value) })}
                                    disabled={!slot.bankId}
                                  >
                                    <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                                      <SelectValue placeholder="Select card" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {cardOptions.length > 0 ? cardOptions.map((card) => (
                                        <SelectItem key={card.id} value={String(card.id)}>{card.card_name}</SelectItem>
                                      )) : (
                                          <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                                            {selectedDiyBureauSet.size > 0 ? "No cards match the selected bureaus and remaining bureau slots." : "No cards match the remaining bureau slots."}
                                          </div>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {selectedCard ? (
                                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-4 flex-wrap">
                                  <div className="flex items-center gap-4 min-w-0">
                                    {(selectedBank?.logo || selectedCard.bank_logo) ? (
                                      <img
                                        src={selectedBank?.logo || selectedCard.bank_logo}
                                        alt={selectedBank?.name || selectedCard.bank_name || `Bank #${selectedCard.bank_id}`}
                                        className="h-10 w-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                        onError={(event) => {
                                          event.currentTarget.style.display = "none";
                                        }}
                                      />
                                    ) : null}
                                    <img
                                      src={selectedCard.card_image || DEFAULT_CARD_IMAGE}
                                      alt={selectedCard.card_name}
                                      className="h-20 w-32 rounded-lg object-cover border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm"
                                      onError={(event) => {
                                        const target = event.currentTarget;
                                        if (target.dataset.fallbackApplied === "true") {
                                          return;
                                        }

                                        target.dataset.fallbackApplied = "true";
                                        target.src = FALLBACK_CARD_IMAGE;
                                      }}
                                    />
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{selectedBank?.name || selectedCard.bank_name || `Bank #${selectedCard.bank_id}`}</p>
                                      <p className="text-sm text-slate-600 dark:text-slate-400 truncate mt-1">{selectedCard.card_name}</p>
                                      <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">{selectedCard.funding_type}{bureauSummary ? ` - ${bureauSummary}` : ""}</p>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    {displayAmount ? (
                                      <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">{formatCurrency(displayAmount)}</div>
                                    ) : (
                                      <div className="text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-2">Offer Available</div>
                                    )}
                                    <div className="flex flex-col items-end gap-2">
                                      <Button className="bg-slate-700 hover:bg-slate-800 text-white px-5 h-9 rounded-md" onClick={() => openExternal(selectedCard.card_link)}>
                                        Apply Now
                                      </Button>
                                      <Button
                                        variant="outline"
                                        className={`px-4 h-9 rounded-md ${approvalAction?.className || "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800/50"}`}
                                        onClick={() => openApprovalDialog(selectedCard)}
                                        disabled={Boolean(approvalAction?.disabled)}
                                      >
                                        {approvalAction?.label || "Approved / Not Approved"}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}

                        <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
                          <Button
                            variant="outline"
                            className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800/50"
                            onClick={addDiySlot}
                            disabled={!diyHasRemainingCapacity}
                          >
                            <Plus className="w-4 h-4 mr-2" /> Add DIY Slot
                          </Button>
                          <div className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                            Remaining bureau slots: {BUREAU_ORDER.map((bureau) => `${bureau.slice(0, 2).toUpperCase()} ${diyRemainingCounts[bureau]}`).join(" • ")}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-slate-200 dark:border-slate-700 shadow-sm rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-medium text-slate-800 dark:text-slate-100">Funding Admin Toolbox</CardTitle>
                <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">Restore the global admin controls from the standard flow and use them as the default for new Elite approvals.</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Admin Percentage (%)</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Select a preset or type a custom percentage. New approvals start with this rate, while existing invoices keep their saved percentage.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-3">
                    <Select
                      value={selectedAdminPercentPreset}
                      onValueChange={(value) => {
                        if (value === "custom") return;
                        const nextValue = Number(value);
                        if (Number.isFinite(nextValue)) {
                          setGlobalAdminPercent(nextValue);
                        }
                      }}
                    >
                      <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                        <SelectValue placeholder="Select preset" />
                      </SelectTrigger>
                      <SelectContent>
                        {ADMIN_PERCENT_PRESET_OPTIONS.map((value) => (
                          <SelectItem key={value} value={String(value)}>{value}%</SelectItem>
                        ))}
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>

                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={Number.isFinite(globalAdminPercent) ? globalAdminPercent : 0}
                      onChange={(event) => {
                        const nextValue = Number(event.target.value || 0);
                        setGlobalAdminPercent(Number.isFinite(nextValue) ? nextValue : 0);
                      }}
                      placeholder="Enter admin percentage"
                      className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Total approvals</p>
                    <p className="text-2xl font-bold text-red-700 mt-2">{formatCurrency(currentClientApprovedAmount)}</p>
                    <p className="text-xs text-red-600/80 mt-1">Total approvals across all cards</p>
                  </div>

                  <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700">Highest amount</p>
                    <p className="text-2xl font-bold text-yellow-700 mt-2">{formatCurrency(currentClientHighestApprovedAmount)}</p>
                    <p className="text-xs text-yellow-700/80 mt-1">Highest amount of all cards</p>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/50 px-4 py-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Amount to charge client</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-2">{formatCurrency(currentClientChargeAmount)}</p>
                    <p className="text-xs text-emerald-700/80 mt-1">Calculated from the global admin %</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-700 shadow-sm rounded-xl">
              <CardContent className="p-6">
                <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-1">Funding Progress</h3>
                <div className="flex items-end gap-2 mb-4">
                  <div className="text-4xl font-bold text-slate-800 dark:text-slate-100">{formatCurrency(totalApprovedAmount)}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 leading-tight pb-1">Total<br />Approved</div>
                </div>

                <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-lg p-3 flex items-center gap-3 mb-6 shadow-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white dark:bg-slate-900 opacity-5 rounded-full -mr-10 -mt-10 blur-xl"></div>
                  <div className="w-12 h-12 bg-gradient-to-br from-slate-300 to-slate-500 rounded flex items-center justify-center shadow-inner border border-slate-400">
                    <ShieldAlert className="w-6 h-6 text-slate-800 dark:text-slate-100" />
                  </div>
                  <div>
                    <div className="text-slate-400 dark:text-slate-500 text-[10px] font-bold tracking-wider uppercase">Current Tier</div>
                    <div className="text-white font-bold tracking-wide">{currentTier}</div>
                  </div>
                </div>

                <div className="relative">
                  <div className="pointer-events-none select-none blur-[2px] opacity-60">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">Next milestone: $50,000</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">{fundingProgressValue}%</span>
                    </div>
                    <Progress value={fundingProgressValue} className="h-2.5 mb-2 bg-slate-100 dark:bg-slate-800 [&>div]:bg-amber-50 dark:bg-amber-900/500" />
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                      <span>{formatCurrency(nextMilestoneRemaining)} to next tier</span>
                      <span className="flex items-center gap-1"><Gift className="w-3 h-3" /> Reward | {fundingProgressValue}%</span>
                    </div>
                  </div>
                  <ComingSoonOverlay detail="Milestone rewards unlock in a future update." />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-700 shadow-sm rounded-xl relative overflow-hidden">
              <div className="pointer-events-none select-none blur-[2px] opacity-60">
                <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3">
                  <CardTitle className="text-lg font-medium text-slate-800 dark:text-slate-100">Most Approved Card</CardTitle>
                  <Select value={goalValue} onValueChange={handleGoalChange}>
                    <SelectTrigger className="w-[110px] h-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs gap-1">
                      <Building2 className="w-3 h-3 text-slate-500 dark:text-slate-400 dark:text-slate-500" />
                      <SelectValue placeholder="Business" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mostApprovedCard ? (
                    <>
                      <div className="pt-2">
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{allBanks.find((bank) => bank.id === mostApprovedCard.bank_id)?.name || mostApprovedCard.bank_name || `Bank #${mostApprovedCard.bank_id}`}</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{mostApprovedCard.card_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-3">Approved {Number(mostApprovedCard.no_of_usage || 0)} times across all admins</p>
                        <div className="text-slate-500 dark:text-slate-400 dark:text-slate-500 text-sm">
                          up to <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{getCardDisplayAmount(mostApprovedCard) ? formatCurrency(getCardDisplayAmount(mostApprovedCard) || 0) : "Offer Available"}</span>
                        </div>
                      </div>

                      <div>
                        <Progress value={fundingProgressValue} className="h-2 mb-2 bg-slate-100 dark:bg-slate-800 [&>div]:bg-blue-600" />
                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                          <span>{formatCurrency(nextMilestoneRemaining)} to next tier</span>
                          <span className="flex items-center gap-1"><Gift className="w-3 h-3" /> Reward | {fundingProgressValue}%</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">No approved card data is available yet across the system.</div>
                  )}

                  <div className="pt-2">
                    <Button variant="outline" className="w-full text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:bg-slate-800 justify-start h-10 font-normal">
                      <Settings2 className="w-4 h-4 mr-2 text-slate-400 dark:text-slate-500" /> Previously Applied <Badge variant="secondary" className="ml-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 px-1.5 py-0 text-[10px]">{submittedRows.length}</Badge>
                    </Button>
                  </div>
                </CardContent>
              </div>
              <ComingSoonOverlay detail="Most approved card insights will appear in a future update." />
            </Card>

            <Card className="border-slate-200 dark:border-slate-700 shadow-sm rounded-xl relative overflow-hidden">
              <div className="pointer-events-none select-none blur-[2px] opacity-60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-medium text-slate-800 dark:text-slate-100">Earn FREE Month</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[10000, 25000, 50000].map((milestone) => {
                    const reached = currentClientApprovedAmount >= milestone;
                    const reward = milestone === 50000 ? "FREE MONTH" : milestone === 25000 ? "+ 75 platform credits" : "+ 25 platform credits";
                    return (
                      <div key={milestone} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                          {reached ? <CheckCircle className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />} {formatCurrency(milestone)}
                        </div>
                        {milestone === 50000 ? (
                          <Badge className={reached ? "bg-emerald-600 hover:bg-emerald-700 text-white font-medium border-none rounded px-3 py-1" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 font-medium border-none rounded px-3 py-1"}>
                            {reward}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 dark:text-slate-500 font-normal bg-slate-50 dark:bg-slate-800/50">{reward}</Badge>
                        )}
                      </div>
                    );
                  })}

                  <div className="pt-4">
                    <Button variant="outline" className="w-full text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:bg-slate-800 justify-start h-10 font-normal">
                      <Settings2 className="w-4 h-4 mr-2 text-slate-400 dark:text-slate-500" /> Previously Applied <Badge variant="secondary" className="ml-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 px-1.5 py-0 text-[10px]">{submittedRows.length}</Badge>
                    </Button>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/50/50 p-2 rounded-lg border border-emerald-100">
                      <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                        <CheckCircle className="w-4 h-4" /> {formatCurrency(currentClientApprovedAmount)}
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium">Current client approved amount</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                        <ChevronRight className="w-4 h-4" /> {formatCurrency(Math.max(0, 50000 - currentClientApprovedAmount))}
                      </div>
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Remaining to FREE MONTH</span>
                    </div>
                  </div>
                </CardContent>
              </div>
              <ComingSoonOverlay detail="Rewards and FREE MONTH perks will appear in a future update." />
            </Card>

            {activeMode === "hybrid" ? (
              <Card className="border-slate-200 dark:border-slate-700 shadow-sm rounded-xl relative overflow-hidden">
                <div className="pointer-events-none select-none blur-[2px] opacity-60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-medium text-slate-800 dark:text-slate-100">Sequence Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">Complete your sequence to unlock: $50 Platform Credit</p>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500">1</span>
                          </div>
                          Submitted offers in current sequence
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress value={sequenceProgressValue} className="w-32 h-2" />
                          <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium w-14 text-right">{sequenceSubmittedCount} / {strategyCards.length || 0}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-sm text-slate-900 dark:text-white font-medium">
                          <div className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-900/500 flex items-center justify-center text-white">
                            <Check className="w-3 h-3" />
                          </div>
                          $50,000 <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-normal hover:bg-slate-100 dark:bg-slate-800 border-none rounded px-2 py-0.5">Earn FREE Month</Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress value={currentClientProgressValue} className="w-32 h-2 bg-emerald-100 [&>div]:bg-emerald-50 dark:bg-emerald-900/500" />
                          <span className="text-xs text-emerald-600 font-medium w-20 text-right">{formatCurrency(currentClientApprovedAmount)}/50,000</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>
                <ComingSoonOverlay detail="Sequence rewards will appear in a future update." />
              </Card>
            ) : null}
          </div>
        </div>

        <Dialog open={Boolean(approvalDialogCard)} onOpenChange={handleApprovalDialogOpenChange}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Approved / Not Approved</DialogTitle>
              <DialogDescription>
                Update the funding decision, add the amount and comment, then submit it for the client.
              </DialogDescription>
            </DialogHeader>

            {approvalDialogCard ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {allBanks.find((bank) => bank.id === approvalDialogCard.bank_id)?.name || approvalDialogCard.bank_name || `Bank #${approvalDialogCard.bank_id}`}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{approvalDialogCard.card_name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Client: {clientName}</p>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={approvalStatus} onValueChange={(value) => setApprovalStatus(value as ApprovalStatus)}>
                    <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="not_approved">Not Approved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="approval-amount">Amount</Label>
                  <Input
                    id="approval-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={approvalAmount}
                    onChange={(event) => setApprovalAmount(event.target.value)}
                    disabled={approvalStatus !== "approved"}
                    placeholder={approvalStatus === "approved" ? "Enter approved amount" : "Amount only required for approved cards"}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="approval-admin-percent">Charge Percentage (%)</Label>
                  <Input
                    id="approval-admin-percent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={approvalAdminPercent}
                    onChange={(event) => setApprovalAdminPercent(event.target.value)}
                    placeholder="Enter the percentage to charge the client"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">Global default: {globalAdminPercent}%</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="approval-comment">Comment</Label>
                  <Textarea
                    id="approval-comment"
                    rows={4}
                    value={approvalComment}
                    onChange={(event) => setApprovalComment(event.target.value)}
                    placeholder="Add notes or instructions for the client"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={resetApprovalDialog} disabled={approvalSubmitting}>
                    Cancel
                  </Button>
                  <Button className="bg-slate-700 hover:bg-slate-800 text-white" onClick={submitApprovalDecision} disabled={approvalSubmitting}>
                    {approvalSubmitting ? "Submitting..." : approvalStatus === "approved" ? "Submit & Send Invoice" : "Submit"}
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog open={aiSummaryFullView} onOpenChange={setAiSummaryFullView}>
          <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-700">
                <Sparkles className="w-4 h-4" /> AI Funding Strategy
              </DialogTitle>
              <DialogDescription>
                Full strategy returned by the AI for the latest credit report.
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto pr-2 prose prose-slate prose-sm max-w-none prose-headings:font-semibold prose-headings:text-slate-900 dark:text-white prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-h3:uppercase prose-h3:tracking-wide prose-h3:text-slate-500 dark:text-slate-400 dark:text-slate-500 prose-strong:text-slate-900 dark:text-white prose-li:my-0.5 prose-p:my-2 prose-hr:my-4 prose-hr:border-slate-200 dark:border-slate-700">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiStrategy?.summary_markdown || aiStrategyRaw || ""}</ReactMarkdown>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
