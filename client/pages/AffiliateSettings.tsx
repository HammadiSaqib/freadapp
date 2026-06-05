import { useState, useEffect } from "react";
import AffiliateLayout from "@/components/AffiliateLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, User, CreditCard, Shield, Globe, Mail, Phone, MapPin, Camera, Save, Eye, EyeOff, Trash2, Loader2, Link as LinkIcon } from "lucide-react";
import { affiliateApi, authApi } from "@/lib/api";
import { getPublicAliasOrigin } from "@/lib/hostRouting";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";

interface AffiliateProfile {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  bio: string;
  website: string;
  socialMedia: {
    twitter: string;
    facebook: string;
    linkedin: string;
    instagram: string;
  };
  avatar: string;
  logoUrl: string;
  timezone: string;
  language: string;
  partnerLink: string;
  creditRepairLink: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  weeklyReports: boolean;
  monthlyReports: boolean;
  commissionAlerts: boolean;
  referralUpdates: boolean;
}

interface PaymentSettings {
  paymentMethod: string;
  bankAccount: string;
  routingNumber: string;
  paypalEmail: string;
  minimumPayout: number;
  payoutFrequency: string;
}

export default function AffiliateSettings() {
  const [profile, setProfile] = useState<AffiliateProfile>({
    id: "",
    firstName: "",
    lastName: "",
    companyName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    bio: "",
    website: "",
    socialMedia: {
      twitter: "",
      facebook: "",
      linkedin: "",
      instagram: ""
    },
    avatar: "",
    logoUrl: "",
    timezone: "UTC",
    language: "en",
    partnerLink: "",
    creditRepairLink: ""
  });

  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    marketingEmails: false,
    weeklyReports: true,
    monthlyReports: true,
    commissionAlerts: true,
    referralUpdates: true
  });

  const [payment, setPayment] = useState<PaymentSettings>({
    paymentMethod: "bank",
    bankAccount: "",
    routingNumber: "",
    paypalEmail: "",
    minimumPayout: 50,
    payoutFrequency: "monthly"
  });

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralSlug, setReferralSlug] = useState("");
  const [slugCheckLoading, setSlugCheckLoading] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const { toast } = useToast();
  const { refreshProfile, userProfile, updateProfile } = useAuthContext();

  useEffect(() => {
    fetchAffiliateSettings();
  }, []);

  const fetchAffiliateSettings = async () => {
    try {
      setLoading(true);
      console.log('Fetching affiliate settings...');
      const response = await affiliateApi.getSettings();
      console.log('API Response:', response);
      
      // Access data from the nested structure
      const responseData = response.data || response;
      
      if (responseData.profile) {
        console.log('Profile data:', responseData.profile);
        setProfile({
          id: responseData.profile.id?.toString() || "",
          firstName: responseData.profile.first_name || "",
          lastName: responseData.profile.last_name || "",
          companyName: responseData.profile.company_name || "",
          email: responseData.profile.email || "",
          phone: responseData.profile.phone || "",
          partnerLink: responseData.profile.partner_monitoring_link || "",
          creditRepairLink: responseData.profile.credit_repair_link || "",
          address: responseData.profile.address || "",
          city: responseData.profile.city || "",
          state: responseData.profile.state || "",
          zipCode: responseData.profile.zip_code || "",
          country: "US",
          bio: "",
          website: "",
          socialMedia: {
            twitter: "",
            facebook: "",
            linkedin: "",
            instagram: ""
          },
          avatar: "",
          logoUrl: responseData.profile.logo_url || "",
          timezone: "UTC",
          language: "en"
        });
        setReferralSlug(responseData.profile.referral_slug || "");
      } else {
        console.log('No profile data in response');
      }
      
      if (responseData.notifications) {
        setNotifications({
          emailNotifications: responseData.notifications.email_notifications ?? true,
          smsNotifications: responseData.notifications.sms_notifications ?? false,
          pushNotifications: responseData.notifications.push_notifications ?? true,
          marketingEmails: responseData.notifications.marketing_emails ?? false,
          weeklyReports: responseData.notifications.weekly_reports ?? true,
          monthlyReports: responseData.notifications.monthly_reports ?? true,
          commissionAlerts: responseData.notifications.commission_alerts ?? true,
          referralUpdates: responseData.notifications.referral_updates ?? true
        });
      }
      
      if (responseData.payment) {
        setPayment({
          paymentMethod: responseData.payment.payment_method || "paypal",
          bankAccount: responseData.payment.account_number || "",
          routingNumber: responseData.payment.routing_number || "",
          paypalEmail: responseData.payment.paypal_email || "",
          minimumPayout: responseData.payment.minimum_payout || 50,
          payoutFrequency: responseData.payment.payout_frequency || "monthly"
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const validateSlug = (s: string) => /^[a-z0-9_-]{3,30}$/.test(s);
  const handleCheckSlug = async () => {
    try {
      if (!validateSlug(referralSlug)) {
        toast({ title: "Invalid slug", description: "Use 3-30 chars: a-z, 0-9, - or _", variant: "destructive" });
        return;
      }
      setSlugCheckLoading(true);
      const res = await affiliateApi.checkSlugAvailability(referralSlug);
      const data = res.data || res;
      setSlugAvailable(!!data.available);
      toast({ title: data.available ? "Available" : "Taken", description: data.available ? "You can use this slug" : "Choose another" });
    } catch (e) {
      toast({ title: "Error", description: "Failed to check slug", variant: "destructive" });
    } finally {
      setSlugCheckLoading(false);
    }
  };

  const handleSaveSlug = async () => {
    try {
      if (!validateSlug(referralSlug)) {
        toast({ title: "Invalid slug", description: "Use 3-30 chars: a-z, 0-9, - or _", variant: "destructive" });
        return;
      }
      setLoading(true);
      await affiliateApi.updateReferralSlug(referralSlug);
      setSlugAvailable(true);
      toast({ title: "Success", description: "Referral link updated" });
    } catch (e) {
      toast({ title: "Error", description: "Failed to save slug", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🔄 Starting image upload process...');
    const file = event.target.files?.[0];
    if (!file) {
      console.log('❌ No file selected');
      return;
    }

    console.log('📁 File selected:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      console.log('❌ Invalid file type:', file.type);
      toast({
        title: "Invalid file type",
        description: "Please select a JPEG, PNG, or GIF image.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      console.log('❌ File too large:', file.size);
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    console.log('✅ File validation passed');
    setUploadingImage(true);
    try {
      console.log('📤 Calling authApi.uploadAvatar...');
      const response = await authApi.uploadAvatar(file);
      console.log('✅ Upload response:', response);
      
      // Update local state immediately with the new avatar URL
      if (response.data?.avatarUrl) {
        console.log('🔄 Updating userProfile with new avatar:', response.data.avatarUrl);
        updateProfile({ avatar: response.data.avatarUrl });
      }
      
      console.log('🔄 Refreshing profile from server...');
      // Refresh global auth context to update avatar across all components
      await refreshProfile();
      console.log('✅ Profile refreshed');
      
      toast({
        title: "Success",
        description: "Profile image updated successfully!",
      });
    } catch (error: any) {
      console.error('❌ Error uploading image:', error);
      console.error('❌ Error response:', error.response?.data);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
      console.log('🏁 Upload process completed');
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

  const handleProfileUpdate = async (overrides?: Partial<AffiliateProfile>) => {
    try {
      setLoading(true);
      const nextProfile = { ...profile, ...overrides };
      
      // Get current profile data to preserve company_name
      await affiliateApi.updateProfile({
        first_name: nextProfile.firstName,
        last_name: nextProfile.lastName,
        company_name: nextProfile.companyName || null,
        phone: nextProfile.phone,
        address: nextProfile.address,
        city: nextProfile.city,
        state: nextProfile.state,
        zip_code: nextProfile.zipCode,
        partner_monitoring_link: nextProfile.partnerLink || null,
        credit_repair_link: nextProfile.creditRepairLink || null
      });
      setProfile(nextProfile);
      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a JPEG, PNG, or GIF image.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingLogo(true);
    try {
      const response = await authApi.uploadAffiliateLogo(file);
      if (response.data?.logoUrl) {
        setProfile((prev) => ({ ...prev, logoUrl: response.data.logoUrl }));
      }
      toast({
        title: "Success",
        description: "Affiliate logo updated successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleNotificationUpdate = async () => {
    try {
      setLoading(true);
      await affiliateApi.updateNotifications({
        email_notifications: notifications.emailNotifications,
        sms_notifications: notifications.smsNotifications,
        push_notifications: notifications.pushNotifications,
        commission_alerts: notifications.commissionAlerts,
        referral_updates: notifications.referralUpdates,
        weekly_reports: notifications.weeklyReports,
        monthly_reports: notifications.monthlyReports,
        marketing_emails: notifications.marketingEmails
      });
      toast({
        title: "Success",
        description: "Notification preferences updated"
      });
    } catch (error) {
      console.error('Error updating notifications:', error);
      toast({
        title: "Error",
        description: "Failed to update notifications",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentUpdate = async () => {
    try {
      setLoading(true);
      await affiliateApi.updatePayment({
        payment_method: payment.paymentMethod,
        bank_name: "",
        account_number: payment.bankAccount,
        routing_number: payment.routingNumber,
        account_holder_name: `${profile.firstName} ${profile.lastName}`,
        paypal_email: payment.paypalEmail,
        stripe_account_id: "",
        minimum_payout: payment.minimumPayout,
        payout_frequency: payment.payoutFrequency,
        tax_id: ""
      });
      toast({
        title: "Success",
        description: "Payment settings updated"
      });
    } catch (error) {
      console.error('Error updating payment settings:', error);
      toast({
        title: "Error",
        description: "Failed to update payment settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      await affiliateApi.updatePassword({
        current_password: currentPassword,
        new_password: newPassword
      });
      toast({
        title: "Success",
        description: "Password updated successfully"
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: "Error",
        description: "Failed to update password",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AffiliateLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Affiliate Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account preferences and settings</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="partner-link" className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Partner Link
            </TabsTrigger>
            <TabsTrigger value="referral" className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Referral
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarImage 
                        src={userProfile?.avatar || ''} 
                        alt={`${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`} 
                      />
                      <AvatarFallback className="text-lg">
                        {userProfile?.first_name?.[0] || 'U'}{userProfile?.last_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
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
                            Change Photo
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
                </div>

                <div className="flex items-center space-x-4">
                  <div className="relative h-20 w-32 rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
                    {profile.logoUrl ? (
                      <img src={profile.logoUrl} alt="Affiliate logo" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-xs text-slate-500">No logo</span>
                    )}
                    {uploadingLogo && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('logo-upload')?.click()}
                        disabled={uploadingLogo}
                      >
                        {uploadingLogo ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Camera className="h-4 w-4 mr-2" />
                            Upload Logo
                          </>
                        )}
                      </Button>
                    </div>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <p className="text-sm text-muted-foreground">
                      JPG, PNG or GIF. Max size 5MB.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={profile.firstName}
                      onChange={(e) => setProfile({...profile, firstName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={profile.lastName}
                      onChange={(e) => setProfile({...profile, lastName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={profile.companyName}
                      onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({...profile, email: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({...profile, phone: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself..."
                    value={profile.bio}
                    onChange={(e) => setProfile({...profile, bio: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    placeholder="https://yourwebsite.com"
                    value={profile.website}
                    onChange={(e) => setProfile({...profile, website: e.target.value})}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Address Information</h3>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={profile.address}
                      onChange={(e) => setProfile({...profile, address: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={profile.city}
                        onChange={(e) => setProfile({...profile, city: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={profile.state}
                        onChange={(e) => setProfile({...profile, state: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input
                        id="zipCode"
                        value={profile.zipCode}
                        onChange={(e) => setProfile({...profile, zipCode: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => handleProfileUpdate()} disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose how you want to receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-gray-500">Receive notifications via email</p>
                    </div>
                    <Switch
                      checked={notifications.emailNotifications}
                      onCheckedChange={(checked) => setNotifications({...notifications, emailNotifications: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>SMS Notifications</Label>
                      <p className="text-sm text-gray-500">Receive notifications via SMS</p>
                    </div>
                    <Switch
                      checked={notifications.smsNotifications}
                      onCheckedChange={(checked) => setNotifications({...notifications, smsNotifications: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Push Notifications</Label>
                      <p className="text-sm text-gray-500">Receive browser push notifications</p>
                    </div>
                    <Switch
                      checked={notifications.pushNotifications}
                      onCheckedChange={(checked) => setNotifications({...notifications, pushNotifications: checked})}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Commission Alerts</Label>
                      <p className="text-sm text-gray-500">Get notified when you earn commissions</p>
                    </div>
                    <Switch
                      checked={notifications.commissionAlerts}
                      onCheckedChange={(checked) => setNotifications({...notifications, commissionAlerts: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Referral Updates</Label>
                      <p className="text-sm text-gray-500">Updates about your referrals</p>
                    </div>
                    <Switch
                      checked={notifications.referralUpdates}
                      onCheckedChange={(checked) => setNotifications({...notifications, referralUpdates: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Weekly Reports</Label>
                      <p className="text-sm text-gray-500">Weekly performance summaries</p>
                    </div>
                    <Switch
                      checked={notifications.weeklyReports}
                      onCheckedChange={(checked) => setNotifications({...notifications, weeklyReports: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Monthly Reports</Label>
                      <p className="text-sm text-gray-500">Monthly performance summaries</p>
                    </div>
                    <Switch
                      checked={notifications.monthlyReports}
                      onCheckedChange={(checked) => setNotifications({...notifications, monthlyReports: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Marketing Emails</Label>
                      <p className="text-sm text-gray-500">Promotional and marketing content</p>
                    </div>
                    <Switch
                      checked={notifications.marketingEmails}
                      onCheckedChange={(checked) => setNotifications({...notifications, marketingEmails: checked})}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleNotificationUpdate} disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Settings</CardTitle>
                <CardDescription>
                  Configure how you receive your affiliate commissions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select value={payment.paymentMethod} onValueChange={(value) => setPayment({...payment, paymentMethod: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank">Bank Transfer</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {payment.paymentMethod === 'bank' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="bankAccount">Bank Account Number</Label>
                        <Input
                          id="bankAccount"
                          type="password"
                          value={payment.bankAccount}
                          onChange={(e) => setPayment({...payment, bankAccount: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="routingNumber">Routing Number</Label>
                        <Input
                          id="routingNumber"
                          value={payment.routingNumber}
                          onChange={(e) => setPayment({...payment, routingNumber: e.target.value})}
                        />
                      </div>
                    </>
                  )}

                  {payment.paymentMethod === 'paypal' && (
                    <div className="space-y-2">
                      <Label htmlFor="paypalEmail">PayPal Email</Label>
                      <Input
                        id="paypalEmail"
                        type="email"
                        value={payment.paypalEmail}
                        onChange={(e) => setPayment({...payment, paypalEmail: e.target.value})}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="minimumPayout">Minimum Payout Amount ($)</Label>
                    <Input
                      id="minimumPayout"
                      type="number"
                      min="25"
                      value={payment.minimumPayout}
                      onChange={(e) => setPayment({...payment, minimumPayout: parseInt(e.target.value)})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Payout Frequency</Label>
                    <Select value={payment.payoutFrequency} onValueChange={(value) => setPayment({...payment, payoutFrequency: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handlePaymentUpdate} disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Payment Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage your account security and password
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={handlePasswordChange} 
                    disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Update Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="partner-link" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Partner Monitoring Link</CardTitle>
                <CardDescription>
                  Save a single credit monitoring link that will replace the default link shown to your referrals.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="partnerLinkSetting">Partner link URL</Label>
                  <Input
                    id="partnerLinkSetting"
                    type="url"
                    placeholder="https://your-monitoring-link.com"
                    value={profile.partnerLink}
                    onChange={(e) => setProfile({ ...profile, partnerLink: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Provide your MyScoreIQ, IdentityIQ, or MyFreeScoreNow affiliate link. Leave blank to use the default monitoring link.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button onClick={() => handleProfileUpdate()} disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Partner Link
                  </Button>
                  {profile.partnerLink ? (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={loading}
                      onClick={() => handleProfileUpdate({ partnerLink: "" })}
                    >
                      Clear Link
                    </Button>
                  ) : null}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="text-sm break-all">
                    {profile.partnerLink || 'Using default monitoring link'}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Credit Repair Link</CardTitle>
                <CardDescription>
                  Share the credit repair service you recommend. This will appear for referrals reviewing their reports.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="creditRepairLinkSetting">Credit repair URL</Label>
                  <Input
                    id="creditRepairLinkSetting"
                    type="url"
                    placeholder="https://your-credit-repair-site.com"
                    value={profile.creditRepairLink}
                    onChange={(e) => setProfile({ ...profile, creditRepairLink: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank to fall back to the admin credit repair link or the global default.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button onClick={() => handleProfileUpdate()} disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Credit Repair Link
                  </Button>
                  {profile.creditRepairLink ? (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={loading}
                      onClick={() => handleProfileUpdate({ creditRepairLink: "" })}
                    >
                      Clear Link
                    </Button>
                  ) : null}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="text-sm break-all">
                    {profile.creditRepairLink || 'Using admin or default credit repair link'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referral" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Custom Referral Link</CardTitle>
                <CardDescription>Set a unique referral path</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="referralSlug">Your referral URL</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground select-none">
                      {getPublicAliasOrigin('ref')}/
                    </span>
                    <Input
                      id="referralSlug"
                      value={referralSlug}
                      onChange={(e) => { setReferralSlug(e.target.value.toLowerCase()); setSlugAvailable(null); }}
                      placeholder="your-code"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Use 3-30 characters: a-z, 0-9, - or _</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={handleCheckSlug} disabled={slugCheckLoading}>
                    {slugCheckLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Check availability
                  </Button>
                  <Button onClick={handleSaveSlug} disabled={loading || slugAvailable === false}>
                    <Save className="h-4 w-4 mr-2" />
                    Save slug
                  </Button>
                  {slugAvailable !== null && (
                    <Badge variant={slugAvailable ? "default" : "destructive"}>
                      {slugAvailable ? "Available" : "Taken"}
                    </Badge>
                  )}
                </div>
                <Separator />
                <div>
                  <Label>Preview</Label>
                  <div className="mt-1 text-sm">
                    {`${getPublicAliasOrigin('ref')}/${referralSlug || 'your-code'}`}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AffiliateLayout>
  );
}
