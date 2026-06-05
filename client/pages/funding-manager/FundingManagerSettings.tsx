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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Progress } from "@/components/ui/progress";
import FundingManagerLayout from "@/components/FundingManagerLayout";
import { useState, useEffect } from "react";
import { authApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  CreditCard,
  DollarSign,
  TrendingUp,
  Wallet,
  Target,
  PieChart,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Globe,
  Palette,
  Monitor,
  Smartphone,
  Camera,
  Trash2,
  Save,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Key,
  Zap,
  BarChart3,
  Calculator,
  Percent,
  Building,
  FileText,
  Clock,
} from "lucide-react";

interface UserProfile {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  company_name?: string;
  phone?: string;
  address?: string;
  avatar?: string;
  created_at: string;
  updated_at: string;
}

interface FundingSettings {
  default_funding_limit: number;
  risk_tolerance: string;
  auto_approve_threshold: number;
  notification_preferences: {
    email_alerts: boolean;
    sms_alerts: boolean;
    funding_requests: boolean;
    portfolio_updates: boolean;
    risk_alerts: boolean;
  };
  investment_strategy: string;
  minimum_roi_threshold: number;
  maximum_exposure_per_client: number;
}

export default function FundingManagerSettings() {
  const [activeTab, setActiveTab] = useState("profile");
  const { userProfile, refreshProfile } = useAuthContext();
  
  // Local form state for editing
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company_name: "",
  });
  
  const [fundingSettings, setFundingSettings] = useState<FundingSettings>({
    default_funding_limit: 50000,
    risk_tolerance: "moderate",
    auto_approve_threshold: 10000,
    notification_preferences: {
      email_alerts: true,
      sms_alerts: false,
      funding_requests: true,
      portfolio_updates: true,
      risk_alerts: true,
    },
    investment_strategy: "balanced",
    minimum_roi_threshold: 15,
    maximum_exposure_per_client: 100000,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  // Theme preference state
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  
  const { toast } = useToast();

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark);
      setIsDarkMode(shouldBeDark);
      document.documentElement.classList.toggle("dark", shouldBeDark);
    } catch (_) {
      // no-op
    }
  }, []);

  const handleThemeToggle = (enabled: boolean) => {
    setIsDarkMode(enabled);
    const theme = enabled ? "dark" : "light";
    try {
      localStorage.setItem("theme", theme);
    } catch (_) {
      // ignore storage errors
    }
    document.documentElement.classList.toggle("dark", enabled);
  };

  // Fallback: ensure profile is fetched on mount if not already loaded
  useEffect(() => {
    if (!userProfile) {
      (async () => {
        try {
          await refreshProfile();
        } finally {
          // Prevent indefinite spinner even if profile fetch fails
          setLoading(false);
        }
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Initialize form data with user data when user is loaded
    if (userProfile) {
      setFormData({
        first_name: userProfile.first_name || "",
        last_name: userProfile.last_name || "",
        email: userProfile.email || "",
        phone: userProfile.phone || "",
        company_name: userProfile.company_name || "",
      });
      setLoading(false); // Set loading to false once user profile is available
    }
  }, [userProfile]);

  const handleSaveProfile = async () => {
    if (!userProfile) return;
    
    try {
      setSaving(true);
      const response = await authApi.updateProfile(formData);
      
      // Refresh global auth context instead of setting local state
      await refreshProfile();
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFundingSettings = async () => {
    try {
      setSaving(true);
      // In a real app, this would be an API call to save funding settings
      // For now, we'll simulate the API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Success",
        description: "Funding settings updated successfully",
      });
    } catch (error) {
      console.error("Error updating funding settings:", error);
      toast({
        title: "Error",
        description: "Failed to update funding settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async () => {
    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "New password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const response = await authApi.updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      
      // Clear password form
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      
      toast({
        title: "Success",
        description: "Password updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select a valid image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadingImage(true);
      const response = await authApi.uploadAvatar(file);
      
      if (response.data) {
        // Refresh global auth context instead of setting local state
       await refreshProfile();
        toast({
          title: "Success",
          description: "Profile image updated successfully",
        });
      }
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageDelete = async () => {
     try {
       setUploadingImage(true);
       await authApi.deleteAvatar();
       
       // Refresh global auth context instead of setting local state
       await refreshProfile();
       toast({
         title: "Success",
         description: "Profile image removed successfully",
       });
     } catch (error: any) {
       console.error("Error deleting image:", error);
       toast({
         title: "Error",
         description: error.response?.data?.message || "Failed to remove image",
         variant: "destructive",
       });
     } finally {
       setUploadingImage(false);
     }
   };

  const handleNotificationChange = (key: keyof FundingSettings['notification_preferences'], value: boolean) => {
    setFundingSettings(prev => ({
      ...prev,
      notification_preferences: {
        ...prev.notification_preferences,
        [key]: value
      }
    }));
  };

  const handleFundingSettingChange = (key: keyof Omit<FundingSettings, 'notification_preferences'>, value: any) => {
    setFundingSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <FundingManagerLayout
      title="Settings"
      description="Manage your funding preferences, profile, and system configuration"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-emerald-600" />
                  <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    Profile Picture
                  </span>
                </CardTitle>
                <CardDescription>
                  Update your profile photo and display information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center space-y-4">
                  {userProfile?.avatar ? (
                    <div className="relative w-32 h-32">
                      <img 
                        src={userProfile.avatar} 
                        alt="Profile Avatar" 
                        className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                        onError={(e) => {
                          console.error('Avatar image failed to load:', userProfile.avatar);
                          // Hide the img and show fallback
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                        onLoad={() => console.log('Avatar image loaded successfully:', userProfile.avatar)}
                      />
                      <div 
                        className="w-32 h-32 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-2xl flex items-center justify-center shadow-lg"
                        style={{ display: 'none' }}
                      >
                        {userProfile?.first_name?.[0] || "F"}
                        {userProfile?.last_name?.[0] || "M"}
                      </div>
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-2xl flex items-center justify-center shadow-lg">
                      {userProfile?.first_name?.[0] || "F"}
                      {userProfile?.last_name?.[0] || "M"}
                    </div>
                  )}
                  
                  {/* Debug info */}
                  <div className="text-xs text-gray-500 text-center">
                    <p>Avatar URL: {userProfile?.avatar || 'No avatar set'}</p>
                    <p>User ID: {userProfile?.id}</p>
                  </div>
                  <div className="flex space-x-2">
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={uploadingImage}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                        disabled={uploadingImage}
                      >
                        {uploadingImage ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Camera className="h-4 w-4 mr-2" />
                        )}
                        {uploadingImage ? "Uploading..." : "Upload"}
                      </Button>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleImageDelete}
                      disabled={uploadingImage || !userProfile?.avatar}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
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
                      <p className="text-muted-foreground">Funding Manager</p>
                      <p className="text-sm text-muted-foreground">
                        {userProfile?.company_name || "CreditRepair Pro"}
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-2">
              <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-emerald-600" />
                    <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                      Personal Information
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Update your personal details and contact information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                      <p className="mt-2 text-muted-foreground">Loading profile...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                         <Label htmlFor="firstName">First Name</Label>
                         <Input
                           id="firstName"
                           value={formData.first_name}
                           onChange={(e) => setFormData(prev => ({...prev, first_name: e.target.value}))}
                           className="border-emerald-500/20 focus:border-emerald-500"
                         />
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="lastName">Last Name</Label>
                         <Input
                           id="lastName"
                           value={formData.last_name}
                           onChange={(e) => setFormData(prev => ({...prev, last_name: e.target.value}))}
                           className="border-emerald-500/20 focus:border-emerald-500"
                         />
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="email">Email</Label>
                         <Input
                         id="email"
                         type="email"
                         value={formData.email}
                         onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                         className="border-emerald-500/20 focus:border-emerald-500"
                       />
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="phone">Phone</Label>
                         <Input
                           id="phone"
                           value={formData.phone}
                           onChange={(e) => setFormData(prev => ({...prev, phone: e.target.value}))}
                           className="border-emerald-500/20 focus:border-emerald-500"
                         />
                       </div>
                       <div className="space-y-2 md:col-span-2">
                         <Label htmlFor="company">Company</Label>
                         <Input
                           id="company"
                           value={formData.company_name}
                           onChange={(e) => setFormData(prev => ({...prev, company_name: e.target.value}))}
                           className="border-emerald-500/20 focus:border-emerald-500"
                         />
                       </div>
                     </div>
                  )}
                  
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800"
                    >
                      {saving ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
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



        {/* Security Tab */}
        <TabsContent value="security" className="space-y-8">
          <div className="grid lg:grid-cols-2 gap-8">
            <Card className="lg:col-span-2 border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-emerald-600" />
                  <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    Password Security
                  </span>
                </CardTitle>
                <CardDescription>
                  Update your password and security settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({...prev, currentPassword: e.target.value}))}
                      className="border-emerald-500/20 focus:border-emerald-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({...prev, newPassword: e.target.value}))}
                    className="border-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({...prev, confirmPassword: e.target.value}))}
                    className="border-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <Button 
                  onClick={handlePasswordUpdate}
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" />
                      Update Password
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-8">
          <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="h-5 w-5 text-emerald-600" />
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Display Preferences
                </span>
              </CardTitle>
              <CardDescription>
                Customize your funding manager dashboard appearance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Toggle between light and dark themes
                    </p>
                  </div>
                  <Switch checked={isDarkMode} onCheckedChange={handleThemeToggle} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </FundingManagerLayout>
  );
}