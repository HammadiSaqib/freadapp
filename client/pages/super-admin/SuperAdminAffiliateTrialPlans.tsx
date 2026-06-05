import { useEffect, useRef, useState } from "react";
import SuperAdminLayout from "@/components/SuperAdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { superAdminApi } from "@/lib/api";
import {
  Pencil,
  Trash2,
  Plus,
  ChevronDown,
  Search,
  Loader2,
  CalendarDays,
  Clock,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type PlanStatus = "active" | "scheduled" | "draft" | "expired";

interface TrialPlan {
  id: number;
  affiliate_id: number;
  affiliate_first_name: string;
  affiliate_last_name: string;
  affiliate_email: string;
  affiliate_company: string | null;
  duration_months: number;
  max_clients: number | null;
  max_users: number | null;
  status: PlanStatus;
  effective_status: PlanStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface AffiliateOption {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  company_name: string | null;
}

type SaveMode = "active" | "scheduled" | "draft";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<PlanStatus, string> = {
  active: "bg-green-100 text-green-700 border-green-200",
  scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  expired: "bg-red-100 text-red-600 border-red-200",
};

function statusLabel(s: PlanStatus) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString();
}

// ─── Searchable Affiliate Dropdown (no portal – lives inside the Dialog DOM) ──

interface AffiliateDropdownProps {
  affiliates: AffiliateOption[];
  value: number | null;
  onChange: (id: number) => void;
  disabled?: boolean;
}

function AffiliateDropdown({ affiliates, value, onChange, disabled }: AffiliateDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = affiliates.find((a) => a.id === value);

  const filtered = affiliates.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.first_name.toLowerCase().includes(q) ||
      a.last_name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      (a.company_name || "").toLowerCase().includes(q)
    );
  });

  // Close when clicking outside this component
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = () => {
    if (disabled) return;
    setOpen((v) => {
      if (!v) setSearch("");
      return !v;
    });
  };

  const select = (id: number) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={toggle}
        className="flex items-center justify-between w-full px-3 py-2 text-sm border border-input rounded-md bg-background hover:bg-accent/50 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className={selected ? "" : "text-muted-foreground"}>
          {selected
            ? `${selected.first_name} ${selected.last_name} (${selected.email})`
            : "Select affiliate…"}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground ml-2 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown list – absolutely positioned within dialog (no portal needed) */}
      {open && (
        <div className="absolute left-0 top-full mt-1 w-full bg-white dark:bg-slate-900 border border-border rounded-md shadow-2xl overflow-hidden"
             style={{ zIndex: 9999 }}>
          {/* Search input */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search affiliates…"
                className="w-full pl-7 pr-2 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* List */}
          <ul className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">No affiliates found</li>
            )}
            {filtered.map((a) => (
              <li
                key={a.id}
                onMouseDown={(e) => {
                  e.preventDefault(); // keep focus in search input, fire selection
                  select(a.id);
                }}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-accent/60 ${
                  value === a.id ? "bg-accent font-medium" : ""
                }`}
              >
                {a.first_name} {a.last_name}
                <span className="ml-1 text-muted-foreground text-xs">({a.email})</span>
                {a.company_name && (
                  <span className="ml-1 text-muted-foreground text-xs">· {a.company_name}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Split-Save Button (no portal) ───────────────────────────────────────────

interface SplitSaveButtonProps {
  mode: SaveMode;
  onSelect: (mode: SaveMode) => void;
  onSave: () => void;
  loading: boolean;
}

const MODE_LABELS: Record<SaveMode, string> = {
  active: "Save",
  scheduled: "Schedule",
  draft: "Draft",
};

function SplitSaveButton({ mode, onSelect, onSave, loading }: SplitSaveButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const otherModes = (["active", "scheduled", "draft"] as SaveMode[]).filter((m) => m !== mode);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative flex">
      {/* Main action button */}
      <Button
        type="button"
        onClick={onSave}
        disabled={loading}
        className="rounded-r-none gradient-primary text-white pr-3"
      >
        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {MODE_LABELS[mode]}
      </Button>

      {/* Arrow toggle */}
      <Button
        type="button"
        disabled={loading}
        onClick={() => setOpen((v) => !v)}
        className="rounded-l-none border-l border-white/30 gradient-primary text-white px-2"
      >
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>

      {/* Mode dropdown – opens ABOVE the button (footer is at bottom of dialog) */}
      {open && (
        <div
          className="absolute bottom-full right-0 mb-1 bg-white dark:bg-slate-900 border border-border rounded-md shadow-2xl overflow-hidden min-w-full"
          style={{ zIndex: 9999 }}
        >
          {otherModes.map((m) => (
            <button
              key={m}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(m);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-accent/60 whitespace-nowrap"
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Create / Edit Modal ──────────────────────────────────────────────────────

interface PlanFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  affiliates: AffiliateOption[];
  editPlan?: TrialPlan | null;
}

function PlanFormModal({ open, onClose, onSaved, affiliates, editPlan }: PlanFormModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [affiliateId, setAffiliateId] = useState<number | null>(null);
  const [durationMonths, setDurationMonths] = useState("");
  const [maxClients, setMaxClients] = useState("");
  const [maxUsers, setMaxUsers] = useState("");
  const [saveMode, setSaveMode] = useState<SaveMode>("active");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editPlan) {
      setAffiliateId(editPlan.affiliate_id);
      setDurationMonths(String(editPlan.duration_months));
      setMaxClients(editPlan.max_clients != null ? String(editPlan.max_clients) : "");
      setMaxUsers(editPlan.max_users != null ? String(editPlan.max_users) : "");
      const s = editPlan.status as SaveMode;
      setSaveMode(s === "expired" ? "active" : s);
      setStartDate(editPlan.start_date ? editPlan.start_date.slice(0, 16) : "");
      setEndDate(editPlan.end_date ? editPlan.end_date.slice(0, 16) : "");
    } else {
      setAffiliateId(null);
      setDurationMonths("");
      setMaxClients("");
      setMaxUsers("");
      setSaveMode("active");
      setStartDate("");
      setEndDate("");
    }
  }, [open, editPlan]);

  const handleSave = async () => {
    if (!affiliateId) {
      toast({ title: "Affiliate is required", variant: "destructive" });
      return;
    }
    const dur = parseInt(durationMonths, 10);
    if (!durationMonths || isNaN(dur) || dur < 1) {
      toast({ title: "Duration must be a positive number", variant: "destructive" });
      return;
    }
    if (saveMode === "scheduled") {
      if (!startDate || !endDate) {
        toast({ title: "Start date and end date are required for scheduled plans", variant: "destructive" });
        return;
      }
      if (new Date(endDate) <= new Date(startDate)) {
        toast({ title: "End date must be after start date", variant: "destructive" });
        return;
      }
    }

    const parsedMaxClients = maxClients !== "" ? parseInt(maxClients, 10) : null;
    const parsedMaxUsers = maxUsers !== "" ? parseInt(maxUsers, 10) : null;

    const payload = {
      affiliate_id: affiliateId,
      duration_months: dur,
      max_clients: parsedMaxClients,
      max_users: parsedMaxUsers,
      status: saveMode,
      start_date: saveMode === "scheduled" ? startDate : null,
      end_date: saveMode === "scheduled" ? endDate : null,
    };

    setSaving(true);
    try {
      if (editPlan) {
        await superAdminApi.updateAffiliateTrialPlan(editPlan.id, payload);
        toast({ title: "Trial plan updated" });
      } else {
        await superAdminApi.createAffiliateTrialPlan(payload);
        toast({ title: "Trial plan created" });
      }
      onSaved();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to save trial plan";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      {/* overflow-visible so absolutely-positioned dropdowns are not clipped */}
      <DialogContent className="max-w-lg overflow-visible">
        <DialogHeader>
          <DialogTitle>{editPlan ? "Edit Trial Plan" : "Create Trial Plan"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Affiliate selector */}
          <div className="space-y-1.5">
            <Label>Affiliate</Label>
            <AffiliateDropdown
              affiliates={affiliates}
              value={affiliateId}
              onChange={setAffiliateId}
              disabled={saving}
            />
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <Label>Duration (months)</Label>
            <Input
              type="number"
              min={1}
              step={1}
              placeholder="e.g. 2"
              value={durationMonths}
              disabled={saving}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                setDurationMonths(val);
              }}
            />
          </div>

          {/* Limits */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Max Clients <span className="text-muted-foreground text-xs">(leave blank = unlimited)</span></Label>
              <Input
                type="number"
                min={1}
                step={1}
                placeholder="e.g. 50"
                value={maxClients}
                disabled={saving}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  setMaxClients(val);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Max Users <span className="text-muted-foreground text-xs">(leave blank = unlimited)</span></Label>
              <Input
                type="number"
                min={1}
                step={1}
                placeholder="e.g. 50"
                value={maxUsers}
                disabled={saving}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  setMaxUsers(val);
                }}
              />
            </div>
          </div>

          {/* Schedule fields – shown only when saveMode is 'scheduled' */}
          {saveMode === "scheduled" && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50 rounded-md border border-blue-100">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" /> Start Date & Time
                </Label>
                <Input
                  type="datetime-local"
                  value={startDate}
                  disabled={saving}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> End Date & Time
                </Label>
                <Input
                  type="datetime-local"
                  value={endDate}
                  disabled={saving}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              {startDate && endDate && new Date(endDate) <= new Date(startDate) && (
                <p className="col-span-2 text-xs text-red-600">End date must be after start date.</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <SplitSaveButton
            mode={saveMode}
            onSelect={setSaveMode}
            onSave={handleSave}
            loading={saving}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

interface DeleteDialogProps {
  plan: TrialPlan | null;
  onClose: () => void;
  onDeleted: () => void;
}

function DeleteDialog({ plan, onClose, onDeleted }: DeleteDialogProps) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!plan) return;
    setDeleting(true);
    try {
      await superAdminApi.deleteAffiliateTrialPlan(plan.id);
      toast({ title: "Trial plan deleted" });
      onDeleted();
      onClose();
    } catch {
      toast({ title: "Failed to delete trial plan", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={!!plan} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Trial Plan</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          Are you sure you want to delete the trial plan for{" "}
          <strong>
            {plan?.affiliate_first_name} {plan?.affiliate_last_name}
          </strong>
          ? This cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SuperAdminAffiliateTrialPlans() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<TrialPlan[]>([]);
  const [affiliates, setAffiliates] = useState<AffiliateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PlanStatus>("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<TrialPlan | null>(null);
  const [deletePlan, setDeletePlan] = useState<TrialPlan | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [plansRes, affsRes] = await Promise.all([
        superAdminApi.getAffiliateTrialPlans(),
        superAdminApi.getAffiliatesForTrialPlans(),
      ]);
      setPlans(plansRes.data?.plans || []);
      setAffiliates(affsRes.data?.affiliates || []);
    } catch {
      toast({ title: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filtered = plans.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      `${p.affiliate_first_name} ${p.affiliate_last_name}`.toLowerCase().includes(q) ||
      p.affiliate_email.toLowerCase().includes(q) ||
      (p.affiliate_company || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || p.effective_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <SuperAdminLayout
      title="Affiliate Trial Plans"
      description="Manage trial plan campaigns linked to affiliates"
    >
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by affiliate name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="scheduled">Scheduled</option>
          <option value="draft">Draft</option>
          <option value="expired">Expired</option>
        </select>

        <Button
          onClick={() => setCreateOpen(true)}
          className="gradient-primary text-white shrink-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Trial Plan
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">#</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Affiliate</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Duration</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Max Clients</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Max Users</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Start</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">End</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-muted-foreground">
                    No trial plans found.
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((plan, idx) => (
                  <tr
                    key={plan.id}
                    className="border-t border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {plan.affiliate_first_name} {plan.affiliate_last_name}
                      </div>
                      <div className="text-xs text-muted-foreground">{plan.affiliate_email}</div>
                      {plan.affiliate_company && (
                        <div className="text-xs text-muted-foreground">{plan.affiliate_company}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{plan.duration_months}</span>{" "}
                      <span className="text-muted-foreground">
                        month{plan.duration_months !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {plan.max_clients != null ? (
                        <span className="font-semibold">{plan.max_clients}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">Unlimited</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {plan.max_users != null ? (
                        <span className="font-semibold">{plan.max_users}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">Unlimited</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={STATUS_STYLES[plan.effective_status] || STATUS_STYLES.draft}
                      >
                        {statusLabel(plan.effective_status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(plan.start_date)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(plan.end_date)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(plan.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditPlan(plan)}
                          className="h-8 w-8 p-0"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletePlan(plan)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <PlanFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={fetchAll}
        affiliates={affiliates}
      />
      <PlanFormModal
        open={!!editPlan}
        onClose={() => setEditPlan(null)}
        onSaved={fetchAll}
        affiliates={affiliates}
        editPlan={editPlan}
      />
      <DeleteDialog
        plan={deletePlan}
        onClose={() => setDeletePlan(null)}
        onDeleted={fetchAll}
      />
    </SuperAdminLayout>
  );
}
