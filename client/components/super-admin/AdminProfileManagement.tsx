import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
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
import { Checkbox } from '../ui/checkbox';
import { superAdminApi } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import { stageCrossSubdomainAuthTransfer } from '../../lib/authStorage';
import { buildAliasUrl } from '../../lib/hostRouting';
import { Plus, Edit, Trash2, Search, Eye, EyeOff, User, Shield, Settings, LogIn } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

interface AdminProfile {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  permissions: any;
  status: 'active' | 'inactive' | 'suspended';
  last_login: string;
  created_at: string;
  updated_at: string;
  access_level: string;
  department: string;
  is_active: number;
  title: string;
  plan_name?: string;
  plan_type?: string;
  plan_price?: number;
  plan_monthly_price?: number;
  clients_count?: number;
  next_billing_date?: string;
}

interface AdminFormData {
  name: string;
  email: string;
  role: string;
  permissions: string[];
  status: 'active' | 'inactive' | 'suspended';
  accessLevel: 'full' | 'limited' | 'read-only';
  password?: string;
}

const ROLES = [
  { value: 'super_admin', label: 'Super Admin', icon: Shield },
  { value: 'admin', label: 'Admin', icon: User },
  { value: 'Manager', label: 'Manager', icon: Settings },
  { value: 'Support Agent', label: 'Support Agent', icon: User },
  { value: 'Analyst', label: 'Analyst', icon: User },
  { value: 'Moderator', label: 'Moderator', icon: User }
];

const ACCESS_LEVELS = [
  { value: 'full', label: 'Full Access', description: 'Complete system access', icon: Shield },
  { value: 'limited', label: 'Limited Access', description: 'Restricted permissions', icon: Settings },
  { value: 'read-only', label: 'Read Only', description: 'View-only access', icon: Eye }
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'inactive', label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
  { value: 'suspended', label: 'Suspended', color: 'bg-red-100 text-red-800' }
];

  const PERMISSIONS = [
    { id: 'user_management', label: 'User Management', category: 'Users' },
    { id: 'subscription_management', label: 'Subscription Management', category: 'Billing' },
    { id: 'plan_management', label: 'Plan Management', category: 'Billing' },
    { id: 'subscription_exempt', label: 'No subscription required (unlimited clients)', category: 'Billing' },
    { id: 'analytics_view', label: 'Analytics View', category: 'Reports' },
    { id: 'system_settings', label: 'System Settings', category: 'System' },
    { id: 'admin_management', label: 'Admin Management', category: 'Admin' },
    { id: 'score_machine_elite', label: 'Allow Score Machine Elite', category: 'Admin' },
    { id: 'unlimited_ai_tokens', label: 'Unlimited AI Tokens (no AI-Matched limit)', category: 'Admin' },
    { id: 'unlimited_openai_prompts', label: 'Unlimited Open AI Prompt', category: 'Admin' },
    { id: 'billing_management', label: 'Billing Management', category: 'Billing' },
    { id: 'support_management', label: 'Support Management', category: 'Support' }
  ];

const normalizeAccessLevel = (accessLevel?: string): 'full' | 'limited' | 'read-only' => {
  switch (accessLevel) {
    case 'full':
    case 'admin':
    case 'super_admin':
      return 'full';
    case 'read-only':
    case 'read_only':
    case 'readonly':
    case 'support':
      return 'read-only';
    case 'limited':
    case 'manager':
    default:
      return 'limited';
  }
};

const normalizePermissions = (permissions: unknown): string[] => {
  if (Array.isArray(permissions)) {
    return permissions.filter((permission): permission is string => typeof permission === 'string');
  }

  if (typeof permissions === 'string') {
    try {
      const parsed = JSON.parse(permissions);
      if (Array.isArray(parsed)) {
        return parsed.filter((permission): permission is string => typeof permission === 'string');
      }
    } catch {
      return [];
    }
  }

  return [];
};

const formatAdminDate = (dateString?: string | null, fallback = '—') => {
  if (!dateString) {
    return fallback;
  }

  return new Date(dateString).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
};

const getAccessLevelLabel = (accessLevel?: string): string => {
  const normalizedAccessLevel = normalizeAccessLevel(accessLevel);
  return ACCESS_LEVELS.find((level) => level.value === normalizedAccessLevel)?.label || 'Limited Access';
};

const normalizeAdminProfile = (admin: AdminProfile): AdminProfile => ({
  ...admin,
  access_level: admin.access_level || admin.role,
  permissions: normalizePermissions(admin.permissions)
});

// AdminForm component moved outside to prevent re-renders
const AdminForm = React.memo(({ 
  formData, 
  setFormData, 
  showPassword, 
  setShowPassword, 
  handlePermissionChange, 
  isEdit = false 
}: {
  formData: AdminFormData;
  setFormData: React.Dispatch<React.SetStateAction<AdminFormData>>;
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  handlePermissionChange: (permissionId: string, checked: boolean) => void;
  isEdit?: boolean;
}) => (
  <div className="space-y-6">
    {/* Basic Information */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <User className="h-5 w-5" />
        Basic Information
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">
            Full Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter full name"
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email Address <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="admin@example.com"
            className="w-full"
          />
        </div>
      </div>
    </div>

    {/* Role & Access */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Shield className="h-5 w-5" />
        Role & Access
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="role" className="text-sm font-medium">
            Role <span className="text-red-500">*</span>
          </Label>
          <Select value={formData.role} onValueChange={(value) => 
            setFormData(prev => ({ ...prev, role: value }))
          }>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  <div className="flex items-center gap-2">
                    <role.icon className="h-4 w-4" />
                    {role.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="accessLevel" className="text-sm font-medium">
            Access Level <span className="text-red-500">*</span>
          </Label>
          <Select value={formData.accessLevel} onValueChange={(value: 'full' | 'limited' | 'read-only') => 
            setFormData(prev => ({ ...prev, accessLevel: value }))
          }>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select access level" />
            </SelectTrigger>
            <SelectContent>
              {ACCESS_LEVELS.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  <div className="flex items-center gap-2">
                    <level.icon className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">{level.label}</span>
                      <span className="text-xs text-gray-500">{level.description}</span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>

    {/* Security & Status */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Settings className="h-5 w-5" />
        Security & Status
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status" className="text-sm font-medium">
            Status <span className="text-red-500">*</span>
          </Label>
          <Select value={formData.status} onValueChange={(value: 'active' | 'inactive' | 'suspended') => 
            setFormData(prev => ({ ...prev, status: value }))
          }>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  <Badge className={status.color}>
                    {status.label}
                  </Badge>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            Password {!isEdit && <span className="text-red-500">*</span>}
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={formData.password || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder={isEdit ? "Leave blank to keep current password" : "Enter password"}
              className="w-full pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>

    {/* Permissions */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Shield className="h-5 w-5" />
        Permissions
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(
          PERMISSIONS.reduce((acc, permission) => {
            if (!acc[permission.category]) acc[permission.category] = [];
            acc[permission.category].push(permission);
            return acc;
          }, {} as Record<string, typeof PERMISSIONS>)
        ).map(([category, permissions]) => (
          <div key={category} className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700">{category}</h4>
            <div className="space-y-2">
              {permissions.map((permission) => (
                <div key={permission.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={permission.id}
                    checked={formData.permissions.includes(permission.id)}
                    onCheckedChange={(checked) => handlePermissionChange(permission.id, checked as boolean)}
                  />
                  <Label htmlFor={permission.id} className="text-sm font-normal cursor-pointer">
                    {permission.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
));

const AdminProfileManagement: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [adminProfiles, setAdminProfiles] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminProfile | null>(null);
  const [formData, setFormData] = useState<AdminFormData>({
    name: '',
    email: '',
    role: ROLES[0].value,
    permissions: [],
    status: 'active',
    accessLevel: 'limited',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const itemsPerPage = 10;

  const fetchAdminProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const apiParams = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
        is_active: statusFilter !== 'all' ? (statusFilter === 'active' ? 'true' : 'false') : undefined,
        access_level: roleFilter !== 'all' ? roleFilter : undefined
      };
      console.log('🔍 Frontend calling API with params:', apiParams);
      console.log('🔍 Current statusFilter:', statusFilter, 'roleFilter:', roleFilter);
      const response = await superAdminApi.getAdminProfiles(apiParams);
      
      // Handle different response structures
      if (response.data?.success && response.data?.data) {
        const admins = Array.isArray(response.data.data)
          ? response.data.data.map((admin: AdminProfile) => normalizeAdminProfile(admin))
          : [];
        setAdminProfiles(admins);
        setTotalPages(response.data.pagination?.pages || 1);
      } else if (Array.isArray(response.data)) {
        const admins = response.data.map((admin: AdminProfile) => normalizeAdminProfile(admin));
        setAdminProfiles(admins);
        setTotalPages(Math.max(1, Math.ceil(admins.length / itemsPerPage)));
      } else {
        setAdminProfiles([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching admin profiles:', error);
      toast({
        title: "Error",
        description: "Failed to load admin profiles",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchTerm, statusFilter, roleFilter]);

  useEffect(() => {
    console.log('🔄 useEffect triggered - fetching admin profiles');
    console.log('🔄 Dependencies:', { currentPage, searchTerm, statusFilter, roleFilter });
    fetchAdminProfiles();
  }, [fetchAdminProfiles]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1); // Reset to first page when searching
      } else {
        fetchAdminProfiles();
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    if (!formData.name.trim()) errors.push('Name is required');
    if (!formData.email.trim()) errors.push('Email is required');
    if (!formData.role) errors.push('Role is required');
    if (!formData.accessLevel) errors.push('Access level is required');
    if (!formData.status) errors.push('Status is required');
    if (!selectedAdmin && !formData.password) errors.push('Password is required');
    if (formData.password && formData.password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      errors.push('Please enter a valid email address');
    }
    
    return errors;
  };

  const handleSubmit = async () => {
    console.log('🔵 Frontend - handleSubmit called');
    console.log('🔵 Frontend - formData:', JSON.stringify(formData, null, 2));
    
    const errors = validateForm();
    if (errors.length > 0) {
      console.log('🔴 Frontend - Validation errors:', errors);
      toast({
        title: "Validation Error",
        description: errors.join(', '),
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const adminData = {
        ...formData,
        accessLevel: normalizeAccessLevel(formData.accessLevel),
        permissions: normalizePermissions(formData.permissions),
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase()
      };
      console.log('🔵 Frontend - adminData to send:', JSON.stringify(adminData, null, 2));

      if (selectedAdmin) {
        if (!adminData.password) {
          delete adminData.password;
        }
        console.log('🔵 Frontend - Calling updateAdminProfile with ID:', selectedAdmin.id);
        const response = await superAdminApi.updateAdminProfile(selectedAdmin.id, adminData);
        console.log('🟢 Frontend - Update response:', response);
        const updatedAdmin = response.data?.data ? normalizeAdminProfile(response.data.data as AdminProfile) : null;
        if (updatedAdmin) {
          setAdminProfiles((prev) => prev.map((admin) => (
            admin.id === updatedAdmin.id ? updatedAdmin : admin
          )));
        }
        await fetchAdminProfiles();
        toast({
          title: "Success",
          description: "Admin profile updated successfully"
        });
        setIsEditDialogOpen(false);
      } else {
        console.log('🔵 Frontend - Calling createAdminProfile');
        const response = await superAdminApi.createAdminProfile(adminData);
        console.log('🟢 Frontend - Create response:', response);
        await fetchAdminProfiles();
        toast({
          title: "Success",
          description: "Admin profile created successfully"
        });
        setIsCreateDialogOpen(false);
      }
      
      resetForm();
    } catch (error) {
      console.error('🔴 Frontend - Error saving admin profile:', error);
      toast({
        title: "Error",
        description: `Failed to ${selectedAdmin ? 'update' : 'create'} admin profile`,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (adminId: number) => {
    if (!confirm('Are you sure you want to delete this admin profile?')) return;
    
    try {
      await superAdminApi.deleteAdminProfile(adminId);
      toast({
        title: "Success",
        description: "Admin profile deleted successfully"
      });
      fetchAdminProfiles();
    } catch (error) {
      console.error('Error deleting admin profile:', error);
      toast({
        title: "Error",
        description: "Failed to delete admin profile",
        variant: "destructive"
      });
    }
  };

  const handleLoginAsAdmin = async (admin: AdminProfile) => {
    try {
      const response = await superAdminApi.loginAsAdmin(admin.id);
      if (response.data?.token) {
        const targetUrl = buildAliasUrl('admin', '/session-transfer');
        const targetUser = response.data.user || admin;

        const encoded = stageCrossSubdomainAuthTransfer(targetUrl, {
          auth: {
            auth_token: response.data.token,
            token: response.data.token,
            refresh_token: response.data.refresh_token,
            userRole: targetUser.role || 'admin',
            userId: String(targetUser.id),
            userName: `${targetUser.first_name || admin.first_name} ${targetUser.last_name || admin.last_name}`.trim(),
          },
          returnContext: {
            label: 'Back To Super Admin Dashboard',
            targetUrl: buildAliasUrl('super-admin', '/admins'),
          },
          transferRedirectPath: '/dashboard',
        });

        const finalUrl = encoded
          ? `${targetUrl}#${"__sm_auth_transfer__:"}${encoded}`
          : targetUrl;

        window.location.href = finalUrl;
        toast({
          title: "Success",
          description: `Logged in as ${admin.first_name} ${admin.last_name}`
        });
      }
    } catch (error: any) {
      console.error('Error logging in as admin:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to login as admin",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: ROLES[0].value,
      permissions: [],
      status: 'active',
      accessLevel: 'limited',
      password: ''
    });
    setSelectedAdmin(null);
    setShowPassword(false);
  };

  const openEditDialog = (admin: AdminProfile) => {
    const normalizedAdmin = normalizeAdminProfile(admin);
    setSelectedAdmin(normalizedAdmin);
    setFormData({
      name: `${normalizedAdmin.first_name} ${normalizedAdmin.last_name}`,
      email: normalizedAdmin.email,
      role: normalizedAdmin.role,
      accessLevel: normalizeAccessLevel(normalizedAdmin.access_level),
      status: normalizedAdmin.status,
      permissions: normalizePermissions(normalizedAdmin.permissions),
      password: ''
    });
    setIsEditDialogOpen(true);
  };

  const handlePermissionChange = useCallback((permissionId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: checked
        ? Array.from(new Set([...prev.permissions, permissionId]))
        : prev.permissions.filter(p => p !== permissionId)
    }));
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig = STATUS_OPTIONS.find(s => s.value === status);
    return statusConfig ? statusConfig.color : 'bg-gray-100 text-gray-800';
  };



  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Management</h1>
          <p className="text-gray-600 mt-1">Manage administrator accounts and permissions</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add New Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">Create New Admin Profile</DialogTitle>
              <DialogDescription>
                Create a new administrator account with specific roles and permissions.
              </DialogDescription>
            </DialogHeader>
            <AdminForm 
              formData={formData}
              setFormData={setFormData}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              handlePermissionChange={handlePermissionChange}
              isEdit={false}
            />
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? 'Creating...' : 'Create Admin'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUS_OPTIONS.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {ROLES.map(role => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Admin Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Administrator Accounts ({adminProfiles?.length || 0})</span>
            {loading && <div className="text-sm text-gray-500">Loading...</div>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading admin profiles...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Administrator</TableHead>
                      <TableHead className="font-semibold">Phone</TableHead>
                      <TableHead className="font-semibold">Role</TableHead>
                      <TableHead className="font-semibold">Plan</TableHead>
                      <TableHead className="font-semibold">Clients</TableHead>
                      <TableHead className="font-semibold">Plan Price</TableHead>
                      <TableHead className="font-semibold">Next Billing</TableHead>
                      <TableHead className="font-semibold">Access Level</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Last Login</TableHead>
                      <TableHead className="font-semibold">Permissions</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminProfiles?.map((admin) => (
                      <TableRow key={admin.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium">{admin.first_name} {admin.last_name}</div>
                              <div className="text-sm text-gray-500">{admin.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {admin.phone || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-medium">
                            {admin.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{admin.plan_name || '—'}</span>
                            <span className="text-xs text-gray-500">{admin.plan_type || ''}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {typeof admin.clients_count === 'number' ? admin.clients_count : 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {admin.plan_price !== undefined && admin.plan_price !== null
                            ? `$${Number(admin.plan_price).toFixed(2)}`
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {formatAdminDate(admin.next_billing_date)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {getAccessLevelLabel(admin.access_level)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(admin.status)}>
                            {admin.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatAdminDate(admin.last_login, 'Never')}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(admin.permissions) ? (
                              admin.permissions.slice(0, 2).map((permission) => (
                                <Badge key={permission} variant="outline" className="text-xs">
                                  {PERMISSIONS.find(p => p.id === permission)?.label || permission}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="outline" className="text-xs text-gray-500">
                                No permissions
                              </Badge>
                            )}
                            {Array.isArray(admin.permissions) && admin.permissions.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{admin.permissions.length - 2} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/super-admin/admins/${admin.id}`)}
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(admin)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLoginAsAdmin(admin)}
                              className="hover:bg-green-50 text-green-600 hover:text-green-700"
                              title="Login as this admin"
                            >
                              <LogIn className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(admin.id)}
                              className="hover:bg-red-50 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-500">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, adminProfiles.length)} of {adminProfiles.length} results
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Admin Profile</DialogTitle>
            <DialogDescription>
              Update administrator account information and permissions.
            </DialogDescription>
          </DialogHeader>
          <AdminForm 
            formData={formData}
            setFormData={setFormData}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            handlePermissionChange={handlePermissionChange}
            isEdit={true}
          />
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Updating...' : 'Update Admin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProfileManagement;
