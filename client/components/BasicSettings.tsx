import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import AdminAgreementTab from "@/components/AdminAgreementTab";
import { useState, useEffect, useMemo } from "react";
import { authApi, integrationsApi, contractsApi } from "@/lib/api";
import { buildOnboardingIntakeUrl } from "@/lib/hostRouting";
import { useToast } from "@/hooks/use-toast";
import { useScoreMachineEliteStatus } from "@/hooks/useScoreMachineEliteStatus";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Globe,
  Palette,
  Monitor,
  Smartphone,
  Tablet,
  Key,
  Download,
  Upload,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Trash2,
  Camera,
  Webhook,
  Database,
  Cloud,
  HardDrive,
  Wifi,
  WifiOff,
  Loader2,
  Sun,
  Moon,
  CreditCard,
  AlertCircle,
} from "lucide-react";

// User profile data is now loaded from backend via API

const integrationStatus = [
  {
    name: "MyFreeScoreNow",
    status: "Connected",
    lastSync: "2024-01-15 16:00",
    health: "Good",
  },
  {
    name: "IdentityIQ",
    status: "Connected",
    lastSync: "2025-12-15 16:00",
    health: "Good",
  },
  {
    name: "MyScoreIQ",
    status: "Connected",
    lastSync: "2025-12-15 16:00",
    health: "Good",
  },
];

type GhlIntegrationStatus = {
  integrationId?: number | null;
  integrationHash?: string | null;
  locationId?: string;
  isActive: boolean;
  hasToken: boolean;
  status?: string;
  lastSuccessfulSync?: string | null;
  lastError?: { message: string; timestamp: string } | null;
  totalClientsReceived?: number;
};

type GhlActivityLog = {
  id: number;
  direction: "inbound" | "outbound";
  event_type: string;
  status: "success" | "failed";
  message?: string | null;
  client_id?: number | null;
  client_email?: string | null;
  client_first_name?: string | null;
  client_last_name?: string | null;
  admin_email?: string | null;
  admin_first_name?: string | null;
  admin_last_name?: string | null;
  response_code?: number | null;
  error_message?: string | null;
  data_fields?: string | string[] | null;
  retry_status?: string | null;
  created_at: string;
};

export default function BasicSettings() {
  const { isEliteActive } = useScoreMachineEliteStatus();
  const [activeTab, setActiveTab] = useState("profile");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  // Funding & Payments state
  const [fundingSettings, setFundingSettings] = useState({
    merchantId: "",
    publicKey: "",
    apiKey: "",
    nmiUsername: "",
    nmiPassword: "",
    testMode: false,
    gatewayLogoFile: null as File | null,
  });
  const [fundingOverrideEnabled, setFundingOverrideEnabled] = useState(false);
  const [fundingOverrideDialogOpen, setFundingOverrideDialogOpen] = useState(false);
  const [fundingOverrideAcknowledged, setFundingOverrideAcknowledged] = useState(false);
  const [fundingOverrideSignature, setFundingOverrideSignature] = useState("");
  const [fundingOverrideSaving, setFundingOverrideSaving] = useState(false);
  const [savingFunding, setSavingFunding] = useState(false);
  const { toast } = useToast();
  const { userProfile, refreshProfile } = useAuthContext();

  // Credit Repair Integration state
  const DEFAULT_CREDIT_REPAIR_URL = "https://www.m2ficoforge.com/";
  const [creditRepairUrl, setCreditRepairUrl] = useState<string>("");
  const [savingCreditRepair, setSavingCreditRepair] = useState(false);
  const [onboardingSlug, setOnboardingSlug] = useState("");
  const [savingOnboardingSlug, setSavingOnboardingSlug] = useState(false);
  const [intakeRedirectUrl, setIntakeRedirectUrl] = useState("");
  const [intakeLogoUrl, setIntakeLogoUrl] = useState("");
  const [intakeCompanyName, setIntakeCompanyName] = useState("");
  const [intakeWebsiteUrl, setIntakeWebsiteUrl] = useState("");
  const [intakeEmail, setIntakeEmail] = useState("");
  const [intakePhoneNumber, setIntakePhoneNumber] = useState("");
  const [intakeLogoFile, setIntakeLogoFile] = useState<File | null>(null);
  const [intakePrimaryColor, setIntakePrimaryColor] = useState("#16A34A");
  const [savingIntakeBranding, setSavingIntakeBranding] = useState(false);
  const [ghlIntegration, setGhlIntegration] = useState<GhlIntegrationStatus | null>(null);
  const [ghlAccessToken, setGhlAccessToken] = useState("");
  const [ghlLocationId, setGhlLocationId] = useState("");
  const [ghlLoading, setGhlLoading] = useState(false);
  const [ghlSaving, setGhlSaving] = useState(false);
  const [ghlDisabling, setGhlDisabling] = useState(false);
  const [ghlRegenerating, setGhlRegenerating] = useState(false);
  const [ghlActivity, setGhlActivity] = useState<GhlActivityLog[]>([]);
  const [ghlActivityLoading, setGhlActivityLoading] = useState(false);
  const [regenerateOpen, setRegenerateOpen] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [appearance, setAppearance] = useState({
    theme: "light",
    sidebarCollapsed: false,
    compactMode: false,
    animations: true,
  });

  const [security, setSecurity] = useState({
    twoFactor: false,
    sessionTimeout: 60,
    ipWhitelist: false,
    auditLog: true,
  });

  // Hydrate Funding & Payments form from loaded user profile (privileged roles)
  useEffect(() => {
    if (!userProfile) return;
    setFundingSettings(prev => ({
      ...prev,
      merchantId: (userProfile as any).nmi_merchant_id ?? prev.merchantId,
      publicKey: (userProfile as any).nmi_public_key ?? prev.publicKey,
      apiKey: (userProfile as any).nmi_api_key ?? prev.apiKey,
      nmiUsername: (userProfile as any).nmi_username ?? prev.nmiUsername,
      // Do not populate password field
      nmiPassword: prev.nmiPassword,
      testMode: !!(userProfile as any).nmi_test_mode,
    }));
    setFundingOverrideEnabled(!!(userProfile as any).funding_override_enabled);
  }, [userProfile]);

  // Initialize credit repair URL input from profile
  useEffect(() => {
    setCreditRepairUrl(userProfile?.credit_repair_url || "");
  }, [userProfile?.credit_repair_url]);

  useEffect(() => {
    setOnboardingSlug(userProfile?.onboarding_slug || "");
  }, [userProfile?.onboarding_slug]);

  useEffect(() => {
    setIntakeRedirectUrl((userProfile as any)?.intake_redirect_url || "");
    setIntakeLogoUrl((userProfile as any)?.intake_logo_url || "");
    setIntakePrimaryColor((userProfile as any)?.intake_primary_color || "#16A34A");
    setIntakeCompanyName((userProfile as any)?.intake_company_name || "");
    setIntakeWebsiteUrl((userProfile as any)?.intake_website_url || "");
    setIntakeEmail((userProfile as any)?.intake_email || "");
    setIntakePhoneNumber((userProfile as any)?.intake_phone_number || "");
  }, [
    (userProfile as any)?.intake_redirect_url, 
    (userProfile as any)?.intake_logo_url, 
    (userProfile as any)?.intake_primary_color,
    (userProfile as any)?.intake_company_name,
    (userProfile as any)?.intake_website_url,
    (userProfile as any)?.intake_email,
    (userProfile as any)?.intake_phone_number
  ]);

  const effectiveCreditRepairUrl = useMemo(() => {
    const envUrl = import.meta.env.VITE_CREDIT_REPAIR_URL as string | undefined;
    const profileUrl = (userProfile?.credit_repair_url || "").trim();
    return profileUrl || envUrl || DEFAULT_CREDIT_REPAIR_URL;
  }, [userProfile?.credit_repair_url]);

  const normalizeUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const normalizeSlug = (value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return "";
    return trimmed
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const onboardingLink = useMemo(() => {
    const profileSlug = (userProfile?.onboarding_slug || "").trim();
    const candidate = normalizeSlug(onboardingSlug) || profileSlug || (userProfile?.id ? String(userProfile.id) : "");
    if (!candidate) return "";
    return buildOnboardingIntakeUrl({ slugOrId: candidate });
  }, [onboardingSlug, userProfile?.id, userProfile?.onboarding_slug]);
  const canEditOnboardingSlug = userProfile?.role === "admin" || userProfile?.role === "super_admin";
  const apiBaseUrl = import.meta.env.VITE_API_URL || (typeof window !== "undefined" ? window.location.origin : "");

  const webhookUrl = useMemo(() => {
    if (!ghlIntegration?.integrationHash) return "";
    return `${apiBaseUrl}/api/webhooks/ghl/${ghlIntegration.integrationHash}`;
  }, [apiBaseUrl, ghlIntegration?.integrationHash]);

  const ghlStatusLabel = useMemo(() => {
    if (!ghlIntegration) return "Not Configured";
    if (ghlIntegration.status === "connected") return "Connected";
    if (ghlIntegration.status === "invalid") return "Invalid Credentials";
    if (!ghlIntegration.isActive && ghlIntegration.hasToken) return "Disabled";
    return "Not Configured";
  }, [ghlIntegration]);

  const formatRelativeTime = (value?: string | null) => {
    if (!value) return "Never";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Never";
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  };

  const formatTimestamp = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString();
  };

  const maskEmail = (email?: string | null) => {
    if (!email) return "Unknown";
    const [name, domain] = email.split("@");
    if (!domain) return email;
    if (name.length <= 1) return `*@${domain}`;
    return `${name[0]}***@${domain}`;
  };

  const formatEventType = (eventType: string) => {
    if (!eventType) return "Event";
    return eventType
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  const handleSaveCreditRepair = async () => {
    try {
      setSavingCreditRepair(true);
      const normalized = normalizeUrl(creditRepairUrl);
      const payload: any = {
        credit_repair_url: normalized || undefined,
      };
      const res = await authApi.updateProfile(payload);

      if ((res as any)?.error) {
        toast({
          title: "Error",
          description: (res as any)?.error || "Failed to save Credit Repair URL",
          variant: "destructive",
        });
        return;
      }

      await refreshProfile();
      toast({
        title: "Saved",
        description: "Credit Repair URL updated successfully",
      });
    } catch (error: any) {
      console.error("Error saving credit repair url:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.error || "Failed to update Credit Repair URL",
        variant: "destructive",
      });
    } finally {
      setSavingCreditRepair(false);
    }
  };

  useEffect(() => {
    if (activeTab === "integrations" || activeTab === "funding" || activeTab === "appearance") {
      setActiveTab("profile");
    }
  }, [activeTab]);

  const intakeLogoPreview = useMemo(() => {
    if (intakeLogoFile) {
      try {
        return URL.createObjectURL(intakeLogoFile);
      } catch {
        return intakeLogoUrl || "";
      }
    }
    return intakeLogoUrl || "";
  }, [intakeLogoFile, intakeLogoUrl]);

  useEffect(() => {
    if (!intakeLogoFile || !intakeLogoPreview) return;
    return () => {
      try {
        URL.revokeObjectURL(intakeLogoPreview);
      } catch {}
    };
  }, [intakeLogoFile, intakeLogoPreview]);

  const handleSaveIntakeBranding = async () => {
    try {
      setSavingIntakeBranding(true);
      const redirect = intakeRedirectUrl.trim();
      let logo = intakeLogoUrl.trim();
      const color = intakePrimaryColor.trim();

      if (redirect && !/^https?:\/\//i.test(redirect)) {
        toast({
          title: "Invalid Redirect URL",
          description: "Use a full URL starting with http:// or https://",
          variant: "destructive",
        });
        return;
      }

      if (logo && !/^https?:\/\//i.test(logo)) {
        toast({
          title: "Invalid Logo URL",
          description: "Use a full URL starting with http:// or https://",
          variant: "destructive",
        });
        return;
      }

      if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
        toast({
          title: "Invalid Color",
          description: "Primary color must be in hex format like #16A34A",
          variant: "destructive",
        });
        return;
      }

      if (intakeLogoFile) {
        if (!intakeLogoFile.type.startsWith("image/")) {
          toast({
            title: "Invalid Logo File",
            description: "Please select a valid image file.",
            variant: "destructive",
          });
          return;
        }
        if (intakeLogoFile.size > 2 * 1024 * 1024) {
          toast({
            title: "Logo Too Large",
            description: "Please upload a logo smaller than 2MB.",
            variant: "destructive",
          });
          return;
        }

        const uploadResponse = await authApi.uploadIntakeLogo(intakeLogoFile);
        const uploadedLogoUrl = uploadResponse?.data?.logoUrl;
        if (!uploadedLogoUrl) {
          throw new Error("Failed to upload intake logo");
        }
        logo = uploadedLogoUrl;
      }

      // Validate website URL (must be empty or start with http:// or https://)
      const trimmedWebsiteUrl = intakeWebsiteUrl.trim();
      if (trimmedWebsiteUrl && !/^https?:\/\//i.test(trimmedWebsiteUrl)) {
        toast({
          title: "Invalid Website URL",
          description: "Website URL must start with http:// or https://",
          variant: "destructive",
        });
        return;
      }
      // Validate email (must be empty or valid email)
      const trimmedEmail = intakeEmail.trim();
      if (trimmedEmail && !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
        toast({
          title: "Invalid Email",
          description: "Contact Email must be a valid email address.",
          variant: "destructive",
        });
        return;
      }
      await authApi.updateProfile({
        intake_redirect_url: redirect,
        intake_logo_url: logo,
        intake_primary_color: color.toUpperCase(),
        intake_company_name: intakeCompanyName.trim(),
        intake_website_url: trimmedWebsiteUrl,
        intake_email: trimmedEmail,
        intake_phone_number: intakePhoneNumber.trim(),
      });
      await refreshProfile();
      setIntakeLogoFile(null);
      toast({
        title: "Saved",
        description: "Client intake branding updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.error || "Failed to update intake branding",
        variant: "destructive",
      });
    } finally {
      setSavingIntakeBranding(false);
    }
  };

  const handleUseDefaultCreditRepair = async () => {
    try {
      setSavingCreditRepair(true);
      setCreditRepairUrl(DEFAULT_CREDIT_REPAIR_URL);
      const res = await authApi.updateProfile({ credit_repair_url: DEFAULT_CREDIT_REPAIR_URL });

      if ((res as any)?.error) {
        toast({
          title: "Error",
          description: (res as any)?.error || "Failed to set default Credit Repair URL",
          variant: "destructive",
        });
        return;
      }

      await refreshProfile();
      toast({
        title: "Default Applied",
        description: "M2 Fico Forge set as default Credit Repair",
      });
    } catch (error: any) {
      console.error("Error setting default credit repair url:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.error || "Failed to set default",
        variant: "destructive",
      });
    } finally {
      setSavingCreditRepair(false);
    }
  };

  const handleSaveOnboardingSlug = async () => {
    try {
      setSavingOnboardingSlug(true);
      const normalized = normalizeSlug(onboardingSlug);
      if (!normalized) {
        toast({
          title: "Missing slug",
          description: onboardingSlug.trim()
            ? "Use letters, numbers, and hyphens only."
            : "Enter a URL-safe slug before saving.",
          variant: "destructive",
        });
        return;
      }
      if (normalized.length > 80) {
        toast({
          title: "Slug too long",
          description: "Use 80 characters or fewer.",
          variant: "destructive",
        });
        return;
      }
      const res = await authApi.updateProfile({ onboarding_slug: normalized });
      if ((res as any)?.error) {
        toast({
          title: "Error",
          description: (res as any)?.error || "Failed to save onboarding slug",
          variant: "destructive",
        });
        return;
      }
      await refreshProfile();
      toast({
        title: "Saved",
        description: "Onboarding link updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.error || "Failed to update onboarding link",
        variant: "destructive",
      });
    } finally {
      setSavingOnboardingSlug(false);
    }
  };

  // Compute logo preview URL from uploaded file or saved profile value, fallback to site logo
  const logoPreviewUrl = useMemo(() => {
    if (fundingSettings.gatewayLogoFile) {
      try {
        return URL.createObjectURL(fundingSettings.gatewayLogoFile);
      } catch {
        return (userProfile as any)?.nmi_gateway_logo || "/capsol-fav.png";
      }
    }
    return (userProfile as any)?.nmi_gateway_logo || "/capsol-fav.png";
  }, [fundingSettings.gatewayLogoFile, userProfile]);

  // Revoke object URL when file changes/unmount to prevent memory leaks
  useEffect(() => {
    if (!fundingSettings.gatewayLogoFile || !logoPreviewUrl) return;
    return () => {
      try { URL.revokeObjectURL(logoPreviewUrl); } catch {}
    };
  }, [fundingSettings.gatewayLogoFile, logoPreviewUrl]);

  // Sample funding charges preview data (for invoice preview only)
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

  const sampleCardCharges = useMemo(
    () => [
      { card: "Chase Ink Business", approved: 15000, adminFeePercent: 12 },
      { card: "Amex Blue Business", approved: 8000, adminFeePercent: 10 },
      { card: "Bank of America Travel", approved: 12000, adminFeePercent: 12 },
    ],
    [],
  );

  const fundingSummary = useMemo(() => {
    const totalFunding = sampleCardCharges.reduce((sum, c) => sum + c.approved, 0);
    const totalAdminFees = sampleCardCharges.reduce(
      (sum, c) => sum + c.approved * (c.adminFeePercent / 100),
      0,
    );
    return { totalFunding, totalAdminFees };
  }, [sampleCardCharges]);

  // Save profile changes
  const saveProfile = async (profileData: any) => {
    try {
      setSaving(true);
      const response = await authApi.updateProfile(profileData);
      const ok = response && typeof response.status === "number" && response.status >= 200 && response.status < 300;
      if (!ok) {
        toast({
          title: "Error",
          description: "Failed to save profile changes",
          variant: "destructive",
        });
        return;
      }
      try {
        await refreshProfile();
      } catch (e: any) {
        // Even if refresh fails, the profile update was successful
      }
      toast({ title: "Success", description: "Profile updated successfully" });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile changes",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle password update
  const handlePasswordUpdate = async () => {
    const cp = currentPassword.trim();
    const np = newPassword.trim();
    const conf = confirmPassword.trim();

    if (!cp || !np || !conf) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (np !== conf) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (np.length < 6) {
      toast({
        title: "Error",
        description: "New password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    try {
      setUpdatingPassword(true);
      const response = await authApi.updatePassword({
        currentPassword: cp,
        newPassword: np,
      });
      
      const respData = response?.data;
      if (respData?.error) {
        toast({
          title: "Error",
          description: respData.error || "Failed to update password",
          variant: "destructive",
        });
        return;
      }

      // Clear password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      toast({
        title: "Success",
        description: respData?.message || "Password updated successfully",
      });
    } catch (error: any) {
      const serverMsg =
        error?.response?.data?.error ||
        (Array.isArray(error?.response?.data?.details) ? error.response.data.details[0]?.message : undefined) ||
        error?.message;
      console.error("Error updating password:", error);
      toast({
        title: "Error",
        description: serverMsg || "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setUpdatingPassword(false);
    }
  };

  useEffect(() => {
    // No need to fetch user profile since we're using global auth context
    setLoading(false);
    
    // Load theme preference from localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    setAppearance(prev => ({ ...prev, theme: savedTheme }));
    
    // Apply theme to document
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const fetchGhlIntegration = async () => {
    try {
      setGhlLoading(true);
      const response = await integrationsApi.getGhlIntegration();
      const data = response?.data?.data || response?.data || null;
      if (data) {
        setGhlIntegration(data);
        setGhlLocationId(data.locationId || "");
      } else {
        setGhlIntegration(null);
        setGhlLocationId("");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.error || "Failed to load GoHighLevel settings",
        variant: "destructive",
      });
    } finally {
      setGhlLoading(false);
    }
  };

  const fetchGhlActivity = async () => {
    try {
      setGhlActivityLoading(true);
      const response = await integrationsApi.getGhlActivity(25);
      const data = response?.data?.data || response?.data || [];
      setGhlActivity(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.error || "Failed to load integration activity",
        variant: "destructive",
      });
    } finally {
      setGhlActivityLoading(false);
    }
  };

  const handleCopyWebhook = async () => {
    if (!webhookUrl) return;
    try {
      await navigator.clipboard.writeText(webhookUrl);
      toast({
        title: "Webhook copied",
        description: "Inbound webhook URL copied to clipboard.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Please copy the webhook URL manually.",
        variant: "destructive",
      });
    }
  };

  const handleSaveGhlIntegration = async () => {
    const token = ghlAccessToken.trim();
    if (!token || !ghlLocationId.trim()) {
      toast({
        title: "Missing credentials",
        description: "Enter both a GoHighLevel Private Integration token and Location ID.",
        variant: "destructive",
      });
      return;
    }
    try {
      setGhlSaving(true);
      await integrationsApi.saveGhlIntegration({
        access_token: token,
        location_id: ghlLocationId.trim(),
      });
      setGhlAccessToken("");
      await fetchGhlIntegration();
      toast({
        title: "Saved",
        description: "GoHighLevel integration settings updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.error || "Failed to save integration settings",
        variant: "destructive",
      });
    } finally {
      setGhlSaving(false);
    }
  };

  const handleDisableGhlIntegration = async () => {
    try {
      setGhlDisabling(true);
      await integrationsApi.disableGhlIntegration();
      await fetchGhlIntegration();
      toast({
        title: "Disabled",
        description: "GoHighLevel integration disabled.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.error || "Failed to disable integration",
        variant: "destructive",
      });
    } finally {
      setGhlDisabling(false);
    }
  };

  const handleRegenerateWebhook = async () => {
    try {
      setGhlRegenerating(true);
      const response = await integrationsApi.regenerateGhlWebhook();
      const data = response?.data?.data || response?.data || null;
      setGhlIntegration((prev) => ({
        ...(prev || { isActive: true, hasToken: true }),
        integrationHash: data?.integrationHash || prev?.integrationHash || null,
      }));
      setRegenerateOpen(false);
      toast({
        title: "Webhook regenerated",
        description: "Update your GoHighLevel workflows with the new URL.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.error || "Failed to regenerate webhook",
        variant: "destructive",
      });
    } finally {
      setGhlRegenerating(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "integrations") return;
    fetchGhlIntegration();
    fetchGhlActivity();
  }, [activeTab]);

  // Handle theme change
  const handleThemeChange = (theme: string) => {
    setAppearance(prev => ({ ...prev, theme }));
    localStorage.setItem('theme', theme);
    
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    toast({
      title: "Theme Updated",
      description: `Switched to ${theme} mode`,
    });
  };

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select a valid image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image size must be less than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);
    try {
      await authApi.uploadAvatar(file);
      
      // Refresh global auth context to update avatar across all components
      await refreshProfile();
      
      toast({
        title: "Success",
        description: "Profile image updated successfully!",
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle image deletion
  const handleImageDelete = async () => {
    setUploadingImage(true);
    try {
      await authApi.deleteAvatar();
      
      // Refresh global auth context to update avatar across all components
      await refreshProfile();
      
      toast({
        title: "Success",
        description: "Profile image removed successfully!",
      });
    } catch (error: any) {
      console.error('Error deleting image:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to remove image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle saving for Funding tab (persist NMI settings)
  const handleFundingSave = async () => {
    try {
      setSavingFunding(true);

      // Optional: upload gateway logo if selected
      let uploadedLogoUrl: string | undefined = undefined;
      if (fundingSettings.gatewayLogoFile) {
        const file = fundingSettings.gatewayLogoFile;
        // Basic validation: image type and <= 2MB
        if (!file.type.startsWith("image/")) {
          toast({
            title: "Error",
            description: "Please select a valid image file.",
            variant: "destructive",
          });
          setSavingFunding(false);
          return;
        }
        if (file.size > 2 * 1024 * 1024) {
          toast({
            title: "Error",
            description: "Gateway logo must be less than 2MB.",
            variant: "destructive",
          });
          setSavingFunding(false);
          return;
        }

        const uploadRes = await authApi.uploadGatewayLogo(file);
        uploadedLogoUrl = uploadRes.data?.logoUrl;
      }

      // Prepare payload for profile update
      const payload: any = {
        nmi_merchant_id: fundingSettings.merchantId || undefined,
        nmi_public_key: fundingSettings.publicKey || undefined,
        nmi_api_key: fundingSettings.apiKey || undefined,
        nmi_username: fundingSettings.nmiUsername || undefined,
        nmi_password: fundingSettings.nmiPassword || undefined,
        nmi_test_mode: fundingSettings.testMode,
      };
      if (uploadedLogoUrl) {
        payload.nmi_gateway_logo = uploadedLogoUrl;
      }

      await authApi.updateProfile(payload);

      // Refresh profile so any derived UI can reflect changes
      await refreshProfile();

      // Clear selected file after successful save
      setFundingSettings(prev => ({ ...prev, gatewayLogoFile: null }));

      toast({
        title: "Success",
        description: "Funding settings saved successfully",
      });
    } catch (error: any) {
      console.error("Error saving funding settings:", error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to save funding settings",
        variant: "destructive",
      });
    } finally {
      setSavingFunding(false);
    }
  };

  const canUseFundingOverride = useMemo(() => {
    return userProfile?.role === "admin" || userProfile?.role === "super_admin";
  }, [userProfile]);

  const fundingOverrideSignedAt = useMemo(() => {
    const raw = (userProfile as any)?.funding_override_signed_at;
    if (!raw) return null;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return String(raw);
    return d.toLocaleString();
  }, [userProfile]);

  const handleFundingOverrideToggle = async (checked: boolean) => {
    if (checked) {
      setFundingOverrideAcknowledged(false);
      setFundingOverrideSignature("");
      setFundingOverrideDialogOpen(true);
      return;
    }
    try {
      setFundingOverrideSaving(true);
      await authApi.updateProfile({ funding_override_enabled: false });
      await refreshProfile();
      setFundingOverrideEnabled(false);
      toast({
        title: "Funding override disabled",
        description: "Funding access now follows fundability requirements.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to disable funding override",
        variant: "destructive",
      });
    } finally {
      setFundingOverrideSaving(false);
    }
  };

  const handleConfirmFundingOverride = async () => {
    const signature = fundingOverrideSignature.trim();
    if (!fundingOverrideAcknowledged || !signature) {
      toast({
        title: "Action required",
        description: "Accept the warning and provide your signature to continue.",
        variant: "destructive",
      });
      return;
    }
    try {
      setFundingOverrideSaving(true);
      await authApi.updateProfile({
        funding_override_enabled: true,
        funding_override_signature_text: signature,
      });
      await refreshProfile();
      setFundingOverrideEnabled(true);
      setFundingOverrideDialogOpen(false);
      toast({
        title: "Funding override enabled",
        description: "All clients can access the Funding page regardless of fundability.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to enable funding override",
        variant: "destructive",
      });
    } finally {
      setFundingOverrideSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
      case "Connected":
      case "Good":
        return "bg-green-100 text-green-800 border-green-200";
      case "Warning":
      case "Not Configured":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "In Progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Invited":
      case "Disconnected":
      case "Error":
      case "Invalid Credentials":
      case "Disabled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const settingsContent = (
      <div className="basic-admin-page-shell">
        <div className="basic-admin-page-hero">
          <div className="space-y-3">
            <span className="basic-admin-page-badge">Basic account controls</span>
            <h1 className="basic-admin-page-title">Settings</h1>
            <p className="basic-admin-page-description">
              Update your profile, security preferences, and agreement details with the same lighter look as the refreshed basic portal.
            </p>
          </div>
        </div>

        <div className="basic-admin-page-panel">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-8 grid w-full grid-cols-3 rounded-[20px] border border-sky-100/80 bg-sky-50/80 p-1 dark:border-slate-800 dark:bg-slate-900/70">
              <TabsTrigger value="profile" className="rounded-2xl data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-950 dark:data-[state=active]:text-white">Profile</TabsTrigger>
              <TabsTrigger value="security" className="rounded-2xl data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-950 dark:data-[state=active]:text-white">Security</TabsTrigger>
              <TabsTrigger value="agreement" className="rounded-2xl data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-950 dark:data-[state=active]:text-white">Agreement</TabsTrigger>
            </TabsList>

        <TabsContent value="profile" className="space-y-8">
          {/* Profile Information */}
          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="border border-slate-300 rounded-sm bg-white">
              <CardHeader>
                <CardTitle className="text-slate-900 leading-tight">
                  Profile Picture
                </CardTitle>
                <CardDescription>
                  Update your profile photo and display name
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <Avatar className="w-32 h-32">
                      <AvatarImage 
                        src={userProfile?.avatar || ''} 
                        alt={`${userProfile?.first_name} ${userProfile?.last_name}`} 
                      />
                      <AvatarFallback className="bg-slate-800 text-white text-white text-2xl">
                        {userProfile?.first_name?.[0] || "U"}
                        {userProfile?.last_name?.[0] || ""}
                      </AvatarFallback>
                    </Avatar>
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-slate-300 text-slate-800 hover:black"
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera className="h-4 w-4 mr-2" />
                          Upload
                        </>
                      )}
                    </Button>
                    {userProfile?.avatar && (
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm"
                        onClick={handleImageDelete}
                        disabled={uploadingImage}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <p className="text-sm text-muted-foreground">
                    JPG, PNG or GIF. Max size 5MB.
                  </p>
                </div>

                <div className="text-center space-y-1">
                  {loading ? (
                    <div className="space-y-2">
                      <div className="h-6 bg-gray-200 rounded w-32 mx-auto animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-24 mx-auto animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-20 mx-auto animate-pulse"></div>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-xl font-semibold">
                        {userProfile?.first_name} {userProfile?.last_name}
                      </h3>
                      <p className="text-muted-foreground">{userProfile?.role}</p>
                      <p className="text-sm text-muted-foreground">
                        {userProfile?.company_name || "CreditRepair Pro"}
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-2">
              <Card className="border border-slate-300 rounded-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-slate-900 leading-tight">
                    Personal Information
                  </CardTitle>
                  <CardDescription>
                    Update your personal details and contact information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2 text-muted-foreground">Loading profile...</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            defaultValue={userProfile?.first_name || ""}
                            className="bg-white/50  border-slate-200 "
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            defaultValue={userProfile?.last_name || ""}
                            className="bg-white/50  border-slate-200 "
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          defaultValue={userProfile?.email || ""}
                          className="bg-white/50  border-slate-200 "
                        />
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        defaultValue={userProfile?.phone || ""}
                        className="bg-white/50  border-slate-200 "
                      />
                    </div>
                    <div>
                      <Label htmlFor="title">Job Title</Label>
                      <Input
                        id="title"
                        defaultValue={userProfile?.title || ""}
                        className="bg-white/50  border-slate-200 "
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      defaultValue={userProfile?.company_name || ""}
                      className="bg-white/50  border-slate-200 "
                    />
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      defaultValue={userProfile?.address || ""}
                      className="bg-white/50  border-slate-200 "
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        defaultValue={userProfile?.city || ""}
                        className="bg-white/50  border-slate-200 "
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        defaultValue={userProfile?.state || ""}
                        className="bg-white/50  border-slate-200 "
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input
                        id="zipCode"
                        defaultValue={userProfile?.zip_code || ""}
                        className="bg-white/50  border-slate-200 "
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Select defaultValue={userProfile?.country || "United States"}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="United States">
                            United States
                          </SelectItem>
                          <SelectItem value="Canada">Canada</SelectItem>
                          <SelectItem value="United Kingdom">
                            United Kingdom
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select defaultValue={userProfile?.timezone || "America/New_York"}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/Los_Angeles">
                            Pacific Time
                          </SelectItem>
                          <SelectItem value="America/New_York">
                            Eastern Time
                          </SelectItem>
                          <SelectItem value="America/Chicago">
                            Central Time
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Reset form fields to original values
                        const form = document.querySelector('form') as HTMLFormElement;
                        if (form) form.reset();
                      }}
                    >
                      Reset
                    </Button>
                    <Button
                      className="bg-slate-800 text-white hover:opacity-90"
                      disabled={saving}
                      onClick={async () => {
                        const firstName = (document.getElementById('firstName') as HTMLInputElement)?.value;
                        const lastName = (document.getElementById('lastName') as HTMLInputElement)?.value;
                        const company = (document.getElementById('company') as HTMLInputElement)?.value;
                        const phone = (document.getElementById('phone') as HTMLInputElement)?.value;
                        const address = (document.getElementById('address') as HTMLInputElement)?.value;
                        const city = (document.getElementById('city') as HTMLInputElement)?.value;
                        const state = (document.getElementById('state') as HTMLInputElement)?.value;
                        const zipCode = (document.getElementById('zipCode') as HTMLInputElement)?.value;
                        const emailVal = (document.getElementById('email') as HTMLInputElement)?.value;

                        if (firstName && lastName) {
                          const payload: any = {
                            first_name: firstName,
                            last_name: lastName,
                            company_name: company || undefined,
                            phone: phone || undefined,
                            address: address || undefined,
                            city: city || undefined,
                            state: state || undefined,
                            zip_code: zipCode || undefined,
                          };

                          const emailChanged = emailVal && emailVal !== (userProfile?.email || '');
                          if (emailChanged) {
                            try {
                              // Use dedicated change-email endpoint to handle verification flow
                              const res: any = await authApi.changeEmail({ oldEmail: userProfile?.email || '', newEmail: emailVal });
                              if (res?.success === false || res?.error) {
                                toast({ title: 'Error', description: res?.message || res?.error || 'Failed to change email', variant: 'destructive' });
                              } else {
                                toast({ title: 'Email Updated', description: 'Verification sent to new email. Please verify and re-login to see the change.' });
                              }
                              // Update other profile fields without forcing refresh (token still has old email)
                              await authApi.updateProfile(payload);
                              toast({ title: 'Success', description: 'Profile updated successfully' });
                            } catch (err: any) {
                              toast({ title: 'Error', description: err?.response?.data?.message || 'Failed to update profile', variant: 'destructive' });
                            }
                          } else {
                            await saveProfile(payload);
                          }
                        }
                      }}
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>



        <TabsContent value="security" className="space-y-8">
          {/* Security Settings */}
          <Card className="border border-slate-300 rounded-sm bg-white">
            <CardHeader>
              <CardTitle className="text-slate-900">
                Security Settings
              </CardTitle>
              <CardDescription>
                Protect your account with enhanced security measures
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-medium mb-2 block">
                    Change Password
                  </Label>
                  <div className="space-y-3">
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="bg-bg-white border-border/40 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          placeholder="New password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="bg-bg-white border-border/40 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 transform -translate-y-1/2"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="bg-bg-white border-border/40 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 transform -translate-y-1/2"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-slate-800 text-white hover:opacity-90"
                      onClick={handlePasswordUpdate}
                      disabled={updatingPassword}
                    >
                      {updatingPassword ? "Updating..." : "Update Password"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </TabsContent>

        <TabsContent value="agreement" className="space-y-8">
          <AdminAgreementTab />
          {canUseFundingOverride ? (
            <Card className="border border-slate-300 rounded-sm bg-white">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center pb-3">
                  <Shield className="h-5 w-5 mr-2" />
                  Funding Module Override Agreement
                </CardTitle>
                <CardDescription>
                  Mandatory electronic acceptance required to allow all clients into Funding
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between border border-border/40 rounded-sm p-4">
                  <div>
                    <div className="font-medium">Enable Funding Override</div>
                    <p className="text-sm text-muted-foreground">
                      Allow all clients access to the Funding page regardless of qualification status
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={fundingOverrideEnabled ? "default" : "outline"}>
                      {fundingOverrideEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                    <Switch
                      checked={fundingOverrideEnabled}
                      onCheckedChange={handleFundingOverrideToggle}
                      disabled={fundingOverrideSaving}
                    />
                  </div>
                </div>
                {fundingOverrideEnabled ? (
                  <div className="text-xs text-muted-foreground">
                    Signed by {(userProfile as any)?.funding_override_signature_text || "Unknown"}
                    {fundingOverrideSignedAt ? ` • ${fundingOverrideSignedAt}` : ""}
                  </div>
                ) : null}
                <ScrollArea className="h-[420px] rounded-sm border border-border/40 bg-white/50  p-4">
                  <div className="space-y-4 text-sm leading-relaxed">
                    <div className="text-base font-semibold">THE SCORE MACHINE</div>
                    <div className="text-sm font-semibold">Funding Module Override Agreement</div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Mandatory Electronic Acceptance Required
                    </div>
                    <div>
                      This Funding Module Override Agreement (“Agreement”) is entered into by and between:
                      The Score Machine, a SaaS credit analytics and educational software platform (“Company”),
                      and The User / Affiliate / Partner enabling this setting (“User”).
                      By enabling the Funding Module Override setting inside the platform, User agrees to the following terms:
                    </div>
                    <div className="space-y-2">
                      <div className="font-semibold">1. Purpose of the Funding Module</div>
                      <div>
                        The Score Machine software provides automated credit analytics, risk indicators, and fundability
                        readiness metrics based on data supplied by the User and/or the end client. The standard system
                        configuration requires certain Score Machine minimum qualification thresholds before a client is
                        permitted access to the Funding Page. These thresholds exist to reduce client decline risk, improve
                        approval probability, protect affiliate conversion ratios, and maintain underwriting integrity.
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="font-semibold">2. Override Election by User</div>
                      <div>
                        The User is voluntarily choosing to disable Score Machine fundability requirements and allow all
                        clients access to the Funding Page regardless of qualification status. By selecting this option,
                        User acknowledges that they are overriding the system’s recommended underwriting safeguards.
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="font-semibold">3. Assumption of Risk</div>
                      <div>
                        If User disables the Score Machine fundability requirements: the Company makes no representation
                        regarding approval likelihood; the Company does not guarantee funding outcomes; the Company does not
                        guarantee lender engagement, approval, terms, rates, or funding amounts. User understands that the
                        Score Machine’s qualification system is designed to reduce denials and bypassing these safeguards
                        increases the probability of declines. User assumes full responsibility for client approval or denial
                        outcomes, client dissatisfaction, chargebacks or refund disputes, commission losses, reputation
                        damage, and any business loss resulting from funding denials.
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="font-semibold">4. No Liability Clause</div>
                      <div>
                        Under no circumstances shall The Score Machine, its owners, officers, developers, affiliates, or
                        representatives be liable for funding denials, reduced approval rates, client complaints related to
                        funding outcomes, lost revenue or commissions, or any indirect, incidental, consequential, or special
                        damages. If User elects to override system requirements, all resulting outcomes are the sole
                        responsibility of the User.
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="font-semibold">5. No Guarantee of Lender Approval</div>
                      <div>
                        The Score Machine is not a lender, does not issue credit, does not make underwriting decisions, does
                        not control lender criteria, and does not control approval algorithms. All funding decisions are made
                        solely by independent third-party lenders.
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="font-semibold">6. Indemnification</div>
                      <div>
                        User agrees to indemnify, defend, and hold harmless The Score Machine from and against any claims,
                        client disputes, regulatory complaints, chargebacks, lawsuits, damages, and legal fees arising from
                        the User’s decision to override system fundability requirements.
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="font-semibold">7. No Reliance on System Override</div>
                      <div>
                        User acknowledges that the system override feature is provided as a configurable tool and not as a
                        recommendation. The Company does not recommend bypassing fundability thresholds.
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="font-semibold">8. Electronic Acceptance</div>
                      <div>
                        By enabling the Funding Override setting, User confirms they understand the risks, accept full
                        responsibility, waive claims against The Score Machine, and legally agree to this Agreement.
                        Electronic activation constitutes binding acceptance.
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="font-semibold">9. Governing Law</div>
                      <div>
                        This Agreement shall be governed by the laws of the Company’s principal place of business
                        jurisdiction.
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="font-semibold">10. Entire Agreement</div>
                      <div>
                        This Agreement supplements and does not replace the Master Terms of Service. In the event of
                        conflict, this Funding Override Agreement shall control with respect to funding eligibility settings.
                      </div>
                    </div>
                  </div>
                </ScrollArea>
                <Dialog open={fundingOverrideDialogOpen} onOpenChange={setFundingOverrideDialogOpen}>
                  <DialogContent className="max-w-xl">
                    <DialogHeader>
                      <DialogTitle>⚠️ Warning</DialogTitle>
                      <DialogDescription>
                        You are disabling The Score Machine’s minimum fundability safeguards. This may increase client denials.
                        All approval outcomes will be your responsibility. The Score Machine is not liable for funding results.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="rounded-sm border border-amber-200 bg-slate-50  p-3 text-sm">
                        Confirm you understand the risks before enabling the override.
                      </div>
                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id="funding-override-ack"
                          checked={fundingOverrideAcknowledged}
                          onCheckedChange={(checked) => setFundingOverrideAcknowledged(checked === true)}
                        />
                        <Label htmlFor="funding-override-ack" className="text-sm">
                          I acknowledge and accept full responsibility.
                        </Label>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="funding-override-signature">Signature (full legal name)</Label>
                        <Input
                          id="funding-override-signature"
                          placeholder="Full legal name"
                          value={fundingOverrideSignature}
                          onChange={(e) => setFundingOverrideSignature(e.target.value)}
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setFundingOverrideDialogOpen(false)}
                          disabled={fundingOverrideSaving}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          className="bg-slate-800 text-white hover:opacity-90"
                          onClick={handleConfirmFundingOverride}
                          disabled={
                            fundingOverrideSaving || !fundingOverrideAcknowledged || !fundingOverrideSignature.trim()
                          }
                        >
                          {fundingOverrideSaving ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Enabling...
                            </>
                          ) : (
                            "Enable Override"
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="integrations" className="space-y-8">
          <Card className="border border-slate-300 rounded-sm bg-white">
            <CardHeader>
              <CardTitle className="text-slate-900 leading-tight">
                System Integrations
              </CardTitle>
              <CardDescription>
                Monitor and manage your external service connections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {integrationStatus.map((integration, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border border-border/40 rounded-sm"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          integration.health === "Good"
                            ? "bg-green-500"
                            : integration.health === "Warning"
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                      ></div>
                      <div>
                        <div className="font-medium">{integration.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Last sync: {integration.lastSync}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge
                        variant="outline"
                        className={getStatusColor(integration.health)}
                      >
                        {integration.health}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={getStatusColor(integration.status)}
                      >
                        {integration.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-300 rounded-sm bg-white">
            <CardHeader>
              <CardTitle className="text-slate-900 leading-tight flex items-center">
                <Webhook className="h-5 w-5 mr-2" />
                GoHighLevel Integration
              </CardTitle>
              <CardDescription>
                Connect your GoHighLevel account to automatically create clients and sync credit summary data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="border border-border/40 rounded-sm p-4">
                  <div className="text-sm text-muted-foreground">Last Successful Sync</div>
                  <div className="text-lg font-semibold">
                    {ghlLoading ? "Loading..." : formatRelativeTime(ghlIntegration?.lastSuccessfulSync)}
                  </div>
                </div>
                <div className="border border-border/40 rounded-sm p-4">
                  <div className="text-sm text-muted-foreground">Last Error</div>
                  <div className="text-sm font-medium">
                    {ghlLoading
                      ? "Loading..."
                      : ghlIntegration?.lastError?.message || "None"}
                  </div>
                  {ghlIntegration?.lastError?.timestamp ? (
                    <div className="text-xs text-muted-foreground">
                      {formatTimestamp(ghlIntegration.lastError.timestamp)}
                    </div>
                  ) : null}
                </div>
                <div className="border border-border/40 rounded-sm p-4">
                  <div className="text-sm text-muted-foreground">Total Clients Received</div>
                  <div className="text-lg font-semibold">
                    {ghlLoading ? "Loading..." : ghlIntegration?.totalClientsReceived || 0}
                  </div>
                </div>
              </div>

              <div className="space-y-4 border border-border/40 rounded-sm p-4">
                <div className="text-sm font-semibold">Inbound Webhook (Client Intake)</div>
                <div className="text-sm text-muted-foreground">
                  Use this webhook in your GoHighLevel workflows to send new clients to ScoreMachine. Clients submitted through this webhook will be created only under your account.
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] items-center">
                  <Input
                    value={webhookUrl || "Webhook will appear after saving integration"}
                    readOnly
                    className="bg-white/50  border-slate-200 "
                  />
                  <Button variant="outline" onClick={handleCopyWebhook} disabled={!webhookUrl}>
                    Copy Webhook
                  </Button>
                  <Dialog open={regenerateOpen} onOpenChange={setRegenerateOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" disabled={!ghlIntegration?.integrationHash || ghlRegenerating}>
                        Regenerate Webhook
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Regenerate Webhook</DialogTitle>
                        <DialogDescription>
                          Regenerating this webhook will immediately disable the old URL. Any GoHighLevel workflows using the old webhook will stop working.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setRegenerateOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleRegenerateWebhook} disabled={ghlRegenerating}>
                          {ghlRegenerating ? "Regenerating..." : "Regenerate"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="space-y-4 border border-border/40 rounded-sm p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Outbound Sync (ScoreMachine → GHL)</div>
                    <div className="text-sm text-muted-foreground">
                      GoHighLevel Connection Settings
                    </div>
                  </div>
                  <Badge variant="outline" className={getStatusColor(ghlStatusLabel)}>
                    {ghlStatusLabel}
                  </Badge>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ghlToken">Private Integration Token</Label>
                    <Input
                      id="ghlToken"
                      type="password"
                      placeholder="Paste your GoHighLevel Private Integration token."
                      value={ghlAccessToken}
                      onChange={(e) => setGhlAccessToken(e.target.value)}
                      className="bg-white/50  border-slate-200 "
                    />
                  </div>
                  <div>
                    <Label htmlFor="ghlLocation">Location ID</Label>
                    <Input
                      id="ghlLocation"
                      placeholder="The GoHighLevel location where updates should be sent."
                      value={ghlLocationId}
                      onChange={(e) => setGhlLocationId(e.target.value)}
                      className="bg-white/50  border-slate-200 "
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={handleDisableGhlIntegration}
                    disabled={ghlDisabling || !ghlIntegration?.isActive}
                  >
                    {ghlDisabling ? "Disabling..." : "Disable Integration"}
                  </Button>
                  <Button
                    className="bg-slate-800 text-white hover:opacity-90"
                    onClick={handleSaveGhlIntegration}
                    disabled={ghlSaving}
                  >
                    {ghlSaving ? "Saving..." : "Save Integration"}
                  </Button>
                </div>
              </div>

              <div className="space-y-3 border border-border/40 rounded-sm p-4">
                <div className="text-sm font-semibold">What Gets Synced</div>
                <div className="text-sm text-muted-foreground">
                  ScoreMachine sends credit summary data only to GoHighLevel. Full credit reports remain securely inside ScoreMachine.
                </div>
                <div className="grid gap-2 text-sm">
                  <div>Credit score(s)</div>
                  <div>Number of negative accounts</div>
                  <div>Collections & charge-offs</div>
                  <div>Utilization percentage</div>
                  <div>Report status</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold">Integration Activity</div>
                <div className="border border-border/40 rounded-sm overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Direction</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Response</TableHead>
                        <TableHead>Fields Attempted</TableHead>
                        <TableHead>Retry</TableHead>
                        <TableHead>Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ghlActivityLoading ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-6">
                            Loading activity...
                          </TableCell>
                        </TableRow>
                      ) : ghlActivity.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-6 text-muted-foreground">
                            No integration activity yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        ghlActivity.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>{formatTimestamp(log.created_at)}</TableCell>
                            <TableCell>
                              {[log.admin_first_name, log.admin_last_name].filter(Boolean).join(" ") || log.admin_email || "-"}
                            </TableCell>
                            <TableCell className="capitalize">{log.direction}</TableCell>
                            <TableCell>{formatEventType(log.event_type)}</TableCell>
                            <TableCell>
                              {[log.client_first_name, log.client_last_name].filter(Boolean).join(" ") || maskEmail(log.client_email)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={getStatusColor(log.status === "success" ? "Connected" : "Error")}
                              >
                                {log.status === "success" ? "Success" : "Failed"}
                              </Badge>
                            </TableCell>
                            <TableCell>{log.response_code || "-"}</TableCell>
                            <TableCell className="max-w-56 whitespace-normal">
                              {Array.isArray(log.data_fields)
                                ? log.data_fields.join(", ")
                                : (() => {
                                    try {
                                      return JSON.parse(log.data_fields || "[]").join(", ");
                                    } catch {
                                      return log.data_fields || "-";
                                    }
                                  })()}
                            </TableCell>
                            <TableCell>{log.retry_status || "-"}</TableCell>
                            <TableCell className="max-w-80 whitespace-normal">
                              {log.error_message || log.message || "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="text-xs text-muted-foreground border border-border/40 rounded-sm p-4">
                By enabling this integration, you confirm you have proper client authorization to access and process credit data.
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-300 rounded-sm bg-white">
            <CardHeader>
              <CardTitle className="text-slate-900 flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                Credit Repair Provider
              </CardTitle>
              <CardDescription>
                Configure the credit repair software URL used across the system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="creditRepairUrl">Custom URL</Label>
                  <Input
                    id="creditRepairUrl"
                    placeholder="https://your-software.example.com/"
                    value={creditRepairUrl}
                    onChange={(e) => setCreditRepairUrl(e.target.value)}
                    className="bg-white/50  border-slate-200 "
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave blank to use default ({DEFAULT_CREDIT_REPAIR_URL})
                  </p>
                </div>
                <div className="border border-border/40 rounded-sm p-3">
                  <div className="text-sm text-muted-foreground">Effective URL</div>
                  <a
                    href={effectiveCreditRepairUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm break-all text-slate-800 hover:underline"
                  >
                    {effectiveCreditRepairUrl}
                  </a>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleUseDefaultCreditRepair}
                  disabled={savingCreditRepair}
                  className="border-slate-300 text-slate-800"
                >
                  Set M2 Fico Forge default
                </Button>
                <Button
                  className="bg-slate-800 text-white hover:opacity-90"
                  onClick={handleSaveCreditRepair}
                  disabled={savingCreditRepair}
                >
                  {savingCreditRepair ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save URL
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {canEditOnboardingSlug ? (
            <Card className="border border-slate-300 rounded-sm bg-white">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  Client Onboarding Link
                </CardTitle>
                <CardDescription>
                  Set a custom slug for your persistent client intake link
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="onboardingSlug">Custom Slug</Label>
                    <Input
                      id="onboardingSlug"
                      placeholder="your-company"
                      value={onboardingSlug}
                      onChange={(e) => setOnboardingSlug(e.target.value)}
                      className="bg-white/50  border-slate-200 "
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use letters, numbers, and hyphens only
                    </p>
                  </div>
                  <div className="border border-border/40 rounded-sm p-3">
                    <div className="text-sm text-muted-foreground">Onboarding Link</div>
                    {onboardingLink ? (
                      <a
                        href={onboardingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm break-all text-slate-800 hover:underline"
                      >
                        {onboardingLink}
                      </a>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Save a slug to generate your link
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    className="bg-slate-800 text-white hover:opacity-90"
                    onClick={handleSaveOnboardingSlug}
                    disabled={savingOnboardingSlug}
                  >
                    {savingOnboardingSlug ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Link
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {canEditOnboardingSlug ? (
            <Card className="border border-slate-300 rounded-sm bg-white">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center">
                  <Palette className="h-5 w-5 mr-2" />
                  Client Intake Branding & Redirect
                </CardTitle>
                <CardDescription>
                  Set the success redirect URL, logo URL, and brand color for your intake page and iframe embed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="intakeRedirectUrl">Success Redirect URL</Label>
                    <Input
                      id="intakeRedirectUrl"
                      placeholder="https://yourdomain.com/success"
                      value={intakeRedirectUrl}
                      onChange={(e) => setIntakeRedirectUrl(e.target.value)}
                      className="bg-white/50  border-slate-200 "
                    />
                    <p className="text-xs text-muted-foreground">Client is sent here after submission.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="intakeCompanyName">Company Name</Label>
                    <Input
                      id="intakeCompanyName"
                      placeholder="Your Company LLC"
                      value={intakeCompanyName}
                      onChange={(e) => setIntakeCompanyName(e.target.value)}
                      className="bg-white/50  border-slate-200 "
                    />
                    <p className="text-xs text-muted-foreground">Optional. Your company's legal name.</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="intakeWebsiteUrl">Website URL</Label>
                    <Input
                      id="intakeWebsiteUrl"
                      placeholder="https://yourdomain.com"
                      value={intakeWebsiteUrl}
                      onChange={(e) => setIntakeWebsiteUrl(e.target.value)}
                      className="bg-white/50  border-slate-200 "
                    />
                    <p className="text-xs text-muted-foreground">Optional. Your company's website.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="intakeLogoUrl">Logo URL</Label>
                    <Input
                      id="intakeLogoUrl"
                      placeholder="https://yourdomain.com/logo.png"
                      value={intakeLogoUrl}
                      onChange={(e) => setIntakeLogoUrl(e.target.value)}
                      className="bg-white/50  border-slate-200 "
                    />
                    <p className="text-xs text-muted-foreground">Optional. Displayed on the intake page.</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="intakeEmail">Contact Email</Label>
                    <Input
                      id="intakeEmail"
                      type="email"
                      placeholder="support@yourcompany.com"
                      value={intakeEmail}
                      onChange={(e) => setIntakeEmail(e.target.value)}
                      className="bg-white/50  border-slate-200 "
                    />
                    <p className="text-xs text-muted-foreground">Optional. For client support.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="intakePhoneNumber">Contact Phone Number</Label>
                    <Input
                      id="intakePhoneNumber"
                      placeholder="+1 (555) 123-4567"
                      value={intakePhoneNumber}
                      onChange={(e) => setIntakePhoneNumber(e.target.value)}
                      className="bg-white/50  border-slate-200 "
                    />
                    <p className="text-xs text-muted-foreground">Optional. For client support.</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 items-start">
                  <div className="space-y-2">
                    <Label htmlFor="intakeLogoFile">Upload Logo</Label>
                    <Input
                      id="intakeLogoFile"
                      type="file"
                      accept="image/*"
                      className="bg-white/50  border-slate-200 "
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (!file) {
                          setIntakeLogoFile(null);
                          return;
                        }
                        if (!file.type.startsWith("image/")) {
                          toast({
                            title: "Invalid Logo File",
                            description: "Please choose an image file.",
                            variant: "destructive",
                          });
                          return;
                        }
                        if (file.size > 2 * 1024 * 1024) {
                          toast({
                            title: "Logo Too Large",
                            description: "Logo size must be less than 2MB.",
                            variant: "destructive",
                          });
                          return;
                        }
                        setIntakeLogoFile(file);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">PNG/JPG/GIF/WEBP up to 2MB.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Logo Preview</Label>
                    <div className="h-20 rounded-sm border border-border/40 bg-white flex items-center justify-center overflow-hidden">
                      {intakeLogoPreview ? (
                        <img src={intakeLogoPreview} alt="Intake logo preview" className="max-h-16 object-contain" />
                      ) : (
                        <span className="text-xs text-muted-foreground">No logo selected</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 items-end">
                  <div className="space-y-2">
                    <Label htmlFor="intakePrimaryColor">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="intakePrimaryColorPicker"
                        type="color"
                        value={/^#[0-9a-fA-F]{6}$/.test(intakePrimaryColor) ? intakePrimaryColor : '#16A34A'}
                        onChange={(e) => setIntakePrimaryColor(e.target.value.toUpperCase())}
                        className="w-16 h-10 p-1 bg-white/50  border-slate-200 "
                      />
                      <Input
                        id="intakePrimaryColor"
                        placeholder="#16A34A"
                        value={intakePrimaryColor}
                        onChange={(e) => setIntakePrimaryColor(e.target.value)}
                        className="bg-white/50  border-slate-200 "
                      />
                      <div
                        className="h-10 w-10 rounded-sm border border-slate-200 "
                        style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(intakePrimaryColor) ? intakePrimaryColor : '#16A34A' }}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground border border-border/40 rounded-sm p-3">
                    <div className="font-semibold mb-1">Iframe embed (same branding applies)</div>
                    <code className="break-all">{onboardingLink ? `<iframe src="${onboardingLink}" style="width:100%; height:900px; border:0;" title="Client Intake"></iframe>` : 'Save onboarding slug first to generate embed code.'}</code>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    className="bg-slate-800 text-white hover:opacity-90"
                    onClick={handleSaveIntakeBranding}
                    disabled={savingIntakeBranding}
                  >
                    {savingIntakeBranding ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Intake Branding
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

        </TabsContent>

        <TabsContent value="funding" className="space-y-8">
          <div className="rounded-sm border border-blue-200 bg-slate-50  p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
            <div>
              <div className="font-medium">NMI Merchant Account Required</div>
              <p className="text-sm text-muted-foreground">
                If you haven't setup your NMI Merchant account, go to 5 Star website to setup your NMI.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 border-slate-300 text-slate-800 hover:bg-slate-50 text-slate-800"
                onClick={() => window.open('https://www.5starpays.com/scoremachine/', '_blank')}
              >
                Open 5 Star Pays
              </Button>
            </div>
          </div>
          <Card className="border border-slate-300 rounded-sm bg-white">
            <CardHeader>
              <CardTitle className="text-slate-900 flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Merchant Setup and Integration
              </CardTitle>
              <CardDescription>
                Configure NMI gateway credentials and branding (UI only for now)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-medium mb-2 block">Gateway Credentials</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="merchantId">Merchant ID</Label>
                    <Input
                      id="merchantId"
                      placeholder="e.g., 123456"
                      className="bg-white/50  border-slate-200 "
                      value={fundingSettings.merchantId}
                      onChange={(e) => setFundingSettings(prev => ({ ...prev, merchantId: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="publicKey">Public Key</Label>
                    <Input
                      id="publicKey"
                      placeholder="pk_live_..."
                      className="bg-white/50  border-slate-200 "
                      value={fundingSettings.publicKey}
                      onChange={(e) => setFundingSettings(prev => ({ ...prev, publicKey: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      placeholder="sk_live_..."
                      className="bg-white/50  border-slate-200 "
                      value={fundingSettings.apiKey}
                      onChange={(e) => setFundingSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="nmiUsername">Username</Label>
                    <Input
                      id="nmiUsername"
                      placeholder="gateway username"
                      className="bg-white/50  border-slate-200 "
                      value={fundingSettings.nmiUsername}
                      onChange={(e) => setFundingSettings(prev => ({ ...prev, nmiUsername: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="nmiPassword">Password</Label>
                    <Input
                      id="nmiPassword"
                      type="password"
                      placeholder="gateway password"
                      className="bg-white/50  border-slate-200 "
                      value={fundingSettings.nmiPassword}
                      onChange={(e) => setFundingSettings(prev => ({ ...prev, nmiPassword: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center justify-between border border-border/40 rounded-sm p-3">
                    <div>
                      <Label className="text-base font-medium">Test Mode</Label>
                      <p className="text-sm text-muted-foreground">Use sandbox for testing payments</p>
                    </div>
                    <Switch
                      id="testMode"
                      checked={fundingSettings.testMode}
                      onCheckedChange={(checked) => setFundingSettings(prev => ({ ...prev, testMode: checked }))}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Label className="text-base font-medium mb-2 block">Gateway Logo</Label>
                <div className="flex items-center space-x-3">
                  <Input
                    id="gatewayLogo"
                    type="file"
                    accept="image/*"
                    className="bg-white/50  border-slate-200 "
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (!file) {
                        setFundingSettings(prev => ({ ...prev, gatewayLogoFile: null }));
                        return;
                      }
                      if (!file.type.startsWith('image/')) {
                        toast({ title: 'Error', description: 'Please select a valid image file.', variant: 'destructive' });
                        return;
                      }
                      if (file.size > 2 * 1024 * 1024) {
                        toast({ title: 'Error', description: 'Image size must be less than 2MB.', variant: 'destructive' });
                        return;
                      }
                      setFundingSettings(prev => ({ ...prev, gatewayLogoFile: file }));
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" className="border-slate-300 text-slate-800 hover:bg-slate-50 text-slate-800">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">PNG or JPG up to 2MB.</p>
              </div>

              {/* Invoice Preview with logo fallback */}
              <div className="mt-6">
                <Label className="text-base font-medium mb-2 block">Invoice Preview</Label>
                <Card className="border border-slate-200  bg-white/60 ">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <img
                          src={logoPreviewUrl}
                          alt="Brand logo"
                          className="h-10 w-auto rounded-sm border border-slate-200  bg-white"
                        />
                        <div>
                          <div className="text-sm font-semibold">Invoice Branding Preview</div>
                          <div className="text-xs text-muted-foreground">Logo displayed on funding charge invoices</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">Funding Charges Preview</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Invoice #</div>
                        <div className="font-medium">INV-1001</div>
                      </div>
                      <div className="text-right">
                        <div className="text-muted-foreground">Due Date</div>
                        <div className="font-medium">Dec 15, 2024</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Total Funding</div>
                        <div className="font-medium">{formatCurrency(fundingSummary.totalFunding)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-muted-foreground">Total Admin Fees</div>
                        <div className="font-medium">{formatCurrency(fundingSummary.totalAdminFees)}</div>
                      </div>
                    </div>
                    <div className="rounded-sm border border-slate-200  overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 ">
                          <tr>
                            <th className="text-left p-3 font-medium">Card</th>
                            <th className="text-right p-3 font-medium">Funding Amount</th>
                            <th className="text-right p-3 font-medium">Admin Fee (%)</th>
                            <th className="text-right p-3 font-medium">Admin Fee Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sampleCardCharges.map((c, idx) => {
                            const feeAmount = c.approved * (c.adminFeePercent / 100);
                            return (
                              <tr key={idx} className="border-t border-slate-200 ">
                                <td className="p-3">{c.card}</td>
                                <td className="p-3 text-right">{formatCurrency(c.approved)}</td>
                                <td className="p-3 text-right">{c.adminFeePercent}%</td>
                                <td className="p-3 text-right">{formatCurrency(feeAmount)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-slate-50  border-t border-slate-200 ">
                          <tr>
                            <td className="p-3 font-semibold" colSpan={3}>Total Admin Fees Due</td>
                            <td className="p-3 text-right font-semibold">{formatCurrency(fundingSummary.totalAdminFees)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">Preview only • Items reflect card funding and admin fees</div>
                      <Button variant="secondary" size="sm" disabled>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pay Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end">
                <Button className="bg-slate-800 text-white hover:opacity-90" onClick={handleFundingSave} disabled={savingFunding}>
                  {savingFunding ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-8">
          <Card className="border border-slate-300 rounded-sm bg-white">
            <CardHeader>
              <CardTitle className="text-slate-900 flex items-center">
                <Palette className="h-5 w-5 mr-2" />
                Theme Preferences
              </CardTitle>
              <CardDescription>
                Customize the appearance and visual preferences of your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-medium mb-4 block">
                  Color Theme
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div 
                    className={`p-4 border-2 rounded-sm cursor-pointer transition-all ${
                      appearance.theme === 'light' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleThemeChange('light')}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white border rounded-sm ">
                        <Sun className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div>
                        <div className="font-medium">Light Mode</div>
                        <div className="text-sm text-muted-foreground">
                          Clean and bright interface
                        </div>
                      </div>
                    </div>
                    {appearance.theme === 'light' && (
                      <div className="mt-3 flex items-center text-primary text-sm">
                        <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
                        Currently active
                      </div>
                    )}
                  </div>

                  <div 
                    className={`p-4 border-2 rounded-sm cursor-pointer transition-all ${
                      appearance.theme === 'dark' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleThemeChange('dark')}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-slate-800 border rounded-sm ">
                        <Moon className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <div className="font-medium">Dark Mode</div>
                        <div className="text-sm text-muted-foreground">
                          Easy on the eyes for long sessions
                        </div>
                      </div>
                    </div>
                    {appearance.theme === 'dark' && (
                      <div className="mt-3 flex items-center text-primary text-sm">
                        <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
                        Currently active
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">
                      Compact Mode
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Reduce spacing for more content on screen
                    </p>
                  </div>
                  <Switch
                    checked={appearance.compactMode}
                    onCheckedChange={(checked) =>
                      setAppearance({ ...appearance, compactMode: checked })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">
                    Animations
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Enable smooth transitions and animations
                  </p>
                </div>
                <Switch
                  checked={appearance.animations}
                  onCheckedChange={(checked) =>
                    setAppearance({ ...appearance, animations: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </div>
      </div>
  );

  return settingsContent;
}
