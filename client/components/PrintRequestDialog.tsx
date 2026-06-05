import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";

export interface PrintRequestSenderFormValues {
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  senderNote: string;
}

interface PrintRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sending: boolean;
  defaultValues: {
    senderName?: string;
    senderEmail?: string;
    senderPhone?: string;
  };
  onSubmit: (values: PrintRequestSenderFormValues) => Promise<void>;
  title?: string;
  description?: string;
}

type PrintRequestFormErrors = Partial<Record<keyof PrintRequestSenderFormValues, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createInitialValues = (
  defaultValues: PrintRequestDialogProps["defaultValues"],
): PrintRequestSenderFormValues => ({
  senderName: String(defaultValues.senderName || ""),
  senderEmail: String(defaultValues.senderEmail || ""),
  senderPhone: String(defaultValues.senderPhone || ""),
  senderNote: "",
});

export function PrintRequestDialog({
  open,
  onOpenChange,
  sending,
  defaultValues,
  onSubmit,
  title = "Send Print Request",
  description = "Confirm the sender details that should be included in the print request email.",
}: PrintRequestDialogProps) {
  const [formValues, setFormValues] = useState<PrintRequestSenderFormValues>(
    createInitialValues(defaultValues),
  );
  const [formErrors, setFormErrors] = useState<PrintRequestFormErrors>({});

  useEffect(() => {
    if (!open) {
      setFormErrors({});
      return;
    }

    setFormValues(createInitialValues(defaultValues));
    setFormErrors({});
  }, [open, defaultValues.senderName, defaultValues.senderEmail, defaultValues.senderPhone]);

  const updateField = (field: keyof PrintRequestSenderFormValues, value: string) => {
    setFormValues((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validateForm = () => {
    const nextErrors: PrintRequestFormErrors = {};

    if (!formValues.senderName.trim()) {
      nextErrors.senderName = "Name is required.";
    }

    if (!formValues.senderEmail.trim()) {
      nextErrors.senderEmail = "Email is required.";
    } else if (!EMAIL_PATTERN.test(formValues.senderEmail.trim())) {
      nextErrors.senderEmail = "Enter a valid email address.";
    }

    if (!formValues.senderPhone.trim()) {
      nextErrors.senderPhone = "Phone number is required.";
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit({
        senderName: formValues.senderName.trim(),
        senderEmail: formValues.senderEmail.trim(),
        senderPhone: formValues.senderPhone.trim(),
        senderNote: formValues.senderNote.trim(),
      });
      onOpenChange(false);
    } catch {
      // The parent surface handles the error toast and keeps the dialog open.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onInteractOutside={(event) => {
          if (sending) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="print-request-sender-name">My name is</Label>
            <Input
              id="print-request-sender-name"
              value={formValues.senderName}
              onChange={(event) => updateField("senderName", event.target.value)}
              placeholder="Full name"
              disabled={sending}
            />
            {formErrors.senderName ? (
              <p className="text-xs text-red-600">{formErrors.senderName}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="print-request-sender-email">My best email is</Label>
            <Input
              id="print-request-sender-email"
              type="email"
              value={formValues.senderEmail}
              onChange={(event) => updateField("senderEmail", event.target.value)}
              placeholder="name@example.com"
              disabled={sending}
            />
            {formErrors.senderEmail ? (
              <p className="text-xs text-red-600">{formErrors.senderEmail}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="print-request-sender-phone">My best phone number is</Label>
            <Input
              id="print-request-sender-phone"
              value={formValues.senderPhone}
              onChange={(event) => updateField("senderPhone", event.target.value)}
              placeholder="Phone number"
              disabled={sending}
            />
            {formErrors.senderPhone ? (
              <p className="text-xs text-red-600">{formErrors.senderPhone}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="print-request-sender-note">Note</Label>
            <Textarea
              id="print-request-sender-note"
              value={formValues.senderNote}
              onChange={(event) => updateField("senderNote", event.target.value)}
              placeholder="Optional note for the printing team"
              rows={4}
              disabled={sending}
            />
            <p className="text-xs text-slate-500">This field is optional.</p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={sending}>
            {sending ? "Sending..." : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}