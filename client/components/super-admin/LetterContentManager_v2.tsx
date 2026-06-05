import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  FileText,
  Loader2,
  Copy,
  Pencil,
  Check,
  X,
  BookOpen,
  Layers,
  FolderOpen,
  Sparkles,
  LayoutGrid,
} from "lucide-react";

const BUREAUS = ["ALL", "EX", "TU", "EQ"] as const;
const CONTENT_TYPES = ["STANDARD", "ENHANCED"] as const;
const ROUNDS = [1, 2, 3, 4, 5, 6] as const;
const BLOCK_ORDER = [
  "HEADER", "INTRO",
  ...Array.from({ length: 18 }, (_, i) => `BLOCK_${i + 1}`),
  "OUTRO",
];

const BUREAU_HEX: Record<string, string> = {
  ALL: "#1d4ed8", EX: "#1e40af", TU: "#b91c1c", EQ: "#15803d",
};
const BUREAU_LIGHT_HEX: Record<string, string> = {
  ALL: "#eff6ff", EX: "#eff6ff", TU: "#fff1f2", EQ: "#f0fdf4",
};
const BUREAU_LABELS: Record<string, string> = {
  ALL: "All Bureaus (Shared)", EX: "Experian", TU: "TransUnion", EQ: "Equifax",
};

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("token") || localStorage.getItem("auth_token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export default function LetterContentManager() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<string[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Navigation state
  const [selectedBureau, setSelectedBureau] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [formContent, setFormContent] = useState("");
  const [formBlockLabel, setFormBlockLabel] = useState("");
  const [formBlock, setFormBlock] = useState("HEADER");
  const [formRound, setFormRound] = useState(1);
  const [formCategory, setFormCategory] = useState("");
  const [formType, setFormType] = useState("STANDARD");

  // Block expansion state
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({});

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const UI_BUREAU = selectedBureau;

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/dispute-letter-content/categories", { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setCategories(data.data || []);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  }, []);

  // Load summary
  const loadSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedBureau !== "ALL") params.set("bureau", selectedBureau);
      const res = await fetch(`/api/dispute-letter-content/summary?${params}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setSummary(data.data || []);
    } catch (error) {
      console.error("Error loading summary:", error);
    }
  }, [selectedBureau]);

  // Load entries for selected path
  const loadEntries = useCallback(async () => {
    if (!selectedCategory || !selectedType || !selectedRound) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        bureau: selectedBureau,
        round: String(selectedRound),
        category: selectedCategory,
        type: selectedType,
      });
      if (selectedBlock) params.set("block", selectedBlock);
      const res = await fetch(`/api/dispute-letter-content?${params}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setEntries(data.data || []);
    } catch (error) {
      console.error("Error loading entries:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedBureau, selectedCategory, selectedType, selectedBlock, selectedRound]);

  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => {
    if (selectedCategory && selectedType && selectedRound) loadEntries();
  }, [selectedCategory, selectedType, selectedRound, selectedBlock, loadEntries]);

  // Summary aggregations
  const totalClauses = useMemo(() => {
    return summary.reduce((acc, s) => acc + Number(s.variant_count || 0), 0);
  }, [summary]);

  const categoriesForPath = useMemo(() => {
    const cats = new Set<string>();
    for (const s of summary) cats.add(s.category);
    return Array.from(cats);
  }, [summary]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of summary) counts[s.category] = (counts[s.category] || 0) + Number(s.variant_count || 0);
    return counts;
  }, [summary]);

  const typeCounts = useMemo(() => {
    if (!selectedCategory) return {};
    const counts: Record<string, number> = {};
    for (const s of summary) {
      if (s.category !== selectedCategory) continue;
      counts[s.type] = (counts[s.type] || 0) + Number(s.variant_count || 0);
    }
    return counts;
  }, [summary, selectedCategory]);

  const roundCounts = useMemo(() => {
    if (!selectedCategory || !selectedType) return {};
    const counts: Record<number, number> = {};
    for (const s of summary) {
      if (s.category !== selectedCategory || s.type !== selectedType) continue;
      counts[s.round] = (counts[s.round] || 0) + Number(s.variant_count || 0);
    }
    return counts;
  }, [summary, selectedCategory, selectedType]);

  const entriesByBlock = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    for (const e of entries) {
      const key = e.block || "UNKNOWN";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(e);
    }
    return grouped;
  }, [entries]);

  // Handlers
  const handleSave = async () => {
    if (!formContent.trim()) {
      toast({ title: "Content is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editingEntry) {
        await fetch(`/api/dispute-letter-content/${editingEntry.id}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({ clause_content: formContent, block_label: formBlockLabel || undefined }),
        });
        toast({ title: "Content updated successfully" });
      } else {
        await fetch("/api/dispute-letter-content", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            clause_content: formContent,
            bureau: selectedBureau,
            round: selectedRound || formRound,
            category: selectedCategory || formCategory,
            type: selectedType || formType,
            block: selectedBlock || formBlock,
            block_label: formBlockLabel || undefined,
          }),
        });
        toast({ title: "Content created successfully" });
      }
      setEditorOpen(false);
      setEditingEntry(null);
      setFormContent("");
      setFormBlockLabel("");
      loadSummary();
      loadEntries();
    } catch (error) {
      toast({ title: "Error saving content", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`/api/dispute-letter-content/${deleteTarget.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      toast({ title: "Content deleted successfully" });
      setDeleteTarget(null);
      loadSummary();
      loadEntries();
    } catch (error) {
      toast({ title: "Error deleting content", variant: "destructive" });
    }
  };

  const handleDuplicate = async (entry: any) => {
    try {
      await fetch("/api/dispute-letter-content", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          clause_content: entry.clause_content,
          bureau: entry.bureau,
          round: entry.round,
          category: entry.category,
          type: entry.type,
          block: entry.block,
          block_label: entry.block_label,
        }),
      });
      toast({ title: "Content duplicated" });
      loadEntries();
      loadSummary();
    } catch (error) {
      toast({ title: "Error duplicating", variant: "destructive" });
    }
  };

  const openCreate = () => {
    setEditingEntry(null);
    setFormContent("");
    setFormBlockLabel("");
    setFormBlock(selectedBlock || "HEADER");
    setFormRound(selectedRound || 1);
    setFormCategory(selectedCategory || "");
    setFormType(selectedType || "STANDARD");
    setEditorOpen(true);
  };

  const openEdit = (entry: any) => {
    setEditingEntry(entry);
    setFormContent(entry.clause_content || "");
    setFormBlockLabel(entry.block_label || "");
    setFormBlock(entry.block || "HEADER");
    setFormRound(entry.round || 1);
    setFormCategory(entry.category || "");
    setFormType(entry.type || "STANDARD");
    setEditorOpen(true);
  };

  const handleCancelEditor = () => {
    if (editingEntry) {
      openCreate();
      return;
    }

    setEditorOpen(false);
  };

  // Navigation
  const goBack = () => {
    if (selectedRound !== null) { setSelectedRound(null); setEntries([]); }
    else if (selectedBlock !== null) setSelectedBlock(null);
    else if (selectedType !== null) setSelectedType(null);
    else if (selectedCategory !== null) setSelectedCategory(null);
  };

  const resetAll = () => {
    setSelectedCategory(null);
    setSelectedType(null);
    setSelectedBlock(null);
    setSelectedRound(null);
    setEntries([]);
  };

  // Inline editor render
  const renderInlineEditor = () => {
    const title = editingEntry ? "Edit Clause" : "New Clause";
    const description = editingEntry
      ? `Editing clause #${editingEntry.id}`
      : "Fill in the details below to create a new clause variant.";

    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div>
            <p className="text-sm font-semibold text-slate-800">{title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          </div>
          {editingEntry && (
            <Badge variant="outline" className="font-mono text-[11px] bg-white border-slate-300 text-slate-500">
              ID #{editingEntry.id}
            </Badge>
          )}
        </div>

        <div className="p-5 space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {!editingEntry && !selectedCategory && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Category</Label>
                <Input
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="e.g. Credit Accounts"
                  className="bg-white border-slate-200 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}
            {!editingEntry && !selectedType && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Template Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger className="bg-white border-slate-200 focus:ring-2 focus:ring-blue-500/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Block</Label>
              <Select value={formBlock} onValueChange={setFormBlock}>
                <SelectTrigger className="bg-white border-slate-200 focus:ring-2 focus:ring-blue-500/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BLOCK_ORDER.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2 xl:col-span-1">
              <Label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Block Name</Label>
              <Input
                value={formBlockLabel}
                onChange={(e) => setFormBlockLabel(e.target.value)}
                placeholder="Optional label..."
                className="bg-white border-slate-200 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            {!editingEntry && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700 uppercase tracking-wide">Round</Label>
                <Select value={String(formRound)} onValueChange={(v) => setFormRound(Number(v))}>
                  <SelectTrigger className="bg-white border-slate-200 focus:ring-2 focus:ring-blue-500/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROUNDS.map((r) => (
                      <SelectItem key={r} value={String(r)}>Round {r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <Textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="Enter the clause content here... Use {{PLACEHOLDER}} for dynamic values."
              className="min-h-[200px] font-mono text-sm border-0 focus-visible:ring-0 resize-y"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              onClick={handleCancelEditor}
              className="border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm shadow-blue-500/20"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              {editingEntry ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Breadcrumb
  const renderBreadcrumb = () => {
    const parts: { label: string; onClick: () => void }[] = [];
    if (selectedCategory) parts.push({ label: selectedCategory, onClick: () => { setSelectedType(null); setSelectedBlock(null); setSelectedRound(null); setEntries([]); } });
    if (selectedType) parts.push({ label: selectedType, onClick: () => { setSelectedBlock(null); setSelectedRound(null); setEntries([]); } });
    if (selectedBlock) parts.push({ label: selectedBlock, onClick: () => { setSelectedRound(null); setEntries([]); } });
    if (selectedRound) parts.push({ label: `Round ${selectedRound}`, onClick: () => {} });

    if (parts.length === 0) return null;
    return (
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={goBack}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 shadow-sm"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
        </button>
        <div className="flex items-center">
          <button onClick={resetAll} className="text-sm text-slate-400 hover:text-slate-600 transition-opacity hover:opacity-70">
            All
          </button>
          {parts.map((p, i) => (
            <span key={i} className="flex items-center">
              <ChevronRight className="h-3 w-3 mx-1 text-slate-300" />
              <button
                onClick={p.onClick}
                className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-opacity hover:opacity-70"
              >
                {p.label}
              </button>
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      {/* ─── HEADER BAR ─── */}
      <div
        className="shrink-0 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #1e40af 45%, #2563eb 100%)" }}
      >
        <div className="pointer-events-none absolute -top-10 -right-10 h-48 w-48 rounded-full opacity-10 bg-white" />
        <div className="pointer-events-none absolute -bottom-6 right-32 h-28 w-28 rounded-full opacity-10 bg-white" />
        <div className="pointer-events-none absolute top-4 left-1/2 h-16 w-16 rounded-full opacity-10 bg-white" />

        <div className="relative flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 shadow-lg">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Letter Content Manager</h1>
              <p className="text-xs text-blue-200 mt-0.5">Manage dispute letter clauses by category, type, block & round</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 ring-1 ring-white/15">
              <Layers className="h-4 w-4 text-blue-200" />
              <span className="text-sm font-semibold text-white">{totalClauses}</span>
              <span className="text-xs text-blue-200">total clauses</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 ring-1 ring-white/15">
              <LayoutGrid className="h-4 w-4 text-blue-200" />
              <span className="text-sm font-semibold text-white">{categoriesForPath.length}</span>
              <span className="text-xs text-blue-200">categories</span>
            </div>
            {/* Bureau selector */}
            <Select value={selectedBureau} onValueChange={(v) => { setSelectedBureau(v); resetAll(); }}>
              <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white ring-1 ring-white/15 focus:ring-2 focus:ring-white/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUREAUS.map((b) => (
                  <SelectItem key={b} value={b}>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: BUREAU_HEX[b] }} />
                      {BUREAU_LABELS[b]}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Inline editor when open */}
        {editorOpen && (
          <div className="mb-6">
            {renderInlineEditor()}
          </div>
        )}

        {/* Category Selection (no category picked) */}
        {!selectedCategory && !editorOpen && (
          <div className="h-full flex flex-col">
            <div className="mb-5 flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm"
                style={{ backgroundColor: BUREAU_HEX[UI_BUREAU] }}
              >
                <LayoutGrid className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Categories</h2>
                <p className="text-xs text-slate-400">Start with a category, then drill into type, block, and round.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {(categories.length > 0 ? categories : Object.keys(categoryCounts)).map((cat) => (
                <button
                  key={cat}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300"
                  onClick={() => setSelectedCategory(cat)}
                >
                  <div className="p-5">
                    <div
                      className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl shadow-sm"
                      style={{ backgroundColor: BUREAU_LIGHT_HEX[UI_BUREAU] }}
                    >
                      <FileText className="h-5 w-5" style={{ color: BUREAU_HEX[UI_BUREAU] }} />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-800 line-clamp-2">{cat}</p>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                        style={{ backgroundColor: BUREAU_HEX[UI_BUREAU] }}
                      >
                        {categoryCounts[cat] || 0}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Browse template types, blocks, and rounds inside this category.</p>
                  </div>
                </button>
              ))}
              {categories.length === 0 && Object.keys(categoryCounts).length === 0 && (
                <div className="col-span-full text-center py-16 text-slate-400">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm font-medium">No categories found</p>
                  <p className="text-xs mt-1">Create your first letter content to get started.</p>
                  <Button onClick={openCreate} className="mt-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-sm shadow-blue-500/20">
                    <Plus className="h-4 w-4 mr-2" /> Add First Clause
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Type Selection */}
        {selectedCategory && !selectedType && !editorOpen && (
          <div>
            {renderBreadcrumb()}
            <div className="grid gap-4 sm:grid-cols-2">
              {CONTENT_TYPES.map((type) => (
                <button
                  key={type}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300"
                  onClick={() => setSelectedType(type)}
                >
                  <div className="p-5">
                    <div
                      className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl shadow-sm"
                      style={{ backgroundColor: type === "STANDARD" ? "#dbeafe" : "#dcfce7" }}
                    >
                      <Layers className="h-5 w-5" style={{ color: type === "STANDARD" ? "#1d4ed8" : "#15803d" }} />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-800">{type}</p>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                        style={{ backgroundColor: BUREAU_HEX[UI_BUREAU] }}
                      >
                        {typeCounts[type] || 0}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {type === "STANDARD" ? "Default wording for shared dispute flows." : "Enhanced wording path for stronger letters."}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Round Selection */}
        {selectedCategory && selectedType && !selectedRound && !editorOpen && (
          <div>
            {renderBreadcrumb()}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {ROUNDS.map((round) => (
                <button
                  key={round}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300"
                  onClick={() => setSelectedRound(round)}
                >
                  <div className="h-1.5 w-full" style={{ backgroundColor: BUREAU_HEX[UI_BUREAU] }} />
                  <div className="p-5">
                    <div
                      className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-white text-lg font-bold shadow-sm"
                      style={{ backgroundColor: BUREAU_HEX[UI_BUREAU] }}
                    >
                      {round}
                    </div>
                    <p className="text-sm font-semibold text-slate-800">Round {round}</p>
                    <p className="mt-1 text-xs text-slate-400">{roundCounts[round] || 0} clause variants</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Entries View (full path selected) */}
        {selectedCategory && selectedType && selectedRound && !editorOpen && (
          <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Entries header */}
            <div
              className="shrink-0 px-5 py-4 border-b border-slate-100"
              style={{ backgroundColor: BUREAU_LIGHT_HEX[selectedBureau] }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={goBack}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 shadow-sm"
                  >
                    <ChevronRight className="h-4 w-4 rotate-180" />
                  </button>
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm"
                    style={{ backgroundColor: BUREAU_HEX[selectedBureau] }}
                  >
                    <FolderOpen className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-slate-400">{selectedCategory}</span>
                    <ChevronRight className="h-3 w-3 mx-1 text-slate-300" />
                    <span className="text-slate-400">{selectedType}</span>
                    <ChevronRight className="h-3 w-3 mx-1 text-slate-300" />
                    <span className="font-semibold text-slate-700">Round {selectedRound}</span>
                  </div>
                </div>
                <Button
                  onClick={openCreate}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm shadow-blue-500/20"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Clause
                </Button>
              </div>
            </div>

            {/* Entries body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : Object.keys(entriesByBlock).length > 0 ? (
                BLOCK_ORDER.filter((b) => entriesByBlock[b]).map((block) => {
                  const blockEntries = entriesByBlock[block];
                  const isExpanded = expandedBlocks[block] ?? true;
                  return (
                    <div key={block} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all duration-150 hover:shadow">
                      {/* Block header */}
                      <button
                        className="flex w-full items-center justify-between px-4 py-3 hover:bg-slate-50/80 transition-colors duration-100"
                        onClick={() => setExpandedBlocks((prev) => ({ ...prev, [block]: !isExpanded }))}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="flex h-7 w-7 items-center justify-center rounded-lg"
                            style={{ backgroundColor: BUREAU_HEX[UI_BUREAU] }}
                          >
                            {isExpanded
                              ? <ChevronDown className="h-3.5 w-3.5 text-white" />
                              : <ChevronRight className="h-3.5 w-3.5 text-white" />
                            }
                          </div>
                          <span className="text-sm font-semibold text-slate-800">{block}</span>
                          {blockEntries[0]?.block_label && (
                            <span className="text-xs text-slate-400">({blockEntries[0].block_label})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                            style={{ backgroundColor: BUREAU_HEX[UI_BUREAU] }}
                          >
                            {blockEntries.length}
                          </span>
                        </div>
                      </button>

                      {/* Block entries */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 p-4 space-y-2">
                          {blockEntries.map((entry: any, idx: number) => (
                            <div
                              key={entry.id}
                              className="group relative rounded-xl border border-slate-100 bg-white p-4 transition-all duration-150 hover:border-slate-200 hover:shadow-sm cursor-pointer"
                              onClick={() => openEdit(entry)}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <span
                                    className="rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
                                    style={{ backgroundColor: BUREAU_HEX[UI_BUREAU] }}
                                  >
                                    #{idx + 1}
                                  </span>
                                  <span className="text-[11px] font-mono text-slate-400">ID {entry.id}</span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
                                  <button
                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600 shadow-sm"
                                    onClick={(e) => { e.stopPropagation(); handleDuplicate(entry); }}
                                    title="Duplicate"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600 shadow-sm"
                                    onClick={(e) => { e.stopPropagation(); openEdit(entry); }}
                                    title="Edit"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-white text-red-400 hover:bg-red-50 hover:text-red-600 shadow-sm"
                                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(entry); }}
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                              <div className="prose prose-sm max-w-none text-sm text-slate-700 [&_*]:text-slate-700 [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5 line-clamp-4">
                                {entry.clause_content}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-16 text-slate-400">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm font-medium">No clauses yet</p>
                  <p className="text-xs mt-1">Add your first clause variant for this path.</p>
                  <Button onClick={openCreate} className="mt-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-sm shadow-blue-500/20">
                    <Plus className="h-4 w-4 mr-2" /> Add First Clause
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── DELETE DIALOG ─── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl border border-slate-200 shadow-xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
                <Trash2 className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-bold text-slate-800">Delete Clause</AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-slate-500">
                  Are you sure you want to delete clause{" "}
                  <span className="font-semibold text-slate-700">#{deleteTarget?.id}</span>?
                  This action cannot be undone.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-500/20"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
