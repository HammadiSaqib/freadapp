import { useEffect, useMemo, useRef, useState } from "react";
import SupportLayout from "@/components/SupportLayout";
import SuperAdminLayout from "@/components/SuperAdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supportApi } from "@/lib/api";
import { FileText as FileTextIcon, Image as ImageIcon, Loader2, Pencil, Plus, Trash2, CheckCircle2, Clock, ListTodo } from "lucide-react";

type TaskStatus = "pending" | "in_progress" | "completed" | "rejected";
type TaskPriority = "normal" | "medium" | "priority";

type AttachmentPreview = {
  name: string;
  url: string | null;
  isImage: boolean;
};

type Task = {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  screenshot_url: string | null;
  attachment_urls: string[];
  rejection_reason?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by_first_name?: string;
  created_by_last_name?: string;
  created_by_email?: string;
  updated_by_first_name?: string;
  updated_by_last_name?: string;
  updated_by_email?: string;
};

const statusOptions: Array<{ value: TaskStatus; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
];

const priorityOptions: Array<{ value: TaskPriority; label: string }> = [
  { value: "normal", label: "Normal" },
  { value: "medium", label: "Medium" },
  { value: "priority", label: "Priority" },
];

const statusBadgeClasses: Record<TaskStatus, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-rose-100 text-rose-700 border-rose-200",
};

const formatStatus = (status: TaskStatus) =>
  status === "in_progress"
    ? "In Progress"
    : status.charAt(0).toUpperCase() + status.slice(1);

const priorityBadgeClasses: Record<TaskPriority, string> = {
  normal: "bg-slate-100 text-slate-700 border-slate-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  priority: "bg-rose-100 text-rose-700 border-rose-200",
};

const formatPriority = (priority: TaskPriority) =>
  priority === "priority" ? "Priority" : priority.charAt(0).toUpperCase() + priority.slice(1);

const taskFileAccept = "image/*,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.zip";

const isImageMimeType = (value: string) => value.toLowerCase().startsWith("image/");

const getTaskAttachmentUrls = (task: Pick<Task, "attachment_urls" | "screenshot_url"> | null | undefined) => {
  if (!task) return [];
  if (Array.isArray(task.attachment_urls) && task.attachment_urls.length > 0) {
    return task.attachment_urls;
  }
  return task.screenshot_url ? [task.screenshot_url] : [];
};

export default function SupportTasks() {
  const { toast } = useToast();
  const shouldUseSuperAdminLayout =
    typeof window !== "undefined" &&
    (
      window.location.hostname.toLowerCase().startsWith("super-admin.") ||
      window.location.pathname.startsWith("/super-admin")
    );
  const LayoutComponent = shouldUseSuperAdminLayout ? SuperAdminLayout : SupportLayout;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("pending");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TaskPriority>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<TaskStatus>("pending");
  const [formPriority, setFormPriority] = useState<TaskPriority>("normal");
  const [formAttachments, setFormAttachments] = useState<File[]>([]);
  const [formAttachmentPreviews, setFormAttachmentPreviews] = useState<AttachmentPreview[]>([]);
  const [formRejectionReason, setFormRejectionReason] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<TaskStatus>("pending");
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<number>>(new Set());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTask, setPreviewTask] = useState<Task | null>(null);
  const [previewStatus, setPreviewStatus] = useState<TaskStatus>("pending");
  const [previewRejectionReason, setPreviewRejectionReason] = useState("");
  const [previewStatusSaving, setPreviewStatusSaving] = useState(false);
  const [editPriority, setEditPriority] = useState<TaskPriority>("normal");
  const [editAttachments, setEditAttachments] = useState<File[]>([]);
  const [editAttachmentPreviews, setEditAttachmentPreviews] = useState<AttachmentPreview[]>([]);
  const [editRejectionReason, setEditRejectionReason] = useState("");
  const [rejectedFilterMode, setRejectedFilterMode] = useState<"rejected" | "in_progress">("rejected");
  const rejectedFilterClickCountRef = useRef(0);
  const rejectedFilterResetTimeoutRef = useRef<number | null>(null);

  const isImageUrl = (text: string) => {
    if (text.startsWith("data:image/")) {
      return true;
    }

    try {
      const url = new URL(text, window.location.origin);
      const pathname = url.pathname.toLowerCase();
      return (
        pathname.endsWith(".png") ||
        pathname.endsWith(".jpg") ||
        pathname.endsWith(".jpeg") ||
        pathname.endsWith(".gif") ||
        pathname.endsWith(".webp") ||
        pathname.endsWith(".bmp") ||
        pathname.endsWith(".svg")
      );
    } catch {
      const normalized = text.toLowerCase().split("?")[0].split("#")[0];
      return (
        normalized.endsWith(".png") ||
        normalized.endsWith(".jpg") ||
        normalized.endsWith(".jpeg") ||
        normalized.endsWith(".gif") ||
        normalized.endsWith(".webp") ||
        normalized.endsWith(".bmp") ||
        normalized.endsWith(".svg")
      );
    }
  };

  const setAttachmentPreviews = (files: File[], setter: (previews: AttachmentPreview[]) => void) => {
    const previews = files.map((file) => ({
      name: file.name,
      isImage: isImageMimeType(file.type),
      url: isImageMimeType(file.type) ? URL.createObjectURL(file) : null,
    }));
    setter(previews);
    return () => {
      previews.forEach((preview) => {
        if (preview.url) {
          URL.revokeObjectURL(preview.url);
        }
      });
    };
  };

  const handleTitlePasteCreate = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const cd = e.clipboardData;
    if (!cd) return;

    for (const item of Array.from(cd.items)) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file && file.type.startsWith("image/")) {
          e.preventDefault();
          setFormAttachments((prev) => [...prev, file]);
          toast({ title: "Attachment added", description: "Image pasted into Title moved to Attachments." });
          return;
        }
      }
    }

    const text = cd.getData("text");
    if (text && isImageUrl(text.trim())) {
      try {
        const resp = await fetch(text.trim());
        const blob = await resp.blob();
        if (blob.type.startsWith("image/")) {
          e.preventDefault();
          const name = (text.split("/").pop() || "pasted-image").split("?")[0];
          const file = new File([blob], name, { type: blob.type });
          setFormAttachments((prev) => [...prev, file]);
          toast({ title: "Attachment added", description: "Image URL pasted moved to Attachments." });
        }
      } catch {
        // Allow normal paste if fetch fails
      }
    }
  };

  const handleTitlePasteEdit = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const cd = e.clipboardData;
    if (!cd) return;

    for (const item of Array.from(cd.items)) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file && file.type.startsWith("image/")) {
          e.preventDefault();
          setEditAttachments((prev) => [...prev, file]);
          toast({ title: "Attachment added", description: "Image pasted into Title moved to Attachments." });
          return;
        }
      }
    }

    const text = cd.getData("text");
    if (text && isImageUrl(text.trim())) {
      try {
        const resp = await fetch(text.trim());
        const blob = await resp.blob();
        if (blob.type.startsWith("image/")) {
          e.preventDefault();
          const name = (text.split("/").pop() || "pasted-image").split("?")[0];
          const file = new File([blob], name, { type: blob.type });
          setEditAttachments((prev) => [...prev, file]);
          toast({ title: "Attachment added", description: "Image URL pasted moved to Attachments." });
        }
      } catch {
      }
    }
  };

  useEffect(() => {
    return setAttachmentPreviews(editAttachments, setEditAttachmentPreviews);
  }, [editAttachments]);

  useEffect(() => {
    return setAttachmentPreviews(formAttachments, setFormAttachmentPreviews);
  }, [formAttachments]);

  useEffect(() => {
    if (previewTask) {
      setPreviewStatus(previewTask.status);
      setPreviewRejectionReason(previewTask.rejection_reason || "");
    }
  }, [previewTask]);

  useEffect(() => {
    return () => {
      if (rejectedFilterResetTimeoutRef.current) {
        window.clearTimeout(rejectedFilterResetTimeoutRef.current);
      }
    };
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const response = await supportApi.getTasks();
      setTasks(response.data?.data || []);
    } catch {
      toast({
        title: "Failed to load tasks",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = tasks.filter((task) => {
      const statusMatch = statusFilter === "all" || task.status === statusFilter;
      if (!statusMatch) return false;
      const priorityMatch = priorityFilter === "all" || task.priority === priorityFilter;
      if (!priorityMatch) return false;
      if (!query) return true;
      const text = [
        task.title,
        task.description,
        task.created_by_first_name,
        task.created_by_last_name,
        task.created_by_email,
        task.updated_by_first_name,
        task.updated_by_last_name,
        task.updated_by_email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(query);
    });
    const priorityOrder: Record<TaskPriority, number> = {
      priority: 3,
      medium: 2,
      normal: 1,
    };
    return filtered.sort((a, b) => {
      const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      if (priorityDiff !== 0) return priorityDiff;
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bDate - aDate;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter]);

  const taskStats = useMemo(() => {
    const completed = tasks.filter((t) => t.status === "completed");
    const inProgress = tasks.filter((t) => t.status === "in_progress");
    const pending = tasks.filter((t) => t.status === "pending");
    const rejected = tasks.filter((t) => t.status === "rejected");
    return {
      totalTasks: tasks.length,
      completedTasks: completed.length,
      completedBreakdown: {
        normal: completed.filter((t) => t.priority === "normal").length,
        medium: completed.filter((t) => t.priority === "medium").length,
        priority: completed.filter((t) => t.priority === "priority").length,
      },
      pendingTasks: pending.length,
      pendingBreakdown: {
        normal: pending.filter((t) => t.priority === "normal").length,
        medium: pending.filter((t) => t.priority === "medium").length,
        priority: pending.filter((t) => t.priority === "priority").length,
      },
      totalBreakdown: {
        normal: tasks.filter((t) => t.priority === "normal").length,
        medium: tasks.filter((t) => t.priority === "medium").length,
        priority: tasks.filter((t) => t.priority === "priority").length,
        inProgress: inProgress.length,
        rejected: rejected.length,
      },
    };
  }, [tasks]);

  const applySummaryFilter = (
    nextStatus: "all" | TaskStatus,
    nextPriority: "all" | TaskPriority = "all",
  ) => {
    setStatusFilter(nextStatus);
    setPriorityFilter(nextPriority);
  };

  const getSummaryFilterButtonClasses = (
    nextStatus: "all" | TaskStatus,
    nextPriority: "all" | TaskPriority = "all",
  ) => {
    const isActive = statusFilter === nextStatus && priorityFilter === nextPriority;
    return [
      "w-full rounded-lg text-left transition-colors cursor-pointer",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      isActive ? "bg-primary/10 text-foreground" : "hover:bg-muted/60",
    ].join(" ");
  };

  const handleRejectedSummaryButtonClick = () => {
    if (rejectedFilterMode === "in_progress") {
      setRejectedFilterMode("rejected");
      rejectedFilterClickCountRef.current = 0;
      if (rejectedFilterResetTimeoutRef.current) {
        window.clearTimeout(rejectedFilterResetTimeoutRef.current);
        rejectedFilterResetTimeoutRef.current = null;
      }
      applySummaryFilter("rejected");
      return;
    }

    rejectedFilterClickCountRef.current += 1;

    if (rejectedFilterResetTimeoutRef.current) {
      window.clearTimeout(rejectedFilterResetTimeoutRef.current);
      rejectedFilterResetTimeoutRef.current = null;
    }

    if (rejectedFilterClickCountRef.current >= 3) {
      setRejectedFilterMode("in_progress");
      rejectedFilterClickCountRef.current = 0;
      applySummaryFilter("in_progress");
      return;
    }

    rejectedFilterResetTimeoutRef.current = window.setTimeout(() => {
      rejectedFilterClickCountRef.current = 0;
      rejectedFilterResetTimeoutRef.current = null;
    }, 700);

    applySummaryFilter("rejected");
  };

  const resetCreateForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormStatus("pending");
    setFormPriority("normal");
    setFormAttachments([]);
    setFormRejectionReason("");
  };

  const handleCreate = async () => {
    const title = formTitle.trim();
    const description = formDescription.trim();
    if (!title || !description) {
      toast({
        title: "Missing fields",
        description: "Title and description are required.",
        variant: "destructive",
      });
      return;
    }
    const rejectionReason = formRejectionReason.trim();
    if (formStatus === "rejected" && !rejectionReason) {
      toast({
        title: "Rejection reason required",
        description: "Please enter a rejection reason before saving a rejected task.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const response = await supportApi.createTask({
        title,
        description,
        status: formStatus,
        priority: formPriority,
        rejection_reason: formStatus === "rejected" ? rejectionReason : null,
        attachments: formAttachments,
      });
      const created = response.data?.data as Task | undefined;
      if (created) {
        setTasks((prev) => [created, ...prev]);
      }
      setCreateOpen(false);
      resetCreateForm();
      toast({ title: "Task created" });
    } catch {
      toast({
        title: "Failed to create task",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (task: Task) => {
    setSelectedTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description);
    setEditStatus(task.status);
    setEditPriority(task.priority);
    setEditRejectionReason(task.rejection_reason || "");
    setEditAttachments([]);
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!selectedTask) return;
    const title = editTitle.trim();
    const description = editDescription.trim();
    if (!title || !description) {
      toast({
        title: "Missing fields",
        description: "Title and description are required.",
        variant: "destructive",
      });
      return;
    }
    const rejectionReason = editRejectionReason.trim();
    if (editStatus === "rejected" && !rejectionReason) {
      toast({
        title: "Rejection reason required",
        description: "Please enter a rejection reason before saving a rejected task.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const response = await supportApi.updateTask(selectedTask.id, {
        title,
        description,
        status: editStatus,
        priority: editPriority,
        rejection_reason: editStatus === "rejected" ? rejectionReason : null,
        attachments: editAttachments,
      });
      const updated = response.data?.data as Task | undefined;
      if (updated) {
        setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)));
      }
      setEditOpen(false);
      setSelectedTask(null);
      setEditAttachments([]);
      setEditRejectionReason("");
      toast({ title: "Task updated" });
    } catch {
      toast({
        title: "Failed to update task",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (task: Task, status: TaskStatus) => {
    if (status === task.status) return;
    try {
      let rejectionReason: string | null = null;
      if (status === "rejected") {
        const nextReason = window.prompt("Enter the rejection reason", task.rejection_reason || "");
        if (nextReason === null) {
          return;
        }
        rejectionReason = nextReason.trim();
        if (!rejectionReason) {
          toast({
            title: "Rejection reason required",
            description: "Please enter a rejection reason before rejecting the task.",
            variant: "destructive",
          });
          return;
        }
      }
      const response = await supportApi.updateTask(task.id, {
        status,
        rejection_reason: status === "rejected" ? rejectionReason : null,
      });
      const updated = response.data?.data as Task | undefined;
      if (updated) {
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      }
    } catch {
      toast({
        title: "Failed to update status",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePreviewStatusSave = async () => {
    if (!previewTask) return;
    const rejectionReason = previewRejectionReason.trim();
    if (previewStatus === previewTask.status && rejectionReason === (previewTask.rejection_reason || "")) return;
    if (previewStatus === "rejected" && !rejectionReason) {
      toast({
        title: "Rejection reason required",
        description: "Please enter a rejection reason before rejecting the task.",
        variant: "destructive",
      });
      return;
    }
    setPreviewStatusSaving(true);
    try {
      const response = await supportApi.updateTask(previewTask.id, {
        status: previewStatus,
        rejection_reason: previewStatus === "rejected" ? rejectionReason : null,
      });
      const updated = response.data?.data as Task | undefined;
      if (updated) {
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        setPreviewTask(updated);
        setPreviewRejectionReason(updated.rejection_reason || "");
        toast({ title: "Status updated" });
      }
    } catch {
      toast({
        title: "Failed to update status",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setPreviewStatusSaving(false);
    }
  };

  const handleDelete = async (task: Task) => {
    const confirmed = window.confirm("Delete this task?");
    if (!confirmed) return;
    try {
      await supportApi.deleteTask(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      toast({ title: "Task deleted" });
    } catch {
      toast({
        title: "Failed to delete task",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <LayoutComponent title="Project Tasks" description="Track and manage support tasks and project updates">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Tasks</CardTitle>
              <CardDescription>Create, update, and track task progress</CardDescription>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Task
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[640px]">
                <DialogHeader>
                  <DialogTitle>Create Task</DialogTitle>
                  <DialogDescription>Share task details and upload multiple attachments if needed</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title</label>
                    <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} onPaste={handleTitlePasteCreate} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={4} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <Select value={formStatus} onValueChange={(value) => setFormStatus(value as TaskStatus)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Priority</label>
                      <Select value={formPriority} onValueChange={(value) => setFormPriority(value as TaskPriority)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          {priorityOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Attachments</label>
                      <Input
                        type="file"
                        accept={taskFileAccept}
                        multiple
                        onChange={(e) => setFormAttachments(Array.from(e.target.files || []))}
                      />
                    </div>
                  </div>
                  {formStatus === "rejected" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Rejection Reason</label>
                      <Textarea
                        value={formRejectionReason}
                        onChange={(e) => setFormRejectionReason(e.target.value)}
                        rows={3}
                        placeholder="Explain why this task is being rejected"
                      />
                    </div>
                  )}
                  {formAttachmentPreviews.length > 0 && (
                    <div className="rounded-lg border p-3 space-y-3">
                      <p className="text-sm font-medium">Selected Attachments</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        {formAttachmentPreviews.map((preview) => (
                          <div key={`${preview.name}-${preview.url || "file"}`} className="rounded-md border p-3 space-y-2">
                            <p className="text-sm font-medium break-all">{preview.name}</p>
                            {preview.isImage && preview.url ? (
                              <img src={preview.url} alt={preview.name} className="w-full h-40 object-cover rounded-md" />
                            ) : (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <FileTextIcon className="h-4 w-4" />
                                File ready to upload
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 space-y-3 h-full">
                  <button
                    type="button"
                    className={getSummaryFilterButtonClasses("all")}
                    onClick={() => applySummaryFilter("all")}
                  >
                    <div className="flex items-center justify-between p-2">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">All Tasks</p>
                        <h3 className="text-2xl font-bold">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : taskStats.totalTasks}</h3>
                      </div>
                      <div className="p-2 bg-slate-100 rounded-full">
                        <ListTodo className="h-4 w-4 text-slate-700" />
                      </div>
                    </div>
                  </button>
                  {!loading && (
                    <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground border-t pt-2">
                      <button
                        type="button"
                        className={getSummaryFilterButtonClasses("all", "normal")}
                        onClick={() => applySummaryFilter("all", "normal")}
                      >
                        <div className="flex flex-col p-2">
                          <span className="font-medium text-slate-700">Normal</span>
                          <span>{taskStats.totalBreakdown.normal}</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        className={getSummaryFilterButtonClasses("all", "medium")}
                        onClick={() => applySummaryFilter("all", "medium")}
                      >
                        <div className="flex flex-col p-2">
                          <span className="font-medium text-amber-700">Medium</span>
                          <span>{taskStats.totalBreakdown.medium}</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        className={getSummaryFilterButtonClasses("all", "priority")}
                        onClick={() => applySummaryFilter("all", "priority")}
                      >
                        <div className="flex flex-col p-2">
                          <span className="font-medium text-rose-700">Priority</span>
                          <span>{taskStats.totalBreakdown.priority}</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        className={getSummaryFilterButtonClasses(rejectedFilterMode)}
                        onClick={handleRejectedSummaryButtonClick}
                      >
                        <div className="flex flex-col p-2">
                          <span className="font-medium text-rose-700">
                            {rejectedFilterMode === "in_progress" ? "In Progress" : "Rejected"}
                          </span>
                          <span>
                            {rejectedFilterMode === "in_progress"
                              ? taskStats.totalBreakdown.inProgress
                              : taskStats.totalBreakdown.rejected}
                          </span>
                        </div>
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <button
                    type="button"
                    className={getSummaryFilterButtonClasses("completed")}
                    onClick={() => applySummaryFilter("completed")}
                  >
                    <div className="flex items-center justify-between p-2">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Completed</p>
                        <h3 className="text-2xl font-bold">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : taskStats.completedTasks}</h3>
                      </div>
                      <div className="p-2 bg-green-100 rounded-full">
                        <CheckCircle2 className="h-4 w-4 text-green-700" />
                      </div>
                    </div>
                  </button>
                  {!loading && (
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground border-t pt-2">
                      <button
                        type="button"
                        className={getSummaryFilterButtonClasses("completed", "normal")}
                        onClick={() => applySummaryFilter("completed", "normal")}
                      >
                        <div className="flex flex-col p-2">
                          <span className="font-medium text-slate-700">Normal</span>
                          <span>{taskStats.completedBreakdown.normal}</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        className={getSummaryFilterButtonClasses("completed", "medium")}
                        onClick={() => applySummaryFilter("completed", "medium")}
                      >
                        <div className="flex flex-col p-2">
                          <span className="font-medium text-amber-700">Medium</span>
                          <span>{taskStats.completedBreakdown.medium}</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        className={getSummaryFilterButtonClasses("completed", "priority")}
                        onClick={() => applySummaryFilter("completed", "priority")}
                      >
                        <div className="flex flex-col p-2">
                          <span className="font-medium text-rose-700">Priority</span>
                          <span>{taskStats.completedBreakdown.priority}</span>
                        </div>
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <button
                    type="button"
                    className={getSummaryFilterButtonClasses("pending")}
                    onClick={() => applySummaryFilter("pending")}
                  >
                    <div className="flex items-center justify-between p-2">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Pending</p>
                        <h3 className="text-2xl font-bold">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : taskStats.pendingTasks}</h3>
                      </div>
                      <div className="p-2 bg-amber-100 rounded-full">
                        <Clock className="h-4 w-4 text-amber-700" />
                      </div>
                    </div>
                  </button>
                  {!loading && (
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground border-t pt-2">
                      <button
                        type="button"
                        className={getSummaryFilterButtonClasses("pending", "normal")}
                        onClick={() => applySummaryFilter("pending", "normal")}
                      >
                        <div className="flex flex-col p-2">
                          <span className="font-medium text-slate-700">Normal</span>
                          <span>{taskStats.pendingBreakdown.normal}</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        className={getSummaryFilterButtonClasses("pending", "medium")}
                        onClick={() => applySummaryFilter("pending", "medium")}
                      >
                        <div className="flex flex-col p-2">
                          <span className="font-medium text-amber-700">Medium</span>
                          <span>{taskStats.pendingBreakdown.medium}</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        className={getSummaryFilterButtonClasses("pending", "priority")}
                        onClick={() => applySummaryFilter("pending", "priority")}
                      >
                        <div className="flex flex-col p-2">
                          <span className="font-medium text-rose-700">Priority</span>
                          <span>{taskStats.pendingBreakdown.priority}</span>
                        </div>
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="w-full">
              <div className="relative w-full">
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Update</TableHead>
                    <TableHead>Attachments</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Updated By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading tasks
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                        No tasks found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTasks.map((task) => {
                      const attachmentUrls = getTaskAttachmentUrls(task);
                      return (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.title}</TableCell>
                        <TableCell className="max-w-[320px] text-sm text-muted-foreground">
                          <div className={expandedTaskIds.has(task.id) ? "" : "line-clamp-2"}>{task.description}</div>
                          {task.rejection_reason && (
                            <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">
                              Rejection reason: {task.rejection_reason}
                            </div>
                          )}
                          {expandedTaskIds.has(task.id) ? (
                            <button
                              type="button"
                              className="mt-1 text-sm text-emerald-600"
                              onClick={() =>
                                setExpandedTaskIds((prev) => {
                                  const next = new Set(prev);
                                  next.delete(task.id);
                                  return next;
                                })
                              }
                            >
                              Read less
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="mt-1 text-sm text-emerald-600"
                              onClick={() =>
                                setExpandedTaskIds((prev) => {
                                  const next = new Set(prev);
                                  next.add(task.id);
                                  return next;
                                })
                              }
                            >
                              Read more
                            </button>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusBadgeClasses[task.status]}>
                            {formatStatus(task.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={priorityBadgeClasses[task.priority]}>
                            {formatPriority(task.priority)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select value={task.status} onValueChange={(value) => handleStatusChange(task, value as TaskStatus)}>
                            <SelectTrigger className="h-9 w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {attachmentUrls.length > 0 ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-sm text-primary"
                              onClick={() => {
                                setPreviewTask(task);
                                setPreviewStatus(task.status);
                                setPreviewRejectionReason(task.rejection_reason || "");
                                setPreviewOpen(true);
                              }}
                            >
                              <ImageIcon className="h-4 w-4" />
                              {attachmentUrls.length === 1 ? "1 file" : `${attachmentUrls.length} files`}
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {task.created_by_first_name || task.created_by_last_name
                            ? `${task.created_by_first_name || ""} ${task.created_by_last_name || ""}`.trim()
                            : task.created_by_email || "System"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {task.updated_by_first_name || task.updated_by_last_name
                            ? `${task.updated_by_first_name || ""} ${task.updated_by_last_name || ""}`.trim()
                            : task.updated_by_email || "System"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEdit(task)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDelete(task)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Update task details and status</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onPaste={handleTitlePasteEdit} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={4} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={editStatus} onValueChange={(value) => setEditStatus(value as TaskStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select value={editPriority} onValueChange={(value) => setEditPriority(value as TaskPriority)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Attachments</label>
              <Input
                type="file"
                accept={taskFileAccept}
                multiple
                onChange={(e) => setEditAttachments(Array.from(e.target.files || []))}
              />
            </div>
            {editStatus === "rejected" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Rejection Reason</label>
                <Textarea
                  value={editRejectionReason}
                  onChange={(e) => setEditRejectionReason(e.target.value)}
                  rows={3}
                  placeholder="Explain why this task is being rejected"
                />
              </div>
            )}
            {getTaskAttachmentUrls(selectedTask).length > 0 && (
              <div className="rounded-lg border p-3 space-y-3">
                <p className="text-sm font-medium">Existing Attachments</p>
                <div className="grid gap-2">
                  {getTaskAttachmentUrls(selectedTask).map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary"
                    >
                      {isImageUrl(url) ? <ImageIcon className="h-4 w-4" /> : <FileTextIcon className="h-4 w-4" />}
                      {url.split("/").pop() || "Attachment"}
                    </a>
                  ))}
                </div>
              </div>
            )}
            {editAttachmentPreviews.length > 0 && (
              <div className="rounded-lg border p-3 space-y-3">
                <p className="text-sm font-medium">New Attachments To Add</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {editAttachmentPreviews.map((preview) => (
                    <div key={`${preview.name}-${preview.url || "file"}`} className="rounded-md border p-3 space-y-2">
                      <p className="text-sm font-medium break-all">{preview.name}</p>
                      {preview.isImage && preview.url ? (
                        <img src={preview.url} alt={preview.name} className="w-full h-40 object-cover rounded-md" />
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileTextIcon className="h-4 w-4" />
                          File ready to upload
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>{previewTask?.title}</DialogTitle>
            <DialogDescription>{previewTask?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={previewStatus} onValueChange={(value) => setPreviewStatus(value as TaskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {previewStatus === "rejected" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Rejection Reason</label>
                <Textarea
                  value={previewRejectionReason}
                  onChange={(e) => setPreviewRejectionReason(e.target.value)}
                  rows={3}
                  placeholder="Explain why this task is being rejected"
                />
              </div>
            )}
            {getTaskAttachmentUrls(previewTask).length > 0 ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {getTaskAttachmentUrls(previewTask).map((url) => (
                    <div key={url} className="rounded-lg border p-3 space-y-3">
                      {isImageUrl(url) ? (
                        <img
                          src={url}
                          alt={url.split("/").pop() || "Task attachment"}
                          className="w-full h-auto max-h-[320px] object-contain rounded-lg border"
                        />
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileTextIcon className="h-4 w-4" />
                          Document attachment
                        </div>
                      )}
                      <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary">
                        {isImageUrl(url) ? <ImageIcon className="h-4 w-4" /> : <FileTextIcon className="h-4 w-4" />}
                        {url.split("/").pop() || "Open attachment"}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">No attachments</span>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button onClick={handlePreviewStatusSave} disabled={previewStatusSaving || !previewTask}>
              {previewStatusSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
            <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LayoutComponent>
  );
}
