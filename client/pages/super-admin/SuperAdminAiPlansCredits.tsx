import { useEffect, useMemo, useState } from "react";
import SuperAdminLayout from "@/components/SuperAdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { superAdminApi } from "@/lib/api";
import { Brain, CreditCard, Edit, Loader2, MessageSquare, Plus, RefreshCw, Trash2 } from "lucide-react";

type AiPlan = {
  id: number;
  name?: string;
  plan_name?: string;
  description?: string;
  plan_description?: string | null;
  price?: number;
  price_cents?: number;
  credits?: number;
  prompt_count?: number;
  prompts?: number;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

type AiPlanForm = {
  name: string;
  description: string;
  price: string;
  credits: string;
  prompts: string;
};

const emptyForm: AiPlanForm = {
  name: "",
  description: "",
  price: "",
  credits: "",
  prompts: "",
};

function getPlanName(plan: AiPlan) {
  return plan.name || plan.plan_name || "Untitled plan";
}

function getPlanDescription(plan: AiPlan) {
  return plan.description || plan.plan_description || "";
}

function getPlanPrice(plan: AiPlan) {
  if (typeof plan.price === "number") return plan.price;
  return Number(plan.price_cents || 0) / 100;
}

function getPlanPrompts(plan: AiPlan) {
  return Number(plan.prompt_count ?? plan.prompts ?? 0);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(value) ? value : 0);
}

function keepDigits(value: string) {
  return value.replace(/\D/g, "");
}

function keepMoney(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  const decimals = rest.join("").slice(0, 2);
  return rest.length > 0 ? `${whole}.${decimals}` : whole;
}

export default function SuperAdminAiPlansCredits() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<AiPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AiPlan | null>(null);
  const [form, setForm] = useState<AiPlanForm>(emptyForm);

  const stats = useMemo(() => {
    const totalPrompts = plans.reduce((sum, plan) => sum + getPlanPrompts(plan), 0);
    const totalCredits = plans.reduce((sum, plan) => sum + Number(plan.credits || 0), 0);
    const averagePrice = plans.length > 0
      ? plans.reduce((sum, plan) => sum + getPlanPrice(plan), 0) / plans.length
      : 0;

    return { totalPrompts, totalCredits, averagePrice };
  }, [plans]);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const response = await superAdminApi.getAiPlans();
      setPlans(response.data?.plans || []);
    } catch (error: any) {
      toast({
        title: "Unable to load AI plans",
        description: error?.response?.data?.error || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const openCreateDialog = () => {
    setEditingPlan(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (plan: AiPlan) => {
    setEditingPlan(plan);
    setForm({
      name: getPlanName(plan),
      description: getPlanDescription(plan),
      price: String(getPlanPrice(plan)),
      credits: String(plan.credits || 0),
      prompts: String(getPlanPrompts(plan)),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const description = form.description.trim();
    const price = Number(form.price);
    const credits = Number(form.credits);
    const prompts = Number(form.prompts);

    if (!name || !Number.isFinite(price) || price < 0 || !Number.isInteger(credits) || credits < 0 || !Number.isInteger(prompts) || prompts < 1) {
      toast({
        title: "Check the plan details",
        description: "Plan name, price, credits, and prompt count are required.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        description,
        price,
        credits,
        prompt_count: prompts,
      };

      if (editingPlan) {
        await superAdminApi.updateAiPlan(editingPlan.id, payload);
        toast({ title: "AI plan updated" });
      } else {
        await superAdminApi.createAiPlan(payload);
        toast({ title: "AI plan created" });
      }

      setDialogOpen(false);
      setEditingPlan(null);
      setForm(emptyForm);
      await loadPlans();
    } catch (error: any) {
      toast({
        title: editingPlan ? "Unable to update AI plan" : "Unable to create AI plan",
        description: error?.response?.data?.error || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plan: AiPlan) => {
    if (!window.confirm(`Delete ${getPlanName(plan)}?`)) {
      return;
    }

    setDeletingId(plan.id);
    try {
      await superAdminApi.deleteAiPlan(plan.id);
      setPlans((current) => current.filter((entry) => entry.id !== plan.id));
      toast({ title: "AI plan deleted" });
    } catch (error: any) {
      toast({
        title: "Unable to delete AI plan",
        description: error?.response?.data?.error || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <SuperAdminLayout
      title="AI Plans & Credits"
      description="Create and manage AI prompt credit packages for admins"
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">AI Plans & Credits</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              These plans appear inside AI Coach for admin purchase.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={loadPlans} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={openCreateDialog} className="bg-blue-600 text-white hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Create AI Plans & Credits
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Plans</CardTitle>
              <Brain className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{plans.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Prompts</CardTitle>
              <MessageSquare className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats.totalPrompts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Average Price</CardTitle>
              <CreditCard className="h-4 w-4 text-violet-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{formatMoney(stats.averagePrice)}</div>
              <div className="mt-1 text-xs text-slate-500">{stats.totalCredits} total credits</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Prompt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-sm text-slate-500">
                        Loading AI plans...
                      </TableCell>
                    </TableRow>
                  ) : plans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-sm text-slate-500">
                        No AI plans created yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    plans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium text-slate-900">{getPlanName(plan)}</TableCell>
                        <TableCell className="max-w-[320px] truncate text-slate-600">
                          {getPlanDescription(plan) || "Optional description not added"}
                        </TableCell>
                        <TableCell>{formatMoney(getPlanPrice(plan))}</TableCell>
                        <TableCell>{Number(plan.credits || 0)}</TableCell>
                        <TableCell>{getPlanPrompts(plan)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                            Active
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditDialog(plan)}>
                              <Edit className="mr-1.5 h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(plan)}
                              disabled={deletingId === plan.id}
                              className="border-red-200 text-red-600 hover:bg-red-500"
                            >
                              {deletingId === plan.id ? (
                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="mr-1.5 h-4 w-4" />
                              )}
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Update AI Plans & Credits" : "Create AI Plans & Credits"}</DialogTitle>
            <DialogDescription>
              Set the price, credits, and exact prompt amount admins receive after purchase.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="ai-plan-name">Plan Name</Label>
              <Input
                id="ai-plan-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Starter AI Credits"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ai-plan-description">Plan Description (Optional)</Label>
              <Textarea
                id="ai-plan-description"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Short note shown to admins before purchase"
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="ai-plan-price">Price</Label>
                <Input
                  id="ai-plan-price"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(event) => setForm((current) => ({ ...current, price: keepMoney(event.target.value) }))}
                  placeholder="29.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ai-plan-credits">Credits</Label>
                <Input
                  id="ai-plan-credits"
                  inputMode="numeric"
                  value={form.credits}
                  onChange={(event) => setForm((current) => ({ ...current, credits: keepDigits(event.target.value) }))}
                  placeholder="100"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ai-plan-prompts">Prompt</Label>
                <Input
                  id="ai-plan-prompts"
                  inputMode="numeric"
                  value={form.prompts}
                  onChange={(event) => setForm((current) => ({ ...current, prompts: keepDigits(event.target.value) }))}
                  placeholder="13"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white hover:bg-blue-700">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingPlan ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}
