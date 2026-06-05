﻿import React, { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useScoreMachineEliteStatus } from "@/hooks/useScoreMachineEliteStatus";
import { creditReportScraperApi } from "@/lib/api";
import { FileText, Building2, User, ArrowLeft, CreditCard, Shield, DollarSign, CheckCircle, AlertCircle, Clock, Info, Bot, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type CardType = "personal" | "business";

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
  credit_bureaus: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AdminInputs {
  status: "approved" | "not_approved";
  amountApproved?: number;
  description?: string;
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

type StrategyMode = "hybrid" | "ai_matched" | "diy";

interface FundingStrategyStep {
  title: string;
  detail: string;
  card_id: number | null;
  bureau: string | null;
  bank_name: string | null;
  card_name: string | null;
}

interface FundingStrategyResult {
  summary: string;
  overall_rationale?: string | null;
  recommended_card_ids: number[];
  recommended_bureaus: string[];
  steps: FundingStrategyStep[];
  watchouts: string[];
  fallback?: string | null;
}

function formatCurrency(n: number): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n || 0);
  } catch {
    return `$${(n || 0).toFixed(2)}`;
  }
}

export default function FundingDIY() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isEliteActive } = useScoreMachineEliteStatus();
  const [searchParams] = useSearchParams();
  const { type } = useParams();
  const isBusiness = type === "business";
  const isPersonal = type === "personal";
  const resolvedType: CardType | null = isBusiness ? "business" : isPersonal ? "personal" : null;
  const isBoth = (!resolvedType && String(type || '').toLowerCase() === 'both') || String((location.state as any)?.goal || '').toLowerCase() === 'both';
  const shouldAskForGoal = !resolvedType && !isBoth;
  const [goalDialogOpen, setGoalDialogOpen] = useState<boolean>(false);

  const [cards, setCards] = useState<FundingCard[]>([]);
  const [allCards, setAllCards] = useState<FundingCard[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBureau, setSelectedBureau] = useState<string>("all");
  const [selectedFundingType, setSelectedFundingType] = useState<string>("all");
  const [adminData, setAdminData] = useState<Record<number, AdminInputs>>({});
  const [lockedMap, setLockedMap] = useState<Record<number, { status: string; amount_approved: number; admin_percent: number; description?: string }>>({});
  const [hydratedLockedSlots, setHydratedLockedSlots] = useState<boolean>(false);
  const [globalAdminPercent, setGlobalAdminPercent] = useState<number>(10);
  const [submittedRows, setSubmittedRows] = useState<Array<{ card_id: number; status: string; amount_approved: number; admin_percent: number; description?: string }>>([]);
  const { userProfile } = useAuthContext();
  // Accept multiple query param names to preserve client context from previous pages
  const clientIdFromQuery = Number(
    searchParams.get("client_id") ||
    searchParams.get("clientId") ||
    searchParams.get("client") ||
    ""
  );
  // Also accept clientId via navigation state (cleaner URLs)
  const state = (location.state as { clientId?: number } | null) || null;
  const clientIdFromState = Number(state?.clientId ?? "");
  // If the logged-in user is a client, default to their own ID
  const clientIdFromAuth = userProfile?.role === "client" ? Number(userProfile?.id) : NaN;
  // Resolve first valid clientId from query, navigation state, then auth
  const clientIdDetected = [clientIdFromQuery, clientIdFromState, clientIdFromAuth].find(
    (id) => Number.isFinite(id) && (id as number) > 0
  ) || 0;
  const [clientIdInput, setClientIdInput] = useState<number>(clientIdDetected);
  const [firstApprovedSubmitted, setFirstApprovedSubmitted] = useState<boolean>(false);
  const [invoiceMap, setInvoiceMap] = useState<Record<number, { token: string; url: string }>>({});
  const activeClientId = (Number.isFinite(clientIdDetected) && clientIdDetected > 0) ? clientIdDetected : clientIdInput;
  const goalValue: 'personal' | 'business' | 'both' = isBoth ? 'both' : (resolvedType === 'business' ? 'business' : 'personal');
  const handleGoalChange = (next: string) => {
    const nextGoal = (String(next || '').toLowerCase() as any) as 'personal' | 'business' | 'both';
    if (!['personal', 'business', 'both'].includes(nextGoal)) return;
    if (nextGoal === goalValue) return;
    const clientId = (Number.isFinite(clientIdDetected) && clientIdDetected > 0) ? clientIdDetected : clientIdInput;
    const search = searchParams.toString();
    navigate(
      {
        pathname: `/funding/diy/${nextGoal}`,
        search: search ? `?${search}` : '',
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

  useEffect(() => {
    if (shouldAskForGoal) setGoalDialogOpen(true);
  }, [shouldAskForGoal]);

  const chooseGoalFromDialog = (nextGoal: 'personal' | 'business' | 'both') => {
    const clientId = (Number.isFinite(clientIdDetected) && clientIdDetected > 0) ? clientIdDetected : clientIdInput;
    const search = searchParams.toString();
    setGoalDialogOpen(false);
    navigate(
      {
        pathname: `/funding/diy/${nextGoal}`,
        search: search ? `?${search}` : '',
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

  const bureaus = ["all", "Equifax", "Experian", "TransUnion"];
  const compareUpTo = useMemo(() => {
    const ib = (location.state as any)?.inquiriesByBureau || {};
    const norm = (n: any) => Math.max(0, Math.floor(Number(n || 0)));
    const map = (inq: number) => {
      if (inq >= 4) return 0;
      if (inq === 3) return 1;
      if (inq === 2) return 2;
      if (inq === 1) return 3;
      return 4;
    };
    const total = map(norm(ib?.Experian)) + map(norm(ib?.Equifax)) + map(norm(ib?.TransUnion));
    return total > 0 ? total : 3;
  }, [location.state]);
  const bureauPullCounts = useMemo(() => {
    const ib = (location.state as any)?.inquiriesByBureau || {};
    const normalize = (n: any) => Math.max(0, Math.floor(Number(n || 0)));
    const mapPulls = (inq: number) => {
      if (inq >= 4) return 0;
      if (inq === 3) return 1;
      if (inq === 2) return 2;
      if (inq === 1) return 3;
      return 4;
    };
    const ex = mapPulls(normalize(ib?.Experian));
    const eq = mapPulls(normalize(ib?.Equifax));
    const tu = mapPulls(normalize(ib?.TransUnion));
    return { Experian: ex, Equifax: eq, TransUnion: tu, total: ex + eq + tu };
  }, [location.state]);
  const canonicalProductType = useCallback((x: any) => {
    const t = String(x || '').toLowerCase();
    if (t.includes('sba')) return 'SBA Loan';
    if (t.includes('line')) return 'Line of Credit';
    if (t.includes('credit')) return 'Credit Card';
    if (t.includes('merchant cash') || t.includes('cash advance') || t === 'mca') return 'Merchant Cash Advance';
    if (t.includes('sub prime') || t.includes('subprime')) return 'Sub Prime Lenders';
    if (t.includes('loan') || t.includes('term') || t.includes('installment') || t.includes('mortgage')) return 'Loan';
    return x;
  }, []);
  const HOME_EQUITY_COMPOSITE = 'Home Equity (Loan / Line)';
  const PERSONAL_EXTRAS = [HOME_EQUITY_COMPOSITE, 'Auto Loan'];
  const isPersonalExtraType = (s: string) => PERSONAL_EXTRAS.includes(String(s));
  const cardMatchesPersonalExtra = (extra: string, card: FundingCard) => {
    const text = `${String(card.card_name || '')} ${String(card.funding_type || '')}`.toLowerCase();
    const has = (tok: string) => text.includes(tok);
    if (extra === HOME_EQUITY_COMPOSITE) {
      const isLoan = has('loan') || has('loans') || has('lending') || has('mortgage');
      const isLine = has('line') || has('loc') || has('line of credit') || has('heloc') || has('home equity line');
      const isHome = has('home') || has('home equity') || has('mortgage');
      return isHome && (isLoan || isLine);
    }
    if (extra === 'Auto Loan') {
      return has('auto loan') || has('car loan') || has('vehicle loan');
    }
    return false;
  };
  const productTypesFromState: string[] = Array.isArray((location.state as any)?.productTypes)
    ? ((location.state as any).productTypes as string[]).map(canonicalProductType)
    : ['Credit Card', 'Line of Credit', 'Loan', 'SBA Loan', 'Merchant Cash Advance', 'Sub Prime Lenders'];
  const allowedFundingTypeSet = useMemo(() => {
    const set = new Set<string>();
    productTypesFromState.map(canonicalProductType).filter(Boolean).forEach((t) => set.add(t));
    for (const c of [...(cards || []), ...(allCards || [])]) {
      const raw = String((c as any)?.funding_type || '').trim();
      const canon = canonicalProductType(raw);
      if (raw) set.add(raw);
      if (canon) set.add(canon);
    }
    return set;
  }, [productTypesFromState, cards, allCards, canonicalProductType]);
  const fundingTypes = useMemo(() => {
    const source = (cards || []).filter((c) => allowedFundingTypeSet.has(canonicalProductType(c.funding_type)));
    const unique = Array.from(new Set(source.map((c) => canonicalProductType(c.funding_type)).filter(Boolean)));
    const merged = [...unique];
    if (isPersonal || isBoth) {
      const hasHomeEquityLike = (cards || []).some((c) => cardMatchesPersonalExtra(HOME_EQUITY_COMPOSITE, c));
      if (hasHomeEquityLike && !merged.includes(HOME_EQUITY_COMPOSITE)) merged.push(HOME_EQUITY_COMPOSITE);
      if (!merged.includes('Auto Loan')) merged.push('Auto Loan');
    }
    return ["all", ...merged];
  }, [cards, allowedFundingTypeSet, isPersonal, isBoth]);

  // Client details for eligibility
  const [clientDetails, setClientDetails] = useState<any>(null);
  const [clientLoading, setClientLoading] = useState<boolean>(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [reportState, setReportState] = useState<string | null>(null);
  const [latestReportData, setLatestReportData] = useState<any>(null);
  const [strategyMode, setStrategyMode] = useState<StrategyMode>("hybrid");
  const [aiStrategy, setAiStrategy] = useState<FundingStrategyResult | null>(null);
  const [aiStrategyLoading, setAiStrategyLoading] = useState<boolean>(false);
  const [aiStrategyError, setAiStrategyError] = useState<string | null>(null);
  const [lastAiRequestKey, setLastAiRequestKey] = useState<string | null>(null);
  const canUseAiMatched = isEliteActive;

  // Three-slot selection workflow state
  type SlotForm = {
    bankId?: number;
    cardId?: number;
    fundingType?: string;
    emergencyNotes?: string;
    altContact?: string;
    limitOverride?: number;
    slotMode?: "auto" | "manual" | "locked";
  };
  const [slotForms, setSlotForms] = useState<SlotForm[]>([{}]);
  const [bankSearchMap, setBankSearchMap] = useState<Record<number, string>>({});
  const [selectedSlots, setSelectedSlots] = useState<Array<{ bankId: number; cardId: number }>>([]);

  useEffect(() => {
    setStrategyMode("hybrid");
  }, [isBoth]);

  useEffect(() => {
    if (!canUseAiMatched && strategyMode === "ai_matched") {
      setStrategyMode("hybrid");
    }
  }, [canUseAiMatched, strategyMode]);

  const isProtectedSlot = (slot?: SlotForm) => slot?.slotMode === "manual" || slot?.slotMode === "locked";

  const mergeRecommendedSlots = (prev: SlotForm[], recommended: Array<Omit<SlotForm, "slotMode">>) => {
    const autoSlots = recommended.map((slot) => ({ ...slot, slotMode: "auto" as const }));
    const next: SlotForm[] = [];
    let autoIndex = 0;

    for (const slot of prev) {
      if (isProtectedSlot(slot)) {
        next.push(slot);
        continue;
      }

      if (autoIndex < autoSlots.length) {
        next.push(autoSlots[autoIndex]);
        autoIndex += 1;
      }
    }

    while (autoIndex < autoSlots.length) {
      next.push(autoSlots[autoIndex]);
      autoIndex += 1;
    }

    return next;
  };

  const getSlotModeMeta = (slot?: SlotForm) => {
    if (slot?.slotMode === "locked") {
      return {
        label: "Locked approval",
        className: "bg-slate-100 text-slate-700 border-slate-200",
      };
    }
    if (slot?.slotMode === "manual") {
      return {
        label: "Manual selection",
        className: "bg-emerald-100 text-emerald-700 border-emerald-200",
      };
    }
    return {
      label: "Recommended",
      className: "bg-blue-100 text-blue-700 border-blue-200",
    };
  };

  const [banks, setBanks] = useState<BankOption[]>([]);
  const recommendedBankIds = useMemo(() => {
    return new Set(
      banks
        .filter((bank) => bank.recommended === true)
        .map((bank) => bank.id),
    );
  }, [banks]);
  const enforceRecommendedHybrid = canUseAiMatched && recommendedBankIds.size > 0;

  const banksFromCards = useMemo(() => {
    const map = new Map<number, BankOption>();
    for (const c of cards) {
      if (c.bank_id && !map.has(c.bank_id)) {
        map.set(c.bank_id, { id: c.bank_id, name: c.bank_name || `Bank #${c.bank_id}`, logo: c.bank_logo });
      }
    }
    return Array.from(map.values());
  }, [cards]);

  const allBanks = useMemo(() => {
    if (banks && banks.length > 0) return banks;
    return banksFromCards;
  }, [banks, banksFromCards]);

  const canonBureau = (s: string): 'Experian' | 'Equifax' | 'TransUnion' | null => {
    const t = String(s || '').toLowerCase().replace(/\s+/g, '').replace(/[-_]/g, '');
    if (t === 'experian' || t === 'ex' || t === 'exp') return 'Experian';
    if (t === 'equifax' || t === 'eq' || t === 'equ') return 'Equifax';
    if (t === 'transunion' || t === 'tu' || t === 'transu') return 'TransUnion';
    return null;
  };
  const cardHasBureau = (card: FundingCard, bureau: 'Experian' | 'Equifax' | 'TransUnion') => {
    const raw: any = (card as any).credit_bureaus;
    const arrA = Array.isArray(raw)
      ? raw
      : typeof raw === 'string'
        ? raw.split(/[\,|]/).map((x: string) => x.trim()).filter(Boolean)
        : [];
    const bankArr = (allBanks.find((b) => b.id === card.bank_id)?.credit_bureaus || []) as string[];
    const merged = Array.from(new Set([...(arrA || []), ...(bankArr || [])]));
    const canon = merged.map(canonBureau).filter(Boolean) as string[];
    return canon.includes(bureau);
  };

  const getBankPrimaryBureau = (bankId?: number): 'Experian' | 'Equifax' | 'TransUnion' | null => {
    const bank = allBanks.find((b) => b.id === bankId);
    const direct = canonBureau((bank as any)?.primary_bureau || '');
    if (direct) return direct;
    const fromList = ((bank as any)?.credit_bureaus || []).map(canonBureau).filter(Boolean) as Array<'Experian' | 'Equifax' | 'TransUnion'>;
    return fromList[0] || null;
  };

  const bureauShortLabel = (b: 'Experian' | 'Equifax' | 'TransUnion' | null) => {
    if (b === 'Experian') return 'EX';
    if (b === 'Equifax') return 'EQ';
    if (b === 'TransUnion') return 'TU';
    return 'Bureau';
  };

  const countCardsForBankBureau = (bankId: number, bureau: 'Experian' | 'Equifax' | 'TransUnion') => {
    const source = (cards.length > 0 ? cards : allCards) as FundingCard[];
    return source.filter((c) => c.bank_id === bankId && cardHasBureau(c, bureau)).length;
  };

  

  // Fetch client details for eligibility (state and scores)
  useEffect(() => {
    const clientId = (Number.isFinite(clientIdDetected) && clientIdDetected > 0) ? clientIdDetected : clientIdInput;
    if (!clientId || clientId <= 0) return;
    const fetchClient = async () => {
      try {
        setClientLoading(true);
        setClientError(null);
        const resp = await fetch(`/api/clients/${clientId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        });
        if (!resp.ok) throw new Error("Failed to fetch client details");
        const data = await resp.json();
        setClientDetails(data);
      } catch (err: any) {
        setClientError(err?.message || "Failed to load client");
      } finally {
        setClientLoading(false);
      }
    };
    fetchClient();
  }, [clientIdDetected, clientIdInput]);

  useEffect(() => {
    if (!activeClientId || activeClientId <= 0) return;
    let cancelled = false;
    const loadLatestReport = async () => {
      try {
        const resp = await creditReportScraperApi.getClientReport(String(activeClientId));
        const payload = resp?.data?.data ?? resp?.data ?? {};
        const reportBlock = payload.reportData || payload.report_data || payload;
        if (!cancelled) {
          setLatestReportData(reportBlock);
        }
        const s = extractStateFromReportData(reportBlock);
        if (!cancelled && s) {
          setReportState(s);
          setSelectedState((prev) => prev || s);
        }
      } catch {
        if (!cancelled) {
          setLatestReportData(null);
        }
      }
    };
    loadLatestReport();
    return () => {
      cancelled = true;
    };
  }, [activeClientId]);

  // Derive fundable bureaus from explicit DB flags on clients table
  const fundableBureaus = useMemo(() => {
    const out: string[] = [];
    const normalize = (v: any) => {
      if (typeof v === 'boolean') return v;
      const n = Number(v);
      if (Number.isFinite(n)) return n === 1;
      const s = String(v || '').toLowerCase();
      return s === 'true' || s === 'yes' || s === '1';
    };
    try {
      const exFlag = normalize((clientDetails as any)?.fundable_in_ex);
      const eqFlag = normalize((clientDetails as any)?.fundable_in_eq);
      const tuFlag = normalize((clientDetails as any)?.fundable_in_tu);
      if (exFlag) out.push("Experian");
      if (eqFlag) out.push("Equifax");
      if (tuFlag) out.push("TransUnion");
    } catch {}
    return out;
  }, [clientDetails]);

  const clientFundableFlags = useMemo(() => ({
    Experian: fundableBureaus.includes("Experian"),
    Equifax: fundableBureaus.includes("Equifax"),
    TransUnion: fundableBureaus.includes("TransUnion"),
  }), [fundableBureaus]);

  const US_STATE_CODES = [
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
  ];

  const extractStateFromReportData = (raw: any): string | null => {
    if (!raw) return null;
    const payload = raw.reportData || raw.report_data || raw;
    const addresses: any[] = Array.isArray(payload.Address)
      ? payload.Address
      : Array.isArray(payload.addresses)
        ? payload.addresses
        : [];
    for (let i = 0; i < addresses.length; i++) {
      const addr = addresses[i] || {};
      const code = String((addr.State || addr.state || "")).trim().toUpperCase();
      if (US_STATE_CODES.includes(code)) return code;
    }
    return null;
  };

  const resolveClientState = (): string | null => {
    const raw = String(clientDetails?.state || '').trim();
    const upper = raw.toUpperCase();
    if (US_STATE_CODES.includes(upper)) return upper;
    const addr = String(clientDetails?.address || '').toUpperCase();
    if (addr) {
      const tokens = addr.replace(/[^A-Z0-9]/g, ' ').split(/\s+/).filter(Boolean);
      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (t.length === 2 && US_STATE_CODES.includes(t)) return t;
        const m = t.match(/^([A-Z]{2})$/);
        if (m && US_STATE_CODES.includes(m[1])) return m[1];
      }
      const withZip = addr.match(/\b([A-Z]{2})\s+\d{5}(?:-\d{4})?\b/);
      if (withZip && US_STATE_CODES.includes(withZip[1])) return withZip[1];
    }
    return null;
  };

  useEffect(() => {
    const primary = resolveClientState();
    if (primary) {
      setSelectedState(primary);
    } else if (reportState) {
      setSelectedState(reportState);
    } else {
      setSelectedState(null);
    }
  }, [clientDetails, reportState]);

  // Eligibility helpers
  const bankEligibility = (bankId?: number) => {
    const state = String((selectedState || resolveClientState() || '')).toUpperCase();
    const cardsByBank = allCards.filter(c => c.bank_id === bankId);
    let stateRank = 0;
    let isNationwide = false;
    const norm = (s: string) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const nationwideTokens = new Set<string>([
      'USA','US','ALL','ANY','NATIONWIDE','ALLSTATES','ANYSTATE','UNITEDSTATES','UNITEDSTATESOFAMERICA','ANYWHERE','50STATES'
    ]);
    const bankObj = allBanks.find(b => b.id === bankId);
    const bankStatesRaw: any = bankObj?.state;
    const bankStatesArr: string[] = Array.isArray(bankStatesRaw)
      ? bankStatesRaw
      : (typeof bankStatesRaw === 'string' && bankStatesRaw.trim().length > 0
        ? (() => { try { const parsed = JSON.parse(bankStatesRaw); return Array.isArray(parsed) ? parsed : [bankStatesRaw]; } catch { return [bankStatesRaw]; } })()
        : []);
    const bankStatesUpper = bankStatesArr.map(s => String(s).toUpperCase());
    const bankStatesNorm = bankStatesArr.map(norm);
    if (bankStatesUpper.some(s => ['USA','US','ALL','ANY','NATIONWIDE'].includes(s)) || bankStatesNorm.some(t => nationwideTokens.has(t))) {
      isNationwide = true;
      stateRank = Math.max(stateRank, 2);
    }
    if (state && (bankStatesUpper.includes(state) || bankStatesNorm.includes(norm(state)))) {
      stateRank = Math.max(stateRank, 3);
    }
    const isCardEligible = (c: any) => {
      const rawStates: any = (c as any).states;
      let statesArr: string[] = Array.isArray(rawStates)
        ? rawStates
        : typeof rawStates === 'string'
          ? rawStates.split(/[\,|]/).map((s: string) => String(s).trim()).filter(Boolean)
          : [];
      const upperStates = statesArr.map((s: string) => s.toUpperCase());
      const normalizedStates = statesArr.map(norm);
      const stateVal = (c as any).state || null;
      const stateValUpper = stateVal ? String(stateVal).toUpperCase() : '';
      const stateValNorm = norm(stateValUpper);
      if (upperStates.includes('USA') || upperStates.includes('US') || upperStates.includes('ALL') || upperStates.includes('ANY') || normalizedStates.some(t => nationwideTokens.has(t))) {
        stateRank = Math.max(stateRank, 2);
        isNationwide = true;
        return true;
      }
      if (['USA', 'US', 'ALL', 'ANY', 'NATIONWIDE'].includes(stateValUpper) || nationwideTokens.has(stateValNorm)) {
        stateRank = Math.max(stateRank, 2);
        isNationwide = true;
        return true;
      }
      if (stateValUpper && stateValUpper === state) {
        stateRank = Math.max(stateRank, 3);
        return true;
      }
      if (upperStates.length > 0 && upperStates.includes(state)) {
        stateRank = Math.max(stateRank, 3);
        return true;
      }
      if (!stateValUpper && upperStates.length === 0) {
        stateRank = Math.max(stateRank, 1);
        return true;
      }
      return false;
    };
    const stateEligible = cardsByBank.some(isCardEligible) || isNationwide || (state && (bankStatesUpper.includes(state) || bankStatesNorm.includes(norm(state))));
    const bureauEligible = {
      Experian: cardsByBank.some(c => cardHasBureau(c, 'Experian')) || Boolean((bankObj as any)?.credit_bureaus?.includes('Experian')),
      Equifax: cardsByBank.some(c => cardHasBureau(c, 'Equifax')) || Boolean((bankObj as any)?.credit_bureaus?.includes('Equifax')),
      TransUnion: cardsByBank.some(c => cardHasBureau(c, 'TransUnion')) || Boolean((bankObj as any)?.credit_bureaus?.includes('TransUnion')),
    };
    return { stateEligible, bureauEligible, stateRank, isNationwide };
  };

  const sortedBanks = useMemo(() => {
    const canon = canonBureau(selectedBureau);
    const allowedSet = new Set(fundableBureaus);
    return [...allBanks]
      .filter((bank) => {
        const elig = bankEligibility(bank.id);
        const hasAnyEligibleBureau = canon
          ? ((allowedSet.size === 0 || allowedSet.has(canon)) && (elig.bureauEligible as any)[canon])
          : (
              (allowedSet.size === 0 && (elig.bureauEligible.Experian || elig.bureauEligible.Equifax || elig.bureauEligible.TransUnion))
              || (allowedSet.size > 0 && Array.from(allowedSet).some((b) => (elig.bureauEligible as any)[b]))
            );
        const hasRelevantProduct = ((cards.length > 0 ? cards : allCards) || []).some((c) => {
          if (c.bank_id !== bank.id) return false;
          if (!allowedFundingTypeSet.has(canonicalProductType(c.funding_type))) return false;
          if (!isBoth && c.card_type !== resolvedType) return false;
          if (!canon) {
            if (allowedSet.size === 0) return true;
            return (
              (allowedSet.has('Experian') && cardHasBureau(c, 'Experian')) ||
              (allowedSet.has('Equifax') && cardHasBureau(c, 'Equifax')) ||
              (allowedSet.has('TransUnion') && cardHasBureau(c, 'TransUnion'))
            );
          }
          return cardHasBureau(c, canon);
        });
        return hasAnyEligibleBureau && hasRelevantProduct;
      })
      .sort((a, b) => {
        if (Boolean(b.recommended) !== Boolean(a.recommended)) return Number(b.recommended) - Number(a.recommended);
        if (Number(a.priority_rank || 0) !== Number(b.priority_rank || 0)) return Number(a.priority_rank || 0) - Number(b.priority_rank || 0);
        const eligA = bankEligibility(a.id);
        const eligB = bankEligibility(b.id);
        const scoreA = Number(eligA.stateRank || (eligA.stateEligible ? 1 : 0));
        const scoreB = Number(eligB.stateRank || (eligB.stateEligible ? 1 : 0));
        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.name.localeCompare(b.name);
      });
  }, [allBanks, cards, allCards, selectedBureau, allowedFundingTypeSet, resolvedType, isBoth, selectedState, clientDetails, fundableBureaus]);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        setLoading(true);
        setError(null);
        // Initially fetch only cards from recommended banks
        const response = await fetch(`/api/cards?status=active&page=1&limit=2000&recommended=true`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        });
        if (!response.ok) throw new Error("Failed to fetch funding cards");
        const data = await response.json();
        const allFetched = (data.cards || []).map((c: FundingCard) => ({
          ...c,
          funding_type: String(c.funding_type || ''),
        })) as FundingCard[];
        // Set allCards (unfiltered) for eligibility checks
        setAllCards(allFetched);
        // Set cards filtered by type for display
        const typed = resolvedType
          ? allFetched.filter((c) => c.card_type === resolvedType)
          : allFetched;
        setCards(typed);
        setAdminData((prev) => {
          const next = { ...prev };
          for (const c of typed) {
            if (!next[c.id]) {
              next[c.id] = { status: "not_approved", amountApproved: 0, description: "" };
            }
          }
          return next;
        });
      } catch (err: any) {
        console.error("Error fetching cards:", err);
        setError(err?.message || "Failed to load cards");
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, [resolvedType, canonicalProductType]);

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const all: BankOption[] = [];
        let page = 1;
        const limit = 1000;
        while (true) {
          const resp = await fetch(`/api/banks?page=${page}&limit=${limit}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!resp.ok) break;
          const data = await resp.json();
          const items = (data.banks || []).map((b: any) => ({
            id: Number(b.id),
            name: String(b.name || b.bank_name || `Bank #${b.id}`),
            logo: b.logo || b.bank_logo,
            state: b?.state ?? undefined,
            credit_bureaus: Array.isArray(b?.credit_bureaus)
              ? b.credit_bureaus
              : (typeof b?.credit_bureaus === 'string'
                ? (() => { try { const arr = JSON.parse(b.credit_bureaus); return Array.isArray(arr) ? arr : []; } catch { return []; } })()
                : []),
            primary_bureau: b?.primary_bureau ?? b?.primaryBureau ?? undefined,
            recommended: isRecommendedBankFlag(b?.is_recommended),
            priority_rank: Number(b?.priority_rank ?? b?.rank ?? 0)
          }));
          all.push(...items);
          const totalPages = Number((data?.pagination?.totalPages ?? 1));
          if (!Number.isFinite(totalPages) || page >= totalPages) break;
          page += 1;
        }
        setBanks(all);
      } catch {}
    };
    fetchBanks();
  }, []);

  // Track which non-recommended bank IDs have had their cards loaded
  const [loadedBankIds, setLoadedBankIds] = useState<Set<number>>(new Set());

  // Lazily fetch cards for a specific bank (used when selecting a non-recommended bank)
  const fetchCardsForBank = useCallback(async (bankId: number) => {
    if (loadedBankIds.has(bankId)) return;
    try {
      const response = await fetch(`/api/cards?status=active&bank_id=${bankId}&page=1&limit=2000`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      const newCards = (data.cards || []).map((c: FundingCard) => ({
        ...c,
        funding_type: String(c.funding_type || ''),
      })) as FundingCard[];
      setAllCards((prev) => {
        const existingIds = new Set(prev.map((c) => c.id));
        const unique = newCards.filter((c) => !existingIds.has(c.id));
        return unique.length > 0 ? [...prev, ...unique] : prev;
      });
      setCards((prev) => {
        const typed = resolvedType ? newCards.filter((c) => c.card_type === resolvedType) : newCards;
        const existingIds = new Set(prev.map((c) => c.id));
        const unique = typed.filter((c) => !existingIds.has(c.id));
        return unique.length > 0 ? [...prev, ...unique] : prev;
      });
      setLoadedBankIds((prev) => new Set([...prev, bankId]));
    } catch (err) {
      console.error('Error fetching cards for bank:', err);
    }
  }, [loadedBankIds, resolvedType]);

  // Fetch existing submissions to lock approved cards for the selected client
  useEffect(() => {
    const clientId = (Number.isFinite(clientIdDetected) && clientIdDetected > 0) ? clientIdDetected : clientIdInput;
    if (!clientId || clientId <= 0) return;
    const fetchSubmissions = async () => {
      try {
        const resp = await fetch(`/api/funding/diy-submissions?client_id=${clientId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        });
        if (!resp.ok) return; // ignore silently
        const data = await resp.json();
        const rows = (data?.data || []) as Array<{
          card_id: number;
          status: string;
          amount_approved: number;
          admin_percent: number;
          description?: string;
        }>;
        setSubmittedRows(rows);
        const nextLocked: Record<number, { status: string; amount_approved: number; admin_percent: number; description?: string }> = {};
        const nextAdmin: Record<number, AdminInputs> = {};
        rows.forEach((row) => {
          if (String(row.status) === "approved") {
            nextLocked[row.card_id] = {
              status: row.status,
              amount_approved: Number(row.amount_approved || 0),
              admin_percent: Number(row.admin_percent || 0),
              description: row.description || "",
            };
            nextAdmin[row.card_id] = {
              status: "approved",
              amountApproved: Number(row.amount_approved || 0),
              description: row.description || "",
            };
          }
        });
        if (Object.keys(nextAdmin).length > 0) {
          setAdminData((prev) => ({ ...prev, ...nextAdmin }));
          setLockedMap(nextLocked);
        } else {
          setLockedMap({});
        }
      } catch (err) {
        // non-blocking
      }
    };
    fetchSubmissions();
  }, [clientIdDetected, clientIdInput]);

  // Pre-populate slots with approved & locked cards so they are visible on the page
  useEffect(() => {
    if (hydratedLockedSlots) return;
    const lockedIds = Object.keys(lockedMap).map((k) => parseInt(k, 10)).filter((n) => Number.isFinite(n));
    if (lockedIds.length === 0) return;
    const sourceCards: FundingCard[] = (cards && cards.length > 0) ? cards : allCards;
    if (!sourceCards || sourceCards.length === 0) return;
    const lockedCards = lockedIds
      .map((id) => sourceCards.find((c) => {
        if (resolvedType) return c.id === id && c.card_type === resolvedType;
        return c.id === id; // both: include all locked cards
      }))
      .filter(Boolean) as FundingCard[];
    if (lockedCards.length === 0) return;
    setSlotForms((prev) => {
      const existing = new Set(prev.map((p) => p.cardId).filter(Boolean) as number[]);
      const newSlots = lockedCards
        .filter((c) => !existing.has(c.id))
        .map((c) => ({ bankId: c.bank_id, cardId: c.id, fundingType: c.funding_type, slotMode: "locked" as const }));
      if (newSlots.length === 0) return prev;
      const merged = [...newSlots, ...prev];
      return merged;
    });
    setHydratedLockedSlots(true);
  }, [resolvedType, lockedMap, cards, allCards, hydratedLockedSlots]);

  const filteredCards = useMemo(() => {
    const selectedCanon = selectedFundingType === 'all' ? 'all' : canonicalProductType(selectedFundingType);
    const canonicalCategories = ['Credit Card','Line of Credit','Loan','SBA Loan','Merchant Cash Advance','Sub Prime Lenders'].map(String);
    const isCanonical = canonicalCategories.includes(String(selectedFundingType));
    const byType = (() => {
      if (selectedCanon === "all") {
        return cards.filter((c) => {
          const raw = String(c.funding_type || '');
          const canon = canonicalProductType(raw);
          return allowedFundingTypeSet.has(raw) || allowedFundingTypeSet.has(canon);
        });
      }
      if (isCanonical) {
        return cards
          .filter((c) => canonicalProductType(c.funding_type || "").toLowerCase() === String(selectedCanon).toLowerCase())
          .filter((c) => {
            const raw = String(c.funding_type || '');
            const canon = canonicalProductType(raw);
            return allowedFundingTypeSet.has(raw) || allowedFundingTypeSet.has(canon);
          });
      }
      if (isPersonalExtraType(selectedFundingType)) {
        return cards
          .filter((c) => cardMatchesPersonalExtra(selectedFundingType, c))
          .filter((c) => {
            const raw = String(c.funding_type || '');
            const canon = canonicalProductType(raw);
            return allowedFundingTypeSet.has(raw) || allowedFundingTypeSet.has(canon);
          });
      }
      return cards
        .filter((c) => String(c.funding_type || '').toLowerCase() === String(selectedFundingType).toLowerCase())
        .filter((c) => {
          const raw = String(c.funding_type || '');
          const canon = canonicalProductType(raw);
          return allowedFundingTypeSet.has(raw) || allowedFundingTypeSet.has(canon);
        });
    })();
    const byGoal = isBoth ? byType : byType.filter((c) => c.card_type === resolvedType);
    const allowedSet = new Set(fundableBureaus);
    const byClientBureau = allowedSet.size > 0
      ? byGoal.filter((c) => {
          const m = [
            allowedSet.has('Experian') && cardHasBureau(c, 'Experian'),
            allowedSet.has('Equifax') && cardHasBureau(c, 'Equifax'),
            allowedSet.has('TransUnion') && cardHasBureau(c, 'TransUnion'),
          ];
          return m.some(Boolean);
        })
      : byGoal;
    if (selectedBureau === "all") return byClientBureau;
    const canon = canonBureau(selectedBureau);
    if (!canon) return byClientBureau;
    return byClientBureau.filter((c) => cardHasBureau(c, canon));
  }, [cards, selectedFundingType, selectedBureau, allowedFundingTypeSet, resolvedType, isBoth, fundableBureaus]);

  const strategyOfferCards = useMemo(() => {
    const seen = new Set<number>();
    return filteredCards.filter((card) => {
      if (seen.has(card.id)) return false;
      seen.add(card.id);
      return true;
    });
  }, [filteredCards]);

  const hybridStrategyCards = useMemo(() => {
    const sourceCards: FundingCard[] = (cards.length > 0 ? cards : allCards);
    const seen = new Set<number>();
    return slotForms
      .map((slot) => sourceCards.find((card) => card.id === slot.cardId))
      .filter((card): card is FundingCard => Boolean(card))
      .filter((card) => {
        if (seen.has(card.id)) return false;
        seen.add(card.id);
        return true;
      })
      .slice(0, Math.max(1, compareUpTo));
  }, [slotForms, cards, allCards, compareUpTo]);

  const aiStrategyCards = useMemo(() => {
    if (!aiStrategy?.recommended_card_ids?.length) return [] as FundingCard[];
    const sourceCards: FundingCard[] = (cards.length > 0 ? cards : allCards);
    return aiStrategy.recommended_card_ids
      .map((id) => sourceCards.find((card) => card.id === id))
      .filter((card): card is FundingCard => Boolean(card))
      .slice(0, Math.max(1, compareUpTo));
  }, [aiStrategy, cards, allCards, compareUpTo]);

  const aiStrategyRequestKey = useMemo(
    () => JSON.stringify({
      clientId: activeClientId,
      goal: goalValue,
      compareUpTo,
      selectedState: selectedState || '',
      selectedFundingType,
      selectedBureau,
      offerIds: strategyOfferCards.map((card) => card.id),
    }),
    [activeClientId, goalValue, compareUpTo, selectedState, selectedFundingType, selectedBureau, strategyOfferCards],
  );

  const loadAiStrategy = useCallback(async (force = false) => {
    if (!activeClientId || activeClientId <= 0) {
      setAiStrategy(null);
      setAiStrategyError("Client ID is required before running AI-Matched.");
      return;
    }
    if (strategyOfferCards.length === 0) {
      setAiStrategy(null);
      setAiStrategyError("No eligible offers are available to send to the AI right now.");
      return;
    }
    if (!force && lastAiRequestKey === aiStrategyRequestKey && (aiStrategy || aiStrategyError)) {
      return;
    }

    try {
      setAiStrategyLoading(true);
      setAiStrategyError(null);

      const payload = {
        clientId: activeClientId,
        goal: goalValue,
        report: latestReportData || undefined,
        compareUpTo: Math.max(1, compareUpTo),
        selectedState: selectedState || undefined,
        fundableBureaus,
        bureauPullCounts,
        availableCards: strategyOfferCards.slice(0, 40).map((card) => {
          const bank = allBanks.find((item) => item.id === card.bank_id);
          return {
            id: card.id,
            bank_id: card.bank_id,
            bank_name: bank?.name || card.bank_name,
            card_name: card.card_name,
            card_type: card.card_type,
            funding_type: card.funding_type,
            credit_bureaus: card.credit_bureaus || [],
            recommended: Boolean(bank?.recommended),
            priority_rank: Number(bank?.priority_rank || 0),
          };
        }),
      };

      const resp = await fetch('/api/ai/funding-diy-strategy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.error || 'Failed to generate AI strategy');
      }

      setAiStrategy((data?.strategy || null) as FundingStrategyResult | null);
      setLastAiRequestKey(aiStrategyRequestKey);
    } catch (err: any) {
      setAiStrategy(null);
      setAiStrategyError(err?.message || 'Failed to generate AI strategy');
      setLastAiRequestKey(aiStrategyRequestKey);
    } finally {
      setAiStrategyLoading(false);
    }
  }, [activeClientId, latestReportData, strategyOfferCards, lastAiRequestKey, aiStrategyRequestKey, aiStrategy, aiStrategyError, goalValue, compareUpTo, selectedState, fundableBureaus, bureauPullCounts, allBanks]);

  useEffect(() => {
    if (!canUseAiMatched || strategyMode !== 'ai_matched') return;
    void loadAiStrategy();
  }, [canUseAiMatched, strategyMode, loadAiStrategy]);

  useEffect(() => {
    if (!canUseAiMatched || strategyMode !== 'ai_matched' || !aiStrategy?.recommended_card_ids?.length) return;
    const sourceCards: FundingCard[] = (cards.length > 0 ? cards : allCards);
    const recommendedSlots = aiStrategy.recommended_card_ids
      .map((id) => sourceCards.find((card) => card.id === id))
      .filter((card): card is FundingCard => Boolean(card))
      .slice(0, Math.max(1, compareUpTo))
      .map((card) => ({ bankId: card.bank_id, cardId: card.id, fundingType: card.funding_type }));

    if (recommendedSlots.length === 0) return;
    setSlotForms((prev) => mergeRecommendedSlots(prev, recommendedSlots));
  }, [canUseAiMatched, strategyMode, aiStrategy, cards, allCards, compareUpTo]);

  const displayStrategyCards = canUseAiMatched && strategyMode === 'ai_matched' ? aiStrategyCards : hybridStrategyCards;
  const visibleStrategyCards = useMemo(() => {
    if (strategyMode === 'hybrid' && enforceRecommendedHybrid) {
      return displayStrategyCards.filter((card) => recommendedBankIds.has(card.bank_id));
    }
    return displayStrategyCards;
  }, [strategyMode, enforceRecommendedHybrid, displayStrategyCards, recommendedBankIds]);

  useEffect(() => {
    if (strategyMode !== 'hybrid') return;
    if (!(resolvedType || isBoth)) return;
    const activeFilter = selectedFundingType !== 'all' || selectedBureau !== 'all';
    if (!activeFilter) return;
    const lockedIds = Object.keys(lockedMap || {}).map((k) => parseInt(k, 10)).filter((n) => Number.isFinite(n));
    const filtered = enforceRecommendedHybrid
      ? (filteredCards || []).filter((card) => recommendedBankIds.has(card.bank_id))
      : (filteredCards || []);
    const lockedMatching = filtered.filter((c) => lockedIds.includes(c.id));
    const rest = filtered.filter((c) => !lockedIds.includes(c.id));
    const desiredCounts = (() => {
      const canon = canonBureau(selectedBureau);
      const allowedSet = new Set(fundableBureaus);
      if (canon) {
        const allowCanon = allowedSet.size === 0 || allowedSet.has(canon);
        return { Experian: canon === 'Experian' && allowCanon ? bureauPullCounts.Experian : 0, Equifax: canon === 'Equifax' && allowCanon ? bureauPullCounts.Equifax : 0, TransUnion: canon === 'TransUnion' && allowCanon ? bureauPullCounts.TransUnion : 0 };
      }
      const ex = (allowedSet.size === 0 || allowedSet.has('Experian')) ? bureauPullCounts.Experian : 0;
      const eq = (allowedSet.size === 0 || allowedSet.has('Equifax')) ? bureauPullCounts.Equifax : 0;
      const tu = (allowedSet.size === 0 || allowedSet.has('TransUnion')) ? bureauPullCounts.TransUnion : 0;
      return { Experian: ex, Equifax: eq, TransUnion: tu };
    })();
    const order: Array<'Experian' | 'Equifax' | 'TransUnion'> = ['Experian', 'Equifax', 'TransUnion'];
    const bankOrder = new Map<number, number>();
    sortedBanks.forEach((b, idx) => bankOrder.set(b.id, idx));
    const pickFromPool = (pool: FundingCard[], count: number, chosenIds: Set<number>) => {
      const sortedPool = [...pool].sort((a, b) => {
        const ai = bankOrder.get(a.bank_id) ?? 1_000_000;
        const bi = bankOrder.get(b.bank_id) ?? 1_000_000;
        if (ai !== bi) return ai - bi;
        return a.card_name.localeCompare(b.card_name);
      });
      const picks: FundingCard[] = [];
      for (const c of sortedPool) {
        if (picks.length >= count) break;
        if (!chosenIds.has(c.id)) {
          picks.push(c);
          chosenIds.add(c.id);
        }
      }
      return picks;
    };
    const chosenIds = new Set<number>();
    const chosen: FundingCard[] = [];
    for (const b of order) {
      const target = Math.max(0, Number((desiredCounts as any)[b] || 0));
      if (target <= 0) continue;
      const lockedPool = lockedMatching.filter((c) => cardHasBureau(c, b));
      const lockedPick = pickFromPool(lockedPool, target, chosenIds);
      chosen.push(...lockedPick);
      const remaining = target - lockedPick.length;
      if (remaining > 0) {
        const pool = rest.filter((c) => cardHasBureau(c, b));
        const picks = pickFromPool(pool, remaining, chosenIds);
        chosen.push(...picks);
      }
    }
    const nextSlots = chosen.map((c) => ({ bankId: c.bank_id, cardId: c.id, fundingType: c.funding_type }));
    setSlotForms((prev) => mergeRecommendedSlots(prev, nextSlots));
    setSelectedSlots([]); 
  }, [strategyMode, selectedFundingType, selectedBureau, filteredCards, resolvedType, isBoth, lockedMap, sortedBanks, bureauPullCounts, enforceRecommendedHybrid, recommendedBankIds]);

  // Summary metrics across all cards (not just filtered)
  const { totalFunding, highestAmount, amountCharged } = useMemo(() => {
    let total = 0;
    let highest = 0;
    let charged = 0;
    for (const c of cards) {
      const a = adminData[c.id];
      if (a?.status === "approved" && (a.amountApproved || 0) > 0) {
        const amt = a.amountApproved || 0;
        total += amt;
        highest = Math.max(highest, amt);
        charged += amt * ((globalAdminPercent || 0) / 100);
      }
    }
    return { totalFunding: total, highestAmount: highest, amountCharged: charged };
  }, [cards, adminData, globalAdminPercent]);

  const hasAnyApproved = useMemo(() => {
    return cards.some((c) => adminData[c.id]?.status === "approved" && (adminData[c.id]?.amountApproved || 0) > 0);
  }, [cards, adminData]);

  useEffect(() => {
    if (strategyMode !== 'hybrid') return;
    if (!(resolvedType || isBoth)) return;
    if (hydratedLockedSlots) return;
    if (selectedFundingType !== 'all' || selectedBureau !== 'all') return;
    const sourceCards: FundingCard[] = (cards && cards.length > 0) ? cards : allCards;
    if (!sourceCards || sourceCards.length === 0) return;
    // For elite users, wait until banks (and thus recommendedBankIds) are loaded
    // before auto-picking, otherwise we'd populate slots with non-recommended
    // cards and the early-return guard below would prevent replacement later.
    if (canUseAiMatched && recommendedBankIds.size === 0) return;
    const priorityBankIds = sortedBanks.filter((b) => b.recommended).map((b) => b.id);
    const bankOrder = new Map<number, number>();
    sortedBanks.forEach((b, idx) => bankOrder.set(b.id, idx));
    const counts: Record<string, number> = {
      Experian: Math.max(0, Math.floor(Number(bureauPullCounts.Experian || 0))),
      Equifax: Math.max(0, Math.floor(Number(bureauPullCounts.Equifax || 0))),
      TransUnion: Math.max(0, Math.floor(Number(bureauPullCounts.TransUnion || 0))),
    };
    const targets: Array<{ type: CardType; bureau?: string }> = [];
    const desiredBureauOrder = ['Experian', 'Equifax', 'TransUnion'];

    const baseSlots = desiredBureauOrder.map((b) => ({ b, s: Math.max(0, Math.floor(Number(counts[b] || 0))) }));
    baseSlots.forEach(({ b, s }) => {
      if (s <= 0) return;
      if (isBoth) {
        const businessSlots = Math.ceil(s / 2);
        const personalSlots = s - businessSlots;
        for (let i = 0; i < businessSlots; i++) targets.push({ type: 'business', bureau: b });
        for (let i = 0; i < personalSlots; i++) targets.push({ type: 'personal', bureau: b });
      } else if (resolvedType) {
        for (let i = 0; i < s; i++) targets.push({ type: resolvedType, bureau: b });
      }
    });
    const pickedCardIds = new Set<number>();
    const pickFor = (t: { type: CardType; bureau?: string }) => {
      let pool = sourceCards.filter((c) => {
        const raw = String(c.funding_type || '');
        const canon = canonicalProductType(raw);
        return c.card_type === t.type && (allowedFundingTypeSet.has(raw) || allowedFundingTypeSet.has(canon));
      });
      if (enforceRecommendedHybrid) {
        pool = pool.filter((card) => recommendedBankIds.has(card.bank_id));
      }
      if (t.bureau) {
        pool = pool.filter((c) => cardHasBureau(c, t.bureau as any));
      }
      if (pool.length === 0) return null;
      const bankUsage = new Map<number, number>();
      // count already-picked cards per bank to encourage diversity
      pickedCardIds.forEach((id) => {
        const found = sourceCards.find((c) => c.id === id);
        if (found) {
          bankUsage.set(found.bank_id, (bankUsage.get(found.bank_id) || 0) + 1);
        }
      });
      const sortedPool = [...pool].sort((a, b) => {
        const usageA = bankUsage.get(a.bank_id) || 0;
        const usageB = bankUsage.get(b.bank_id) || 0;
        if (usageA !== usageB) return usageA - usageB;
        const ai = bankOrder.get(a.bank_id) ?? 1_000_000;
        const bi = bankOrder.get(b.bank_id) ?? 1_000_000;
        if (ai !== bi) return ai - bi;
        return a.card_name.localeCompare(b.card_name);
      });
      const prioritySortedPool = sortedPool.filter((c) => priorityBankIds.includes(c.bank_id));
      const pickFrom = enforceRecommendedHybrid
        ? sortedPool
        : (prioritySortedPool.length > 0 ? prioritySortedPool : sortedPool);
      const picked = pickFrom.find((c) => !pickedCardIds.has(c.id)) || pickFrom[0];
      if (picked) pickedCardIds.add(picked.id);
      return picked;
    };
    const newSlots = targets.map((t) => {
      const chosen = pickFor(t);
      if (!chosen) return null;
      return { bankId: chosen.bank_id, cardId: chosen.id, fundingType: chosen.funding_type };
    }).filter(Boolean) as Array<{ bankId: number; cardId: number; fundingType: string }>;
    if (newSlots.length > 0) {
      setSlotForms((prev) => {
        const hasProtectedSlots = prev.some((slot) => isProtectedSlot(slot));
        const hasSelectedSlots = prev.some((slot) => slot.bankId || slot.cardId);
        // In elite hybrid mode, force-replace existing auto slots if any of them
        // point to a non-recommended bank (e.g. picked before banks loaded).
        if (enforceRecommendedHybrid) {
          const hasInvalidAutoSlot = prev.some(
            (slot) =>
              !isProtectedSlot(slot) &&
              slot.bankId != null &&
              !recommendedBankIds.has(slot.bankId),
          );
          if (hasInvalidAutoSlot) {
            const protectedSlots = prev.filter(isProtectedSlot);
            return [
              ...protectedSlots,
              ...newSlots.map((slot) => ({ ...slot, slotMode: "auto" as const })),
            ];
          }
        }
        if (hasProtectedSlots || hasSelectedSlots) return prev;
        return newSlots.map((slot) => ({ ...slot, slotMode: "auto" as const }));
      });
    }
  }, [strategyMode, resolvedType, isBoth, hydratedLockedSlots, cards, allCards, sortedBanks, allowedFundingTypeSet, location.state, selectedFundingType, selectedBureau, enforceRecommendedHybrid, recommendedBankIds, canUseAiMatched]);

  const updateAdmin = (cardId: number, patch: Partial<AdminInputs>) => {
    setAdminData((prev) => ({ ...prev, [cardId]: { ...prev[cardId], ...patch } }));
  };

  const submitCard = async (card: FundingCard) => {
    const clientId = (Number.isFinite(clientIdDetected) && clientIdDetected > 0) ? clientIdDetected : clientIdInput;
    if (!clientId || clientId <= 0) {
      toast({ title: "Client ID required", description: "Please provide a valid client ID to save submissions.", variant: "destructive" });
      return;
    }
    const payload = {
      client_id: clientId,
      card_id: card.id,
      card_type: card.card_type,
      status: adminData[card.id]?.status || "not_approved",
      amount_approved: adminData[card.id]?.amountApproved || 0,
      admin_percent: globalAdminPercent || 0,
      description: adminData[card.id]?.description || "",
      credit_bureaus: card.credit_bureaus || [],
    };
    try {
      const resp = await fetch("/api/funding/diy-submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        let message = "Failed to submit admin card data";
        try {
          const errData = await resp.json();
          message = errData?.error || message;
        } catch {}
        if (resp.status === 409) {
          toast({ title: "Locked", description: message || "Submission already approved and locked.", variant: "destructive" });
          // Refresh locked map
          setLockedMap((prev) => ({ ...prev, [card.id]: { status: "approved", amount_approved: payload.amount_approved, admin_percent: payload.admin_percent, description: payload.description } }));
          return;
        }
        throw new Error(message);
      }
      toast({ title: "Submitted", description: `${card.card_name} saved successfully.` });
      if ((payload.status === "approved") && (payload.amount_approved || 0) > 0) {
        setFirstApprovedSubmitted(true);
        // Auto-generate a separate invoice for this card approval
        await generateInvoiceForCard(card, clientId);
      }
    } catch (err: any) {
      console.error("Submit error:", err);
      toast({ title: "Submission failed", description: err?.message || "Could not save", variant: "destructive" });
    }
  };

  const generateInvoiceForCard = async (card: FundingCard, clientIdOverride?: number) => {
    try {
      const clientId = clientIdOverride ?? ((Number.isFinite(clientIdDetected) && clientIdDetected > 0) ? clientIdDetected : clientIdInput);
      if (!clientId || clientId <= 0) {
        toast({ title: "Client ID required", description: "Please provide a valid client ID to generate an invoice.", variant: "destructive" });
        return;
      }
      const adminId = Number(userProfile?.id || 0);
      const amt = Number(adminData[card.id]?.amountApproved || 0);
      const feePercent = Number(globalAdminPercent || 0);
      const feeAmount = Number((amt * (feePercent / 100)).toFixed(2));
      if (!(amt > 0) || !(feeAmount > 0)) {
        toast({ title: "Invalid amounts", description: "Approved amount or admin fee is missing.", variant: "destructive" });
        return;
      }
      const description = `Card: ${card.card_name} | Approved: ${formatCurrency(amt)} | Admin Fee: ${feePercent}%`;
      const resp = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: adminId || 1,
          client_id: clientId,
          currency: 'USD',
          line_items: [{ description, quantity: 1, unit_price: feeAmount }],
          tax_rate: 0,
          notes: `Funding admin fee for ${card.card_name}`,
        })
      });
      if (!resp.ok) throw new Error('Failed to create invoice');
      const data = await resp.json();
      const token = data?.data?.public_token;
      const publicUrl = data?.data?.public_url;
      if (!token || !publicUrl) throw new Error('Invalid invoice response');
      setInvoiceMap(prev => ({ ...prev, [card.id]: { token, url: publicUrl } }));
      // Fire-and-forget email send to client
      fetch(`/api/invoices/public/${token}/send-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' } }).catch(() => {});
      toast({ title: 'Invoice generated', description: `Invoice created for ${card.card_name}.`, });
      return { token, publicUrl };
    } catch (err: any) {
      console.error('Generate invoice error:', err);
      toast({ title: 'Invoice error', description: err?.message || 'Could not generate invoice', variant: 'destructive' });
    }
  };

  const handleViewInvoice = async (card: FundingCard) => {
    const existing = invoiceMap[card.id];
    if (existing?.token) {
      navigate(`/invoice/${existing.token}`);
      return;
    }
    const created = await generateInvoiceForCard(card);
    const token = created?.token || invoiceMap[card.id]?.token;
    if (token) {
      navigate(`/invoice/${token}`);
      return;
    }
    toast({ title: 'Invoice not available yet', description: 'Please try again in a few seconds.', variant: 'destructive' });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Choose funding type</DialogTitle>
              <DialogDescription>What do you want to apply for?</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => chooseGoalFromDialog('personal')}>Personal</Button>
              <Button variant="secondary" onClick={() => chooseGoalFromDialog('business')}>Business</Button>
              <Button variant="outline" onClick={() => chooseGoalFromDialog('both')}>Both</Button>
            </div>
          </DialogContent>
        </Dialog>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg gradient-primary">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text-primary">
                DIY Funding Cards {isBusiness ? "— Business" : isPersonal ? "— Personal" : ""}
              </h1>
              <p className="text-sm text-muted-foreground">Admin can configure approvals, percentages, notes and submit.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(resolvedType || isBoth) && (
              <ToggleGroup type="single" value={goalValue} onValueChange={handleGoalChange} className="mr-2">
                <ToggleGroupItem value="personal">Personal</ToggleGroupItem>
                <ToggleGroupItem value="business">Business</ToggleGroupItem>
                <ToggleGroupItem value="both">Both</ToggleGroupItem>
              </ToggleGroup>
            )}
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          </div>
        </div>

        {/* Global Admin Percentage */}
        {(resolvedType || isBoth) && (
          <Card>
            <CardHeader>
              <CardTitle>Admin Percentage (applies to all cards)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {clientIdDetected > 0 ? (
                <div className="space-y-2">
                  <Label>Client</Label>
                  <p className="text-sm text-muted-foreground">
                    {(clientDetails?.first_name || clientDetails?.last_name)
                      ? <>Using Client {clientDetails?.first_name} {clientDetails?.last_name} (ID: {clientIdDetected}) (auto-detected).</>
                      : <>Using Client ID {clientIdDetected} (auto-detected).</>
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="client-id">Client ID</Label>
                  <Input
                    id="client-id"
                    type="number"
                    min="1"
                    value={Number.isFinite(clientIdInput) ? clientIdInput : 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value || "0", 10);
                      setClientIdInput(Number.isFinite(val) ? val : 0);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Auto-detected when passed via URL, navigation, or client profile.</p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Client State</Label>
                <p className="text-sm text-muted-foreground">Detected from profile or latest report: {selectedState || 'Not detected'}</p>
                <Select value={String(selectedState || '')} onValueChange={(v) => setSelectedState(v || null)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATE_CODES.map((code) => (
                      <SelectItem key={code} value={code}>{code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="global-admin-percent">Admin Percentage (%)</Label>
                <Input
                  id="global-admin-percent"
                  type="number"
                  step="0.1"
                  min="0"
                  value={Number.isFinite(globalAdminPercent) ? globalAdminPercent : 0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value || "0");
                    setGlobalAdminPercent(Number.isFinite(val) ? val : 0);
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label>Applies Globally</Label>
                <p className="text-sm text-muted-foreground">
                  Charged amounts and metrics use this percentage for all approved cards.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Type selector when none chosen */}
        {!resolvedType && !isBoth && (
          <Card>
            <CardHeader>
              <CardTitle>Select funding type</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button onClick={() => navigate("/funding/diy/personal", { state: { clientId: (clientIdDetected > 0 ? clientIdDetected : clientIdInput) || undefined } })}>Personal DIY</Button>
              <Button onClick={() => navigate("/funding/diy/business", { state: { clientId: (clientIdDetected > 0 ? clientIdDetected : clientIdInput) || undefined } })} variant="secondary">Business DIY</Button>
            </CardContent>
          </Card>
        )}

        {/* Metrics */}
        {(resolvedType || isBoth) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="rounded-xl bg-red-50 border border-red-200 shadow-sm">
              <CardHeader>
                <CardTitle>Total approvals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">{formatCurrency(totalFunding)}</div>
                <p className="text-xs text-muted-foreground">Total approvals across all cards</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl bg-yellow-50 border border-yellow-200 shadow-sm">
              <CardHeader>
                <CardTitle>Highest amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-700">{formatCurrency(highestAmount)}</div>
                <p className="text-xs text-muted-foreground">Highest amount of all cards</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl bg-green-50 border border-green-200 shadow-sm">
              <CardHeader>
                <CardTitle>Amount to charge client</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">{formatCurrency(amountCharged)}</div>
                <p className="text-xs text-muted-foreground">Calculated from the global admin %</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loading / Error */}
        {(resolvedType || isBoth) && loading && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-pulse">
              <CreditCard className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Loading {isBoth ? "Funding" : isBusiness ? "Business" : "Personal"} Cards...
            </h3>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
            </div>
          </div>
        )}
        {(resolvedType || isBoth) && !loading && error && (
          <Card>
            <CardHeader>
              <CardTitle>Error Loading Cards</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </CardContent>
          </Card>
        )}

        {/* Three-Slot Selection Workflow */}
        {(resolvedType || isBoth) && !loading && !error && (
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white via-blue-50 to-emerald-50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg gradient-primary">
                  {isBusiness ? <Building2 className="h-6 w-6 text-white" /> : <User className="h-6 w-6 text-white" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold gradient-text-primary">{isBoth ? "Personal + Business" : (isBusiness ? "Business" : "Personal")} DIY Funding: Compare up to {compareUpTo} options</h3>
                  <p className="text-sm text-emerald-700 font-medium">Select a bank, review eligibility, add cards to compare.</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Funding Type</Label>
                  <Tabs value={selectedFundingType} onValueChange={setSelectedFundingType}>
                    <TabsList className="flex flex-wrap">
                      {fundingTypes.map((ft) => (
                        <TabsTrigger key={ft} value={ft}>{ft}</TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>
                <div className="space-y-2">
                  <Label>Bureau</Label>
                  <Tabs value={selectedBureau} onValueChange={setSelectedBureau}>
                    <TabsList className="flex flex-wrap">
                      {bureaus.map((b) => (
                        <TabsTrigger key={b} value={b}>{b}</TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>
              </div>
                <Card className="mb-6 border border-slate-200 bg-white/90 shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">Your Funding Strategy</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {strategyMode === 'ai_matched'
                            ? 'The AI uses the exact latest client credit report JSON and the eligible offers shown on this page.'
                            : strategyMode === 'diy'
                              ? 'Manual builder mode keeps you in control of the bank and card order.'
                              : 'Hybrid mode balances bureau pull targets, client eligibility, and recommended-bank priority.'}
                        </p>
                      </div>
                      <Tabs
                        value={strategyMode}
                        onValueChange={(value) => {
                          if (!canUseAiMatched && value === 'ai_matched') {
                            setStrategyMode('hybrid');
                            return;
                          }
                          setStrategyMode(value as StrategyMode);
                        }}
                        className="w-full xl:w-auto"
                      >
                        <TabsList className={cn("grid w-full xl:w-[360px]", canUseAiMatched ? "grid-cols-3" : "grid-cols-2")}>
                          <TabsTrigger value="hybrid">Hybrid</TabsTrigger>
                          {canUseAiMatched && <TabsTrigger value="ai_matched">AI-Matched</TabsTrigger>}
                          <TabsTrigger value="diy">DIY Builder</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {strategyMode === 'hybrid' && (
                      <>
                        <div className="grid gap-3 md:grid-cols-4">
                          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-500">Experian</div>
                            <div className="mt-1 text-2xl font-bold text-blue-700">{bureauPullCounts.Experian}</div>
                          </div>
                          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-500">Equifax</div>
                            <div className="mt-1 text-2xl font-bold text-blue-700">{bureauPullCounts.Equifax}</div>
                          </div>
                          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-500">TransUnion</div>
                            <div className="mt-1 text-2xl font-bold text-blue-700">{bureauPullCounts.TransUnion}</div>
                          </div>
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Target</div>
                            <div className="mt-1 text-2xl font-bold text-emerald-700">{bureauPullCounts.total}</div>
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          Hybrid mode keeps recommended banks first, respects state eligibility, and fills up to {compareUpTo} slots based on the current bureau pull targets.
                        </div>
                      </>
                    )}

                    {canUseAiMatched && strategyMode === 'ai_matched' && (
                      <div className="space-y-4">
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                            <div className="flex items-center gap-2 font-semibold">
                              <Bot className="h-4 w-4" />
                              AI-Matched
                            </div>
                            <p className="mt-1 text-emerald-700">
                              The server sends the full latest credit report JSON plus the eligible offer list to the AI for ranking.
                            </p>
                          </div>
                          <Button variant="outline" onClick={() => void loadAiStrategy(true)} disabled={aiStrategyLoading || !activeClientId || activeClientId <= 0}>
                            {aiStrategyLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Refresh Match
                          </Button>
                        </div>

                        {!latestReportData && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            No stored credit report was found for this client. The AI will rank the eligible offers using the goal, state, fundable bureaus, and pull targets only. Pull a report later for a more precise match.
                          </div>
                        )}

                        {aiStrategyLoading && (
                          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            The AI is reviewing the latest report and ranking the current offers.
                          </div>
                        )}

                        {!aiStrategyLoading && aiStrategyError && (
                          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {aiStrategyError}
                          </div>
                        )}

                        {!aiStrategyLoading && aiStrategy && (
                          <>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                              <p className="text-sm font-semibold text-slate-900">{aiStrategy.summary}</p>
                              {aiStrategy.overall_rationale && (
                                <p className="mt-2 text-sm text-slate-600">{aiStrategy.overall_rationale}</p>
                              )}
                            </div>

                            <div className="grid gap-4 xl:grid-cols-2">
                              <div className="space-y-3">
                                <Label>AI card order</Label>
                                {displayStrategyCards.length > 0 ? (
                                  displayStrategyCards.map((card, index) => {
                                    const bank = banks.find((item) => item.id === card.bank_id);
                                    return (
                                      <div key={`ai-card-${card.id}`} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                                        <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">#{index + 1} AI Match</div>
                                        <div className="mt-1 text-sm font-semibold text-slate-900">{bank?.name || card.bank_name}</div>
                                        <div className="text-sm text-slate-600">{card.card_name}</div>
                                        <div className="mt-2 flex flex-wrap gap-1">
                                          {(card.credit_bureaus || []).map((bureau) => (
                                            <Badge key={`${card.id}-${bureau}`} variant="outline">{bureau}</Badge>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                    The AI did not return a ranked card list from the current offer set.
                                  </p>
                                )}
                              </div>

                              <div className="space-y-3">
                                <Label>AI flow</Label>
                                {aiStrategy.steps.length > 0 ? (
                                  aiStrategy.steps.map((step, index) => (
                                    <div key={`ai-step-${index}`} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <div className="text-sm font-semibold text-slate-900">{step.title}</div>
                                          <p className="mt-1 text-sm text-slate-600">{step.detail}</p>
                                        </div>
                                        {step.bureau && <Badge variant="outline">{step.bureau}</Badge>}
                                      </div>
                                      {(step.bank_name || step.card_name) && (
                                        <p className="mt-2 text-xs text-slate-500">{[step.bank_name, step.card_name].filter(Boolean).join(' — ')}</p>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                    The AI did not return step-by-step flow for this match.
                                  </p>
                                )}
                              </div>
                            </div>

                            {(aiStrategy.recommended_bureaus.length > 0 || aiStrategy.watchouts.length > 0 || aiStrategy.fallback) && (
                              <div className="grid gap-4 xl:grid-cols-3">
                                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                                  <div className="text-sm font-semibold text-slate-900">Recommended bureaus</div>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {aiStrategy.recommended_bureaus.length > 0 ? aiStrategy.recommended_bureaus.map((bureau) => (
                                      <Badge key={`bureau-${bureau}`} variant="outline">{bureau}</Badge>
                                    )) : <span className="text-sm text-slate-500">Not specified</span>}
                                  </div>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                                  <div className="text-sm font-semibold text-slate-900">Watchouts</div>
                                  <div className="mt-2 space-y-2">
                                    {aiStrategy.watchouts.length > 0 ? aiStrategy.watchouts.map((watchout, index) => (
                                      <p key={`watchout-${index}`} className="text-sm text-slate-600">{watchout}</p>
                                    )) : <p className="text-sm text-slate-500">No extra watchouts returned.</p>}
                                  </div>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                                  <div className="text-sm font-semibold text-slate-900">Fallback</div>
                                  <p className="mt-2 text-sm text-slate-600">{aiStrategy.fallback || 'No fallback path returned.'}</p>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {strategyMode === 'diy' && (
                      <div className="grid gap-4 xl:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                          <div className="text-sm font-semibold text-slate-900">Manual builder is active</div>
                          <p className="mt-2 text-sm text-slate-600">
                            Use the selectors below to choose banks and cards manually. Locked approvals stay pinned, and new auto recommendations stop updating while DIY Builder is active.
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                          <div className="text-sm font-semibold text-slate-900">Client context still applies</div>
                          <p className="mt-2 text-sm text-slate-600">
                            State: {selectedState || 'Not detected'}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            Fundable bureaus: {fundableBureaus.length > 0 ? fundableBureaus.join(', ') : 'Not detected'}
                          </p>
                        </div>
                      </div>
                    )}

                    {visibleStrategyCards.length > 0 && strategyMode !== 'ai_matched' && (
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {visibleStrategyCards.map((card, index) => {
                          const bank = banks.find((item) => item.id === card.bank_id);
                          return (
                            <div key={`strategy-card-${card.id}`} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">#{index + 1} Recommended</div>
                              <div className="mt-1 text-sm font-semibold text-slate-900">{bank?.name || card.bank_name}</div>
                              <div className="text-sm text-slate-600">{card.card_name}</div>
                              <div className="mt-2 flex flex-wrap gap-1">
                                {(card.credit_bureaus || []).map((bureau) => (
                                  <Badge key={`${card.id}-${bureau}`} variant="outline">{bureau}</Badge>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              
              {submittedRows.length > 0 && (
                <div className="mb-4 space-y-6">
                  {(() => {
                    const sourceCards = (cards.length > 0 ? cards : allCards);
                    const approved = submittedRows.filter(r => String(r.status) === 'approved');
                    const pending = submittedRows.filter(r => String(r.status) !== 'approved');
                    return (
                      <>
                        {approved.length > 0 && (
                          <div>
                            <Label>Approved & Locked</Label>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                              {approved.map((row, idx) => {
                                const card = sourceCards.find(c => c.id === row.card_id);
                                if (!card) return null;
                                const bank = banks.find(b => b.id === card.bank_id);
                                return (
                                  <Card key={`locked-${row.card_id}-${idx}`}>
                                    <CardHeader>
                                      <CardTitle className="text-sm">{bank?.name || card.bank_name} — {card.card_name}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="flex justify-center mb-4">
                                        {card.card_image ? (
                                          <img
                                            src={card.card_image}
                                            alt={card.card_name}
                                            className="h-24 w-38 rounded-lg object-cover shadow-md"
                                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/uploads/card.png'; }}
                                          />
                                        ) : (
                                          <img
                                            src="/uploads/card.png"
                                            alt="Default card"
                                            className="h-24 w-38 rounded-lg object-cover shadow-md"
                                          />
                                        )}
                                      </div>
                                      <div className="flex flex-wrap gap-2 mb-2">
                                        <Badge variant="outline">{card.funding_type}</Badge>
                                        {(card.credit_bureaus || []).map(b => (<Badge key={b} variant="outline">{b}</Badge>))}
                                      </div>
                                      <div className="flex gap-2">
                                        <Button variant="secondary" onClick={() => handleViewInvoice(card)}>View Invoice</Button>
                                        <Button variant="outline" onClick={() => window.open(card.card_link, '_blank')}>Apply</Button>
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {pending.length > 0 && (
                          <div>
                            <Label>Submitted — Not Approved</Label>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                              {pending.map((row, idx) => {
                                const card = sourceCards.find(c => c.id === row.card_id);
                                if (!card) return null;
                                const bank = banks.find(b => b.id === card.bank_id);
                                return (
                                  <Card key={`pending-${row.card_id}-${idx}`}>
                                    <CardHeader>
                                      <CardTitle className="text-sm">{bank?.name || card.bank_name} — {card.card_name}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="flex justify-center mb-4">
                                        {card.card_image ? (
                                          <img
                                            src={card.card_image}
                                            alt={card.card_name}
                                            className="h-24 w-38 rounded-lg object-cover shadow-md"
                                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/uploads/card.png'; }}
                                          />
                                        ) : (
                                          <img
                                            src="/uploads/card.png"
                                            alt="Default card"
                                            className="h-24 w-38 rounded-lg object-cover shadow-md"
                                          />
                                        )}
                                      </div>
                                      <div className="flex flex-wrap gap-2 mb-2">
                                        <Badge variant="outline">{card.funding_type}</Badge>
                                        {(card.credit_bureaus || []).map(b => (<Badge key={b} variant="outline">{b}</Badge>))}
                                      </div>
                                      <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => window.open(card.card_link, '_blank')}>Apply</Button>
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {((selectedFundingType === 'all' && selectedBureau === 'all') || filteredCards.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {slotForms.map((slot, idx) => (
                    <div key={idx} className="p-4 rounded-lg border bg-white">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Bank</Label>
                            <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wide", getSlotModeMeta(slot).className)}>
                              {getSlotModeMeta(slot).label}
                            </Badge>
                          </div>
                          {slotForms.length > 1 && (
                            <Button variant="ghost" onClick={() => setSlotForms((prev) => prev.filter((_, i) => i !== idx))}>Remove</Button>
                          )}
                        </div>
                      <Select
                        value={String(slot.bankId || '')}
                        onValueChange={(v) => {
                          const id = parseInt(v);
                          // Lazy-load cards for non-recommended banks
                          const bank = allBanks.find((b) => b.id === id);
                          if (bank && !bank.recommended) {
                            fetchCardsForBank(id);
                          }
                          setSlotForms((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], bankId: id, fundingType: next[idx]?.fundingType, cardId: undefined, slotMode: "manual" };
                            return next;
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select bank" />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="p-2 border-b">
                            <Input
                              placeholder="Search banks..."
                              value={bankSearchMap[idx] || ''}
                              onChange={(e) => setBankSearchMap((prev) => ({ ...prev, [idx]: e.target.value }))}
                            />
                          </div>
                          {(() => {
                            const q = String(bankSearchMap[idx] || '').toLowerCase();
                            // When searching, show all banks; otherwise show only filtered recommended banks
                            const baseBanks = q
                              ? [...allBanks]
                                  .filter((b) => String(b.name || '').toLowerCase().includes(q))
                                  .sort((a, b) => {
                                    if (Boolean(b.recommended) !== Boolean(a.recommended)) return Number(b.recommended) - Number(a.recommended);
                                    if (Number(a.priority_rank || 0) !== Number(b.priority_rank || 0)) return Number(a.priority_rank || 0) - Number(b.priority_rank || 0);
                                    return a.name.localeCompare(b.name);
                                  })
                              : sortedBanks;
                            return baseBanks.map((b) => {
                            const elig = bankEligibility(b.id);
                            const primary = getBankPrimaryBureau(b.id);
                            const primaryEligible = primary
                              ? (elig.bureauEligible as any)[primary] && (clientFundableFlags as any)[primary]
                              : false;
                            const primaryCount = primary ? countCardsForBankBureau(b.id, primary) : 0;
                            return (
                              <SelectItem key={b.id} value={String(b.id)}>
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-2">
                                    {b.logo ? (
                                      <img src={b.logo} alt={b.name} className="h-4 w-4 rounded" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                    ) : (
                                      <Building2 className="h-4 w-4" />
                                    )}
                                    <span>{b.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className={cn('group-hover:text-white', elig.stateEligible ? '' : 'text-red-500')}>{elig.stateEligible ? (elig.isNationwide ? '✅' : '✔') : '❌'} State</span>
                                    <span className={cn('group-hover:text-white', primaryEligible ? '' : 'text-red-500')}>
                                      {bureauShortLabel(primary)} {primaryEligible ? '✔' : '❌'} ({primaryCount})
                                    </span>
                                  </div>
                                </div>
                              </SelectItem>
                            );
                          });
                          })()}
                        </SelectContent>
                      </Select>

                      {selectedFundingType === "all" && (
                        <>
                          <Label>Funding Type</Label>
                          <Select
                            value={String(slot.fundingType || '')}
                            onValueChange={(v) => {
                              setSlotForms((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], fundingType: v, cardId: undefined, slotMode: "manual" };
                                return next;
                              });
                            }}
                            disabled={!slot.bankId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select funding type" />
                            </SelectTrigger>
                            <SelectContent>
                              {fundingTypes.filter((ft) => ft !== 'all').map((ft) => (
                                <SelectItem key={ft} value={ft}>{ft}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      )}

                      <Label>Card</Label>
                      <Select
                        value={String(slot.cardId || '')}
                        onValueChange={(v) => {
                          const id = parseInt(v);
                          setSlotForms((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], cardId: id, slotMode: "manual" };
                            return next;
                          });
                        }}
                        disabled={!slot.bankId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select card" />
                        </SelectTrigger>
                        <SelectContent>
                          {(cards.length > 0 ? cards : allCards)
                            .filter(c => {
                              const goalOk = isBoth ? true : c.card_type === resolvedType;
                              return ((c.bank_id === slot.bankId && goalOk) || c.id === slot.cardId);
                            })
                        .filter(c => {
                              const effective = selectedFundingType === 'all' ? (slot.fundingType || 'all') : selectedFundingType;
                              if (effective === 'all') return true;
                              if (c.id === slot.cardId) return true;
                              const canonicalCategories = ['Credit Card','Line of Credit','Loan','SBA Loan','Merchant Cash Advance','Sub Prime Lenders'];
                              const isCanonical = canonicalCategories.includes(String(effective));
                              if (isCanonical) {
                                return canonicalProductType(c.funding_type || '').toLowerCase() === canonicalProductType(String(effective)).toLowerCase();
                              }
                              if (isPersonalExtraType(String(effective))) {
                                return cardMatchesPersonalExtra(String(effective), c);
                              }
                              return String(c.funding_type || '').toLowerCase() === String(effective).toLowerCase();
                            })
                            .filter(c => {
                              const raw = String(c.funding_type || '');
                              const canon = canonicalProductType(raw);
                              return allowedFundingTypeSet.has(raw) || allowedFundingTypeSet.has(canon);
                            })
                            .filter(c => {
                              const allowedSet = new Set(fundableBureaus);
                              if (allowedSet.size === 0) return true;
                              if (c.id === slot.cardId) return true;
                              const m = [
                                allowedSet.has('Experian') && cardHasBureau(c, 'Experian'),
                                allowedSet.has('Equifax') && cardHasBureau(c, 'Equifax'),
                                allowedSet.has('TransUnion') && cardHasBureau(c, 'TransUnion'),
                              ];
                              return m.some(Boolean);
                            })
                            .filter(c => {
                              if (selectedBureau === 'all') return true;
                              const canon = canonBureau(selectedBureau);
                              if (!canon) return true;
                              if (c.id === slot.cardId) return true;
                              return cardHasBureau(c, canon);
                            })
                            .sort((a, b) => {
                              const elig = slot.bankId ? bankEligibility(slot.bankId) : { stateEligible: false, bureauEligible: { Experian: false, Equifax: false, TransUnion: false } } as any;
                              const scoreFor = (card: typeof a) => {
                                const bureauMatch = (
                                  (cardHasBureau(card, 'Experian') && clientFundableFlags.Experian && elig.bureauEligible.Experian) ||
                                  (cardHasBureau(card, 'Equifax') && clientFundableFlags.Equifax && elig.bureauEligible.Equifax) ||
                                  (cardHasBureau(card, 'TransUnion') && clientFundableFlags.TransUnion && elig.bureauEligible.TransUnion)
                                );
                                return (elig.stateEligible ? 1 : 0) + (bureauMatch ? 1 : 0);
                              };
                              return scoreFor(b) - scoreFor(a);
                            })
                            .map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{c.card_name}</span>
                                  <div className="flex gap-1">
                                    {(c.credit_bureaus || []).map(b => (
                                      <Badge key={b} variant="outline" className="text-[10px]">{b}</Badge>
                                    ))}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>

                      {slot.cardId && (() => {
                        const card = cards.find(c => c.id === slot.cardId);
                        const bank = banks.find(b => b.id === slot.bankId);
                        if (!card) return null;
                        return (
                          <Card className="hover:shadow-xl transition-all duration-300 border-2 hover:border-green-300 group relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <CardHeader className="relative z-10">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  {card.bank_logo ? (
                                    <img
                                      src={card.bank_logo}
                                      alt={`${card.bank_name || 'Bank'} logo`}
                                      className="h-8 w-8 rounded-full object-cover shadow-md"
                                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                    />
                                  ) : (
                                    <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                                      <Building2 className="h-4 w-4 text-white" />
                                    </div>
                                  )}
                                  <div>
                                    <div className="text-sm text-gray-600 font-medium">{bank?.name || card.bank_name}</div>
                                    <div className="text-base font-bold text-gray-800">{card.card_name}</div>
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-xs font-medium">{card.funding_type}</Badge>
                              </div>
                              <div className="flex justify-center mb-4">
                                {card.card_image ? (
                                  <img
                                    src={card.card_image}
                                    alt={card.card_name}
                                    className="h-24 w-38 rounded-lg object-cover shadow-md group-hover:scale-105 transition-transform duration-300"
                                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/uploads/card.png'; }}
                                  />
                                ) : (
                                  <img
                                    src="/uploads/card.png"
                                    alt="Default card"
                                    className="h-24 w-38 rounded-lg object-cover shadow-md group-hover:scale-105 transition-transform duration-300"
                                  />
                                )}
                              </div>
                              <div className="flex flex-wrap justify-center gap-2">
                                {(card.credit_bureaus || []).map((bureau) => (
                                  <span key={bureau} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    <Shield className="h-3 w-3 mr-1" />
                                    {bureau}
                                  </span>
                                ))}
                              </div>
                            </CardHeader>
                            <CardContent className="relative z-10 space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <Label htmlFor={`status-${card.id}`}>Approval Status</Label>
                                  <Select
                                    value={adminData[card.id]?.status || "not_approved"}
                                    onValueChange={(v) => updateAdmin(card.id, { status: v as any, ...(v !== "approved" ? { amountApproved: 0 } : {}) })}
                                    disabled={Boolean(lockedMap[card.id])}
                                  >
                                    <SelectTrigger id={`status-${card.id}`}>
                                      <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="approved">Approved</SelectItem>
                                      <SelectItem value="not_approved">Not Approved</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`amt-${card.id}`}>Amount Approved (USD)</Label>
                                  <Input
                                    id={`amt-${card.id}`}
                                    type="number"
                                    min="0"
                                    value={(adminData[card.id]?.amountApproved ?? 0).toString()}
                                    disabled={adminData[card.id]?.status !== "approved" || Boolean(lockedMap[card.id])}
                                    onChange={(e) => updateAdmin(card.id, { amountApproved: parseFloat(e.target.value || "0") })}
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`desc-${card.id}`}>Description / Notes</Label>
                                <Textarea
                                  id={`desc-${card.id}`}
                                  rows={4}
                                  placeholder="Add description or instructions for this card"
                                  value={adminData[card.id]?.description || ''}
                                  onChange={(e) => updateAdmin(card.id, { description: e.target.value })}
                                  disabled={Boolean(lockedMap[card.id])}
                                />
                              </div>
                              <Button onClick={() => window.open(card.card_link, '_blank')} className="w-full bg-green-600 hover:bg-green-700 text-white">
                                <DollarSign className="h-4 w-4 mr-2" /> Apply Now
                              </Button>
                              <div className="flex items-center justify-between pt-2">
                                <p className="text-xs text-muted-foreground flex items-center">
                                  <Clock className="h-3 w-3 mr-1" /> Updated {new Date(card.updated_at).toLocaleDateString()}
                                </p>
                                <div className="flex items-center gap-2">
                                  {lockedMap[card.id] ? (
                                    <>
                                      <Badge variant="secondary" className="mr-2">Approved & Locked</Badge>
                                      <Button variant="secondary" onClick={() => handleViewInvoice(card)}>
                                        <FileText className="h-4 w-4 mr-2" /> View Invoice
                                      </Button>
                                    </>
                                  ) : (
                                    invoiceMap[card.id]?.token ? (
                                      <Button variant="secondary" onClick={() => navigate(`/invoice/${invoiceMap[card.id].token}`)}>
                                        <FileText className="h-4 w-4 mr-2" /> View Invoice
                                      </Button>
                                    ) : (
                                      <Button variant="outline" onClick={() => generateInvoiceForCard(card)}>
                                        <FileText className="h-4 w-4 mr-2" /> Generate Invoice
                                      </Button>
                                    )
                                  )}
                                  {lockedMap[card.id] ? (
                                    <Button disabled className="bg-gray-300">
                                      <CheckCircle className="h-4 w-4 mr-2" /> Submitted
                                    </Button>
                                  ) : (
                                    <Button onClick={() => submitCard(card)} className="bg-green-600 hover:bg-green-700">
                                      <CheckCircle className="h-4 w-4 mr-2" /> Submit
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })()}
                      </div>
                    </div>
                  ))}
                  {((selectedFundingType === 'all' && selectedBureau === 'all') || filteredCards.length > 0) && (
                    <div className="p-4 rounded-lg border-2 border-dashed bg-white flex items-center justify-center">
                      <Button variant="outline" onClick={() => setSlotForms((prev) => [...prev, { slotMode: "manual" }])}>+</Button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Comparison Summary */}
              {selectedSlots.length > 0 && (
                <div className="mt-6">
                  <Label>Comparison</Label>
                  <div className="grid md:grid-cols-3 gap-4 mt-2">
                    {selectedSlots.map((sel, idx) => {
                      const card = cards.find(c => c.id === sel.cardId);
                      if (!card) return null;
                      const bank = banks.find(b => b.id === sel.bankId);
                      return (
                        <Card key={`${sel.cardId}-${idx}`}>
                          <CardHeader>
                            <CardTitle className="text-sm">{bank?.name || card.bank_name} — {card.card_name}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-wrap gap-2">
                              <Badge>{card.funding_type}</Badge>
                              {(card.credit_bureaus || []).map(b => (<Badge key={b} variant="outline">{b}</Badge>))}
                              {Array.isArray((card as any).states) && (card as any).states.length > 0 ? (
                                <Badge variant="secondary">{(card as any).states.join(', ')}</Badge>
                              ) : ((card as any).state ? <Badge variant="secondary">{(card as any).state}</Badge> : null)}
                            </div>
                            <div className="mt-3 flex gap-2">
                              <Button variant="outline" onClick={() => window.open(card.card_link, '_blank')}>Apply</Button>
                              <Button variant="destructive" onClick={() => setSelectedSlots((prev) => prev.filter(p => p.cardId !== sel.cardId))}>Remove</Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
