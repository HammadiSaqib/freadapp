import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Eye, Users, DollarSign, TrendingUp, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';

interface Affiliate {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  phone?: string;
  commissionRate: number;
  totalEarnings: number;
  totalReferrals: number;
  status: 'active' | 'inactive' | 'suspended';
  lastLogin: string;
  created: string;
  adminId: number;
  adminEmail: string;
  adminName: string;
  // Hierarchical fields
  parentAffiliateId?: string;
  parentCommissionRate?: number;
  affiliateLevel: number;
  parentInfo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface AffiliateFormData {
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  phone: string;
  commissionRate: number;
  password: string;
  // Hierarchical fields
  parentAffiliateId?: string;
  parentCommissionRate?: number;
}

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  suspended: 'bg-red-100 text-red-800'
};

export default function AffiliateManagement() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [formData, setFormData] = useState<AffiliateFormData>({
    email: '',
    firstName: '',
    lastName: '',
    companyName: '',
    phone: '',
    commissionRate: 10,
    password: '',
    parentAffiliateId: '',
    parentCommissionRate: 0
  });

  useEffect(() => {
    fetchAffiliates();
  }, []);

  const fetchAffiliates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/affiliate-management', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAffiliates(data.data || []);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch affiliates',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error fetching affiliates:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch affiliates',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAffiliate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/affiliate-management', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Affiliate created successfully'
        });
        setIsCreateDialogOpen(false);
        resetForm();
        fetchAffiliates();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to create affiliate',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error creating affiliate:', error);
      toast({
        title: 'Error',
        description: 'Failed to create affiliate',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateAffiliate = async () => {
    if (!selectedAffiliate) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/affiliate-management/${selectedAffiliate.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          companyName: formData.companyName,
          phone: formData.phone,
          commissionRate: formData.commissionRate,
          status: selectedAffiliate.status
        })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Affiliate updated successfully'
        });
        setIsEditDialogOpen(false);
        resetForm();
        fetchAffiliates();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to update affiliate',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error updating affiliate:', error);
      toast({
        title: 'Error',
        description: 'Failed to update affiliate',
        variant: 'destructive'
      });
    }
  };

  const handleToggleStatus = async (affiliate: Affiliate) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/affiliate-management/${affiliate.id}/toggle-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: 'Success',
          description: result.message
        });
        fetchAffiliates();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to toggle status',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle status',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteAffiliate = async (affiliate: Affiliate) => {
    if (!confirm(`Are you sure you want to deactivate ${affiliate.firstName} ${affiliate.lastName}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/affiliate-management/${affiliate.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Affiliate deactivated successfully'
        });
        fetchAffiliates();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to deactivate affiliate',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error deactivating affiliate:', error);
      toast({
        title: 'Error',
        description: 'Failed to deactivate affiliate',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      companyName: '',
      phone: '',
      commissionRate: 10,
      password: '',
      parentAffiliateId: '',
      parentCommissionRate: 0
    });
    setSelectedAffiliate(null);
  };

  const openEditDialog = (affiliate: Affiliate) => {
    setSelectedAffiliate(affiliate);
    setFormData({
      email: affiliate.email,
      firstName: affiliate.firstName,
      lastName: affiliate.lastName,
      companyName: affiliate.companyName || '',
      phone: affiliate.phone || '',
      commissionRate: affiliate.commissionRate,
      password: '',
      parentAffiliateId: affiliate.parentAffiliateId || '',
      parentCommissionRate: affiliate.parentCommissionRate || 0
    });
    setIsEditDialogOpen(true);
  };

  const filteredAffiliates = affiliates.filter(affiliate => {
    const matchesSearch = 
      affiliate.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      affiliate.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      affiliate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (affiliate.companyName && affiliate.companyName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || affiliate.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Sort affiliates hierarchically
  const sortAffiliatesHierarchically = (affiliates: Affiliate[]): Affiliate[] => {
    const affiliateMap = new Map<string, Affiliate>();
    const children = new Map<string, Affiliate[]>();
    const roots: Affiliate[] = [];

    // Build maps
    affiliates.forEach(affiliate => {
      affiliateMap.set(affiliate.id, affiliate);
      if (!affiliate.parentAffiliateId) {
        roots.push(affiliate);
      } else {
        if (!children.has(affiliate.parentAffiliateId)) {
          children.set(affiliate.parentAffiliateId, []);
        }
        children.get(affiliate.parentAffiliateId)!.push(affiliate);
      }
    });

    // Recursive function to build hierarchy
    const buildHierarchy = (affiliate: Affiliate): Affiliate[] => {
      const result = [affiliate];
      const childAffiliates = children.get(affiliate.id) || [];
      childAffiliates.sort((a, b) => a.firstName.localeCompare(b.firstName));
      
      childAffiliates.forEach(child => {
        result.push(...buildHierarchy(child));
      });
      
      return result;
    };

    // Sort roots and build complete hierarchy
    roots.sort((a, b) => a.firstName.localeCompare(b.firstName));
    const sortedAffiliates: Affiliate[] = [];
    roots.forEach(root => {
      sortedAffiliates.push(...buildHierarchy(root));
    });

    return sortedAffiliates;
  };

  const hierarchicalAffiliates = sortAffiliatesHierarchically(filteredAffiliates);

  // Calculate summary stats
  const totalAffiliates = affiliates.length;
  const activeAffiliates = affiliates.filter(a => a.status === 'active').length;
  const totalEarnings = affiliates.reduce((sum, a) => sum + a.totalEarnings, 0);
  const totalReferrals = affiliates.reduce((sum, a) => sum + a.totalReferrals, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Affiliate Management</h1>
          <p className="text-muted-foreground">Manage your affiliate partners and track their performance</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Affiliate
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Affiliate</DialogTitle>
              <DialogDescription>
                Add a new affiliate partner to your network.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name (Optional)</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Company Inc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commissionRate">Commission Rate (%)</Label>
                <Input
                  id="commissionRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.commissionRate}
                  onChange={(e) => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) || 0 })}
                  placeholder="10"
                />
              </div>
              
              {/* Hierarchical Fields */}
              <div className="space-y-2">
                <Label htmlFor="parentAffiliate">Parent Affiliate (Optional)</Label>
                <Select 
                  value={formData.parentAffiliateId || ''} 
                  onValueChange={(value) => setFormData({ ...formData, parentAffiliateId: value || undefined })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent affiliate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Parent (Top Level)</SelectItem>
                    {affiliates
                      .filter(a => a.status === 'active')
                      .map(affiliate => (
                        <SelectItem key={affiliate.id} value={affiliate.id}>
                          {affiliate.firstName} {affiliate.lastName} ({affiliate.email})
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
              
              {formData.parentAffiliateId && (
                <div className="space-y-2">
                  <Label htmlFor="parentCommissionRate">Parent Commission Rate (%)</Label>
                  <Input
                    id="parentCommissionRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.parentCommissionRate || 0}
                    onChange={(e) => setFormData({ ...formData, parentCommissionRate: parseFloat(e.target.value) || 0 })}
                    placeholder="5"
                  />
                  <p className="text-xs text-muted-foreground">
                    Commission rate that the parent affiliate will receive from this affiliate's referrals
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAffiliate}>
                Create Affiliate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Affiliates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAffiliates}</div>
            <p className="text-xs text-muted-foreground">
              {activeAffiliates} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Across all affiliates
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReferrals}</div>
            <p className="text-xs text-muted-foreground">
              Successful conversions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalAffiliates > 0 ? Math.round((activeAffiliates / totalAffiliates) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Active affiliates
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Affiliate List</CardTitle>
          <CardDescription>
            Manage your affiliate partners and their performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search affiliates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Affiliates Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Earnings</TableHead>
                  <TableHead>Referrals</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hierarchicalAffiliates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {searchTerm || statusFilter !== 'all' 
                          ? 'No affiliates match your filters' 
                          : 'No affiliates found. Create your first affiliate to get started.'}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  hierarchicalAffiliates.map((affiliate) => (
                    <TableRow key={affiliate.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {'  '.repeat(affiliate.affiliateLevel - 1)}
                            {affiliate.affiliateLevel > 1 && '└─ '}
                            {affiliate.firstName} {affiliate.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {affiliate.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          Level {affiliate.affiliateLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {affiliate.parentInfo ? (
                          <div>
                            <div className="font-medium text-sm">
                              {affiliate.parentInfo.firstName} {affiliate.parentInfo.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {affiliate.parentCommissionRate}% commission
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Top Level</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {affiliate.companyName || '-'}
                      </TableCell>
                      <TableCell>
                        {affiliate.commissionRate}%
                      </TableCell>
                      <TableCell>
                        ${affiliate.totalEarnings.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {affiliate.totalReferrals}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[affiliate.status]}>
                          {affiliate.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {affiliate.lastLogin 
                          ? new Date(affiliate.lastLogin).toLocaleDateString()
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(affiliate)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(affiliate)}>
                              <Activity className="h-4 w-4 mr-2" />
                              {affiliate.status === 'active' ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteAffiliate(affiliate)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Affiliate</DialogTitle>
            <DialogDescription>
              Update affiliate information and settings.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editFirstName">First Name</Label>
                <Input
                  id="editFirstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editLastName">Last Name</Label>
                <Input
                  id="editLastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmail">Email</Label>
              <Input
                id="editEmail"
                type="email"
                value={formData.email}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCompanyName">Company Name</Label>
              <Input
                id="editCompanyName"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Company Inc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPhone">Phone</Label>
              <Input
                id="editPhone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCommissionRate">Commission Rate (%)</Label>
              <Input
                id="editCommissionRate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.commissionRate}
                onChange={(e) => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) || 0 })}
                placeholder="10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAffiliate}>
              Update Affiliate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}