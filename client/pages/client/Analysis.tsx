import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { clientsApi, warMachineApi } from "@/lib/api";
import { toast } from "sonner";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import ClientLayout from "@/components/ClientLayout";
import BureauScoresChart from "@/components/BureauScoresChart";
import ScoreChartsCard from "@/components/ScoreChartsCard";
import NegativeAccountsCard from "@/components/NegativeAccountsCard";
import { TrialCreditReportWrapper, TrialScoreWrapper, TrialSensitiveWrapper } from "@/components/TrialCreditReportWrapper";
import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { shouldShowField, tabConfig } from "@/utils/fieldCategorization";
import { calculateAccountUtilization } from "../../utils/utilizationCalculator.js";
import {
  Gauge,
  FileText,
  Search,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  DollarSign,
  CreditCard,
  Building,
  Users,
  Filter,
  Eye,
  BarChart3,
  Target,
  Award,
  Percent,
  Zap,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Info,
  Shield,
  Clock,
  PieChart,
  Wallet,
  Star,
  ThumbsUp,
  ThumbsDown,
  Calculator,
  TrendingDown as TrendDown,
  Activity,
  X,
  CheckCircle2,
  AlertCircle,
  DollarSign as Dollar,
  PiggyBank,
  CreditCard as CardIcon,
  Building2,
  Timer,
  FileCheck,
  BarChart,
  LineChart,
  ArrowLeft,
  MapPin,
  User,
  Calendar as CalendarIcon,
  Calendar,
  Home,
  Phone,
  Globe,
  ArrowRight,
  Mail,
  Hash,
  Briefcase,
  ChevronRight,
  UserCheck,
  FileSearch,
  TrendingUp as TrendUp,
  Banknote,
  ScrollText,
  Lock,
  BadgeCheck,
  Settings,
  Gavel,
} from "lucide-react";
import FundingProjectionsCalculator from '../../utils/fundingProjections.js';
import GapAnalyzer from '../../utils/gapAnalyzer.js';
import PersonalCardsDisplay from '../../components/PersonalCardsDisplay';
import BusinessCardsDisplay from '../../components/BusinessCardsDisplay';
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useAuthContext } from "@/contexts/AuthContext";

interface DebtConsolidationViewProps {
  accounts: any[];
  payoffPlans?: any[];
  onSavePlan?: (plan: any) => Promise<void>;
  clientId?: string | number;
}

const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1:  return "st";
      case 2:  return "nd";
      case 3:  return "rd";
      default: return "th";
    }
};



const getNextReminderDate = (day: number) => {
    const today = new Date();
    let nextDate = new Date(today.getFullYear(), today.getMonth(), day);
    
    // If the date for this month has passed, move to next month
    if (nextDate < today) {
        nextDate = new Date(today.getFullYear(), today.getMonth() + 1, day);
    }
    return nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const DebtConsolidationView = ({ accounts, payoffPlans = [], onSavePlan, clientId }: DebtConsolidationViewProps) => {
  const [targetUtilization, setTargetUtilization] = useState(0);
  const [payoffMonths, setPayoffMonths] = useState(12);
  const [remindersSet, setRemindersSet] = useState(false);
  
  // Gamification
  const [points, setPoints] = useState(1250);
  
  // Edit State
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    targetUtilization: 0,
    payoffTimelineMonths: 12,
    paymentDate: 1,
    reminderEnabled: false,
    trackEnabled: false
  });

  const handleEditClick = (account: any) => {
    const existingPlan = payoffPlans.find(p => p.account_id === String(account.id));
    setEditingAccount(account);
    setEditForm({
      targetUtilization: existingPlan?.target_utilization ?? 0,
      payoffTimelineMonths: existingPlan?.payoff_timeline_months ?? 12,
      paymentDate: existingPlan?.payment_date ?? 1,
      reminderEnabled: !!existingPlan?.reminder_enabled,
      trackEnabled: !!existingPlan?.track_enabled
    });
  };

  const handleCancelEdit = () => {
    setEditingAccount(null);
  };

  const handleSaveEdit = async () => {
    if (!onSavePlan || !clientId || !editingAccount) return;
    
    try {
      await onSavePlan({
        client_id: Number(clientId),
        account_id: String(editingAccount.id),
        account_name: editingAccount.name,
        target_utilization: Number(editForm.targetUtilization),
        payoff_timeline_months: Number(editForm.payoffTimelineMonths),
        payment_date: Number(editForm.paymentDate),
        reminder_enabled: Boolean(editForm.reminderEnabled),
        track_enabled: Boolean(editForm.trackEnabled)
      });
      setEditingAccount(null);
      toast.success("Payoff plan updated successfully");
    } catch (error) {
      toast.error("Failed to update payoff plan");
    }
  };
  
  const calculateAge = (dateString: string) => {
    if (!dateString) return "N/A";
    const openDate = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - openDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    return `${years}y ${months}m`;
  };

  const revolvingAccounts = useMemo(() => {
    if (!accounts) return [];
    const isRevolving = (acc: any) => {
      const t = String(acc.type || '').toLowerCase();
      const at = String(acc.AccountType || acc.AccountTypeDescription || '').toLowerCase();
      return t.includes('credit') || t.includes('revolving') || at.includes('revolving') || acc.type === 'Credit Card';
    };
    const norm = (s: any) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const clean = (s: any) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const canonical = (s: any) => {
      const t = clean(s);
      if (/navyfederal|navyfcu/.test(t)) return 'navy federal credit union';
      if (/creditone|crdtonebnk/.test(t)) return 'credit one bank';
      if (/jpmcb|chase/.test(t)) return 'chase';
      if (/americanexpress|amex/.test(t)) return 'american express';
      if (/discover/.test(t)) return 'discover';
      return norm(s);
    };
    const last4 = (s: any) => String(s || '').replace(/\D/g, '').slice(-4);
    const raw = accounts.filter(isRevolving);
    const groups = new Map<string, any>();
    raw.forEach((acc: any, index: number) => {
      const nameRaw = acc.creditor || acc.CreditorName || acc.name;
      const nameKey = canonical(nameRaw);
      const num4 = last4(acc.accountNumber || acc.AccountNumber);
      const fallback = String(acc.DateOpened || acc.opened || '').slice(0, 7);
      const effLimit = Number(acc.limit ?? acc.CreditLimit ?? acc.HighBalance ?? 0);
      const bucket = effLimit > 0 ? Math.round(effLimit / 100) * 100 : 0;
      const key = `${nameKey}|${num4 || bucket || fallback}`;
      const balance = Number(acc.balance ?? acc.Balance ?? acc.CurrentBalance ?? 0);
      const limit = Number(acc.limit ?? acc.CreditLimit ?? acc.HighBalance ?? 0);
      const opened = acc.DateOpened || acc.opened || '';
      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, {
          id: acc.id ?? index,
          name: nameRaw || 'Unknown Creditor',
          balance,
          limit,
          opened
        });
      } else {
        if (balance > (existing.balance ?? 0)) existing.balance = balance;
        if (limit > (existing.limit ?? 0)) existing.limit = limit;
        const openedDate = new Date(opened);
        const existingDate = new Date(existing.opened || opened);
        if (opened && !isNaN(openedDate.getTime()) && (isNaN(existingDate.getTime()) || openedDate < existingDate)) {
          existing.opened = opened;
        }
      }
    });
    const unique = Array.from(groups.values());
    return unique
      .map((acc: any, index: number) => {
        const plan = payoffPlans.find(p => p.account_id === String(acc.id ?? index));
        const balance = Number(acc.balance || 0);
        const limit = Number(acc.limit || 0);
        const baseMin = Math.max(25, balance * 0.02);
        const minPayment = balance <= 50 ? balance : Math.min(balance, baseMin);
        return {
          id: acc.id ?? index,
          name: acc.name,
          balance,
          limit,
          utilization: limit > 0 ? (balance / limit) * 100 : 0,
          age: calculateAge(acc.opened),
          apr: 0.24,
          minPayment,
          plan
        };
      })
      .filter(a => a.balance > 0 && a.limit > 0)
      .sort((a, b) => a.balance - b.balance);
  }, [accounts, payoffPlans]);

  const totalDebt = revolvingAccounts.reduce((sum, acc) => sum + acc.balance, 0);

  const eligibleAccounts = useMemo(() => {
    return revolvingAccounts.filter(a => a.limit > 0 && a.balance > 0);
  }, [revolvingAccounts]);

  const monthlyBudget = useMemo(() => {
    return eligibleAccounts.reduce((sum, acc) => sum + acc.minPayment, 0) + 1;
  }, [eligibleAccounts]);

  const snowballPlan = useMemo(() => {
    const sorted = eligibleAccounts.slice().sort((a, b) => a.balance - b.balance);
    let extra = 1;
    const out = [] as any[];
    for (const acc of sorted) {
      const monthlyPay = acc.minPayment + extra;
      const months = monthlyPay > 0 ? Math.ceil(acc.balance / monthlyPay) : 0;
      out.push({ id: acc.id, name: acc.name, minPayment: acc.minPayment, extraPayment: extra, payoffMonths: months });
      extra += acc.minPayment;
    }
    return out;
  }, [eligibleAccounts]);

  const oneMonth = useMemo(() => {
    const updatedBalances: Record<string, number> = {};
    const payments = eligibleAccounts.map(acc => ({ id: acc.id, minPayment: Math.min(acc.balance, acc.minPayment), extraPayment: 0, totalPayment: 0, balance: acc.balance }));
    for (const p of payments) {
      p.totalPayment = p.minPayment;
      updatedBalances[String(p.id)] = Math.max(0, p.balance - p.minPayment);
    }
    if (eligibleAccounts.length > 0) {
      const smallest = eligibleAccounts[0];
      const ps = payments.find(x => x.id === smallest.id);
      if (ps) {
        const extraPay = Math.min(updatedBalances[String(ps.id)], 1);
        ps.extraPayment = extraPay;
        ps.totalPayment += extraPay;
        updatedBalances[String(ps.id)] = Math.max(0, updatedBalances[String(ps.id)] - extraPay);
      }
    }
    return { payments, updatedBalances };
  }, [eligibleAccounts]);

  const smallDebtOptions = useMemo(() => {
    const out: Record<string, { months: number; monthly: number }[]> = {};
    for (const acc of eligibleAccounts) {
      if (acc.balance < 500) {
        const opts = [] as { months: number; monthly: number }[];
        for (let m = 1; m <= 6; m++) {
          const monthly = Math.ceil(acc.balance / m);
          opts.push({ months: m, monthly });
        }
        out[String(acc.id)] = opts;
      }
    }
    return out;
  }, [eligibleAccounts]);

  const handlePayoffVerify = () => {
    setPoints(prev => prev + 100);
    // In a real app, this would show a toast or confetti
  };

  const calculatePayoffToTarget = (balance: number, limit: number, targetPercent: number) => {
    const targetBalance = limit * (targetPercent / 100);
    const amountToPay = balance - targetBalance;
    return Math.max(0, amountToPay);
  };

  return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <Card className="bg-gradient-to-br from-rose-500 to-pink-600 text-white border-0 shadow-lg">
           <CardContent className="pt-6">
             <div className="text-3xl font-bold">${totalDebt.toLocaleString()}</div>
             <div className="text-rose-100 font-medium">Total Revolving Debt</div>
           </CardContent>
         </Card>
         <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0 shadow-lg">
           <CardContent className="pt-6">
             <div className="text-3xl font-bold">${Math.ceil(monthlyBudget).toLocaleString()}/mo</div>
             <div className="text-indigo-100 font-medium">Target Monthly Payment</div>
           </CardContent>
         </Card>
         <Card className="bg-gradient-to-br from-yellow-50 to-orange-600 text-white border-0 shadow-lg">
           <CardContent className="pt-6">
             <div className="text-3xl font-bold">{points.toLocaleString()}</div>
             <div className="text-yellow-100 font-medium">Reward Points</div>
           </CardContent>
         </Card>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <Card className="lg:col-span-1 shadow-md border-slate-200 dark:border-slate-800">
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-rose-500" />
                {editingAccount ? `Configure: ${editingAccount.name}` : "Plan Configuration"}
             </CardTitle>
             <CardDescription>
                {editingAccount ? "Update payoff settings for this account" : "Customize your payoff strategy"}
             </CardDescription>
           </CardHeader>
           <CardContent className="space-y-8">
             {editingAccount ? (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Target Utilization (%)</Label>
                        <div className="flex items-center gap-4">
                            <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                step="1"
                                value={editForm.targetUtilization} 
                                onChange={(e) => setEditForm({...editForm, targetUtilization: Number(e.target.value)})}
                                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                            <span className="w-12 text-right font-bold">{editForm.targetUtilization}%</span>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Payoff Timeline (Months)</Label>
                        <div className="flex items-center gap-4">
                            <input 
                                type="range" 
                                min="1" 
                                max="36" 
                                step="1"
                                value={editForm.payoffTimelineMonths} 
                                onChange={(e) => setEditForm({...editForm, payoffTimelineMonths: Number(e.target.value)})}
                                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                            <span className="w-12 text-right font-bold">{editForm.payoffTimelineMonths}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Payment Date (Day of Month)</Label>
                        <Input 
                            type="number" 
                            min="1" 
                            max="31" 
                            value={editForm.paymentDate}
                            onChange={(e) => setEditForm({...editForm, paymentDate: Number(e.target.value)})}
                        />
                    </div>

                    <div className="flex items-center justify-between space-x-2 pt-4 border-t">
                        <Label htmlFor="reminder-mode" className="flex flex-col space-y-1">
                            <span>Enable Payment Reminders</span>
                            <span className="font-normal text-xs text-muted-foreground">
                                Send monthly email reminders
                            </span>
                        </Label>
                        {editForm.reminderEnabled ? (
                            <div className="flex gap-2">
                                <Button 
                                    size="sm" 
                                    variant="destructive" 
                                    onClick={() => setEditForm({
                                        ...editForm,
                                        reminderEnabled: false,
                                        trackEnabled: false
                                    })}
                                >
                                    Stop Reminder
                                </Button>
                                <Button 
                                    size="sm" 
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => setEditForm({
                                        ...editForm,
                                        reminderEnabled: false,
                                        trackEnabled: false
                                    })}
                                >
                                    Payment Clear
                                </Button>
                            </div>
                        ) : (
                            <Switch
                                id="reminder-mode"
                                checked={editForm.reminderEnabled}
                                onCheckedChange={(checked) => setEditForm({
                                    ...editForm, 
                                    reminderEnabled: checked,
                                    trackEnabled: checked 
                                })}
                            />
                        )}
                    </div>
                    {editForm.reminderEnabled && (
                        <div className="flex flex-col gap-2">
                            <div className="text-xs text-muted-foreground bg-green-50 p-2 rounded border border-green-100 flex items-center gap-2">
                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                <span className="text-green-700">Reminders active for the {editForm.paymentDate}{getOrdinalSuffix(editForm.paymentDate)} of each month</span>
                            </div>
                            <div className="text-xs font-medium text-indigo-600 pl-7">
                                Next upcoming reminder: {getNextReminderDate(editForm.paymentDate)}
                            </div>
                        </div>
                    )}
                    <div className="flex gap-2 pt-4">
                        <Button className="flex-1" onClick={handleSaveEdit}>
                            {editForm.reminderEnabled && payoffPlans.some(p => p.account_id === String(editingAccount.id) && p.reminder_enabled) 
                                ? "Update Reminder" 
                                : "Save"}
                        </Button>
                        <Button variant="outline" className="flex-1" onClick={handleCancelEdit}>Cancel</Button>
                    </div>
                </div>
             ) : (
               <div className="space-y-4">
                 <div className="flex items-center justify-between mb-4">
                    <Label className="text-base font-semibold">Active Reminders</Label>
                    <Badge variant="outline" className="text-muted-foreground">{payoffPlans.filter(p => p.reminder_enabled).length} Active</Badge>
                 </div>
                 
                 {payoffPlans.filter(p => p.reminder_enabled).length > 0 ? (
                    <div className="space-y-3">
                        {payoffPlans.filter(p => p.reminder_enabled).map((plan, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                                <div>
                                    <div className="font-medium text-sm">{plan.account_name}</div>
                                    <div className="text-xs text-muted-foreground">Payment Date: {plan.payment_date}{getOrdinalSuffix(plan.payment_date)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-medium text-indigo-600">Next: {getNextReminderDate(plan.payment_date)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                 ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg bg-slate-50/50">
                        <div className="flex justify-center mb-2">
                            <Clock className="h-8 w-8 text-slate-300" />
                        </div>
                        <div className="mb-4">No active reminders.</div>
                        <Select onValueChange={(value) => {
                            const account = revolvingAccounts.find(a => String(a.id) === value);
                            if (account) handleEditClick(account);
                        }}>
                            <SelectTrigger className="w-[200px] mx-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                                <SelectValue placeholder="Select account to configure" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                                {revolvingAccounts.map((acc) => (
                                    <SelectItem key={acc.id} value={String(acc.id)}>
                                        {acc.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                 )}
               </div>
             )}
           </CardContent>
         </Card>

         <Card className="lg:col-span-2 shadow-md border-slate-200 dark:border-slate-800 dark:bg-card">
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
                <LineChart className="w-5 h-5 text-indigo-500" />
                Snowball Payoff Schedule
             </CardTitle>
             <CardDescription>Focus extra payments on the smallest balance first</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="rounded-md border overflow-x-auto">
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Account</TableHead>
                    <TableHead>Limit</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Minimum Payment</TableHead>
                    <TableHead>Payoff Time</TableHead>
                    <TableHead>Percent Progress</TableHead>
                    <TableHead>Updated Balance</TableHead>
                    <TableHead>Plan Options</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                 <TableBody>
                  {eligibleAccounts.length > 0 ? eligibleAccounts.map((acc, idx) => {
                    const planRec = snowballPlan.find(p => p.id === acc.id);
                    const pm = oneMonth.payments.find(p => p.id === acc.id);
                    const progressPct = pm && acc.balance > 0 ? Math.min(100, ((pm.totalPayment / acc.balance) * 100)) : 0;
                    const updated = oneMonth.updatedBalances[String(acc.id)] ?? acc.balance;
                    return (
                      <TableRow key={idx} className={acc.plan?.track_enabled ? "bg-green-50/50" : ""}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-rose-100 rounded-full text-rose-600">
                               <CreditCard className="h-4 w-4" />
                            </div>
                            <div>
                              <div>{acc.name}</div>
                              {acc.plan?.track_enabled && (
                                <div className="text-xs text-green-600 font-medium flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Track Enabled
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>${acc.limit.toLocaleString()}</TableCell>
                        <TableCell>${acc.balance.toLocaleString()}</TableCell>
                        <TableCell className="font-bold">${Math.ceil(acc.minPayment).toLocaleString()}</TableCell>
                        <TableCell>{planRec?.payoffMonths || 0} months</TableCell>
                        <TableCell>
                          <div className="text-xs font-medium">
                            {progressPct.toFixed(1)}%
                          </div>
                        </TableCell>
                        <TableCell>${Math.ceil(updated).toLocaleString()}</TableCell>
                        <TableCell>
                          {smallDebtOptions[String(acc.id)] ? (
                            <div className="flex flex-wrap gap-1">
                              {smallDebtOptions[String(acc.id)].map((opt, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {opt.months}m ${opt.monthly}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                           <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleEditClick(acc)}>
                               <Settings className="h-4 w-4 text-slate-400 hover:text-indigo-500" />
                           </Button>
                           <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handlePayoffVerify}>
                               <CheckCircle2 className="h-5 w-5 text-slate-300 hover:text-green-500 transition-colors" />
                           </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow>
                       <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                           No revolving accounts found.
                       </TableCell>
                    </TableRow>
                  )}
                 </TableBody>
               </Table>
             </div>
             
            
           </CardContent>
         </Card>
       </div>
       
       <Card className="shadow-md border-slate-200 dark:border-slate-800 dark:bg-card">
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-green-600" />
                Saved Payoff Plans
             </CardTitle>
             <CardDescription>View all your saved debt payoff strategies and reminders</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="rounded-md border overflow-x-auto">
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>Account Name</TableHead>
                     <TableHead>Target Utilization</TableHead>
                     <TableHead>Payoff Timeline</TableHead>
                     <TableHead>Payment Date</TableHead>
                     <TableHead>Reminders</TableHead>
                     <TableHead>Tracking</TableHead>
                     <TableHead>Actions</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {payoffPlans.length > 0 ? payoffPlans.map((plan, idx) => (
                     <TableRow key={idx}>
                       <TableCell className="font-medium">{plan.account_name}</TableCell>
                       <TableCell>{plan.target_utilization}%</TableCell>
                       <TableCell>{plan.payoff_timeline_months} months</TableCell>
                       <TableCell>{plan.payment_date}{getOrdinalSuffix(plan.payment_date)}</TableCell>
                       <TableCell>
                         {plan.reminder_enabled ? (
                           <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">Active</Badge>
                         ) : (
                           <Badge variant="outline" className="text-slate-500">Disabled</Badge>
                         )}
                       </TableCell>
                       <TableCell>
                         {plan.track_enabled ? (
                           <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200">Enabled</Badge>
                         ) : (
                           <Badge variant="outline" className="text-slate-500">Disabled</Badge>
                         )}
                       </TableCell>
                       <TableCell>
                         <Button 
                           size="sm" 
                           variant="ghost" 
                           onClick={() => {
                             const account = revolvingAccounts.find(a => String(a.id) === plan.account_id) || { id: plan.account_id, name: plan.account_name };
                             handleEditClick(account);
                           }}
                         >
                           <Settings className="h-4 w-4 text-slate-400 hover:text-indigo-500" />
                         </Button>
                       </TableCell>
                     </TableRow>
                   )) : (
                     <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No saved payoff plans found.
                        </TableCell>
                     </TableRow>
                   )}
                 </TableBody>
               </Table>
             </div>
           </CardContent>
         </Card>
       
    </div>
  );
};

const PERSONAL_INFO_MODE_OPTIONS = { normal: 'normal', credit_repair: 'credit_repair' } as const;

// Import the same detailed report data from Reports.tsx for consistency
const detailedReport = {
  personalInfo: {
    name: "Sarah Elizabeth Johnson",
    ssn: "***-**-4567",
    dateOfBirth: "03/15/1988",
    addresses: [
      {
        street: "1234 Maple Street",
        city: "Boston",
        state: "MA",
        zip: "02101",
        type: "Current",
        reportedDate: "2023-01-15",
        verified: true,
      },
      {
        street: "5678 Oak Avenue",
        city: "Cambridge",
        state: "MA",
        zip: "02138",
        type: "Previous",
        reportedDate: "2020-06-01",
        verified: true,
      },
    ],
    employment: {
      employer: "Tech Solutions Inc",
      position: "Software Engineer",
      income: 85000,
      employmentLength: "3 years",
      verified: true,
    },
    phoneNumbers: [
      { number: "(617) 555-0123", type: "Mobile", verified: true },
      { number: "(617) 555-0124", type: "Home", verified: false },
    ],
  },
  scores: {
    experian: 775,
    transunion: 769,
    equifax: 772,
  },
  previousScores: {
    experian: 705,
    transunion: 699,
    equifax: 702,
  },
  accounts: [
    {
      id: 1,
      creditor: "Chase Bank",
      accountNumber: "****1234",
      type: "Credit Card",
      status: "Open",
      balance: 2450,
      limit: 5000,
      minimumPayment: 75,
      actualPayment: 125,
      opened: "2020-03-15",
      lastActivity: "2024-01-10",
      paymentHistory: "Current",
      utilization: 49,
      remarks: "Pays as agreed",
      latePayments: {
        total: 2,
        last30Days: 0,
        last60Days: 1,
        last90Days: 1,
        over90Days: 0,
      },
      monthlyHistory: [
        {
          month: "2024-01",
          balance: 2450,
          payment: 125,
          status: "Current",
          daysLate: 0,
        },
        {
          month: "2023-12",
          balance: 2380,
          payment: 100,
          status: "Current",
          daysLate: 0,
        },
        {
          month: "2023-11",
          balance: 2290,
          payment: 75,
          status: "Current",
          daysLate: 0,
        },
        {
          month: "2023-10",
          balance: 2150,
          payment: 0,
          status: "30 Days Late",
          daysLate: 32,
        },
        {
          month: "2023-09",
          balance: 2050,
          payment: 75,
          status: "Current",
          daysLate: 0,
        },
        {
          month: "2023-08",
          balance: 1980,
          payment: 100,
          status: "Current",
          daysLate: 0,
        },
      ],
      transactions: [
        {
          date: "2024-01-15",
          description: "Payment Thank You",
          amount: -125,
          type: "Payment",
        },
        {
          date: "2024-01-12",
          description: "AMAZON.COM",
          amount: 89.99,
          type: "Purchase",
        },
        {
          date: "2024-01-10",
          description: "STARBUCKS #1234",
          amount: 12.45,
          type: "Purchase",
        },
        {
          date: "2024-01-08",
          description: "GROCERY STORE",
          amount: 156.78,
          type: "Purchase",
        },
        {
          date: "2024-01-05",
          description: "GAS STATION",
          amount: 45.2,
          type: "Purchase",
        },
        {
          date: "2024-01-03",
          description: "Interest Charge",
          amount: 23.45,
          type: "Fee",
        },
      ],
    },
    {
      id: 2,
      creditor: "Wells Fargo Auto",
      accountNumber: "****5678",
      type: "Auto Loan",
      status: "Open",
      balance: 18500,
      originalAmount: 25000,
      monthlyPayment: 425,
      opened: "2022-06-01",
      lastActivity: "2024-01-05",
      paymentHistory: "Current",
      utilization: 74,
      remarks: "Pays as agreed",
      interestRate: 5.99,
      termLength: "60 months",
      latePayments: {
        total: 0,
        last30Days: 0,
        last60Days: 0,
        last90Days: 0,
        over90Days: 0,
      },
      monthlyHistory: [
        {
          month: "2024-01",
          balance: 18500,
          payment: 425,
          status: "Current",
          daysLate: 0,
        },
        {
          month: "2023-12",
          balance: 18890,
          payment: 425,
          status: "Current",
          daysLate: 0,
        },
        {
          month: "2023-11",
          balance: 19280,
          payment: 425,
          status: "Current",
          daysLate: 0,
        },
        {
          month: "2023-10",
          balance: 19670,
          payment: 425,
          status: "Current",
          daysLate: 0,
        },
        {
          month: "2023-09",
          balance: 20060,
          payment: 425,
          status: "Current",
          daysLate: 0,
        },
        {
          month: "2023-08",
          balance: 20450,
          payment: 425,
          status: "Current",
          daysLate: 0,
        },
      ],
      transactions: [
        {
          date: "2024-01-05",
          description: "Auto Loan Payment",
          amount: -425,
          type: "Payment",
        },
        {
          date: "2023-12-05",
          description: "Auto Loan Payment",
          amount: -425,
          type: "Payment",
        },
        {
          date: "2023-11-05",
          description: "Auto Loan Payment",
          amount: -425,
          type: "Payment",
        },
      ],
    },
    {
      id: 3,
      creditor: "Capital One",
      accountNumber: "****9012",
      type: "Credit Card",
      status: "Closed",
      balance: 0,
      limit: 2000,
      payment: 0,
      opened: "2018-12-01",
      closed: "2023-08-15",
      lastActivity: "2023-08-15",
      paymentHistory: "Paid as Agreed",
      utilization: 0,
      remarks: "Account closed by consumer",
      latePayments: {
        total: 1,
        last30Days: 0,
        last60Days: 0,
        last90Days: 0,
        over90Days: 1,
      },
      monthlyHistory: [
        {
          month: "2023-08",
          balance: 0,
          payment: 250,
          status: "Paid in Full",
          daysLate: 0,
        },
        {
          month: "2023-07",
          balance: 250,
          payment: 0,
          status: "Current",
          daysLate: 0,
        },
        {
          month: "2023-06",
          balance: 180,
          payment: 50,
          status: "Current",
          daysLate: 0,
        },
      ],
    },
    {
      id: 4,
      creditor: "Discover Card",
      accountNumber: "****4567",
      type: "Credit Card",
      status: "Open",
      balance: 1200,
      limit: 3000,
      minimumPayment: 35,
      actualPayment: 50,
      opened: "2021-09-12",
      lastActivity: "2024-01-12",
      paymentHistory: "Current",
      utilization: 40,
      remarks: "Pays as agreed",
      latePayments: {
        total: 0,
        last30Days: 0,
        last60Days: 0,
        last90Days: 0,
        over90Days: 0,
      },
      monthlyHistory: [
        {
          month: "2024-01",
          balance: 1200,
          payment: 50,
          status: "Current",
          daysLate: 0,
        },
        {
          month: "2023-12",
          balance: 1150,
          payment: 75,
          status: "Current",
          daysLate: 0,
        },
        {
          month: "2023-11",
          balance: 1100,
          payment: 50,
          status: "Current",
          daysLate: 0,
        },
      ],
      transactions: [
        {
          date: "2024-01-12",
          description: "Payment - Thank You",
          amount: -50,
          type: "Payment",
        },
        {
          date: "2024-01-10",
          description: "WALMART.COM",
          amount: 67.89,
          type: "Purchase",
        },
        {
          date: "2024-01-08",
          description: "RESTAURANT",
          amount: 34.56,
          type: "Purchase",
        },
      ],
    },
  ],
  collections: [
    {
      id: 1,
      agency: "ABC Collections",
      originalCreditor: "Boston Medical Center",
      currentCreditor: "ABC Collections",
      accountNumber: "****7890",
      amount: 750,
      originalAmount: 850,
      dateOpened: "2023-07-15",
      dateReported: "2023-09-15",
      lastActivity: "2024-01-05",
      status: "Open",
      disputeStatus: "Pending Verification",
      paymentHistory: [
        { date: "2024-01-05", amount: 50, balance: 700 },
        { date: "2023-12-05", amount: 50, balance: 750 },
      ],
      notes: "Medical collection from emergency room visit",
      phoneNumber: "(800) 555-0199",
    },
    {
      id: 2,
      agency: "XYZ Recovery Services",
      originalCreditor: "National Grid Utility",
      currentCreditor: "XYZ Recovery Services",
      accountNumber: "****3456",
      amount: 320,
      originalAmount: 320,
      dateOpened: "2023-10-20",
      dateReported: "2023-11-20",
      lastActivity: "2023-11-20",
      status: "Open",
      disputeStatus: "None",
      paymentHistory: [],
      notes: "Utility bill from previous address",
      phoneNumber: "(800) 555-0177",
    },
    {
      id: 3,
      agency: "Recovery Plus Inc",
      originalCreditor: "Verizon Wireless",
      currentCreditor: "Recovery Plus Inc",
      accountNumber: "****9876",
      amount: 485,
      originalAmount: 485,
      dateOpened: "2023-08-10",
      dateReported: "2023-09-10",
      lastActivity: "2023-12-15",
      status: "Settled",
      disputeStatus: "Verified",
      paymentHistory: [
        {
          date: "2023-12-15",
          amount: 242.5,
          balance: 0,
          note: "Settled for 50%",
        },
      ],
      notes: "Cell phone bill - settled for 50%",
      phoneNumber: "(800) 555-0155",
    },
  ],
  inquiries: [
    {
      id: 1,
      company: "Chase Bank",
      date: "2024-01-10",
      type: "Hard",
      purpose: "Credit Card Application",
      requestedBy: "Chase Credit Card Division",
      address: "P.O. Box 15298, Wilmington, DE 19850",
    },
    {
      id: 2,
      company: "CarMax Auto Finance",
      date: "2023-12-05",
      type: "Hard",
      purpose: "Auto Financing",
      requestedBy: "CarMax Auto Finance",
      address: "12800 Tuckahoe Creek Pkwy, Richmond, VA 23238",
    },
    {
      id: 3,
      company: "Credit Karma",
      date: "2024-01-15",
      type: "Soft",
      purpose: "Account Review",
      requestedBy: "Credit Karma, Inc",
      address: "P.O. Box 30963, Oakland, CA 94604",
    },
    {
      id: 4,
      company: "Experian",
      date: "2024-01-01",
      type: "Soft",
      purpose: "Consumer Credit Report",
      requestedBy: "Experian Consumer Services",
      address: "P.O. Box 9701, Allen, TX 75013",
    },
    {
      id: 5,
      company: "Wells Fargo Bank",
      date: "2023-11-22",
      type: "Hard",
      purpose: "Credit Line Increase",
      requestedBy: "Wells Fargo Credit Card Services",
      address: "P.O. Box 14517, Des Moines, IA 50306",
    },
  ],
  publicRecords: [
    {
      id: 1,
      type: "Bankruptcy",
      status: "Discharged",
      filingDate: "2019-03-15",
      dischargeDate: "2019-08-20",
      court: "US Bankruptcy Court District of Massachusetts",
      caseNumber: "19-12345",
      assets: 15000,
      liabilities: 45000,
      chapter: "Chapter 7",
      notes: "No asset case, discharged without issues",
    },
  ],
  disputeHistory: [
    {
      id: 1,
      date: "2024-01-10",
      bureau: "Experian",
      accountDisputed: "ABC Collections - Medical",
      reason: "Not my account",
      status: "Under Investigation",
      expectedResolution: "2024-02-10",
      result: "Pending",
    },
    {
      id: 2,
      date: "2023-12-15",
      bureau: "TransUnion",
      accountDisputed: "Capital One Credit Card",
      reason: "Incorrect payment history",
      status: "Resolved",
      expectedResolution: "2024-01-15",
      result: "Updated - Late payment removed",
    },
    {
      id: 3,
      date: "2023-11-20",
      bureau: "Equifax",
      accountDisputed: "Recovery Plus Inc",
      reason: "Paid in full but still showing balance",
      status: "Resolved",
      expectedResolution: "2023-12-20",
      result: "Verified - Account updated to show settled status",
    },
  ],
  creditMonitoring: [
    {
      date: "2024-01-15",
      type: "Score Change",
      description: "Experian score increased by 5 points",
      impact: "Positive",
      reason: "Credit utilization decreased",
    },
    {
      date: "2024-01-10",
      type: "New Inquiry",
      description: "Hard inquiry added by Chase Bank",
      impact: "Negative",
      reason: "Credit card application",
    },
    {
      date: "2024-01-05",
      type: "Payment Recorded",
      description: "On-time payment recorded for Wells Fargo Auto",
      impact: "Positive",
      reason: "Consistent payment history",
    },
    {
      date: "2023-12-20",
      type: "Account Updated",
      description: "Capital One account updated with corrected payment history",
      impact: "Positive",
      reason: "Successful dispute resolution",
    },
  ],
};

export default function CreditReport() {
  const { userProfile } = useAuthContext();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [reportData, setReportData] = useState(detailedReport);
  const [apiData, setApiData] = useState<any>(null);
  const [qualifyView, setQualifyView] = useState<'cards' | 'table'>('table');
  const [refreshAuditNonce, setRefreshAuditNonce] = useState(0);
  const [isRerunningAudit, setIsRerunningAudit] = useState(false);
  const [eligibilityBureau, setEligibilityBureau] = useState<'all' | 'tu' | 'ex' | 'eq'>('all');
  const analysisRef = useRef<HTMLDivElement>(null);
  const [personalInfoMode, setPersonalInfoMode] = useState<'normal' | 'credit_repair'>('normal');
  const [smPiLoading, setSmPiLoading] = useState(false);
  const [smPiResult, setSmPiResult] = useState<any | null>(null);
  const [smPiError, setSmPiError] = useState<string | null>(null);
  const [lawEngineAutoMode, setLawEngineAutoMode] = useState(false);
  const [lawEngineNoticeOpen, setLawEngineNoticeOpen] = useState(false);
  const [pendingLawEngineTab, setPendingLawEngineTab] = useState<string | null>(null);
  const [fundingAuditNoticeOpen, setFundingAuditNoticeOpen] = useState(false);
  const [pendingFundingAuditTab, setPendingFundingAuditTab] = useState<string | null>(null);
  const creditReportTabs = ['overview', 'personal', 'inquiries', 'public', 'accounts'] as const;
  type CreditReportTab = (typeof creditReportTabs)[number];
  const isLawEngineView = lawEngineAutoMode && (creditReportTabs as readonly string[]).includes(activeTab);

  const requestEnableLawEngine = (tab?: CreditReportTab) => {
    const nextTab = tab ?? ((creditReportTabs as readonly string[]).includes(activeTab as any) ? (activeTab as any) : 'overview');
    if (lawEngineAutoMode) {
      setActiveTab(nextTab);
      return;
    }
    setPendingLawEngineTab(nextTab);
    setLawEngineNoticeOpen(true);
  };

  const acknowledgeLawEngineNotice = () => {
    setLawEngineNoticeOpen(false);
    setLawEngineAutoMode(true);
    if (pendingLawEngineTab) setActiveTab(pendingLawEngineTab);
    setPendingLawEngineTab(null);
  };

  const requestOpenFundingAudit = () => {
    setPendingFundingAuditTab('funding');
    setFundingAuditNoticeOpen(true);
  };

  const acknowledgeFundingAuditNotice = () => {
    setFundingAuditNoticeOpen(false);
    if (pendingFundingAuditTab) setActiveTab(pendingFundingAuditTab);
    setPendingFundingAuditTab(null);
  };

  const handleActiveTabChange = (nextTab: string) => {
    if (nextTab === 'funding') {
      requestOpenFundingAudit();
      return;
    }
    setActiveTab(nextTab);
  };

  useEffect(() => {
    if (!(creditReportTabs as readonly string[]).includes(activeTab as any)) {
      setLawEngineAutoMode(false);
    }
  }, [activeTab]);
  
  const [payoffPlans, setPayoffPlans] = useState<any[]>([]);
  const { clientId: urlClientId } = useParams<{ clientId: string }>();
  const clientId = urlClientId || searchParams.get("clientId") || userProfile?.id;

  const fetchPayoffPlans = async () => {
    if (!clientId) return;
    try {
      const response = await clientsApi.getDebtPayoffPlans(Number(clientId));
      setPayoffPlans(response.data);
    } catch (error) {
      console.error("Failed to fetch payoff plans:", error);
    }
  };

  useEffect(() => {
    fetchPayoffPlans();
  }, [clientId]);

  const handleSavePayoffPlan = async (plan: any) => {
    try {
      await clientsApi.saveDebtPayoffPlan(plan);
      fetchPayoffPlans();
    } catch (error) {
      throw error;
    }
  };

  // Subscription status for tab access control
  const subscriptionStatus = useSubscriptionStatus();

  const employmentMismatch = useMemo(() => {
    if (!smPiResult?.debug?.trigger_hits) return false;
    try {
      return smPiResult.debug.trigger_hits.some((h: any) => String(h?.trigger) === 'EMPLOYMENT_INCONSISTENT');
    } catch {
      return false;
    }
  }, [smPiResult]);

  const buildSmPiPayload = () => {
    const nameFor = (bureauId: number) => {
      const names = apiData?.Name?.filter((n: any) => Number(n.BureauId) === Number(bureauId)) || [];
      const primary = names.find((n: any) => (n.NameType || '') === 'Primary') || names[0];
      if (!primary) return null;
      const parts = [primary.FirstName || '', primary.Middle || '', primary.LastName || ''].filter(Boolean);
      const full = parts.join(' ').trim();
      return full || null;
    };
    const aliasesFor = (bureauId: number) => {
      const names = apiData?.Name?.filter((n: any) => Number(n.BureauId) === Number(bureauId)) || [];
      return names
        .filter((n: any) => /(aka|alias|also known as|former)/i.test(String(n.NameType || '')))
        .map((n: any) => `${n.FirstName || ''} ${n.Middle || ''} ${n.LastName || ''}`.trim())
        .filter(Boolean);
    };
    const dobFor = (bureauId: number) => {
      const dob = apiData?.DOB?.find((d: any) => Number(d.BureauId) === Number(bureauId))?.DOB;
      return dob || (reportData?.personalInfo?.dateOfBirth || null);
    };
    const addressesFor = (bureauId: number) => {
      const addresses = apiData?.Address?.filter((a: any) => Number(a.BureauId) === Number(bureauId)) || [];
      const toText = (a: any) => `${a.StreetAddress || ''}, ${a.City || ''}, ${a.State || ''} ${a.Zip || ''}`.replace(/^,\s*|,\s*$/, '').trim();
      const current = addresses.filter((a: any) => String(a.AddressType || '').toLowerCase() === 'current').map(toText).filter(Boolean);
      const previous = addresses.filter((a: any) => String(a.AddressType || '').toLowerCase() !== 'current').map(toText).filter(Boolean);
      // Fallback to mocked personalInfo addresses if API empty
      if (addresses.length === 0 && Array.isArray(reportData?.personalInfo?.addresses)) {
        const arr = reportData.personalInfo.addresses;
        current.push(
          ...arr.filter((x: any) => String(x.type || '').toLowerCase() === 'current')
              .map((x: any) => `${x.street || ''}, ${x.city || ''}, ${x.state || ''} ${x.zip || ''}`.replace(/^,\s*|,\s*$/, '').trim())
              .filter(Boolean)
        );
        previous.push(
          ...arr.filter((x: any) => String(x.type || '').toLowerCase() !== 'current')
              .map((x: any) => `${x.street || ''}, ${x.city || ''}, ${x.state || ''} ${x.zip || ''}`.replace(/^,\s*|,\s*$/, '').trim())
              .filter(Boolean)
        );
      }
      return { current, previous };
    };
    const employmentFor = (bureauId: number) => {
      const employers = (reportData as any)?.personalInfo?.employers || [];
      const list = employers.filter((e: any) => Number(e.bureauId) === Number(bureauId));
      const toText = (e: any) => [e.name || '', e.position || ''].filter(Boolean).join(' - ');
      return list.map(toText).filter(Boolean);
    };
    const phones = ((reportData as any)?.personalInfo?.phoneNumbers || [])
      .map((p: any) => p.number)
      .filter(Boolean);
    const ssn = (reportData as any)?.personalInfo?.ssn || null;
    const BID = { equifax: 1, transunion: 2, experian: 3 };
    const exAddr = addressesFor(BID.experian);
    const tuAddr = addressesFor(BID.transunion);
    const eqAddr = addressesFor(BID.equifax);
    return {
      consumer_id: String(clientId || ''),
      pi: {
        experian: {
          full_name: nameFor(BID.experian),
          aka_names: aliasesFor(BID.experian),
          dob: dobFor(BID.experian),
          ssn,
          current_addresses: exAddr.current,
          previous_addresses: exAddr.previous,
          phones,
          employment: employmentFor(BID.experian),
        },
        transunion: {
          full_name: nameFor(BID.transunion),
          aka_names: aliasesFor(BID.transunion),
          dob: dobFor(BID.transunion),
          ssn,
          current_addresses: tuAddr.current,
          previous_addresses: tuAddr.previous,
          phones,
          employment: employmentFor(BID.transunion),
        },
        equifax: {
          full_name: nameFor(BID.equifax),
          aka_names: aliasesFor(BID.equifax),
          dob: dobFor(BID.equifax),
          ssn,
          current_addresses: eqAddr.current,
          previous_addresses: eqAddr.previous,
          phones,
          employment: employmentFor(BID.equifax),
        },
      },
      options: { strict_mode: true, normalize: true },
    };
  };

  const handleRunSmPiEngine = async () => {
    try {
      setSmPiLoading(true);
      setSmPiError(null);
      const payload = buildSmPiPayload();
      const resp = await warMachineApi.runSmPiSuperEngine(payload);
      const data = resp?.data;
      setSmPiResult(data?.result || data);
      toast.success('SM PI Super engine completed');
    } catch (err: any) {
      console.error('SM PI Super engine error:', err);
      setSmPiError('Failed to run engine');
      toast.error('Failed to run SM PI Super engine');
    } finally {
      setSmPiLoading(false);
    }
  };

  const buildInquiriesPayload = () => {
    const list = (apiData as any)?.reportData?.reportData?.Inquiries ?? (apiData as any)?.reportData?.Inquiries ?? (apiData as any)?.Inquiries ?? [];
    const group = {
      experian: [] as any[],
      transunion: [] as any[],
      equifax: [] as any[],
    };
    for (const inq of list) {
      const b = Number(inq?.BureauId);
      const item = {
        creditor_name: inq?.CreditorName ?? null,
        date: inq?.DateInquiry ?? null,
        type: inq?.InquiryType === 'I' ? 'HARD' : inq?.InquiryType === 'S' ? 'SOFT' : String(inq?.InquiryType || '').toUpperCase() || null,
        industry: inq?.Industry ?? null,
      };
      if (b === 2) group.experian.push(item);
      else if (b === 1) group.transunion.push(item);
      else group.equifax.push(item);
    }
    return {
      consumer_id: String(clientId || ''),
      inquiries: group,
      options: { strict_mode: true, normalize: true, window_months: 12 },
    };
  };

  const [inqReviewLoading, setInqReviewLoading] = useState(false);
  const [inqReviewError, setInqReviewError] = useState<string | null>(null);
  const [inqReviewResult, setInqReviewResult] = useState<any>(null);

  const handleRunInquiriesReview = async () => {
    try {
      setInqReviewLoading(true);
      setInqReviewError(null);
      const payload = buildInquiriesPayload();
      const resp = await warMachineApi.runInquiriesReview(payload);
      const data = resp?.data;
      setInqReviewResult(data?.result || data);
      toast.success('War Machine Inquiries Review completed');
    } catch (err: any) {
      console.error('Inquiries Review engine error:', err);
      setInqReviewError('Failed to Run Law Engine Inquiries');
      toast.error('Failed to Run Law Engine Inquiries Review');
    } finally {
      setInqReviewLoading(false);
    }
  };
  const buildAccountsEvalPayload = () => {
    const accountsList =
      (apiData as any)?.reportData?.reportData?.Accounts ??
      (apiData as any)?.reportData?.Accounts ??
      (apiData as any)?.Accounts ??
      [];
    const pick = (...vals: any[]) => {
      for (const v of vals) {
        if (v === undefined || v === null) continue;
        const s = String(v).trim();
        if (!s || s.toLowerCase() === 'n/a') continue;
        return s;
      }
      return null;
    };
    const normalizedAccountsList = Array.isArray(accountsList)
      ? accountsList.map((acc: any) => ({
          ...acc,
          CreditorName: pick(
            acc?.CreditorName,
            acc?.Creditor,
            acc?.creditor,
            acc?.SubscriberName,
            acc?.Subscriber,
            acc?.company,
            acc?.Company,
          ),
          AccountNumber: pick(
            acc?.AccountNumber,
            acc?.accountNumber,
            acc?.MaskAccountNumber,
            acc?.maskAccountNumber,
            acc?.MaskedAccountNumber,
            acc?.maskedAccountNumber,
          ),
        }))
      : [];
    return {
      version: '1.0',
      case_id: String(clientId || ''),
      consumer_id: String(clientId || ''),
      normalize: true,
      match_strategy: 'strict',
      bureau_ids: [1, 2, 3],
      data: { Accounts: normalizedAccountsList },
    };
  };
  const [acctEvalLoading, setAcctEvalLoading] = useState(false);
  const [acctEvalError, setAcctEvalError] = useState<string | null>(null);
  const [acctEvalResult, setAcctEvalResult] = useState<any>(null);
  const [prEvalLoading, setPrEvalLoading] = useState(false);
  const [prEvalError, setPrEvalError] = useState<string | null>(null);
  const [prEvalResult, setPrEvalResult] = useState<any>(null);
  const handleRunAccountsEval = async () => {
    try {
      setAcctEvalLoading(true);
      setAcctEvalError(null);
      const payload = buildAccountsEvalPayload();
      const resp = await warMachineApi.runAccountsEval(payload);
      const data = resp?.data;
      setAcctEvalResult(data?.result || data);
      toast.success('War Machine Accounts Evaluation completed');
    } catch (err: any) {
      console.error('Accounts Eval engine error:', err);
      setAcctEvalError('Failed to run Accounts Law Engine');
      toast.error('Failed to run Accounts Law Engine');
    } finally {
      setAcctEvalLoading(false);
    }
  };
  const handleRunPublicRecordsEval = async () => {
    try {
      setPrEvalLoading(true);
      setPrEvalError(null);
      const publicRecords =
        (apiData as any)?.PublicRecords ??
        (reportData as any)?.publicRecords ??
        [];
      const payload = {
        version: '1.0',
        case_id: String(clientId || ''),
        consumer_id: String(clientId || ''),
        normalize: true,
        bureau_ids: [1, 2, 3],
        data: { PublicRecords: publicRecords },
      };
      const resp = await warMachineApi.runPublicRecordsEval(payload);
      const data = resp?.data;
      setPrEvalResult(data?.result || data);
      toast.success('Public Records Evaluation completed');
    } catch (err: any) {
      setPrEvalError('Failed to run Public Records Law Engine');
      toast.error('Failed to run Public Records Law Engine');
    } finally {
      setPrEvalLoading(false);
    }
  };

  useEffect(() => {
    if (!lawEngineAutoMode) return;
    if (activeTab === 'personal') {
      if (!smPiResult && !smPiLoading) handleRunSmPiEngine();
    } else if (activeTab === 'inquiries') {
      if (!inqReviewResult && !inqReviewLoading) handleRunInquiriesReview();
    } else if (activeTab === 'public') {
      if (!prEvalResult && !prEvalLoading) handleRunPublicRecordsEval();
    } else if (activeTab === 'accounts') {
      if (subscriptionStatus.hasActiveSubscription && !acctEvalResult && !acctEvalLoading) handleRunAccountsEval();
    }
  }, [activeTab, lawEngineAutoMode]);
  // Global helper: read underwriting flag for a bureau/key
  // This is used by the Basic (table) header indicator so it must be in component scope
  const getCriteriaFlag = (bureau: number, key: string) =>
    Boolean((reportData as any)?.qualificationCriteria?.[bureau]?.[key]);

  // Funding eligibility based on underwriting criteria (mirrors Underwriting.tsx)
  const isFundingEligible = useMemo(() => {
    const getCriteria = (bureau: number, key: string) =>
      Boolean((reportData as any)?.qualificationCriteria?.[bureau]?.[key]);

    const criteriaFlags = {
      score: [
        getCriteria(1, "score700Plus") || getCriteria(1, "score730Plus"),
        getCriteria(3, "score700Plus") || getCriteria(3, "score730Plus"),
        getCriteria(2, "score700Plus") || getCriteria(2, "score730Plus"),
      ],
      openUtil: [
        getCriteria(1, "openRevolvingUnder30"),
        getCriteria(3, "openRevolvingUnder30"),
        getCriteria(2, "openRevolvingUnder30"),
      ],
      allUtil: [
        getCriteria(1, "allRevolvingUnder30"),
        getCriteria(3, "allRevolvingUnder30"),
        getCriteria(2, "allRevolvingUnder30"),
      ],
      openCount: [
        getCriteria(1, "minFiveOpenRevolving"),
        getCriteria(3, "minFiveOpenRevolving"),
        getCriteria(2, "minFiveOpenRevolving"),
      ],
      unsecuredRecent: [
        getCriteria(1, "maxFourUnsecuredIn12Months"),
        getCriteria(3, "maxFourUnsecuredIn12Months"),
        getCriteria(2, "maxFourUnsecuredIn12Months"),
      ],
      inquiries: [
        getCriteria(1, "noInquiries"),
        getCriteria(3, "noInquiries"),
        getCriteria(2, "noInquiries"),
      ],
      bankruptcies: [
        getCriteria(1, "noBankruptcies"),
        getCriteria(3, "noBankruptcies"),
        getCriteria(2, "noBankruptcies"),
      ],
      collections: [
        getCriteria(1, "noCollections") || getCriteria(1, "noCollectionsLiensJudgements"),
        getCriteria(3, "noCollections") || getCriteria(3, "noCollectionsLiensJudgements"),
        getCriteria(2, "noCollections") || getCriteria(2, "noCollectionsLiensJudgements"),
      ],
      chargeOffs: [
        getCriteria(1, "noChargeOffs"),
        getCriteria(3, "noChargeOffs"),
        getCriteria(2, "noChargeOffs"),
      ],
      latePays: [
        getCriteria(1, "noLatePayments") || getCriteria(1, "noLatePaymentsIn12Months"),
        getCriteria(3, "noLatePayments") || getCriteria(3, "noLatePaymentsIn12Months"),
        getCriteria(2, "noLatePayments") || getCriteria(2, "noLatePaymentsIn12Months"),
      ],
    } as const;

    return Object.values(criteriaFlags).every(flags => flags.every(Boolean));
  }, [reportData]);

  // Effective eligibility: either server-provided all-bureau pass OR local per-bureau pass
  const effectiveFundingEligible = useMemo(() => {
    const getCriteria = (bureau: number, key: string) =>
      Boolean((reportData as any)?.qualificationCriteria?.[bureau]?.[key]);

    // Helper: count total inquiries by BureauId (no time window)
    const totalInquiryCountByBureauId = (bureauId: number): number => {
      const list = (apiData as any)?.reportData?.reportData?.Inquiries ?? (apiData as any)?.Inquiries ?? [];
      try {
        return list.filter((inq: any) => Number(inq?.BureauId) === Number(bureauId)).length;
      } catch {
        return 0;
      }
    };

    const criteriaFlags = {
      score: [
        getCriteria(1, "score700Plus") || getCriteria(1, "score730Plus"),
        getCriteria(3, "score700Plus") || getCriteria(3, "score730Plus"),
        getCriteria(2, "score700Plus") || getCriteria(2, "score730Plus"),
      ],
      openUtil: [
        getCriteria(1, "openRevolvingUnder30"),
        getCriteria(3, "openRevolvingUnder30"),
        getCriteria(2, "openRevolvingUnder30"),
      ],
      openCount: [
        getCriteria(1, "minFiveOpenRevolving"),
        getCriteria(3, "minFiveOpenRevolving"),
        getCriteria(2, "minFiveOpenRevolving"),
      ],
      unsecuredRecent: [
        getCriteria(1, "maxFourUnsecuredIn12Months"),
        getCriteria(3, "maxFourUnsecuredIn12Months"),
        getCriteria(2, "maxFourUnsecuredIn12Months"),
      ],
      inquiries: [
        totalInquiryCountByBureauId(1) < 4,
        totalInquiryCountByBureauId(3) < 4,
        totalInquiryCountByBureauId(2) < 4,
      ],
      bankruptcies: [
        getCriteria(1, "noBankruptcies"),
        getCriteria(3, "noBankruptcies"),
        getCriteria(2, "noBankruptcies"),
      ],
      collections: [
        getCriteria(1, "noCollections") || getCriteria(1, "noCollectionsLiensJudgements"),
        getCriteria(3, "noCollections") || getCriteria(3, "noCollectionsLiensJudgements"),
        getCriteria(2, "noCollections") || getCriteria(2, "noCollectionsLiensJudgements"),
      ],
      chargeOffs: [
        getCriteria(1, "noChargeOffs"),
        getCriteria(3, "noChargeOffs"),
        getCriteria(2, "noChargeOffs"),
      ],
      latePays: [
        getCriteria(1, "noLatePayments"),
        getCriteria(3, "noLatePayments"),
        getCriteria(2, "noLatePayments"),
      ],
    } as const;

    const flagGroups = Object.values(criteriaFlags);
    const perBureauEligible = [0, 1, 2].map((i) => flagGroups.every((group) => group[i]));
    const localEligible = perBureauEligible.some(Boolean);

    return Boolean(isFundingEligible) || localEligible;
  }, [reportData, apiData, isFundingEligible]);

  const CREDIT_REPAIR_URL = (userProfile?.credit_repair_url?.trim())
    || ((import.meta as any)?.env?.VITE_CREDIT_REPAIR_URL)
    || 'https://www.m2ficoforge.com/';
  
  // Bureau card tabs state - each account group has its own tab state
  const [bureauTabs, setBureauTabs] = useState<Record<string, string>>({});
  
  // Helper function to get or set default tab for an account group
  const getActiveTab = (accountKey: string) => {
    return bureauTabs[accountKey] || 'all';
  };
  
  // Helper function to set active tab for an account group
  const setActiveTabForAccount = (accountKey: string, tab: string) => {
    setBureauTabs(prev => ({
      ...prev,
      [accountKey]: tab
    }));
  };
  
  // Funding application modal states
  const [showFundingModal, setShowFundingModal] = useState(false);
  const [fundingType, setFundingType] = useState<'personal' | 'business' | 'both' | null>(null);
  const [fundingOption, setFundingOption] = useState<'done-for-you' | 'diy' | null>(null);
  const [selectedProductTypes, setSelectedProductTypes] = useState<string[]>(['Credit Card','SBA Loan','Line of Credit']);
  const [fundingEstimateNoticeOpen, setFundingEstimateNoticeOpen] = useState(false);
  const [pendingFundingGoal, setPendingFundingGoal] = useState<'personal' | 'business' | 'both' | null>(null);

  const performGoToDiyFunding = (goal: 'personal' | 'business' | 'both' = 'both') => {
    const inquiriesList = Array.isArray((reportData as any)?.inquiries) ? (reportData as any).inquiries : [];
    const infer = (inq: any) => {
      const b = inq?.bureau ?? inq?.Bureau ?? inq?.BureauName ?? inq?.bureauName;
      if (b) return String(b);
      const id = inq?.BureauId;
      if (id === 1) return 'TransUnion';
      if (id === 2) return 'Equifax';
      if (id === 3) return 'Experian';
      return '';
    };
    const ib = {
      Experian: inquiriesList.filter((i: any) => infer(i) === 'Experian').length,
      Equifax: inquiriesList.filter((i: any) => infer(i) === 'Equifax').length,
      TransUnion: inquiriesList.filter((i: any) => infer(i) === 'TransUnion').length,
    };
    const maxPullsPerBureau = 4;
    const headroomByBureau: Record<'Experian' | 'Equifax' | 'TransUnion', number> = {
      Experian: Math.max(0, maxPullsPerBureau - Number(ib.Experian || 0)),
      Equifax: Math.max(0, maxPullsPerBureau - Number(ib.Equifax || 0)),
      TransUnion: Math.max(0, maxPullsPerBureau - Number(ib.TransUnion || 0)),
    };
    const maxSuggestedSlots = 4;
    const maxSlotsPerBureau = 2;
    const preferredOrder: Array<keyof typeof headroomByBureau> = ['Experian', 'Equifax', 'TransUnion'];
    const bureauSlotCounts: Record<'Experian' | 'Equifax' | 'TransUnion', number> = {
      Experian: 0,
      Equifax: 0,
      TransUnion: 0,
    };
    let remaining = maxSuggestedSlots;
    for (const bureau of preferredOrder) {
      if (remaining <= 0) break;
      const headroom = headroomByBureau[bureau];
      const alloc = Math.max(0, Math.min(maxSlotsPerBureau, Number(headroom || 0), remaining));
      bureauSlotCounts[bureau] = alloc;
      remaining -= alloc;
    }
    navigate(`/funding/diy/${goal}`, {
      state: {
        clientId: clientId ? Number(clientId) : undefined,
        productTypes: selectedProductTypes,
        inquiriesByBureau: ib,
        bureauSlotCounts,
        goal,
      },
    });
  };

  const goToDiyFunding = (goal: 'personal' | 'business' | 'both' = 'both') => {
    setPendingFundingGoal(goal);
    setFundingEstimateNoticeOpen(true);
  };

  const acknowledgeFundingEstimateNotice = () => {
    const goal = pendingFundingGoal ?? 'both';
    setFundingEstimateNoticeOpen(false);
    setPendingFundingGoal(null);
    performGoToDiyFunding(goal);
  };
  
  // DIY Cards visibility states (for page section instead of modal)
  const [showDIYSection, setShowDIYSection] = useState(false);
  const [diyFundingType, setDiyFundingType] = useState<'personal' | 'business' | null>(null);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Eligibility audit modal state
  const [showEligibilityAuditModal, setShowEligibilityAuditModal] = useState(false);
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditResult, setAuditResult] = useState<string | null>(null);
  const [clientRecord, setClientRecord] = useState<any>(null);
  const [formData, setFormData] = useState({
    // Business Information
    titlePosition: '',
    fundingAmount: '',
    intendedUse: '',
    businessName: '',
    businessPhone: '',
    businessEmail: '',
    businessAddress: '',
    city: '',
    state: '',
    zip: '',
    dateCommenced: '',
    businessWebsite: '',
    businessIndustry: '',
    entityType: '',
    incorporationState: '',
    numberOfEmployees: '',
    ein: '',
    monthlyGrossSales: '',
    projectedAnnualRevenue: '',
    
    // Personal Information
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    birthCity: '',
    ssn: '',
    mothersMaidenName: '',
    homeAddress: '',
    personalCity: '',
    personalState: '',
    personalZip: '',
    homePhone: '',
    mobilePhone: '',
    housingStatus: '',
    monthlyHousingPayment: '',
    yearsAtAddress: '',
    driversLicense: '',
    issuingState: '',
    issueDate: '',
    expirationDate: '',
    
    // Employment Information
    currentEmployer: '',
    position: '',
    yearsAtEmployer: '',
    employerPhone: '',
    employerAddress: '',
    
    // Financial Information
    personalBankName: '',
    personalBankBalance: '',
    businessBankName: '',
    businessBankBalance: '',
    usCitizen: '',
    savingsAccount: '',
    investmentAccounts: '',
    militaryAffiliation: '',
    otherIncome: '',
    otherAssets: '',
    banksToIgnore: [] as string[],
    
    // Document Uploads
    driverLicenseFile: null as File | null,
    einConfirmationFile: null as File | null,
    articlesFromStateFile: null as File | null
  });
  
  // Pay Down modal state
  const [paydownDialogOpen, setPaydownDialogOpen] = useState(false);
  const [selectedPaydownAccount, setSelectedPaydownAccount] = useState<{ creditor: string; accountNumber?: string; limit: number; balance: number; opened?: any } | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<number>(30);
  // Default targets aligned with Pay Down table
  const paydownTargets = [30, 25, 20, 15, 10, 5, 0];
  
  // Calculate debt utilization from real account data
  const calculateDebtUtilization = (accounts) => {
    const utilizationByBureau = {
      1: { // TransUnion
        openRevolvingBalance: 0,
        openRevolvingLimit: 0,
        allRevolvingBalance: 0,
        allRevolvingLimit: 0,
        realEstateDebt: 0,
        installmentDebt: 0
      },
      2: { // Equifax
        openRevolvingBalance: 0,
        openRevolvingLimit: 0,
        allRevolvingBalance: 0,
        allRevolvingLimit: 0,
        realEstateDebt: 0,
        installmentDebt: 0
      },
      3: { // Experian
        openRevolvingBalance: 0,
        openRevolvingLimit: 0,
        allRevolvingBalance: 0,
        allRevolvingLimit: 0,
        realEstateDebt: 0,
        installmentDebt: 0
      }
    };

    if (!accounts || !Array.isArray(accounts)) {
      return utilizationByBureau;
    }

    accounts.forEach(account => {
      const bureauId = account.BureauId;
      const currentBalance = parseFloat(account.CurrentBalance) || 0;
      const creditLimit = parseFloat(account.CreditLimit) || 0;
      const highBalance = parseFloat(account.HighBalance) || 0;
      
      if (!utilizationByBureau[bureauId]) return;

      // Revolving accounts (credit cards, lines of credit)
      if (
        account.CreditType === 'Revolving Account' ||
        account.AccountTypeDescription === 'Revolving Account' ||
        String(account.CreditType || '').toLowerCase().includes('credit card') ||
        String(account.AccountTypeDescription || '').toLowerCase().includes('credit card') ||
        String(account.AccountType || '').toLowerCase().includes('credit card')
      ) {
        // All revolving accounts
        utilizationByBureau[bureauId].allRevolvingBalance += currentBalance;
        utilizationByBureau[bureauId].allRevolvingLimit += creditLimit || highBalance;
        
        // Open revolving accounts only
        if (account.AccountStatus === 'Open' || account.AccountStatus === 'Current') {
          utilizationByBureau[bureauId].openRevolvingBalance += currentBalance;
          utilizationByBureau[bureauId].openRevolvingLimit += creditLimit || highBalance;
        }
      }
      
      // Real estate debt (mortgages)
      if (account.AccountType === 'Mortgage' || account.Industry?.includes('Real Estate') || 
          account.CreditorName?.toLowerCase().includes('mortgage')) {
        if (account.AccountStatus === 'Open' || account.AccountStatus === 'Current') {
          utilizationByBureau[bureauId].realEstateDebt += currentBalance;
        }
      }
      
      // Installment debt (auto loans, personal loans, etc.)
      if (account.CreditType === 'Installment Account' || account.AccountTypeDescription === 'Installment Account') {
        if (account.AccountStatus === 'Open' || account.AccountStatus === 'Current') {
          utilizationByBureau[bureauId].installmentDebt += currentBalance;
        }
      }
    });

    Object.keys(utilizationByBureau).forEach((key) => {
      const b: any = (utilizationByBureau as any)[key];
      const openLimit = b.openRevolvingLimit || 0;
      const allLimit = b.allRevolvingLimit || 0;
      b.openRevolvingUtilization = openLimit > 0 ? (b.openRevolvingBalance / openLimit) * 100 : null;
      b.allRevolvingUtilization = allLimit > 0 ? (b.allRevolvingBalance / allLimit) * 100 : null;
    });

    return utilizationByBureau;
  };

  // Get dynamic debt utilization data
  const getDebtUtilizationData = () => {
    if (!apiData?.Accounts) {
      // Return default structure if no account data
      return {
        1: { openRevolvingBalance: 0, openRevolvingLimit: 0, allRevolvingBalance: 0, allRevolvingLimit: 0, realEstateDebt: 0, installmentDebt: 0 },
        2: { openRevolvingBalance: 0, openRevolvingLimit: 0, allRevolvingBalance: 0, allRevolvingLimit: 0, realEstateDebt: 0, installmentDebt: 0 },
        3: { openRevolvingBalance: 0, openRevolvingLimit: 0, allRevolvingBalance: 0, allRevolvingLimit: 0, realEstateDebt: 0, installmentDebt: 0 }
      };
    }
    
    return calculateDebtUtilization(apiData.Accounts);
  };

  // Form validation functions
  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};
    
    switch (step) {
      case 1: // Business Information
        if (!formData.titlePosition.trim()) errors.titlePosition = 'Title/Position is required';
        if (!formData.fundingAmount.trim()) errors.fundingAmount = 'Funding amount is required';
        if (!formData.intendedUse.trim()) errors.intendedUse = 'Intended use is required';
        if (!formData.businessName.trim()) errors.businessName = 'Business name is required';
        if (!formData.businessPhone.trim()) errors.businessPhone = 'Business phone is required';
        if (!formData.businessEmail.trim()) errors.businessEmail = 'Business email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.businessEmail)) errors.businessEmail = 'Invalid email format';
        if (!formData.businessAddress.trim()) errors.businessAddress = 'Business address is required';
        if (!formData.city.trim()) errors.city = 'City is required';
        if (!formData.state.trim()) errors.state = 'State is required';
        if (!formData.zip.trim()) errors.zip = 'ZIP code is required';
        if (!formData.dateCommenced.trim()) errors.dateCommenced = 'Business start date is required';
        if (!formData.businessIndustry.trim()) errors.businessIndustry = 'Business industry is required';
        if (!formData.entityType.trim()) errors.entityType = 'Entity type is required';
        if (!formData.numberOfEmployees.trim()) errors.numberOfEmployees = 'Number of employees is required';
        break;
        
      case 2: // Personal Information
        if (!formData.firstName.trim()) errors.firstName = 'First name is required';
        if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
        if (!formData.dateOfBirth.trim()) errors.dateOfBirth = 'Date of birth is required';
        if (!formData.ssn.trim()) errors.ssn = 'SSN is required';
        if (!formData.homeAddress.trim()) errors.homeAddress = 'Home address is required';
        if (!formData.personalCity.trim()) errors.personalCity = 'City is required';
        if (!formData.personalState.trim()) errors.personalState = 'State is required';
        if (!formData.personalZip.trim()) errors.personalZip = 'ZIP code is required';
        if (!formData.mobilePhone.trim()) errors.mobilePhone = 'Mobile phone is required';
        if (!formData.housingStatus.trim()) errors.housingStatus = 'Housing status is required';
        if (!formData.driversLicense.trim()) errors.driversLicense = 'Driver\'s license is required';
        if (!formData.issuingState.trim()) errors.issuingState = 'Issuing state is required';
        break;
        
      case 3: // Employment Information
        if (!formData.currentEmployer.trim()) errors.currentEmployer = 'Current employer is required';
        if (!formData.position.trim()) errors.position = 'Position is required';
        if (!formData.yearsAtEmployer.trim()) errors.yearsAtEmployer = 'Years at employer is required';
        if (!formData.employerPhone.trim()) errors.employerPhone = 'Employer phone is required';
        break;
        
      case 4: // Financial Information
        if (!formData.personalBankName.trim()) errors.personalBankName = 'Personal bank name is required';
        if (!formData.personalBankBalance.trim()) errors.personalBankBalance = 'Personal bank balance is required';
        if (!formData.businessBankName.trim()) errors.businessBankName = 'Business bank name is required';
        if (!formData.businessBankBalance.trim()) errors.businessBankBalance = 'Business bank balance is required';
        if (!formData.usCitizen) errors.usCitizen = 'US citizenship status is required';
        if (!formData.savingsAccount) errors.savingsAccount = 'Savings account status is required';
        if (!formData.investmentAccounts) errors.investmentAccounts = 'Investment accounts status is required';
        if (!formData.militaryAffiliation) errors.militaryAffiliation = 'Military affiliation status is required';
        if (!formData.otherIncome) errors.otherIncome = 'Other income status is required';
        if (!formData.otherAssets) errors.otherAssets = 'Other assets status is required';
        break;
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleStepNavigation = (direction: 'next' | 'prev' | 'forward' | 'back') => {
    if (direction === 'next' || direction === 'forward') {
      if (validateStep(currentStep)) {
        if (currentStep < 4) {
          setCurrentStep(currentStep + 1);
        } else {
          handleFormSubmission();
        }
      }
    } else if (direction === 'prev' || direction === 'back') {
      if (currentStep > 1) {
        setCurrentStep(currentStep - 1);
        setFormErrors({}); // Clear errors when going back
      } else {
        setFundingOption(null);
        setCurrentStep(1);
        setFormErrors({});
      }
    }
  };

  const handleFormSubmission = async () => {
    if (!validateStep(4)) return;
    
    setIsSubmitting(true);
    try {
      // Prepare the data for submission to funding_requests table
      const submissionData = {
        // Basic funding request fields
        title: `${formData.businessName || 'Business'} - Done for You Funding Request`,
        description: `Done for You funding application for ${formData.businessName || 'business'} requesting $${formData.fundingAmount} for ${formData.intendedUse}`,
        amount: parseFloat(formData.fundingAmount) || 0,
        purpose: 'other', // Since this is a comprehensive application
        priority: 'medium',
        funding_type: 'done-for-you',
        
        // Business Information
        title_position: formData.titlePosition,
        intended_use: formData.intendedUse,
        business_name: formData.businessName,
        business_phone: formData.businessPhone,
        business_email: formData.businessEmail,
        business_address: formData.businessAddress,
        business_city: formData.city,
        business_state: formData.state,
        business_zip: formData.zip,
        date_commenced: formData.dateCommenced,
        business_website: formData.businessWebsite,
        business_industry: formData.businessIndustry,
        entity_type: formData.entityType,
        incorporation_state: formData.incorporationState,
        number_of_employees: parseInt(formData.numberOfEmployees) || null,
        ein: formData.ein,
        monthly_gross_sales: parseFloat(formData.monthlyGrossSales) || null,
        projected_annual_revenue: parseFloat(formData.projectedAnnualRevenue) || null,
        
        // Personal Information
        first_name: formData.firstName,
        middle_name: formData.middleName,
        last_name: formData.lastName,
        date_of_birth: formData.dateOfBirth,
        birth_city: formData.birthCity,
        ssn: formData.ssn,
        mothers_maiden_name: formData.mothersMaidenName,
        home_address: formData.homeAddress,
        personal_city: formData.personalCity,
        personal_state: formData.personalState,
        personal_zip: formData.personalZip,
        home_phone: formData.homePhone,
        mobile_phone: formData.mobilePhone,
        housing_status: formData.housingStatus,
        monthly_housing_payment: parseFloat(formData.monthlyHousingPayment) || null,
        years_at_address: parseFloat(formData.yearsAtAddress) || null,
        drivers_license: formData.driversLicense,
        issuing_state: formData.issuingState,
        issue_date: formData.issueDate,
        expiration_date: formData.expirationDate,
        
        // Employment Information
        current_employer: formData.currentEmployer,
        position: formData.position,
        years_at_employer: parseFloat(formData.yearsAtEmployer) || null,
        employer_phone: formData.employerPhone,
        employer_address: formData.employerAddress,
        
        // Financial Information
        personal_bank_name: formData.personalBankName,
        personal_bank_balance: parseFloat(formData.personalBankBalance) || null,
        business_bank_name: formData.businessBankName,
        business_bank_balance: parseFloat(formData.businessBankBalance) || null,
        us_citizen: formData.usCitizen,
        savings_account: formData.savingsAccount,
        investment_accounts: formData.investmentAccounts,
        military_affiliation: formData.militaryAffiliation,
        other_income: formData.otherIncome,
        other_assets: formData.otherAssets,
        banks_to_ignore: formData.banksToIgnore
      };

      // Submit to funding requests API
      const response = await fetch('/api/funding-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(submissionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit funding request');
      }

      const result = await response.json();
      console.log('Funding request submitted successfully:', result);
      
      // Upload documents if any files are selected
      if (formData.driverLicenseFile || formData.einConfirmationFile || formData.articlesFromStateFile) {
        try {
          const formDataUpload = new FormData();
          formDataUpload.append('requestId', result.id.toString());
          
          if (formData.driverLicenseFile) {
            formDataUpload.append('driverLicenseFile', formData.driverLicenseFile);
          }
          if (formData.einConfirmationFile) {
            formDataUpload.append('einConfirmationFile', formData.einConfirmationFile);
          }
          if (formData.articlesFromStateFile) {
            formDataUpload.append('articlesFromStateFile', formData.articlesFromStateFile);
          }
          
          const uploadResponse = await fetch('/api/funding-requests/upload-documents', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: formDataUpload
          });
          
          if (!uploadResponse.ok) {
            const uploadError = await uploadResponse.json();
            console.error('Document upload failed:', uploadError);
            alert('Funding request submitted successfully, but document upload failed. Please contact support.');
          } else {
            const uploadResult = await uploadResponse.json();
            console.log('Documents uploaded successfully:', uploadResult);
          }
        } catch (uploadError) {
          console.error('Document upload error:', uploadError);
          alert('Funding request submitted successfully, but document upload failed. Please contact support.');
        }
      }
      
      // Show success message and close modal
      setShowFundingModal(false);
      setFundingOption(null);
      setCurrentStep(1);
      setFormData({
        titlePosition: '', fundingAmount: '', intendedUse: '', businessName: '', businessPhone: '', businessEmail: '',
        businessAddress: '', city: '', state: '', zip: '', dateCommenced: '', businessWebsite: '', businessIndustry: '',
        entityType: '', incorporationState: '', numberOfEmployees: '', ein: '', monthlyGrossSales: '', projectedAnnualRevenue: '',
        firstName: '', middleName: '', lastName: '', dateOfBirth: '', birthCity: '', ssn: '', mothersMaidenName: '',
        homeAddress: '', personalCity: '', personalState: '', personalZip: '', homePhone: '', mobilePhone: '',
        housingStatus: '', monthlyHousingPayment: '', yearsAtAddress: '', driversLicense: '', issuingState: '',
        issueDate: '', expirationDate: '', currentEmployer: '', position: '', yearsAtEmployer: '', employerPhone: '',
        employerAddress: '', personalBankName: '', personalBankBalance: '', businessBankName: '', businessBankBalance: '',
        usCitizen: '', savingsAccount: '', investmentAccounts: '', militaryAffiliation: '', otherIncome: '', otherAssets: '',
        banksToIgnore: [], driverLicenseFile: null, einConfirmationFile: null, articlesFromStateFile: null
      });
      setFormErrors({});
      
      // Show success notification
      alert('Your Done for You funding request has been submitted successfully!');
    } catch (error) {
      console.error('Form submission error:', error);
      alert(`Error submitting funding request: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Add a debug effect to monitor reportData changes
  useEffect(() => {
    console.log('🔍 DEBUG: reportData state changed:', reportData.scores);
  }, [reportData]);

  // Download Analysis tab as PDF without splitting sections
  const downloadAnalysisPdf = async () => {
    try {
      if (activeTab !== 'analysis') return;
      const el = analysisRef.current;
      if (!el) return;
      const html2pdf = (await import('html2pdf.js')).default;
      const opt = {
        margin: [15, 15],
        filename: 'CreditReport-Analysis.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['.pdf-avoid-break', '.analysis-pdf-root > *'] }
      } as any;
      await (html2pdf() as any).set(opt).from(el).save();
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Scoring Model State
  const [compareMode, setCompareMode] = useState<'personal' | 'business' | 'both'>('both');
  const [dynamicFundingData, setDynamicFundingData] = useState(null);
  const [gapAnalysisData, setGapAnalysisData] = useState(null);

  // Calculate dynamic funding projections when report data changes
  useEffect(() => {
    if (reportData && reportData.accounts && reportData.accounts.length > 0) {
      try {
        console.log('🔍 DEBUG: Calculating dynamic funding projections...');
        
        // Initialize funding calculator with credit report data
        const fundingCalculator = new FundingProjectionsCalculator(reportData);
        const projections = fundingCalculator.getAllProjections();
        
        // Validate projections structure
        if (!projections || typeof projections !== 'object') {
          throw new Error('Invalid projections structure');
        }
        
        // Initialize gap analyzer
        const gapAnalyzer = new GapAnalyzer();
        const avgCreditScore = Math.round((reportData.scores.experian + reportData.scores.transunion + reportData.scores.equifax) / 3);
        const gapAnalysis = gapAnalyzer.getComprehensiveAnalysis(projections, avgCreditScore);
        
        // Validate gap analysis structure
        if (!gapAnalysis || typeof gapAnalysis !== 'object') {
          throw new Error('Invalid gap analysis structure');
        }
        
        // Ensure improvementRoadmap has the correct structure
        if (gapAnalysis.improvementRoadmap && typeof gapAnalysis.improvementRoadmap === 'object') {
          // Ensure all roadmap arrays exist
          if (!Array.isArray(gapAnalysis.improvementRoadmap.immediate)) {
            gapAnalysis.improvementRoadmap.immediate = [];
          }
          if (!Array.isArray(gapAnalysis.improvementRoadmap.shortTerm)) {
            gapAnalysis.improvementRoadmap.shortTerm = [];
          }
          if (!Array.isArray(gapAnalysis.improvementRoadmap.longTerm)) {
            gapAnalysis.improvementRoadmap.longTerm = [];
          }
        } else {
          // Create default roadmap structure if missing
          gapAnalysis.improvementRoadmap = {
            immediate: [],
            shortTerm: [],
            longTerm: []
          };
        }
        
        // Validate personal and business data structures
        if (!gapAnalysis.personal || typeof gapAnalysis.personal !== 'object') {
          gapAnalysis.personal = {
            currentFunding: 0,
            benchmarkFunding: 0,
            fundingGap: 0,
            utilizationGap: { current: 0, optimal: 0 },
            creditAgeGap: { current: 0 }
          };
        }
        
        if (!gapAnalysis.business || typeof gapAnalysis.business !== 'object') {
          gapAnalysis.business = {
            currentFunding: 0,
            benchmarkFunding: 0,
            fundingGap: 0,
            einStatus: 'Unknown',
            riskLevel: 'Medium'
          };
        }
        
        setDynamicFundingData(projections);
        setGapAnalysisData(gapAnalysis);
        
        console.log('🔍 DEBUG: Dynamic funding projections calculated:', projections);
        console.log('🔍 DEBUG: Gap analysis completed:', gapAnalysis);
      } catch (error) {
        console.error('Error calculating dynamic funding projections:', error);
        // Fallback to mock data if calculation fails
        setDynamicFundingData(null);
        setGapAnalysisData(null);
      }
    }
  }, [reportData]);

  // Calculate actual credit age from account data
  const calculateCreditAge = () => {
    if (!reportData.accounts || reportData.accounts.length === 0) {
      return "No accounts";
    }

    const currentDate = new Date();
    let totalMonths = 0;
    let validAccounts = 0;

    reportData.accounts.forEach((account: any) => {
      const dateOpened = account.DateOpened || account.dateOpened || account.opened;
      if (dateOpened) {
        const openDate = new Date(dateOpened);
        if (!isNaN(openDate.getTime())) {
          const monthsDiff = (currentDate.getFullYear() - openDate.getFullYear()) * 12 + 
                            (currentDate.getMonth() - openDate.getMonth());
          if (monthsDiff >= 0) {
            totalMonths += monthsDiff;
            validAccounts++;
          }
        }
      }
    });

    if (validAccounts === 0) {
      return "No valid accounts";
    }

    const averageMonths = Math.round(totalMonths / validAccounts);
    const years = Math.floor(averageMonths / 12);
    const months = averageMonths % 12;

    if (years === 0) {
      return `${months} month${months !== 1 ? 's' : ''}`;
    } else if (months === 0) {
      return `${years} year${years !== 1 ? 's' : ''}`;
    } else {
      return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
    }
  };

  // Calculate actual credit utilization from account data
  const calculateUtilization = () => {
    if (!reportData.accounts || reportData.accounts.length === 0) {
      return 0;
    }

    let totalRevolvingBalance = 0;
    let totalRevolvingLimit = 0;
    let totalInstallmentUtilization = 0;
    let installmentAccountCount = 0;

    reportData.accounts.forEach((account: any) => {
      const utilization = calculateAccountUtilization(account);
      
      if (utilization !== null) {
        const accountType = account.CreditType || account.type || account.AccountType || '';
        
        if (accountType.toLowerCase().includes('revolving') || accountType.toLowerCase().includes('credit card')) {
          const balance = parseFloat(account.CurrentBalance || account.balance || '0');
          const limit = parseFloat(account.CreditLimit || account.limit || account.creditLimit || '0');
          
          if (!isNaN(balance) && !isNaN(limit) && limit > 0) {
            totalRevolvingBalance += balance;
            totalRevolvingLimit += limit;
          }
        } else if (
          accountType.toLowerCase().includes('installment') ||
          accountType.toLowerCase().includes('loan') ||
          accountType.toLowerCase().includes('mortgage') ||
          (account.Industry && String(account.Industry).toLowerCase().includes('real estate'))
        ) {
          totalInstallmentUtilization += utilization;
          installmentAccountCount++;
        }
      }
    });

    // Calculate overall utilization
    let overallUtilization = 0;
    
    if (totalRevolvingLimit > 0) {
      const revolvingUtilization = (totalRevolvingBalance / totalRevolvingLimit) * 100;
      
      if (installmentAccountCount > 0) {
        const avgInstallmentUtilization = totalInstallmentUtilization / installmentAccountCount;
        // Weight revolving accounts more heavily (70%) than installment accounts (30%)
        overallUtilization = (revolvingUtilization * 0.7) + (avgInstallmentUtilization * 0.3);
      } else {
        overallUtilization = revolvingUtilization;
      }
    } else if (installmentAccountCount > 0) {
      overallUtilization = totalInstallmentUtilization / installmentAccountCount;
    }

    return Math.round(overallUtilization);
  };

  // Calculate utilization for OPEN revolving accounts across all bureaus
  const calculateOpenRevolvingUtilization = () => {
    const accounts = reportData?.accounts || [];
    if (accounts.length === 0) return 0;

    let totalBalance = 0;
    let totalLimit = 0;

    accounts.forEach((acc: any) => {
      const typeText = (acc.CreditType || acc.AccountTypeDescription || acc.AccountType || acc.type || '').toString().toLowerCase();
      const statusText = (acc.AccountStatus || acc.AccountCondition || acc.status || '').toString().toLowerCase();
      const isRevolving = /revolving|credit\s*card/.test(typeText);
      const isOpen = statusText.includes('open');
      if (!isRevolving || !isOpen) return;

      const balanceRaw = acc.CurrentBalance ?? acc.balance ?? acc.Balance;
      const limitRaw = acc.CreditLimit ?? acc.limit ?? acc.HighBalance ?? acc.creditLimit;

      const balance = parseFloat(String(balanceRaw ?? '0'));
      const limit = parseFloat(String(limitRaw ?? '0'));

      if (!isNaN(balance) && !isNaN(limit) && limit > 0 && balance >= 0) {
        totalBalance += balance;
        totalLimit += limit;
      }
    });

    if (totalLimit <= 0) return 0;
    return Math.round((totalBalance / totalLimit) * 100);
  };

  // Calculate actual funding projections using credit signals and funding logic
  const calculateFundingProjections = () => {
    if (!reportData.accounts || reportData.accounts.length === 0) {
      return {
        personal: {
          maxCards: 3,
          estimatedFunding: 15000,
          bureauLogic: "No account data available"
        },
        business: {
          maxCards: 2,
          estimatedFunding: 20000,
          bureauLogic: "No account data available"
        }
      };
    }

    // Extract credit signals from account data
    const accounts = reportData.accounts;
    const currentDate = new Date();
    
    // Calculate credit utilization
    const utilization = calculateUtilization();
    
    // Calculate average account age in months
    let totalMonths = 0;
    let validAccounts = 0;
    accounts.forEach((account: any) => {
      const dateOpened = account.DateOpened || account.dateOpened || account.opened;
      if (dateOpened) {
        const openDate = new Date(dateOpened);
        if (!isNaN(openDate.getTime())) {
          const monthsDiff = (currentDate.getFullYear() - openDate.getFullYear()) * 12 + 
                            (currentDate.getMonth() - openDate.getMonth());
          if (monthsDiff >= 0) {
            totalMonths += monthsDiff;
            validAccounts++;
          }
        }
      }
    });
    const averageAccountAge = validAccounts > 0 ? Math.round(totalMonths / validAccounts) : 0;
    
    // Count recent inquiries (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const recentInquiries = reportData.inquiries ? reportData.inquiries.filter((inquiry: any) => {
      const inquiryDate = new Date(inquiry.date);
      return inquiryDate >= sixMonthsAgo && inquiry.type === 'Hard';
    }).length : 0;
    
    // Count open revolving accounts
    const openRevolvingAccounts = accounts.filter((account: any) => {
      const accountType = account.CreditType || account.type || account.AccountType || '';
      const status = account.AccountStatus || account.status || '';
      return (accountType.toLowerCase().includes('revolving') || accountType.toLowerCase().includes('credit card')) &&
             (status.toLowerCase() === 'open' || status.toLowerCase() === 'current');
    });
    
    // Calculate total credit limits and balances
    let totalCreditLimit = 0;
    let totalBalance = 0;
    openRevolvingAccounts.forEach((account: any) => {
      const limit = parseFloat(account.CreditLimit || account.limit || account.creditLimit || '0');
      const balance = parseFloat(account.CurrentBalance || account.balance || '0');
      if (!isNaN(limit) && !isNaN(balance)) {
        totalCreditLimit += limit;
        totalBalance += balance;
      }
    });
    
    // Get average credit score
    const avgScore = reportData.scores ? 
      Math.round((parseInt(reportData.scores.experian) + parseInt(reportData.scores.transunion) + parseInt(reportData.scores.equifax)) / 3) : 700;
    
    // Calculate personal funding projection
    let personalMaxCards = 5; // Base number
    let personalEstimatedFunding = 25000; // Base funding
    
    // Adjust based on credit score
    if (avgScore >= 750) {
      personalMaxCards = Math.round(personalMaxCards * 1.5);
      personalEstimatedFunding = Math.round(personalEstimatedFunding * 2.5);
    } else if (avgScore >= 700) {
      personalMaxCards = Math.round(personalMaxCards * 1.3);
      personalEstimatedFunding = Math.round(personalEstimatedFunding * 2.0);
    } else if (avgScore >= 650) {
      personalMaxCards = Math.round(personalMaxCards * 1.1);
      personalEstimatedFunding = Math.round(personalEstimatedFunding * 1.5);
    }
    
    // Adjust based on utilization
    if (utilization <= 10) {
      personalMaxCards = Math.round(personalMaxCards * 1.2);
      personalEstimatedFunding = Math.round(personalEstimatedFunding * 1.3);
    } else if (utilization > 30) {
      personalMaxCards = Math.round(personalMaxCards * 0.8);
      personalEstimatedFunding = Math.round(personalEstimatedFunding * 0.7);
    }
    
    // Adjust based on account age
    if (averageAccountAge >= 36) { // 3+ years
      personalMaxCards = Math.round(personalMaxCards * 1.2);
      personalEstimatedFunding = Math.round(personalEstimatedFunding * 1.2);
    } else if (averageAccountAge < 12) { // Less than 1 year
      personalMaxCards = Math.round(personalMaxCards * 0.7);
      personalEstimatedFunding = Math.round(personalEstimatedFunding * 0.6);
    }
    
    // Adjust based on recent inquiries
    if (recentInquiries > 6) {
      personalMaxCards = Math.round(personalMaxCards * 0.6);
      personalEstimatedFunding = Math.round(personalEstimatedFunding * 0.6);
    } else if (recentInquiries <= 2) {
      personalMaxCards = Math.round(personalMaxCards * 1.1);
      personalEstimatedFunding = Math.round(personalEstimatedFunding * 1.1);
    }
    
    // Ensure reasonable bounds
    personalMaxCards = Math.max(2, Math.min(20, personalMaxCards));
    personalEstimatedFunding = Math.max(10000, Math.min(500000, personalEstimatedFunding));
    
    // Calculate business funding (typically higher limits)
    const businessMaxCards = Math.round(personalMaxCards * 0.8);
    const businessEstimatedFunding = Math.round(personalEstimatedFunding * 1.4);
    
    // Generate bureau logic descriptions
    const personalBureauLogic = `Score: ${avgScore}, Util: ${utilization}%, Age: ${Math.round(averageAccountAge/12)}y, Inq: ${recentInquiries}`;
    const businessBureauLogic = `EIN required, Score: ${avgScore}+, Business profile verified`;
    
    return {
      personal: {
        maxCards: personalMaxCards,
        estimatedFunding: personalEstimatedFunding,
        bureauLogic: personalBureauLogic
      },
      business: {
        maxCards: businessMaxCards,
        estimatedFunding: businessEstimatedFunding,
        bureauLogic: businessBureauLogic
      }
    };
  };

  // Comprehensive Audit-Ready Credit Analysis Functions
  const calculateAuditReadyAnalysis = (accounts: any[], inquiries: any, publicRecords: any[], avgScore: number) => {
    console.log('🔍 DEBUG: calculateAuditReadyAnalysis called with:', {
      accountsLength: accounts.length,
      inquiries,
      publicRecordsLength: publicRecords.length,
      avgScore
    });
    
    console.log('🔍 DEBUG: Sample account structure:', accounts[0]);
    console.log('🔍 DEBUG: All unique AccountStatus values:', [...new Set(accounts.map(a => a.AccountStatus))]);
    console.log('🔍 DEBUG: All unique CreditType values:', [...new Set(accounts.map(a => a.CreditType))]);
    console.log('🔍 DEBUG: All unique AccountTypeDescription values:', [...new Set(accounts.map(a => a.AccountTypeDescription))]);
    
    // Filter only open revolving accounts with positive limits - using correct field names from API
    const openRevolvingAccounts = accounts.filter(acc => {
      const isOpen = acc.AccountStatus === 'Open';
      const isRevolving = (
        acc.CreditType === 'Revolving Account' ||
        acc.AccountTypeDescription === 'Revolving Account' ||
        String(acc.CreditType || '').toLowerCase().includes('credit card') ||
        String(acc.AccountTypeDescription || '').toLowerCase().includes('credit card') ||
        String(acc.AccountType || '').toLowerCase().includes('credit card')
      );
      const hasLimit = parseFloat(acc.CreditLimit || '0') > 0;
      
      if (acc.CreditorName && acc.CreditorName.includes('CAPITAL')) {
        console.log('🔍 DEBUG: Sample filter check for', acc.CreditorName, {
          AccountStatus: acc.AccountStatus,
          CreditType: acc.CreditType,
          AccountTypeDescription: acc.AccountTypeDescription,
          CreditLimit: acc.CreditLimit,
          isOpen,
          isRevolving,
          hasLimit,
          passes: isOpen && isRevolving && hasLimit
        });
      }
      
      return isOpen && isRevolving && hasLimit;
    });

    console.log('🔍 DEBUG: Open revolving accounts found:', openRevolvingAccounts.length);
    console.log('🔍 DEBUG: Sample filtered account:', openRevolvingAccounts[0]);

    // Dedupe obvious bureau duplicates (same lender + same limit)
    const deduplicatedAccounts = openRevolvingAccounts.reduce((unique: any[], account: any) => {
      const creditorName = account.CreditorName || '';
      const creditLimit = parseFloat(account.CreditLimit || '0');
      
      const isDuplicate = unique.some(existing => {
        const existingCreditor = existing.CreditorName || '';
        const existingLimit = parseFloat(existing.CreditLimit || '0');
        return existingCreditor === creditorName && Math.abs(existingLimit - creditLimit) < 100;
      });
      
      if (!isDuplicate) {
        unique.push(account);
      }
      return unique;
    }, []);

    console.log('🔍 DEBUG: Deduplicated accounts:', deduplicatedAccounts.length);

    // Calculate key signals using correct field names
    const totalAggregateLimit = deduplicatedAccounts.reduce((sum, acc) => 
      sum + parseFloat(acc.CreditLimit || '0'), 0);
    
    const highestSingleLimit = Math.max(...deduplicatedAccounts.map(acc => 
      parseFloat(acc.CreditLimit || '0')), 0);

    console.log('🔍 DEBUG: Total aggregate limit:', totalAggregateLimit);
    console.log('🔍 DEBUG: Highest single limit:', highestSingleLimit);

    const signals = {
      totalAggregateLimit,
      highestSingleLimit,
      highLimitTradelines: {
        over10k: deduplicatedAccounts.filter(acc => 
          parseFloat(acc.CreditLimit || '0') >= 10000).length,
        over25k: deduplicatedAccounts.filter(acc => 
          parseFloat(acc.CreditLimit || '0') >= 25000).length
      },
      averageUtilization: deduplicatedAccounts.length > 0 ? 
        deduplicatedAccounts.reduce((sum, acc) => {
          const balance = parseFloat(acc.CurrentBalance || '0');
          const limit = parseFloat(acc.CreditLimit || '0');
          return sum + (limit > 0 ? (balance / limit) * 100 : 0);
        }, 0) / deduplicatedAccounts.length : 0,
      openRevolvingCount: deduplicatedAccounts.length,
      averageAccountAge: deduplicatedAccounts.length > 0 ?
        deduplicatedAccounts.reduce((sum, acc) => {
          const openDate = new Date(acc.DateOpened || '2020-01-01');
          const monthsOpen = Math.max(0, Math.floor((Date.now() - openDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
          return sum + monthsOpen;
        }, 0) / deduplicatedAccounts.length : 0,
      inquiriesByBureau: {
        equifax: (inquiries && inquiries.equifax) || 0,
        experian: (inquiries && inquiries.experian) || 0,
        transunion: (inquiries && inquiries.transunion) || 0,
        total: ((inquiries && inquiries.equifax) || 0) + ((inquiries && inquiries.experian) || 0) + ((inquiries && inquiries.transunion) || 0)
      },
      inquiryHeadroom: {
        equifax: Math.max(0, 4 - ((inquiries && inquiries.equifax) || 0)),
        experian: Math.max(0, 4 - ((inquiries && inquiries.experian) || 0)),
        transunion: Math.max(0, 4 - ((inquiries && inquiries.transunion) || 0))
      },
      installmentLoad: accounts.filter(acc => 
        acc.CreditType === 'Installment' && acc.AccountStatus === 'Open')
        .reduce((sum, acc) => {
          const balance = parseFloat(acc.CurrentBalance || '0');
          const original = parseFloat(acc.HighBalance || '1');
          return sum + (original > 0 ? balance / original : 0);
        }, 0) / Math.max(1, accounts.filter(acc => 
          acc.CreditType === 'Installment' && acc.AccountStatus === 'Open').length),
      latePaymentCounts: {
        late30: accounts.reduce((sum, acc) => {
          // Count 30-day lates from PayStatusHistory (look for '1' characters)
          const history = acc.PayStatusHistory || '';
          const late30Count = (history.match(/1/g) || []).length;
          return sum + late30Count;
        }, 0),
        late60: accounts.reduce((sum, acc) => {
          // Count 60-day lates from PayStatusHistory (look for '2' characters)
          const history = acc.PayStatusHistory || '';
          const late60Count = (history.match(/2/g) || []).length;
          return sum + late60Count;
        }, 0),
        late90: accounts.reduce((sum, acc) => {
          // Count 90-day lates from PayStatusHistory (look for '3' characters)
          const history = acc.PayStatusHistory || '';
          const late90Count = (history.match(/3/g) || []).length;
          return sum + late90Count;
        }, 0)
      },
      hasDerogatory: (publicRecords && publicRecords.length > 0) || accounts.some(acc => 
        (acc.PaymentStatus && (acc.PaymentStatus.includes('Charge') || acc.PaymentStatus.includes('Collection'))) ||
        (acc.AccountStatus && acc.AccountStatus.includes('Charged Off'))
      ),
      hasMortgage: accounts.some(acc => 
        acc.CreditType === 'Mortgage' && acc.AccountStatus === 'Open')
    };

    // Calculate Implied Capacity Index (ICI)
    const supplyScore = Math.min(100, 
      (signals.totalAggregateLimit / 100000) * 30 +
      (signals.highestSingleLimit / 50000) * 20 +
      (signals.openRevolvingCount / 10) * 15 +
      (signals.highLimitTradelines.over10k / 5) * 10 +
      (signals.highLimitTradelines.over25k / 3) * 25
    );

    const behaviorScore = Math.min(100,
      Math.max(0, 100 - signals.averageUtilization) * 0.4 +
      Math.max(0, 100 - (signals.latePaymentCounts.late30 * 10 + signals.latePaymentCounts.late60 * 20 + signals.latePaymentCounts.late90 * 30)) * 0.3 +
      Math.max(0, 100 - (signals.inquiriesByBureau.total * 5)) * 0.2 +
      Math.max(0, 100 - (signals.installmentLoad * 100)) * 0.1
    );

    const seasoningScore = Math.min(100,
      (signals.averageAccountAge / 120) * 70 + // 120 months = 10 years for max score
      (signals.hasMortgage ? 30 : 0)
    );

    const ici = (supplyScore * 0.4 + behaviorScore * 0.4 + seasoningScore * 0.2) / 100;
    
    // Calculate Credit Decay based on inquiry count using exponential decay formula
    const calculateCreditDecay = (inquiryCount: number): { decayFactor: number, decayPercentage: number } => {
      // Exponential decay formula: 0.95^inquiries
      const decayFactor = Math.pow(0.95, inquiryCount);
      const decayPercentage = (1 - decayFactor) * 100; // Convert to percentage
      
      return {
        decayFactor,
        decayPercentage
      };
    };

    // Apply credit decay to bureau-specific limits
    const applyBureauDecay = (baseLimit: number, bureauInquiries: number): number => {
      const { decayFactor } = calculateCreditDecay(bureauInquiries);
      const finalLimit = baseLimit * decayFactor;
      return Math.floor(finalLimit / 5000) * 5000; // Round to nearest $5k
    };

    // Calculate Anchor Exposure
    const anchorExposure = ici * (signals.totalAggregateLimit + signals.highestSingleLimit);

    // Product mapping with $5k rounding
    const personalCardAmount = Math.floor((anchorExposure * 0.15) / 5000) * 5000;
    const businessCardAmount = Math.floor((anchorExposure * 0.22) / 5000) * 5000;

    // Calculate bureau-specific limits with decay
    const bureauLimits = {
      equifax: {
        baseLimit: personalCardAmount,
        inquiries: signals.inquiriesByBureau.equifax,
        decay: calculateCreditDecay(signals.inquiriesByBureau.equifax),
        finalLimit: applyBureauDecay(personalCardAmount, signals.inquiriesByBureau.equifax)
      },
      experian: {
        baseLimit: personalCardAmount,
        inquiries: signals.inquiriesByBureau.experian,
        decay: calculateCreditDecay(signals.inquiriesByBureau.experian),
        finalLimit: applyBureauDecay(personalCardAmount, signals.inquiriesByBureau.experian)
      },
      transunion: {
        baseLimit: personalCardAmount,
        inquiries: signals.inquiriesByBureau.transunion,
        decay: calculateCreditDecay(signals.inquiriesByBureau.transunion),
        finalLimit: applyBureauDecay(personalCardAmount, signals.inquiriesByBureau.transunion)
      }
    };

    const totalPotentialLimit = bureauLimits.equifax.finalLimit + 
                               bureauLimits.experian.finalLimit + 
                               bureauLimits.transunion.finalLimit;

    console.log('🔍 DEBUG: Credit Decay Analysis:', {
      basePersonalLimit: personalCardAmount,
      bureauLimits,
      totalPotentialLimit
    });

    // Multi-card discount policy
    const calculateMultiCardAmounts = (singleAmount: number, maxCards: number) => {
      const discounts = [1.0, 0.75, 0.60, 0.50]; // 1st, 2nd, 3rd, 4th card
      const amounts = [];
      for (let i = 0; i < Math.min(maxCards, 4); i++) {
        const cardAmount = Math.floor((singleAmount * discounts[i]) / 5000) * 5000;
        amounts.push(cardAmount);
      }
      return amounts;
    };

    // Determine optimal bureau routing
    const bureausByInquiries = [
      { name: 'Equifax', inquiries: signals.inquiriesByBureau.equifax, headroom: signals.inquiryHeadroom.equifax },
      { name: 'Experian', inquiries: signals.inquiriesByBureau.experian, headroom: signals.inquiryHeadroom.experian },
      { name: 'TransUnion', inquiries: signals.inquiriesByBureau.transunion, headroom: signals.inquiryHeadroom.transunion }
    ].sort((a, b) => b.headroom - a.headroom);

    // Calculate max cards by inquiry headroom
    const totalHeadroom = signals.inquiryHeadroom.equifax + signals.inquiryHeadroom.experian + signals.inquiryHeadroom.transunion;
    const maxCardsByInquiries = Math.min(12, totalHeadroom);

    // Generate scenarios
    const personalSingle = personalCardAmount;
    const personalMulti = calculateMultiCardAmounts(personalCardAmount, 2);
    const businessSingle = businessCardAmount;
    const businessMulti = calculateMultiCardAmounts(businessCardAmount, 2);

    // Max scenario (12-card if all bureaus clean)
    const maxScenarioCards = maxCardsByInquiries;
    const maxScenarioPersonal = calculateMultiCardAmounts(personalCardAmount, Math.min(4, Math.floor(maxScenarioCards / 2)));
    const maxScenarioBusiness = calculateMultiCardAmounts(businessCardAmount, Math.min(4, Math.ceil(maxScenarioCards / 2)));

    return {
      signals,
      ici,
      anchorExposure,
      creditDecay: {
        bureauLimits,
        totalPotentialLimit,
        decayAnalysis: {
          equifax: {
            inquiries: signals.inquiriesByBureau.equifax,
            decayFactor: bureauLimits.equifax.decay || 1,
            decayPercentage: ((1 - (bureauLimits.equifax.decay || 1)) * 100),
            limitReduction: bureauLimits.equifax.baseLimit - bureauLimits.equifax.finalLimit
          },
          experian: {
            inquiries: signals.inquiriesByBureau.experian,
            decayFactor: bureauLimits.experian.decay || 1,
            decayPercentage: ((1 - (bureauLimits.experian.decay || 1)) * 100),
            limitReduction: bureauLimits.experian.baseLimit - bureauLimits.experian.finalLimit
          },
          transunion: {
            inquiries: signals.inquiriesByBureau.transunion,
            decayFactor: bureauLimits.transunion.decay || 1,
            decayPercentage: ((1 - (bureauLimits.transunion.decay || 1)) * 100),
            limitReduction: bureauLimits.transunion.baseLimit - bureauLimits.transunion.finalLimit
          }
        }
      },
      scenarios: {
        personalSingle: { amount: personalSingle, cards: 1 },
        personalMulti: { amounts: personalMulti, cards: personalMulti.length, total: personalMulti.reduce((sum, amt) => sum + amt, 0) },
        businessSingle: { amount: businessSingle, cards: 1 },
        businessMulti: { amounts: businessMulti, cards: businessMulti.length, total: businessMulti.reduce((sum, amt) => sum + amt, 0) },
        maxByInquiries: {
          cards: maxScenarioCards,
          personal: { amounts: maxScenarioPersonal, total: maxScenarioPersonal.reduce((sum, amt) => sum + amt, 0) },
          business: { amounts: maxScenarioBusiness, total: maxScenarioBusiness.reduce((sum, amt) => sum + amt, 0) },
          grandTotal: maxScenarioPersonal.reduce((sum, amt) => sum + amt, 0) + maxScenarioBusiness.reduce((sum, amt) => sum + amt, 0)
        }
      },
      bureauRouting: {
        primary: bureausByInquiries[0],
        secondary: bureausByInquiries[1],
        tertiary: bureausByInquiries[2],
        strategy: maxCardsByInquiries === 12 ? 'round-robin across all three bureaus' : `focus on ${bureausByInquiries[0].name} and ${bureausByInquiries[1].name}`
      }
    };
  };

  // Mock data for scoring model (fallback when dynamic data is not available)
  const scoringModelData = {
    userProfile: {
      scoreEquifax: dynamicFundingData ? reportData.scores.equifax : 720,
      scoreTransUnion: dynamicFundingData ? reportData.scores.transunion : 710,
      scoreExperian: dynamicFundingData ? reportData.scores.experian : 700,
      inquiries: {
        equifax: reportData.inquiries ? reportData.inquiries.filter(inquiry => inquiry.bureau === 'Equifax').length : 0,
        transunion: reportData.inquiries ? reportData.inquiries.filter(inquiry => inquiry.bureau === 'TransUnion').length : 0,
        experian: reportData.inquiries ? reportData.inquiries.filter(inquiry => inquiry.bureau === 'Experian').length : 0
      },
      creditAge: calculateCreditAge(),
      utilization: calculateUtilization()
    },
    fundingProjection: calculateFundingProjections()
  };

  const clientName = searchParams.get("clientName") || "Client";
  const reportHistory = Array.isArray((reportData as any)?.reportHistory) ? (reportData as any).reportHistory : [];

  const parseLooseDate = (value: any) => {
    try {
      if (!value) return null;
      if (value instanceof Date) return value;
      const s = String(value);
      const normalized = s.includes(' ') && !s.includes('T') ? s.replace(' ', 'T') : s;
      const d = new Date(normalized);
      return Number.isFinite(d.getTime()) ? d : null;
    } catch {
      return null;
    }
  };

  const formatMonthDay = (value: any) => {
    const d = parseLooseDate(value);
    return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A';
  };

  const formatIsoDate = (value: any) => {
    const d = parseLooseDate(value);
    return d ? d.toISOString().slice(0, 10) : 'N/A';
  };

  const getHistoryDateValue = (row: any) =>
    row?.created_at || row?.report_date || row?.date || row?.reportDate || row?.reportDateTime || null;

  const getHistoryJson = (row: any) => row?.data || row?.reportData || row?.report_data || null;

  const getReportDateFromJson = (json: any) => {
    try {
      if (!json) return null;
      const root = (json as any)?.reportData || (json as any)?.report_data || json;
      const direct =
        (root as any)?.report_date ??
        (root as any)?.reportDate ??
        (root as any)?.ReportDate ??
        (root as any)?.DateReported ??
        (root as any)?.date ??
        null;
      const directParsed = parseLooseDate(direct);
      if (directParsed) return directParsed;

      const scoreArray = (root as any)?.Score || (root as any)?.reportData?.Score || null;
      if (Array.isArray(scoreArray) && scoreArray.length > 0) {
        const dates = scoreArray
          .map((s: any) => s?.DateReported || s?.DateUpdated || s?.date || s?.Date || null)
          .map(parseLooseDate)
          .filter(Boolean) as Date[];
        if (dates.length > 0) {
          return dates.reduce((max, d) => (d.getTime() > max.getTime() ? d : max), dates[0]);
        }
      }

      const bureauDates = (root as any)?.bureauDates || (root as any)?.BureauDates || null;
      if (bureauDates) {
        const dates = [
          bureauDates?.experian,
          bureauDates?.transunion,
          bureauDates?.equifax,
          bureauDates?.Experian,
          bureauDates?.TransUnion,
          bureauDates?.Equifax,
        ]
          .map(parseLooseDate)
          .filter(Boolean) as Date[];
        if (dates.length > 0) {
          return dates.reduce((max, d) => (d.getTime() > max.getTime() ? d : max), dates[0]);
        }
      }

      return null;
    } catch {
      return null;
    }
  };

  const getHistoryReportDateValue = (row: any) => getReportDateFromJson(getHistoryJson(row)) || getHistoryDateValue(row);

  const getHistoryBureauScore = (row: any, bureau: 'experian' | 'transunion' | 'equifax') => {
    const direct =
      row?.[`${bureau}_score`] ??
      row?.scores?.[bureau] ??
      row?.data?.scores?.[bureau] ??
      row?.data?.reportData?.scores?.[bureau] ??
      null;
    const num = Number(direct);
    return Number.isFinite(num) ? num : null;
  };

  const getScoreDelta = (bureau: 'experian' | 'transunion' | 'equifax') => {
    const current = Number((reportData as any)?.scores?.[bureau]);
    const previous = reportHistory.length > 1 ? getHistoryBureauScore(reportHistory[1], bureau) : null;
    if (!Number.isFinite(current)) return null;
    if (previous === null) return null;
    return current - previous;
  };

  // Transform API account data to match frontend structure
  const transformApiAccounts = (apiAccounts: any[]) => {
    if (!apiAccounts || !Array.isArray(apiAccounts)) {
      console.log('🔍 DEBUG: No API accounts to transform');
      return [];
    }

    console.log('🔍 DEBUG: Transforming API accounts:', apiAccounts);

    return apiAccounts.map((account, index) => {
      const balance = parseFloat(account.CurrentBalance || 0);
      const limit = parseFloat(account.CreditLimit || account.HighBalance || 0);
      const utilization = limit > 0 ? Math.round((balance / limit) * 100) : 0;

      // Map BureauId to bureau name
      const getBureauName = (bureauId: number) => {
        switch (bureauId) {
          case 1: return 'TransUnion';
          case 2: return 'Experian';
          case 3: return 'Equifax';
          default: return 'Unknown';
        }
      };

      const transformed = {
        id: index + 1,
        creditor: account.CreditorName || 'Unknown',
        accountNumber: account.AccountNumber ? `**${account.AccountNumber.slice(-4)}` : '**0000',
        type: account.AccountType || account.AccountTypeDescription || 'Unknown',
        status: account.AccountStatus || account.AccountCondition || 'Unknown',
        balance: balance,
        limit: limit,
        creditLimit: limit, // Add creditLimit field for progress calculations
        minimumPayment: 0, // Not available in API data
        actualPayment: 0, // Not available in API data
        opened: account.DateOpened || '',
        dateOpened: account.DateOpened || '', // Add dateOpened field for progress calculations
        lastActivity: account.DateReported || '',
        paymentHistory: account.PaymentStatus || 'Unknown',
        utilization: utilization,
        remarks: account.Remark || 'No remarks',
        bureau: getBureauName(account.BureauId), // Add bureau field for filtering
        latePayments: {
          total: 0, // Would need to parse PayStatusHistory
          last30Days: 0,
          last60Days: 0,
          last90Days: 0,
          over90Days: 0,
        },
        // Add all the API fields directly to the transformed object
        // so they can be accessed in the table rendering
        ...account,
        // Add mock data for fields not available in API
        monthlyHistory: [],
        transactions: [], // Credit reports don't typically include detailed transaction history
        interestRate: 0,
        termLength: account.TermType || ''
      };

      console.log('🔍 DEBUG: Transformed account:', transformed);
      return transformed;
    });
  };

  // Helper functions to calculate account summary statistics
  const calculateAccountStats = () => {
    const accounts = reportData.accounts || [];
    
    console.log('🔍 DEBUG: Calculating account stats from:', accounts);
    console.log('🔍 DEBUG: reportData structure:', reportData);
    
    const totalAccounts = accounts.length;
    const openAccounts = accounts.filter((account: any) => 
      account.status === "Open" || account.AccountStatus === "Open" || account.AccountCondition === "Open"
    ).length;
    const closedAccounts = totalAccounts - openAccounts;
    
    const totalCreditLimit = accounts.reduce((sum: number, account: any) => {
      const limit = parseFloat(account.CreditLimit || account.limit || "0");
      return sum + (isNaN(limit) ? 0 : limit);
    }, 0);
    
    const totalBalance = accounts.reduce((sum: number, account: any) => {
      const balance = parseFloat(account.CurrentBalance || account.balance || "0");
      return sum + (isNaN(balance) ? 0 : balance);
    }, 0);
    
    const averageUtilization = totalCreditLimit > 0 ? (totalBalance / totalCreditLimit) * 100 : 0;
    
    const stats = {
      totalAccounts,
      openAccounts,
      closedAccounts,
      totalCreditLimit,
      averageUtilization
    };
    
    console.log('🔍 DEBUG: Calculated account stats:', stats);
    return stats;
  };

  const accountStats = calculateAccountStats();

  // Helper function to determine row background color based on qualification criteria
  const getRowBgColor = (tuCriteria: boolean, expCriteria: boolean, eqCriteria: boolean) => {
    const passCount = [tuCriteria, expCriteria, eqCriteria].filter(Boolean).length;
    
    if (passCount === 3) {
      return 'bg-green-50 border-green-200 dark:bg-green-900/50 dark:border-green-800 dark:text-white'; // All pass - light green
    } else if (passCount === 2) {
      return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/50 dark:border-yellow-800 dark:text-white'; // 2 pass - light yellow
    } else if (passCount === 1) {
      return 'bg-orange-50 border-orange-200 dark:bg-orange-900/50 dark:border-orange-800 dark:text-white'; // 1 pass - light orange
    } else {
      return 'bg-red-50 border-red-200 dark:bg-red-900/50 dark:border-red-800 dark:text-white'; // None pass - light red
    }
  };

  useEffect(() => {
    const fetchCreditReport = async () => {
      if (!clientId) {
        setError("No client ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        // Fetch client data to retrieve SSN last four for masked display
        let dbSSNLastFour: string | null = null;
        try {
          const clientResp = await clientsApi.getClient(clientId);
          dbSSNLastFour = clientResp?.data?.ssn_last_four || null;
          setClientRecord(clientResp?.data || null);
          const shouldShowAudit = !clientResp?.data?.fundable_status
            || searchParams.get('newReport') === 'true'
            || searchParams.get('fresh') === 'true';
          if (shouldShowAudit) {
            setShowEligibilityAuditModal(true);
          }
        } catch (clientErr) {
          console.warn('Failed to fetch client data for SSN last four:', clientErr);
        }
        
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setError("Authentication required");
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/credit-reports/client/${clientId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          if (response.status !== 404) {
            throw new Error(`Failed to fetch credit report: ${response.statusText}`);
          }
        }

        const data = await response.json();
        console.log('Fetched credit report data:', data);
        console.log('🔍 DEBUG: Full response structure:', JSON.stringify(data, null, 2));
        
        // If we have real data, use it; otherwise keep the mock data
        if (data && data.success && data.data && data.data.reportData) {
          // Transform the API data to match our expected structure
          setApiData(data.data.reportData);
          console.log('🔍 DEBUG: API reportData:', data.data.reportData);
          console.log('🔍 DEBUG: API Name data:', data.data.reportData.Name);
          console.log('🔍 DEBUG: API DOB data:', data.data.reportData.DOB);
          console.log('🔍 DEBUG: API Address data:', data.data.reportData.Address);
          console.log('🔍 DEBUG: API Accounts array:', data.data.reportData.Accounts);
          console.log('🔍 DEBUG: API Accounts length:', data.data.reportData.Accounts ? data.data.reportData.Accounts.length : 'undefined');
          
          // Extract scores from the API data
          // Based on the JSON structure: BureauId 1=TransUnion, 2=Equifax, 3=Experian
          console.log('🔍 DEBUG: Full API data:', data.data.reportData);
          console.log('🔍 DEBUG: API Score data:', data.data.reportData.Score);
          
          // Extract scores and score types dynamically from API data
          let scores = {
            experian: "785", // Default fallback
            transunion: "769", // Default fallback
            equifax: "778" // Default fallback
          };

          let scoreTypes = {
            experian: "FICO", // Default fallback
            transunion: "FICO", // Default fallback
            equifax: "FICO" // Default fallback
          };
          
          // If we have Score data from API, use it
          if (data.data.reportData.Score && Array.isArray(data.data.reportData.Score)) {
            const scoreData = data.data.reportData.Score;
            scoreData.forEach((score: any) => {
              if (score.BureauId === 1) {
                scores.transunion = score.Score;
                scoreTypes.transunion = score.ScoreType || "FICO";
              }
              if (score.BureauId === 2) {
                scores.experian = score.Score;
                scoreTypes.experian = score.ScoreType || "FICO";
              }
              if (score.BureauId === 3) {
                scores.equifax = score.Score;
                scoreTypes.equifax = score.ScoreType || "FICO";
              }
            });
            console.log('🔍 DEBUG: Extracted scores from API:', scores);
            console.log('🔍 DEBUG: Extracted score types from API:', scoreTypes);
          } else if (data.data.reportData.Scores && Array.isArray(data.data.reportData.Scores)) {
            const scoreData = data.data.reportData.Scores;
            scoreData.forEach((score: any) => {
              if (score.BureauId === 1) {
                scores.transunion = score.Score;
                scoreTypes.transunion = score.ScoreType || "FICO";
              }
              if (score.BureauId === 2) {
                scores.experian = score.Score;
                scoreTypes.experian = score.ScoreType || "FICO";
              }
              if (score.BureauId === 3) {
                scores.equifax = score.Score;
                scoreTypes.equifax = score.ScoreType || "FICO";
              }
            });
            console.log('🔍 DEBUG: Extracted scores from API (Scores fallback):', scores);
            console.log('🔍 DEBUG: Extracted score types from API (Scores fallback):', scoreTypes);
          } else if (data.data.scores && typeof data.data.scores === 'object') {
            const s = data.data.scores as any;
            scores.experian = String(s.experian ?? scores.experian);
            scores.equifax = String(s.equifax ?? scores.equifax);
            scores.transunion = String(s.transunion ?? scores.transunion);
            console.log('🔍 DEBUG: Extracted scores from API (scores object fallback):', scores);
          } else {
            console.log('🔍 DEBUG: Using fallback scores:', scores);
            console.log('🔍 DEBUG: Using fallback score types:', scoreTypes);
          }
          
          console.log('🔍 DEBUG: Mock scores fallback:', detailedReport.scores);
          
          // Extract personal information
          console.log('🔍 DEBUG: Extracting personal info from:', data.data.reportData);
          const nameData = data.data.reportData.Name?.find(n => n.NameType === "Primary" && n.BureauId === 3);
          const dobData = data.data.reportData.DOB?.find(d => d.BureauId === 3);
          console.log('🔍 DEBUG: Found name data:', nameData);
          console.log('🔍 DEBUG: Found DOB data:', dobData);
          
          const personalInfo = {
            name: nameData || {},
            dateOfBirth: dobData?.DOB || detailedReport.personalInfo.dateOfBirth,
            addresses: (data.data.reportData.Address || []).map(addr => ({
              street: addr.StreetAddress || '',
              city: addr.City || '',
              state: addr.State || '',
              zip: addr.Zip || '',
              type: addr.AddressType || 'Unknown',
              reportedDate: new Date().toISOString() // API doesn't provide this, use current date
            })),
            employers: (data.data.reportData.Employer || []).map(emp => ({
              name: emp.EmployerName || '',
              bureauId: emp.BureauId || 0,
              dateReported: emp.DateReported || emp.DateUpdated || new Date().toISOString(),
              dateUpdated: emp.DateUpdated || null,
              position: emp.Position || null,
              income: emp.Income || null
            })),
            ssn: dbSSNLastFour ? `***-**-${dbSSNLastFour}` : null
          };
          
          // Transform disputes from accounts with dispute flags
          const transformApiDisputes = (accounts) => {
            return accounts
              .filter(account => account.DisputeFlag && account.DisputeFlag !== 'Account not disputed')
              .map((account, index) => ({
                id: index + 1,
                date: account.DateReported || new Date().toISOString().split('T')[0],
                bureau: account.BureauId === 1 ? 'TransUnion' : account.BureauId === 2 ? 'Experian' : 'Equifax',
                accountDisputed: `${account.CreditorName} - ${account.AccountType}`,
                reason: account.DisputeFlag || 'Disputed',
                status: 'Under Investigation',
                expectedResolution: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                result: 'Pending'
              }));
          };

          // Transform true collection accounts (not just late payments)
          const transformApiCollections = (accounts) => {
            return accounts
              .filter(account => {
                const paymentStatus = String(account.PaymentStatus || '').toLowerCase();
                const accountType = String(account.AccountType || account.AccountTypeDescription || account.CreditType || '').toLowerCase();
                const condition = String(account.AccountCondition || account.AccountStatus || '').toLowerCase();
                const isCollectionLike =
                  paymentStatus.includes('collection') ||
                  accountType.includes('collection') ||
                  condition.includes('collection');
                const hasBalance =
                  Number(account.CurrentBalance || 0) > 0 ||
                  Number(account.AmountPastDue || 0) > 0;
                return isCollectionLike && hasBalance;
              })
              .map((account, index) => ({
                id: index + 1,
                agency: account.CreditorName || 'Unknown Agency',
                originalCreditor: account.CreditorName || 'Unknown Creditor',
                currentCreditor: account.CreditorName || 'Unknown Creditor',
                accountNumber: `****${account.AccountNumber?.slice(-4) || '0000'}`,
                amount: parseInt(account.CurrentBalance) || parseInt(account.AmountPastDue) || 0,
                originalAmount: parseInt(account.HighBalance) || parseInt(account.CurrentBalance) || 0,
                dateOpened: account.DateOpened || new Date().toISOString().split('T')[0],
                dateReported: account.DateReported || new Date().toISOString().split('T')[0],
                lastActivity: account.DateAccountStatus || account.DateReported || new Date().toISOString().split('T')[0],
                status: account.AccountStatus || 'Unknown',
                disputeStatus: account.DisputeFlag === 'Account not disputed' ? 'None' : 'Disputed',
                paymentHistory: [],
                notes: `${account.AccountType} - ${account.Industry}`,
                phoneNumber: "(800) 555-0100"
              }));
          };

          // Extract bureau-specific dates from Score array
          const getBureauDate = (bureauId) => {
            const scoreArray = data.data.reportData.Score || data.data.reportData.Scores;
            const scoreEntry = Array.isArray(scoreArray) ? scoreArray.find((s: any) => s.BureauId === bureauId) : null;
            const ds = scoreEntry?.DateScore || scoreEntry?.DateReported || scoreEntry?.DateUpdated || null;
            if (ds) {
              return new Date(ds).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });
            }
            // Fallback to report date
            const reportDate = data.data.report_date || data.data.created_at || new Date().toISOString();
            return new Date(reportDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });
          };

          // Calculate debt utilization from real account data
          const calculateDebtUtilization = (accounts) => {
            const utilizationByBureau = {
              1: { // TransUnion
                openRevolvingBalance: 0,
                openRevolvingLimit: 0,
                allRevolvingBalance: 0,
                allRevolvingLimit: 0,
                realEstateDebt: 0,
                installmentDebt: 0
              },
              2: { // Equifax
                openRevolvingBalance: 0,
                openRevolvingLimit: 0,
                allRevolvingBalance: 0,
                allRevolvingLimit: 0,
                realEstateDebt: 0,
                installmentDebt: 0
              },
              3: { // Experian
                openRevolvingBalance: 0,
                openRevolvingLimit: 0,
                allRevolvingBalance: 0,
                allRevolvingLimit: 0,
                realEstateDebt: 0,
                installmentDebt: 0
              }
            };

            accounts.forEach(account => {
              const bureauId = account.BureauId;
              const currentBalance = parseFloat(account.CurrentBalance) || 0;
              const creditLimit = parseFloat(account.CreditLimit) || 0;
              const highBalance = parseFloat(account.HighBalance) || 0;
              
              if (!utilizationByBureau[bureauId]) return;

              // Revolving accounts (credit cards, lines of credit)
              const at = String(account.AccountType || '').toLowerCase();
              const ad = String(account.AccountTypeDescription || '').toLowerCase();
              const ct = String(account.CreditType || '').toLowerCase();
              const ind = String(account.Industry || '').toLowerCase();
              if (
                at.includes('revolving') ||
                ad.includes('revolving') ||
                ct.includes('revolving') ||
                at.includes('credit card') ||
                ad.includes('credit card') ||
                ct.includes('credit card') ||
                ad.includes('charge account') ||
                ad.includes('flexible spending credit card') ||
                ind.includes('bank credit cards')
              ) {
                // All revolving accounts
                utilizationByBureau[bureauId].allRevolvingBalance += currentBalance;
                utilizationByBureau[bureauId].allRevolvingLimit += creditLimit || highBalance;
                
                // Open revolving accounts only
                if (
                  account.AccountStatus === 'Open' ||
                  account.AccountStatus === 'Current' ||
                  account.AccountCondition === 'Open'
                ) {
                  utilizationByBureau[bureauId].openRevolvingBalance += currentBalance;
                  utilizationByBureau[bureauId].openRevolvingLimit += creditLimit || highBalance;
                }
              }
              
              // Real estate debt (mortgages)
              if (account.AccountType === 'Mortgage' || account.Industry?.includes('Real Estate') || 
                  account.CreditorName?.toLowerCase().includes('mortgage')) {
                if (
                  account.AccountStatus === 'Open' ||
                  account.AccountStatus === 'Current' ||
                  account.AccountCondition === 'Open'
                ) {
                  utilizationByBureau[bureauId].realEstateDebt += currentBalance;
                }
              }
              
              // Installment debt (auto loans, personal loans, etc.)
              if (account.CreditType === 'Installment Account' || account.AccountTypeDescription === 'Installment Account') {
                if (
                  account.AccountStatus === 'Open' ||
                  account.AccountStatus === 'Current' ||
                  account.AccountCondition === 'Open'
                ) {
                  utilizationByBureau[bureauId].installmentDebt += currentBalance;
                }
              }
            });

            return utilizationByBureau;
          };

          const debtUtilization = calculateDebtUtilization(data.data.reportData.Accounts || []);

          // Calculate qualification criteria
          const calculateQualificationCriteria = (apiData: any, debtUtilization: any, scoresData: any) => {
            const criteria = {
              1: { // TransUnion
                score700Plus: false,
                score730Plus: false,
                openRevolvingUnder30: false,
                allRevolvingUnder30: false,
                minFiveOpenRevolving: false,
                creditCard3YearsOld5KLimit: false,
                maxFourUnsecuredIn12Months: false,
                noInquiries: false,
                noBankruptcies: false,
                noCollectionsLiensJudgements: false,
                // Added explicit flags used by the Basic table
                noCollections: false,
                noChargeOffs: false,
                noLatePaymentsIn12Months: false
              },
              2: { // Equifax
                score700Plus: false,
                score730Plus: false,
                openRevolvingUnder30: false,
                allRevolvingUnder30: false,
                minFiveOpenRevolving: false,
                creditCard3YearsOld5KLimit: false,
                maxFourUnsecuredIn12Months: false,
                noInquiries: false,
                noBankruptcies: false,
                noCollectionsLiensJudgements: false,
                // Added explicit flags used by the Basic table
                noCollections: false,
                noChargeOffs: false,
                noLatePaymentsIn12Months: false
              },
              3: { // Experian
                score700Plus: false,
                score730Plus: false,
                openRevolvingUnder30: false,
                allRevolvingUnder30: false,
                minFiveOpenRevolving: false,
                creditCard3YearsOld5KLimit: false,
                maxFourUnsecuredIn12Months: false,
                noInquiries: false,
                noBankruptcies: false,
                noCollectionsLiensJudgements: false,
                // Added explicit flags used by the Basic table
                noCollections: false,
                noChargeOffs: false,
                noLatePaymentsIn12Months: false
              }
            };

            if (!apiData?.reportData) return criteria;

            // Check scores for each bureau - use the scores parameter passed in
            const scoreValues = {
              1: parseInt(scoresData.transunion) || 0,  // TransUnion
              2: parseInt(scoresData.equifax) || 0,     // Equifax  
              3: parseInt(scoresData.experian) || 0     // Experian
            };

            [1, 2, 3].forEach(bureauId => {
              const score = scoreValues[bureauId];
              console.log(`🔍 DEBUG: Bureau ${bureauId} score:`, score);
              if (score > 0) {
                criteria[bureauId].score700Plus = score >= 700;
                criteria[bureauId].score730Plus = score >= 730;
                console.log(`🔍 DEBUG: Bureau ${bureauId} - score700Plus: ${criteria[bureauId].score700Plus}, score730Plus: ${criteria[bureauId].score730Plus}`);
              }

              // Check utilization
              if (debtUtilization[bureauId]) {
                const openUtil = debtUtilization[bureauId].openRevolvingLimit > 0 
                  ? (debtUtilization[bureauId].openRevolvingBalance / debtUtilization[bureauId].openRevolvingLimit) * 100 
                  : 0;
                const allUtil = debtUtilization[bureauId].allRevolvingLimit > 0 
                  ? (debtUtilization[bureauId].allRevolvingBalance / debtUtilization[bureauId].allRevolvingLimit) * 100 
                  : 0;
                
                criteria[bureauId].openRevolvingUnder30 = openUtil < 30;
                criteria[bureauId].allRevolvingUnder30 = allUtil < 30;
              }

              // Check accounts for this bureau
              const bureauAccounts = apiData.reportData?.Accounts?.filter((acc: any) => acc.BureauId === bureauId) || [];
              const openPrimaryRevolving = bureauAccounts.filter((acc: any) => {
                const at = String(acc.AccountType || '').toLowerCase();
                const ad = String(acc.AccountTypeDescription || '').toLowerCase();
                const ct = String(acc.CreditType || '').toLowerCase();
                const ind = String(acc.Industry || '').toLowerCase();
                const isRevolving =
                  at.includes('revolving') ||
                  ad.includes('revolving') ||
                  ct.includes('revolving') ||
                  at.includes('credit card') ||
                  ad.includes('credit card') ||
                  ct.includes('credit card') ||
                  ad.includes('charge account') ||
                  ad.includes('flexible spending credit card') ||
                  ind.includes('bank credit cards');
                const isOpen =
                  acc.AccountStatus === 'Open' ||
                  acc.AccountStatus === 'Current' ||
                  acc.AccountCondition === 'Open';
                const designator = String(acc.AccountDesignator || '').toLowerCase();
                const isPrimary = !designator.includes('authorized');
                return isRevolving && isOpen && isPrimary;
              });
              const withGoodHistory = openPrimaryRevolving.filter((acc: any) => {
                if (!acc.DateOpened) return false;
                const opened = new Date(acc.DateOpened);
                if (isNaN(opened.getTime())) return false;
                const months = Math.floor((Date.now() - opened.getTime()) / (1000 * 60 * 60 * 24 * 30));
                const payHist = String(acc.PayStatusHistory || '').toUpperCase();
                const recent = payHist.slice(-24);
                const negInHist = /[DLB]/.test(recent);
                const negStatus =
                  String(acc.PaymentStatus || '').toLowerCase().includes('late') ||
                  String(acc.WorstPayStatus || '').toLowerCase().includes('late') ||
                  (parseFloat(acc.AmountPastDue) || 0) > 0;
                return months >= 24 && !negInHist && !negStatus;
              });
              criteria[bureauId].minFiveOpenRevolving = withGoodHistory.length >= 5;

              // Check for 2+ year old credit card with $5K+ limit
              const qualifyingCards = openPrimaryRevolving.filter((acc: any) => {
                if (!acc.DateOpened) return false;
                const openDate = new Date(acc.DateOpened);
                const yearsOld = (Date.now() - openDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
                const creditLimit = parseFloat(acc.CreditLimit) || 0;
                return yearsOld >= 2 && creditLimit >= 5000;
              });
              criteria[bureauId].creditCard3YearsOld5KLimit = qualifyingCards.length >= 2;

              // Check unsecured accounts opened in past 12 months
              const recentUnsecuredAccounts = bureauAccounts.filter((acc: any) => {
                if (!acc.DateOpened) return false;
                const openDate = new Date(acc.DateOpened);
                const monthsOld = (new Date().getTime() - openDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
                const at = String(acc.AccountType || '').toLowerCase();
                const ad = String(acc.AccountTypeDescription || '').toLowerCase();
                const ct = String(acc.CreditType || '').toLowerCase();
                const ind = String(acc.Industry || '').toLowerCase();
                const isRevolving =
                  at.includes('revolving') ||
                  ad.includes('revolving') ||
                  ct.includes('revolving') ||
                  at.includes('credit card') ||
                  ad.includes('credit card') ||
                  ct.includes('credit card') ||
                  ad.includes('charge account') ||
                  ad.includes('flexible spending credit card') ||
                  ind.includes('bank credit cards');
                return monthsOld <= 12 && isRevolving;
              });
              criteria[bureauId].maxFourUnsecuredIn12Months = recentUnsecuredAccounts.length <= 4;

              // Check for collections, liens, judgements, late payments
              console.log(`🔍 DEBUG: Bureau ${bureauId} accounts for negative detection:`, bureauAccounts.map(acc => ({
                AccountType: acc.AccountType,
                PaymentStatus: acc.PaymentStatus,
                WorstPayStatus: acc.WorstPayStatus,
                AmountPastDue: acc.AmountPastDue,
                AccountTypeDescription: acc.AccountTypeDescription,
                AccountStatus: acc.AccountStatus
              })));
              
              const negativeAccounts = bureauAccounts.filter((acc: any) => 
                acc.PaymentStatus?.includes('Collection') || 
                acc.PaymentStatus?.includes('Charge') ||
                acc.PaymentStatus?.includes('Late') ||
                acc.WorstPayStatus?.includes('Late') ||
                acc.AccountType?.includes('Collection') ||
                (acc.AmountPastDue && parseFloat(acc.AmountPastDue) > 0)
              );
              
              console.log(`🔍 DEBUG: Bureau ${bureauId} negative accounts found:`, negativeAccounts.length, negativeAccounts);
              criteria[bureauId].noCollectionsLiensJudgements = negativeAccounts.length === 0;

              // Set individual negative-item criteria used in Basic view
              const collectionsCount = negativeAccounts.filter((acc: any) => 
                acc.PaymentStatus?.includes('Collection') || acc.AccountType?.includes('Collection')
              ).length;
              const chargeOffsCount = negativeAccounts.filter((acc: any) => 
                acc.PaymentStatus?.includes('Charge')
              ).length;
              const latePaymentsCount = negativeAccounts.filter((acc: any) => 
                acc.PaymentStatus?.includes('Late') || acc.WorstPayStatus?.includes('Late')
              ).length;

              criteria[bureauId].noCollections = collectionsCount === 0;
              criteria[bureauId].noChargeOffs = chargeOffsCount === 0;
              // Approximate late payments in past 12 months with available fields
              criteria[bureauId].noLatePaymentsIn12Months = latePaymentsCount === 0;
              // Back-compat alias for views that expect noLatePayments
              (criteria[bureauId] as any).noLatePayments = criteria[bureauId].noLatePaymentsIn12Months;

              // Check inquiries for this bureau
              const bureauInquiries = apiData.reportData?.Inquiries?.filter((inq: any) => 
                inq.BureauId === bureauId && inq.InquiryType === 'I'
              ) || [];
              criteria[bureauId].noInquiries = bureauInquiries.length === 0;

              const bureauPublicRecords = apiData.reportData?.PublicRecords?.filter((rec: any) => rec.BureauId === bureauId) || [];
              const hasBankruptcy = bureauPublicRecords.some((rec: any) => {
                const cls = String(rec.Classification || '').toLowerCase();
                const typ = String(rec.Type || '').toLowerCase();
                return cls.includes('bankruptcy') || typ.includes('bankruptcy');
              });
              criteria[bureauId].noBankruptcies = !hasBankruptcy;
            });

            return criteria;
          };

          const qualificationCriteria = calculateQualificationCriteria(data.data, debtUtilization, scores);
          console.log('🔍 DEBUG: Final qualification criteria:', qualificationCriteria);

          const transformedData = {
            ...detailedReport,
            scores: scores,
            scoreTypes: scoreTypes,
            bureauDates: {
              experian: getBureauDate(2),
              transunion: getBureauDate(1),
              equifax: getBureauDate(3)
            },
            previousScores: detailedReport.previousScores, // Keep mock previous scores for now
            personalInfo: {
              ...detailedReport.personalInfo,
              ...personalInfo,
              name: personalInfo.name.FirstName && personalInfo.name.LastName 
                ? `${personalInfo.name.FirstName} ${personalInfo.name.Middle || ''} ${personalInfo.name.LastName}`.trim()
                : detailedReport.personalInfo.name
            },
            accounts: transformApiAccounts(data.data.reportData.Accounts || []),
            collections: transformApiCollections(data.data.reportData.Accounts || []),
            disputeHistory: transformApiDisputes(data.data.reportData.Accounts || []),
            inquiries: (data.data.reportData.Inquiries || []).map((inquiry, index) => ({
              id: index + 1,
              company: inquiry.CreditorName || 'Unknown Creditor',
              creditorName: inquiry.CreditorName || 'Unknown Creditor', // Add creditorName field for progress display
              purpose: inquiry.Industry || 'Unknown Purpose',
              type: inquiry.InquiryType === 'I' ? 'Hard' : 'Soft',
              date: inquiry.DateInquiry || new Date().toISOString().split('T')[0],
              bureau: inquiry.BureauId === 1 ? 'TransUnion' : inquiry.BureauId === 2 ? 'Experian' : inquiry.BureauId === 3 ? 'Equifax' : 'Unknown'
            })),
            publicRecords: (data.data.reportData.PublicRecords || []),
            // Keep the original structure for other data
            creditUtilization: detailedReport.creditUtilization,
            debtUtilization: debtUtilization, // Add calculated debt utilization
            qualificationCriteria: qualificationCriteria, // Add calculated qualification criteria
            paymentHistory: detailedReport.paymentHistory,
            creditAge: detailedReport.creditAge,
            creditMix: detailedReport.creditMix,
            recentInquiries: detailedReport.recentInquiries
          };
          
          console.log('🔍 DEBUG: Final transformedData scores:', transformedData.scores);
          console.log('🔍 DEBUG: Final transformedData accounts:', transformedData.accounts);
          console.log('🔍 DEBUG: Setting report data with scores:', transformedData.scores);
          
          // Fetch report history for this client
          try {
            // Get fresh token from localStorage
            const freshToken = localStorage.getItem('auth_token');
            console.log('🔍 DEBUG: Fresh token from localStorage:', freshToken ? `Token exists (${freshToken.substring(0, 20)}...)` : 'No token');
            console.log('🔍 DEBUG: Original token:', token ? `Token exists (${token.substring(0, 20)}...)` : 'No token');
            console.log('🔍 DEBUG: Making request to:', `/api/credit-reports/history?clientId=${clientId}`);
            
            // Use AbortController to handle timeouts
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const historyResponse = await fetch(`/api/credit-reports/history?clientId=${clientId}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${freshToken || token}`,
                'Content-Type': 'application/json'
              },
              credentials: 'include',
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            console.log('🔍 DEBUG: History response status:', historyResponse.status);
            console.log('🔍 DEBUG: History response ok:', historyResponse.ok);
            
            if (historyResponse.ok) {
              const historyData = await historyResponse.json();
              console.log('🔍 DEBUG: Report history data:', historyData);
              const rawHistory = Array.isArray(historyData?.data) ? historyData.data : [];

              const tokenForFetch = freshToken || token;
              const fetchReportJson = async (reportPath: any) => {
                if (!reportPath || typeof reportPath !== 'string') return null;
                try {
                  const resp = await fetch(`/api/credit-reports/json-file?path=${encodeURIComponent(reportPath)}`, {
                    method: 'GET',
                    headers: {
                      'Authorization': `Bearer ${tokenForFetch}`,
                      'Content-Type': 'application/json'
                    },
                    credentials: 'include'
                  });
                  if (!resp.ok) return null;
                  const json = await resp.json();
                  return json?.data ?? null;
                } catch {
                  return null;
                }
              };

              const latestRow = rawHistory.length > 0 ? rawHistory[0] : null;
              const previousRow = rawHistory.length > 1 ? rawHistory[1] : null;
              const oldestRow = rawHistory.length > 0 ? rawHistory[rawHistory.length - 1] : null;

              const dataById = new Map<any, any>();
              const dataByPath = new Map<string, any>();
              const rowsToFetch = [latestRow, previousRow, oldestRow].filter(Boolean) as any[];

              try {
                for (const row of rowsToFetch) {
                  const reportPath = row?.report_path;
                  if (!reportPath || typeof reportPath !== 'string') continue;
                  if (dataByPath.has(reportPath)) {
                    const cached = dataByPath.get(reportPath);
                    if (row?.id != null && cached) dataById.set(row.id, cached);
                    continue;
                  }
                  const json = await fetchReportJson(reportPath);
                  if (json) {
                    dataByPath.set(reportPath, json);
                    if (row?.id != null) dataById.set(row.id, json);
                  }
                }
              } catch (e) {
                console.warn('Failed to load report JSON for history compare:', e);
              }

              transformedData.reportHistory = rawHistory.map((h: any) => {
                if (h?.id != null && dataById.has(h.id)) return { ...h, data: dataById.get(h.id) };
                if (typeof h?.report_path === 'string' && dataByPath.has(h.report_path)) return { ...h, data: dataByPath.get(h.report_path) };
                return h;
              });
            } else {
              const errorText = await historyResponse.text();
              console.warn('Failed to fetch report history:', historyResponse.status, errorText);
              transformedData.reportHistory = [];
            }
          } catch (historyErr) {
            console.error('Error fetching report history:', historyErr);
            console.error('Error details:', {
              name: historyErr.name,
              message: historyErr.message,
              stack: historyErr.stack
            });
            
            // If it's an AbortError, it was a timeout
            if (historyErr.name === 'AbortError') {
              console.error('Request was aborted (likely timeout)');
            }
            
            transformedData.reportHistory = [];
          }
          
          setReportData(transformedData);
        } else {
          // If no API data, ensure we still update with correct scores and add default bureau dates
          console.log('🔍 DEBUG: No API data, forcing correct scores anyway');
          const currentDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
          
          // Create mock qualification criteria for high scores
          const mockQualificationCriteria = {
            1: { // TransUnion
              score700Plus: true,
              score730Plus: true,
              openRevolvingUnder30: true,
              allRevolvingUnder30: true,
              minFiveOpenRevolving: true,
              creditCard3YearsOld5KLimit: true,
              maxFourUnsecuredIn12Months: true,
              noInquiries: true,
              noBankruptcies: true,
              noCollectionsLiensJudgements: true
            },
            2: { // Equifax
              score700Plus: true,
              score730Plus: true,
              openRevolvingUnder30: true,
              allRevolvingUnder30: true,
              minFiveOpenRevolving: true,
              creditCard3YearsOld5KLimit: true,
              maxFourUnsecuredIn12Months: true,
              noInquiries: true,
              noBankruptcies: true,
              noCollectionsLiensJudgements: true
            },
            3: { // Experian
              score700Plus: true,
              score730Plus: true,
              openRevolvingUnder30: true,
              allRevolvingUnder30: true,
              minFiveOpenRevolving: true,
              creditCard3YearsOld5KLimit: true,
              maxFourUnsecuredIn12Months: true,
              noInquiries: true,
              noBankruptcies: true,
              noCollectionsLiensJudgements: true
            }
          };
          
          const updatedMockData = {
            ...detailedReport,
            scores: {
              experian: "785",
              transunion: "769", 
              equifax: "778"
            },
            scoreTypes: {
              experian: "FICO",
              transunion: "FICO",
              equifax: "FICO"
            },
            bureauDates: {
              experian: currentDate,
              transunion: currentDate,
              equifax: currentDate
            },
            qualificationCriteria: mockQualificationCriteria,
            reportHistory: [] // Add empty report history for mock data
          };
          // Apply SSN from client DB if available; otherwise set to null
          updatedMockData.personalInfo = {
            ...updatedMockData.personalInfo,
            ssn: (typeof dbSSNLastFour === 'string' && dbSSNLastFour) ? `***-**-${dbSSNLastFour}` : null
          };
          setReportData(updatedMockData);
        }
      } catch (err) {
        console.error('Error fetching credit report:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch credit report');
        // Keep using mock data on error
      } finally {
        setLoading(false);
        setIsRerunningAudit(false);
      }
    };

    fetchCreditReport();
  }, [clientId, refreshAuditNonce]);

  const runEligibilityAudit = async () => {
    if (!clientId) return;
    try {
      setAuditRunning(true);
      const qc: any = (reportData as any)?.qualificationCriteria || {};
      const getInquiryCountByName = (name: string) => {
        try {
          const listA = (reportData as any)?.inquiries || [];
          if (Array.isArray(listA) && listA.length > 0) {
            return listA.filter((inq: any) => String(inq?.bureau) === name && (String(inq?.type).toLowerCase() === 'hard' || String(inq?.InquiryType) === 'I')).length;
          }
          const rawB = (apiData as any)?.reportData?.reportData?.Inquiries || (apiData as any)?.reportData?.Inquiries || [];
          const mapId = (n: string) => n === 'TransUnion' ? 1 : (n === 'Experian' ? 2 : 3);
          return rawB.filter((inq: any) => Number(inq?.BureauId) === mapId(name) && String(inq?.InquiryType) === 'I').length;
        } catch {
          return 0;
        }
      };
      const inquiriesUnderLimit = (name: string) => getInquiryCountByName(name) < 4;
      const isPass = (c: any, name: string) => Boolean(c?.score700Plus || c?.score730Plus)
        && Boolean(c?.openRevolvingUnder30)
        && Boolean(c?.allRevolvingUnder30)
        && Boolean(c?.minFiveOpenRevolving)
        && Boolean(c?.creditCard3YearsOld5KLimit)
        && Boolean(c?.maxFourUnsecuredIn12Months)
        && Boolean(inquiriesUnderLimit(name))
        && Boolean(c?.noCollections)
        && Boolean(c?.noChargeOffs)
        && Boolean(c?.noLatePayments)
        && Boolean(c?.noBankruptcies)
        && Boolean(c?.noCollectionsLiensJudgements);
      const fundable_in_tu = isPass(qc?.[1], 'TransUnion');
      const fundable_in_ex = isPass(qc?.[3], 'Experian');
      const fundable_in_eq = isPass(qc?.[2], 'Equifax');
      const fundable_status = (fundable_in_tu || fundable_in_ex || fundable_in_eq) ? 'fundable' : 'not_fundable';
      await clientsApi.updateClient(String(clientId), {
        fundable_in_tu,
        fundable_in_ex,
        fundable_in_eq,
        fundable_status
      });
      setAuditResult(fundable_status === 'fundable' ? 'Client is fundable. Status saved.' : 'Client is not fundable. Status saved.');
      setShowEligibilityAuditModal(false);
    } catch (err) {
      console.error('Eligibility audit update failed:', err);
      setAuditResult('Failed to save audit result');
    } finally {
      setAuditRunning(false);
    }
  };

  const getScoreChange = (current: number, previous: number) => {
    const change = current - 700;
    return {
      value: change,
      isPositive: change >= 0,
      icon: change >= 0 ? ArrowUp : ArrowDown,
      color: change >= 0 ? "text-green-600" : "text-red-600",
    };
  };

  const getAccountStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-slate-800 dark:text-blue-300 dark:border-slate-700";
      case "Closed":
        return "bg-muted text-foreground border-border";
      case "Charge Off":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-slate-800 dark:text-red-300 dark:border-slate-700";
      default:
        return "bg-muted text-foreground border-border";
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization < 30) return "text-green-600";
    if (utilization < 70) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <ClientLayout
        title={`Credit Report - ${clientName}`}
        description="Loading credit report..."
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading credit report...</p>
          </div>
        </div>
      </ClientLayout>
    );
  }

  if (error) {
    return (
      <ClientLayout
        title={`Credit Report - ${clientName}`}
        description="Error loading credit report"
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-500" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout
      title={`Credit Report - ${clientName}`}
      description="Detailed credit report analysis and information"
    >
      <Dialog
        open={lawEngineNoticeOpen}
        onOpenChange={(open) => {
          setLawEngineNoticeOpen(open);
          if (!open) setPendingLawEngineTab(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Law Engine Notice</DialogTitle>
            <DialogDescription>
              This feature uses automated software algorithms to generate outputs and recommendations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Please independently review and verify all information before using it in any communication, dispute, or decision.
            </p>
            <p>This content is provided for educational purposes only.</p>
            <p>
              Score Machine does not provide legal advice, and we do not assume responsibility for outcomes resulting from the use
              of Law Engine outputs.
            </p>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={acknowledgeLawEngineNotice}>Acknowledge &amp; Activate</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={fundingAuditNoticeOpen}
        onOpenChange={(open) => {
          setFundingAuditNoticeOpen(open);
          if (!open) setPendingFundingAuditTab(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Funding Audit Notice</DialogTitle>
            <DialogDescription>
              This tab provides automated educational estimates and general information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>This content is provided for educational purposes only and is not financial, credit, or legal advice.</p>
            <p>Results are estimates and are not a guarantee of approval, limits, rates, or terms from any lender.</p>
            <p>Please verify all details independently and consult qualified professionals for decisions.</p>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={acknowledgeFundingAuditNotice}>Acknowledge &amp; Continue</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={fundingEstimateNoticeOpen}
        onOpenChange={(open) => {
          setFundingEstimateNoticeOpen(open);
          if (!open) setPendingFundingGoal(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Funding Estimate Notice</DialogTitle>
            <DialogDescription>
              Funding amounts and terms shown are estimates generated by our software.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              These figures are not a guarantee of approval, rates, limits, or final terms. Banks and lenders make the final
              decision based on their underwriting criteria.
            </p>
            <p>Please verify all details with the lender before applying.</p>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={acknowledgeFundingEstimateNotice}>Acknowledge &amp; Continue</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header Navigation */}
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => navigate("/reports")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Reports
        </Button>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {clientName}
            </h1>
            <p className="text-muted-foreground">Credit Report Analysis</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="default">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

          <div ref={analysisRef} className="analysis-pdf-root space-y-8">
          {/* Header Section */}
          <div className="bg-card rounded-2xl p-8 border-0 shadow-lg pdf-avoid-break">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-foreground mb-2">
                My Credit Analysis
              </h1>
              <p className="text-xl text-muted-foreground mb-6">
                Company Profile • Understanding Your Credit • How Credit Affects
                You
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="text-sm text-gray-600">
                    Understanding Your Credit
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    ✓ Complete
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="text-sm text-gray-600">
                    How Credit Affects You
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    ✓ Complete
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="text-sm text-gray-600">
                    Current Credit Status
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    ✓ Complete
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="text-sm text-gray-600">
                    Funding Journey
                  </div>
                  <div className="text-lg font-bold text-blue-600">✓ Ready</div>
                </div>
              </div>
            </div>
          </div>

          {/* Understanding Your Credit Section Header */}
          <div className="bg-card rounded-2xl p-6 border-0 shadow-lg pdf-avoid-break">
              <div className="flex items-center gap-2 text-2xl font-bold text-foreground mb-2">
                <Info className="h-8 w-8 text-blue-600" />
                Understanding Your Credit
              </div>
              <div className="text-lg text-muted-foreground">
                Introduction to Credit Bureaus and Credit Reports
              </div>
          </div>

              {/* What Are Credit Bureaus */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm pdf-avoid-break">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  What Are Credit Bureaus?
                </h3>
                <p className="text-gray-700 mb-4">
                  Credit bureaus, also known as credit reporting agencies, are
                  organizations that play a critical role in the financial
                  landscape. Their primary function is to collect and maintain
                  individual credit information from various creditors,
                  including banks, credit card companies, and loan providers, as
                  well as public records.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="w-12 h-6 bg-blue-600 rounded text-white flex items-center justify-center mx-auto pb-1 mb-3 text-sm font-bold">
                      EQ
                    </div>
                    <h4 className="font-semibold text-blue-800">Equifax</h4>
                    <p className="text-sm text-blue-700 mt-2">
                      One of the three major credit bureaus
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="w-12 h-6 bg-green-600 rounded text-white flex items-center justify-center mx-auto pb-1 mb-3 text-sm font-bold">
                      EX
                    </div>
                    <h4 className="font-semibold text-green-800">Experian</h4>
                    <p className="text-sm text-green-700 mt-2">
                      Operates independently with unique data
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <div className="w-12 h-6 bg-purple-600 rounded text-white flex items-center justify-center mx-auto pb-1 mb-3 text-sm font-bold">
                      TU
                    </div>
                    <h4 className="font-semibold text-purple-800">
                      TransUnion
                    </h4>
                    <p className="text-sm text-purple-700 mt-2">
                      May collect slightly different information
                    </p>
                  </div>
                </div>
              </div>

              {/* What Is in My Credit Report */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm pdf-avoid-break">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  What Is in My Credit Report?
                </h3>
                <p className="text-gray-700 mb-6">
                  A credit report is a detailed document that outlines your
                  credit history, compiled by credit bureaus. It is used by
                  lenders, landlords, and even some employers to gauge your
                  reliability as a financial borrower.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          Personal Information
                        </h4>
                        <p className="text-sm text-gray-600">
                          Full name, addresses, Social Security number, date of
                          birth, and employment information
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <CreditCard className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          Credit Accounts
                        </h4>
                        <p className="text-sm text-gray-600">
                          Trade lines detailing your history with creditors,
                          payment history, and account status
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Eye className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          Credit Inquiries
                        </h4>
                        <p className="text-sm text-gray-600">
                          Hard and soft inquiries from entities requesting your
                          credit report
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Building className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          Public Records
                        </h4>
                        <p className="text-sm text-gray-600">
                          Bankruptcies, foreclosures, tax liens, and civil
                          judgments
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          Collections
                        </h4>
                        <p className="text-sm text-gray-600">
                          Accounts turned over to collection agencies with
                          significant negative impact
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Why Is a Credit Report Important */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm pdf-avoid-break pb-5">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  Why Is a Credit Report Important?
                </h3>
                <p className="text-gray-700 mb-6">
                  Your credit report can be thought of as your financial report
                  card. It influences many aspects of your financial life and
                  affects your ability to access various financial products and
                  services.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <DollarSign className="h-8 w-8 text-blue-600 mb-3" />
                    <h4 className="font-semibold text-blue-800 mb-2">
                      Access to Financial Products
                    </h4>
                    <p className="text-sm text-blue-700">
                      Credit cards, loans, and mortgages with better terms and
                      lower interest rates
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <Building2 className="h-8 w-8 text-green-600 mb-3" />
                    <h4 className="font-semibold text-green-800 mb-2">
                      Employment & Housing
                    </h4>
                    <p className="text-sm text-green-700">
                      Job opportunities and rental applications often require
                      credit checks
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <Shield className="h-8 w-8 text-purple-600 mb-3" />
                    <h4 className="font-semibold text-purple-800 mb-2">
                      Insurance Premiums
                    </h4>
                    <p className="text-sm text-purple-700">
                      Credit-based scores can affect auto and homeowners
                      insurance rates
                    </p>
                  </div>
                </div>
              </div>
  
            {/* How Credit Affects You Section Header */}
            <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl p-6 border-0 shadow-xl pdf-avoid-break">
                <div className="flex items-center gap-2 text-2xl font-bold text-green-800 mb-2">
                  <Target className="h-8 w-8 text-green-600" />
                  How Credit Affects You
                </div>
                <div className="text-lg text-green-700">
                  The Importance of Credit in Everyday Life and Major Decisions
                </div>
            </div>

              {/* Everyday Life Impact */}
              <div className="bg-white rounded-xl p-6 border border-green-200 shadow-sm pdf-avoid-break">
                <h3 className="text-xl font-bold text-gray-800 mb-6">
                  The Importance of Credit in Everyday Life
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 place-items-center">
                  <div className="text-center">
                    <Building2 className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                    <h4 className="font-semibold text-gray-800 mb-2">
                      Renting an Apartment
                    </h4>
                    <p className="text-sm text-gray-600">
                      Landlords use credit scores to assess payment reliability
                      and set deposit requirements
                    </p>
                  </div>

                  <div className="text-center">
                    <CreditCard className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h4 className="font-semibold text-gray-800 mb-2">
                      Buying a Car
                    </h4>
                    <p className="text-sm text-gray-600">
                      Auto loan lenders review credit scores for approval and
                      interest rate determination
                    </p>
                  </div>

                  <div className="text-center">
                    <Wallet className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                    <h4 className="font-semibold text-gray-800 mb-2">
                      Everyday Purchases
                    </h4>
                    <p className="text-sm text-gray-600">
                      Credit scores affect credit card approvals, limits, and
                      rewards eligibility
                    </p>
                  </div>

                  <div className="text-center">
                    <Zap className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                    <h4 className="font-semibold text-gray-800 mb-2">
                      Utility Services
                    </h4>
                    <p className="text-sm text-gray-600">
                      Providers may require deposits or offer special plans
                      based on credit scores
                    </p>
                  </div>
                </div>
              </div>

              {/* Major Life Decisions */}
              <div className="bg-white rounded-xl p-6 border border-green-200 shadow-sm">
                <h3 className="text-xl font-bold text-gray-800 mb-6">
                  How Credit Impacts Major Life Decisions
                </h3>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">
                        Purchasing a Home
                      </h4>
                      <p className="text-gray-700 mb-2">
                        For most people, buying a home is the largest financial
                        transaction they will undertake. Credit scores are
                        pivotal in mortgage approval, interest rates, and loan
                        terms.
                      </p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>
                          • Higher scores increase chances of mortgage approval
                        </li>
                        <li>
                          • Better rates can save tens of thousands over loan
                          life
                        </li>
                        <li>
                          • Credit affects loan terms and repayment periods
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <FileText className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">
                        Financing Education
                      </h4>
                      <p className="text-gray-700 mb-2">
                        Whether obtaining a loan for college or pursuing
                        postgraduate studies, credit scores affect your ability
                        to finance education through private loans and
                        refinancing options.
                      </p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Private student loans require credit checks</li>
                        <li>• Better scores lead to favorable loan terms</li>
                        <li>• Credit affects refinancing opportunities</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Building className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">
                        Starting or Expanding a Business
                      </h4>
                      <p className="text-gray-700 mb-2">
                        Credit scores impact entrepreneurial ventures,
                        influencing your ability to secure funding for starting
                        or expanding a business through loans and credit lines.
                      </p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>
                          • Personal credit affects business loan eligibility
                        </li>
                        <li>• Higher scores lead to better borrowing rates</li>
                        <li>• Credit limits affect operational cash flow</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
  
            {/* Your Current Credit Status Header */}
            <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-6 border-0 shadow-xl pdf-avoid-break">
                <div className="flex items-center gap-2 text-2xl font-bold text-blue-800 mb-2">
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                  Your Current Credit Status
                </div>
                <div className="text-lg text-blue-700">
                  Overview of Your Credit Scores and Detailed Analysis
                </div>
            </div>

              {/* Current Credit Scores */}
              <div className="bg-white rounded-xl p-6 border border-blue-200 shadow-sm pdf-avoid-break">
                <h3 className="text-xl font-bold text-gray-800 mb-6">
                  Overview of Your Credit Scores
                </h3>
                <p className="text-gray-700 mb-6">
                  Credit scores are numerical representations of your
                  creditworthiness, derived from the data in your credit report.
                  These scores range from 300 to 850, with various ranges
                  representing different levels of credit health.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  <div className="text-center">
                    <div className="w-16 h-8 bg-blue-600 rounded text-white flex items-center justify-center mx-auto mb-5 text-sm font-bold">
                      TU
                    </div>
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      {(() => {
                        const v = reportData?.scores?.transunion;
                        const n = parseInt(v);
                        return isNaN(n) ? 'N/A' : n;
                      })()}
                    </div>
                    <div className="text-sm text-gray-600 mb-1">TransUnion</div>
                    <div className="text-xs text-blue-600">{reportData?.bureauDates?.transunion || 'N/A'}</div>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-8 bg-green-600 rounded text-white flex items-center justify-center mx-auto mb-5 text-sm font-bold">
                      EX
                    </div>
                    <div className="text-4xl font-bold text-green-600 mb-2">
                      {(() => {
                        const v = reportData?.scores?.experian;
                        const n = parseInt(v);
                        return isNaN(n) ? 'N/A' : n;
                      })()}
                    </div>
                    <div className="text-sm text-gray-600 mb-1">Experian</div>
                    <div className="text-xs text-green-600">{reportData?.bureauDates?.experian || 'N/A'}</div>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-8 bg-purple-600 rounded text-white flex items-center justify-center mx-auto mb-5 text-sm font-bold">
                      EQ
                    </div>
                    <div className="text-4xl font-bold text-purple-600 mb-2">
                      {(() => {
                        const v = reportData?.scores?.equifax;
                        const n = parseInt(v);
                        return isNaN(n) ? 'N/A' : n;
                      })()}
                    </div>
                    <div className="text-sm text-gray-600 mb-1">Equifax</div>
                    <div className="text-xs text-purple-600">{reportData?.bureauDates?.equifax || 'N/A'}</div>
                  </div>
                </div>

                {/* Score Factors */}
                <div className="bg-gray-50 rounded-lg p-6 pdf-avoid-break">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">
                    Factors Influencing Your Credit Scores
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">
                        Payment History (35%)
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          {(() => {
                            const accounts = Array.isArray(reportData.accounts) ? reportData.accounts : [];
                            const lateCount = accounts.filter((account: any) => {
                              const paymentHistory = (account.PaymentHistory || account.paymentHistory || '').toString();
                              const status = (account.PaymentStatus || account.AccountStatus || account.status || '').toString().toLowerCase();
                              const hasNumericLate = typeof paymentHistory === 'string' && (paymentHistory.includes('30') || paymentHistory.includes('60') || paymentHistory.includes('90') || paymentHistory.includes('120'));
                              const hasLateKeyword = status.includes('late') || status.includes('past due') || status.includes('delinquent');
                              return hasNumericLate || hasLateKeyword;
                            }).length;
                            const label = lateCount === 0 ? 'Excellent' : lateCount <= 2 ? 'Good' : lateCount <= 5 ? 'Fair' : 'Poor';
                            const width = label === 'Excellent' ? 'w-full' : label === 'Good' ? 'w-4/5' : label === 'Fair' ? 'w-3/5' : 'w-2/5';
                            const color = label === 'Poor' ? 'bg-red-500' : label === 'Fair' ? 'bg-orange-500' : 'bg-green-500';
                            return <div className={`${width} h-full ${color}`}></div>;
                          })()}
                        </div>
                        <span className={`text-sm font-medium ${(() => {
                          const accounts = Array.isArray(reportData.accounts) ? reportData.accounts : [];
                          const lateCount = accounts.filter((account: any) => {
                            const paymentHistory = (account.PaymentHistory || account.paymentHistory || '').toString();
                            const status = (account.PaymentStatus || account.AccountStatus || account.status || '').toString().toLowerCase();
                            const hasNumericLate = typeof paymentHistory === 'string' && (paymentHistory.includes('30') || paymentHistory.includes('60') || paymentHistory.includes('90') || paymentHistory.includes('120'));
                            const hasLateKeyword = status.includes('late') || status.includes('past due') || status.includes('delinquent');
                            return hasNumericLate || hasLateKeyword;
                          }).length;
                          const label = lateCount === 0 ? 'Excellent' : lateCount <= 2 ? 'Good' : lateCount <= 5 ? 'Fair' : 'Poor';
                          return label === 'Poor' ? 'text-red-600' : label === 'Fair' ? 'text-orange-600' : 'text-green-600';
                        })()}`}>
                          {(() => {
                            const accounts = Array.isArray(reportData.accounts) ? reportData.accounts : [];
                            const lateCount = accounts.filter((account: any) => {
                              const paymentHistory = (account.PaymentHistory || account.paymentHistory || '').toString();
                              const status = (account.PaymentStatus || account.AccountStatus || account.status || '').toString().toLowerCase();
                              const hasNumericLate = typeof paymentHistory === 'string' && (paymentHistory.includes('30') || paymentHistory.includes('60') || paymentHistory.includes('90') || paymentHistory.includes('120'));
                              const hasLateKeyword = status.includes('late') || status.includes('past due') || status.includes('delinquent');
                              return hasNumericLate || hasLateKeyword;
                            }).length;
                            return lateCount === 0 ? 'Excellent' : lateCount <= 2 ? 'Good' : lateCount <= 5 ? 'Fair' : 'Poor';
                          })()}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">
                        Credit Utilization (30%)
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          {(() => {
                            const accounts = Array.isArray(reportData.accounts) ? reportData.accounts : [];
                            const revolvingAccounts = accounts.filter((account: any) => {
                              const type = (account.CreditType || account.type || account.AccountType || '').toLowerCase();
                              const status = (account.AccountStatus || account.status || account.Status || account.OpenClosed || '').toLowerCase();
                              const isRevolving = type.includes('revolving') || type.includes('credit card');
                              const isOpen = status ? status.includes('open') : true;
                              return isRevolving && isOpen;
                            });
                            const totalBalance = revolvingAccounts.reduce((sum: number, account: any) => {
                              const balance = parseFloat(account.CurrentBalance || account.balance || '0');
                              return sum + (isNaN(balance) ? 0 : balance);
                            }, 0);
                            const totalLimit = revolvingAccounts.reduce((sum: number, account: any) => {
                              const limit = parseFloat(account.CreditLimit || account.limit || account.creditLimit || '0');
                              return sum + (isNaN(limit) ? 0 : limit);
                            }, 0);
                            const utilization = totalLimit > 0 ? Math.round((totalBalance / totalLimit) * 100) : 0;
                            const u = isNaN(utilization) || !isFinite(utilization) ? 0 : utilization;
                            const label = u < 10 ? 'Excellent' : u < 30 ? 'Good' : u < 50 ? 'Fair' : 'Poor';
                            const width = label === 'Excellent' ? 'w-full' : label === 'Good' ? 'w-4/5' : label === 'Fair' ? 'w-3/5' : 'w-2/5';
                            const color = label === 'Poor' ? 'bg-red-500' : label === 'Fair' ? 'bg-orange-500' : 'bg-green-500';
                            return <div className={`${width} h-full ${color}`}></div>;
                          })()}
                        </div>
                        <span className={`text-sm font-medium ${(() => {
                          const accounts = Array.isArray(reportData.accounts) ? reportData.accounts : [];
                          const revolvingAccounts = accounts.filter((account: any) => {
                            const type = (account.CreditType || account.type || account.AccountType || '').toLowerCase();
                            const status = (account.AccountStatus || account.status || account.Status || account.OpenClosed || '').toLowerCase();
                            const isRevolving = type.includes('revolving') || type.includes('credit card');
                            const isOpen = status ? status.includes('open') : true;
                            return isRevolving && isOpen;
                          });
                          const totalBalance = revolvingAccounts.reduce((sum: number, account: any) => {
                            const balance = parseFloat(account.CurrentBalance || account.balance || '0');
                            return sum + (isNaN(balance) ? 0 : balance);
                          }, 0);
                          const totalLimit = revolvingAccounts.reduce((sum: number, account: any) => {
                            const limit = parseFloat(account.CreditLimit || account.limit || account.creditLimit || '0');
                            return sum + (isNaN(limit) ? 0 : limit);
                          }, 0);
                          const utilization = totalLimit > 0 ? Math.round((totalBalance / totalLimit) * 100) : 0;
                          const u = isNaN(utilization) || !isFinite(utilization) ? 0 : utilization;
                          const label = u < 10 ? 'Excellent' : u < 30 ? 'Good' : u < 50 ? 'Fair' : 'Poor';
                          return label === 'Poor' ? 'text-red-600' : label === 'Fair' ? 'text-orange-600' : 'text-green-600';
                        })()}`}>
                          {(() => {
                            const accounts = Array.isArray(reportData.accounts) ? reportData.accounts : [];
                            const revolvingAccounts = accounts.filter((account: any) => {
                              const type = (account.CreditType || account.type || account.AccountType || '').toLowerCase();
                              const status = (account.AccountStatus || account.status || account.Status || account.OpenClosed || '').toLowerCase();
                              const isRevolving = type.includes('revolving') || type.includes('credit card');
                              const isOpen = status ? status.includes('open') : true;
                              return isRevolving && isOpen;
                            });
                            const totalBalance = revolvingAccounts.reduce((sum: number, account: any) => {
                              const balance = parseFloat(account.CurrentBalance || account.balance || '0');
                              return sum + (isNaN(balance) ? 0 : balance);
                            }, 0);
                            const totalLimit = revolvingAccounts.reduce((sum: number, account: any) => {
                              const limit = parseFloat(account.CreditLimit || account.limit || account.creditLimit || '0');
                              return sum + (isNaN(limit) ? 0 : limit);
                            }, 0);
                            const utilization = totalLimit > 0 ? Math.round((totalBalance / totalLimit) * 100) : 0;
                            const u = isNaN(utilization) || !isFinite(utilization) ? 0 : utilization;
                            return u < 10 ? 'Excellent' : u < 30 ? 'Good' : u < 50 ? 'Fair' : 'Poor';
                          })()}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">
                        Length of Credit History (15%)
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          {(() => {
                            const accounts = Array.isArray(reportData.accounts) ? reportData.accounts : [];
                            const currentDate = new Date();
                            let totalMonths = 0;
                            let validAccounts = 0;
                            accounts.forEach((account: any) => {
                              const dateOpened = account.DateOpened || account.dateOpened || account.opened;
                              if (dateOpened) {
                                const openDate = new Date(dateOpened);
                                if (!isNaN(openDate.getTime())) {
                                  const monthsDiff = (currentDate.getFullYear() - openDate.getFullYear()) * 12 + (currentDate.getMonth() - openDate.getMonth());
                                  if (monthsDiff >= 0) {
                                    totalMonths += monthsDiff;
                                    validAccounts++;
                                  }
                                }
                              }
                            });
                            const avgMonths = validAccounts > 0 ? Math.round(totalMonths / validAccounts) : 0;
                            const label = avgMonths >= 108 ? 'Excellent' : avgMonths >= 60 ? 'Very Good' : avgMonths >= 36 ? 'Good' : 'Fair';
                            const width = label === 'Excellent' ? 'w-full' : label === 'Very Good' ? 'w-4/5' : label === 'Good' ? 'w-3/5' : 'w-2/5';
                            const color = label === 'Fair' ? 'bg-orange-500' : 'bg-green-500';
                            return <div className={`${width} h-full ${color}`}></div>;
                          })()}
                        </div>
                        <span className={`text-sm font-medium ${(() => {
                          const accounts = Array.isArray(reportData.accounts) ? reportData.accounts : [];
                          const currentDate = new Date();
                          let totalMonths = 0;
                          let validAccounts = 0;
                          accounts.forEach((account: any) => {
                            const dateOpened = account.DateOpened || account.dateOpened || account.opened;
                            if (dateOpened) {
                              const openDate = new Date(dateOpened);
                              if (!isNaN(openDate.getTime())) {
                                const monthsDiff = (currentDate.getFullYear() - openDate.getFullYear()) * 12 + (currentDate.getMonth() - openDate.getMonth());
                                if (monthsDiff >= 0) {
                                  totalMonths += monthsDiff;
                                  validAccounts++;
                                }
                              }
                            }
                          });
                          const avgMonths = validAccounts > 0 ? Math.round(totalMonths / validAccounts) : 0;
                          const label = avgMonths >= 108 ? 'Excellent' : avgMonths >= 60 ? 'Very Good' : avgMonths >= 36 ? 'Good' : 'Fair';
                          return label === 'Fair' ? 'text-orange-600' : 'text-green-600';
                        })()}`}>
                          {(() => {
                            const accounts = Array.isArray(reportData.accounts) ? reportData.accounts : [];
                            const currentDate = new Date();
                            let totalMonths = 0;
                            let validAccounts = 0;
                            accounts.forEach((account: any) => {
                              const dateOpened = account.DateOpened || account.dateOpened || account.opened;
                              if (dateOpened) {
                                const openDate = new Date(dateOpened);
                                if (!isNaN(openDate.getTime())) {
                                  const monthsDiff = (currentDate.getFullYear() - openDate.getFullYear()) * 12 + (currentDate.getMonth() - openDate.getMonth());
                                  if (monthsDiff >= 0) {
                                    totalMonths += monthsDiff;
                                    validAccounts++;
                                  }
                                }
                              }
                            });
                            const avgMonths = validAccounts > 0 ? Math.round(totalMonths / validAccounts) : 0;
                            return avgMonths >= 108 ? 'Excellent' : avgMonths >= 60 ? 'Very Good' : avgMonths >= 36 ? 'Good' : 'Fair';
                          })()}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">
                        Credit Mix (5%)
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          {(() => {
                            const accounts = Array.isArray(reportData.accounts) ? reportData.accounts : [];
                            let hasRevolving = false;
                            let hasInstallment = false;
                            let hasMortgage = false;
                            accounts.forEach((acc: any) => {
                              const type = (acc.CreditType || acc.AccountType || acc.AccountTypeDescription || '').toLowerCase();
                              if (type.includes('revolving') || type.includes('credit card')) hasRevolving = true;
                              if (type.includes('installment') || type.includes('loan')) hasInstallment = true;
                              if (type.includes('mortgage') || (acc.Industry && String(acc.Industry).toLowerCase().includes('real estate'))) hasMortgage = true;
                            });
                            const mixScore = hasRevolving && hasInstallment && hasMortgage ? 'Excellent' : (hasRevolving && hasInstallment) ? 'Good' : hasRevolving || hasInstallment ? 'Fair' : 'Poor';
                            const width = mixScore === 'Excellent' ? 'w-full' : mixScore === 'Good' ? 'w-4/5' : mixScore === 'Fair' ? 'w-3/5' : 'w-2/5';
                            const color = mixScore === 'Poor' ? 'bg-red-500' : mixScore === 'Fair' ? 'bg-orange-500' : 'bg-blue-500';
                            return <div className={`${width} h-full ${color}`}></div>;
                          })()}
                        </div>
                        <span className={`text-sm font-medium ${(() => {
                          const accounts = Array.isArray(reportData.accounts) ? reportData.accounts : [];
                          let hasRevolving = false;
                          let hasInstallment = false;
                          let hasMortgage = false;
                          accounts.forEach((acc: any) => {
                            const type = (acc.CreditType || acc.AccountType || acc.AccountTypeDescription || '').toLowerCase();
                            if (type.includes('revolving') || type.includes('credit card')) hasRevolving = true;
                            if (type.includes('installment') || type.includes('loan')) hasInstallment = true;
                            if (type.includes('mortgage') || (acc.Industry && String(acc.Industry).toLowerCase().includes('real estate'))) hasMortgage = true;
                          });
                          const mixScore = hasRevolving && hasInstallment && hasMortgage ? 'Excellent' : (hasRevolving && hasInstallment) ? 'Good' : hasRevolving || hasInstallment ? 'Fair' : 'Poor';
                          return mixScore === 'Poor' ? 'text-red-600' : mixScore === 'Fair' ? 'text-orange-600' : 'text-blue-600';
                        })()}`}>
                          {(() => {
                            const accounts = Array.isArray(reportData.accounts) ? reportData.accounts : [];
                            let hasRevolving = false;
                            let hasInstallment = false;
                            let hasMortgage = false;
                            accounts.forEach((acc: any) => {
                              const type = (acc.CreditType || acc.AccountType || acc.AccountTypeDescription || '').toLowerCase();
                              if (type.includes('revolving') || type.includes('credit card')) hasRevolving = true;
                              if (type.includes('installment') || type.includes('loan')) hasInstallment = true;
                              if (type.includes('mortgage') || (acc.Industry && String(acc.Industry).toLowerCase().includes('real estate'))) hasMortgage = true;
                            });
                            return (hasRevolving && hasInstallment && hasMortgage) ? 'Excellent' : (hasRevolving && hasInstallment) ? 'Good' : (hasRevolving || hasInstallment) ? 'Fair' : 'Poor';
                          })()}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">
                        New Credit (10%)
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          {(() => {
                            const inquiries = Array.isArray(reportData.inquiries) ? reportData.inquiries : [];
                            const twelveMonthsAgo = new Date();
                            twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
                            const recentHard = inquiries.filter((inq: any) => {
                              const d = new Date(inq.date || inq.Date || inq.InquiryDate || inq.created_at);
                              const isHard = String(inq.type || inq.Type || inq.InquiryType || '').toLowerCase().includes('hard') || !inq.type;
                              return !isNaN(d.getTime()) && d >= twelveMonthsAgo && isHard;
                            }).length;
                            const label = recentHard <= 2 ? 'Excellent' : recentHard <= 4 ? 'Good' : recentHard <= 6 ? 'Fair' : 'Poor';
                            const width = label === 'Excellent' ? 'w-full' : label === 'Good' ? 'w-4/5' : label === 'Fair' ? 'w-3/5' : 'w-2/5';
                            const color = label === 'Poor' ? 'bg-red-500' : label === 'Fair' ? 'bg-orange-500' : 'bg-green-500';
                            return <div className={`${width} h-full ${color}`}></div>;
                          })()}
                        </div>
                        <span className={`text-sm font-medium ${(() => {
                          const inquiries = Array.isArray(reportData.inquiries) ? reportData.inquiries : [];
                          const twelveMonthsAgo = new Date();
                          twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
                          const recentHard = inquiries.filter((inq: any) => {
                            const d = new Date(inq.date || inq.Date || inq.InquiryDate || inq.created_at);
                            const isHard = String(inq.type || inq.Type || inq.InquiryType || '').toLowerCase().includes('hard') || !inq.type;
                            return !isNaN(d.getTime()) && d >= twelveMonthsAgo && isHard;
                          }).length;
                          const label = recentHard <= 2 ? 'Excellent' : recentHard <= 4 ? 'Good' : recentHard <= 6 ? 'Fair' : 'Poor';
                          return label === 'Poor' ? 'text-red-600' : label === 'Fair' ? 'text-orange-600' : 'text-green-600';
                        })()}`}>
                          {(() => {
                            const inquiries = Array.isArray(reportData.inquiries) ? reportData.inquiries : [];
                            const twelveMonthsAgo = new Date();
                            twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
                            const recentHard = inquiries.filter((inq: any) => {
                              const d = new Date(inq.date || inq.Date || inq.InquiryDate || inq.created_at);
                              const isHard = String(inq.type || inq.Type || inq.InquiryType || '').toLowerCase().includes('hard') || !inq.type;
                              return !isNaN(d.getTime()) && d >= twelveMonthsAgo && isHard;
                            }).length;
                            return recentHard <= 2 ? 'Excellent' : recentHard <= 4 ? 'Good' : recentHard <= 6 ? 'Fair' : 'Poor';
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analysis Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 border border-blue-200 shadow-sm">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">
                    Analysis of Negative Entries
                  </h4>
                  <div className="space-y-3">
                    {(() => {
                      const accounts = Array.isArray(reportData.accounts) ? reportData.accounts : [];
                      const inquiries = Array.isArray(reportData.inquiries) ? reportData.inquiries : [];
                      const publicRecords = Array.isArray(reportData.publicRecords) ? reportData.publicRecords : [];

                      const lateCount = accounts.filter((account: any) => {
                        const paymentHistory = (account.PaymentHistory || account.paymentHistory || '').toString();
                        const status = (account.PaymentStatus || account.AccountStatus || account.status || '').toString().toLowerCase();
                        const hasNumericLate = typeof paymentHistory === 'string' && (
                          paymentHistory.includes('30') || paymentHistory.includes('60') || paymentHistory.includes('90') || paymentHistory.includes('120')
                        );
                        const hasLateKeyword = status.includes('late') || status.includes('past due') || status.includes('delinquent');
                        return hasNumericLate || hasLateKeyword;
                      }).length;

                      const collectionsChargeOffCount = accounts.filter((account: any) => {
                        const type = (account.AccountType || account.type || '').toString().toLowerCase();
                        const status = (account.AccountStatus || account.status || '').toString().toLowerCase();
                        const creditor = (account.CreditorName || '').toString().toLowerCase();
                        const paymentStatus = (account.PaymentStatus || '').toString().toLowerCase();
                        return type.includes('collection') ||
                          status.includes('charge off') || status.includes('collection') ||
                          paymentStatus.includes('collection/chargeoff') || paymentStatus.includes('chargeoff') ||
                          creditor.includes('collection');
                      }).length;

                      const inqCount = inquiries.length;
                      const prCount = publicRecords.length;

                      const inqColor = inqCount === 0 ? 'text-green-600' : 'text-orange-600';
                      const lateColor = lateCount === 0 ? 'text-green-600' : 'text-red-600';
                      const collColor = collectionsChargeOffCount === 0 ? 'text-green-600' : 'text-red-600';
                      const prColor = prCount === 0 ? 'text-green-600' : 'text-red-600';

                      return (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-700">Inquiries:</span>
                            <span className={`font-bold ${inqColor}`}>{inqCount}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-700">Late Payments:</span>
                            <span className={`font-bold ${lateColor}`}>{lateCount}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-700">Collections/Charge-offs:</span>
                            <span className={`font-bold ${collColor}`}>{collectionsChargeOffCount}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-700">Public Records:</span>
                            <span className={`font-bold ${prColor}`}>{prCount}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-blue-200 shadow-sm">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">
                    Credit Utilization Overview
                  </h4>
                  <div className="text-center mb-4">
                    <div className={`text-3xl font-bold ${(() => {
                      const accounts = Array.isArray(reportData.accounts) ? reportData.accounts : [];
                      const revolvingAccounts = accounts.filter((account: any) => {
                        const type = (account.CreditType || account.type || account.AccountType || '').toLowerCase();
                        const status = (account.AccountStatus || account.status || account.Status || account.OpenClosed || '').toLowerCase();
                        const isRevolving = type.includes('revolving') || type.includes('credit card');
                        const isOpen = status ? status.includes('open') : true;
                        return isRevolving && isOpen;
                      });
                      const totalBalance = revolvingAccounts.reduce((sum: number, account: any) => {
                        const balance = parseFloat(account.CurrentBalance || account.balance || '0');
                        return sum + (isNaN(balance) ? 0 : balance);
                      }, 0);
                      const totalLimit = revolvingAccounts.reduce((sum: number, account: any) => {
                        const limit = parseFloat(account.CreditLimit || account.limit || account.creditLimit || '0');
                        return sum + (isNaN(limit) ? 0 : limit);
                      }, 0);
                      const utilization = totalLimit > 0 ? Math.round((totalBalance / totalLimit) * 100) : 0;
                      const safeUtilization = isNaN(utilization) || !isFinite(utilization) ? 0 : utilization;
                      return safeUtilization <= 30 ? 'text-green-600' : 'text-red-600';
                    })()}`}>
                      {(() => {
                        const accounts = Array.isArray(reportData.accounts) ? reportData.accounts : [];
                        const revolvingAccounts = accounts.filter((account: any) => {
                          const type = (account.CreditType || account.type || account.AccountType || '').toLowerCase();
                          const status = (account.AccountStatus || account.status || account.Status || account.OpenClosed || '').toLowerCase();
                          const isRevolving = type.includes('revolving') || type.includes('credit card');
                          const isOpen = status ? status.includes('open') : true;
                          return isRevolving && isOpen;
                        });
                        const totalBalance = revolvingAccounts.reduce((sum: number, account: any) => {
                          const balance = parseFloat(account.CurrentBalance || account.balance || '0');
                          return sum + (isNaN(balance) ? 0 : balance);
                        }, 0);
                        const totalLimit = revolvingAccounts.reduce((sum: number, account: any) => {
                          const limit = parseFloat(account.CreditLimit || account.limit || account.creditLimit || '0');
                          return sum + (isNaN(limit) ? 0 : limit);
                        }, 0);
                        const utilization = totalLimit > 0 ? Math.round((totalBalance / totalLimit) * 100) : 0;
                        const safeUtilization = isNaN(utilization) || !isFinite(utilization) ? 0 : utilization;
                        return safeUtilization;
                      })()}%
                    </div>
                    <div className="text-sm text-gray-600">
                      Overall Credit Utilization
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">
                        High Utilization Accounts:
                      </span>
                      <span className={`font-bold ${(() => {
                        const accounts = Array.isArray(reportData.accounts) ? reportData.accounts : [];
                        const revolvingOpen = accounts.filter((account: any) => {
                          const type = (account.CreditType || account.type || account.AccountType || '').toLowerCase();
                          const status = (account.AccountStatus || account.status || account.Status || account.OpenClosed || '').toLowerCase();
                          const isRevolving = type.includes('revolving') || type.includes('credit card');
                          const isOpen = status ? status.includes('open') : true;
                          return isRevolving && isOpen;
                        });
                        const highUtilCount = revolvingOpen.filter((account: any) => {
                          const balance = parseFloat(account.CurrentBalance || account.balance || '0');
                          const limit = parseFloat(account.CreditLimit || account.limit || account.creditLimit || '0');
                          return !isNaN(balance) && !isNaN(limit) && limit > 0 && balance / limit > 0.3;
                        }).length;
                        return highUtilCount === 0 ? 'text-green-600' : 'text-red-600';
                      })()}`}>
                        {(() => {
                          const accounts = Array.isArray(reportData.accounts) ? reportData.accounts : [];
                          const revolvingOpen = accounts.filter((account: any) => {
                            const type = (account.CreditType || account.type || account.AccountType || '').toLowerCase();
                            const status = (account.AccountStatus || account.status || account.Status || account.OpenClosed || '').toLowerCase();
                            const isRevolving = type.includes('revolving') || type.includes('credit card');
                            const isOpen = status ? status.includes('open') : true;
                            return isRevolving && isOpen;
                          });
                          const highUtilCount = revolvingOpen.filter((account: any) => {
                            const balance = parseFloat(account.CurrentBalance || account.balance || '0');
                            const limit = parseFloat(account.CreditLimit || account.limit || account.creditLimit || '0');
                            return !isNaN(balance) && !isNaN(limit) && limit > 0 && balance / limit > 0.3;
                          }).length;
                          return highUtilCount;
                        })()}
                      </span>
                    </div>
                    <div className={`${(() => {
                      const accounts = Array.isArray(reportData.accounts) ? reportData.accounts : [];
                      const revolvingAccounts = accounts.filter((account: any) => {
                        const type = (account.CreditType || account.type || account.AccountType || '').toLowerCase();
                        const status = (account.AccountStatus || account.status || account.Status || account.OpenClosed || '').toLowerCase();
                        const isRevolving = type.includes('revolving') || type.includes('credit card');
                        const isOpen = status ? status.includes('open') : true;
                        return isRevolving && isOpen;
                      });
                      const totalBalance = revolvingAccounts.reduce((sum: number, account: any) => {
                        const balance = parseFloat(account.CurrentBalance || account.balance || '0');
                        return sum + (isNaN(balance) ? 0 : balance);
                      }, 0);
                      const totalLimit = revolvingAccounts.reduce((sum: number, account: any) => {
                        const limit = parseFloat(account.CreditLimit || account.limit || account.creditLimit || '0');
                        return sum + (isNaN(limit) ? 0 : limit);
                      }, 0);
                      const utilization = totalLimit > 0 ? Math.round((totalBalance / totalLimit) * 100) : 0;
                      const safeUtilization = isNaN(utilization) || !isFinite(utilization) ? 0 : utilization;
                      return safeUtilization <= 30 ? 'bg-green-50' : 'bg-red-50';
                    })()} rounded-lg p-2 text-center`}>
                      <div className={`text-sm font-medium ${(() => {
                        const accounts = Array.isArray(reportData.accounts) ? reportData.accounts : [];
                        const revolvingAccounts = accounts.filter((account: any) => {
                          const type = (account.CreditType || account.type || account.AccountType || '').toLowerCase();
                          const status = (account.AccountStatus || account.status || account.Status || account.OpenClosed || '').toLowerCase();
                          const isRevolving = type.includes('revolving') || type.includes('credit card');
                          const isOpen = status ? status.includes('open') : true;
                          return isRevolving && isOpen;
                        });
                        const totalBalance = revolvingAccounts.reduce((sum: number, account: any) => {
                          const balance = parseFloat(account.CurrentBalance || account.balance || '0');
                          return sum + (isNaN(balance) ? 0 : balance);
                        }, 0);
                        const totalLimit = revolvingAccounts.reduce((sum: number, account: any) => {
                          const limit = parseFloat(account.CreditLimit || account.limit || account.creditLimit || '0');
                          return sum + (isNaN(limit) ? 0 : limit);
                        }, 0);
                        const utilization = totalLimit > 0 ? Math.round((totalBalance / totalLimit) * 100) : 0;
                        const safeUtilization = isNaN(utilization) || !isFinite(utilization) ? 0 : utilization;
                        return safeUtilization <= 30 ? 'text-green-800' : 'text-red-800';
                      })()}`}>
                        {(() => {
                          const accounts = Array.isArray(reportData.accounts) ? reportData.accounts : [];
                          const revolvingAccounts = accounts.filter((account: any) => {
                            const type = (account.CreditType || account.type || account.AccountType || '').toLowerCase();
                            const status = (account.AccountStatus || account.status || account.Status || account.OpenClosed || '').toLowerCase();
                            const isRevolving = type.includes('revolving') || type.includes('credit card');
                            const isOpen = status ? status.includes('open') : true;
                            return isRevolving && isOpen;
                          });
                          const totalBalance = revolvingAccounts.reduce((sum: number, account: any) => {
                            const balance = parseFloat(account.CurrentBalance || account.balance || '0');
                            return sum + (isNaN(balance) ? 0 : balance);
                          }, 0);
                          const totalLimit = revolvingAccounts.reduce((sum: number, account: any) => {
                            const limit = parseFloat(account.CreditLimit || account.limit || account.creditLimit || '0');
                            return sum + (isNaN(limit) ? 0 : limit);
                          }, 0);
                          const utilization = totalLimit > 0 ? Math.round((totalBalance / totalLimit) * 100) : 0;
                          const safeUtilization = isNaN(utilization) || !isFinite(utilization) ? 0 : utilization;
                          return safeUtilization <= 30 ? 'Excellent Credit Management' : 'High Credit Usage';
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
  
            {/* Inquiries - Recent Inquiries Header */}
            <div className="bg-gradient-to-br from-orange-50 via-yellow-50 to-amber-50 rounded-2xl p-6 border-0 shadow-xl pdf-avoid-break">
                <div className="flex items-center gap-2 text-2xl font-bold text-orange-800 mb-2">
                  <Search className="h-8 w-8 text-orange-600" />
                  Recent Inquiries
                </div>
                <div className="text-lg text-orange-700">
                  Latest inquiries reported across bureaus
                </div>
            </div>
  
              <div className="bg-white rounded-xl border border-orange-200 overflow-x-auto pdf-avoid-break">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Creditor Name</TableHead>
                      <TableHead>Bureau</TableHead>
                      <TableHead>Date Inquiry</TableHead>
                      <TableHead>Industry</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(reportData?.inquiries) && reportData.inquiries.length > 0 ? (
                      [...reportData.inquiries]
                        .sort((a: any, b: any) => {
                          const da = new Date(
                            (a.dateOfInquiry || a.DateOfInquiry || a.DateInquiry || a.date || '') as string
                          ).getTime();
                          const db = new Date(
                            (b.dateOfInquiry || b.DateOfInquiry || b.DateInquiry || b.date || '') as string
                          ).getTime();
                          return isNaN(da) && isNaN(db) ? 0 : isNaN(da) ? 1 : isNaN(db) ? -1 : db - da;
                        })
                        .slice(0, 15)
                        .map((inq: any, idx: number) => {
                          const creditor = inq.CreditorName || inq.creditorName || inq.company || 'Unknown Creditor';
                          const rawBureau = inq.bureau ?? inq.Bureau ?? inq.BureauName ?? inq.BureauId;
                          const bureau =
                            typeof rawBureau === 'number'
                              ? rawBureau === 1
                                ? 'TransUnion'
                                : rawBureau === 2
                                ? 'Experian'
                                : rawBureau === 3
                                ? 'Equifax'
                                : 'Unknown'
                              : typeof rawBureau === 'string'
                              ? rawBureau
                              : 'Unknown';
                          const dateRaw = inq.dateOfInquiry || inq.DateOfInquiry || inq.DateInquiry || inq.date;
                          const dateStr = dateRaw
                            ? new Date(dateRaw).toLocaleDateString('en-US', {
                                month: 'short',
                                day: '2-digit',
                                year: 'numeric',
                              })
                            : 'N/A';
                          const industry = inq.Industry || inq.purpose || inq.InquiryType || 'N/A';
                          return (
                            <TableRow key={`inq-${idx}`}>
                              <TableCell className="font-medium text-gray-800">{creditor}</TableCell>
                              <TableCell>{bureau}</TableCell>
                              <TableCell>{dateStr}</TableCell>
                              <TableCell>{industry}</TableCell>
                            </TableRow>
                          );
                        })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-gray-500">
                          No inquiries found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            {/* Negative Aspects - Bad Accounts Header */}
            <div className="bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 rounded-2xl p-6 border-0 shadow-xl pdf-avoid-break">
                <div className="flex items-center gap-2 text-2xl font-bold text-red-800 mb-2">
                  <ThumbsDown className="h-8 w-8 text-red-600" />
                  Bad Accounts
                </div>
                <div className="text-lg text-red-700">
                  Accounts in collections, charge-off, delinquent, or past-due status
                </div>
            </div>

              <div className="bg-white rounded-xl border border-red-200 overflow-x-auto pdf-avoid-break">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account Number</TableHead>
                      <TableHead>Creditor Name</TableHead>
                      <TableHead>Bureau</TableHead>
                      <TableHead>Date Opened</TableHead>
                      <TableHead className="text-right">Current Balance</TableHead>
                      <TableHead className="text-right">Credit Limit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(reportData?.accounts) && reportData.accounts.length > 0 ? (
                      [...reportData.accounts]
                        .filter((account: any) => {
                          const type = (account.AccountType || account.type || '').toString().toLowerCase();
                          const status = (account.AccountStatus || account.status || account.AccountCondition || '').toString().toLowerCase();
                          const paymentStatus = (account.PaymentStatus || account.paymentStatus || '').toString().toLowerCase();
                          const creditor = (account.CreditorName || account.creditor || '').toString().toLowerCase();
                          return (
                            type.includes('collection') ||
                            status.includes('charge off') ||
                            status.includes('collection') ||
                            status.includes('delinquent') ||
                            status.includes('late') ||
                            status.includes('past due') ||
                            paymentStatus.includes('collection/chargeoff') ||
                            paymentStatus.includes('chargeoff') ||
                            paymentStatus.includes('delinquent') ||
                            paymentStatus.includes('late') ||
                            creditor.includes('collection')
                          );
                        })
                        .sort((a: any, b: any) => {
                          const da = new Date((a.DateOpened || a.opened || a.dateOpened || '') as string).getTime();
                          const db = new Date((b.DateOpened || b.opened || b.dateOpened || '') as string).getTime();
                          return isNaN(da) && isNaN(db) ? 0 : isNaN(da) ? 1 : isNaN(db) ? -1 : db - da;
                        })
                        .map((acc: any, idx: number) => {
                          const acctNum =
                            acc.AccountNumber ||
                            acc.accountNumber ||
                            acc.MaskAccountNumber ||
                            acc.maskAccountNumber ||
                            acc.MaskedAccountNumber ||
                            acc.maskedAccountNumber ||
                            'N/A';
                          const creditorName = acc.CreditorName || acc.creditor || 'Unknown';
                          const rawBureau = acc.bureau ?? acc.Bureau ?? acc.BureauName ?? acc.BureauId;
                          const bureau =
                            typeof rawBureau === 'number'
                              ? rawBureau === 1
                                ? 'Experian'
                                : rawBureau === 2
                                ? 'Equifax'
                                : rawBureau === 3
                                ? 'TransUnion'
                                : 'Unknown'
                              : typeof rawBureau === 'string'
                              ? rawBureau
                              : 'Unknown';
                          const openedRaw = acc.DateOpened || acc.opened || acc.dateOpened;
                          const openedStr = openedRaw
                            ? new Date(openedRaw).toLocaleDateString('en-US', {
                                month: 'short',
                                day: '2-digit',
                                year: 'numeric',
                              })
                            : 'N/A';
                          const balanceNum = parseFloat((acc.CurrentBalance ?? acc.balance ?? '0') as string);
                          const limitNum = parseFloat((acc.CreditLimit ?? acc.limit ?? acc.HighBalance ?? '0') as string);
                          return (
                            <TableRow key={`bad-${idx}`}>
                              <TableCell className="font-mono text-gray-700">{acctNum}</TableCell>
                              <TableCell className="font-medium text-gray-800">{creditorName}</TableCell>
                              <TableCell>{bureau}</TableCell>
                              <TableCell>{openedStr}</TableCell>
                              <TableCell className="text-right">${isNaN(balanceNum) ? '0' : balanceNum.toLocaleString()}</TableCell>
                              <TableCell className="text-right">${isNaN(limitNum) ? '0' : limitNum.toLocaleString()}</TableCell>
                            </TableRow>
                          );
                        })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500">
                          No accounts found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            {/* Positive Aspects - Good Standing Accounts Header */}
            <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl p-6 border-0 shadow-xl pdf-avoid-break">
                <div className="flex items-center gap-2 text-2xl font-bold text-green-800 mb-2">
                  <ThumbsUp className="h-8 w-8 text-green-600" />
                  Good Standing Accounts
                </div>
                <div className="text-lg text-green-700">
                  Open/current accounts in good standing
                </div>
            </div>

              <div className="bg-white rounded-xl border border-green-200 overflow-x-auto pdf-avoid-break">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account Number</TableHead>
                      <TableHead>Creditor Name</TableHead>
                      <TableHead>Bureau</TableHead>
                      <TableHead>Date Opened</TableHead>
                      <TableHead className="text-right">Current Balance</TableHead>
                      <TableHead className="text-right">Credit Limit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(reportData?.accounts) && reportData.accounts.length > 0 ? (
                      [...reportData.accounts]
                        .filter((account: any) => {
                          const type = (account.AccountType || account.type || '').toString().toLowerCase();
                          const status = (account.AccountStatus || account.status || account.AccountCondition || '').toString().toLowerCase();
                          const paymentStatus = (account.PaymentStatus || account.paymentStatus || '').toString().toLowerCase();
                          const creditor = (account.CreditorName || account.creditor || '').toString().toLowerCase();
                          const isNegative =
                            type.includes('collection') ||
                            status.includes('charge off') ||
                            status.includes('collection') ||
                            status.includes('delinquent') ||
                            status.includes('late') ||
                            status.includes('past due') ||
                            paymentStatus.includes('collection/chargeoff') ||
                            paymentStatus.includes('chargeoff') ||
                            paymentStatus.includes('delinquent') ||
                            paymentStatus.includes('late') ||
                            creditor.includes('collection');
                          const isGood = !isNegative && (status.includes('open') || status.includes('current') || status.includes('paid as agreed') || status.includes('paid in full'));
                          return isGood;
                        })
                        .sort((a: any, b: any) => {
                          const da = new Date((a.DateOpened || a.opened || a.dateOpened || '') as string).getTime();
                          const db = new Date((b.DateOpened || b.opened || b.dateOpened || '') as string).getTime();
                          return isNaN(da) && isNaN(db) ? 0 : isNaN(da) ? 1 : isNaN(db) ? -1 : db - da;
                        })
                        .map((acc: any, idx: number) => {
                          const acctNum =
                            acc.AccountNumber ||
                            acc.accountNumber ||
                            acc.MaskAccountNumber ||
                            acc.maskAccountNumber ||
                            acc.MaskedAccountNumber ||
                            acc.maskedAccountNumber ||
                            'N/A';
                          const creditorName = acc.CreditorName || acc.creditor || 'Unknown';
                          const rawBureau = acc.bureau ?? acc.Bureau ?? acc.BureauName ?? acc.BureauId;
                          const bureau =
                            typeof rawBureau === 'number'
                              ? rawBureau === 1
                                ? 'Experian'
                                : rawBureau === 2
                                ? 'Equifax'
                                : rawBureau === 3
                                ? 'TransUnion'
                                : 'Unknown'
                              : typeof rawBureau === 'string'
                              ? rawBureau
                              : 'Unknown';
                          const openedRaw = acc.DateOpened || acc.opened || acc.dateOpened;
                          const openedStr = openedRaw
                            ? new Date(openedRaw).toLocaleDateString('en-US', {
                                month: 'short',
                                day: '2-digit',
                                year: 'numeric',
                              })
                            : 'N/A';
                          const balanceNum = parseFloat((acc.CurrentBalance ?? acc.balance ?? '0') as string);
                          const limitNum = parseFloat((acc.CreditLimit ?? acc.limit ?? acc.HighBalance ?? '0') as string);
                          return (
                            <TableRow key={`good-${idx}`}>
                              <TableCell className="font-mono text-gray-700">{acctNum}</TableCell>
                              <TableCell className="font-medium text-gray-800">{creditorName}</TableCell>
                              <TableCell>{bureau}</TableCell>
                              <TableCell>{openedStr}</TableCell>
                              <TableCell className="text-right">${isNaN(balanceNum) ? '0' : balanceNum.toLocaleString()}</TableCell>
                              <TableCell className="text-right">${isNaN(limitNum) ? '0' : limitNum.toLocaleString()}</TableCell>
                            </TableRow>
                          );
                        })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500">
                          No accounts found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            {/* Common Mistakes Header */}
            <div className="bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 rounded-2xl p-6 border-0 shadow-xl pdf-avoid-break">
                <div className="flex items-center gap-2 text-2xl font-bold text-orange-800 mb-2">
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                  How to Avoid Common Pitfalls in Credit Management
                </div>
                <div className="text-lg text-orange-700">
                  Essential tips and strategies to ensure you maintain optimal credit health
                </div>
            </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pdf-avoid-break">
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border border-orange-200">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">
                          Regularly Review Your Credit Report
                        </h4>
                        <p className="text-sm text-gray-600">
                          Check your credit report at least once a year to
                          identify inaccuracies or outdated information that
                          might be affecting your score.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-orange-200">
                    <div className="flex items-start gap-3">
                      <Clock className="h-6 w-6 text-blue-600 mt-1" />
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">
                          Avoid Late Payments
                        </h4>
                        <p className="text-sm text-gray-600">
                          Set up payment reminders or automatic payments to
                          ensure you always pay bills on time. Payment history
                          is the most significant factor in your credit score.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-orange-200">
                    <div className="flex items-start gap-3">
                      <CreditCard className="h-6 w-6 text-purple-600 mt-1" />
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">
                          Manage Your Credit Utilization
                        </h4>
                        <p className="text-sm text-gray-600">
                          Keep credit card balances below 30% of your credit
                          limits to demonstrate responsible credit management to
                          lenders.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border border-orange-200">
                    <div className="flex items-start gap-3">
                      <Search className="h-6 w-6 text-orange-600 mt-1" />
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">
                          Apply for New Credit Sparingly
                        </h4>
                        <p className="text-sm text-gray-600">
                          Be strategic about applying for new credit. Space out
                          applications to minimize the impact of hard inquiries
                          on your credit score.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-orange-200">
                    <div className="flex items-start gap-3">
                      <Shield className="h-6 w-6 text-teal-600 mt-1" />
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">
                          Keep Old Credit Accounts Open
                        </h4>
                        <p className="text-sm text-gray-600">
                          Maintain older credit accounts to benefit from a
                          longer credit history, which positively influences
                          your credit score.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-orange-200">
                    <div className="flex items-start gap-3">
                      <BarChart className="h-6 w-6 text-indigo-600 mt-1" />
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">
                          Diversify Your Credit Portfolio
                        </h4>
                        <p className="text-sm text-gray-600">
                          Having a variety of credit types can improve your
                          credit score by showing lenders your ability to handle
                          different types of credit responsibly.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
  
          </div>
  
        

      {/* Eligibility Audit Modal */}
      <Dialog open={showEligibilityAuditModal} onOpenChange={setShowEligibilityAuditModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Run Funding Eligibility Audit</DialogTitle>
            <DialogDescription>
              Analyze current underwriting criteria and update client fundable status.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3">
            <Button size="lg" onClick={runEligibilityAudit} disabled={auditRunning}>
              {auditRunning ? 'Running...' : 'Run Audit'}
            </Button>
            <Button variant="outline" onClick={() => setShowEligibilityAuditModal(false)}>
              Dismiss
            </Button>
          </div>
          {auditResult && (
            <p className="text-sm text-muted-foreground mt-2">{auditResult}</p>
          )}
        </DialogContent>
      </Dialog>


    </ClientLayout>
  );
}

function Label({ children, className, ...props }: any) {
  return (
    <label className={`text-sm font-medium ${className}`} {...props}>
      {children}
    </label>
  );
}

{/* Custom CSS for enhanced animations */}
<style jsx>{`
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
      max-height: 0;
    }
    to {
      opacity: 1;
      transform: translateY(0);
      max-height: 1000px;
    }
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  .animate-fadeIn {
    animation: fadeIn 0.6s ease-out forwards;
  }

  .animate-slideInRight {
    animation: slideInRight 0.5s ease-out forwards;
  }

  .animate-slideInLeft {
    animation: slideInLeft 0.5s ease-out forwards;
  }

  .animate-slideDown {
    animation: slideDown 0.6s ease-out forwards;
  }

  .animate-scaleIn {
    animation: scaleIn 0.4s ease-out forwards;
  }

  .animate-pulse-custom {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  /* Smooth transitions for form elements */
  .form-transition {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Enhanced hover effects */
  .hover-lift:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }

  /* Step indicator animations */
  .step-indicator {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .step-indicator.active {
    transform: scale(1.05);
  }

  .step-indicator.completed {
    animation: scaleIn 0.3s ease-out;
  }
`}</style>
