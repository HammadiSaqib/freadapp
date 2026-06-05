import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

import { superAdminApi } from '../../lib/api';
import { 
  Search, 
  Eye, 
  UserCheck, 
  Download, 
  Calendar,
  Mail,
  Phone,
  Clock,
  Users,
  CheckCircle,
  Pause
} from 'lucide-react';



interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'locked' | 'pending';
  created_at: string;
}

interface ClientStats {
  totalClients: number;
  activeClients: number;
  completedClients: number;
  onHoldClients: number;
  newClientsToday: number;
}

const UserManagement: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientStats, setClientStats] = useState<ClientStats>({
    totalClients: 0,
    activeClients: 0,
    completedClients: 0,
    onHoldClients: 0,
    newClientsToday: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const itemsPerPage = 15;

  useEffect(() => {
    fetchUsers();
    fetchUserStats();
  }, [currentPage, searchTerm, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await superAdminApi.getUsers({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
        status: statusFilter === 'all' ? undefined : statusFilter
      });
      
      if (response.data) {
        setClients(response.data.clients || response.data.data || response.data);
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.pages || response.data.pagination.totalPages);
        } else {
          setTotalPages(Math.ceil((response.data.total || response.data.length) / itemsPerPage));
        }
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await superAdminApi.getUsers({ limit: 500 });
      const clientsData = response.data?.clients || response.data?.data || response.data || [];
      
      const today = new Date().toDateString();
      const newToday = clientsData.filter((client: Client) => 
        new Date(client.created_at).toDateString() === today
      ).length;
      
      setClientStats({
        totalClients: response.data?.pagination?.total || clientsData.length,
        activeClients: clientsData.filter((c: Client) => c.status === 'active').length,
        completedClients: clientsData.filter((c: Client) => c.status === 'inactive').length,
        onHoldClients: clientsData.filter((c: Client) => c.status === 'locked').length,
        newClientsToday: newToday
      });
    } catch (error) {
      console.error('Error fetching client stats:', error);
    }
  };



  const getClientStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'locked': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const StatCard = ({ title, value, icon: Icon, trend }: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    trend?: 'up' | 'down';
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className={`p-2 rounded-full ${
            trend === 'up' ? 'bg-green-100' : trend === 'down' ? 'bg-red-100' : 'bg-blue-100'
          }`}>
            <Icon className={`h-4 w-4 ${
              trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-blue-600'
            }`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">User Management</h2>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Users
          </Button>
        </div>
      </div>



      {/* Main Content */}
      <div className="space-y-4">
          {/* Client Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="Total Users"
              value={(clientStats.totalClients || 0).toLocaleString()}
              icon={Users}
            />
            <StatCard
              title="Active Users"
              value={(clientStats.activeClients || 0).toLocaleString()}
              icon={UserCheck}
              trend="up"
            />
            <StatCard
              title="Inactive"
              value={clientStats.completedClients}
              icon={CheckCircle}
              trend="up"
            />
            <StatCard
              title="Locked"
              value={clientStats.onHoldClients}
              icon={Pause}
            />
            <StatCard
              title="New Today"
              value={clientStats.newClientsToday}
              icon={Calendar}
              trend="up"
            />
          </div>

          {/* Client Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search users..."
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="locked">Locked</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading users...
                      </TableCell>
                    </TableRow>
                  ) : clients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    clients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div className="font-medium">
                            {client.first_name} {client.last_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span>{client.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span>{client.phone || 'N/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getClientStatusBadgeColor(client.status)}>
                            {client.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span>{new Date(client.created_at).toLocaleDateString()}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
      </div>


    </div>
  );
};

export default UserManagement;
