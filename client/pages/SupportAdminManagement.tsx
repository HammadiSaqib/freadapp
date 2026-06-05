import { useState, useEffect } from "react";
import SupportLayout from "@/components/SupportLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  Shield,
  User,
  Mail,
  Calendar,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  UserCheck,
  UserX,
  AlertCircle,
  Loader2,
  UserCog
} from "lucide-react";
import { KeyRound, Copy } from "lucide-react";

// Interface for regular admin accounts only - Super admins are managed separately
interface Admin {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "admin"; // Only regular admins, never "super-admin"
  status: "active" | "inactive" | "suspended";
  permissions: string[];
  lastLogin: string;
  created: string;
  createdBy: string;
  department?: string;
  phone?: string;
  // Subscription information
  subscription?: {
    id: number;
    plan_name: string;
    plan_type: 'monthly' | 'yearly' | 'lifetime';
    status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete';
    current_period_start?: string;
    current_period_end?: string;
    cancel_at_period_end: boolean;
  };
}

export default function SupportAdminManagement() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState<Partial<Admin>>({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    role: "admin",
    status: "active",
    permissions: [],
    department: "",
    phone: ""
  });
  const [passwordData, setPasswordData] = useState<{ newPassword: string; confirmPassword: string }>({
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [passwordResult, setPasswordResult] = useState<string | null>(null);

  // Available permissions for regular admins only - excludes super admin privileges
  const availablePermissions = [
    { id: "users.read", label: "View Users", category: "Users" },
    { id: "users.write", label: "Manage Users", category: "Users" },
    { id: "disputes.read", label: "View Disputes", category: "Disputes" },
    { id: "disputes.write", label: "Manage Disputes", category: "Disputes" },
    { id: "reports.read", label: "View Reports", category: "Reports" },
    { id: "reports.write", label: "Manage Reports", category: "Reports" },
    { id: "analytics.read", label: "View Analytics", category: "Analytics" },
    { id: "billing.read", label: "View Billing", category: "Billing" },
    { id: "settings.read", label: "View Settings", category: "Settings" }
    // Note: Super admin permissions (admin.create, admin.delete, system.config) are intentionally excluded
  ];

  // Security function to ensure only regular admins are managed
  const isRegularAdmin = (admin: any): admin is Admin => {
    return admin.role === "admin" && admin.role !== "super-admin";
  };

  // Fetch admins from API
  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get('/api/admin-management');
        const adminData = response.data?.data || []; // Access nested data property
        const filteredData = Array.isArray(adminData) ? adminData.filter(isRegularAdmin) : [];
        setAdmins(filteredData); // Only show regular admins
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to fetch admin data');
        console.error('Error fetching admins:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdmins();
  }, []);

  const departments = ["Customer Operations", "Analytics", "Operations", "Billing", "Compliance"];

  const filteredAdmins = admins.filter(admin => {
    // Security check: Only show regular admins, never super admins
    if (!isRegularAdmin(admin)) return false;
    
    const matchesSearch = admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         `${admin.firstName} ${admin.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || admin.status === statusFilter;
    const matchesDepartment = departmentFilter === "all" || admin.department === departmentFilter;
    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 border-green-200";
      case "inactive": return "bg-gray-100 text-gray-800 border-gray-200";
      case "suspended": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <CheckCircle className="h-4 w-4" />;
      case "inactive": return <XCircle className="h-4 w-4" />;
      case "suspended": return <AlertTriangle className="h-4 w-4" />;
      default: return <XCircle className="h-4 w-4" />;
    }
  };

  const handleCreateAdmin = async () => {
    try {
      setLoading(true);
      const response = await api.post('/api/admin-management', newAdmin);
      const createdAdmin = response.data;
      if (isRegularAdmin(createdAdmin)) {
        setAdmins([...admins, createdAdmin]);
      }
      setNewAdmin({
        username: "",
        email: "",
        firstName: "",
        lastName: "",
        role: "admin",
        status: "active",
        permissions: [],
        department: "",
        phone: ""
      });
      setIsCreateDialogOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create admin');
      console.error('Error creating admin:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAdmin = async () => {
    if (selectedAdmin) {
      try {
        setLoading(true);
        const response = await api.put(`/api/admin-management/${selectedAdmin.id}`, selectedAdmin);
        const updatedAdmin = response.data;
        if (isRegularAdmin(updatedAdmin)) {
          setAdmins(admins.map(admin => 
            admin.id === selectedAdmin.id ? updatedAdmin : admin
          ));
        }
        setIsEditDialogOpen(false);
        setSelectedAdmin(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to update admin');
        console.error('Error updating admin:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleToggleStatus = async (adminId: string) => {
    try {
      setLoading(true);
      const admin = admins.find(a => a.id === adminId);
      if (!admin) return;
      
      const newStatus = admin.status === "active" ? "inactive" : "active";
      const response = await api.post(`/api/admin-management/${adminId}/toggle-status`);
      const updatedAdmin = response.data;
      
      if (isRegularAdmin(updatedAdmin)) {
        setAdmins(admins.map(a => 
          a.id === adminId ? updatedAdmin : a
        ));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update admin status');
      console.error('Error updating admin status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (permission: string, isNewAdmin = false) => {
    if (isNewAdmin) {
      const currentPermissions = newAdmin.permissions || [];
      const updatedPermissions = currentPermissions.includes(permission)
        ? currentPermissions.filter(p => p !== permission)
        : [...currentPermissions, permission];
      setNewAdmin({ ...newAdmin, permissions: updatedPermissions });
    } else if (selectedAdmin) {
      const updatedPermissions = selectedAdmin.permissions.includes(permission)
        ? selectedAdmin.permissions.filter(p => p !== permission)
        : [...selectedAdmin.permissions, permission];
      setSelectedAdmin({ ...selectedAdmin, permissions: updatedPermissions });
    }
  };

  const generateSecurePassword = () => {
    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
    const gen = (len: number) => Array.from({ length: len }, () => charset[Math.floor(Math.random() * charset.length)]).join("");
    const pwd = gen(12);
    setPasswordData({ newPassword: pwd, confirmPassword: pwd });
  };

  const handleResetPassword = async () => {
    if (!selectedAdmin) return;
    if (passwordData.newPassword && passwordData.newPassword !== passwordData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      setPasswordChanging(true);
      setPasswordResult(null);
      const payload = passwordData.newPassword ? { newPassword: passwordData.newPassword } : {};
      const resp = await api.post(`/api/admin-management/${selectedAdmin.id}/reset-password`, payload);
      const data = resp?.data || {};
      const newPwd = data?.newPassword || passwordData.newPassword;
      setPasswordResult(newPwd || null);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to reset password");
      console.error("Error resetting password:", err);
    } finally {
      setPasswordChanging(false);
    }
  };

  return (
    <SupportLayout>
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setError(null)}
                    className="text-red-800 border-red-300 hover:bg-red-50"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Management</h1>
            <p className="text-gray-600 mt-2">Manage regular admin accounts and permissions (Super admin accounts are managed separately)</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Admin
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Admin Account</DialogTitle>
                <DialogDescription>
                  Create a new admin account with specific permissions and access levels.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={newAdmin.firstName || ""}
                      onChange={(e) => setNewAdmin({ ...newAdmin, firstName: e.target.value })}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={newAdmin.lastName || ""}
                      onChange={(e) => setNewAdmin({ ...newAdmin, lastName: e.target.value })}
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={newAdmin.username || ""}
                    onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
                    placeholder="Enter username"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newAdmin.email || ""}
                    onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                    placeholder="Enter email address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Select value={newAdmin.department || ""} onValueChange={(value) => setNewAdmin({ ...newAdmin, department: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={newAdmin.phone || ""}
                      onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
                <div>
                  <Label>Permissions</Label>
                  <div className="mt-2 space-y-3 max-h-48 overflow-y-auto border rounded-lg p-3">
                    {availablePermissions.map(permission => (
                      <div key={permission.id} className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{permission.label}</span>
                          <span className="text-sm text-gray-500 ml-2">({permission.category})</span>
                        </div>
                        <Switch
                          checked={(newAdmin.permissions || []).includes(permission.id)}
                          onCheckedChange={() => handlePermissionToggle(permission.id, true)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateAdmin} className="bg-purple-600 hover:bg-purple-700">
                    Create Admin
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search admins by name, username, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin List */}
        <div className="grid gap-4">
          {loading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                  <span className="ml-2 text-gray-600">Loading admin data...</span>
                </div>
              </CardContent>
            </Card>
          ) : filteredAdmins.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <UserCog className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No admins found</h3>
                  <p className="text-gray-600">No admin accounts match your current filters.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredAdmins.map((admin) => (
            <Card key={admin.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <Shield className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {admin.firstName} {admin.lastName}
                      </h3>
                      <p className="text-gray-600">@{admin.username}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-gray-500 flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {admin.email}
                        </span>
                        {admin.department && (
                          <span className="text-sm text-gray-500">
                            {admin.department}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className={getStatusColor(admin.status)}>
                      {getStatusIcon(admin.status)}
                      <span className="ml-1 capitalize">{admin.status}</span>
                    </Badge>
                    <div className="flex space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedAdmin(admin)}
                            className="text-purple-600 border-purple-200 hover:bg-purple-50"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Admin Details</DialogTitle>
                            <DialogDescription>
                              Detailed information for {admin.firstName} {admin.lastName}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Full Name</Label>
                                <p className="font-medium">{admin.firstName} {admin.lastName}</p>
                              </div>
                              <div>
                                <Label>Username</Label>
                                <p className="font-medium">@{admin.username}</p>
                              </div>
                              <div>
                                <Label>Email</Label>
                                <p className="font-medium">{admin.email}</p>
                              </div>
                              <div>
                                <Label>Department</Label>
                                <p className="font-medium">{admin.department || "Not specified"}</p>
                              </div>
                              <div>
                                <Label>Phone</Label>
                                <p className="font-medium">{admin.phone || "Not specified"}</p>
                              </div>
                              <div>
                                <Label>Status</Label>
                                <Badge className={getStatusColor(admin.status)}>
                                  {getStatusIcon(admin.status)}
                                  <span className="ml-1 capitalize">{admin.status}</span>
                                </Badge>
                              </div>
                              <div>
                                <Label>Last Login</Label>
                                <p className="font-medium">
                                  {admin.lastLogin ? new Date(admin.lastLogin).toLocaleString() : "Never"}
                                </p>
                              </div>
                              <div>
                                <Label>Created</Label>
                                <p className="font-medium">{new Date(admin.created).toLocaleString()}</p>
                              </div>
                            </div>
                            {admin.subscription && (
                              <div className="border-t pt-4">
                                <h4 className="font-semibold mb-3">Subscription Information</h4>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Plan</Label>
                                    <p className="font-medium">{admin.subscription.plan_name}</p>
                                  </div>
                                  <div>
                                    <Label>Billing Cycle</Label>
                                    <p className="font-medium capitalize">{admin.subscription.plan_type}</p>
                                  </div>
                                  <div>
                                    <Label>Status</Label>
                                    <Badge className={admin.subscription.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                      {admin.subscription.status}
                                    </Badge>
                                  </div>
                                  <div>
                                    <Label>Next Billing Date</Label>
                                    <p className="font-medium">
                                      {admin.subscription.current_period_end 
                                        ? new Date(admin.subscription.current_period_end).toLocaleDateString()
                                        : 'N/A'
                                      }
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            <div>
                              <Label>Permissions</Label>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {admin.permissions.map(permission => {
                                  const permissionInfo = availablePermissions.find(p => p.id === permission);
                                  return (
                                    <Badge key={permission} variant="secondary">
                                      {permissionInfo?.label || permission}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Dialog open={isPasswordDialogOpen} onOpenChange={(open) => {
                        setIsPasswordDialogOpen(open);
                        if (!open) {
                          setPasswordData({ newPassword: "", confirmPassword: "" });
                          setPasswordResult(null);
                          setSelectedAdmin(null);
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedAdmin(admin);
                              setPasswordData({ newPassword: "", confirmPassword: "" });
                              setPasswordResult(null);
                            }}
                            className="text-orange-600 border-orange-200 hover:bg-orange-50"
                          >
                            <KeyRound className="h-4 w-4 mr-1" />
                            Change Password
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Change Password</DialogTitle>
                            <DialogDescription>
                              Set a new password for this admin. Current passwords cannot be shown.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <Label>New Password</Label>
                              <Button variant="ghost" size="sm" onClick={generateSecurePassword}>
                                Generate
                              </Button>
                            </div>
                            <Input
                              type="text"
                              value={passwordData.newPassword}
                              onChange={(e) =>
                                setPasswordData((p) => ({ ...p, newPassword: e.target.value }))
                              }
                              placeholder="Enter new password or use Generate"
                            />
                            <div>
                              <Label>Confirm Password</Label>
                              <Input
                                type="text"
                                value={passwordData.confirmPassword}
                                onChange={(e) =>
                                  setPasswordData((p) => ({ ...p, confirmPassword: e.target.value }))
                                }
                                placeholder="Re-enter new password"
                              />
                            </div>
                            {passwordResult && (
                              <div className="mt-2 rounded-md border p-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">New Password</span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      try {
                                        navigator.clipboard.writeText(passwordResult || "");
                                      } catch {}
                                    }}
                                  >
                                    <Copy className="h-4 w-4 mr-1" />
                                    Copy
                                  </Button>
                                </div>
                                <p className="mt-1 font-mono text-sm break-all">{passwordResult}</p>
                              </div>
                            )}
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button onClick={handleResetPassword} disabled={passwordChanging} className="bg-orange-600 hover:bg-orange-700">
                                {passwordChanging ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : null}
                                Save Password
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
                        setIsEditDialogOpen(open);
                        if (!open) {
                          setSelectedAdmin(null);
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedAdmin(admin);
                            }}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit Admin Account</DialogTitle>
                            <DialogDescription>
                              Update admin account information and permissions.
                            </DialogDescription>
                          </DialogHeader>
                          {selectedAdmin && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="editFirstName">First Name</Label>
                                  <Input
                                    id="editFirstName"
                                    value={selectedAdmin.firstName}
                                    onChange={(e) => setSelectedAdmin({ ...selectedAdmin, firstName: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="editLastName">Last Name</Label>
                                  <Input
                                    id="editLastName"
                                    value={selectedAdmin.lastName}
                                    onChange={(e) => setSelectedAdmin({ ...selectedAdmin, lastName: e.target.value })}
                                  />
                                </div>
                              </div>
                              <div>
                                <Label htmlFor="editEmail">Email</Label>
                                <Input
                                  id="editEmail"
                                  type="email"
                                  value={selectedAdmin.email}
                                  onChange={(e) => setSelectedAdmin({ ...selectedAdmin, email: e.target.value })}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="editDepartment">Department</Label>
                                  <Select 
                                    value={selectedAdmin.department || ""} 
                                    onValueChange={(value) => setSelectedAdmin({ ...selectedAdmin, department: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {departments.map(dept => (
                                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label htmlFor="editPhone">Phone</Label>
                                  <Input
                                    id="editPhone"
                                    value={selectedAdmin.phone || ""}
                                    onChange={(e) => setSelectedAdmin({ ...selectedAdmin, phone: e.target.value })}
                                  />
                                </div>
                              </div>
                              <div>
                                <Label>Status</Label>
                                <Select 
                                  value={selectedAdmin.status} 
                                  onValueChange={(value: "active" | "inactive" | "suspended") => 
                                    setSelectedAdmin({ ...selectedAdmin, status: value })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                    <SelectItem value="suspended">Suspended</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Permissions</Label>
                                <div className="mt-2 space-y-3 max-h-48 overflow-y-auto border rounded-lg p-3">
                                  {availablePermissions.map(permission => (
                                    <div key={permission.id} className="flex items-center justify-between">
                                      <div>
                                        <span className="font-medium">{permission.label}</span>
                                        <span className="text-sm text-gray-500 ml-2">({permission.category})</span>
                                      </div>
                                      <Switch
                                        checked={selectedAdmin.permissions.includes(permission.id)}
                                        onCheckedChange={() => handlePermissionToggle(permission.id)}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                              {selectedAdmin.subscription && (
                                <div className="border-t pt-4">
                                  <h4 className="font-semibold mb-3">Subscription Settings</h4>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label htmlFor="editPlanName">Plan Name</Label>
                                      <Input
                                        id="editPlanName"
                                        value={selectedAdmin.subscription.plan_name}
                                        onChange={(e) => setSelectedAdmin({
                                          ...selectedAdmin,
                                          subscription: {
                                            ...selectedAdmin.subscription!,
                                            plan_name: e.target.value
                                          }
                                        })}
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor="editPlanType">Billing Cycle</Label>
                                      <Select
                                        value={selectedAdmin.subscription.plan_type}
                                        onValueChange={(value: 'monthly' | 'yearly' | 'lifetime') => setSelectedAdmin({
                                          ...selectedAdmin,
                                          subscription: {
                                            ...selectedAdmin.subscription!,
                                            plan_type: value
                                          }
                                        })}
                                      >
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
                                      <Label htmlFor="editSubscriptionStatus">Subscription Status</Label>
                                      <Select
                                        value={selectedAdmin.subscription.status}
                                        onValueChange={(value: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete') => setSelectedAdmin({
                                          ...selectedAdmin,
                                          subscription: {
                                            ...selectedAdmin.subscription!,
                                            status: value
                                          }
                                        })}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="active">Active</SelectItem>
                                          <SelectItem value="canceled">Canceled</SelectItem>
                                          <SelectItem value="past_due">Past Due</SelectItem>
                                          <SelectItem value="unpaid">Unpaid</SelectItem>
                                          <SelectItem value="incomplete">Incomplete</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <Label htmlFor="editBillingDate">Next Billing Date</Label>
                                      <Input
                                        id="editBillingDate"
                                        type="date"
                                        value={selectedAdmin.subscription.current_period_end ? new Date(selectedAdmin.subscription.current_period_end).toISOString().split('T')[0] : ''}
                                        onChange={(e) => setSelectedAdmin({
                                          ...selectedAdmin,
                                          subscription: {
                                            ...selectedAdmin.subscription!,
                                            current_period_end: e.target.value ? new Date(e.target.value).toISOString() : undefined
                                          }
                                        })}
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                              <div className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleEditAdmin} className="bg-purple-600 hover:bg-purple-700">
                                  Save Changes
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(admin.id)}
                        disabled={loading}
                        className={admin.status === "active" 
                          ? "text-red-600 border-red-200 hover:bg-red-50" 
                          : "text-green-600 border-green-200 hover:bg-green-50"
                        }
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : admin.status === "active" ? (
                          <>
                            <UserX className="h-4 w-4 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-4 w-4 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Permissions: {admin.permissions.length} assigned</span>
                    <span>Last login: {admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : "Never"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
          )}
        </div>
      </div>
    </SupportLayout>
  );
}
