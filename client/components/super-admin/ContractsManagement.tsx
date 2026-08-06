import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { contractsApi } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Edit, Trash2, CheckCircle2, Eye } from "lucide-react";

type TemplateStatus = "draft" | "active" | "archived";
type ContractsTab = "admin" | "tsm-elite";

interface ContractTemplate {
  id: number;
  admin_id: number;
  name: string;
  description?: string | null;
  content_html?: string | null;
  content_text?: string | null;
  status: TemplateStatus;
  created_at: string;
  updated_at: string;
}

interface TemplateForm {
  name: string;
  description?: string;
  content_html?: string;
  content_text?: string;
  status: TemplateStatus;
}

const emptyForm: TemplateForm = {
  name: "",
  description: "",
  content_html: "",
  content_text: "",
  status: "draft",
};

const getEmptyForm = (tab: ContractsTab): TemplateForm => ({
  ...emptyForm,
  status: tab === "tsm-elite" ? "active" : "draft",
});

const ADMIN_STATUS_OPTIONS: TemplateStatus[] = ["draft", "active", "archived"];
const TSM_ELITE_STATUS_OPTIONS: Array<Extract<TemplateStatus, "draft" | "active">> = ["active", "draft"];

const getHeading = (tab: ContractsTab) =>
  tab === "tsm-elite" ? "Score Machine Elite" : "Admin Contracts";

const getDescription = (tab: ContractsTab) =>
  tab === "tsm-elite"
    ? "Create and edit Score Machine Elite contract templates"
    : "Create and edit contract templates for admins";

const getCreateButtonLabel = (tab: ContractsTab) =>
  tab === "tsm-elite" ? "Create TSM Elite Contract" : "New Template";

const getTableTitle = (tab: ContractsTab) =>
  tab === "tsm-elite" ? "TSM Elite Contracts" : "Contract Templates";

const getTableDescription = (tab: ContractsTab) =>
  tab === "tsm-elite"
    ? "Manage reusable Score Machine Elite contract templates"
    : "Manage reusable admin contract templates";

const getTemplateStatusOptions = (tab: ContractsTab) =>
  tab === "tsm-elite" ? TSM_ELITE_STATUS_OPTIONS : ADMIN_STATUS_OPTIONS;

const normalizeTemplatePayload = (tab: ContractsTab, form: TemplateForm) => ({
  name: form.name.trim(),
  description: form.description?.trim() || "",
  content_html: form.content_html || "",
  content_text: form.content_text || "",
  status: tab === "tsm-elite" ? (form.status === "draft" ? "draft" : "active") : form.status,
});

const normalizeTsmElitePayload = (form: TemplateForm) => ({
  name: form.name.trim(),
  description: form.description?.trim() || "",
  content_html: form.content_html || "",
  content_text: form.content_text || "",
  status: (form.status === "draft" ? "draft" : "active") as "draft" | "active",
});

export default function ContractsManagement() {
  const [activeTab, setActiveTab] = useState<ContractsTab>("admin");
  const [adminTemplates, setAdminTemplates] = useState<ContractTemplate[]>([]);
  const [tsmEliteTemplates, setTsmEliteTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TemplateStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContractTemplate | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<ContractTemplate | null>(null);

  const looksLikeHtml = (s?: string | null) => {
    if (!s) return false;
    // Basic heuristic: contains HTML tags
    return /<[^>]+>/.test(s);
  };

  const loadTemplatesForTab = async (tab: ContractsTab): Promise<ContractTemplate[]> => {
    const response = tab === "tsm-elite"
      ? await contractsApi.getTsmEliteTemplates()
      : await contractsApi.getTemplates();

    const data = (response.data?.data ?? response.data ?? []) as ContractTemplate[];
    return Array.isArray(data) ? data : [];
  };

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const [adminResult, tsmEliteResult] = await Promise.allSettled([
        loadTemplatesForTab("admin"),
        loadTemplatesForTab("tsm-elite"),
      ]);

      if (adminResult.status === "fulfilled") {
        setAdminTemplates(adminResult.value);
      } else {
        console.error("Failed to load admin contract templates", adminResult.reason);
      }

      if (tsmEliteResult.status === "fulfilled") {
        setTsmEliteTemplates(tsmEliteResult.value);
      } else {
        console.error("Failed to load TSM Elite templates", tsmEliteResult.reason);
      }

      if (adminResult.status === "rejected" || tsmEliteResult.status === "rejected") {
        toast.error("Failed to load one or more contract template lists");
      }
    } catch (err) {
      console.error("Failed to load templates", err);
      toast.error("Failed to load contract templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const currentTemplates = activeTab === "tsm-elite" ? tsmEliteTemplates : adminTemplates;

  const filteredTemplates = useMemo(() => {
    const q = search.toLowerCase().trim();
    return currentTemplates.filter((t) => {
      const matchesSearch = !q || t.name.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [currentTemplates, search, statusFilter]);

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm(getEmptyForm(activeTab));
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewTemplate(null);
  };

  const handleTabChange = (value: string) => {
    const nextTab = value as ContractsTab;
    setActiveTab(nextTab);
    setSearch("");
    setStatusFilter("all");
    setEditing(null);
    setPreviewTemplate(null);
    setDialogOpen(false);
    setPreviewOpen(false);
    setForm(getEmptyForm(nextTab));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(getEmptyForm(activeTab));
    setDialogOpen(true);
  };

  const openEdit = (t: ContractTemplate) => {
    setEditing(t);
    setForm({
      name: t.name,
      description: t.description || "",
      content_html: t.content_html || "",
      content_text: t.content_text || "",
      status: t.status,
    });
    setDialogOpen(true);
  };

  const saveTemplate = async () => {
    try {
      if (!form.name.trim()) {
        toast.error("Template name is required");
        return;
      }

      if (editing) {
        if (activeTab === "tsm-elite") {
          await contractsApi.updateTsmEliteTemplate(editing.id, normalizeTsmElitePayload(form));
          toast.success("TSM Elite template updated");
        } else {
          await contractsApi.updateTemplate(editing.id, normalizeTemplatePayload(activeTab, form));
          toast.success("Template updated");
        }
      } else {
        if (activeTab === "tsm-elite") {
          await contractsApi.createTsmEliteTemplate(normalizeTsmElitePayload(form));
          toast.success("TSM Elite template created");
        } else {
          await contractsApi.createTemplate(normalizeTemplatePayload(activeTab, form));
          toast.success("Template created");
        }
      }
      closeDialog();
      await loadTemplates();
    } catch (err) {
      console.error("Save template failed", err);
      toast.error(activeTab === "tsm-elite" ? "Failed to save TSM Elite template" : "Failed to save template");
    }
  };

  const deleteTemplate = async (id: number) => {
    try {
      if (!confirm("Delete this template?")) return;
      if (activeTab === "tsm-elite") {
        await contractsApi.deleteTsmEliteTemplate(id);
        toast.success("TSM Elite template deleted");
      } else {
        await contractsApi.deleteTemplate(id);
        toast.success("Template deleted");
      }
      await loadTemplates();
    } catch (err) {
      console.error("Delete template failed", err);
      toast.error(activeTab === "tsm-elite" ? "Failed to delete TSM Elite template" : "Failed to delete template");
    }
  };

  const setActive = async (t: ContractTemplate) => {
    try {
      if (activeTab === "tsm-elite") {
        await contractsApi.updateTsmEliteTemplate(t.id, { status: "active" });
        toast.success("TSM Elite template activated");
      } else {
        await contractsApi.updateTemplate(t.id, { status: "active" });
        toast.success("Template activated");
      }
      await loadTemplates();
    } catch (err) {
      console.error("Activate template failed", err);
      toast.error(activeTab === "tsm-elite" ? "Failed to activate TSM Elite template" : "Failed to activate template");
    }
  };

  const statusOptions = getTemplateStatusOptions(activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{getHeading(activeTab)}</h2>
          <p className="text-muted-foreground">{getDescription(activeTab)}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {getCreateButtonLabel(activeTab)}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="admin">Admin Contracts</TabsTrigger>
          <TabsTrigger value="tsm-elite">Score Machine Elite</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6 mt-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>
                {activeTab === "tsm-elite"
                  ? "Search and filter Score Machine Elite templates"
                  : "Search and filter templates"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Input
                  placeholder="Search by name or description"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as TemplateStatus | "all")}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Templates table */}
          <Card>
            <CardHeader>
              <CardTitle>{getTableTitle(activeTab)} ({filteredTemplates.length})</CardTitle>
              <CardDescription>{getTableDescription(activeTab)}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <div className="font-medium">{t.name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={t.status === "active" ? "default" : t.status === "archived" ? "secondary" : "outline"}>
                            {t.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[360px] truncate text-muted-foreground">
                          {t.description || ""}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(t.updated_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPreviewTemplate(t);
                                setPreviewOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" /> Preview
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openEdit(t)}>
                              <Edit className="h-4 w-4 mr-1" /> Edit
                            </Button>
                            {t.status !== "active" && (
                              <Button variant="outline" size="sm" onClick={() => setActive(t)}>
                                <CheckCircle2 className="h-4 w-4 mr-1" /> Activate
                              </Button>
                            )}
                            <Button variant="destructive" size="sm" onClick={() => deleteTemplate(t.id)}>
                              <Trash2 className="h-4 w-4 mr-1" /> Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Template" : getCreateButtonLabel(activeTab)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as TemplateStatus }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose status" />
                  </SelectTrigger>
                  <SelectContent>
                    {getTemplateStatusOptions(activeTab).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>

            <Tabs defaultValue="html">
              <TabsList>
                <TabsTrigger value="html">HTML Content</TabsTrigger>
                <TabsTrigger value="text">Plain Text</TabsTrigger>
              </TabsList>
              <TabsContent value="html">
                <Textarea rows={10} placeholder="Enter HTML content" value={form.content_html}
                  onChange={(e) => setForm((f) => ({ ...f, content_html: e.target.value }))}
                />
              </TabsContent>
              <TabsContent value="text">
                <Textarea rows={10} placeholder="Enter plain text content" value={form.content_text}
                  onChange={(e) => setForm((f) => ({ ...f, content_text: e.target.value }))}
                />
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={saveTemplate}>{editing ? "Save Changes" : getCreateButtonLabel(activeTab)}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={(open) => (open ? setPreviewOpen(true) : closePreview())}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Preview: {previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              const content = previewTemplate?.content_html || previewTemplate?.content_text || "";
              if (!content) {
                return <p className="text-muted-foreground">No content to preview</p>;
              }
              const isHtml = looksLikeHtml(content);
              if (isHtml) {
                return (
                  <Card>
                    <CardHeader>
                      <CardTitle>HTML</CardTitle>
                      <CardDescription>Rendered version</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
                    </CardContent>
                  </Card>
                );
              }
              return (
                <Card>
                  <CardHeader>
                    <CardTitle>Plain Text</CardTitle>
                    <CardDescription>Raw content</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap text-sm">{content}</pre>
                  </CardContent>
                </Card>
              );
            })()}
          </div>
          <DialogFooter>
            <Button onClick={closePreview}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}