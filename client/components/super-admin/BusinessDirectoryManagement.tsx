import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from "react";
import { superAdminApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Building2,
  ImagePlus,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";

interface BusinessDirectory {
  id: number;
  business_name: string;
  business_email: string;
  business_phone_number: string;
  business_address: string;
  logo_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface DirectoryFormState {
  business_name: string;
  business_email: string;
  business_phone_number: string;
  business_address: string;
}

const EMPTY_FORM: DirectoryFormState = {
  business_name: "",
  business_email: "",
  business_phone_number: "",
  business_address: "",
};

export default function BusinessDirectoryManagement() {
  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [directories, setDirectories] = useState<BusinessDirectory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingDirectory, setEditingDirectory] = useState<BusinessDirectory | null>(null);
  const [formState, setFormState] = useState<DirectoryFormState>(EMPTY_FORM);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [removeCurrentLogo, setRemoveCurrentLogo] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  useEffect(() => {
    void fetchDirectories();
  }, []);

  useEffect(() => {
    if (!selectedLogoFile) {
      setLogoPreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(selectedLogoFile);
    setLogoPreviewUrl(nextPreviewUrl);

    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [selectedLogoFile]);

  const fetchDirectories = async () => {
    try {
      setIsLoading(true);
      const response = await superAdminApi.getBusinessDirectories();
      const payload: any = response.data;
      setDirectories(Array.isArray(payload?.directories) ? payload.directories : []);
    } catch (error: any) {
      toast({
        title: "Unable to load business directories",
        description: error?.response?.data?.error || "Please refresh and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormState(EMPTY_FORM);
    setSelectedLogoFile(null);
    setRemoveCurrentLogo(false);
    setEditingDirectory(null);
    setIsDragActive(false);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (directory: BusinessDirectory) => {
    setEditingDirectory(directory);
    setFormState({
      business_name: directory.business_name,
      business_email: directory.business_email,
      business_phone_number: directory.business_phone_number,
      business_address: directory.business_address,
    });
    setSelectedLogoFile(null);
    setRemoveCurrentLogo(false);
    setIsDialogOpen(true);
  };

  const handleFieldChange = (field: keyof DirectoryFormState, value: string) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleLogoFile = (file: File | null) => {
    if (!file) {
      return;
    }

    setSelectedLogoFile(file);
    setRemoveCurrentLogo(false);
  };

  const handleLogoInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleLogoFile(event.target.files?.[0] || null);
    event.target.value = "";
  };

  const handleLogoDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    handleLogoFile(event.dataTransfer.files?.[0] || null);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSaving(true);

      const formData = new FormData();
      formData.append("business_name", formState.business_name.trim());
      formData.append("business_email", formState.business_email.trim());
      formData.append("business_phone_number", formState.business_phone_number.trim());
      formData.append("business_address", formState.business_address.trim());

      if (selectedLogoFile) {
        formData.append("logo", selectedLogoFile);
      }

      if (editingDirectory && removeCurrentLogo && !selectedLogoFile) {
        formData.append("remove_logo", "true");
      }

      if (editingDirectory) {
        await superAdminApi.updateBusinessDirectory(editingDirectory.id, formData);
        toast({
          title: "Business directory updated",
          description: `${formState.business_name} was updated successfully.`,
        });
      } else {
        await superAdminApi.createBusinessDirectory(formData);
        toast({
          title: "Business directory created",
          description: `${formState.business_name} was added successfully.`,
        });
      }

      handleDialogOpenChange(false);
      await fetchDirectories();
    } catch (error: any) {
      toast({
        title: editingDirectory ? "Unable to update directory" : "Unable to create directory",
        description: error?.response?.data?.error || "Please review the form and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (directory: BusinessDirectory) => {
    const confirmed = window.confirm(`Delete ${directory.business_name}?`);
    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(directory.id);
      await superAdminApi.deleteBusinessDirectory(directory.id);
      toast({
        title: "Business directory deleted",
        description: `${directory.business_name} was removed.`,
      });
      await fetchDirectories();
    } catch (error: any) {
      toast({
        title: "Unable to delete directory",
        description: error?.response?.data?.error || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const existingLogoUrl = !selectedLogoFile && !removeCurrentLogo ? editingDirectory?.logo_url || null : null;

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Business Directory
            </CardTitle>
            <CardDescription>
              Create, edit, and manage the directory entries that appear in Score Machine Academy.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1">
              {directories.length} {directories.length === 1 ? "Directory" : "Directories"}
            </Badge>
            <Button onClick={openCreateDialog} className="gradient-primary hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" />
              Create New Directory
            </Button>
          </div>
        </CardHeader>
      </Card>

      {isLoading ? (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading business directories...
            </div>
          </CardContent>
        </Card>
      ) : directories.length === 0 ? (
        <Card className="border-dashed border-border/70 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">No business directories yet</h3>
              <p className="text-sm text-muted-foreground">
                Create your first directory entry and it will show here and in the Academy tab.
              </p>
            </div>
            <Button onClick={openCreateDialog} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Create New Directory
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {directories.map((directory) => (
            <Card key={directory.id} className="overflow-hidden border-border/60 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 via-white to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
                {directory.logo_url ? (
                  <img
                    src={directory.logo_url}
                    alt={directory.business_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Building2 className="h-12 w-12" />
                    <span className="text-sm font-medium">No business logo</span>
                  </div>
                )}
              </div>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold leading-tight">{directory.business_name}</h3>
                    <Badge variant="outline" className="mt-2">
                      {directory.logo_url ? "Logo added" : "Logo optional"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="icon" onClick={() => openEditDialog(directory)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => void handleDelete(directory)}
                      disabled={deletingId === directory.id}
                    >
                      {deletingId === directory.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="break-all">{directory.business_email}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{directory.business_phone_number}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{directory.business_address}</span>
                  </div>
                </div>

                <div className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  Updated {new Date(directory.updated_at || directory.created_at || Date.now()).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingDirectory ? "Edit Business Directory" : "Create Business Directory"}
            </DialogTitle>
            <DialogDescription>
              Add the business details that should appear in the Academy Business Directory tab.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-6" onSubmit={handleSave}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="business_name">Business Name</Label>
                <Input
                  id="business_name"
                  value={formState.business_name}
                  onChange={(event) => handleFieldChange("business_name", event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_email">Business Email</Label>
                <Input
                  id="business_email"
                  type="email"
                  value={formState.business_email}
                  onChange={(event) => handleFieldChange("business_email", event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_phone_number">Business Phone Number</Label>
                <Input
                  id="business_phone_number"
                  value={formState.business_phone_number}
                  onChange={(event) => handleFieldChange("business_phone_number", event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="business_address">Business Address</Label>
                <Input
                  id="business_address"
                  value={formState.business_address}
                  onChange={(event) => handleFieldChange("business_address", event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Business Logo</Label>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoInputChange}
              />
              <div
                className={`rounded-2xl border-2 border-dashed p-6 transition-colors ${
                  isDragActive ? "border-ocean-blue bg-ocean-blue/5" : "border-border/70 bg-muted/20"
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsDragActive(false);
                }}
                onDrop={handleLogoDrop}
              >
                {logoPreviewUrl || existingLogoUrl ? (
                  <div className="space-y-4">
                    <img
                      src={logoPreviewUrl || existingLogoUrl || ""}
                      alt="Business logo preview"
                      className="h-40 w-full rounded-xl object-cover"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()}>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload New Logo
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setSelectedLogoFile(null);
                          setRemoveCurrentLogo(true);
                        }}
                      >
                        Remove Logo
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="flex w-full flex-col items-center gap-3 text-center"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <div className="rounded-full bg-background p-4 shadow-sm">
                      <ImagePlus className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Drag an image here or upload a file</p>
                      <p className="text-sm text-muted-foreground">
                        Business logo is optional. PNG, JPG, GIF, and WEBP are supported.
                      </p>
                    </div>
                    <Button type="button" variant="outline">
                      <Upload className="mr-2 h-4 w-4" />
                      Choose Logo
                    </Button>
                  </button>
                )}
              </div>
              {selectedLogoFile && (
                <p className="text-xs text-muted-foreground">Selected file: {selectedLogoFile.name}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleDialogOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="gradient-primary hover:opacity-90" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingDirectory ? "Save Changes" : "Create Directory"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}