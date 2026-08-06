import { ChangeEvent, DragEvent, useCallback, useEffect, useRef, useState } from "react";
import { Eye, FileImage, FileText, Loader2, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { clientDocumentsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

type PowerOfAttorneyDocument = {
  id: number;
  file_url: string;
  original_name: string | null;
  created_at: string;
};

const ACCEPTED_FILE_TYPES = ".pdf,.jpg,.jpeg,.png,.gif,.webp";
const isAcceptedFile = (file: File) => /\.(pdf|jpe?g|png|gif|webp)$/i.test(file.name);

export default function PowerOfAttorneyTab({ clientId }: { clientId: string | number }) {
  const { toast } = useToast();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<PowerOfAttorneyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [replacingId, setReplacingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [documentPendingDelete, setDocumentPendingDelete] = useState<PowerOfAttorneyDocument | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await clientDocumentsApi.getPowerOfAttorneyDocuments(clientId);
      setDocuments(response.data?.data || []);
    } catch (error: any) {
      toast({
        title: "Unable to load Power of Attorney documents",
        description: error?.response?.data?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [clientId, toast]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const uploadFiles = async (incomingFiles: File[]) => {
    const files = incomingFiles.filter(isAcceptedFile);
    if (files.length !== incomingFiles.length) {
      toast({ title: "Only PDF and image files are allowed", variant: "destructive" });
    }
    if (!files.length) return;

    setUploading(true);
    try {
      await clientDocumentsApi.uploadPowerOfAttorneyDocuments(clientId, files);
      await loadDocuments();
      toast({ title: `${files.length} Power of Attorney document${files.length === 1 ? "" : "s"} uploaded` });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error?.response?.data?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void uploadFiles(Array.from(event.dataTransfer.files));
  };

  const replaceDocument = async (documentId: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!isAcceptedFile(file)) {
      toast({ title: "Only PDF and image files are allowed", variant: "destructive" });
      return;
    }

    setReplacingId(documentId);
    try {
      await clientDocumentsApi.replacePowerOfAttorneyDocument(clientId, documentId, file);
      await loadDocuments();
      toast({ title: "Power of Attorney document replaced" });
    } catch (error: any) {
      toast({
        title: "Replace failed",
        description: error?.response?.data?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setReplacingId(null);
    }
  };

  const deleteDocument = async (documentId: number) => {
    setDeletingId(documentId);
    try {
      await clientDocumentsApi.deletePowerOfAttorneyDocument(clientId, documentId);
      setDocuments((current) => current.filter((document) => document.id !== documentId));
      toast({ title: "Power of Attorney document removed" });
    } catch (error: any) {
      toast({
        title: "Remove failed",
        description: error?.response?.data?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
      setDocumentPendingDelete(null);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-blue-600" />
            Add Your POA (Power of Attorney)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <input
            ref={uploadInputRef}
            type="file"
            multiple
            accept={ACCEPTED_FILE_TYPES}
            className="hidden"
            onChange={(event) => void uploadFiles(Array.from(event.target.files || []))}
          />
          <div
            role="button"
            tabIndex={0}
            className={cn(
              "flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
              isDragging ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/60",
              uploading && "pointer-events-none opacity-70",
            )}
            onClick={() => uploadInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") uploadInputRef.current?.click();
            }}
            onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {uploading ? <Loader2 className="mb-4 h-10 w-10 animate-spin text-blue-600" /> : <UploadCloud className="mb-4 h-10 w-10 text-blue-600" />}
            <p className="font-semibold text-slate-900">{uploading ? "Uploading..." : "Drag an image here or upload a file"}</p>
            <p className="mt-2 text-sm text-slate-500">PDF, JPG, JPEG, PNG, GIF, and WEBP formats are allowed.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Uploaded POA Documents ({documents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex min-h-28 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
          ) : documents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
              No Power of Attorney documents uploaded for this client.
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((document) => {
                const isPdf = /\.pdf(?:$|\?)/i.test(document.file_url);
                const busy = replacingId === document.id || deletingId === document.id;
                return (
                  <div key={document.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        {isPdf ? <FileText className="h-5 w-5" /> : <FileImage className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{document.original_name || "Power of Attorney"}</p>
                        <p className="text-xs text-slate-500">Uploaded {new Date(document.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => window.open(document.file_url, "_blank", "noopener,noreferrer") }>
                        <Eye className="mr-2 h-4 w-4" /> Preview
                      </Button>
                      <Button type="button" size="sm" variant="outline" disabled={busy} asChild>
                        <label className="cursor-pointer">
                          {replacingId === document.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                          Replace
                          <input type="file" accept={ACCEPTED_FILE_TYPES} className="hidden" onChange={(event) => void replaceDocument(document.id, event)} />
                        </label>
                      </Button>
                      <Button type="button" size="sm" variant="outline" disabled={busy} className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDocumentPendingDelete(document)}>
                        {deletingId === document.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(documentPendingDelete)}
        onOpenChange={(open) => {
          if (!open && deletingId === null) setDocumentPendingDelete(null);
        }}
      >
        <AlertDialogContent className="border-2 border-red-300 bg-red-50 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-800">
              <Trash2 className="h-5 w-5" />
              Delete POA Document?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-red-700">
              This will permanently remove <span className="font-semibold">{documentPendingDelete?.original_name || "this Power of Attorney document"}</span> from this client. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId !== null} className="border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800">
              Keep Document
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!documentPendingDelete || deletingId !== null}
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
              onClick={(event) => {
                event.preventDefault();
                if (documentPendingDelete) void deleteDocument(documentPendingDelete.id);
              }}
            >
              {deletingId !== null ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete Document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
