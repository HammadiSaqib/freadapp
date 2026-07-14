import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/DashboardLayout";
import AddClientDialog from "@/components/AddClientDialog";
import { useEffect, useRef, useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useScoreMachineEliteStatus } from "@/hooks/useScoreMachineEliteStatus";
import api, { clientsApi, creditReportScraperApi } from "@/lib/api";
import {
  Brain,
  Sparkles,
  TrendingUp,
  Target,
  Lightbulb,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Clock,
  Star,
  Award,
  Zap,
  MessageSquare,
  ArrowRight,
  BarChart3,
  Users,
  FileText,
  Shield,
  RefreshCw,
  Send,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  Play,
  ChevronRight,
  Info,
  Rocket,
  Eye,
} from "lucide-react";

// Mock AI recommendations data
const aiRecommendations = [
  {
    id: 1,
    clientName: "Sarah Johnson",
    clientId: 1,
    type: "Immediate Action",
    priority: "High",
    category: "Credit Utilization",
    title: "Reduce Credit Card Utilization",
    description:
      "Current utilization is 72% across all cards. Recommend paying down Chase card by $1,200 to achieve optimal 30% utilization.",
    impact: "15-25 point score increase",
    timeline: "30-45 days",
    confidence: 92,
    aiScore: 9.2,
    status: "New",
    createdAt: "2024-01-15",
  },
  {
    id: 2,
    clientName: "Michael Chen",
    clientId: 2,
    type: "Strategic Planning",
    priority: "Medium",
    category: "Account Mix",
    title: "Optimize Credit Mix Strategy",
    description:
      "Client has only credit cards. Adding an installment loan could improve credit mix and overall profile strength.",
    impact: "8-15 point score increase",
    timeline: "60-90 days",
    confidence: 78,
    aiScore: 7.8,
    status: "In Progress",
    createdAt: "2024-01-12",
  },
  {
    id: 3,
    clientName: "Emma Davis",
    clientId: 3,
    type: "Dispute Strategy",
    priority: "High",
    category: "Collections",
    title: "Contest Medical Collections",
    description:
      "3 medical collections totaling $1,470. High probability of removal using validation disputes based on HIPAA violations.",
    impact: "35-50 point score increase",
    timeline: "45-60 days",
    confidence: 89,
    aiScore: 8.9,
    status: "Approved",
    createdAt: "2024-01-10",
  },
  {
    id: 4,
    clientName: "Robert Wilson",
    clientId: 4,
    type: "Preventive Care",
    priority: "Low",
    category: "Account Maintenance",
    title: "Monitor Hard Inquiry Aging",
    description:
      "2 hard inquiries approaching 12-month mark. Schedule reminder to verify automatic score improvement.",
    impact: "5-8 point score increase",
    timeline: "2-3 months",
    confidence: 95,
    aiScore: 9.5,
    status: "Scheduled",
    createdAt: "2024-01-08",
  },
];

// Mock AI chat messages
const chatMessages = [
  {
    id: 1,
    type: "ai",
    message:
      "Hello! I'm Carmela Credit Coach. I've analyzed your client portfolio and found 12 new optimization opportunities. Would you like me to prioritize them by potential impact?",
    timestamp: "2024-01-15 10:30",
  },
  {
    id: 2,
    type: "user",
    message: "Yes, show me the highest impact recommendations first.",
    timestamp: "2024-01-15 10:31",
  },
  {
    id: 3,
    type: "ai",
    message:
      "Based on my analysis, Sarah Johnson has the highest score improvement potential. Her credit utilization is at 72%, and reducing it to 30% could increase her score by 15-25 points within 30-45 days. Should I generate a specific action plan?",
    timestamp: "2024-01-15 10:32",
  },
];

// Mock insights data
const insights = [
  {
    id: 1,
    title: "Optimal Dispute Timing",
    description:
      "Best time to file disputes is Tuesday-Thursday, 10-11 AM EST. 23% higher success rate observed.",
    category: "Strategy",
    impact: "High",
    confidence: 87,
  },
  {
    id: 2,
    title: "Seasonal Score Trends",
    description:
      "Credit scores tend to improve 12% faster during Q1 due to post-holiday debt paydown patterns.",
    category: "Timing",
    impact: "Medium",
    confidence: 91,
  },
  {
    id: 3,
    title: "Medical Collection Patterns",
    description:
      "Medical collections have 67% removal rate when disputed using specific HIPAA-based language templates.",
    category: "Disputes",
    impact: "High",
    confidence: 94,
  },
];

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "High":
      return "bg-red-100 text-red-800 border-red-200";
    case "Medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Low":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "New":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "In Progress":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Approved":
      return "bg-green-100 text-green-800 border-green-200";
    case "Scheduled":
      return "bg-purple-100 text-purple-800 border-purple-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

type CoachChatMessage = {
  id: string;
  type: "assistant" | "user";
  message: string;
  timestamp: string;
};

type CoachSelectedClientReport = {
  clientId: number;
  clientName: string;
  reportData: any;
};

type CoachPromptQuota = {
  used: number;
  limit: number | null;
  remaining: number | null;
  unlimited: boolean;
  resetAt: string | null;
  resetInDays: number | null;
  unlinked?: boolean;
};

const AI_COACH_SUPPORT_PHONE = "(704) 966-9919";
const AI_COACH_ELITE_ONLY_MESSAGE = "This feature For Elite User Only Upgrade To Eilte Or If You Already Have Unlimete Unlimte Pakege So Contact To Support For Elite Activtion";

const createWelcomeCoachMessage = (): CoachChatMessage => ({
  id: "welcome-1",
  type: "assistant",
  message:
    "Thanks for reaching out — I’m here to help with credit repair and funding. Tell me a bit about your situation and I’ll walk you through practical next steps.",
  timestamp: new Date().toISOString(),
});

const normalizeCoachHistoryMessages = (entries: any[]): CoachChatMessage[] => {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry, index) => {
      const timestamp = new Date(entry?.timestamp || entry?.time || Date.now());
      const type: CoachChatMessage["type"] = String(entry?.type || entry?.chat_type || "assistant").toLowerCase() === "user"
        ? "user"
        : "assistant";

      return {
        id: String(entry?.id ?? `chat-${index}`),
        type,
        message: String(entry?.message || entry?.chat || ""),
        timestamp: Number.isNaN(timestamp.getTime()) ? new Date().toISOString() : timestamp.toISOString(),
      };
    })
    .filter((entry) => entry.message.trim().length > 0);
};

const formatPromptQuotaResetDate = (resetAt: string | null) => {
  if (!resetAt) {
    return null;
  }

  const parsed = new Date(resetAt);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatPromptQuotaDaysRemaining = (resetInDays: number | null) => {
  if (resetInDays === null) {
    return null;
  }

  if (resetInDays <= 0) {
    return 'today';
  }

  if (resetInDays === 1) {
    return '1 day';
  }

  return `${resetInDays} days`;
};

export default function AICoach() {
  const { userProfile } = useAuthContext();
  const { hasScoreMachineEliteAccess, isEliteStatusLoading, isEliteActive } = useScoreMachineEliteStatus();
  const [selectedRecommendation, setSelectedRecommendation] = useState<any>(null);
  const [chatInput, setChatInput] = useState("");
  const [activeTab, setActiveTab] = useState("recommendations");
  const isSuperAdminUser = userProfile?.role === "super_admin";
  const canResolveEliteCoach = ["admin", "employee", "user", "funding_manager"].includes(String(userProfile?.role || ""));
  const showEliteCoach = isSuperAdminUser || isEliteActive;
  const isCoachAccessLoading = !isSuperAdminUser && canResolveEliteCoach && isEliteStatusLoading;

  const [messages, setMessages] = useState<CoachChatMessage[]>([createWelcomeCoachMessage()]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptQuota, setPromptQuota] = useState<CoachPromptQuota | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Admin: client selection and report analysis state
  const [clients, setClients] = useState<Array<{ id: number; first_name?: string; last_name?: string; email?: string }>>([]);
  const [selectedChatClientId, setSelectedChatClientId] = useState<number | null>(null);
  const [chatClientSelectorOpen, setChatClientSelectorOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clientReport, setClientReport] = useState<any | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisStructured, setAnalysisStructured] = useState<any | null>(null);
  const [analysisSections, setAnalysisSections] = useState<any | null>(null);
  const [showAddClient, setShowAddClient] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!showEliteCoach) {
      setMessages([createWelcomeCoachMessage()]);
      setHistoryLoading(false);
      setPromptQuota(null);
      return;
    }

    let isActive = true;

    (async () => {
      setHistoryLoading(true);
      setError(null);

      try {
        const resp = await api.get('/api/ai/finmint-chat/history');
        if (!isActive) {
          return;
        }

        const history = normalizeCoachHistoryMessages(resp?.data?.messages);
        setMessages(history.length > 0 ? history : [createWelcomeCoachMessage()]);
      } catch (historyError) {
        console.warn('Failed to load AI coach history', historyError);
        if (isActive) {
          setMessages([createWelcomeCoachMessage()]);
        }
      } finally {
        if (isActive) {
          setHistoryLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [showEliteCoach]);

  useEffect(() => {
    if (!showEliteCoach) {
      setPromptQuota(null);
      return;
    }

    let isActive = true;

    (async () => {
      try {
        const resp = await api.get('/api/ai/finmint-chat/quota');
        if (!isActive) {
          return;
        }

        setPromptQuota(resp?.data?.quota ?? null);
      } catch (quotaError) {
        console.warn('Failed to load AI coach quota', quotaError);
        if (isActive) {
          setPromptQuota(null);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [showEliteCoach]);

  // Load clients for admin selector
  useEffect(() => {
    (async () => {
      try {
        const resp = await clientsApi.getClients();
        const data = (resp?.data?.clients || resp?.data?.data || resp?.data || []) as Array<any>;
        const normalized = data.map((c: any) => ({ id: c.id, first_name: c.first_name, last_name: c.last_name, email: c.email }));
        setClients(normalized);
      } catch (e) {
        console.warn('Failed to load clients', e);
      }
    })();
  }, []);

  useEffect(() => {
    setSelectedChatClientId((current) => (
      current !== null && clients.some((client) => client.id === current)
        ? current
        : null
    ));
  }, [clients]);

  const getClientDisplayName = (client: { id: number; first_name?: string; last_name?: string; email?: string }) => {
    const fullName = `${client.first_name || ""} ${client.last_name || ""}`.trim();
    return fullName || client.email || `Client ${client.id}`;
  };

  const selectedChatClient = selectedChatClientId !== null
    ? clients.find((client) => client.id === selectedChatClientId) ?? null
    : null;

  const loadSelectedChatClientReport = async (): Promise<CoachSelectedClientReport | null> => {
    if (selectedChatClientId === null) {
      return null;
    }

    const client = clients.find((entry) => entry.id === selectedChatClientId);
    const clientName = getClientDisplayName(client || { id: selectedChatClientId });

    try {
      const resp = await creditReportScraperApi.getClientReport(String(selectedChatClientId));
      const payload = resp?.data?.data ?? resp?.data ?? {};
      const reportData = payload.reportData || payload.report_data || payload;

      return {
        clientId: selectedChatClientId,
        clientName,
        reportData,
      };
    } catch (reportError: any) {
      throw new Error(reportError?.response?.data?.message || `Failed to fetch the latest report for ${clientName}`);
    }
  };

  const handleSelectClient = async (id: number) => {
    setSelectedClientId(id);
    setClientReport(null);
    setAnalysisResult(null);
    setAnalysisError(null);
    try {
      const resp = await creditReportScraperApi.getClientReport(String(id));
      const payload = resp?.data?.data ?? resp?.data ?? {};
      // Support different shapes: { reportData } or full JSON
      const report = payload.reportData || payload.report_data || payload;
      setClientReport(report);
    } catch (e: any) {
      console.error('Failed to fetch client report', e?.response?.data || e?.message || e);
      setAnalysisError(e?.response?.data?.message || 'Failed to fetch latest report for this client');
    }
  };

  const handleAnalyzeReport = async () => {
    if (!selectedClientId || !clientReport) {
      setAnalysisError('Select a client and ensure a report is loaded.');
      return;
    }
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const resp = await api.post('/api/ai/finmint-analyze-report', {
        goal: 'both',
        clientId: selectedClientId,
        report: clientReport,
      });
      const analysis: string = resp?.data?.analysis || 'Analysis completed.';
      const structured: any | null = resp?.data?.structured ?? null;
      setAnalysisResult(analysis);
      setAnalysisStructured(structured);
      try {
        const parsed = parseAnalysis(analysis);
        setAnalysisSections(parsed);
      } catch (_) {
        setAnalysisSections(null);
      }
    } catch (e: any) {
      console.error('Report analysis error', e?.response?.data || e?.message || e);
      setAnalysisError(e?.response?.data?.error || 'Failed to analyze the report');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const extractSection = (text: string, heading: string) => {
    const pattern = new RegExp(`(^|\n)\s*${heading}\s*:?\s*\n`, 'i');
    const match = pattern.exec(text);
    if (!match) return null;
    const startIndex = (match.index || 0) + (match[0]?.length || 0);
    // Find next numbered section start
    const nextPattern = /(\n\s*\d+\.\s+[A-Z][^\n]*\n)/g;
    nextPattern.lastIndex = startIndex;
    const nextMatch = nextPattern.exec(text);
    const endIndex = nextMatch ? nextMatch.index : text.length;
    return text.slice(startIndex, endIndex).trim();
  };

  const parseBullets = (s: string | null) => {
    if (!s) return [];
    return s
      .split('\n')
      .map(l => l.replace(/^[-•\d+\.\)\s]+/, '').trim())
      .filter(Boolean);
  };

  const parseNegatives = (s: string | null) => {
    if (!s) return [];
    const blocks = s.split(/\n\n+/).map(b => b.trim()).filter(Boolean);
    return blocks.map(b => {
      const lines = b.split('\n').map(x => x.trim()).filter(Boolean);
      return {
        item: lines[0] || 'Negative Item',
        details: lines.slice(1).join('\n') || '',
      };
    });
  };

  const parsePlanSteps = (s: string | null) => {
    if (!s) return [];
    return s
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => l.replace(/^\d+\.\s*/, ''));
  };

  const parseAnalysis = (text: string) => {
    const summary = extractSection(text, '1.\s*Credit Summary Overview');
    const negatives = extractSection(text, '2.\s*Negative Item Breakdown');
    const positives = extractSection(text, '3.\s*Positive Accounts');
    const utilization = extractSection(text, '4.\s*Utilization Analysis');
    const inquiries = extractSection(text, '5.\s*Inquiry Risk Assessment');
    const plan = extractSection(text, '6.\s*Score Improvement Plan');

    return {
      summary,
      negatives: parseNegatives(negatives),
      positives: parseBullets(positives),
      utilization,
      inquiries,
      planSteps: parsePlanSteps(plan),
    };
  };

  const scoreCategory = (score?: number) => {
    if (!score && score !== 0) return { label: '—', color: 'text-muted-foreground', desc: 'Not available in report.' };
    if (score < 580) return { label: 'Poor', color: 'text-red-600', desc: 'High risk; focus on removing negatives and paying down debt.' };
    if (score < 670) return { label: 'Fair', color: 'text-orange-600', desc: 'Moderate risk; address collections and reduce utilization.' };
    if (score < 740) return { label: 'Good', color: 'text-yellow-600', desc: 'Solid profile; optimize utilization and add positive history.' };
    if (score < 800) return { label: 'Very Good', color: 'text-green-600', desc: 'Low risk; maintain balances and age of credit.' };
    return { label: 'Excellent', color: 'text-emerald-600', desc: 'Prime profile; keep utilization low and inquiries minimal.' };
  };

  const promptLimitReached = !!promptQuota && !promptQuota.unlimited && (promptQuota.remaining ?? 0) <= 0;
  const promptQuotaResetDate = formatPromptQuotaResetDate(promptQuota?.resetAt ?? null);
  const promptQuotaDaysRemaining = formatPromptQuotaDaysRemaining(promptQuota?.resetInDays ?? null);

  const handleSendMessage = async () => {
    const input = chatInput.trim();
    const hasSelectedClient = selectedChatClientId !== null;

    if (!showEliteCoach || (!input && !hasSelectedClient) || loading || historyLoading || promptLimitReached) return;

    const selectedClientSummary = selectedChatClient ? getClientDisplayName(selectedChatClient) : "";
    const optimisticUserMessage = input && selectedClientSummary
      ? `${input}\n\nSelected client: ${selectedClientSummary}`
      : input || `Selected client: ${selectedClientSummary}`;

    const newUserMsg = {
      id: `user-${Date.now()}`,
      type: 'user' as const,
      message: optimisticUserMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newUserMsg]);
    setChatInput("");
    setError(null);
    setLoading(true);

    try {
      const selectedClientReport = hasSelectedClient ? await loadSelectedChatClientReport() : null;

      const resp = await api.post('/api/ai/finmint-chat', {
        question: input || undefined,
        selectedClientReports: selectedClientReport ? [selectedClientReport] : [],
      });

      if (resp?.data?.quota) {
        setPromptQuota(resp.data.quota);
      }

      const reply: string = resp.data?.reply || 'I’m here to help. Could you share a bit more detail?';
      const aiMsg = {
        id: `ai-${Date.now()}`,
        type: 'assistant' as const,
        message: reply,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('AI chat error:', err?.response?.data || err?.message || err);
      setMessages((prev) => prev.filter((message) => message.id !== newUserMsg.id));
      const nextQuota = err?.response?.data?.quota ?? null;
      if (nextQuota) {
        setPromptQuota(nextQuota);
      }

      const nextResetDate = formatPromptQuotaResetDate(nextQuota?.resetAt ?? null);
      const nextResetDays = formatPromptQuotaDaysRemaining(nextQuota?.resetInDays ?? null);
      const resetMessage = nextQuota && nextResetDate
        ? ` Limit restarts on ${nextResetDate}${nextResetDays ? ` (${nextResetDays} remaining).` : '.'}`
        : '';

      setError(
        `${err?.response?.data?.error || 'Something went wrong sending your message. Please try again.'}${resetMessage}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="Carmela Credit Coach"
      description="Credit Repair & Business Funding guidance"
      onAddClient={() => setShowAddClient(true)}
    >
      {/* Professional AI Coach: Chat + Client Analysis */}
            <section className="flex min-h-[calc(100vh-12rem)] flex-col">
              <div className="mb-4 space-y-1">
                <div className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
                  <MessageSquare className="h-6 w-6 text-emerald-600" />
                  <span>Carmela Credit Coach</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ask about credit repair, disputes, utilization, inquiries, or funding
                </p>
              </div>
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2 pb-40">
                    {historyLoading && (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                        Loading previous chats...
                      </div>
                    )}
                    {messages.map(m => (
                      <div key={m.id} className={`flex ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {m.type === 'user' ? (
                          <div className="max-w-[82%] rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                            {/* <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ocean-blue">You</div> */}
                            <div className="whitespace-pre-wrap leading-6 text-slate-900">{m.message}</div>
                            {/* <div className="mt-2 text-xs text-muted-foreground">{new Date(m.timestamp).toLocaleTimeString()}</div> */}
                          </div>
                        ) : (
                          <div className="max-w-[82%] px-1 py-2 text-left">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600">Carmela</div>
                            <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{m.message}</div>
                            {/* <div className="mt-2 text-xs text-muted-foreground">{new Date(m.timestamp).toLocaleTimeString()}</div> */}
                          </div>
                        )}
                      </div>
                    ))}
                    {loading && (
                      <div className="flex justify-start">
                        <div className="max-w-[82%] px-1 py-2 text-left text-sm text-slate-500 animate-pulse">Carmela Credit Coach is typing...</div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {error && (
                    <div className="mt-2 text-xs text-red-600">{error}</div>
                  )}

                  <div className="sticky bottom-0 z-20 mt-3 space-y-3 border-t border-slate-200 bg-white/95 p-3 pt-3 backdrop-blur supports-[backdrop-filter]:bg-white/85">
                    {promptQuota && (
                      <div className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${promptQuota.unlimited ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : promptLimitReached ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em]">
                            Open AI Prompt Limit
                          </div>
                          <Badge variant="outline" className={promptQuota.unlimited ? 'border-emerald-200 bg-white text-emerald-700' : promptLimitReached ? 'border-red-200 bg-white text-red-700' : 'border-slate-200 bg-white text-slate-700'}>
                            {promptQuota.unlimited
                              ? 'Unlimited'
                              : `10 / ${promptQuota.remaining ?? 0} Remaining`}
                          </Badge>
                        </div>
                        <div className="mt-2 text-xs leading-5">
                          {promptQuota.unlimited ? (
                            <span>You have unlimited Open AI prompts.</span>
                          ) : (
                            <span>
                              You have {promptQuota.remaining ?? 0} prompts left out of {promptQuota.limit ?? 10} for this billing period.
                              {promptQuotaResetDate ? ` Resets on ${promptQuotaResetDate}` : ''}
                              {promptQuotaDaysRemaining ? ` (${promptQuotaDaysRemaining} remaining).` : '.'}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Select Your Client</div>
                      <Popover open={chatClientSelectorOpen} onOpenChange={setChatClientSelectorOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            disabled={clients.length === 0}
                            className="flex w-full items-center justify-between rounded-full border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 shadow-sm transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <span className="truncate">
                              {selectedChatClient ? getClientDisplayName(selectedChatClient) : "Select Your Client"}
                            </span>
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[360px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search clients..." />
                            <CommandList>
                              <CommandEmpty>No client found.</CommandEmpty>
                              <CommandGroup>
                                {clients.map((client) => {
                                  const clientLabel = getClientDisplayName(client);
                                  const isSelected = selectedChatClientId === client.id;

                                  return (
                                    <CommandItem
                                      key={client.id}
                                      value={`${clientLabel} ${client.email || ""}`}
                                      onSelect={() => {
                                        setSelectedChatClientId(client.id);
                                        setChatClientSelectorOpen(false);
                                      }}
                                      className={isSelected ? "bg-emerald-50 text-emerald-700" : ""}
                                    >
                                      <span className="truncate">{clientLabel}</span>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        placeholder="Ask anything"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        disabled={historyLoading || promptLimitReached}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        className="flex-1 rounded-full border-slate-200 px-5"
                      />
                      <Button onClick={handleSendMessage} disabled={loading || historyLoading || promptLimitReached || (!chatInput.trim() && selectedChatClientId === null)} className="w-full rounded-full bg-emerald-600 px-5 hover:bg-emerald-700 sm:w-auto">
                        <Send className="h-4 w-4 mr-1" />
                        Send
                      </Button>
                    </div>
                  </div>
                </div>
            </section>

            {/* Hide
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-ocean-blue" />
                  Client Selection & Report
                </CardTitle>
                <CardDescription>
                  Select a client, fetch latest report, and run AI analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Select Client</label>
                    <Select onValueChange={(val) => handleSelectClient(parseInt(val, 10))}>
                      <SelectTrigger className="mt-1 w-full sm:w-64">
                        <SelectValue placeholder="Choose a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map(c => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {`${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || `Client ${c.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Card className="bg-gradient-to-br from-white to-blue-50/40 border-0">
                      <CardHeader className="py-2">
                        <CardTitle className="text-xs font-medium flex items-center gap-2"><BarChart3 className="h-3 w-3"/> Scores</CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs">
                        <div className="space-y-1">
                          <div>Experian: <span className="font-semibold">{clientReport?.Score?.find?.((s: any) => /experian/i.test(s?.Bureau || s?.bureau))?.Score || '—'}</span></div>
                          <div>Equifax: <span className="font-semibold">{clientReport?.Score?.find?.((s: any) => /equifax/i.test(s?.Bureau || s?.bureau))?.Score || '—'}</span></div>
                          <div>TransUnion: <span className="font-semibold">{clientReport?.Score?.find?.((s: any) => /transunion/i.test(s?.Bureau || s?.bureau))?.Score || '—'}</span></div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-white to-rose-50/40 border-0">
                      <CardHeader className="py-2">
                        <CardTitle className="text-xs font-medium flex items-center gap-2"><AlertTriangle className="h-3 w-3"/> Negatives</CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs">
                        <div className="space-y-1">
                          <div>Collections: <span className="font-semibold">{clientReport?.Collections?.length ?? clientReport?.negative_accounts ?? '—'}</span></div>
                          <div>Inquiries: <span className="font-semibold">{clientReport?.Inquiries?.length ?? clientReport?.inquiries_count ?? '—'}</span></div>
                          <div>Public Records: <span className="font-semibold">{clientReport?.PublicRecords?.length ?? clientReport?.public_records ?? '—'}</span></div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button onClick={handleAnalyzeReport} disabled={!selectedClientId || !clientReport || analysisLoading}>
                      <Brain className="h-4 w-4 mr-1" /> Analyze Report
                    </Button>
                    {analysisLoading && <span className="text-xs text-muted-foreground">Analyzing…</span>}
                  </div>

                  {analysisError && (
                    <div className="text-xs text-red-600">{analysisError}</div>
                  )}

                  {analysisResult && (
                    <div className="mt-3 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {['Experian','Equifax','TransUnion'].map((bureau) => {
                          const structuredScore = (analysisStructured?.scores?.[bureau.toLowerCase()] ?? null) as number | null;
                          const scoreObj = clientReport?.Score?.find?.((s: any) => new RegExp(bureau, 'i').test(s?.Bureau || s?.bureau));
                          const scoreVal = structuredScore != null && !isNaN(Number(structuredScore))
                            ? Number(structuredScore)
                            : Number(scoreObj?.Score ?? scoreObj?.score);
                          const cat = scoreCategory(isNaN(scoreVal) ? undefined : scoreVal);
                          return (
                            <Card key={bureau} className="border-0 shadow-md bg-gradient-to-br from-white to-slate-50">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">{bureau} Score</CardTitle>
                              </CardHeader>
                              <CardContent className="flex items-center justify-between">
                                <div>
                                  <div className={`text-2xl font-bold ${cat.color}`}>{isNaN(scoreVal) ? '—' : scoreVal}</div>
                                  <div className="text-xs text-muted-foreground">{cat.label}</div>
                                </div>
                                <div className="text-xs text-muted-foreground max-w-[60%]">{cat.desc}</div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>

                      {analysisSections ? (
                        <div className="space-y-6">
                          <Card className="border-0 shadow-md">
                            <CardHeader>
                              <CardTitle className="text-base">1. Credit Summary Overview</CardTitle>
                              <CardDescription>High-level evaluation of scores, negatives, and overall risk</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                                {analysisSections.summary || 'Not available in report.'}
                              </div>
                            </CardContent>
                          </Card>

                          <Card className="border-0 shadow-md">
                            <CardHeader>
                              <CardTitle className="text-base">2. Negative Item Breakdown</CardTitle>
                              <CardDescription>Items impacting the score and dispute guidance</CardDescription>
                            </CardHeader>
                            <CardContent>
                              {(analysisStructured?.negatives?.length ?? 0) > 0 ? (
                                <div className="rounded-lg border border-border/40 overflow-x-auto">
                                  <div className="min-w-[800px] sm:min-w-0">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Creditor</TableHead>
                                          <TableHead>Type</TableHead>
                                          <TableHead>Status</TableHead>
                                          <TableHead>First Delinquency</TableHead>
                                          <TableHead>Balance</TableHead>
                                          <TableHead>Guidance</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {analysisStructured.negatives.map((n: any, idx: number) => (
                                          <TableRow key={idx} className="align-top">
                                            <TableCell className="font-medium whitespace-pre-wrap">{n.creditor || '—'}</TableCell>
                                            <TableCell className="whitespace-pre-wrap text-sm">{n.account_type || '—'}</TableCell>
                                            <TableCell className="whitespace-pre-wrap text-sm">{n.status || '—'}</TableCell>
                                            <TableCell className="whitespace-pre-wrap text-sm">{n.first_delinquency || '—'}</TableCell>
                                            <TableCell className="whitespace-pre-wrap text-sm">{n.balance ?? '—'}</TableCell>
                                            <TableCell className="whitespace-pre-wrap text-sm text-muted-foreground">{n.strategy || n.explanation || '—'}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              ) : analysisSections.negatives?.length ? (
                                <div className="rounded-lg border border-border/40 overflow-x-auto">
                                  <div className="min-w-[500px] sm:min-w-0">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Item</TableHead>
                                          <TableHead>Details</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {analysisSections.negatives.map((n: any, idx: number) => (
                                          <TableRow key={idx} className="align-top">
                                            <TableCell className="font-medium whitespace-pre-wrap">{n.item}</TableCell>
                                            <TableCell className="whitespace-pre-wrap text-sm text-muted-foreground">{n.details || '—'}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">No negative items listed.</div>
                              )}
                            </CardContent>
                          </Card>

                          <Card className="border-0 shadow-md">
                            <CardHeader>
                              <CardTitle className="text-base">3. Positive Accounts & Strength Factors</CardTitle>
                              <CardDescription>Established tradelines, on-time history, and age of credit</CardDescription>
                            </CardHeader>
                            <CardContent>
                              {analysisSections.positives?.length ? (
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                  {analysisSections.positives.map((p: string, idx: number) => (
                                    <li key={idx}>{p}</li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="text-sm text-muted-foreground">Not available in report.</div>
                              )}
                            </CardContent>
                          </Card>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="border-0 shadow-md">
                              <CardHeader>
                                <CardTitle className="text-base">4. Utilization Analysis</CardTitle>
                                <CardDescription>Revolving balances vs. limits and target percentages</CardDescription>
                              </CardHeader>
                              <CardContent>
                                {analysisStructured?.metrics?.revolving_utilization_pct != null ? (
                                  <div className="flex items-center gap-3">
                                    <div className="text-2xl font-bold text-purple-600">
                                      {Math.round(Number(analysisStructured.metrics.revolving_utilization_pct))}%
                                    </div>
                                    <div className="text-xs text-muted-foreground">Current revolving utilization</div>
                                  </div>
                                ) : null}
                                <div className="prose prose-sm max-w-none whitespace-pre-wrap mt-2">
                                  {analysisSections.utilization || 'Not available in report.'}
                                </div>
                              </CardContent>
                            </Card>
                            <Card className="border-0 shadow-md">
                              <CardHeader>
                                <CardTitle className="text-base">5. Inquiry Risk Assessment</CardTitle>
                                <CardDescription>Recent hard pulls, timing, and mitigation</CardDescription>
                              </CardHeader>
                              <CardContent>
                                {analysisStructured?.inquiries?.count != null ? (
                                  <div className="flex items-center gap-3">
                                    <div className="text-2xl font-bold text-amber-600">
                                      {analysisStructured.inquiries.count}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Total inquiries</div>
                                  </div>
                                ) : null}
                                <div className="prose prose-sm max-w-none whitespace-pre-wrap mt-2">
                                  {analysisSections.inquiries || 'Not available in report.'}
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          <Card className="border-0 shadow-md">
                            <CardHeader>
                              <CardTitle className="text-base">6. Score Improvement Plan (Step-by-Step)</CardTitle>
                              <CardDescription>Actionable timeline for disputes, utilization, and tradelines</CardDescription>
                            </CardHeader>
                            <CardContent>
                              {(analysisStructured?.plan_steps?.length ?? 0) > 0 ? (
                                <ol className="space-y-3">
                                  {analysisStructured.plan_steps.map((step: string, idx: number) => (
                                    <li key={idx} className="flex items-start gap-3">
                                      <div className="h-6 w-6 rounded-full bg-ocean-blue text-white flex items-center justify-center text-xs mt-0.5">
                                        {idx + 1}
                                      </div>
                                      <div className="text-sm">{step}</div>
                                    </li>
                                  ))}
                                </ol>
                              ) : analysisSections.planSteps?.length ? (
                                <ol className="space-y-3">
                                  {analysisSections.planSteps.map((step: string, idx: number) => (
                                    <li key={idx} className="flex items-start gap-3">
                                      <div className="h-6 w-6 rounded-full bg-ocean-blue text-white flex items-center justify-center text-xs mt-0.5">
                                        {idx + 1}
                                      </div>
                                      <div className="text-sm">{step}</div>
                                    </li>
                                  ))}
                                </ol>
                              ) : (
                                <div className="text-sm text-muted-foreground">Not available in report.</div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      ) : (
                        <div className="p-3 rounded-md bg-muted text-sm whitespace-pre-wrap">
                          {analysisResult}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
             */}
      <AddClientDialog
        isOpen={showAddClient}
        onClose={() => setShowAddClient(false)}
      />
    </DashboardLayout>
  );
}
