import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import {
  Copy,
  Download,
  FileArchive,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
  X,
  ArrowUpDown,
  FileText,
} from "lucide-react";

type SortOption = "newest" | "oldest" | "largest";
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "largest", label: "Largest (Most PDFs)" },
];

const STATUS_OPTIONS = [
  "Action Required",
  "Fail Review",
  "Processing",
  "Invoiced",
  "Awaiting Payment",
  "Printed",
  "Mailed",
  "Regenerates Letters",
] as const;

type PrintingStatus = (typeof STATUS_OPTIONS)[number];

const LEGACY_STATUS_MAP: Record<string, PrintingStatus> = {
  "Printed Awaiting Payment": "Awaiting Payment",
  "PRINTED and MAILED": "Mailed",
  "PROCESSING CURRENTLY PAUSED": "Regenerates Letters",
};

interface DisputeLetterZip {
  id: number;
  file_name: string | null;
  file_path: string | null;
  letter_count: number;
  print_status: string | null;
  print_note: string | null;
  created_at: string;
  client_first_name: string | null;
  client_last_name: string | null;
  client_email: string | null;
  admin_first_name: string | null;
  admin_last_name: string | null;
  admin_email: string | null;
  admin_phone: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const PAGE_LIMIT_OPTIONS = [20, 50, 80, 100, 200, 300, 400, 500];

const normalizePrintStatus = (status: string | null): PrintingStatus => {
  const value = String(status || "").trim();

  if (!value) {
    return "Action Required";
  }

  if ((STATUS_OPTIONS as readonly string[]).includes(value)) {
    return value as PrintingStatus;
  }

  return LEGACY_STATUS_MAP[value] || "Action Required";
};

const getNotePreview = (note: string | null) => {
  const value = String(note || "").trim();

  if (!value) {
    return "Add Note";
  }

  if (value.length <= 56) {
    return value;
  }

  return `${value.slice(0, 56).trim()}...`;
};

export default function PrintingTeamDisputeLetters() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DisputeLetterZip[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [inlineEditingNoteId, setInlineEditingNoteId] = useState<number | null>(null);
  const [inlineNoteDraft, setInlineNoteDraft] = useState("");
  const [inlineOriginalNote, setInlineOriginalNote] = useState("");
  const [noteDialogZip, setNoteDialogZip] = useState<DisputeLetterZip | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNoteId, setSavingNoteId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const userName = localStorage.getItem("userName") || "Printing Team";

  const fetchData = useCallback(
    async (page: number, limit: number, search: string = "", sort: SortOption = "newest") => {
      try {
        setLoading(true);
        const response = await api.get("/api/printing-team/dispute-letters", {
          params: {
            page,
            limit,
            sort,
            ...(search ? { search } : {}),
          },
        });

        if (response.data?.success) {
          setData(response.data.data || []);
          setPagination(response.data.pagination || { page, limit, total: 0, totalPages: 0 });
        }
      } catch (error: any) {
        console.error("Failed to fetch dispute letters:", error);
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          navigate("/login", { replace: true });
          return;
        }
        toast({
          title: "Error",
          description: "Failed to load dispute letters.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [navigate, toast]
  );

  useEffect(() => {
    fetchData(pagination.page, pagination.limit, "", sortBy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const normalizedSearch = searchInput.trim();
      if (normalizedSearch === activeSearch) {
        return;
      }

      setActiveSearch(normalizedSearch);
      fetchData(1, pagination.limit, normalizedSearch, sortBy);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput, activeSearch, pagination.limit, sortBy, fetchData]);

  const handlePageChange = (newPage: number) => {
    fetchData(newPage, pagination.limit, activeSearch, sortBy);
  };

  const handleLimitChange = (newLimit: string) => {
    fetchData(1, parseInt(newLimit, 10), activeSearch, sortBy);
  };

  const handleSortChange = (newSort: string) => {
    const sort = newSort as SortOption;
    setSortBy(sort);
    fetchData(1, pagination.limit, activeSearch, sort);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    if (!activeSearch) {
      return;
    }

    setActiveSearch("");
    fetchData(1, pagination.limit, "", sortBy);
  };

  const handleStatusChange = async (zipId: number, newStatus: string) => {
    try {
      setUpdatingStatusId(zipId);
      await api.patch(`/api/printing-team/dispute-letters/${zipId}/status`, {
        print_status: newStatus,
      });

      setData((prev) =>
        prev.map((row) =>
          row.id === zipId ? { ...row, print_status: newStatus } : row
        )
      );

      toast({ title: "Status Updated", description: `Set to "${newStatus}"` });
    } catch (error: any) {
      console.error("Failed to update status:", error);
      toast({
        title: "Error",
        description: "Failed to update status.",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const updateRowNote = useCallback((zipId: number, nextNote: string | null) => {
    setData((prev) =>
      prev.map((row) =>
        row.id === zipId ? { ...row, print_note: nextNote } : row,
      ),
    );
  }, []);

  const closeInlineNoteEditor = () => {
    setInlineEditingNoteId(null);
    setInlineNoteDraft("");
    setInlineOriginalNote("");
  };

  const persistNote = useCallback(
    async (
      zipId: number,
      rawNote: string,
      options: { showToast?: boolean; closeDialog?: boolean } = {},
    ) => {
      try {
        const nextNote = rawNote.trim();
        setSavingNoteId(zipId);

        await api.patch(`/api/printing-team/dispute-letters/${zipId}/note`, {
          print_note: nextNote || null,
        });

        updateRowNote(zipId, nextNote || null);

        if (options.showToast ?? true) {
          toast({
            title: "Note Saved",
            description: nextNote
              ? "Row note updated successfully."
              : "Row note cleared successfully.",
          });
        }

        if (options.closeDialog) {
          setNoteDialogZip(null);
          setNoteDraft("");
        }

        return nextNote;
      } catch (error: any) {
        console.error("Failed to update note:", error);
        toast({
          title: "Error",
          description: error?.response?.data?.error || "Failed to save note.",
          variant: "destructive",
        });
        return null;
      } finally {
        setSavingNoteId((current) => (current === zipId ? null : current));
      }
    },
    [toast, updateRowNote],
  );

  const startInlineNoteEdit = (zip: DisputeLetterZip) => {
    const currentDraft = inlineEditingNoteId === zip.id
      ? inlineNoteDraft
      : zip.print_note || "";

    setInlineEditingNoteId(zip.id);
    setInlineNoteDraft(currentDraft);
    setInlineOriginalNote(String(currentDraft).trim());
  };

  const openNoteEditor = (zip: DisputeLetterZip) => {
    const currentDraft = inlineEditingNoteId === zip.id
      ? inlineNoteDraft
      : zip.print_note || "";

    closeInlineNoteEditor();
    setNoteDialogZip({ ...zip, print_note: currentDraft || null });
    setNoteDraft(currentDraft);
  };

  const closeNoteEditor = () => {
    setNoteDialogZip(null);
    setNoteDraft("");
  };

  const handleSaveNote = async () => {
    if (!noteDialogZip) {
      return;
    }

    await persistNote(noteDialogZip.id, noteDraft, {
      showToast: true,
      closeDialog: true,
    });
  };

  const handleInlineNoteBlur = async () => {
    if (!inlineEditingNoteId) {
      return;
    }

    const currentId = inlineEditingNoteId;
    const currentDraft = inlineNoteDraft;
    const currentOriginal = inlineOriginalNote;

    closeInlineNoteEditor();

    if (savingNoteId === currentId || currentDraft.trim() === currentOriginal) {
      return;
    }

    await persistNote(currentId, currentDraft, { showToast: false });
  };

  const handleInlineNoteKeyDown = async (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    zipId: number,
  ) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeInlineNoteEditor();
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      if (savingNoteId === zipId) {
        return;
      }

      const savedNote = await persistNote(zipId, inlineNoteDraft, { showToast: false });
      if (savedNote !== null) {
        closeInlineNoteEditor();
      }
    }
  };

  const handleDialogNoteKeyDown = async (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      if (!noteDialogZip || savingNoteId === noteDialogZip.id) {
        return;
      }

      await handleSaveNote();
    }
  };

  useEffect(() => {
    if (!inlineEditingNoteId) {
      return;
    }

    const nextNote = inlineNoteDraft.trim();
    if (nextNote === inlineOriginalNote) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void persistNote(inlineEditingNoteId, inlineNoteDraft, { showToast: false }).then((savedNote) => {
        if (savedNote !== null) {
          setInlineOriginalNote(savedNote);
        }
      });
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [inlineEditingNoteId, inlineNoteDraft, inlineOriginalNote, persistNote]);

  const handleDownload = async (
    zip: DisputeLetterZip,
    options: { markProcessing?: boolean } = {},
  ) => {
    const shouldMarkProcessing = options.markProcessing ?? true;

    try {
      setDownloadingId(zip.id);
      const response = await api.get(
        `/api/printing-team/dispute-letters/${zip.id}/download`,
        {
          responseType: "blob",
          params: shouldMarkProcessing ? undefined : { markProcessing: "false" },
        }
      );

      const blob = new Blob([response.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = zip.file_name || `dispute_letters_${zip.id}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      if (shouldMarkProcessing && normalizePrintStatus(zip.print_status) === "Action Required") {
        setData((prev) =>
          prev.map((row) =>
            row.id === zip.id ? { ...row, print_status: "Processing" } : row
          )
        );
      }

      toast({ title: "Download Started", description: zip.file_name || "File downloading..." });
    } catch (error: any) {
      console.error("Download failed:", error);
      toast({
        title: "Download Failed",
        description: "Could not download the ZIP file.",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleFileNameClick = (zip: DisputeLetterZip) => {
    handleDownload(zip, { markProcessing: false });
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    navigate("/login", { replace: true });
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const handleCopyValue = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({
        title: `${label} Copied`,
        description: `${label} copied to clipboard.`,
      });
    } catch (error) {
      console.error(`Failed to copy ${label.toLowerCase()}:`, error);
      toast({
        title: "Copy Failed",
        description: `Could not copy ${label.toLowerCase()}.`,
        variant: "destructive",
      });
    }
  };

  const renderCopyableValue = (
    value: string | null | undefined,
    options: {
      label: string;
      className: string;
      wrapperClassName?: string;
      fallback?: string;
    },
  ) => {
    const fallback = options.fallback ?? "—";
    const displayValue = String(value || "").trim() || fallback;
    const canCopy = displayValue !== fallback;

    if (!canCopy) {
      return <span className={options.className}>{displayValue}</span>;
    }

    return (
      <div className={`group/copy flex max-w-full min-w-0 items-center ${options.wrapperClassName || ""}`} title={displayValue}>
        <span className={`min-w-0 flex-1 ${options.className}`}>{displayValue}</span>
        <button
          type="button"
          onClick={() => handleCopyValue(options.label, displayValue)}
          className="inline-flex h-5 w-0 shrink-0 items-center justify-center overflow-hidden rounded-md text-slate-400 opacity-0 transition-all duration-200 group-hover/copy:ml-2 group-hover/copy:w-5 group-hover/copy:opacity-100 hover:text-[#00d4ff] focus-visible:ml-2 focus-visible:w-5 focus-visible:opacity-100 focus-visible:outline-none"
          title={`Copy ${options.label}`}
          aria-label={`Copy ${options.label}`}
        >
          <Copy className="h-3 w-3" />
        </button>
      </div>
    );
  };

  const getStatusColor = (status: string | null) => {
    switch (normalizePrintStatus(status)) {
      case "Action Required":
        return "text-slate-700 bg-slate-100 border-slate-200";
      case "Fail Review":
        return "text-rose-700 bg-rose-50 border-rose-200";
      case "Processing":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "Invoiced":
        return "text-violet-600 bg-violet-50 border-violet-200";
      case "Awaiting Payment":
        return "text-amber-600 bg-amber-50 border-amber-200";
      case "Printed":
        return "text-cyan-700 bg-cyan-50 border-cyan-200";
      case "Mailed":
        return "text-emerald-600 bg-emerald-50 border-emerald-200";
      case "Regenerates Letters":
        return "text-orange-600 bg-orange-50 border-orange-200";
      default:
        return "text-slate-600 bg-slate-50 border-slate-200";
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const activeNoteOriginal = String(noteDialogZip?.print_note || "").trim();
  const isNoteDirty = noteDialogZip
    ? noteDraft.trim() !== activeNoteOriginal
    : false;

  return (
    <div className="min-h-screen bg-[#fafcff] font-sans overflow-x-hidden relative">
      {/* Background Electric Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#00d4ff] rounded-full mix-blend-multiply filter blur-[120px] opacity-10 pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#ff00ff] rounded-full mix-blend-multiply filter blur-[150px] opacity-10 pointer-events-none animate-pulse-slow" style={{ animationDelay: "2s" }}></div>

      {/* Navbar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
        <div className="flex items-center justify-between px-6 py-4 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-[#00d4ff]/20 to-[#7000ff]/20 p-2 rounded-2xl shadow-inner border border-white">
              <img src="/image.png" alt="The Capsol" className="w-9 h-9 rounded-xl shadow-md object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-[#7000ff] to-[#00d4ff] tracking-tight">
                Dispute Letters
              </h1>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Printing Team Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(pagination.page, pagination.limit, activeSearch, sortBy)}
              className="bg-white border-slate-200 text-slate-700 shadow-sm rounded-xl h-9"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleLogout} 
              title="Logout"
              className="bg-gradient-to-r from-slate-900 to-slate-800 text-white hover:opacity-90 shadow-md rounded-xl h-9 px-4 font-bold"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <motion.div 
        variants={containerVariants} 
        initial="hidden" 
        animate="show" 
        className="p-6 max-w-[1600px] mx-auto relative z-10 space-y-6"
      >
        {/* Search & Filters Card */}
        <motion.div variants={itemVariants} className="bg-white p-6 rounded-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
            
            <div className="relative flex-1 max-w-2xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search client, admin, phone, or zip file..."
                className="h-12 rounded-2xl border-slate-200 bg-slate-50 pl-12 pr-10 text-sm shadow-inner focus:bg-white focus:ring-2 focus:ring-[#00d4ff]/30 transition-all font-medium"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200 shadow-inner">
              <div className="flex items-center gap-2 pl-2">
                <ArrowUpDown className="h-4 w-4 text-slate-500" />
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="h-9 w-[160px] rounded-xl border-slate-200 bg-white font-semibold text-slate-700 shadow-sm text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl font-medium">
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="h-6 w-px bg-slate-200" />

              <div className="flex items-center gap-2 pr-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rows</span>
                <Select
                  value={String(pagination.limit)}
                  onValueChange={handleLimitChange}
                >
                  <SelectTrigger className="h-9 w-[80px] rounded-xl border-slate-200 bg-white font-semibold text-slate-700 shadow-sm text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl font-medium">
                    {PAGE_LIMIT_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={String(opt)}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

          </div>

          {/* Active Search Tags & Summary */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {activeSearch && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#00d4ff]/10 to-[#7000ff]/10 border border-[#7000ff]/20 px-4 py-1.5 text-xs font-bold text-[#7000ff]">
                  <Search className="h-3.5 w-3.5" />
                  <span>"{activeSearch}"</span>
                  <button
                    onClick={handleClearSearch}
                    className="ml-1 rounded-full p-0.5 hover:bg-[#7000ff]/20 text-[#7000ff]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              )}
            </div>
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 shadow-sm tabular-nums">
              {pagination.total > 0
                ? `${(pagination.page - 1) * pagination.limit + 1} - ${Math.min(
                    pagination.page * pagination.limit,
                    pagination.total
                  )} of ${pagination.total}`
                : activeSearch
                  ? "No matches"
                  : "0 records"}
            </span>
          </div>
        </motion.div>

        {/* Table Card */}
        <motion.div variants={itemVariants} className="bg-white rounded-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="overflow-hidden">
            <table className="w-full table-fixed text-sm border-collapse">
                <colgroup>
                  <col className="w-[10%]" />
                  <col className="w-[9%]" />
                  <col className="w-[8%]" />
                  <col className="w-[8%]" />
                  <col className="w-[10%]" />
                  <col className="w-[8%]" />
                  <col className="w-[5%]" />
                  <col className="w-[18%]" />
                  <col className="w-[9%]" />
                  <col className="w-[10%]" />
                  <col className="w-[5%]" />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="px-3 py-4 text-left font-bold text-slate-500 text-[11px] uppercase tracking-widest whitespace-nowrap">Client Email</th>
                    <th className="px-3 py-4 text-left font-bold text-slate-500 text-[11px] uppercase tracking-widest whitespace-nowrap">Client Name</th>
                    <th className="px-3 py-4 text-left font-bold text-slate-500 text-[11px] uppercase tracking-widest whitespace-nowrap">Date</th>
                    <th className="px-3 py-4 text-left font-bold text-slate-500 text-[11px] uppercase tracking-widest whitespace-nowrap">Admin Name</th>
                    <th className="px-3 py-4 text-left font-bold text-slate-500 text-[11px] uppercase tracking-widest whitespace-nowrap">Admin Email</th>
                    <th className="px-3 py-4 text-left font-bold text-slate-500 text-[11px] uppercase tracking-widest whitespace-nowrap">Admin Phone</th>
                    <th className="px-3 py-4 text-center font-bold text-slate-500 text-[11px] uppercase tracking-widest whitespace-nowrap">Files</th>
                    <th className="px-3 py-4 text-left font-bold text-slate-500 text-[11px] uppercase tracking-widest whitespace-nowrap">Zip File</th>
                    <th className="px-3 py-4 text-left font-bold text-slate-500 text-[11px] uppercase tracking-widest whitespace-nowrap">Status</th>
                    <th className="px-3 py-4 text-left font-bold text-slate-500 text-[11px] uppercase tracking-widest whitespace-nowrap">Note</th>
                    <th className="px-3 py-4 text-center font-bold text-slate-500 text-[11px] uppercase tracking-widest whitespace-nowrap">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence>
                    {loading ? (
                      <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <td colSpan={11} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center gap-4">
                            <div className="bg-gradient-to-br from-[#00d4ff]/20 to-[#7000ff]/20 p-4 rounded-full">
                              <Loader2 className="h-8 w-8 animate-spin text-[#7000ff]" />
                            </div>
                            <span className="font-bold text-slate-500 tracking-wide text-sm">Loading printing records...</span>
                          </div>
                        </td>
                      </motion.tr>
                    ) : data.length === 0 ? (
                      <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <td colSpan={11} className="h-64 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <div className="bg-slate-50 p-6 rounded-full border border-slate-100 shadow-inner">
                              <FileArchive className="h-12 w-12 text-slate-300" />
                            </div>
                            <span className="font-bold text-slate-500 tracking-wide text-sm">
                              {activeSearch
                                ? "No dispute letter ZIPs matched your search"
                                : "No dispute letter ZIPs found"}
                            </span>
                          </div>
                        </td>
                      </motion.tr>
                    ) : (
                      data.map((zip) => {
                        const clientName = [zip.client_first_name, zip.client_last_name]
                          .filter(Boolean)
                          .join(" ") || "—";
                        const adminName = [zip.admin_first_name, zip.admin_last_name]
                          .filter(Boolean)
                          .join(" ") || "—";
                        const formattedDate = formatDate(zip.created_at);
                        const printStatus = normalizePrintStatus(zip.print_status);

                        return (
                          <motion.tr 
                            key={zip.id} 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="hover:bg-slate-50/80 transition-colors group"
                          >
                            <td className="px-3 py-4 align-top">
                              {renderCopyableValue(zip.client_email, {
                                label: "Client Email",
                                className: "block break-words text-sm font-medium leading-6 text-slate-600",
                                wrapperClassName: "w-full",
                              })}
                            </td>
                            <td className="px-3 py-4 align-top">
                              {renderCopyableValue(clientName === "—" ? null : clientName, {
                                label: "Client Name",
                                className: "block truncate text-sm font-bold text-slate-800",
                              })}
                            </td>
                            <td className="px-3 py-4 align-top">
                              {renderCopyableValue(formattedDate, {
                                label: "Date",
                                className: "block text-xs font-semibold leading-5 text-slate-500",
                              })}
                            </td>
                            <td className="px-3 py-4 align-top">
                              {renderCopyableValue(adminName === "—" ? null : adminName, {
                                label: "Admin Name",
                                className: "block truncate text-sm font-bold text-slate-700",
                              })}
                            </td>
                            <td className="px-3 py-4 align-top">
                              {renderCopyableValue(zip.admin_email, {
                                label: "Admin Email",
                                className: "block break-words text-sm font-medium leading-6 text-slate-600",
                                wrapperClassName: "w-full",
                              })}
                            </td>
                            <td className="px-3 py-4 align-top">
                              {renderCopyableValue(zip.admin_phone, {
                                label: "Admin Phone",
                                className: "block truncate text-sm font-medium text-slate-600",
                              })}
                            </td>
                            <td className="px-3 py-4 text-center align-top">
                              <span className="inline-flex items-center justify-center min-w-[36px] gap-1.5 rounded-xl bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-black text-slate-700 shadow-sm">
                                <FileText className="h-3.5 w-3.5 text-[#00d4ff]" />
                                {zip.letter_count || 0}
                              </span>
                            </td>
                            <td className="px-3 py-4 align-top">
                              {zip.file_name ? (
                                <button
                                  onClick={() => handleFileNameClick(zip)}
                                  className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-[#7000ff] transition-colors group-hover:bg-white group-hover:shadow-sm px-3 py-1.5 rounded-xl border border-transparent group-hover:border-slate-200 w-full text-left overflow-hidden"
                                  title={zip.file_name}
                                >
                                  <FileArchive className="h-4 w-4 flex-shrink-0 text-[#00d4ff]" />
                                  <span className="truncate block w-full">{zip.file_name}</span>
                                </button>
                              ) : (
                                <span className="text-sm font-medium text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-3 py-4 align-top">
                              <Select
                                value={printStatus}
                                onValueChange={(value) => handleStatusChange(zip.id, value)}
                                disabled={updatingStatusId === zip.id}
                              >
                                <SelectTrigger
                                  className={`h-9 w-full text-xs font-bold rounded-xl shadow-sm border ${getStatusColor(printStatus)}`}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl font-medium">
                                  {STATUS_OPTIONS.map((status) => (
                                    <SelectItem key={status} value={status} className="text-xs font-semibold">
                                      {status}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-3 py-4 align-top" onDoubleClick={() => openNoteEditor(zip)}>
                              {inlineEditingNoteId === zip.id ? (
                                <div className="overflow-hidden rounded-xl border border-[#00d4ff]/30 bg-white shadow-sm ring-2 ring-[#00d4ff]/10">
                                  <Textarea
                                    autoFocus
                                    value={inlineNoteDraft}
                                    onChange={(event) => setInlineNoteDraft(event.target.value)}
                                    onBlur={() => void handleInlineNoteBlur()}
                                    placeholder="Add note for this row..."
                                    maxLength={2000}
                                    className="min-h-[88px] resize-none border-0 bg-transparent px-3 py-2 text-xs font-semibold leading-5 text-slate-700 shadow-none focus-visible:ring-0"
                                  />
                                </div>
                              ) : (
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => startInlineNoteEdit(zip)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                      event.preventDefault();
                                      startInlineNoteEdit(zip);
                                    }
                                  }}
                                  className={`w-full overflow-hidden cursor-text rounded-xl border px-3 py-2 text-left text-xs font-semibold shadow-sm transition-all ${zip.print_note?.trim()
                                    ? "border-slate-200 bg-white text-slate-700 hover:border-[#7000ff]/30 hover:bg-slate-50"
                                    : "border-dashed border-slate-200 bg-slate-50/80 text-slate-400 hover:border-[#00d4ff]/40 hover:text-slate-600"
                                  }`}
                                  title="Dubble Click For A Full View"
                                >
                                  <span className="block w-full truncate leading-5">{getNotePreview(zip.print_note)}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-4 text-center align-top">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(zip, { markProcessing: true })}
                                disabled={downloadingId === zip.id || !zip.file_name}
                                className="h-10 w-10 rounded-xl border-slate-200 bg-white p-0 shadow-sm transition-all hover:border-[#00d4ff] hover:bg-[#00d4ff]/5 group/btn"
                                title="Download ZIP"
                              >
                                {downloadingId === zip.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-[#00d4ff]" />
                                ) : (
                                  <Download className="h-4 w-4 text-slate-600 group-hover/btn:text-[#00d4ff]" />
                                )}
                              </Button>
                            </td>
                          </motion.tr>
                        );
                      })
                    )}
                  </AnimatePresence>
                </tbody>
            </table>
          </div>
        </motion.div>

        {/* Pagination Card */}
        {pagination.totalPages > 1 && (
          <motion.div variants={itemVariants} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-white shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
            <div className="text-sm font-bold text-slate-500 uppercase tracking-widest px-2">
              Page <span className="text-slate-800">{pagination.page}</span> of {pagination.totalPages}
            </div>
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 shadow-inner">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="bg-white rounded-lg border-slate-200 font-bold text-slate-600 shadow-sm h-9"
              >
                <ChevronLeft className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Prev</span>
              </Button>
              {/* Page number buttons */}
              <div className="hidden md:flex items-center gap-1 px-2">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === pagination.page ? "default" : "outline"}
                      size="sm"
                      className={`w-9 h-9 rounded-lg font-bold shadow-sm ${pageNum === pagination.page ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white border-transparent' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="bg-white rounded-lg border-slate-200 font-bold text-slate-600 shadow-sm h-9"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4 sm:ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        <Dialog open={!!noteDialogZip} onOpenChange={(open) => !open && closeNoteEditor()}>
          <DialogContent className="sm:max-w-lg rounded-3xl border border-slate-200 bg-white p-0 overflow-hidden">
            <DialogHeader className="border-b border-slate-100 px-6 py-5">
              <DialogTitle className="text-xl font-bold text-slate-800">
                Row Note
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-slate-500">
                Add an internal note for {noteDialogZip?.file_name || `ZIP #${noteDialogZip?.id || ""}`}. This note stays attached to this exact row.
              </DialogDescription>
            </DialogHeader>

            <div className="px-6 py-5 space-y-3">
              <Textarea
                autoFocus
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                onKeyDown={(event) => void handleDialogNoteKeyDown(event)}
                placeholder="Add a note for this ZIP row..."
                maxLength={2000}
                className="min-h-[180px] resize-y rounded-2xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#00d4ff]/30"
              />
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                <span>Only this row will use this note. Press Enter to save.</span>
                <span>{noteDraft.trim().length}/2000</span>
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 bg-slate-50/80 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={closeNoteEditor}
                className="border-slate-200 text-slate-600 hover:bg-white"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveNote}
                disabled={!noteDialogZip || savingNoteId === noteDialogZip.id || !isNoteDirty}
                className="bg-gradient-to-r from-slate-900 to-slate-800 text-white hover:opacity-90"
              >
                {savingNoteId === noteDialogZip?.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Note"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}
