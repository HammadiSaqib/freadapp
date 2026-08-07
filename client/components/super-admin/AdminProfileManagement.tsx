import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Checkbox } from '../ui/checkbox';
import { Switch } from '../ui/switch';
import { superAdminApi } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import { stageCrossSubdomainAuthTransfer } from '../../lib/authStorage';
import { buildAliasUrl } from '../../lib/hostRouting';
import { Plus, Edit, Trash2, Search, Eye, EyeOff, User, Shield, Settings, LogIn, Filter, X, ChevronDown } from 'lucide-react';
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
  plan_status?: string;
  clients_count?: number;
  next_billing_date?: string;
  referred_by_affiliate_id?: number | null;
  referred_by_affiliate_name?: string | null;
  referred_by_affiliate_email?: string | null;
  send_dispute_letter_email?: boolean | number;
  send_inactivity_email?: boolean | number;
  send_report_pull_reminder_email?: boolean | number;
  allow_free_client_enrollment?: boolean | number;
}

interface AffiliateOption {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  status?: string;
}

interface AdminFormData {
  name: string;
  email: string;
  role: string;
  permissions: string[];
  status: 'active' | 'inactive' | 'suspended';
  accessLevel: 'full' | 'limited' | 'read-only';
  password?: string;
  sendDisputeLetterEmail: boolean;
  sendInactivityEmail: boolean;
  sendReportPullReminderEmail: boolean;
  allowFreeClientEnrollment: boolean;
}

interface PlanOption {
  id: string;
  name: string;
}

interface CustomAdminFilter {
  id: string;
  name: string;
  description?: string;
  planNames: string[];
  permissionIds: string[];
  planStatuses: string[];
  joinStartDate: string;
  joinEndDate: string;
  newJoinsFirst: boolean;
  unpaidOnly: boolean;
  showInFront: boolean;
  createdAt: string;
}

interface CustomFilterDraft {
  name: string;
  description: string;
  planNames: string[];
  permissionIds: string[];
  planStatuses: string[];
  joinStartDate: string;
  joinEndDate: string;
  newJoinsFirst: boolean;
  unpaidOnly: boolean;
  showInFront: boolean;
}

interface SupportUserOption {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  status?: string;
}

interface SupportAdminFilterAccessSetting {
  customFilterAccess: boolean;
  frontOnly: boolean;
  allowedFilterIds: string[];
  defaultFilterIds: string[];
  supportStartFollowUp: boolean;
  hardcoreFilterIds: string[];
  hardcoreAdminIds: number[];
}

interface AdminProfileManagementProps {
  readOnly?: boolean;
  chooseFiltersOnly?: boolean;
  compact?: boolean;
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

const PLAN_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'unpaid', label: 'Unpaid', description: 'Never Paid' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'expired', label: 'Expired' },
];

const ADMIN_CUSTOM_FILTERS_STORAGE_KEY = 'scoremachine:super-admin:custom-admin-filters';
const SUPPORT_FOLLOW_UP_DONE_STORAGE_KEY = 'scoremachine:support-admin-follow-up-done';

const createEmptyFilterDraft = (): CustomFilterDraft => ({
  name: '',
  description: '',
  planNames: [],
  permissionIds: [],
  planStatuses: [],
  joinStartDate: '',
  joinEndDate: '',
  newJoinsFirst: false,
  unpaidOnly: false,
  showInFront: false,
});

const createDefaultSupportFilterAccess = (): SupportAdminFilterAccessSetting => ({
  customFilterAccess: true,
  frontOnly: false,
  allowedFilterIds: [],
  defaultFilterIds: [],
  supportStartFollowUp: false,
  hardcoreFilterIds: [],
  hardcoreAdminIds: [],
});

const SCORE_MACHINE_ELITE_PERMISSION = 'score_machine_elite';
const SCORE_MACHINE_BASIC_PERMISSION = 'score_machine_basic';
const SCORE_MACHINE_PORTAL_PERMISSION_IDS = [
  SCORE_MACHINE_ELITE_PERMISSION,
  SCORE_MACHINE_BASIC_PERMISSION,
] as const;

  const PERMISSIONS = [
    { id: 'user_management', label: 'User Management', category: 'Users' },
    { id: 'subscription_management', label: 'Subscription Management', category: 'Billing' },
    { id: 'plan_management', label: 'Plan Management', category: 'Billing' },
    { id: 'subscription_exempt', label: 'No subscription required (unlimited clients)', category: 'Billing' },
    { id: 'analytics_view', label: 'Analytics View', category: 'Reports' },
    { id: 'system_settings', label: 'System Settings', category: 'System' },
    { id: 'admin_management', label: 'Admin Management', category: 'Admin' },
    { id: 'score_machine_elite', label: 'Allow Score Machine Elite', category: 'Admin' },
    { id: 'score_machine_basic', label: 'Allow Basic Only', category: 'Admin' },
    { id: 'unlimited_ai_tokens', label: 'Unlimited AI Tokens (no AI-Matched limit)', category: 'Admin' },
    { id: 'unlimited_openai_prompts', label: 'Unlimited Open AI Prompt', category: 'Admin' },
    { id: 'billing_management', label: 'Billing Management', category: 'Billing' },
    { id: 'support_management', label: 'Support Management', category: 'Support' }
  ];

const normalizePortalPermissions = (permissions: string[]): string[] => {
  const uniquePermissions = Array.from(new Set(permissions));
  const hasElite = uniquePermissions.includes(SCORE_MACHINE_ELITE_PERMISSION);
  const hasBasic = uniquePermissions.includes(SCORE_MACHINE_BASIC_PERMISSION);

  if (hasElite && hasBasic) {
    return uniquePermissions.filter((permission) => permission !== SCORE_MACHINE_BASIC_PERMISSION);
  }

  return uniquePermissions;
};

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
    return normalizePortalPermissions(
      permissions.filter((permission): permission is string => typeof permission === 'string')
    );
  }

  if (typeof permissions === 'string') {
    try {
      const parsed = JSON.parse(permissions);
      if (Array.isArray(parsed)) {
        return normalizePortalPermissions(
          parsed.filter((permission): permission is string => typeof permission === 'string')
        );
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

const parseAdminDateTimestamp = (dateString?: string | null): number => {
  if (!dateString) {
    return 0;
  }

  const rawDate = String(dateString).trim();
  if (!rawDate) {
    return 0;
  }

  const directTimestamp = new Date(rawDate).getTime();
  if (!Number.isNaN(directTimestamp)) {
    return directTimestamp;
  }

  const slashDateMatch = rawDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashDateMatch) {
    const [, month, day, year] = slashDateMatch;
    const parsedTimestamp = new Date(Number(year), Number(month) - 1, Number(day)).getTime();
    return Number.isNaN(parsedTimestamp) ? 0 : parsedTimestamp;
  }

  return 0;
};

const formatAdminJoinDate = (dateString?: string | null): string => {
  const timestamp = parseAdminDateTimestamp(dateString);
  if (!timestamp) {
    return '—';
  }

  return new Date(timestamp).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
};

const parseDateInputStartTimestamp = (dateString?: string): number | null => {
  if (!dateString) {
    return null;
  }

  const timestamp = new Date(`${dateString}T00:00:00`).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

const parseDateInputEndTimestamp = (dateString?: string): number | null => {
  if (!dateString) {
    return null;
  }

  const timestamp = new Date(`${dateString}T23:59:59.999`).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

const getAccessLevelLabel = (accessLevel?: string): string => {
  const normalizedAccessLevel = normalizeAccessLevel(accessLevel);
  return ACCESS_LEVELS.find((level) => level.value === normalizedAccessLevel)?.label || 'Limited Access';
};

const getAffiliateDisplayName = (affiliate: Pick<AffiliateOption, 'first_name' | 'last_name' | 'email'>): string => {
  const fullName = `${affiliate.first_name || ''} ${affiliate.last_name || ''}`.trim();
  return fullName || affiliate.email;
};

const getAdminReferrerLabel = (admin: Pick<AdminProfile, 'referred_by_affiliate_name' | 'referred_by_affiliate_email'>): string | null => {
  const label = admin.referred_by_affiliate_name?.trim() || admin.referred_by_affiliate_email?.trim();
  return label || null;
};

const normalizeAdminProfile = (admin: AdminProfile): AdminProfile => ({
  ...admin,
  access_level: admin.access_level || admin.role,
  permissions: normalizePermissions(admin.permissions),
  send_dispute_letter_email: admin.send_dispute_letter_email !== false
    && Number(admin.send_dispute_letter_email ?? 1) !== 0,
  send_inactivity_email: admin.send_inactivity_email !== false
    && Number(admin.send_inactivity_email ?? 1) !== 0,
  send_report_pull_reminder_email: admin.send_report_pull_reminder_email !== false
    && Number(admin.send_report_pull_reminder_email ?? 1) !== 0,
  allow_free_client_enrollment: admin.allow_free_client_enrollment !== false
    && Number(admin.allow_free_client_enrollment ?? 0) !== 0
});

const normalizePlanStatus = (status?: string | null): string => {
  const normalizedStatus = String(status || '').trim().toLowerCase();
  if (normalizedStatus === 'cancelled') {
    return 'canceled';
  }

  return normalizedStatus;
};

const getAdminDisplayStatus = (admin: AdminProfile): string => {
  const accountStatus = String(admin.status || '').trim().toLowerCase();
  const permissions = normalizePermissions(admin.permissions);
  const isSubscriptionExempt =
    (admin.allow_free_client_enrollment !== false && Number(admin.allow_free_client_enrollment ?? 0) !== 0)
    || permissions.includes('subscription_exempt')
    || permissions.includes('no_subscription_required');

  const planStatus = normalizePlanStatus(admin.plan_status);
  if (planStatus === 'exempt' || isSubscriptionExempt) {
    return accountStatus === 'inactive' || accountStatus === 'suspended' ? accountStatus : 'active';
  }

  if (planStatus === 'canceled' || planStatus === 'expired') {
    return planStatus;
  }

  const hasActivePlan = Boolean(String(admin.plan_name || '').trim());
  if (!planStatus && !hasActivePlan) {
    return 'unpaid';
  }

  if (accountStatus === 'inactive' || accountStatus === 'suspended') {
    return accountStatus;
  }

  if (!hasActivePlan) {
    return 'inactive';
  }

  if (admin.next_billing_date) {
    const nextBillingTimestamp = new Date(admin.next_billing_date).getTime();
    if (!Number.isNaN(nextBillingTimestamp) && nextBillingTimestamp < Date.now()) {
      return 'expired';
    }
  }

  return 'active';
};

const formatStatusLabel = (status: string): string =>
  status
    .replace(/_/g, ' ')
    .split(' ')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

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
}) => {
  const groupedPermissions = PERMISSIONS.reduce((acc, permission) => {
    if (!acc[permission.category]) acc[permission.category] = [];
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, typeof PERMISSIONS>);

  const portalPermissions = PERMISSIONS.filter((permission) =>
    SCORE_MACHINE_PORTAL_PERMISSION_IDS.includes(permission.id as (typeof SCORE_MACHINE_PORTAL_PERMISSION_IDS)[number])
  );

  return (
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
      <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4">
        <div className="space-y-1">
          <Label htmlFor="admin-dispute-letter-email" className="text-sm font-medium">
            Send A Mail For This Admin When Admin Generate Dispute Letter
          </Label>
          <p className="text-xs font-normal text-gray-500">
            This admin can receive letter-generated emails when the global notification setting is on.
          </p>
        </div>
        <Switch
          id="admin-dispute-letter-email"
          checked={formData.sendDisputeLetterEmail}
          onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, sendDisputeLetterEmail: checked }))}
        />
      </div>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4">
        <div className="space-y-1">
          <Label htmlFor="admin-inactivity-email-preference" className="text-sm font-medium">
            Send We Miss You Mail For This Admin After 2 Days Inactive
          </Label>
          <p className="text-xs font-normal text-gray-500">
            This admin can receive inactivity emails when the global two-day notification setting is on.
          </p>
        </div>
        <Switch
          id="admin-inactivity-email-preference"
          checked={formData.sendInactivityEmail}
          onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, sendInactivityEmail: checked }))}
        />
      </div>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4">
        <div className="space-y-1">
          <Label htmlFor="admin-report-pull-reminder-email" className="text-sm font-medium">
            Send 30-Day Report Pull Reminder Mail For This Admin
          </Label>
          <p className="text-xs font-normal text-gray-500">
            This admin can receive client report reminders when the global 30-day setting is on.
          </p>
        </div>
        <Switch
          id="admin-report-pull-reminder-email"
          checked={formData.sendReportPullReminderEmail}
          onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, sendReportPullReminderEmail: checked }))}
        />
      </div>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
        <div className="space-y-1">
          <Label htmlFor="admin-free-client-enrollment" className="text-sm font-medium">
            Allow free client enrollment for this admin
          </Label>
          <p className="text-xs font-normal text-gray-500">
            When enabled, this admin can add clients without charging the client plan fee from onboarding or inside their CRM.
          </p>
        </div>
        <Switch
          id="admin-free-client-enrollment"
          checked={formData.allowFreeClientEnrollment}
          onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, allowFreeClientEnrollment: checked }))}
        />
      </div>
    </div>

    {/* Permissions */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Shield className="h-5 w-5" />
        Permissions
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(groupedPermissions).map(([category, permissions]) => {
          const standardPermissions = permissions.filter(
            (permission) => !SCORE_MACHINE_PORTAL_PERMISSION_IDS.includes(permission.id as (typeof SCORE_MACHINE_PORTAL_PERMISSION_IDS)[number])
          );

          return (
          <div key={category} className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700">{category}</h4>
            <div className="space-y-2">
              {category === 'Admin' && (
                <div className="space-y-3 rounded-lg border border-gray-200 p-3">
                  <p className="text-sm font-medium text-gray-700">
                    Allow Score Machine Elite | Allow Basic Only
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {portalPermissions.map((permission) => (
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
              )}
              {standardPermissions.map((permission) => (
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
        )})}
      </div>
    </div>
  </div>
  );
});

const normalizeCustomAdminFilters = (filters: unknown): CustomAdminFilter[] => {
  if (!Array.isArray(filters)) {
    return [];
  }

  return filters
    .filter((filter) => filter && typeof filter.name === 'string')
    .map((filter: any) => ({
      ...filter,
      id: typeof filter.id === 'string' ? filter.id : `filter-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      description: typeof filter.description === 'string' ? filter.description : '',
      planNames: Array.isArray(filter.planNames) ? filter.planNames : [],
      permissionIds: Array.isArray(filter.permissionIds) ? filter.permissionIds : [],
      planStatuses: Array.isArray(filter.planStatuses) ? filter.planStatuses : [],
      joinStartDate: typeof filter.joinStartDate === 'string' ? filter.joinStartDate : '',
      joinEndDate: typeof filter.joinEndDate === 'string' ? filter.joinEndDate : '',
      newJoinsFirst: Boolean(filter.newJoinsFirst),
      unpaidOnly: Boolean(filter.unpaidOnly),
      showInFront: Boolean(filter.showInFront),
    }));
};

const normalizeSupportFilterAccessSetting = (setting: any): SupportAdminFilterAccessSetting => {
  const hardcoreFilterIds = Array.isArray(setting?.hardcoreFilterIds)
    ? setting.hardcoreFilterIds.filter((filterId: unknown): filterId is string => typeof filterId === 'string')
    : [];
  const hardcoreAdminIds = Array.isArray(setting?.hardcoreAdminIds)
    ? setting.hardcoreAdminIds.map((adminId: unknown) => Number(adminId)).filter((adminId: number) => Number.isFinite(adminId))
    : [];
  const hasHardcoreRules = hardcoreFilterIds.length > 0 || hardcoreAdminIds.length > 0;

  return {
    customFilterAccess: hasHardcoreRules ? false : setting?.customFilterAccess !== false,
    frontOnly: hasHardcoreRules ? false : Boolean(setting?.frontOnly),
    allowedFilterIds: Array.isArray(setting?.allowedFilterIds)
      ? setting.allowedFilterIds.filter((filterId: unknown): filterId is string => typeof filterId === 'string')
      : [],
    defaultFilterIds: Array.isArray(setting?.defaultFilterIds)
      ? setting.defaultFilterIds.filter((filterId: unknown): filterId is string => typeof filterId === 'string')
      : [],
    supportStartFollowUp: Boolean(setting?.supportStartFollowUp),
    hardcoreFilterIds,
    hardcoreAdminIds,
  };
};

const normalizeSupportFilterAccessSettings = (settings: unknown): Record<string, SupportAdminFilterAccessSetting> => {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return {};
  }

  return Object.entries(settings as Record<string, unknown>).reduce<Record<string, SupportAdminFilterAccessSetting>>((acc, [supportUserId, setting]) => {
    acc[supportUserId] = normalizeSupportFilterAccessSetting(setting);
    return acc;
  }, {});
};

const AdminProfileManagement: React.FC<AdminProfileManagementProps> = ({
  readOnly = false,
  chooseFiltersOnly = false,
  compact = false,
}) => {
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
    password: '',
    sendDisputeLetterEmail: true,
    sendInactivityEmail: true,
    sendReportPullReminderEmail: true,
    allowFreeClientEnrollment: false
  });
  const [disputeLetterEmailEnabled, setDisputeLetterEmailEnabled] = useState(false);
  const [disputeLetterEmailSettingLoading, setDisputeLetterEmailSettingLoading] = useState(false);
  const [disputeLetterEmailSettingSaving, setDisputeLetterEmailSettingSaving] = useState(false);
  const [adminInactivityEmailEnabled, setAdminInactivityEmailEnabled] = useState(true);
  const [adminInactivityEmailSettingLoading, setAdminInactivityEmailSettingLoading] = useState(false);
  const [adminInactivityEmailSettingSaving, setAdminInactivityEmailSettingSaving] = useState(false);
  const [reportPullReminderEmailEnabled, setReportPullReminderEmailEnabled] = useState(true);
  const [reportPullReminderEmailSettingLoading, setReportPullReminderEmailSettingLoading] = useState(false);
  const [reportPullReminderEmailSettingSaving, setReportPullReminderEmailSettingSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReferralDialogOpen, setIsReferralDialogOpen] = useState(false);
  const [referralAdmin, setReferralAdmin] = useState<AdminProfile | null>(null);
  const [affiliateOptions, setAffiliateOptions] = useState<AffiliateOption[]>([]);
  const [affiliateSearchTerm, setAffiliateSearchTerm] = useState('');
  const [loadingAffiliates, setLoadingAffiliates] = useState(false);
  const [savingAffiliateId, setSavingAffiliateId] = useState<number | null>(null);
  const [superAdminPlanOptions, setSuperAdminPlanOptions] = useState<PlanOption[]>([]);
  const [loadingPlanOptions, setLoadingPlanOptions] = useState(false);
  const [isPurchasedPlanDropdownOpen, setIsPurchasedPlanDropdownOpen] = useState(false);
  const [purchasedPlanSearchTerm, setPurchasedPlanSearchTerm] = useState('');
  const [isCustomFilterDialogOpen, setIsCustomFilterDialogOpen] = useState(false);
  const [customFilterTab, setCustomFilterTab] = useState('choose');
  const [customFilters, setCustomFilters] = useState<CustomAdminFilter[]>([]);
  const [customFiltersLoaded, setCustomFiltersLoaded] = useState(false);
  const [activeCustomFilterIds, setActiveCustomFilterIds] = useState<string[]>([]);
  const [customFilterSearchTerm, setCustomFilterSearchTerm] = useState('');
  const [editingCustomFilterId, setEditingCustomFilterId] = useState<string | null>(null);
  const [filterPendingDelete, setFilterPendingDelete] = useState<CustomAdminFilter | null>(null);
  const [customFilterDraft, setCustomFilterDraft] = useState<CustomFilterDraft>(() => createEmptyFilterDraft());
  const [customFilterNameError, setCustomFilterNameError] = useState('');
  const [supportUsers, setSupportUsers] = useState<SupportUserOption[]>([]);
  const [supportHardcoreAdminOptions, setSupportHardcoreAdminOptions] = useState<AdminProfile[]>([]);
  const [supportUserSearchTerm, setSupportUserSearchTerm] = useState('');
  const [supportFilterSearchTerms, setSupportFilterSearchTerms] = useState<Record<string, string>>({});
  const [expandedSupportUserIds, setExpandedSupportUserIds] = useState<number[]>([]);
  const [supportFilterAccessSettings, setSupportFilterAccessSettings] = useState<Record<string, SupportAdminFilterAccessSetting>>({});
  const [supportFilterAccessLoaded, setSupportFilterAccessLoaded] = useState(false);
  const [currentSupportFilterAccess, setCurrentSupportFilterAccess] = useState<SupportAdminFilterAccessSetting | null>(null);
  const [currentSupportFilterAccessLoaded, setCurrentSupportFilterAccessLoaded] = useState(false);
  const [supportDefaultFiltersApplied, setSupportDefaultFiltersApplied] = useState(false);
  const [supportFilterOverridePrompt, setSupportFilterOverridePrompt] = useState<{ type: 'toggle'; filterId: string } | { type: 'clear' } | null>(null);
  const [supportFilterOverrideAcknowledged, setSupportFilterOverrideAcknowledged] = useState(false);
  const [supportFollowUpMode, setSupportFollowUpMode] = useState(false);
  const [supportFollowUpModeInitialized, setSupportFollowUpModeInitialized] = useState(false);
  const [supportFollowUpRemovalPromptOpen, setSupportFollowUpRemovalPromptOpen] = useState(false);
  const [supportFollowUpRemovalSaving, setSupportFollowUpRemovalSaving] = useState(false);
  const [supportFollowUpDoneAdminIds, setSupportFollowUpDoneAdminIds] = useState<number[]>([]);
  const itemsPerPage = 10;

  useEffect(() => {
    let cancelled = false;

    const loadCustomFilters = async () => {
      let localFilters: CustomAdminFilter[] = [];
      try {
        const rawFilters = localStorage.getItem(ADMIN_CUSTOM_FILTERS_STORAGE_KEY);
        const parsedFilters = rawFilters ? JSON.parse(rawFilters) : [];
        localFilters = normalizeCustomAdminFilters(parsedFilters);
      } catch (error) {
        console.warn('Failed to read local admin custom filters:', error);
      }

      try {
        const response = readOnly
          ? await superAdminApi.getSupportAdminCustomFilters()
          : await superAdminApi.getAdminCustomFilters();
        const apiFilters = normalizeCustomAdminFilters(response.data?.data);
        const nextFilters = apiFilters.length > 0 ? apiFilters : localFilters;
        if (!readOnly && apiFilters.length === 0 && localFilters.length > 0) {
          await superAdminApi.saveAdminCustomFilters(localFilters);
        }
        if (!cancelled) {
          setCustomFilters(nextFilters);
          localStorage.setItem(ADMIN_CUSTOM_FILTERS_STORAGE_KEY, JSON.stringify(nextFilters));
          setCustomFiltersLoaded(true);
        }
        return;
      } catch (apiError) {
        console.warn('Failed to load primary shared admin custom filters; trying fallback:', apiError);
      }

      try {
        const response = readOnly
          ? await superAdminApi.getAdminCustomFilters()
          : await superAdminApi.getSupportAdminCustomFilters();
        const fallbackFilters = normalizeCustomAdminFilters(response.data?.data);
        const nextFilters = fallbackFilters.length > 0 ? fallbackFilters : localFilters;
        if (!cancelled) {
          setCustomFilters(nextFilters);
          localStorage.setItem(ADMIN_CUSTOM_FILTERS_STORAGE_KEY, JSON.stringify(nextFilters));
          setCustomFiltersLoaded(true);
        }
        return;
      } catch (fallbackError) {
        console.warn('Failed to load fallback shared admin custom filters; falling back to local filters:', fallbackError);
      }

      try {
        if (!cancelled) {
          setCustomFilters(localFilters);
        }
      } catch (error) {
        console.warn('Failed to load admin custom filters:', error);
      } finally {
        if (!cancelled) {
          setCustomFiltersLoaded(true);
        }
      }
    };

    loadCustomFilters();

    return () => {
      cancelled = true;
    };
  }, [readOnly]);

  useEffect(() => {
    if (!customFiltersLoaded) {
      return;
    }

    try {
      localStorage.setItem(ADMIN_CUSTOM_FILTERS_STORAGE_KEY, JSON.stringify(customFilters));
    } catch (error) {
      console.warn('Failed to save admin custom filters:', error);
    }

    if (!readOnly) {
      superAdminApi.saveAdminCustomFilters(customFilters).catch((error) => {
        console.warn('Failed to save shared admin custom filters:', error);
      });
    }
  }, [customFilters, customFiltersLoaded, readOnly]);

  useEffect(() => {
    if (readOnly) {
      return;
    }

    let cancelled = false;

    const loadSupportFilterAccess = async () => {
      try {
        const [supportUsersResponse, accessResponse, adminOptionsResponse] = await Promise.all([
          superAdminApi.getSupportUsers({ page: 1, limit: 100 }),
          superAdminApi.getSupportAdminFilterAccess(),
          superAdminApi.getAdminProfiles({ page: 1, limit: 'all' }),
        ]);

        const nextSupportUsers = Array.isArray(supportUsersResponse.data?.data)
          ? supportUsersResponse.data.data.map((supportUser: any) => ({
              id: Number(supportUser.id),
              first_name: String(supportUser.first_name || ''),
              last_name: String(supportUser.last_name || ''),
              email: String(supportUser.email || ''),
              status: supportUser.status,
            })).filter((supportUser: SupportUserOption) => Number.isFinite(supportUser.id))
          : [];
        const rawAdminOptions = Array.isArray(adminOptionsResponse.data?.data)
          ? adminOptionsResponse.data.data
          : Array.isArray(adminOptionsResponse.data)
            ? adminOptionsResponse.data
            : [];
        const nextAdminOptions = rawAdminOptions.map((admin: AdminProfile) => normalizeAdminProfile(admin));

        if (!cancelled) {
          setSupportUsers(nextSupportUsers);
          setSupportHardcoreAdminOptions(nextAdminOptions);
          setSupportFilterAccessSettings(normalizeSupportFilterAccessSettings(accessResponse.data?.data));
          setSupportFilterAccessLoaded(true);
        }
      } catch (error) {
        console.warn('Failed to load support filter access settings:', error);
        if (!cancelled) {
          setSupportFilterAccessLoaded(true);
        }
      }
    };

    loadSupportFilterAccess();

    return () => {
      cancelled = true;
    };
  }, [readOnly]);

  useEffect(() => {
    if (readOnly || !supportFilterAccessLoaded) {
      return;
    }

    superAdminApi.saveSupportAdminFilterAccess(supportFilterAccessSettings).catch((error) => {
      console.warn('Failed to save support filter access settings:', error);
    });
  }, [readOnly, supportFilterAccessLoaded, supportFilterAccessSettings]);

  useEffect(() => {
    if (!readOnly) {
      setCurrentSupportFilterAccessLoaded(true);
      return;
    }

    let cancelled = false;

    const loadCurrentSupportFilterAccess = async () => {
      try {
        const response = await superAdminApi.getMySupportAdminFilterAccess();
        if (!cancelled) {
          setCurrentSupportFilterAccess(response.data?.data ? normalizeSupportFilterAccessSetting(response.data.data) : createDefaultSupportFilterAccess());
          setCurrentSupportFilterAccessLoaded(true);
        }
      } catch (error) {
        console.warn('Failed to load current support filter access:', error);
        if (!cancelled) {
          setCurrentSupportFilterAccess(createDefaultSupportFilterAccess());
          setCurrentSupportFilterAccessLoaded(true);
        }
      }
    };

    loadCurrentSupportFilterAccess();

    return () => {
      cancelled = true;
    };
  }, [readOnly]);

  const supportFollowUpStorageKey = useMemo(() => {
    if (!readOnly || typeof window === 'undefined') {
      return '';
    }

    const supportUserId = window.localStorage.getItem('userId') || 'unknown';
    return `${SUPPORT_FOLLOW_UP_DONE_STORAGE_KEY}:${supportUserId}`;
  }, [readOnly]);

  useEffect(() => {
    if (!readOnly || !supportFollowUpStorageKey) {
      return;
    }

    try {
      const rawDoneIds = window.localStorage.getItem(supportFollowUpStorageKey);
      const parsedDoneIds = rawDoneIds ? JSON.parse(rawDoneIds) : [];
      setSupportFollowUpDoneAdminIds(Array.isArray(parsedDoneIds)
        ? parsedDoneIds.map((adminId) => Number(adminId)).filter((adminId) => Number.isFinite(adminId))
        : []);
    } catch (error) {
      console.warn('Failed to load support follow-up done admins:', error);
      setSupportFollowUpDoneAdminIds([]);
    }
  }, [readOnly, supportFollowUpStorageKey]);

  useEffect(() => {
    if (!readOnly || !supportFollowUpStorageKey) {
      return;
    }

    try {
      window.localStorage.setItem(supportFollowUpStorageKey, JSON.stringify(supportFollowUpDoneAdminIds));
    } catch (error) {
      console.warn('Failed to save support follow-up done admins:', error);
    }
  }, [readOnly, supportFollowUpDoneAdminIds, supportFollowUpStorageKey]);

  useEffect(() => {
    if (!readOnly || !currentSupportFilterAccessLoaded || supportFollowUpModeInitialized) {
      return;
    }

    setSupportFollowUpMode(Boolean(currentSupportFilterAccess?.supportStartFollowUp));
    setSupportFollowUpModeInitialized(true);
  }, [
    currentSupportFilterAccess,
    currentSupportFilterAccessLoaded,
    readOnly,
    supportFollowUpModeInitialized,
  ]);

  const fetchAdminProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const shouldLoadAllForCustomFilters = activeCustomFilterIds.length > 0
        || Boolean(currentSupportFilterAccess?.hardcoreFilterIds?.length)
        || Boolean(currentSupportFilterAccess?.hardcoreAdminIds?.length);
      const apiParams = {
        page: shouldLoadAllForCustomFilters ? 1 : currentPage,
        limit: shouldLoadAllForCustomFilters ? 'all' : itemsPerPage,
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
        setTotalPages(shouldLoadAllForCustomFilters ? 1 : (response.data.pagination?.pages || 1));
      } else if (Array.isArray(response.data)) {
        const admins = response.data.map((admin: AdminProfile) => normalizeAdminProfile(admin));
        setAdminProfiles(admins);
        setTotalPages(shouldLoadAllForCustomFilters ? 1 : Math.max(1, Math.ceil(admins.length / itemsPerPage)));
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
  }, [activeCustomFilterIds.length, currentPage, currentSupportFilterAccess?.hardcoreAdminIds?.length, currentSupportFilterAccess?.hardcoreFilterIds?.length, itemsPerPage, searchTerm, statusFilter, roleFilter]);

  useEffect(() => {
    console.log('🔄 useEffect triggered - fetching admin profiles');
    console.log('🔄 Dependencies:', { currentPage, searchTerm, statusFilter, roleFilter });
    fetchAdminProfiles();
  }, [fetchAdminProfiles]);

  useEffect(() => {
    if (readOnly) return;

    let cancelled = false;
    const loadDisputeLetterEmailSetting = async () => {
      setDisputeLetterEmailSettingLoading(true);
      try {
        const response = await superAdminApi.getDisputeLetterEmailSettings();
        if (!cancelled) {
          setDisputeLetterEmailEnabled(Boolean(response.data?.data?.enabled));
        }
      } catch (error) {
        console.error('Error loading dispute letter email setting:', error);
        if (!cancelled) {
          toast({
            title: 'Error',
            description: 'Failed to load dispute letter email setting',
            variant: 'destructive'
          });
        }
      } finally {
        if (!cancelled) setDisputeLetterEmailSettingLoading(false);
      }
    };

    void loadDisputeLetterEmailSetting();
    return () => {
      cancelled = true;
    };
  }, [readOnly, toast]);

  const handleDisputeLetterEmailSettingChange = async (enabled: boolean) => {
    const previousValue = disputeLetterEmailEnabled;
    setDisputeLetterEmailEnabled(enabled);
    setDisputeLetterEmailSettingSaving(true);
    try {
      await superAdminApi.saveDisputeLetterEmailSettings(enabled);
      toast({
        title: 'Success',
        description: enabled
          ? 'Dispute letter emails are enabled for eligible admins'
          : 'Dispute letter emails are disabled for all admins'
      });
    } catch (error) {
      console.error('Error saving dispute letter email setting:', error);
      setDisputeLetterEmailEnabled(previousValue);
      toast({
        title: 'Error',
        description: 'Failed to save dispute letter email setting',
        variant: 'destructive'
      });
    } finally {
      setDisputeLetterEmailSettingSaving(false);
    }
  };

  useEffect(() => {
    if (readOnly) return;

    let cancelled = false;
    const loadAdminInactivityEmailSetting = async () => {
      setAdminInactivityEmailSettingLoading(true);
      try {
        const response = await superAdminApi.getAdminInactivityEmailSettings();
        if (!cancelled) {
          setAdminInactivityEmailEnabled(Boolean(response.data?.data?.enabled));
        }
      } catch (error) {
        console.error('Error loading admin inactivity email setting:', error);
        if (!cancelled) {
          toast({
            title: 'Error',
            description: 'Failed to load admin inactivity email setting',
            variant: 'destructive'
          });
        }
      } finally {
        if (!cancelled) setAdminInactivityEmailSettingLoading(false);
      }
    };

    void loadAdminInactivityEmailSetting();
    return () => {
      cancelled = true;
    };
  }, [readOnly, toast]);

  const handleAdminInactivityEmailSettingChange = async (enabled: boolean) => {
    const previousValue = adminInactivityEmailEnabled;
    setAdminInactivityEmailEnabled(enabled);
    setAdminInactivityEmailSettingSaving(true);
    try {
      await superAdminApi.saveAdminInactivityEmailSettings(enabled);
      toast({
        title: 'Success',
        description: enabled
          ? 'Two-day inactivity emails are enabled'
          : 'Two-day inactivity emails are disabled'
      });
    } catch (error) {
      console.error('Error saving admin inactivity email setting:', error);
      setAdminInactivityEmailEnabled(previousValue);
      toast({
        title: 'Error',
        description: 'Failed to save admin inactivity email setting',
        variant: 'destructive'
      });
    } finally {
      setAdminInactivityEmailSettingSaving(false);
    }
  };

  useEffect(() => {
    if (readOnly) return;

    let cancelled = false;
    const loadReportPullReminderEmailSetting = async () => {
      setReportPullReminderEmailSettingLoading(true);
      try {
        const response = await superAdminApi.getReportPullReminderEmailSettings();
        if (!cancelled) setReportPullReminderEmailEnabled(Boolean(response.data?.data?.enabled));
      } catch (error) {
        console.error('Error loading report pull reminder email setting:', error);
        if (!cancelled) {
          toast({ title: 'Error', description: 'Failed to load report pull reminder email setting', variant: 'destructive' });
        }
      } finally {
        if (!cancelled) setReportPullReminderEmailSettingLoading(false);
      }
    };

    void loadReportPullReminderEmailSetting();
    return () => { cancelled = true; };
  }, [readOnly, toast]);

  const handleReportPullReminderEmailSettingChange = async (enabled: boolean) => {
    const previousValue = reportPullReminderEmailEnabled;
    setReportPullReminderEmailEnabled(enabled);
    setReportPullReminderEmailSettingSaving(true);
    try {
      await superAdminApi.saveReportPullReminderEmailSettings(enabled);
      toast({
        title: 'Success',
        description: enabled ? '30-day report pull reminder emails are enabled' : '30-day report pull reminder emails are disabled'
      });
    } catch (error) {
      console.error('Error saving report pull reminder email setting:', error);
      setReportPullReminderEmailEnabled(previousValue);
      toast({ title: 'Error', description: 'Failed to save report pull reminder email setting', variant: 'destructive' });
    } finally {
      setReportPullReminderEmailSettingSaving(false);
    }
  };

  useEffect(() => {
    const fetchPlanOptions = async () => {
      if (chooseFiltersOnly) {
        setLoadingPlanOptions(false);
        return;
      }

      try {
        setLoadingPlanOptions(true);
        const response = await superAdminApi.getPlans({ limit: 'all' });
        const rawPlans = Array.isArray(response.data?.data)
          ? response.data.data
          : Array.isArray(response.data?.plans)
            ? response.data.plans
            : Array.isArray(response.data)
              ? response.data
              : [];

        const nextPlans = rawPlans
          .map((plan: any): PlanOption | null => {
            const name = String(plan?.name || plan?.plan_name || plan?.title || '').trim();
            if (!name) {
              return null;
            }

            return {
              id: String(plan?.id || name),
              name,
            };
          })
          .filter((plan: PlanOption | null): plan is PlanOption => Boolean(plan));

        const uniquePlans = Array.from(
          new Map<string, PlanOption>(nextPlans.map((plan) => [plan.name.toLowerCase(), plan])).values()
        ).sort((left, right) => left.name.localeCompare(right.name));

        setSuperAdminPlanOptions(uniquePlans);
      } catch (error) {
        console.error('Error loading super admin plans:', error);
      } finally {
        setLoadingPlanOptions(false);
      }
    };

    fetchPlanOptions();
  }, [chooseFiltersOnly]);

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

  const fetchAffiliateOptions = useCallback(async () => {
    try {
      setLoadingAffiliates(true);
      const response = await superAdminApi.getAffiliates({ limit: 'all' as any, status: 'active' } as any);
      const nextAffiliates = Array.isArray(response.data?.data)
        ? response.data.data
            .filter((affiliate: any) => String(affiliate?.status || '').toLowerCase() === 'active')
            .map((affiliate: any) => ({
              id: Number(affiliate.id),
              first_name: String(affiliate.first_name || ''),
              last_name: String(affiliate.last_name || ''),
              email: String(affiliate.email || ''),
              status: affiliate.status,
            }))
        : [];
      setAffiliateOptions(nextAffiliates);
    } catch (error) {
      console.error('Error loading affiliates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load affiliates',
        variant: 'destructive'
      });
    } finally {
      setLoadingAffiliates(false);
    }
  }, [toast]);

  const openReferralDialog = useCallback(async (admin: AdminProfile) => {
    setReferralAdmin(admin);
    setAffiliateSearchTerm('');
    setIsReferralDialogOpen(true);

    if (affiliateOptions.length === 0 && !loadingAffiliates) {
      await fetchAffiliateOptions();
    }
  }, [affiliateOptions.length, fetchAffiliateOptions, loadingAffiliates]);

  const closeReferralDialog = useCallback((open: boolean) => {
    setIsReferralDialogOpen(open);
    if (!open) {
      setReferralAdmin(null);
      setAffiliateSearchTerm('');
      setSavingAffiliateId(null);
    }
  }, []);

  const handleAssignAffiliateReferrer = useCallback(async (affiliate: AffiliateOption) => {
    if (!referralAdmin) {
      return;
    }

    setSavingAffiliateId(affiliate.id);
    try {
      const response = await superAdminApi.updateAdminAffiliateReferrer(referralAdmin.id, { affiliateId: affiliate.id });
      const updatedLabel = response.data?.data?.referred_by_affiliate_name || getAffiliateDisplayName(affiliate);
      const updatedEmail = response.data?.data?.referred_by_affiliate_email || affiliate.email;

      setAdminProfiles((prev) => prev.map((admin) => (
        admin.id === referralAdmin.id
          ? {
              ...admin,
              referred_by_affiliate_id: affiliate.id,
              referred_by_affiliate_name: updatedLabel,
              referred_by_affiliate_email: updatedEmail,
            }
          : admin
      )));

      toast({
        title: 'Success',
        description: `${referralAdmin.first_name} ${referralAdmin.last_name} is now referred by ${updatedLabel}`
      });
      closeReferralDialog(false);
    } catch (error: any) {
      console.error('Error updating admin affiliate referrer:', error);
      toast({
        title: 'Error',
        description: error?.response?.data?.error || 'Failed to update admin referrer',
        variant: 'destructive'
      });
    } finally {
      setSavingAffiliateId(null);
    }
  }, [closeReferralDialog, referralAdmin, toast]);

  const handleClearAffiliateReferrer = useCallback(async () => {
    if (!referralAdmin?.referred_by_affiliate_id) {
      return;
    }

    const currentAffiliateId = referralAdmin.referred_by_affiliate_id;
    const currentReferrerLabel = getAdminReferrerLabel(referralAdmin) || 'the current affiliate';

    setSavingAffiliateId(currentAffiliateId);
    try {
      await superAdminApi.clearAdminAffiliateReferrer(referralAdmin.id);

      setAdminProfiles((prev) => prev.map((admin) => (
        admin.id === referralAdmin.id
          ? {
              ...admin,
              referred_by_affiliate_id: null,
              referred_by_affiliate_name: null,
              referred_by_affiliate_email: null,
            }
          : admin
      )));

      toast({
        title: 'Success',
        description: `${referralAdmin.first_name} ${referralAdmin.last_name} is no longer referred by ${currentReferrerLabel}`
      });
      closeReferralDialog(false);
    } catch (error: any) {
      console.error('Error clearing admin affiliate referrer:', error);
      toast({
        title: 'Error',
        description: error?.response?.data?.error || 'Failed to remove admin referrer',
        variant: 'destructive'
      });
    } finally {
      setSavingAffiliateId(null);
    }
  }, [closeReferralDialog, referralAdmin, toast]);

  const currentReferralOption = referralAdmin?.referred_by_affiliate_id
    ? {
        id: referralAdmin.referred_by_affiliate_id,
        first_name: '',
        last_name: referralAdmin.referred_by_affiliate_name || '',
        email: referralAdmin.referred_by_affiliate_email || '',
        status: 'current',
      }
    : null;

  const affiliateOptionsWithCurrent = currentReferralOption && !affiliateOptions.some((affiliate) => affiliate.id === currentReferralOption.id)
    ? [currentReferralOption, ...affiliateOptions]
    : affiliateOptions;

  const filteredAffiliateOptions = affiliateOptionsWithCurrent.filter((affiliate) => {
    const normalizedSearch = affiliateSearchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return true;
    }

    return [affiliate.first_name, affiliate.last_name, affiliate.email]
      .filter((value): value is string => typeof value === 'string')
      .some((value) => value.toLowerCase().includes(normalizedSearch));
  });

  const availablePlanNames = useMemo(() => {
    const planNameSet = new Set<string>();
    superAdminPlanOptions.forEach((plan) => {
      const planName = plan.name.trim();
      if (planName) {
        planNameSet.add(planName);
      }
    });
    adminProfiles.forEach((admin) => {
      const planName = String(admin.plan_name || '').trim();
      if (planName) {
        planNameSet.add(planName);
      }
    });
    return Array.from(planNameSet).sort((left, right) => left.localeCompare(right));
  }, [adminProfiles, superAdminPlanOptions]);

  const filteredPurchasedPlanNames = useMemo(() => {
    const normalizedSearch = purchasedPlanSearchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return availablePlanNames;
    }

    return availablePlanNames.filter((planName) => planName.toLowerCase().includes(normalizedSearch));
  }, [availablePlanNames, purchasedPlanSearchTerm]);

  const currentSupportHasHardcoreFilters = readOnly && (
    Boolean(currentSupportFilterAccess?.hardcoreFilterIds?.length) ||
    Boolean(currentSupportFilterAccess?.hardcoreAdminIds?.length)
  );
  const supportCustomFilterAccessEnabled = !readOnly || (
    currentSupportFilterAccess?.customFilterAccess !== false && !currentSupportHasHardcoreFilters
  );
  const supportFrontOnlyFilterAccess = readOnly && Boolean(currentSupportFilterAccess?.frontOnly) && !currentSupportHasHardcoreFilters;

  const accessibleCustomFilters = useMemo(() => {
    if (!readOnly) {
      return customFilters;
    }

    if (!supportCustomFilterAccessEnabled || currentSupportHasHardcoreFilters) {
      return [];
    }

    const allowedFilterIds = currentSupportFilterAccess?.allowedFilterIds || [];
    if (allowedFilterIds.length === 0) {
      return customFilters;
    }

    const allowedFilterIdSet = new Set(allowedFilterIds);
    return customFilters.filter((filter) => allowedFilterIdSet.has(filter.id));
  }, [currentSupportFilterAccess, currentSupportHasHardcoreFilters, customFilters, readOnly, supportCustomFilterAccessEnabled]);

  const activeCustomFilters = useMemo(
    () => accessibleCustomFilters.filter((filter) => activeCustomFilterIds.includes(filter.id)),
    [accessibleCustomFilters, activeCustomFilterIds]
  );

  const hardcoreSupportCustomFilters = useMemo(() => {
    if (!readOnly) {
      return [];
    }

    const hardcoreFilterIds = currentSupportFilterAccess?.hardcoreFilterIds || [];
    if (hardcoreFilterIds.length === 0) {
      return [];
    }

    const hardcoreFilterIdSet = new Set(hardcoreFilterIds);
    return customFilters.filter((filter) => hardcoreFilterIdSet.has(filter.id));
  }, [currentSupportFilterAccess, customFilters, readOnly]);

  const effectiveCustomFilters = useMemo(() => {
    if (hardcoreSupportCustomFilters.length === 0) {
      return activeCustomFilters;
    }

    const mergedFilters = new Map<string, CustomAdminFilter>();
    hardcoreSupportCustomFilters.forEach((filter) => mergedFilters.set(filter.id, filter));
    activeCustomFilters.forEach((filter) => mergedFilters.set(filter.id, filter));
    return Array.from(mergedFilters.values());
  }, [activeCustomFilters, hardcoreSupportCustomFilters]);

  const hasActiveCustomFilters = activeCustomFilters.length > 0;

  const frontCustomFilters = useMemo(
    () => accessibleCustomFilters.filter((filter) => filter.showInFront),
    [accessibleCustomFilters]
  );

  const supportFollowUpDoneAdminIdSet = useMemo(
    () => new Set(supportFollowUpDoneAdminIds),
    [supportFollowUpDoneAdminIds]
  );

  const adminTableColumnCount = 12
    + (!readOnly ? 1 : 0)
    + (readOnly && supportFollowUpMode ? 1 : 0);

  useEffect(() => {
    if (!readOnly || !customFiltersLoaded || !currentSupportFilterAccessLoaded || supportDefaultFiltersApplied) {
      return;
    }

    const accessibleFilterIds = new Set(accessibleCustomFilters.map((filter) => filter.id));
    const defaultFilterIds = (currentSupportFilterAccess?.defaultFilterIds || []).filter((filterId) => accessibleFilterIds.has(filterId));
    if (defaultFilterIds.length > 0) {
      setActiveCustomFilterIds(defaultFilterIds);
    } else if (!supportCustomFilterAccessEnabled) {
      setActiveCustomFilterIds([]);
    }
    setSupportDefaultFiltersApplied(true);
  }, [
    accessibleCustomFilters,
    currentSupportFilterAccess,
    currentSupportFilterAccessLoaded,
    customFiltersLoaded,
    readOnly,
    supportCustomFilterAccessEnabled,
    supportDefaultFiltersApplied,
  ]);

  const isAdminUnpaid = useCallback((admin: AdminProfile) => {
    const hasPlan = Boolean(String(admin.plan_name || '').trim());
    if (!hasPlan) {
      return true;
    }

    const displayStatus = getAdminDisplayStatus(admin);
    return displayStatus === 'inactive' || displayStatus === 'expired' || displayStatus === 'suspended';
  }, []);

  const applyCustomFilterToProfiles = useCallback((profiles: AdminProfile[], filter: CustomAdminFilter | null) => {
    if (!filter) {
      return profiles;
    }

    let nextProfiles = [...profiles];

    if (filter.planNames.length > 0) {
      const selectedPlanNames = new Set(filter.planNames.map((planName) => planName.trim().toLowerCase()));
      nextProfiles = nextProfiles.filter((admin) => selectedPlanNames.has(String(admin.plan_name || '').trim().toLowerCase()));
    }

    if (filter.permissionIds.length > 0) {
      nextProfiles = nextProfiles.filter((admin) => {
        const adminPermissions = normalizePermissions(admin.permissions);
        return filter.permissionIds.every((permissionId) => adminPermissions.includes(permissionId));
      });
    }

    if (filter.planStatuses.length > 0) {
      const selectedPlanStatuses = new Set(filter.planStatuses.map((status) => normalizePlanStatus(status)));
      nextProfiles = nextProfiles.filter((admin) => selectedPlanStatuses.has(normalizePlanStatus(getAdminDisplayStatus(admin))));
    }

    const joinStartTimestamp = parseDateInputStartTimestamp(filter.joinStartDate);
    const joinEndTimestamp = parseDateInputEndTimestamp(filter.joinEndDate);
    if (joinStartTimestamp !== null || joinEndTimestamp !== null) {
      nextProfiles = nextProfiles.filter((admin) => {
        const adminCreatedTimestamp = parseAdminDateTimestamp(admin.created_at);
        if (!adminCreatedTimestamp) {
          return false;
        }

        if (joinStartTimestamp !== null && adminCreatedTimestamp < joinStartTimestamp) {
          return false;
        }

        if (joinEndTimestamp !== null && adminCreatedTimestamp > joinEndTimestamp) {
          return false;
        }

        return true;
      });
    }

    if (filter.unpaidOnly) {
      nextProfiles = nextProfiles.filter((admin) => isAdminUnpaid(admin));
    }

    if (filter.newJoinsFirst) {
      nextProfiles.sort((left, right) => {
        return parseAdminDateTimestamp(right.created_at) - parseAdminDateTimestamp(left.created_at);
      });
    }

    return nextProfiles;
  }, [isAdminUnpaid]);

  const displayedAdminProfiles = useMemo(() => {
    const hardcoreAdminIds = readOnly ? (currentSupportFilterAccess?.hardcoreAdminIds || []) : [];
    if (effectiveCustomFilters.length === 0 && hardcoreAdminIds.length === 0) {
      return adminProfiles;
    }

    if (effectiveCustomFilters.length === 0 && hardcoreAdminIds.length > 0) {
      const hardcoreAdminIdSet = new Set(hardcoreAdminIds);
      return adminProfiles.filter((admin) => hardcoreAdminIdSet.has(Number(admin.id)));
    }

    let nextProfiles = [...adminProfiles];
    effectiveCustomFilters.forEach((filter) => {
      nextProfiles = applyCustomFilterToProfiles(nextProfiles, filter);
    });

    if (effectiveCustomFilters.some((filter) => filter.newJoinsFirst)) {
      nextProfiles.sort((left, right) => {
        return parseAdminDateTimestamp(right.created_at) - parseAdminDateTimestamp(left.created_at);
      });
    }

    if (hardcoreAdminIds.length > 0) {
      const existingAdminIds = new Set(nextProfiles.map((admin) => Number(admin.id)));
      const hardcoreAdminIdSet = new Set(hardcoreAdminIds);
      const forcedAdmins = adminProfiles.filter((admin) => (
        hardcoreAdminIdSet.has(Number(admin.id)) && !existingAdminIds.has(Number(admin.id))
      ));
      nextProfiles = [...nextProfiles, ...forcedAdmins];
    }

    return nextProfiles;
  }, [currentSupportFilterAccess, effectiveCustomFilters, adminProfiles, applyCustomFilterToProfiles, readOnly]);

  const filteredCustomFilters = useMemo(() => {
    const normalizedSearch = customFilterSearchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return accessibleCustomFilters;
    }

    return accessibleCustomFilters.filter((filter) => (
      filter.name.toLowerCase().includes(normalizedSearch) ||
      String(filter.description || '').toLowerCase().includes(normalizedSearch) ||
      filter.planNames.some((planName) => planName.toLowerCase().includes(normalizedSearch)) ||
      filter.planStatuses.some((status) => (
        status.toLowerCase().includes(normalizedSearch) ||
        String(PLAN_STATUS_OPTIONS.find((option) => option.value === status)?.label || '').toLowerCase().includes(normalizedSearch)
      )) ||
      filter.permissionIds.some((permissionId) => {
        const permission = PERMISSIONS.find((currentPermission) => currentPermission.id === permissionId);
        return permissionId.toLowerCase().includes(normalizedSearch) ||
          String(permission?.label || '').toLowerCase().includes(normalizedSearch);
      }) ||
      filter.joinStartDate.includes(normalizedSearch) ||
      filter.joinEndDate.includes(normalizedSearch)
    ));
  }, [accessibleCustomFilters, customFilterSearchTerm]);

  const filteredSupportUsers = useMemo(() => {
    const normalizedSearch = supportUserSearchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return supportUsers;
    }

    return supportUsers.filter((supportUser) => (
      `${supportUser.first_name} ${supportUser.last_name}`.toLowerCase().includes(normalizedSearch) ||
      supportUser.email.toLowerCase().includes(normalizedSearch)
    ));
  }, [supportUserSearchTerm, supportUsers]);

  const toggleDraftPlan = (planName: string, checked: boolean) => {
    setCustomFilterDraft((prev) => ({
      ...prev,
      planNames: checked
        ? Array.from(new Set([...prev.planNames, planName]))
        : prev.planNames.filter((currentPlanName) => currentPlanName !== planName),
    }));
  };

  const toggleDraftPermission = (permissionId: string, checked: boolean) => {
    setCustomFilterDraft((prev) => ({
      ...prev,
      permissionIds: checked
        ? Array.from(new Set([...prev.permissionIds, permissionId]))
        : prev.permissionIds.filter((currentPermissionId) => currentPermissionId !== permissionId),
    }));
  };

  const toggleDraftPlanStatus = (status: string, checked: boolean) => {
    setCustomFilterDraft((prev) => ({
      ...prev,
      planStatuses: checked
        ? Array.from(new Set([...prev.planStatuses, status]))
        : prev.planStatuses.filter((currentStatus) => currentStatus !== status),
    }));
  };

  const adminSelectedSupportDefaultFilterIds = currentSupportFilterAccess?.defaultFilterIds || [];
  const shouldPromptSupportFilterOverride = readOnly
    && adminSelectedSupportDefaultFilterIds.some((filterId) => accessibleCustomFilters.some((filter) => filter.id === filterId))
    && !supportFilterOverrideAcknowledged;

  const performToggleActiveCustomFilter = (filterId: string) => {
    setCurrentPage(1);
    setActiveCustomFilterIds((prev) => (
      prev.includes(filterId)
        ? prev.filter((currentFilterId) => currentFilterId !== filterId)
        : [...prev, filterId]
    ));
  };

  const toggleActiveCustomFilter = (filterId: string) => {
    if (shouldPromptSupportFilterOverride) {
      setSupportFilterOverridePrompt({ type: 'toggle', filterId });
      return;
    }

    performToggleActiveCustomFilter(filterId);
  };

  const performClearActiveCustomFilters = () => {
    setCurrentPage(1);
    setActiveCustomFilterIds([]);
  };

  const clearActiveCustomFilters = () => {
    if (shouldPromptSupportFilterOverride) {
      setSupportFilterOverridePrompt({ type: 'clear' });
      return;
    }

    performClearActiveCustomFilters();
  };

  const handleChooseSupportFiltersAnyway = () => {
    const prompt = supportFilterOverridePrompt;
    setSupportFilterOverrideAcknowledged(true);
    setSupportFilterOverridePrompt(null);

    if (!prompt) {
      return;
    }

    if (prompt.type === 'clear') {
      performClearActiveCustomFilters();
      return;
    }

    performToggleActiveCustomFilter(prompt.filterId);
  };

  const handleToggleSupportFollowUpMode = () => {
    if (supportFollowUpMode && currentSupportFilterAccess?.supportStartFollowUp) {
      setSupportFollowUpRemovalPromptOpen(true);
      return;
    }

    setSupportFollowUpMode((prev) => !prev);
  };

  const handleRemoveAdminAssignedFollowUp = async () => {
    try {
      setSupportFollowUpRemovalSaving(true);
      const response = await superAdminApi.updateMySupportFollowUp(false);
      const nextSetting = normalizeSupportFilterAccessSetting(response.data?.data);
      setCurrentSupportFilterAccess(nextSetting);
      setSupportFollowUpMode(false);
      setSupportFollowUpRemovalPromptOpen(false);
    } catch (error) {
      console.warn('Failed to remove admin-assigned follow-up mode:', error);
      toast({
        title: 'Could not remove follow-up mode',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSupportFollowUpRemovalSaving(false);
    }
  };

  const getSupportFilterAccessSetting = (supportUserId: number): SupportAdminFilterAccessSetting => (
    supportFilterAccessSettings[String(supportUserId)] || createDefaultSupportFilterAccess()
  );

  const updateSupportFilterAccessSetting = (
    supportUserId: number,
    updater: (setting: SupportAdminFilterAccessSetting) => SupportAdminFilterAccessSetting
  ) => {
    setSupportFilterAccessSettings((prev) => {
      const supportUserKey = String(supportUserId);
      const currentSetting = normalizeSupportFilterAccessSetting(prev[supportUserKey]);
      return {
        ...prev,
        [supportUserKey]: updater(currentSetting),
      };
    });
  };

  const toggleExpandedSupportUser = (supportUserId: number) => {
    setExpandedSupportUserIds((prev) => (
      prev.includes(supportUserId)
        ? prev.filter((currentSupportUserId) => currentSupportUserId !== supportUserId)
        : [...prev, supportUserId]
    ));
  };

  const toggleSupportAllowedFilter = (supportUserId: number, filterId: string, checked: boolean) => {
    updateSupportFilterAccessSetting(supportUserId, (setting) => {
      const nextAllowedFilterIds = checked
        ? Array.from(new Set([...setting.allowedFilterIds, filterId]))
        : setting.allowedFilterIds.filter((currentFilterId) => currentFilterId !== filterId);

      return {
        ...setting,
        allowedFilterIds: nextAllowedFilterIds,
        defaultFilterIds: checked
          ? setting.defaultFilterIds
          : setting.defaultFilterIds.filter((currentFilterId) => currentFilterId !== filterId),
      };
    });
  };

  const toggleSupportDefaultFilter = (supportUserId: number, filterId: string, checked: boolean) => {
    updateSupportFilterAccessSetting(supportUserId, (setting) => {
      const nextDefaultFilterIds = checked
        ? Array.from(new Set([...setting.defaultFilterIds, filterId]))
        : setting.defaultFilterIds.filter((currentFilterId) => currentFilterId !== filterId);

      return {
        ...setting,
        defaultFilterIds: nextDefaultFilterIds,
        allowedFilterIds: setting.allowedFilterIds.length > 0 && checked
          ? Array.from(new Set([...setting.allowedFilterIds, filterId]))
          : setting.allowedFilterIds,
      };
    });
  };

  const toggleSupportStartFollowUp = (supportUserId: number, checked: boolean) => {
    updateSupportFilterAccessSetting(supportUserId, (setting) => ({
      ...setting,
      supportStartFollowUp: checked,
    }));
  };

  const toggleSupportHardcoreFilter = (supportUserId: number, filterId: string, checked: boolean) => {
    updateSupportFilterAccessSetting(supportUserId, (setting) => {
      const nextHardcoreFilterIds = checked
        ? Array.from(new Set([...setting.hardcoreFilterIds, filterId]))
        : setting.hardcoreFilterIds.filter((currentFilterId) => currentFilterId !== filterId);

      return {
        ...setting,
        customFilterAccess: nextHardcoreFilterIds.length > 0 || setting.hardcoreAdminIds.length > 0 ? false : true,
        frontOnly: nextHardcoreFilterIds.length > 0 || setting.hardcoreAdminIds.length > 0 ? false : setting.frontOnly,
        hardcoreFilterIds: nextHardcoreFilterIds,
      };
    });
  };

  const getSupportFilterSearchTerm = (supportUserId: number, group: 'allowed' | 'default' | 'hardcore' | 'hardcore-admin') => (
    supportFilterSearchTerms[`${supportUserId}:${group}`] || ''
  );

  const setSupportFilterSearchTerm = (
    supportUserId: number,
    group: 'allowed' | 'default' | 'hardcore' | 'hardcore-admin',
    value: string
  ) => {
    const searchKey = `${supportUserId}:${group}`;
    setSupportFilterSearchTerms((prev) => ({
      ...prev,
      [searchKey]: value,
    }));
  };

  const filterSupportFilterOptions = (filters: CustomAdminFilter[], searchTerm: string) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return filters;
    }

    return filters.filter((filter) => (
      filter.name.toLowerCase().includes(normalizedSearch) ||
      String(filter.description || '').toLowerCase().includes(normalizedSearch) ||
      filter.planNames.some((planName) => planName.toLowerCase().includes(normalizedSearch))
    ));
  };

  const filterSupportAdminOptions = (admins: AdminProfile[], searchTerm: string) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return admins;
    }

    return admins.filter((admin) => (
      `${admin.first_name} ${admin.last_name}`.toLowerCase().includes(normalizedSearch) ||
      String(admin.email || '').toLowerCase().includes(normalizedSearch) ||
      String(admin.plan_name || '').toLowerCase().includes(normalizedSearch)
    ));
  };

  const toggleSupportHardcoreAdmin = (supportUserId: number, adminId: number, checked: boolean) => {
    updateSupportFilterAccessSetting(supportUserId, (setting) => {
      const nextHardcoreAdminIds = checked
        ? Array.from(new Set([...setting.hardcoreAdminIds, adminId]))
        : setting.hardcoreAdminIds.filter((currentAdminId) => currentAdminId !== adminId);
      const hasHardcoreRules = setting.hardcoreFilterIds.length > 0 || nextHardcoreAdminIds.length > 0;

      return {
        ...setting,
        customFilterAccess: hasHardcoreRules ? false : true,
        frontOnly: hasHardcoreRules ? false : setting.frontOnly,
        hardcoreAdminIds: nextHardcoreAdminIds,
      };
    });
  };

  const toggleSupportFollowUpDone = (adminId: number) => {
    setSupportFollowUpDoneAdminIds((prev) => (
      prev.includes(adminId)
        ? prev.filter((currentAdminId) => currentAdminId !== adminId)
        : [...prev, adminId]
    ));
  };

  const resetCustomFilterEditor = () => {
    setEditingCustomFilterId(null);
    setCustomFilterDraft(createEmptyFilterDraft());
    setCustomFilterNameError('');
  };

  const handleEditCustomFilter = (filter: CustomAdminFilter) => {
    setEditingCustomFilterId(filter.id);
    setCustomFilterDraft({
      name: filter.name,
      description: filter.description || '',
      planNames: filter.planNames,
      permissionIds: filter.permissionIds,
      planStatuses: Array.isArray(filter.planStatuses) ? filter.planStatuses : [],
      joinStartDate: filter.joinStartDate,
      joinEndDate: filter.joinEndDate,
      newJoinsFirst: filter.newJoinsFirst,
      unpaidOnly: filter.unpaidOnly,
      showInFront: filter.showInFront,
    });
    setCustomFilterNameError('');
    setCustomFilterTab('create');
  };

  const handleSaveCustomFilter = () => {
    const filterName = customFilterDraft.name.trim();

    if (!filterName) {
      setCustomFilterNameError('Filter name is required');
      return;
    }

    const duplicateFilter = customFilters.some(
      (filter) => (
        filter.id !== editingCustomFilterId &&
        filter.name.trim().toLowerCase() === filterName.toLowerCase()
      )
    );

    if (duplicateFilter) {
      setCustomFilterNameError('This name filter already exists try a different one');
      return;
    }

    if (editingCustomFilterId) {
      setCustomFilters((prev) => prev.map((filter) => (
        filter.id === editingCustomFilterId
          ? {
              ...filter,
              name: filterName,
              description: customFilterDraft.description.trim(),
              planNames: customFilterDraft.planNames,
              permissionIds: customFilterDraft.permissionIds,
              planStatuses: customFilterDraft.planStatuses,
              joinStartDate: customFilterDraft.joinStartDate,
              joinEndDate: customFilterDraft.joinEndDate,
              newJoinsFirst: customFilterDraft.newJoinsFirst,
              unpaidOnly: customFilterDraft.unpaidOnly,
              showInFront: customFilterDraft.showInFront,
            }
          : filter
      )));
      toast({
        title: 'Custom filter updated',
        description: `${filterName} has been updated.`,
      });
      resetCustomFilterEditor();
      setCustomFilterTab('choose');
      return;
    }

    const nextFilter: CustomAdminFilter = {
      id: `custom-filter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: filterName,
      description: customFilterDraft.description.trim(),
      planNames: customFilterDraft.planNames,
      permissionIds: customFilterDraft.permissionIds,
      planStatuses: customFilterDraft.planStatuses,
      joinStartDate: customFilterDraft.joinStartDate,
      joinEndDate: customFilterDraft.joinEndDate,
      newJoinsFirst: customFilterDraft.newJoinsFirst,
      unpaidOnly: customFilterDraft.unpaidOnly,
      showInFront: customFilterDraft.showInFront,
      createdAt: new Date().toISOString(),
    };

    setCustomFilters((prev) => [nextFilter, ...prev]);
    setActiveCustomFilterIds((prev) => Array.from(new Set([...prev, nextFilter.id])));
    resetCustomFilterEditor();
    setCustomFilterTab('choose');
    toast({
      title: 'Custom filter created',
      description: `${nextFilter.name} is now applied.`,
    });
  };

  const handleDeleteCustomFilter = (filterId: string) => {
    setCustomFilters((prev) => prev.filter((filter) => filter.id !== filterId));
    setActiveCustomFilterIds((prev) => prev.filter((currentFilterId) => currentFilterId !== filterId));
    setSupportFilterAccessSettings((prev) => Object.entries(prev).reduce<Record<string, SupportAdminFilterAccessSetting>>((acc, [supportUserId, setting]) => {
      acc[supportUserId] = {
        ...setting,
        allowedFilterIds: setting.allowedFilterIds.filter((currentFilterId) => currentFilterId !== filterId),
        defaultFilterIds: setting.defaultFilterIds.filter((currentFilterId) => currentFilterId !== filterId),
        hardcoreFilterIds: setting.hardcoreFilterIds.filter((currentFilterId) => currentFilterId !== filterId),
      };
      return acc;
    }, {}));
    if (editingCustomFilterId === filterId) {
      resetCustomFilterEditor();
    }
    setFilterPendingDelete(null);
  };

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
      const serverError =
        (error as any)?.response?.data?.error ||
        (error as any)?.response?.data?.message ||
        (error as any)?.message ||
        `Failed to ${selectedAdmin ? 'update' : 'create'} admin profile`;
      toast({
        title: "Error",
        description: serverError,
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
      password: '',
      sendDisputeLetterEmail: true,
      sendInactivityEmail: true,
      sendReportPullReminderEmail: true,
      allowFreeClientEnrollment: false
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
      password: '',
      sendDisputeLetterEmail: normalizedAdmin.send_dispute_letter_email !== false
        && Number(normalizedAdmin.send_dispute_letter_email ?? 1) !== 0,
      sendInactivityEmail: normalizedAdmin.send_inactivity_email !== false
        && Number(normalizedAdmin.send_inactivity_email ?? 1) !== 0,
      sendReportPullReminderEmail: normalizedAdmin.send_report_pull_reminder_email !== false
        && Number(normalizedAdmin.send_report_pull_reminder_email ?? 1) !== 0,
      allowFreeClientEnrollment: normalizedAdmin.allow_free_client_enrollment !== false
        && Number(normalizedAdmin.allow_free_client_enrollment ?? 0) !== 0
    });
    setIsEditDialogOpen(true);
  };

  const handlePermissionChange = useCallback((permissionId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: normalizePortalPermissions(
        checked
          ? [
              ...prev.permissions.filter((permission) => {
                if (permissionId === SCORE_MACHINE_ELITE_PERMISSION) {
                  return permission !== SCORE_MACHINE_BASIC_PERMISSION;
                }

                if (permissionId === SCORE_MACHINE_BASIC_PERMISSION) {
                  return permission !== SCORE_MACHINE_ELITE_PERMISSION;
                }

                return true;
              }),
              permissionId,
            ]
          : prev.permissions.filter(p => p !== permissionId)
      )
    }));
  }, []);

  const getStatusBadge = (status: string) => {
    if (status === 'expired') {
      return 'bg-amber-100 text-amber-800';
    }

    if (status === 'unpaid') {
      return 'bg-orange-100 text-orange-800';
    }

    const statusConfig = STATUS_OPTIONS.find(s => s.value === status);
    return statusConfig ? statusConfig.color : 'bg-gray-100 text-gray-800';
  };



  return (
    <div className={compact ? 'space-y-3 p-0' : 'space-y-6 p-6'}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className={`${compact ? 'text-xl' : 'text-3xl'} font-bold text-gray-900`}>Admin Management</h1>
          <p className={`${compact ? 'text-xs' : ''} text-gray-600 mt-1`}>
            {readOnly ? 'View administrator accounts and saved filters' : 'Manage administrator accounts and permissions'}
          </p>
        </div>
        {!readOnly && (
        <div className="ml-auto flex flex-wrap items-center justify-end gap-4">
          <div className="flex max-w-sm items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
            <Label htmlFor="global-dispute-letter-email" className="cursor-pointer text-sm font-medium leading-tight">
              Send A Mail When Admin Generate Dispute Letter
            </Label>
            <Switch
              id="global-dispute-letter-email"
              checked={disputeLetterEmailEnabled}
              disabled={disputeLetterEmailSettingLoading || disputeLetterEmailSettingSaving}
              onCheckedChange={handleDisputeLetterEmailSettingChange}
            />
          </div>
          <div className="flex max-w-sm items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
            <Label htmlFor="admin-inactivity-email" className="cursor-pointer text-sm font-medium leading-tight">
              Send We Miss You Mail After 2 Days Inactive
            </Label>
            <Switch
              id="admin-inactivity-email"
              checked={adminInactivityEmailEnabled}
              disabled={adminInactivityEmailSettingLoading || adminInactivityEmailSettingSaving}
              onCheckedChange={handleAdminInactivityEmailSettingChange}
            />
          </div>
          <div className="flex max-w-sm items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
            <Label htmlFor="global-report-pull-reminder-email" className="cursor-pointer text-sm font-medium leading-tight">
              Send 30-Day Client Report Pull Reminder Mail
            </Label>
            <Switch
              id="global-report-pull-reminder-email"
              checked={reportPullReminderEmailEnabled}
              disabled={reportPullReminderEmailSettingLoading || reportPullReminderEmailSettingSaving}
              onCheckedChange={handleReportPullReminderEmailSettingChange}
            />
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
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className={compact ? 'p-3' : 'pt-6'}>
          <div className={compact ? 'flex flex-wrap gap-2' : 'flex flex-wrap gap-4'}>
            <div className={compact ? 'flex-1 min-w-[220px]' : 'flex-1 min-w-[300px]'}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={compact ? 'h-8 pl-9 text-sm' : 'pl-10'}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Table */}
      <Card>
        <CardHeader className={compact ? 'p-3' : undefined}>
          <CardTitle className={`${compact ? 'text-base' : ''} flex flex-wrap items-center justify-between gap-3`}>
            <span>Administrator Accounts ({displayedAdminProfiles?.length || 0})</span>
            <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
              {loading && <div className="text-sm text-gray-500">Loading...</div>}
              {readOnly && (
                <Button
                  type="button"
                  size="sm"
                  variant={supportFollowUpMode ? 'default' : 'outline'}
                  className={compact ? 'h-7 px-2 text-xs' : 'h-8'}
                  onClick={handleToggleSupportFollowUpMode}
                >
                  Start Follow-up
                </Button>
              )}
              {frontCustomFilters.map((filter) => (
                <Button
                  key={filter.id}
                  type="button"
                  size="sm"
                  variant={activeCustomFilterIds.includes(filter.id) ? 'default' : 'outline'}
                  className={`${compact ? 'h-7 px-2 text-xs' : 'h-8'} rounded-full`}
                  onClick={() => toggleActiveCustomFilter(filter.id)}
                >
                  {filter.name}
                </Button>
              ))}
              {hasActiveCustomFilters && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={`${compact ? 'h-7 px-2 text-xs' : 'h-8'} text-gray-500`}
                  onClick={clearActiveCustomFilters}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Clear
                </Button>
              )}
              {supportCustomFilterAccessEnabled && !supportFrontOnlyFilterAccess && (
              <Dialog open={isCustomFilterDialogOpen} onOpenChange={setIsCustomFilterDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={compact ? 'h-7 px-2 text-xs' : 'h-8'}
                    onClick={() => {
                      setCustomFilterTab('choose');
                      setCustomFilterNameError('');
                    }}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Custom Filter
                  </Button>
                </DialogTrigger>
                <DialogContent className={chooseFiltersOnly ? 'max-w-2xl' : 'max-w-4xl'}>
                  <DialogHeader>
                    <DialogTitle>Custom Filter</DialogTitle>
                    <DialogDescription>
                      {chooseFiltersOnly
                        ? 'Choose saved filters for administrator accounts.'
                        : 'Choose a saved filter or create a new one for administrator accounts.'}
                    </DialogDescription>
                  </DialogHeader>

                  <Tabs value={customFilterTab} onValueChange={setCustomFilterTab} className="w-full">
                    {!chooseFiltersOnly && (
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="choose">Choose Filter</TabsTrigger>
                        <TabsTrigger value="create">{editingCustomFilterId ? 'Edit Filter' : 'Create Filter'}</TabsTrigger>
                        <TabsTrigger value="support">Filters For Support</TabsTrigger>
                      </TabsList>
                    )}

                    <TabsContent value="choose" className="mt-5 space-y-3">
                      <Input
                        value={customFilterSearchTerm}
                        onChange={(event) => setCustomFilterSearchTerm(event.target.value)}
                        placeholder="Search filters"
                      />
                      {accessibleCustomFilters.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-gray-200 py-10 text-center text-sm text-gray-500">
                          {readOnly ? 'No custom filters are available for you.' : 'No custom filters yet. Create one to see it here.'}
                        </div>
                      ) : filteredCustomFilters.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-gray-200 py-10 text-center text-sm text-gray-500">
                          No filters match your search.
                        </div>
                      ) : (
                        filteredCustomFilters.map((filter) => {
                          const resultCount = applyCustomFilterToProfiles(adminProfiles, filter).length;
                          const isActive = activeCustomFilterIds.includes(filter.id);

                          return (
                            <div
                              key={filter.id}
                              className={`rounded-xl border p-4 ${isActive ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex flex-1 gap-3">
                                  <Checkbox
                                    id={`choose-custom-filter-${filter.id}`}
                                    checked={isActive}
                                    onCheckedChange={() => toggleActiveCustomFilter(filter.id)}
                                    className="mt-1"
                                  />
                                  <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Label
                                      htmlFor={`choose-custom-filter-${filter.id}`}
                                      className="cursor-pointer font-semibold text-gray-900"
                                    >
                                      {filter.name}
                                    </Label>
                                    {filter.showInFront && (
                                      <Badge variant="secondary">Shown In Front</Badge>
                                    )}
                                    {isActive && (
                                      <Badge className="bg-blue-100 text-blue-700">Active</Badge>
                                    )}
                                  </div>
                                  {filter.description && (
                                    <p className="text-sm text-gray-500">{filter.description}</p>
                                  )}
                                  <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                                    {filter.planNames.length > 0 ? (
                                      filter.planNames.map((planName) => (
                                        <Badge key={planName} variant="outline">{planName}</Badge>
                                      ))
                                    ) : (
                                      <Badge variant="outline">All Plans</Badge>
                                    )}
                                    {filter.permissionIds.map((permissionId) => (
                                      <Badge key={permissionId} variant="outline">
                                        {PERMISSIONS.find((permission) => permission.id === permissionId)?.label || permissionId}
                                      </Badge>
                                    ))}
                                    {filter.planStatuses.map((status) => (
                                      <Badge key={status} variant="outline">
                                        Plan Status: {PLAN_STATUS_OPTIONS.find((option) => option.value === status)?.label || formatStatusLabel(status)}
                                      </Badge>
                                    ))}
                                    {(filter.joinStartDate || filter.joinEndDate) && (
                                      <Badge variant="outline">
                                        Joined {filter.joinStartDate || 'Any'} to {filter.joinEndDate || 'Any'}
                                      </Badge>
                                    )}
                                    {filter.newJoinsFirst && <Badge variant="outline">New Joins First</Badge>}
                                    {filter.unpaidOnly && <Badge variant="outline">Unpaid Only</Badge>}
                                    <span className="self-center">{resultCount} result{resultCount === 1 ? '' : 's'}</span>
                                  </div>
                                  </div>
                                </div>
                                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={isActive ? 'default' : 'outline'}
                                    onClick={() => toggleActiveCustomFilter(filter.id)}
                                  >
                                    {isActive ? 'Selected' : 'Select'}
                                  </Button>
                                  {!chooseFiltersOnly && (
                                    <>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEditCustomFilter(filter)}
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                        onClick={() => setFilterPendingDelete(filter)}
                                      >
                                        Delete
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </TabsContent>

                    {!chooseFiltersOnly && (
                    <TabsContent value="create" className="mt-5 space-y-5">
                      {editingCustomFilterId && (
                        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                          Editing saved filter. Update it or reset to create a new one.
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="custom-filter-name">Filter Name</Label>
                        <Input
                          id="custom-filter-name"
                          value={customFilterDraft.name}
                          onChange={(event) => {
                            setCustomFilterDraft((prev) => ({ ...prev, name: event.target.value }));
                            setCustomFilterNameError('');
                          }}
                          placeholder="Filter Name"
                        />
                        {customFilterNameError && (
                          <p className="text-sm text-red-600">{customFilterNameError}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="custom-filter-description">Filter Description (Optional)</Label>
                        <Input
                          id="custom-filter-description"
                          value={customFilterDraft.description}
                          onChange={(event) => setCustomFilterDraft((prev) => ({ ...prev, description: event.target.value }))}
                          placeholder="Filter Description (Optional)"
                        />
                      </div>

                      <div className="space-y-4 rounded-xl border border-gray-200 p-4">
                        <div>
                          <h4 className="font-semibold text-gray-900">Filter Logics</h4>
                          <p className="text-sm text-gray-500">
                            Select purchased plans, permissions, plan status, join period, then add optional rules.
                          </p>
                        </div>

                        <div className="space-y-3">
                          <Label>Purchased Plan</Label>
                          <Popover open={isPurchasedPlanDropdownOpen} onOpenChange={setIsPurchasedPlanDropdownOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-between text-left font-normal"
                              >
                                <span className="truncate">
                                  {customFilterDraft.planNames.length > 0
                                    ? `${customFilterDraft.planNames.length} plan${customFilterDraft.planNames.length === 1 ? '' : 's'} selected`
                                    : 'Select purchased plans'}
                                </span>
                                <Filter className="ml-2 h-4 w-4 shrink-0 text-gray-400" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="z-[1200] w-[var(--radix-popover-trigger-width)] min-w-[360px] p-3"
                              align="start"
                              side="bottom"
                              sideOffset={8}
                            >
                              <div className="space-y-3">
                                <Input
                                  value={purchasedPlanSearchTerm}
                                  onChange={(event) => setPurchasedPlanSearchTerm(event.target.value)}
                                  placeholder="Search purchased plans"
                                />
                                <div className="max-h-72 space-y-2 overflow-y-auto">
                                  {loadingPlanOptions ? (
                                    <div className="text-sm text-gray-500">Loading plans...</div>
                                  ) : filteredPurchasedPlanNames.length === 0 ? (
                                    <div className="text-sm text-gray-500">No plans found.</div>
                                  ) : (
                                    filteredPurchasedPlanNames.map((planName) => (
                                      <div key={planName} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50">
                                        <Checkbox
                                          id={`custom-filter-plan-${planName}`}
                                          checked={customFilterDraft.planNames.includes(planName)}
                                          onCheckedChange={(checked) => toggleDraftPlan(planName, checked === true)}
                                        />
                                        <Label
                                          htmlFor={`custom-filter-plan-${planName}`}
                                          className="cursor-pointer text-sm font-normal"
                                        >
                                          {planName}
                                        </Label>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          {customFilterDraft.planNames.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {customFilterDraft.planNames.map((planName) => (
                                <Badge key={planName} variant="outline">{planName}</Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Permission Filter Logic
                        <div className="space-y-3">
                          <Label>Permissions</Label>
                          <div className="grid max-h-48 gap-3 overflow-y-auto rounded-lg border border-gray-100 p-3 sm:grid-cols-2">
                            {PERMISSIONS.map((permission) => (
                              <div key={permission.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`custom-filter-permission-${permission.id}`}
                                  checked={customFilterDraft.permissionIds.includes(permission.id)}
                                  onCheckedChange={(checked) => toggleDraftPermission(permission.id, checked === true)}
                                />
                                <Label
                                  htmlFor={`custom-filter-permission-${permission.id}`}
                                  className="cursor-pointer text-sm font-normal"
                                >
                                  {permission.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                        */}

                        <div className="space-y-3">
                          <Label>Plan Status</Label>
                          <div className="grid gap-3 rounded-lg border border-gray-100 p-3 sm:grid-cols-2">
                            {PLAN_STATUS_OPTIONS.map((status) => (
                              <div key={status.value} className="flex items-center gap-2">
                                <Checkbox
                                  id={`custom-filter-plan-status-${status.value}`}
                                  checked={customFilterDraft.planStatuses.includes(status.value)}
                                  onCheckedChange={(checked) => toggleDraftPlanStatus(status.value, checked === true)}
                                />
                                <Label
                                  htmlFor={`custom-filter-plan-status-${status.value}`}
                                  className="cursor-pointer text-sm font-normal leading-tight"
                                >
                                  <span>{status.label}</span>
                                  {status.description && (
                                    <span className="block text-xs text-gray-500">{status.description}</span>
                                  )}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label>Join Period</Label>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="custom-filter-join-start" className="text-xs text-gray-500">
                                Start Date
                              </Label>
                              <Input
                                id="custom-filter-join-start"
                                type="date"
                                value={customFilterDraft.joinStartDate}
                                onChange={(event) => setCustomFilterDraft((prev) => ({ ...prev, joinStartDate: event.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="custom-filter-join-end" className="text-xs text-gray-500">
                                End Date
                              </Label>
                              <Input
                                id="custom-filter-join-end"
                                type="date"
                                value={customFilterDraft.joinEndDate}
                                onChange={(event) => setCustomFilterDraft((prev) => ({ ...prev, joinEndDate: event.target.value }))}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="custom-filter-new-joins"
                              checked={customFilterDraft.newJoinsFirst}
                              onCheckedChange={(checked) => setCustomFilterDraft((prev) => ({ ...prev, newJoinsFirst: checked === true }))}
                            />
                            <Label htmlFor="custom-filter-new-joins" className="cursor-pointer text-sm font-normal">
                              New Joins
                            </Label>
                          </div>
                        </div>
                      </div>

                      <DialogFooter className="flex flex-col gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            resetCustomFilterEditor();
                          }}
                        >
                          {editingCustomFilterId ? 'Cancel Edit' : 'Reset'}
                        </Button>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="custom-filter-front"
                            checked={customFilterDraft.showInFront}
                            onCheckedChange={(checked) => setCustomFilterDraft((prev) => ({ ...prev, showInFront: checked === true }))}
                          />
                          <Label htmlFor="custom-filter-front" className="cursor-pointer text-sm font-normal">
                            Show In Front
                          </Label>
                        </div>
                        <Button type="button" onClick={handleSaveCustomFilter}>
                          {editingCustomFilterId ? 'Update Filter' : 'Create Filter'}
                        </Button>
                      </DialogFooter>
                    </TabsContent>
                    )}

                    {!chooseFiltersOnly && (
                    <TabsContent value="support" className="mt-5 space-y-4">
                      <Input
                        value={supportUserSearchTerm}
                        onChange={(event) => setSupportUserSearchTerm(event.target.value)}
                        placeholder="Search support users"
                      />

                      {filteredSupportUsers.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-gray-200 py-10 text-center text-sm text-gray-500">
                          No support users found.
                        </div>
                      ) : (
                        <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                          {filteredSupportUsers.map((supportUser) => {
                            const setting = getSupportFilterAccessSetting(supportUser.id);
                            const isExpanded = expandedSupportUserIds.includes(supportUser.id);
                            const supportUserName = `${supportUser.first_name} ${supportUser.last_name}`.trim() || supportUser.email;
                            const allowedFilterSearchTerm = getSupportFilterSearchTerm(supportUser.id, 'allowed');
                            const defaultFilterSearchTerm = getSupportFilterSearchTerm(supportUser.id, 'default');
                            const hardcoreFilterSearchTerm = getSupportFilterSearchTerm(supportUser.id, 'hardcore');
                            const hardcoreAdminSearchTerm = getSupportFilterSearchTerm(supportUser.id, 'hardcore-admin');
                            const filteredAllowedFilters = filterSupportFilterOptions(customFilters, allowedFilterSearchTerm);
                            const filteredDefaultFilters = filterSupportFilterOptions(customFilters, defaultFilterSearchTerm);
                            const filteredHardcoreFilters = filterSupportFilterOptions(customFilters, hardcoreFilterSearchTerm);
                            const filteredHardcoreAdmins = filterSupportAdminOptions(supportHardcoreAdminOptions, hardcoreAdminSearchTerm);
                            const supportHasHardcoreRules = setting.hardcoreFilterIds.length > 0 || setting.hardcoreAdminIds.length > 0;

                            return (
                              <div key={supportUser.id} className="rounded-xl border-2 border-gray-300 bg-white shadow-sm">
                                <button
                                  type="button"
                                  className="flex w-full items-center justify-between gap-3 rounded-t-xl bg-gray-50 px-4 py-3 text-left hover:bg-gray-100"
                                  onClick={() => toggleExpandedSupportUser(supportUser.id)}
                                >
                                  <div>
                                    <div className="font-semibold text-gray-900">{supportUserName}</div>
                                    <div className="text-sm text-gray-500">{supportUser.email}</div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {!setting.customFilterAccess && <Badge variant="outline">No Filter Access</Badge>}
                                    {setting.customFilterAccess && setting.frontOnly && <Badge variant="secondary">Front Only</Badge>}
                                    {setting.defaultFilterIds.length > 0 && (
                                      <Badge className="bg-blue-100 text-blue-700">{setting.defaultFilterIds.length} default</Badge>
                                    )}
                                    {supportHasHardcoreRules && (
                                      <Badge className="bg-red-100 text-red-700">
                                        {setting.hardcoreFilterIds.length + setting.hardcoreAdminIds.length} hardcore
                                      </Badge>
                                    )}
                                    <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  </div>
                                </button>

                                {isExpanded && (
                                  <div className="space-y-4 border-t-2 border-gray-200 bg-white px-4 py-4">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <div className="flex items-start gap-2 rounded-lg border-2 border-gray-200 bg-gray-50 p-3">
                                        <Checkbox
                                          id={`support-filter-access-${supportUser.id}`}
                                          checked={setting.customFilterAccess && !supportHasHardcoreRules}
                                          onCheckedChange={(checked) => updateSupportFilterAccessSetting(supportUser.id, (prev) => ({
                                            ...prev,
                                            customFilterAccess: checked === true,
                                            frontOnly: checked === true ? prev.frontOnly : false,
                                            hardcoreFilterIds: checked === true ? [] : prev.hardcoreFilterIds,
                                            hardcoreAdminIds: checked === true ? [] : prev.hardcoreAdminIds,
                                          }))}
                                        />
                                        <div>
                                          <Label htmlFor={`support-filter-access-${supportUser.id}`} className="cursor-pointer text-sm font-medium">
                                            Custom Filter
                                          </Label>
                                          <p className="text-xs text-gray-500">
                                            Uncheck to hide all custom filters and front filters for this support user.
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex items-start gap-2 rounded-lg border-2 border-gray-200 bg-gray-50 p-3">
                                        <Checkbox
                                          id={`support-filter-front-only-${supportUser.id}`}
                                          checked={setting.frontOnly}
                                          disabled={!setting.customFilterAccess || supportHasHardcoreRules}
                                          onCheckedChange={(checked) => updateSupportFilterAccessSetting(supportUser.id, (prev) => ({
                                            ...prev,
                                            frontOnly: checked === true,
                                          }))}
                                        />
                                        <div>
                                          <Label htmlFor={`support-filter-front-only-${supportUser.id}`} className="cursor-pointer text-sm font-medium">
                                            Only Front Custom Filter
                                          </Label>
                                          <p className="text-xs text-gray-500">
                                            Hide the Custom Filter popup and only show filters marked Show In Front.
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="rounded-lg border-2 border-gray-300 bg-slate-50 p-3">
                                      <div className="mb-3 flex items-center justify-between gap-3">
                                        <div>
                                          <Label className="text-sm font-semibold">Only Show This Filters</Label>
                                          <p className="text-xs text-gray-500">
                                            If none are checked, all custom filters are accessible.
                                          </p>
                                        </div>
                                        <Badge variant="outline">
                                          {setting.allowedFilterIds.length > 0 ? `${setting.allowedFilterIds.length} selected` : 'All filters'}
                                        </Badge>
                                      </div>
                                      <Input
                                        value={allowedFilterSearchTerm}
                                        onChange={(event) => setSupportFilterSearchTerm(supportUser.id, 'allowed', event.target.value)}
                                        placeholder="Search filters"
                                        className="mb-3 bg-white"
                                      />
                                      <div className="grid max-h-44 gap-2 overflow-y-auto sm:grid-cols-2">
                                        {customFilters.length === 0 ? (
                                          <div className="text-sm text-gray-500">No filters created yet.</div>
                                        ) : filteredAllowedFilters.length === 0 ? (
                                          <div className="text-sm text-gray-500">No filters match your search.</div>
                                        ) : (
                                          filteredAllowedFilters.map((filter) => (
                                            <div key={filter.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50">
                                              <Checkbox
                                                id={`support-allowed-filter-${supportUser.id}-${filter.id}`}
                                                checked={setting.allowedFilterIds.includes(filter.id)}
                                                disabled={!setting.customFilterAccess || supportHasHardcoreRules}
                                                onCheckedChange={(checked) => toggleSupportAllowedFilter(supportUser.id, filter.id, checked === true)}
                                              />
                                              <Label
                                                htmlFor={`support-allowed-filter-${supportUser.id}-${filter.id}`}
                                                className="cursor-pointer text-sm font-normal"
                                              >
                                                {filter.name}
                                              </Label>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    </div>

                                    <div className="rounded-lg border-2 border-blue-200 bg-blue-50/50 p-3">
                                      <div className="mb-3 flex items-center justify-between gap-3">
                                        <div>
                                          <Label className="text-sm font-semibold">Choosed Filter For The Support</Label>
                                          <p className="text-xs text-gray-500">
                                            These filters are selected by default for this support user.
                                          </p>
                                        </div>
                                        <Badge variant="outline">
                                          {setting.defaultFilterIds.length} selected
                                        </Badge>
                                      </div>
                                      <div className="mb-3 flex items-start gap-2 rounded-lg border border-blue-100 bg-white p-3">
                                        <Checkbox
                                          id={`support-start-follow-up-${supportUser.id}`}
                                          checked={setting.supportStartFollowUp}
                                          onCheckedChange={(checked) => toggleSupportStartFollowUp(supportUser.id, checked === true)}
                                        />
                                        <div>
                                          <Label htmlFor={`support-start-follow-up-${supportUser.id}`} className="cursor-pointer text-sm font-medium">
                                            Start Follow Up For The Support
                                          </Label>
                                          <p className="text-xs text-gray-500">
                                            Turn on follow-up mode by default for this support user.
                                          </p>
                                        </div>
                                      </div>
                                      <Input
                                        value={defaultFilterSearchTerm}
                                        onChange={(event) => setSupportFilterSearchTerm(supportUser.id, 'default', event.target.value)}
                                        placeholder="Search filters"
                                        className="mb-3 bg-white"
                                      />
                                      <div className="grid max-h-44 gap-2 overflow-y-auto sm:grid-cols-2">
                                        {customFilters.length === 0 ? (
                                          <div className="text-sm text-gray-500">No filters created yet.</div>
                                        ) : filteredDefaultFilters.length === 0 ? (
                                          <div className="text-sm text-gray-500">No filters match your search.</div>
                                        ) : (
                                          filteredDefaultFilters.map((filter) => {
                                            const restrictedByAllowList = setting.allowedFilterIds.length > 0 && !setting.allowedFilterIds.includes(filter.id);

                                            return (
                                              <div key={filter.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50">
                                                <Checkbox
                                                  id={`support-default-filter-${supportUser.id}-${filter.id}`}
                                                  checked={setting.defaultFilterIds.includes(filter.id)}
                                                  disabled={!setting.customFilterAccess || supportHasHardcoreRules || restrictedByAllowList}
                                                  onCheckedChange={(checked) => toggleSupportDefaultFilter(supportUser.id, filter.id, checked === true)}
                                                />
                                                <Label
                                                  htmlFor={`support-default-filter-${supportUser.id}-${filter.id}`}
                                                  className={`cursor-pointer text-sm font-normal ${restrictedByAllowList ? 'text-gray-400' : ''}`}
                                                >
                                                  {filter.name}
                                                </Label>
                                              </div>
                                            );
                                          })
                                        )}
                                      </div>
                                    </div>

                                    <div className="rounded-lg border-2 border-red-200 bg-red-50/60 p-3">
                                      <div className="mb-3 flex items-center justify-between gap-3">
                                        <div>
                                          <Label className="text-sm font-semibold">Hardcore Filter For The Support</Label>
                                          <p className="text-xs text-gray-500">
                                            These filters are forced silently. The support user cannot change them.
                                          </p>
                                        </div>
                                        <Badge className="bg-red-100 text-red-700">
                                          {setting.hardcoreFilterIds.length} selected
                                        </Badge>
                                      </div>
                                      <Input
                                        value={hardcoreFilterSearchTerm}
                                        onChange={(event) => setSupportFilterSearchTerm(supportUser.id, 'hardcore', event.target.value)}
                                        placeholder="Search filters"
                                        className="mb-3 bg-white"
                                      />
                                      <div className="grid max-h-44 gap-2 overflow-y-auto sm:grid-cols-2">
                                        {customFilters.length === 0 ? (
                                          <div className="text-sm text-gray-500">No filters created yet.</div>
                                        ) : filteredHardcoreFilters.length === 0 ? (
                                          <div className="text-sm text-gray-500">No filters match your search.</div>
                                        ) : (
                                          filteredHardcoreFilters.map((filter) => (
                                            <div key={filter.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-red-100/70">
                                              <Checkbox
                                                id={`support-hardcore-filter-${supportUser.id}-${filter.id}`}
                                                checked={setting.hardcoreFilterIds.includes(filter.id)}
                                                onCheckedChange={(checked) => toggleSupportHardcoreFilter(supportUser.id, filter.id, checked === true)}
                                              />
                                              <Label
                                                htmlFor={`support-hardcore-filter-${supportUser.id}-${filter.id}`}
                                                className="cursor-pointer text-sm font-normal"
                                              >
                                                {filter.name}
                                              </Label>
                                            </div>
                                          ))
                                        )}
                                      </div>

                                      <div className="mt-4 rounded-lg border-2 border-red-100 bg-white p-3">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                          <div>
                                            <Label className="text-sm font-semibold">Choosed Admin For The HardCore</Label>
                                            <p className="text-xs text-gray-500">
                                              Selected admins always show for this support user.
                                            </p>
                                          </div>
                                          <Badge className="bg-red-100 text-red-700">
                                            {setting.hardcoreAdminIds.length} selected
                                          </Badge>
                                        </div>
                                        <Input
                                          value={hardcoreAdminSearchTerm}
                                          onChange={(event) => setSupportFilterSearchTerm(supportUser.id, 'hardcore-admin', event.target.value)}
                                          placeholder="Search admins by name, email, or plan"
                                          className="mb-3 bg-white"
                                        />
                                        <div className="grid max-h-52 gap-2 overflow-y-auto sm:grid-cols-2">
                                          {supportHardcoreAdminOptions.length === 0 ? (
                                            <div className="text-sm text-gray-500">No admins loaded yet.</div>
                                          ) : filteredHardcoreAdmins.length === 0 ? (
                                            <div className="text-sm text-gray-500">No admins match your search.</div>
                                          ) : (
                                            filteredHardcoreAdmins.map((admin) => {
                                              const adminName = `${admin.first_name} ${admin.last_name}`.trim() || admin.email;

                                              return (
                                                <div key={admin.id} className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-red-100/70">
                                                  <Checkbox
                                                    id={`support-hardcore-admin-${supportUser.id}-${admin.id}`}
                                                    checked={setting.hardcoreAdminIds.includes(Number(admin.id))}
                                                    onCheckedChange={(checked) => toggleSupportHardcoreAdmin(supportUser.id, Number(admin.id), checked === true)}
                                                  />
                                                  <Label
                                                    htmlFor={`support-hardcore-admin-${supportUser.id}-${admin.id}`}
                                                    className="cursor-pointer text-sm font-normal leading-tight"
                                                  >
                                                    <span className="block font-medium text-gray-900">{adminName}</span>
                                                    <span className="block text-xs text-gray-500">{admin.email}</span>
                                                    {admin.plan_name && (
                                                      <span className="block text-xs text-gray-400">{admin.plan_name}</span>
                                                    )}
                                                  </Label>
                                                </div>
                                              );
                                            })
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>
                    )}
                  </Tabs>
                </DialogContent>
              </Dialog>
              )}
              {!chooseFiltersOnly && (
              <AlertDialog open={Boolean(filterPendingDelete)} onOpenChange={(open) => !open && setFilterPendingDelete(null)}>
                <AlertDialogContent className="border-red-200 bg-red-50">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-red-700">Delete Custom Filter?</AlertDialogTitle>
                    <AlertDialogDescription className="text-red-600">
                      This will permanently delete {filterPendingDelete?.name ? `"${filterPendingDelete.name}"` : 'this filter'} from your saved custom filters.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-red-200 text-red-700 hover:bg-red-100">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 text-white hover:bg-red-700"
                      onClick={() => {
                        if (filterPendingDelete) {
                          handleDeleteCustomFilter(filterPendingDelete.id);
                        }
                      }}
                    >
                      Delete Filter
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              )}
              <AlertDialog open={Boolean(supportFilterOverridePrompt)} onOpenChange={(open) => !open && setSupportFilterOverridePrompt(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Admin Already Choosed Currents Filters For You</AlertDialogTitle>
                    <AlertDialogDescription>
                      These filters were selected by admin for your support account. You can keep them or choose filters any way.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Admin Filters</AlertDialogCancel>
                    <AlertDialogAction onClick={handleChooseSupportFiltersAnyway}>
                      Choose Filter Any Way
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <AlertDialog open={supportFollowUpRemovalPromptOpen} onOpenChange={setSupportFollowUpRemovalPromptOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Admin Set Follow Up For You</AlertDialogTitle>
                    <AlertDialogDescription>
                      Follow-up mode was enabled by your admin. You can keep it on or remove it anyway.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep It</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={supportFollowUpRemovalSaving}
                      onClick={(event) => {
                        event.preventDefault();
                        void handleRemoveAdminAssignedFollowUp();
                      }}
                    >
                      {supportFollowUpRemovalSaving ? 'Removing...' : 'Remove Any Way'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className={compact ? 'px-3 pb-3 pt-0' : undefined}>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading admin profiles...</p>
            </div>
          ) : (
            <>
              <div className={`overflow-x-auto ${compact ? 'text-xs' : ''}`}>
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
                      <TableHead className="font-semibold">Plan Status</TableHead>
                      <TableHead className="font-semibold">Last Login</TableHead>
                      <TableHead className="font-semibold">Join</TableHead>
                      <TableHead className="font-semibold">Permissions</TableHead>
                      {readOnly && supportFollowUpMode && <TableHead className="font-semibold text-right">Follow-up</TableHead>}
                      {!readOnly && <TableHead className="font-semibold text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedAdminProfiles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={adminTableColumnCount} className="py-10 text-center text-sm text-gray-500">
                          No administrator accounts match the selected filters.
                        </TableCell>
                      </TableRow>
                    ) : displayedAdminProfiles?.map((admin) => {
                      const referrerLabel = getAdminReferrerLabel(admin);
                      const displayStatus = getAdminDisplayStatus(admin);
                      const adminId = Number(admin.id);
                      const isFollowUpDone = supportFollowUpDoneAdminIdSet.has(adminId);

                      return (
                      <TableRow
                        key={admin.id}
                        className={`group transition-colors ${
                          readOnly && supportFollowUpMode
                            ? isFollowUpDone
                              ? 'cursor-pointer bg-green-100 hover:bg-green-200'
                              : 'cursor-pointer hover:bg-blue-50'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={(event) => {
                          if (!readOnly || !supportFollowUpMode) {
                            return;
                          }

                          const target = event.target as HTMLElement;
                          if (target.closest('button, a, input, select, textarea, [role="button"], [role="checkbox"]')) {
                            return;
                          }

                          toggleSupportFollowUpDone(adminId);
                        }}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium">{admin.first_name} {admin.last_name}</div>
                              <div className="text-sm text-gray-500">{admin.email}</div>
                              <div className="mt-1 flex items-center gap-2">
                                {referrerLabel ? (
                                  readOnly ? (
                                    <Badge className="bg-emerald-50 text-emerald-700">
                                      Ref By {referrerLabel}
                                    </Badge>
                                  ) : (
                                  <button
                                    type="button"
                                    onClick={() => openReferralDialog(admin)}
                                    className="inline-flex"
                                  >
                                    <Badge className="cursor-pointer bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                                      Ref By {referrerLabel}
                                    </Badge>
                                  </button>
                                  )
                                ) : (
                                  !readOnly && (
                                    <button
                                      type="button"
                                      onClick={() => openReferralDialog(admin)}
                                      className="rounded-full border border-dashed border-blue-200 px-2.5 py-0.5 text-xs font-medium text-blue-600 opacity-0 transition-opacity hover:border-blue-300 hover:bg-blue-50 group-hover:opacity-100"
                                    >
                                      Add Ref
                                    </button>
                                  )
                                )}
                              </div>
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
                          <Badge className={getStatusBadge(displayStatus)}>
                            {formatStatusLabel(displayStatus)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatAdminDate(admin.last_login, 'Never')}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatAdminJoinDate(admin.created_at)}
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
                        {readOnly && supportFollowUpMode && (
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant={isFollowUpDone ? 'default' : 'outline'}
                              className={isFollowUpDone ? 'bg-green-600 hover:bg-green-700' : ''}
                              onClick={() => toggleSupportFollowUpDone(adminId)}
                            >
                              {isFollowUpDone ? 'Done' : 'Mark As Done'}
                            </Button>
                          </TableCell>
                        )}
                        {!readOnly && (
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
                        )}
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-500">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, displayedAdminProfiles.length)} of {displayedAdminProfiles.length} results
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

      <Dialog open={isReferralDialogOpen} onOpenChange={closeReferralDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {referralAdmin
                ? `Choose Affiliate For ${referralAdmin.first_name} ${referralAdmin.last_name}`
                : 'Choose Affiliate'}
            </DialogTitle>
            <DialogDescription>
              Search affiliates and assign one as the referrer for this administrator. Click the current referrer to remove it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={affiliateSearchTerm}
                onChange={(e) => setAffiliateSearchTerm(e.target.value)}
                placeholder="Search affiliates by name or email..."
                className="pl-10"
              />
            </div>

            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {loadingAffiliates ? (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 py-12 text-sm text-gray-500">
                  Loading affiliates...
                </div>
              ) : filteredAffiliateOptions.length === 0 ? (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 py-12 text-sm text-gray-500">
                  No affiliates found.
                </div>
              ) : (
                filteredAffiliateOptions.map((affiliate) => {
                  const affiliateName = getAffiliateDisplayName(affiliate);
                  const isCurrentReferrer = referralAdmin?.referred_by_affiliate_id === affiliate.id;
                  const isSavingThisAffiliate = savingAffiliateId === affiliate.id;

                  return (
                    <button
                      key={affiliate.id}
                      type="button"
                      onClick={() => isCurrentReferrer ? handleClearAffiliateReferrer() : handleAssignAffiliateReferrer(affiliate)}
                      disabled={savingAffiliateId !== null}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        isCurrentReferrer
                          ? 'border-red-300 bg-red-50 hover:border-red-400 hover:bg-red-100'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      } ${savingAffiliateId !== null ? 'cursor-not-allowed opacity-70' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-medium text-gray-900">{affiliateName}</div>
                          <div className="text-sm text-gray-500">{affiliate.email}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isCurrentReferrer && (
                            <Badge variant="secondary" className="bg-red-100 text-red-700">
                              Current Ref
                            </Badge>
                          )}
                          <span className={`text-sm font-medium ${isCurrentReferrer ? 'text-red-600' : 'text-blue-600'}`}>
                            {isSavingThisAffiliate ? (isCurrentReferrer ? 'Removing...' : 'Saving...') : isCurrentReferrer ? 'Delete Ref' : 'Choose'}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
