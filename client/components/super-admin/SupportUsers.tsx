import React, { useState, useEffect } from 'react';
import { superAdminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Key, 
  LogIn,
  Users, 
  UserCheck, 
  UserX, 
  Calendar,
  MoreHorizontal,
  Eye,
  EyeOff,
  Filter, 
  Download, 
  Mail,
  Phone,
  Clock,
  CheckCircle,
  Pause,
  Shield
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface SupportUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  last_login: string;
  created_at: string;
  updated_at: string;
  department: string;
  title: string;
}

interface SupportUserStats {
  totalSupportUsers: number;
  activeSupportUsers: number;
  inactiveSupportUsers: number;
  newSupportUsersToday: number;
}

const SupportUsers: React.FC = () => {
  const [supportUsers, setSupportUsers] = useState<SupportUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SupportUserStats>({
    totalSupportUsers: 0,
    activeSupportUsers: 0,
    inactiveSupportUsers: 0,
    newSupportUsersToday: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SupportUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    department: 'Support',
    title: 'Support Agent'
  });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchSupportUsers();
  }, [pagination.page, searchTerm, statusFilter]);

  // CRUD Operations
  const handleCreateUser = async () => {
    try {
      await superAdminApi.createSupportUser(formData);
      toast({
        title: "Success",
        description: "Support user created successfully",
      });
      setIsCreateDialogOpen(false);
      resetForm();
      fetchSupportUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create support user",
        variant: "destructive",
      });
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    try {
      await superAdminApi.updateSupportUser(selectedUser.id, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        department: formData.department,
        title: formData.title
      });
      toast({
        title: "Success",
        description: "Support user updated successfully",
      });
      setIsEditDialogOpen(false);
      resetForm();
      fetchSupportUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update support user",
        variant: "destructive",
      });
    }
  };

  const handleChangePassword = async () => {
    if (!selectedUser || !formData.password) return;
    try {
      await superAdminApi.changeSupportUserPassword(selectedUser.id, formData.password);
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
      setIsPasswordDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to change password",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await superAdminApi.deleteSupportUser(selectedUser.id);
      toast({
        title: "Success",
        description: "Support user deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      fetchSupportUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete support user",
        variant: "destructive",
      });
    }
  };

  const handleLoginAsUser = async (user: SupportUser) => {
    try {
      console.log('Attempting to login as support user:', user.id);
      const response = await superAdminApi.loginAsSupportUser(user.id);
      
      console.log('Login API response:', response);
      
      // Check if response has error
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (response.data?.token && response.data?.user) {
        console.log('Valid response received, storing auth data');
        // Store the support user's token and info in localStorage
        localStorage.setItem('auth_token', response.data.token);
        localStorage.setItem('userRole', response.data.user.role);
        localStorage.setItem('userId', response.data.user.id.toString());
        localStorage.setItem('userName', `${response.data.user.first_name} ${response.data.user.last_name}`);
        
        // Open support dashboard in new tab - the token will be available there
        window.open('/support/dashboard', '_blank');
        
        toast({
          title: "Success",
          description: `Logged in as ${user.first_name} ${user.last_name}`,
        });
      } else {
        console.error('Invalid response structure:', response);
        throw new Error(`Invalid response from login API. Expected token and user data, got: ${JSON.stringify(response)}`);
      }
    } catch (error) {
      console.error('Login as support user error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to login as support user",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      department: 'Support',
      title: 'Support Agent'
    });
    setSelectedUser(null);
    setShowPassword(false);
  };

  const openEditDialog = (user: SupportUser) => {
    setSelectedUser(user);
    setFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      password: '',
      department: user.department || 'Support',
      title: user.title || 'Support Agent'
    });
    setIsEditDialogOpen(true);
  };

  const openPasswordDialog = (user: SupportUser) => {
    setSelectedUser(user);
    setFormData(prev => ({ ...prev, password: '' }));
    setIsPasswordDialogOpen(true);
  };

  const openDeleteDialog = (user: SupportUser) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const fetchSupportUsers = async () => {
    try {
      setLoading(true);
      const response = await superAdminApi.getSupportUsers({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        is_active: statusFilter === 'all' ? undefined : (statusFilter === 'active' ? 'true' : 'false'),
      });
      
      console.log('API Response:', response);
      
      // Check if the response is successful and has data
      if (!response) {
        console.error('No response received from API');
        throw new Error('No response received from API');
      }
      
      // Handle both success and error responses
      if (response.error) {
        console.error('API returned error:', response.error);
        throw new Error(response.error);
      }
      
      // Handle the response structure properly - the actual data is nested at response.data.data
      const users = Array.isArray(response.data?.data) ? response.data.data : [];
      console.log('Processed users:', users);
      
      setSupportUsers(users);
      setStats({
        totalSupportUsers: response.data?.pagination?.total || users.length,
        activeSupportUsers: users.filter((user: any) => user.status === 'active').length,
        inactiveSupportUsers: users.filter((user: any) => user.status === 'inactive').length,
        newSupportUsersToday: 0, // This would need to be calculated on the backend
      });
      setPagination(prev => ({
        ...prev,
        total: response.data?.pagination?.total || users.length,
        totalPages: response.data?.pagination?.totalPages || Math.ceil(users.length / pagination.limit),
      }));
    } catch (error) {
      console.error('Error fetching support users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch support users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };



  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Inactive</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Support Users</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Manage and monitor support team members
          </p>
        </div>
        <div className="flex gap-3">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add New User
              </Button>
            </DialogTrigger>
          </Dialog>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Support Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.totalSupportUsers || 0}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Users</p>
                <p className="text-2xl font-bold text-green-600">{stats?.activeSupportUsers || 0}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Inactive Users</p>
                <p className="text-2xl font-bold text-red-600">{stats?.inactiveSupportUsers || 0}</p>
              </div>
              <div className="h-12 w-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                <UserX className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">New Today</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.newSupportUsersToday || 0}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); handleSearch(searchTerm); }} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </form>
        </CardContent>
      </Card>

      {/* Support Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Support Users ({supportUsers?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supportUsers?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {user.first_name} {user.last_name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              ID: {user.id}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.department}</p>
                          <p className="text-sm text-gray-500">{user.title}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(user.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{formatDateTime(user.last_login)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{formatDate(user.created_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openEditDialog(user)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openPasswordDialog(user)}>
                              <Key className="mr-2 h-4 w-4" />
                              Change Password
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleLoginAsUser(user)}>
                              <LogIn className="mr-2 h-4 w-4" />
                              Login as User
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(user)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {supportUsers?.length === 0 && !loading && (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No support users found</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePageChange(Math.min(pagination.totalPages, pagination.page + 1))}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Support User</DialogTitle>
            <DialogDescription>
              Add a new support team member to the system.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="John"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john.doe@company.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password"
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="Support"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Support Agent"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Support User</DialogTitle>
            <DialogDescription>
              Update the support user's information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_first_name">First Name</Label>
                <Input
                  id="edit_first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="John"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_last_name">Last Name</Label>
                <Input
                  id="edit_last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_email">Email</Label>
              <Input
                id="edit_email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john.doe@company.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_department">Department</Label>
                <Input
                  id="edit_department"
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="Support"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_title">Title</Label>
                <Input
                  id="edit_title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Support Agent"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleEditUser}>Update User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedUser?.first_name} {selectedUser?.last_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new_password">New Password</Label>
              <div className="relative">
                <Input
                  id="new_password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter new password"
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsPasswordDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword}>Change Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the support user account for{' '}
              <strong>{selectedUser?.first_name} {selectedUser?.last_name}</strong> and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SupportUsers;