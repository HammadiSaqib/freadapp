import { useState } from "react";
import SupportLayout from "@/components/SupportLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";

export default function SupportAffiliateCsvImport() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; updated: number; errors: { line: number; message: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setResult(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/affiliate-management/import", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to import affiliates");
      }
      const data = await res.json();
      setResult({ inserted: data.inserted || 0, updated: data.updated || 0, errors: data.errors || [] });
    } catch (err: any) {
      setError(err.message || "Import failed");
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csv = "affiliate name,password,phone,email\nJohn Doe,Secret123,555-1234,john@example.com";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "affiliates_import_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <SupportLayout title="Affiliate CSV Import" description="Bulk create or update affiliates by uploading a CSV">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV</CardTitle>
            <CardDescription>Select a CSV file with affiliate records</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csvFile">CSV File</Label>
              <div className="flex items-center gap-3">
                <Input id="csvFile" type="file" accept=".csv,text/csv" onChange={handleFileChange} />
                <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                  <FileText className="h-4 w-4" />
                  Download Template
                </Button>
              </div>
              {file && <div className="text-sm text-muted-foreground">Selected: {file.name}</div>}
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Button onClick={handleUpload} disabled={!file || uploading} className="gap-2">
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading..." : "Import Affiliates"}
              </Button>
            </div>
            {error && (
              <div className="mt-4 flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            {result && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm">Inserted: {result.inserted} • Updated: {result.updated}</span>
                </div>
                {result.errors.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Errors: {result.errors.length}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CSV Format</CardTitle>
            <CardDescription>Columns: affiliate name, password, phone, email</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              The name is split into first and last automatically. Existing emails are updated.
            </div>
          </CardContent>
        </Card>
      </div>
    </SupportLayout>
  );
}