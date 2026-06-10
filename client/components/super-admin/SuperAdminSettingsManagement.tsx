import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../ui/tabs';
import { authApi, superAdminApi } from '../../lib/api';
import { User, Settings, Key, Eye, EyeOff, Save, RefreshCw, AlertTriangle, CheckCircle, Camera, Trash2 } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useAuthContext } from '../../contexts/AuthContext';

interface UserProfile {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: string;
  avatar?: string;
  created_at: string;
  updated_at: string;
}

interface StripeConfig {
  id: string | number;
  setting_key: string;
  setting_value: string;
  setting_type: string;
  category: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface AffiliateCommissionSettings {
  level2_rate_free: string;
  level2_rate_paid: string;
}

const OPEN_AI_CONFIGURATION_VARIABLES = [
  '{(Admin Name)}',
  '{(Admin Prompt)}',
  '{(Admin Selected Client Latest Report (JSON))}',
] as const;

const SuperAdminSettingsManagement: React.FC = () => {
  const { toast } = useToast();
  const { refreshProfile } = useAuthContext();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [stripeConfig, setStripeConfig] = useState<StripeConfig[]>([]);
  const [affiliateCommissionSettings, setAffiliateCommissionSettings] = useState<AffiliateCommissionSettings>({
    level2_rate_free: '',
    level2_rate_paid: ''
  });
  const [openAiConfiguration, setOpenAiConfiguration] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [affiliateCommissionSaving, setAffiliateCommissionSaving] = useState(false);
  const [openAiConfigurationSaving, setOpenAiConfigurationSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showSecrets, setShowSecrets] = useState<{[key: string]: boolean}>({});
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<StripeConfig | null>(null);
  const [newValue, setNewValue] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'system'>('profile');
  const openAiConfigurationTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    fetchUserProfile();
    fetchStripeConfig();
    fetchAffiliateCommissionSettings();
    fetchOpenAiConfiguration();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await authApi.getProfile();
      const payload = response?.data;
      // Handle both API formats: { success: true, user: {...} } and legacy direct payload
      const profile = payload?.success && payload?.user ? payload.user : payload;
      if (profile) {
        setUserProfile(profile);
        setProfileForm({
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          email: profile.email || '',
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to load profile information",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStripeConfig = async () => {
    try {
      const response = await superAdminApi.getStripeConfig();
      if (response.data?.success) {
        const config = response.data.config;
        if (config) {
          // Transform the API response to match the expected StripeConfig interface
          const transformedConfig: StripeConfig[] = [];
          
          if (config.stripe_publishable_key) {
            transformedConfig.push({
              id: `${config.id}-publishable`,
              setting_key: 'publishable_key',
              setting_value: config.stripe_publishable_key,
              setting_type: 'string',
              category: 'stripe',
              description: 'Stripe Publishable Key',
              is_public: true,
              created_at: config.created_at,
              updated_at: config.updated_at
            });
          }
          
          if (config.has_secret_key) {
            transformedConfig.push({
              id: `${config.id}-secret`,
              setting_key: 'secret_key',
              setting_value: '••••••••••••••••', // Masked for security
              setting_type: 'string',
              category: 'stripe',
              description: 'Stripe Secret Key',
              is_public: false,
              created_at: config.created_at,
              updated_at: config.updated_at
            });
          }
          
          if (config.has_webhook_secret) {
            transformedConfig.push({
              id: `${config.id}-webhook`,
              setting_key: 'webhook_secret',
              setting_value: '••••••••••••••••', // Masked for security
              setting_type: 'string',
              category: 'stripe',
              description: 'Webhook Endpoint Secret',
              is_public: false,
              created_at: config.created_at,
              updated_at: config.updated_at
            });
          }
          
          setStripeConfig(transformedConfig);
        } else {
          setStripeConfig([]);
        }
      }
    } catch (error) {
      console.error('Error fetching Stripe config:', error);
    }
  };

  const fetchAffiliateCommissionSettings = async () => {
    try {
      const response = await superAdminApi.getAffiliateCommissionSettings();
      if (response.data?.success && response.data.settings) {
        setAffiliateCommissionSettings({
          level2_rate_free: String(response.data.settings.level2_rate_free ?? ''),
          level2_rate_paid: String(response.data.settings.level2_rate_paid ?? '')
        });
      }
    } catch (error) {
      console.error('Error fetching affiliate commission settings:', error);
    }
  };

  const fetchOpenAiConfiguration = async () => {
    try {
      const response = await superAdminApi.getOpenAiConfiguration();
      if (response.data?.success) {
        setOpenAiConfiguration(String(response.data.configuration?.template ?? ''));
      }
    } catch (error) {
      console.error('Error fetching Open AI configuration:', error);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      setSaving(true);
      
      // Validate password fields if changing password
      if (profileForm.new_password) {
        if (!profileForm.current_password) {
          toast({
            title: "Error",
            description: "Current password is required to change password",
            variant: "destructive"
          });
          return;
        }
        
        if (profileForm.new_password !== profileForm.confirm_password) {
          toast({
            title: "Error",
            description: "New passwords do not match",
            variant: "destructive"
          });
          return;
        }
        
        if (profileForm.new_password.length < 6) {
          toast({
            title: "Error",
            description: "New password must be at least 6 characters long",
            variant: "destructive"
          });
          return;
        }
      }

      // Prepare update data
      const updateData: any = {
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        email: profileForm.email
      };

      // Add password fields if changing password
      if (profileForm.new_password) {
        updateData.current_password = profileForm.current_password;
        updateData.new_password = profileForm.new_password;
      }

      const response = await authApi.updateProfile(updateData);
      const payload: any = response?.data;
      
      if (payload && !payload?.error) {
        setUserProfile(payload);
        // Clear password fields
        setProfileForm(prev => ({
          ...prev,
          current_password: '',
          new_password: '',
          confirm_password: ''
        }));
        
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: payload?.error || "Failed to update profile",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConfigUpdate = async (setting_key: string, newValue: string) => {
    try {
      setSaving(true);
      const response = await superAdminApi.updateStripeConfigSetting({
        setting_key,
        setting_value: newValue
      });
      
      if (response.data?.success) {
        await fetchStripeConfig();
        setIsEditDialogOpen(false);
        setEditingConfig(null);
        setNewValue('');
        
        toast({
          title: "Success",
          description: "Configuration updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update configuration",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating config:', error);
      toast({
        title: "Error",
        description: "Failed to update configuration",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAffiliateCommissionSave = async () => {
    const level2Free = Number(affiliateCommissionSettings.level2_rate_free);
    const level2Paid = Number(affiliateCommissionSettings.level2_rate_paid);
    if (!Number.isFinite(level2Free) || !Number.isFinite(level2Paid)) {
      toast({
        title: "Error",
        description: "Commission rates must be valid numbers",
        variant: "destructive"
      });
      return;
    }
    try {
      setAffiliateCommissionSaving(true);
      const response = await superAdminApi.updateAffiliateCommissionSettings({
        level2_rate_free: level2Free,
        level2_rate_paid: level2Paid
      });
      if (response.data?.success) {
        toast({
          title: "Success",
          description: "Affiliate commission settings updated",
        });
        await fetchAffiliateCommissionSettings();
      } else {
        toast({
          title: "Error",
          description: "Failed to update affiliate commission settings",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating affiliate commission settings:', error);
      toast({
        title: "Error",
        description: "Failed to update affiliate commission settings",
        variant: "destructive"
      });
    } finally {
      setAffiliateCommissionSaving(false);
    }
  };

  const handleOpenAiConfigurationSave = async () => {
    try {
      setOpenAiConfigurationSaving(true);
      const response = await superAdminApi.updateOpenAiConfiguration({
        template: openAiConfiguration,
      });
      if (response.data?.success) {
        toast({
          title: 'Success',
          description: 'Open AI configuration updated',
        });
        await fetchOpenAiConfiguration();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update Open AI configuration',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error updating Open AI configuration:', error);
      toast({
        title: 'Error',
        description: 'Failed to update Open AI configuration',
        variant: 'destructive'
      });
    } finally {
      setOpenAiConfigurationSaving(false);
    }
  };

  const insertOpenAiConfigurationVariable = (variable: typeof OPEN_AI_CONFIGURATION_VARIABLES[number]) => {
    const textarea = openAiConfigurationTextareaRef.current;
    if (!textarea) {
      setOpenAiConfiguration((prev) => `${prev}${variable}`);
      return;
    }

    const selectionStart = textarea.selectionStart ?? openAiConfiguration.length;
    const selectionEnd = textarea.selectionEnd ?? openAiConfiguration.length;
    const nextValue = `${openAiConfiguration.slice(0, selectionStart)}${variable}${openAiConfiguration.slice(selectionEnd)}`;

    setOpenAiConfiguration(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      const nextCursorPosition = selectionStart + variable.length;
      textarea.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  };

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const openEditDialog = (config: StripeConfig) => {
    setEditingConfig(config);
    setNewValue(config.setting_value);
    setIsEditDialogOpen(true);
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
        // Refresh global auth context and local profile
        await refreshProfile();
        await fetchUserProfile();
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
      
      // Refresh global auth context and local profile
      await refreshProfile();
      await fetchUserProfile();
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

  const maskSecret = (value: string) => {
    if (value.length <= 8) return '*'.repeat(value.length);
    return value.substring(0, 4) + '*'.repeat(value.length - 8) + value.substring(value.length - 4);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'profile' | 'system')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile Settings
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            System Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Picture
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="w-32 h-32">
                  <AvatarImage src={userProfile?.avatar} />
                  <AvatarFallback className="gradient-primary text-white text-2xl">
                    {userProfile?.first_name?.[0] || "S"}
                    {userProfile?.last_name?.[0] || "A"}
                  </AvatarFallback>
                </Avatar>
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
                      className="border-blue-500/30 text-blue-600 hover:bg-blue-50"
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

                <div className="text-center space-y-1">
                  <h3 className="text-xl font-semibold">
                    {userProfile?.first_name} {userProfile?.last_name}
                  </h3>
                  <p className="text-muted-foreground">Super Administrator</p>
                  <p className="text-sm text-muted-foreground">
                    Fread App
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, first_name: e.target.value }))}
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={profileForm.last_name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Enter your last name"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email address"
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-4">Change Password (Optional)</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current_password">Current Password</Label>
                    <Input
                      id="current_password"
                      type="password"
                      value={profileForm.current_password}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, current_password: e.target.value }))}
                      placeholder="Enter your current password"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new_password">New Password</Label>
                      <Input
                        id="new_password"
                        type="password"
                        value={profileForm.new_password}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, new_password: e.target.value }))}
                        placeholder="Enter new password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm_password">Confirm New Password</Label>
                      <Input
                        id="confirm_password"
                        type="password"
                        value={profileForm.confirm_password}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleProfileUpdate} disabled={saving}>
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Profile
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {userProfile && (
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Role</Label>
                    <div className="mt-1">
                      <Badge variant="secondary">{userProfile.role}</Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Status</Label>
                    <div className="mt-1">
                      <Badge variant={userProfile.status === 'active' ? 'default' : 'destructive'}>
                        {userProfile.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Account Created</Label>
                    <p className="mt-1 text-sm">
                      {new Date(userProfile.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Last Updated</Label>
                    <p className="mt-1 text-sm">
                      {new Date(userProfile.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Stripe Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stripeConfig.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Setting</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stripeConfig.map((config) => (
                      <TableRow key={config.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{config.setting_key}</div>
                            {config.description && (
                              <div className="text-sm text-gray-500">{config.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                              {config.setting_key?.toLowerCase().includes('secret') || config.setting_key?.toLowerCase().includes('key')
                                ? (showSecrets[config.setting_key] ? config.setting_value : maskSecret(config.setting_value))
                                : config.setting_value
                              }
                            </code>
                            {(config.setting_key?.toLowerCase().includes('secret') || config.setting_key?.toLowerCase().includes('key')) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleSecretVisibility(config.setting_key)}
                              >
                                {showSecrets[config.setting_key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{config.setting_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(config)}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No Stripe configuration found</p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Affiliate Commission Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="affiliate-level2-rate-free">Level 2 Commission Rate (Free) (%)</Label>
                  <Input
                    id="affiliate-level2-rate-free"
                    type="number"
                    value={affiliateCommissionSettings.level2_rate_free}
                    onChange={(e) => setAffiliateCommissionSettings(prev => ({ ...prev, level2_rate_free: e.target.value }))}
                    placeholder="2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="affiliate-level2-rate-paid">Level 2 Commission Rate (Paid) (%)</Label>
                  <Input
                    id="affiliate-level2-rate-paid"
                    type="number"
                    value={affiliateCommissionSettings.level2_rate_paid}
                    onChange={(e) => setAffiliateCommissionSettings(prev => ({ ...prev, level2_rate_paid: e.target.value }))}
                    placeholder="5"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleAffiliateCommissionSave} disabled={affiliateCommissionSaving}>
                  {affiliateCommissionSaving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Open Ai Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="text-sm font-medium text-slate-700">Variables</span>
                  {OPEN_AI_CONFIGURATION_VARIABLES.map((variable) => (
                    <Button
                      key={variable}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-full border-slate-300 bg-white px-3 text-xs"
                      onClick={() => insertOpenAiConfigurationVariable(variable)}
                    >
                      {variable}
                    </Button>
                  ))}
                </div>
                <Textarea
                  ref={openAiConfigurationTextareaRef}
                  value={openAiConfiguration}
                  onChange={(e) => setOpenAiConfiguration(e.target.value)}
                  placeholder="Type the exact Open AI configuration template here..."
                  className="min-h-[260px] rounded-none border-0 font-mono text-sm shadow-none focus-visible:ring-0"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Each variable is replaced with the live admin name, the Ask Anything message, or the selected client&apos;s latest report JSON before the request is sent to OpenAI.
              </p>
              <div className="flex justify-end">
                <Button onClick={handleOpenAiConfigurationSave} disabled={openAiConfigurationSaving}>
                  {openAiConfigurationSaving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Configuration
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Config Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Configuration</DialogTitle>
            <DialogDescription>
              Update the value for {editingConfig?.setting_key}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="config-value">Value</Label>
              <Input
                id="config-value"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Enter new value"
                type={editingConfig?.setting_key?.toLowerCase().includes('secret') || editingConfig?.setting_key?.toLowerCase().includes('key') ? 'password' : 'text'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => editingConfig && handleConfigUpdate(editingConfig.setting_key, newValue)}
              disabled={saving}
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminSettingsManagement;
