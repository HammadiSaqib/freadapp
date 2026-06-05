import { useState, useEffect, useRef, useCallback } from "react";
import type { ChangeEvent, DragEvent } from "react";
import SupportLayout from "@/components/SupportLayout";
import { supportApi, authApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Settings,
  Bell,
  Clock,
  Users,
  Mail,
  Shield,
  Database,
  Palette,
  Globe,
  MessageSquare,
  Phone,
  Calendar,
  FileText,
  Save,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Key,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Zap,
  Target,
  BarChart3,
  Timer,
  UserPlus,
  UserMinus,
  Upload,
  User as UserIcon
} from "lucide-react";

interface TeamMember {
  id?: number;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
  avatar?: string;
  permissions: string[];
  phone?: string;
  department?: string;
  hire_date?: string;
  last_active?: string;
  created_at?: string;
  updated_at?: string;
}

interface NotificationSettings {
  id?: number;
  user_id?: number;
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  new_ticket_alerts: boolean;
  ticket_updates: boolean;
  escalation_alerts: boolean;
  daily_reports: boolean;
  weekly_reports: boolean;
  created_at?: string;
  updated_at?: string;
}

interface WorkingHours {
  id?: number;
  day_of_week: string;
  is_working_day: boolean;
  start_time: string;
  end_time: string;
  created_at?: string;
  updated_at?: string;
}

interface GeneralSettings {
  id?: number;
  company_name: string;
  support_email: string;
  support_phone?: string;
  timezone: string;
  language: string;
  auto_assignment: boolean;
  ticket_auto_close_days: number;
  max_tickets_per_agent: number;
  response_time_target: number;
  resolution_time_target: number;
  created_at?: string;
  updated_at?: string;
}

export default function SupportSettings() {
  const { user, refreshAuth } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [profileData, setProfileData] = useState({
    first_name: "",
    last_name: "",
    avatar: ""
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingProfileImg, setUploadingProfileImg] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email_notifications: true,
    push_notifications: true,
    sms_notifications: false,
    new_ticket_alerts: true,
    ticket_updates: true,
    escalation_alerts: true,
    daily_reports: true,
    weekly_reports: false
  });
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([
    { day_of_week: 'monday', is_working_day: true, start_time: '09:00', end_time: '17:00' },
    { day_of_week: 'tuesday', is_working_day: true, start_time: '09:00', end_time: '17:00' },
    { day_of_week: 'wednesday', is_working_day: true, start_time: '09:00', end_time: '17:00' },
    { day_of_week: 'thursday', is_working_day: true, start_time: '09:00', end_time: '17:00' },
    { day_of_week: 'friday', is_working_day: true, start_time: '09:00', end_time: '17:00' },
    { day_of_week: 'saturday', is_working_day: false, start_time: '09:00', end_time: '17:00' },
    { day_of_week: 'sunday', is_working_day: false, start_time: '09:00', end_time: '17:00' }
  ]);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    company_name: "",
    support_email: "",
    timezone: "UTC",
    language: "en",
    auto_assignment: true,
    ticket_auto_close_days: 24,
    max_tickets_per_agent: 10,
    response_time_target: 2,
    resolution_time_target: 24
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isEditMemberDialogOpen, setIsEditMemberDialogOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    role: "agent",
    permissions: [] as string[],
    phone: "",
    department: ""
  });

  // API Functions
  const fetchAllSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await supportApi.getSettings();
      
      if (response.data.success) {
        // Convert permissions from string to array for frontend use
        const processedTeamMembers = (response.data.data.teamMembers || []).map((member: any) => ({
          ...member,
          permissions: typeof member.permissions === 'string' 
            ? member.permissions.split(',').filter(p => p.trim()) 
            : member.permissions || []
        }));
        
        setTeamMembers(processedTeamMembers);
        if (response.data.data.notifications) {
          setNotifications(response.data.data.notifications);
        }
        setWorkingHours(response.data.data.workingHours || []);
        if (response.data.data.general) {
          setGeneralSettings(response.data.data.general);
        }
      } else {
        setError('Failed to load settings');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setError('Error fetching settings: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  type TeamMemberPayload = Omit<TeamMember, 'id' | 'created_at' | 'updated_at' | 'permissions'> & {
    permissions: string;
  };

  const saveTeamMember = async (memberData: TeamMemberPayload) => {
    try {
      const response = await supportApi.updateTeamMember('new', memberData);
      
      if (response.data.success) {
        const processedMember = {
          ...response.data.data,
          permissions: typeof response.data.data.permissions === 'string' 
            ? response.data.data.permissions.split(',').filter(p => p.trim()) 
            : response.data.data.permissions || []
        };
        setTeamMembers(prev => [...prev, processedMember]);
        return true;
      } else {
        setError(response.data.error || 'Failed to add team member');
        return false;
      }
    } catch (error) {
      console.error('Error adding team member:', error);
      setError('Failed to add team member');
      return false;
    }
  };

  const updateTeamMember = async (id: number, memberData: Partial<TeamMember>) => {
    try {
      const response = await supportApi.updateTeamMember(id.toString(), memberData);
      
      if (response.data.success) {
        const processedMember = {
          ...response.data.data,
          permissions: typeof response.data.data.permissions === 'string' 
            ? response.data.data.permissions.split(',').filter(p => p.trim()) 
            : response.data.data.permissions || []
        };
        setTeamMembers(prev => prev.map(member => 
          member.id === id ? processedMember : member
        ));
        return true;
      } else {
        setError(response.data.error || 'Failed to update team member');
        return false;
      }
    } catch (error) {
      console.error('Error updating team member:', error);
      setError('Failed to update team member');
      return false;
    }
  };

  const deleteTeamMember = async (id: number) => {
    try {
      const response = await supportApi.deleteTeamMember(id.toString());
      
      if (response.data.success) {
        setTeamMembers(prev => prev.filter(member => member.id !== id));
        return true;
      } else {
        setError(response.data.error || 'Failed to delete team member');
        return false;
      }
    } catch (error) {
      console.error('Error deleting team member:', error);
      setError('Failed to delete team member');
      return false;
    }
  };

  const saveNotificationSettings = async (settingsData: Omit<NotificationSettings, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await supportApi.saveNotificationSettings(settingsData);
      
      if (response.data.success) {
        setNotifications(response.data.data);
        return true;
      } else {
        setError(response.data.error || 'Failed to save notification settings');
        return false;
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      setError('Failed to save notification settings');
      return false;
    }
  };

  const saveWorkingHours = async (hoursData: Omit<WorkingHours, 'id' | 'created_at' | 'updated_at'>[]) => {
    try {
      const response = await supportApi.saveWorkingHours({ working_hours: hoursData });
      
      if (response.data.success) {
        setWorkingHours(response.data.data);
        return true;
      } else {
        setError(response.data.error || 'Failed to save working hours');
        return false;
      }
    } catch (error) {
      console.error('Error saving working hours:', error);
      setError('Failed to save working hours');
      return false;
    }
  };

  const saveGeneralSettings = async (settingsData: Omit<GeneralSettings, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await supportApi.saveGeneralSettings(settingsData);
      
      if (response.data.success) {
        setGeneralSettings(response.data.data);
        return true;
      } else {
        setError(response.data.error || 'Failed to save general settings');
        return false;
      }
    } catch (error) {
      console.error('Error saving general settings:', error);
      setError('Failed to save general settings');
      return false;
    }
  };

  const loadProfile = useCallback(async () => {
    try {
      setProfileLoading(true);
      const response = await authApi.getProfile();
      const profile = response.data?.user;
      setProfileData({
        first_name: profile?.first_name || "",
        last_name: profile?.last_name || "",
        avatar: profile?.avatar || ""
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError('Failed to load profile information');
    } finally {
      setProfileLoading(false);
    }
  }, [setError]);

  useEffect(() => {
    fetchAllSettings();
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleProfileImageUpload = async (
    event: ChangeEvent<HTMLInputElement> | DragEvent<HTMLDivElement>
  ) => {
    let file: File | undefined;

    if ('dataTransfer' in event) {
      event.preventDefault();
      file = event.dataTransfer?.files?.[0];
    } else {
      file = event.target.files?.[0];
    }

    if (!file) return;

    setUploadingProfileImg(true);

    try {
      const response = await authApi.uploadAvatar(file);
      const newAvatarUrl = response.data?.avatarUrl || response.data?.avatar;
      if (newAvatarUrl) {
        setProfileData(prev => ({ ...prev, avatar: newAvatarUrl }));
      }
      await refreshAuth();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setError('Failed to upload avatar');
    } finally {
      setUploadingProfileImg(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      setError(null);
      const response = await authApi.updateProfile({
        first_name: profileData.first_name || undefined,
        last_name: profileData.last_name || undefined
      });

      const updatedUser = response.data?.user;
      if (updatedUser) {
        setProfileData(prev => ({
          ...prev,
          first_name: updatedUser.first_name || prev.first_name,
          last_name: updatedUser.last_name || prev.last_name,
          avatar: updatedUser.avatar || prev.avatar
        }));
      }

      await refreshAuth();
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const availablePermissions = [
    { id: "manage_tickets", label: "Manage Tickets", description: "Create, edit, and close tickets" },
    { id: "manage_users", label: "Manage Users", description: "Add, edit, and remove team members" },
    { id: "view_reports", label: "View Reports", description: "Access analytics and reports" },
    { id: "manage_settings", label: "Manage Settings", description: "Configure system settings" },
    { id: "escalate_tickets", label: "Escalate Tickets", description: "Escalate tickets to higher levels" },
    { id: "view_customer_info", label: "View Customer Info", description: "Access customer information" },
    { id: "manage_knowledge_base", label: "Manage Knowledge Base", description: "Edit articles and FAQs" },
    { id: "export_data", label: "Export Data", description: "Export reports and customer data" }
  ];

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "supervisor":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "agent":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "away":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "inactive":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Save all settings
      const results = await Promise.all([
        saveNotificationSettings(notifications),
        saveWorkingHours(workingHours),
        saveGeneralSettings(generalSettings)
      ]);
      
      if (results.every(result => result)) {
        // All saves successful
        console.log('All settings saved successfully');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMember.name || !newMember.email) return;

    const memberData: TeamMemberPayload = {
        name: newMember.name,
        email: newMember.email,
        role: newMember.role,
        status: "active" as const,
        permissions: newMember.permissions.join(','),
        phone: newMember.phone || "+1 (555) 123-4567",
        department: newMember.department || "Support"
      };
    
    const success = await saveTeamMember(memberData);
    if (success) {
      setNewMember({ name: "", email: "", role: "agent", permissions: [], phone: "", department: "" });
      setIsAddMemberDialogOpen(false);
    }
  };

  const handleEditMember = (member: TeamMember) => {
    setSelectedMember(member);
    setIsEditMemberDialogOpen(true);
  };

  const handleUpdateMember = async (updatedMember: TeamMember) => {
    if (selectedMember) {
      const memberData = {
         name: updatedMember.name,
         email: updatedMember.email,
         role: updatedMember.role,
         status: updatedMember.status,
         permissions: Array.isArray(updatedMember.permissions) 
           ? updatedMember.permissions.join(',') 
           : updatedMember.permissions,
         phone: updatedMember.phone,
         department: updatedMember.department
       } as any; // Cast to any to bypass the Partial<TeamMember> type check which expects string[] for permissions
      
      const success = await updateTeamMember(selectedMember.id, memberData);
      if (success) {
        setIsEditMemberDialogOpen(false);
        setSelectedMember(null);
      }
    }
  };

  const handleDeleteMember = async (memberId: number) => {
    const success = await deleteTeamMember(memberId);
    if (!success) {
      // Error handling is already done in deleteTeamMember function
      console.error('Failed to delete team member');
    }
  };

  const handleUpdateMemberStatus = async (memberId: number, status: string) => {
    const success = await updateTeamMember(memberId, { status: status as "active" | "inactive" });
    if (!success) {
      console.error('Failed to update member status');
    }
  };

  if (loading) {
    return (
      <SupportLayout
        title="Settings"
        description="Configure support team settings and preferences"
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading settings...</p>
          </div>
        </div>
      </SupportLayout>
    );
  }

  return (
    <SupportLayout
      title="Settings"
      description="Configure support team settings and preferences"
    >
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-8">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="hours">Working Hours</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  My Profile
                </CardTitle>
                <CardDescription>
                  Manage your personal information and avatar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {profileLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col md:flex-row gap-8">
                      {/* Avatar Upload Area */}
                      <div className="flex flex-col items-center space-y-4">
                        <Avatar className="h-32 w-32 border-4 border-muted">
                          <AvatarImage src={profileData.avatar} className="object-cover" />
                          <AvatarFallback className="text-4xl">
                            {profileData.first_name?.[0]}{profileData.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div 
                          className="border-2 border-dashed rounded-md p-6 text-center hover:bg-muted/50 transition-colors relative cursor-pointer w-64"
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={handleProfileImageUpload}
                          onClick={() => fileInputRef.current?.click()}
                        >
                           <input
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleProfileImageUpload}
                            accept="image/*"
                            disabled={uploadingProfileImg}
                          />
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            {uploadingProfileImg ? <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div> : <Upload className="h-8 w-8" />}
                            <span className="text-xs font-medium">Drag an image here or click to upload</span>
                          </div>
                        </div>
                      </div>

                      {/* Personal Info Area */}
                      <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                              id="firstName"
                              value={profileData.first_name}
                              onChange={(e) => setProfileData(prev => ({ ...prev, first_name: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                              id="lastName"
                              value={profileData.last_name}
                              onChange={(e) => setProfileData(prev => ({ ...prev, last_name: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input value={user?.email || ''} disabled className="bg-muted" />
                            <p className="text-xs text-muted-foreground">Email address cannot be changed</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button 
                        onClick={handleSaveProfile} 
                        disabled={savingProfile || uploadingProfileImg}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {savingProfile ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Profile
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  General Settings
                </CardTitle>
                <CardDescription>
                  Configure basic support system settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={generalSettings.company_name}
                  onChange={(e) => setGeneralSettings(prev => ({ ...prev, company_name: e.target.value }))}
                />
                    </div>
                    <div>
                      <Label htmlFor="supportEmail">Support Email</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={generalSettings.support_email}
                  onChange={(e) => setGeneralSettings(prev => ({ ...prev, support_email: e.target.value }))}
                />
                    </div>
                    <div>
                      <Label htmlFor="supportPhone">Support Phone</Label>
                      <Input
                        id="supportPhone"
                        value={generalSettings.support_phone || ''}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, support_phone: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select
                        value={generalSettings.timezone}
                        onValueChange={(value) => setGeneralSettings(prev => ({ ...prev, timezone: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                          <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                          <SelectItem value="UTC">UTC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="language">Default Language</Label>
                      <Select
                        value={generalSettings.language}
                        onValueChange={(value) => setGeneralSettings(prev => ({ ...prev, language: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="ticketAutoClose">Auto-close tickets after (days)</Label>
                <Input
                  id="ticketAutoClose"
                  type="number"
                  value={generalSettings.ticket_auto_close_days}
                  onChange={(e) => setGeneralSettings(prev => ({ ...prev, ticket_auto_close_days: parseInt(e.target.value) }))}
                />
                    </div>
                    <div>
                      <Label htmlFor="maxTicketsPerAgent">Max tickets per agent</Label>
                <Input
                  id="maxTicketsPerAgent"
                  type="number"
                  value={generalSettings.max_tickets_per_agent}
                  onChange={(e) => setGeneralSettings(prev => ({ ...prev, max_tickets_per_agent: parseInt(e.target.value) }))}
                />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                id="autoAssignment"
                checked={generalSettings.auto_assignment}
                onCheckedChange={(checked) => setGeneralSettings(prev => ({ ...prev, auto_assignment: checked }))}
              />
              <Label htmlFor="autoAssignment">Enable automatic ticket assignment</Label>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    SLA Targets
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="responseTimeTarget">First Response Time (hours)</Label>
                <Input
                  id="responseTimeTarget"
                  type="number"
                  value={generalSettings.response_time_target}
                  onChange={(e) => setGeneralSettings(prev => ({ ...prev, response_time_target: parseInt(e.target.value) }))}
                />
                    </div>
                    <div>
                      <Label htmlFor="resolutionTimeTarget">Resolution Time (hours)</Label>
                <Input
                  id="resolutionTimeTarget"
                  type="number"
                  value={generalSettings.resolution_time_target}
                  onChange={(e) => setGeneralSettings(prev => ({ ...prev, resolution_time_target: parseInt(e.target.value) }))}
                />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                  onClick={handleSaveSettings} 
                  disabled={saving}
                  className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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

          {/* Team Management */}
          <TabsContent value="team" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Team Management
                    </CardTitle>
                    <CardDescription>
                      Manage support team members and their permissions
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => setIsAddMemberDialogOpen(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>
                            {member.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-semibold">{member.name}</h4>
                            <Badge className={getRoleColor(member.role)}>
                              {member.role}
                            </Badge>
                            <Badge className={getStatusColor(member.status)}>
                              {member.status}
                            </Badge>
                          </div>
                          <p className="text-gray-600 text-sm">{member.email}</p>
                          <p className="text-gray-500 text-xs">
                            Last active: {member.last_active ? new Date(member.last_active).toLocaleString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={member.status}
                          onValueChange={(value) => handleUpdateMemberStatus(member.id, value as any)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="away">Away</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditMember(member)}
                          className="text-purple-600 border-purple-200 hover:bg-purple-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteMember(member.id)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Settings
                </CardTitle>
                <CardDescription>
                  Configure how and when you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Notification Channels</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Email Notifications</Label>
                        <p className="text-sm text-gray-500">Receive notifications via email</p>
                      </div>
                      <Switch
                        checked={notifications.email_notifications}
                        onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, email_notifications: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Push Notifications</Label>
                        <p className="text-sm text-gray-500">Receive browser push notifications</p>
                      </div>
                      <Switch
                        checked={notifications.push_notifications}
                        onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, push_notifications: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">SMS Notifications</Label>
                        <p className="text-sm text-gray-500">Receive notifications via SMS</p>
                      </div>
                      <Switch
                        checked={notifications.sms_notifications}
                        onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, sms_notifications: checked }))}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Alert Types</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">New Ticket Alerts</Label>
                        <p className="text-sm text-gray-500">Get notified when new tickets are created</p>
                      </div>
                      <Switch
                        checked={notifications.new_ticket_alerts}
                        onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, new_ticket_alerts: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Escalation Alerts</Label>
                        <p className="text-sm text-gray-500">Get notified when tickets are escalated</p>
                      </div>
                      <Switch
                        checked={notifications.escalation_alerts}
                        onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, escalation_alerts: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Customer Response Alerts</Label>
                        <p className="text-sm text-gray-500">Get notified when customers respond</p>
                      </div>
                      <Switch
                        checked={notifications.ticket_updates}
                        onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, ticket_updates: checked }))}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Reports</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Daily Reports</Label>
                        <p className="text-sm text-gray-500">Receive daily performance summaries</p>
                      </div>
                      <Switch
                        checked={notifications.daily_reports}
                        onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, daily_reports: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Weekly Reports</Label>
                        <p className="text-sm text-gray-500">Receive weekly analytics reports</p>
                      </div>
                      <Switch
                        checked={notifications.weekly_reports}
                        onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, weekly_reports: checked }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={handleSaveSettings} 
                    disabled={saving}
                    className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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

          {/* Working Hours */}
          <TabsContent value="hours" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Working Hours
                </CardTitle>
                <CardDescription>
                  Set your support team's working hours and availability
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {workingHours.map((hours) => (
                  <div key={hours.day_of_week} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Switch
                        checked={hours.is_working_day}
                        onCheckedChange={(checked) => 
                          setWorkingHours(prev => prev.map(h => 
                            h.day_of_week === hours.day_of_week 
                              ? { ...h, is_working_day: checked }
                              : h
                          ))
                        }
                      />
                      <Label className="text-base capitalize font-medium w-20">{hours.day_of_week}</Label>
                    </div>
                    {hours.is_working_day && (
                      <div className="flex items-center space-x-2">
                        <Input
                          type="time"
                          value={hours.start_time}
                          onChange={(e) => 
                            setWorkingHours(prev => prev.map(h => 
                              h.day_of_week === hours.day_of_week 
                                ? { ...h, start_time: e.target.value }
                                : h
                            ))
                          }
                          className="w-32"
                        />
                        <span className="text-gray-500">to</span>
                        <Input
                          type="time"
                          value={hours.end_time}
                          onChange={(e) => 
                            setWorkingHours(prev => prev.map(h => 
                              h.day_of_week === hours.day_of_week 
                                ? { ...h, end_time: e.target.value }
                                : h
                            ))
                          }
                          className="w-32"
                        />
                      </div>
                    )}
                  </div>
                ))}

                <div className="flex justify-end">
                  <Button 
                  onClick={handleSaveSettings} 
                  disabled={saving}
                  className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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

          {/* Integrations */}
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Integrations
                </CardTitle>
                <CardDescription>
                  Connect with external services and tools
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Email Integration
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span>Status</span>
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Connected
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Provider</span>
                          <span className="text-sm text-gray-600">Gmail SMTP</span>
                        </div>
                        <Button variant="outline" size="sm" className="w-full">
                          Configure
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Live Chat
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span>Status</span>
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Widget</span>
                          <span className="text-sm text-gray-600">Embedded</span>
                        </div>
                        <Button variant="outline" size="sm" className="w-full">
                          Customize
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Phone className="h-5 w-5" />
                        Phone System
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span>Status</span>
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Provider</span>
                          <span className="text-sm text-gray-600">Not configured</span>
                        </div>
                        <Button variant="outline" size="sm" className="w-full">
                          Setup
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Analytics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span>Status</span>
                          <Badge className="bg-gray-100 text-gray-800">
                            <XCircle className="h-3 w-3 mr-1" />
                            Disabled
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Provider</span>
                          <span className="text-sm text-gray-600">Google Analytics</span>
                        </div>
                        <Button variant="outline" size="sm" className="w-full">
                          Enable
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Member Dialog */}
        <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>
                Add a new member to your support team
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="memberName">Name</Label>
                <Input
                  id="memberName"
                  value={newMember.name}
                  onChange={(e) => setNewMember(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter member name"
                />
              </div>
              <div>
                <Label htmlFor="memberEmail">Email</Label>
                <Input
                  id="memberEmail"
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <Label htmlFor="memberRole">Role</Label>
                <Select
                  value={newMember.role}
                  onValueChange={(value) => setNewMember(prev => ({ ...prev, role: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Permissions</Label>
                <div className="space-y-2 mt-2">
                  {availablePermissions.map((permission) => (
                    <div key={permission.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={permission.id}
                        checked={newMember.permissions.includes(permission.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewMember(prev => ({
                              ...prev,
                              permissions: [...prev.permissions, permission.id]
                            }));
                          } else {
                            setNewMember(prev => ({
                              ...prev,
                              permissions: prev.permissions.filter(p => p !== permission.id)
                            }));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <div>
                        <Label htmlFor={permission.id} className="text-sm font-medium">
                          {permission.label}
                        </Label>
                        <p className="text-xs text-gray-500">{permission.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddMemberDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddMember}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Add Member
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SupportLayout>
  );
}