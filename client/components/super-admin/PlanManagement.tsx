import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, DollarSign, Users, Calendar, Check, X, Shield, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { superAdminApi, coursesApi } from "@/lib/api";
// WebSocket removed to eliminate connection errors

// Available admin dashboard pages that can be controlled
const SCORE_MACHINE_ELITE_PAGE = 'score-machine-elite';
const SCORE_MACHINE_BASIC_PAGE = 'score-machine-basic';
const SCORE_MACHINE_PORTAL_PAGE_IDS = [SCORE_MACHINE_ELITE_PAGE, SCORE_MACHINE_BASIC_PAGE] as const;

const ADMIN_PAGES = [
  { id: 'dashboard', name: 'Dashboard', path: '/dashboard', description: 'Main dashboard overview' },
  { id: 'clients', name: 'Clients', path: '/clients', description: 'Client management' },
  { id: 'employees', name: 'Employees', path: '/employees', description: 'Employee management' },
  { id: 'reports', name: 'Reports', path: '/reports', description: 'Credit reports' },
  { id: 'credit-report', name: 'Credit Report', path: '/credit-report', description: 'Individual credit report view' },
  { id: 'credit-reports-scraper', name: 'Credit Reports Scraper', path: '/credit-reports/scraper', description: 'Credit report scraping tool' },
  { id: 'credit-reports-scraper-logs', name: 'Scraper Logs', path: '/credit-reports/scraper-logs', description: 'Scraper activity logs' },
  { id: 'ai-coach', name: 'AI Coach', path: '/ai-coach', description: 'AI coaching features' },
  { id: 'school', name: 'School', path: '/school', description: 'Educational content' },
  { id: 'analytics', name: 'Analytics', path: '/analytics', description: 'Analytics and insights' },
  { id: 'score-machine-elite', name: 'Score Machine Elite', path: '/score-machine-elite', description: 'Score Machine Elite access' },
  { id: 'score-machine-basic', name: 'Score Machine Basic', path: '/score-machine-basic', description: 'Score Machine Basic access' },
  { id: 'affiliate', name: 'Affiliate', path: '/affiliate', description: 'Affiliate program management' },
  { id: 'support', name: 'Support', path: '/support', description: 'Customer support and help desk' },
  { id: 'settings', name: 'Settings', path: '/settings', description: 'Account and system settings' }
];

const normalizePortalPagePermissions = (pagePermissions: string[]) => {
  const uniquePermissions = Array.from(new Set(pagePermissions));
  const hasElite = uniquePermissions.includes(SCORE_MACHINE_ELITE_PAGE);
  const hasBasic = uniquePermissions.includes(SCORE_MACHINE_BASIC_PAGE);

  if (hasElite && hasBasic) {
    return uniquePermissions.filter((pagePermission) => pagePermission !== SCORE_MACHINE_BASIC_PAGE);
  }

  return uniquePermissions;
};

interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  price: number;
  billing_cycle: 'monthly' | 'yearly' | 'lifetime';
  features: string[];
  page_permissions?: string[]; // New field for page access control
  assigned_courses?: number[]; // New field for course assignments
  trial_price_id?: string;
  stripe_monthly_price_id?: string;
  stripe_yearly_price_id?: string;
  stripe_product_id?: string;
  max_users?: number;
  max_clients?: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  is_specific?: boolean;
  allowed_admin_emails?: string[];
  restricted_to_current_subscribers?: boolean;
  allowed_affiliate_ids?: number[];
}

interface Course {
  id: number;
  title: string;
  description: string;
  instructor: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  price?: number;
}

interface Affiliate {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  company_name?: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  referral_slug?: string;
}

interface PlanFormData {
  name: string;
  description: string;
  price: number;
  billing_cycle: 'monthly' | 'yearly' | 'lifetime';
  features: string[];
  page_permissions: string[]; // New field for page access control
  assigned_courses: number[]; // New field for course assignments
  trial_price_id?: string;
  stripe_monthly_price_id?: string;
  stripe_yearly_price_id?: string;
  stripe_product_id?: string;
  max_users?: number;
  max_clients?: number;
  is_active: boolean;
  sort_order: number;
  is_specific: boolean;
  allowed_admin_emails: string[];
  restricted_to_current_subscribers: boolean;
  allowed_affiliate_ids: number[];
}

const initialFormData: PlanFormData = {
  name: '',
  description: '',
  price: 0,
  billing_cycle: 'monthly',
  features: [],
  page_permissions: [], // Initialize empty page permissions
  assigned_courses: [], // Initialize empty course assignments
  trial_price_id: '',
  stripe_monthly_price_id: '',
  stripe_yearly_price_id: '',
  stripe_product_id: '',
  max_users: undefined,
  max_clients: undefined,
  is_active: true,
  sort_order: 0,
  is_specific: false,
  allowed_admin_emails: [],
  restricted_to_current_subscribers: false,
  allowed_affiliate_ids: []
};

export default function PlanManagement() {
  console.log('🚀 PlanManagement component mounted');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(initialFormData);
  const [newFeature, setNewFeature] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [allowedEmailsText, setAllowedEmailsText] = useState('');
  const [affiliateSearchTerm, setAffiliateSearchTerm] = useState('');
  // WebSocket functionality removed to eliminate connection errors

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading subscription plans...');
      const limit = 100;
      const maxPages = 1000;
      let page = 1;
      let pages = 1;
      const allPlans: any[] = [];

      while (page <= pages && page <= maxPages) {
        const response = await superAdminApi.getPlans({ page, limit });
        console.log('✅ Plans API response:', response);
        console.log('📊 Raw response.data:', response.data);
        const plansData = response.data?.data || response.data || [];
        const batch = Array.isArray(plansData) ? plansData : [];
        allPlans.push(...batch);

        const paginationPages = Number((response.data as any)?.pagination?.pages);
        if (!Number.isNaN(paginationPages) && paginationPages > 0) {
          pages = paginationPages;
        } else {
          pages = 1;
        }

        page += 1;
      }

      const uniquePlans = Array.from(
        new Map(allPlans.map((p: any) => [String(p?.id ?? ''), p])).values()
      ).filter((p: any) => String(p?.id ?? '') !== '');

      console.log('📊 Plans data length:', uniquePlans.length);
      console.log('📊 Individual plans:', uniquePlans.map((p: any) => ({ id: p.id, name: p.name })));
      
      // Check for duplicates in the data
      const planIds = uniquePlans.map((p: any) => p.id);
      const uniqueIds = [...new Set(planIds)];
      console.log('🔍 Plan IDs:', planIds);
      console.log('🔍 Unique IDs:', uniqueIds);
      console.log('🔍 Has duplicates:', planIds.length !== uniqueIds.length);
      
      // Debug: Log data for inspection
      if (uniquePlans.length > 0) {
        console.warn('PLANS DEBUG:', { count: uniquePlans.length, ids: planIds, hasDuplicates: planIds.length !== uniqueIds.length });
      }
      
      setPlans(uniquePlans);
      console.log('✅ Plans state updated, count:', uniquePlans.length);
    } catch (error) {
      console.error('❌ Error loading plans:', error);
      toast.error('Failed to load subscription plans');
      setPlans([]); // Ensure plans is always an array even on error
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCourses = useCallback(async () => {
    try {
      console.log('📚 Loading courses...');
      const response = await coursesApi.getCourses();
      console.log('✅ Courses loaded:', response.data);
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('❌ Error loading courses:', error);
      toast.error('Failed to load courses');
    }
  }, []);

  const loadAffiliates = useCallback(async () => {
    try {
      const response = await superAdminApi.getAffiliates({ page: 1, limit: 10000 });
      const list = response.data?.data;
      setAffiliates(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('❌ Error loading affiliates:', error);
      setAffiliates([]);
    }
  }, []);

  useEffect(() => {
    console.log('🔄 useEffect triggered - about to load plans');
    loadPlans();
    loadCourses();
    loadAffiliates();
  }, [loadPlans, loadCourses, loadAffiliates]);

  const handleCreatePlan = () => {
    setEditingPlan(null);
    setFormData({
      ...initialFormData,
      assigned_courses: [],
      page_permissions: []
    });
    setAffiliateSearchTerm('');
    setAllowedEmailsText('');
    setIsDialogOpen(true);
  };

  const handlePagePermissionChange = (pageId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      page_permissions: normalizePortalPagePermissions(
        checked
          ? [
              ...prev.page_permissions.filter((existingPageId) => {
                if (pageId === SCORE_MACHINE_ELITE_PAGE) {
                  return existingPageId !== SCORE_MACHINE_BASIC_PAGE;
                }

                if (pageId === SCORE_MACHINE_BASIC_PAGE) {
                  return existingPageId !== SCORE_MACHINE_ELITE_PAGE;
                }

                return true;
              }),
              pageId,
            ]
          : prev.page_permissions.filter(id => id !== pageId)
      )
    }));
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      billing_cycle: plan.billing_cycle,
      features: [...plan.features],
      page_permissions: normalizePortalPagePermissions(plan.page_permissions || []),
      assigned_courses: plan.assigned_courses || [],
      trial_price_id: plan.trial_price_id || '',
      stripe_monthly_price_id: plan.stripe_monthly_price_id || '',
      stripe_yearly_price_id: plan.stripe_yearly_price_id || '',
      stripe_product_id: plan.stripe_product_id || '',
      max_users: plan.max_users,
      max_clients: plan.max_clients,
      is_active: plan.is_active,
      sort_order: plan.sort_order,
      is_specific: !!plan.is_specific,
      allowed_admin_emails: Array.isArray(plan.allowed_admin_emails) ? plan.allowed_admin_emails : [],
      restricted_to_current_subscribers: !!plan.restricted_to_current_subscribers,
      allowed_affiliate_ids: Array.isArray(plan.allowed_affiliate_ids) ? plan.allowed_affiliate_ids : []
    });
    setAllowedEmailsText(Array.isArray(plan.allowed_admin_emails) ? plan.allowed_admin_emails.join(', ') : '');
    setAffiliateSearchTerm('');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const normalizedEmails = allowedEmailsText
        .split(/[\,\n]/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
      const payload = {
        ...formData,
        allowed_admin_emails: normalizedEmails,
        page_permissions: {
          pages: normalizePortalPagePermissions(formData.page_permissions),
          is_specific: formData.is_specific,
          allowed_admin_emails: normalizedEmails,
          restricted_to_current_subscribers: formData.restricted_to_current_subscribers,
          allowed_affiliate_ids: formData.allowed_affiliate_ids
        }
      };
      if (editingPlan) {
        await superAdminApi.updatePlan(editingPlan.id, payload);
        toast.success('Plan updated successfully');
      } else {
        await superAdminApi.createPlan(payload);
        toast.success('Plan created successfully');
      }
      
      setIsDialogOpen(false);
      setFormData(initialFormData);
      setAllowedEmailsText('');
      setEditingPlan(null);
      await loadPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error(editingPlan ? 'Failed to update plan' : 'Failed to create plan');
    }
  };

  const handleDeletePlan = async (planId: number) => {
    if (!confirm('Are you sure you want to delete this plan? This action cannot be undone.')) {
      return;
    }

    try {
      await superAdminApi.deletePlan(planId);
      toast.success('Plan deleted successfully');
      await loadPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Failed to delete plan');
    }
  };

  const addFeature = () => {
    if (newFeature.trim() && !formData.features.includes(newFeature.trim())) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()]
      }));
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const filteredPlans = (Array.isArray(plans) ? plans : []).filter(plan => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    const normalizedPlanName = String(plan.name || '').toLowerCase();
    const normalizedPlanDescription = String(plan.description || '').toLowerCase();
    const matchesSearch =
      normalizedSearchTerm.length === 0 ||
      normalizedPlanName.includes(normalizedSearchTerm) ||
      normalizedPlanDescription.includes(normalizedSearchTerm);
    const matchesFilter = filterActive === null || plan.is_active === filterActive;
    return matchesSearch && matchesFilter;
  });
  const activeAffiliates = affiliates.filter((affiliate) => affiliate.status === 'active');
  const filteredActiveAffiliates = activeAffiliates.filter((affiliate) => {
    const query = affiliateSearchTerm.trim().toLowerCase();
    if (!query) return true;

    const fullName = `${affiliate.first_name} ${affiliate.last_name}`.trim().toLowerCase();
    const companyName = String(affiliate.company_name || '').toLowerCase();
    const email = String(affiliate.email || '').toLowerCase();
    const referralSlug = String(affiliate.referral_slug || '').toLowerCase();

    return fullName.includes(query)
      || companyName.includes(query)
      || email.includes(query)
      || referralSlug.includes(query);
  });
  
  // Debug filtered plans
  console.log('🎯 Original plans count:', plans.length);
  console.log('🎯 Filtered plans count:', filteredPlans.length);
  console.log('🎯 Filtered plan IDs:', filteredPlans.map(p => p.id));

  const getBillingCycleColor = (cycle: string) => {
    switch (cycle) {
      case 'monthly': return 'bg-blue-100 text-blue-800';
      case 'yearly': return 'bg-green-100 text-green-800';
      case 'lifetime': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Plan Management</h2>
          <p className="text-muted-foreground">Manage subscription plans and pricing</p>
        </div>
        <Button onClick={handleCreatePlan}>
          <Plus className="mr-2 h-4 w-4" />
          Create Plan
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search plans..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterActive?.toString() || 'all'} onValueChange={(value) => {
              setFilterActive(value === 'all' ? null : value === 'true');
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="true">Active Only</SelectItem>
                <SelectItem value="false">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Plans ({filteredPlans.length})</CardTitle>
          <CardDescription>
            Manage your subscription plans, pricing, and features
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Billing Cycle</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead>Limits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{plan.name}</div>
                        <div className="text-sm text-muted-foreground">{plan.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        {Number(plan.price || 0).toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getBillingCycleColor(plan.billing_cycle)}>
                        {plan.billing_cycle}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {plan.features.slice(0, 2).map((feature, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                        {plan.features.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{plan.features.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        {plan.max_users && (
                          <div className="flex items-center">
                            <Users className="h-3 w-3 mr-1" />
                            {plan.max_users} users
                          </div>
                        )}
                        {plan.max_clients && (
                          <div className="text-muted-foreground">
                            {plan.max_clients} clients
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={plan.is_active ? "default" : "secondary"}>
                        {plan.is_active ? (
                          <><Check className="h-3 w-3 mr-1" />Active</>
                        ) : (
                          <><X className="h-3 w-3 mr-1" />Inactive</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditPlan(plan)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeletePlan(plan.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Plan Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl gap-0 overflow-hidden p-0 max-sm:inset-x-4 max-sm:top-4 max-sm:bottom-auto max-sm:m-0 max-sm:w-auto">
          <div className="flex max-h-[90vh] min-h-0 flex-col">
            <DialogHeader className="border-b px-6 py-4 pr-12">
              <DialogTitle>
                {editingPlan ? 'Edit Plan' : 'Create New Plan'}
              </DialogTitle>
              <DialogDescription>
                {editingPlan ? 'Update the subscription plan details' : 'Create a new subscription plan with pricing and features'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Plan Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  required
                />
              </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="billing_cycle">Billing Cycle</Label>
                    <Select value={formData.billing_cycle} onValueChange={(value: 'monthly' | 'yearly' | 'lifetime') => {
                      setFormData(prev => ({ ...prev, billing_cycle: value }));
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                        <SelectItem value="lifetime">Lifetime</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="sort_order">Sort Order</Label>
                    <Input
                      id="sort_order"
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                {/* Stripe Price IDs */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Stripe Product and Price IDs</Label>
                    <span className="text-xs text-muted-foreground">Used for live Checkout sessions</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="stripe_product_id">Stripe Product ID</Label>
                      <Input
                        id="stripe_product_id"
                        placeholder="prod_..."
                        value={formData.stripe_product_id || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, stripe_product_id: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="trial_price_id">Trial Price ID</Label>
                      <Input
                        id="trial_price_id"
                        placeholder="price_..."
                        value={formData.trial_price_id || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, trial_price_id: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="stripe_monthly_price_id">Monthly Price ID</Label>
                      <Input
                        id="stripe_monthly_price_id"
                        placeholder="price_..."
                        value={formData.stripe_monthly_price_id || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, stripe_monthly_price_id: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="stripe_yearly_price_id">Yearly Price ID</Label>
                      <Input
                        id="stripe_yearly_price_id"
                        placeholder="price_..."
                        value={formData.stripe_yearly_price_id || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, stripe_yearly_price_id: e.target.value }))}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave blank if not applicable. Trial Price ID is used for monthly checkout when present; otherwise checkout uses the normal monthly or yearly price ID.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="max_users">Max Users</Label>
                    <Input
                      id="max_users"
                      type="number"
                      min="1"
                      value={formData.max_users || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_users: e.target.value ? parseInt(e.target.value) : undefined }))}
                      placeholder="Unlimited"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_clients">Max Clients</Label>
                    <Input
                      id="max_clients"
                      type="number"
                      min="1"
                      value={formData.max_clients || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_clients: e.target.value ? parseInt(e.target.value) : undefined }))}
                      placeholder="Unlimited"
                    />
                  </div>
                </div>

                <div>
                  <Label>Features</Label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={newFeature}
                        onChange={(e) => setNewFeature(e.target.value)}
                        placeholder="Add a feature..."
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                      />
                      <Button type="button" onClick={addFeature}>
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.features.map((feature, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {feature}
                          <button
                            type="button"
                            onClick={() => removeFeature(index)}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Page Access Permissions */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-4 w-4" />
                    <Label>Admin Dashboard Page Access</Label>
                  </div>
                  <div className="space-y-3 rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      Select which admin dashboard pages will be accessible for this plan
                    </p>
                    <div className="mb-4 space-y-3 rounded-lg border p-3">
                      <p className="text-sm font-medium">
                        Score Machine Elite | Score Machine Basic
                      </p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {ADMIN_PAGES.filter((page) => SCORE_MACHINE_PORTAL_PAGE_IDS.includes(page.id as (typeof SCORE_MACHINE_PORTAL_PAGE_IDS)[number])).map((page) => (
                          <div key={page.id} className="flex items-start space-x-2">
                            <Checkbox
                              id={`page-${page.id}`}
                              checked={formData.page_permissions.includes(page.id)}
                              onCheckedChange={(checked) => handlePagePermissionChange(page.id, checked as boolean)}
                            />
                            <div className="grid gap-1.5 leading-none">
                              <label
                                htmlFor={`page-${page.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {page.name}
                              </label>
                              <p className="text-xs text-muted-foreground">
                                {page.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {ADMIN_PAGES.filter((page) => !SCORE_MACHINE_PORTAL_PAGE_IDS.includes(page.id as (typeof SCORE_MACHINE_PORTAL_PAGE_IDS)[number])).map((page) => (
                        <div key={page.id} className="flex items-start space-x-2">
                          <Checkbox
                            id={`page-${page.id}`}
                            checked={formData.page_permissions.includes(page.id)}
                            onCheckedChange={(checked) => handlePagePermissionChange(page.id, checked as boolean)}
                          />
                          <div className="grid gap-1.5 leading-none">
                            <label
                              htmlFor={`page-${page.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {page.name}
                            </label>
                            <p className="text-xs text-muted-foreground">
                              {page.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is_specific"
                          checked={formData.is_specific}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_specific: !!checked }))}
                        />
                        <Label htmlFor="is_specific">Specific plan (visible only to selected admins)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="restricted_to_current_subscribers"
                          checked={formData.restricted_to_current_subscribers}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, restricted_to_current_subscribers: !!checked }))}
                        />
                        <Label htmlFor="restricted_to_current_subscribers">Restricted to current subscribers</Label>
                      </div>
                      <div>
                        <Label htmlFor="allowed_admin_emails">Allowed Admin Emails</Label>
                        <Textarea
                          id="allowed_admin_emails"
                          placeholder="admin1@example.com, admin2@example.com"
                          value={allowedEmailsText}
                          onChange={(e) => setAllowedEmailsText(e.target.value)}
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Comma or newline separated</p>
                      </div>
                    </div>
                    {formData.page_permissions.length > 0 && (
                      <div className="mt-3 border-t pt-3">
                        <p className="text-sm font-medium mb-2">Selected Pages ({formData.page_permissions.length}):</p>
                        <div className="flex flex-wrap gap-1">
                          {formData.page_permissions.map((pageId) => {
                            const page = ADMIN_PAGES.find(p => p.id === pageId);
                            return page ? (
                              <Badge key={pageId} variant="outline" className="text-xs">
                                {page.name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Course Assignment */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="h-4 w-4" />
                    <Label>Course Access</Label>
                  </div>
                  <div className="space-y-3 rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      Select which courses will be included in this plan. Users with this plan will have automatic access to these courses.
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                      {courses.map((course) => (
                        <div key={course.id} className="flex items-start space-x-2">
                          <Checkbox
                            id={`course-${course.id}`}
                            checked={formData.assigned_courses.includes(course.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  assigned_courses: [...prev.assigned_courses, course.id]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  assigned_courses: prev.assigned_courses.filter(id => id !== course.id)
                                }));
                              }
                            }}
                          />
                          <div className="grid flex-1 gap-1.5 leading-none">
                            <label
                              htmlFor={`course-${course.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {course.title}
                            </label>
                            <p className="text-xs text-muted-foreground">
                              {course.description} • Instructor: {course.instructor} • Level: {course.difficulty}
                              {course.price && ` • Price: $${course.price}`}
                            </p>
                          </div>
                        </div>
                      ))}
                      {courses.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No courses available. Create courses first to assign them to plans.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4" />
                    <Label>Affiliate Visibility</Label>
                  </div>
                  <div className="space-y-3 rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      If you select affiliates, this plan is only visible on their landing pages and for users referred by them.
                    </p>
                    <Input
                      value={affiliateSearchTerm}
                      onChange={(e) => setAffiliateSearchTerm(e.target.value)}
                      placeholder="Search affiliates by name, company, email, or slug..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Showing {filteredActiveAffiliates.length} of {activeAffiliates.length} active affiliates
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                      {filteredActiveAffiliates.map((affiliate) => (
                        <div key={affiliate.id} className="flex items-start space-x-2">
                          <Checkbox
                            id={`affiliate-${affiliate.id}`}
                            checked={formData.allowed_affiliate_ids.includes(affiliate.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  allowed_affiliate_ids: [...prev.allowed_affiliate_ids, affiliate.id]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  allowed_affiliate_ids: prev.allowed_affiliate_ids.filter(id => id !== affiliate.id)
                                }));
                              }
                            }}
                          />
                          <div className="grid flex-1 gap-1.5 leading-none">
                            <label
                              htmlFor={`affiliate-${affiliate.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {`${affiliate.first_name} ${affiliate.last_name}`.trim() || affiliate.email}
                            </label>
                            <p className="text-xs text-muted-foreground">
                              {affiliate.company_name || affiliate.email}
                              {affiliate.referral_slug ? ` • Slug: ${affiliate.referral_slug}` : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                      {filteredActiveAffiliates.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {activeAffiliates.length === 0 ? 'No active affiliates found.' : 'No affiliates match your search.'}
                        </p>
                      )}
                    </div>
                    {formData.allowed_affiliate_ids.length > 0 && (
                      <div className="pt-2">
                        <p className="text-sm font-medium mb-2">Selected Affiliates ({formData.allowed_affiliate_ids.length}):</p>
                        <div className="flex flex-wrap gap-1">
                          {formData.allowed_affiliate_ids.map((affiliateId) => {
                            const affiliate = affiliates.find(a => a.id === affiliateId);
                            const label = affiliate
                              ? (`${affiliate.first_name} ${affiliate.last_name}`.trim() || affiliate.email)
                              : `Affiliate #${affiliateId}`;
                            return (
                              <Badge key={affiliateId} variant="outline" className="text-xs">
                                {label}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label htmlFor="is_active">Active Plan</Label>
                </div>
              </div>

              <DialogFooter className="border-t px-6 py-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
