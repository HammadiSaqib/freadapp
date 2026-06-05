import { useState, useEffect } from "react";
import SupportLayout from "@/components/SupportLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Filter,
  Eye,
  Edit,
  Ban,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  FileText,
  MessageSquare,
  AlertTriangle,
  User,
  Settings,
  MoreHorizontal,
  Download,
  RefreshCw
} from "lucide-react";

interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  status: "active" | "suspended" | "pending" | "banned";
  subscription: {
    plan: string;
    status: "active" | "cancelled" | "expired" | "trial";
    expiryDate: string;
  };
  joinDate: string;
  lastLogin: string;
  totalTickets: number;
  openTickets: number;
  creditScore?: number;
  accountBalance: number;
  notes: string;
  assignedAdmin?: {
    id: string;
    name: string;
    email: string;
    department?: string;
  };
}

export default function SupportUsers() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<Array<{id: string, name: string, email: string, department: string}>>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      // Debug: Log the token being used
      console.log('🔍 Token being used:', token ? token.substring(0, 50) + '...' : 'No token');
      console.log('🔍 Token length:', token ? token.length : 0);
      
      const response = await fetch(`/api/support/users?page=${pagination.page}&limit=${pagination.limit}&search=${searchTerm}&status=${statusFilter}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('API Response status:', response.status);
      console.log('API Response headers:', response.headers);
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setPagination(data.pagination || { page: 1, limit: 50, total: 0, pages: 0 });
        

      } else {
        const errorText = await response.text();
        console.error('Failed to fetch users:', response.status, response.statusText, errorText);
        throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch admins for assignment dropdown
  const fetchAdmins = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/support/admins', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAdmins(data);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchAdmins();
  }, [pagination.page, searchTerm, statusFilter]);

  const filteredUsers = users.filter(user => {
    const matchesSubscription = subscriptionFilter === "all" || user.subscription.status === subscriptionFilter;
    return matchesSubscription;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "suspended":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "banned":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getSubscriptionColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "trial":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "expired":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4" />;
      case "suspended":
        return <Ban className="h-4 w-4" />;
      case "pending":
        return <AlertTriangle className="h-4 w-4" />;
      case "banned":
        return <XCircle className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/support/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        setUsers(prev => prev.map(user => 
          user.id === userId 
            ? { ...user, status: newStatus as any }
            : user
        ));
      } else {
        console.error('Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const handleAdminAssignment = async (userId: string, adminId: string) => {
     try {
       const token = localStorage.getItem('auth_token');
       const response = await fetch(`/api/support/users/${userId}/assign-admin`, {
         method: 'PUT',
         headers: {
           'Authorization': `Bearer ${token}`,
           'Content-Type': 'application/json'
         },
         body: JSON.stringify({ adminId: adminId || null })
       });
      
      if (response.ok) {
        const assignedAdmin = adminId ? admins.find(admin => admin.id === adminId) : null;
        setUsers(prev => prev.map(user => 
          user.id === userId 
            ? { ...user, assignedAdmin: assignedAdmin ? {
                id: assignedAdmin.id,
                name: assignedAdmin.name,
                email: assignedAdmin.email,
                department: assignedAdmin.department
              } : undefined }
            : user
        ));
      } else {
        console.error('Failed to assign admin');
      }
    } catch (error) {
      console.error('Error assigning admin:', error);
    }
  };

  const handleViewUser = (user: UserAccount) => {
    setSelectedUser(user);
    setIsUserDialogOpen(true);
  };

  return (
    <SupportLayout
      title="User Management"
      description="Manage customer accounts and user information"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-1 gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Subscription" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {users.filter(u => u.status === "active").length}
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.round((users.filter(u => u.status === "active").length / users.length) * 100)}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.reduce((sum, user) => sum + user.openTickets, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${users.reduce((sum, user) => sum + user.accountBalance, 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Outstanding balance
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>User Accounts</CardTitle>
            <CardDescription>
              Manage customer accounts and view detailed information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
                <span className="ml-2">Loading users...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>
                          {user.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-semibold">{user.name}</h4>
                          <span className="font-mono text-sm text-purple-600">{user.id}</span>
                          <Badge className={getStatusColor(user.status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(user.status)}
                              {user.status}
                            </div>
                          </Badge>
                          <Badge className={getSubscriptionColor(user.subscription.status)}>
                            {user.subscription.plan} - {user.subscription.status}
                          </Badge>
                          {user.assignedAdmin && (
                            <Badge variant="outline" className="text-blue-600 border-blue-200">
                              Assigned to: {user.assignedAdmin.name}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-6 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {user.email}
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {user.phone}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Joined {new Date(user.joinDate).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4" />
                            {user.openTickets} open tickets
                          </div>
                          {user.creditScore && (
                            <div className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              Credit Score: {user.creditScore}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={user.assignedAdmin?.id || "unassigned"}
                        onValueChange={(value) => handleAdminAssignment(user.id, value === "unassigned" ? "" : value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Assign Admin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {admins.map((admin) => (
                            <SelectItem key={admin.id} value={admin.id}>
                              {admin.name} ({admin.department})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={user.status}
                        onValueChange={(value) => handleStatusChange(user.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="banned">Banned</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewUser(user)}
                        className="text-purple-600 border-purple-200 hover:bg-purple-50"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No users found</h3>
                <p className="text-gray-500 mb-4">
                  No users match your current filters. Try adjusting your search criteria.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setSubscriptionFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Details Dialog */}
        <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            {selectedUser && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedUser.avatar} />
                      <AvatarFallback>
                        {selectedUser.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span>{selectedUser.name}</span>
                      <p className="text-sm text-gray-500 font-normal">{selectedUser.email}</p>
                    </div>
                    <Badge className={getStatusColor(selectedUser.status)}>
                      {selectedUser.status}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription>
                    User ID: {selectedUser.id} • Member since {new Date(selectedUser.joinDate).toLocaleDateString()}
                  </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="subscription">Subscription</TabsTrigger>
                    <TabsTrigger value="tickets">Tickets</TabsTrigger>
                    <TabsTrigger value="admin">Admin</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <span>{selectedUser.email}</span>
                          </div>
                          {selectedUser.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-500" />
                              <span>{selectedUser.phone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span>Last login: {new Date(selectedUser.lastLogin).toLocaleString()}</span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Account Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex justify-between">
                            <span>Total Tickets:</span>
                            <span className="font-semibold">{selectedUser.totalTickets}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Open Tickets:</span>
                            <span className="font-semibold text-red-600">{selectedUser.openTickets}</span>
                          </div>
                          {selectedUser.creditScore && (
                            <div className="flex justify-between">
                              <span>Credit Score:</span>
                              <span className="font-semibold">{selectedUser.creditScore}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Account Balance:</span>
                            <span className={`font-semibold ${
                              selectedUser.accountBalance >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              ${selectedUser.accountBalance.toFixed(2)}
                            </span>
                          </div>
                          {selectedUser.assignedAdmin && (
                            <div className="flex justify-between">
                              <span>Assigned Admin:</span>
                              <div className="text-right">
                                <div className="font-semibold">{selectedUser.assignedAdmin.name}</div>
                                <div className="text-sm text-gray-500">{selectedUser.assignedAdmin.department}</div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="subscription" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Subscription Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Plan</Label>
                            <p className="font-semibold">{selectedUser.subscription.plan}</p>
                          </div>
                          <div>
                            <Label>Status</Label>
                            <Badge className={getSubscriptionColor(selectedUser.subscription.status)}>
                              {selectedUser.subscription.status}
                            </Badge>
                          </div>
                          <div>
                            <Label>Expiry Date</Label>
                            <p className="font-semibold">
                              {new Date(selectedUser.subscription.expiryDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="tickets" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Support History</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <span>Total Support Tickets</span>
                            <Badge variant="secondary">{selectedUser.totalTickets}</Badge>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                            <span>Open Tickets</span>
                            <Badge className="bg-red-100 text-red-800">{selectedUser.openTickets}</Badge>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                            <span>Resolved Tickets</span>
                            <Badge className="bg-green-100 text-green-800">
                              {selectedUser.totalTickets - selectedUser.openTickets}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="admin" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Admin Assignment</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedUser.assignedAdmin ? (
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                              <Avatar className="h-12 w-12">
                                <AvatarFallback>
                                  {selectedUser.assignedAdmin.name.split(" ").map(n => n[0]).join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="font-semibold">{selectedUser.assignedAdmin.name}</div>
                                <div className="text-sm text-gray-600">{selectedUser.assignedAdmin.email}</div>
                                <div className="text-sm text-blue-600">{selectedUser.assignedAdmin.department}</div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Select
                                value={selectedUser.assignedAdmin.id}
                                onValueChange={(value) => handleAdminAssignment(selectedUser.id, value === "unassigned" ? "" : value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unassigned">Unassign Admin</SelectItem>
                                  {admins.map((admin) => (
                                    <SelectItem key={admin.id} value={admin.id}>
                                      {admin.name} ({admin.department})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <p className="text-gray-500">No admin assigned to this user.</p>
                            <Select
                              value="unassigned"
                              onValueChange={(value) => handleAdminAssignment(selectedUser.id, value === "unassigned" ? "" : value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Assign an admin" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Select an admin</SelectItem>
                                {admins.map((admin) => (
                                  <SelectItem key={admin.id} value={admin.id}>
                                    {admin.name} ({admin.department})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="notes" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Support Notes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          value={selectedUser.notes}
                          readOnly
                          rows={6}
                          className="resize-none"
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </SupportLayout>
  );
}