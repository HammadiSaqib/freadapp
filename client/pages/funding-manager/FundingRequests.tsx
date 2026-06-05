import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import FundingManagerLayout from "@/components/FundingManagerLayout";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  DollarSign,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  FileText,
  TrendingUp,
  Download,
  Edit,
  Mail,
  User,
  Building,
  Phone,
  MapPin,
  Globe,
  CreditCard,
  Banknote,
  Shield,
  Users,
  BarChart3,
} from "lucide-react";

interface FundingRequest {
  id: number;
  title: string;
  description: string;
  amount: number;
  purpose: string;
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requested_date: string;
  reviewed_date?: string;
  reviewer_notes?: string;
  user_id: number;
  first_name: string;
  last_name: string;
  user_email: string;
  reviewer_first_name?: string;
  reviewer_last_name?: string;
  
  // Done for You fields
  funding_type?: string;
  title_position?: string;
  intended_use?: string;
  business_name?: string;
  business_phone?: string;
  business_email?: string;
  business_address?: string;
  business_city?: string;
  business_state?: string;
  business_zip?: string;
  date_commenced?: string;
  business_website?: string;
  business_industry?: string;
  entity_type?: string;
  incorporation_state?: string;
  number_of_employees?: number;
  annual_revenue?: number;
  monthly_revenue?: number;
  business_bank_balance?: number;
  us_citizen?: string;
  savings_account?: string;
  investment_accounts?: string;
  military_affiliation?: string;
  other_income?: string;
  other_assets?: string;
  banks_to_ignore?: string;
}

interface FundingRequestStats {
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  under_review_requests: number;
  total_amount_requested: number;
  total_amount_approved: number;
  avg_request_amount: number;
}

const FundingRequests: React.FC = () => {
  const [requests, setRequests] = useState<FundingRequest[]>([]);
  const [stats, setStats] = useState<FundingRequestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<FundingRequest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<Partial<FundingRequest>>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRequests();
    fetchStats();
  }, [searchTerm, statusFilter, priorityFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to view funding requests.",
          variant: "destructive",
        });
        return;
      }

      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter && priorityFilter !== 'all') params.append('priority', priorityFilter);

      const response = await fetch(`/api/funding-requests?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Handle authentication errors specifically
        if (response.status === 401 || response.status === 403) {
          toast({
            title: "Authentication Error",
            description: "Your session has expired. Please log in again.",
            variant: "destructive",
          });
          localStorage.removeItem("auth_token");
          return;
        }
        
        throw new Error(`Failed to fetch funding requests: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setRequests(data.requests || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch funding requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('auth_token');
      if (!token) {
        return; // Skip stats fetch if not authenticated
      }

      const response = await fetch('/api/funding-requests/stats', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Handle authentication errors specifically
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("auth_token");
          return;
        }
        
        throw new Error(`Failed to fetch stats: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const updateRequestStatus = async (requestId: number, status: string, notes?: string) => {
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to update request status.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/funding-requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          reviewer_notes: notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update request status');
      }

      // Send email notification
      await sendStatusUpdateEmail(requestId, status);

      toast({
        title: "Success",
        description: "Request status updated successfully",
      });

      fetchRequests();
      fetchStats();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update request status",
        variant: "destructive",
      });
    }
  };

  const sendStatusUpdateEmail = async (requestId: number, status: string) => {
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.warn('No auth token available for email notification');
        return;
      }

      const response = await fetch('/api/funding-requests/send-status-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId,
          status,
        }),
      });

      if (!response.ok) {
        console.warn('Failed to send email notification');
      }
    } catch (error) {
      console.warn('Error sending email:', error);
    }
  };

  const downloadPDF = async (request: FundingRequest) => {
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to download PDF.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/funding-requests/${request.id}/pdf`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Handle authentication errors specifically
        if (response.status === 401 || response.status === 403) {
          toast({
            title: "Authentication Error",
            description: "Your session has expired. Please log in again.",
            variant: "destructive",
          });
          localStorage.removeItem("auth_token");
          return;
        }
        
        throw new Error(`Failed to generate PDF: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `funding-request-${request.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "PDF downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download PDF",
        variant: "destructive",
      });
    }
  };

  const saveEditedRequest = async () => {
    if (!selectedRequest) return;

    try {
      // Check if user is authenticated
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to save changes.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/funding-requests/${selectedRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(editingRequest),
      });

      if (!response.ok) {
        // Handle authentication errors specifically
        if (response.status === 401 || response.status === 403) {
          toast({
            title: "Authentication Error",
            description: "Your session has expired. Please log in again.",
            variant: "destructive",
          });
          localStorage.removeItem("auth_token");
          return;
        }
        
        throw new Error(`Failed to update request: ${response.status} ${response.statusText}`);
      }

      toast({
        title: "Success",
        description: "Request updated successfully",
      });

      setIsEditModalOpen(false);
      fetchRequests();
    } catch (error) {
      console.error('Error updating request:', error);
      toast({
        title: "Error",
        description: "Failed to update request",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
      approved: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      rejected: { color: "bg-red-100 text-red-800", icon: XCircle },
      under_review: { color: "bg-blue-100 text-blue-800", icon: AlertCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config?.icon || Clock;

    return (
      <Badge className={`${config?.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: "bg-gray-100 text-gray-800",
      medium: "bg-blue-100 text-blue-800",
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800",
    };

    return (
      <Badge className={priorityConfig[priority as keyof typeof priorityConfig]}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const openDetailModal = (request: FundingRequest) => {
    setSelectedRequest(request);
    setIsDetailModalOpen(true);
  };

  const openEditModal = (request: FundingRequest) => {
    setSelectedRequest(request);
    setEditingRequest({ ...request });
    setIsEditModalOpen(true);
  };

  return (
    <FundingManagerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Funding Requests</h1>
          <p className="text-muted-foreground">
            Manage and review all funding requests from clients
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_requests}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.pending_requests} pending
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Requested</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.total_amount_requested)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Approved</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.total_amount_approved)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Request</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.avg_request_amount)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Funding Requests</CardTitle>
            <CardDescription>
              View and manage all funding requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search requests..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Requests Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : requests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No funding requests found
                      </TableCell>
                    </TableRow>
                  ) : (
                    requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {request.first_name} {request.last_name}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {request.user_email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            <div className="font-medium truncate">{request.title}</div>
                            <div className="text-sm text-muted-foreground truncate">
                              {request.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(request.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {request.purpose.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                        <TableCell>{formatDate(request.requested_date)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/funding-manager/funding-requests/${request.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/funding-manager/credit-report/${request.user_id}`)}
                              title="View Credit Report"
                            >
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(request)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadPDF(request)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Detail Modal */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Funding Request Details</DialogTitle>
              <DialogDescription>
                Complete information for funding request #{selectedRequest?.id}
              </DialogDescription>
            </DialogHeader>
            
            {selectedRequest && (
              <div className="space-y-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Request Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-sm font-medium">Title</Label>
                      <p className="text-sm">{selectedRequest.title}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Amount</Label>
                      <p className="text-sm font-semibold">{formatCurrency(selectedRequest.amount)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Purpose</Label>
                      <p className="text-sm">{selectedRequest.purpose.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Priority</Label>
                      <div className="mt-1">{getPriorityBadge(selectedRequest.priority)}</div>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-sm font-medium">Description</Label>
                      <p className="text-sm">{selectedRequest.description}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Client Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Client Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-sm font-medium">Name</Label>
                      <p className="text-sm">{selectedRequest.first_name} {selectedRequest.last_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <p className="text-sm">{selectedRequest.user_email}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Business Information (if available) */}
                {selectedRequest.business_name && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        Business Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label className="text-sm font-medium">Business Name</Label>
                        <p className="text-sm">{selectedRequest.business_name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Industry</Label>
                        <p className="text-sm">{selectedRequest.business_industry}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Entity Type</Label>
                        <p className="text-sm">{selectedRequest.entity_type}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Employees</Label>
                        <p className="text-sm">{selectedRequest.number_of_employees}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Annual Revenue</Label>
                        <p className="text-sm">{selectedRequest.annual_revenue ? formatCurrency(selectedRequest.annual_revenue) : 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Monthly Revenue</Label>
                        <p className="text-sm">{selectedRequest.monthly_revenue ? formatCurrency(selectedRequest.monthly_revenue) : 'N/A'}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Status Management */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Status Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <Label className="text-sm font-medium">Current Status</Label>
                        <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                      </div>
                      <div className="flex-1">
                        <Label className="text-sm font-medium">Update Status</Label>
                        <div className="flex gap-2 mt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateRequestStatus(selectedRequest.id, 'under_review')}
                            disabled={selectedRequest.status === 'under_review'}
                          >
                            Under Review
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-600 hover:bg-green-50"
                            onClick={() => updateRequestStatus(selectedRequest.id, 'approved')}
                            disabled={selectedRequest.status === 'approved'}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => updateRequestStatus(selectedRequest.id, 'rejected')}
                            disabled={selectedRequest.status === 'rejected'}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {selectedRequest.reviewer_notes && (
                      <div>
                        <Label className="text-sm font-medium">Reviewer Notes</Label>
                        <p className="text-sm mt-1 p-3 bg-gray-50 rounded-md">{selectedRequest.reviewer_notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => downloadPDF(selectedRequest)}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => openEditModal(selectedRequest)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Request
                    </Button>
                    <Button onClick={() => setIsDetailModalOpen(false)}>
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Funding Request</DialogTitle>
              <DialogDescription>
                Update the funding request information
              </DialogDescription>
            </DialogHeader>
            
            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="edit-title">Title</Label>
                    <Input
                      id="edit-title"
                      value={editingRequest.title || ''}
                      onChange={(e) => setEditingRequest({...editingRequest, title: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-amount">Amount</Label>
                    <Input
                      id="edit-amount"
                      type="number"
                      value={editingRequest.amount || ''}
                      onChange={(e) => setEditingRequest({...editingRequest, amount: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editingRequest.description || ''}
                    onChange={(e) => setEditingRequest({...editingRequest, description: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="edit-purpose">Purpose</Label>
                    <Select
                      value={editingRequest.purpose || ''}
                      onValueChange={(value) => setEditingRequest({...editingRequest, purpose: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select purpose" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equipment">Equipment</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="expansion">Expansion</SelectItem>
                        <SelectItem value="inventory">Inventory</SelectItem>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="training">Training</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-priority">Priority</Label>
                    <Select
                      value={editingRequest.priority || ''}
                      onValueChange={(value) => setEditingRequest({...editingRequest, priority: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-notes">Reviewer Notes</Label>
                  <Textarea
                    id="edit-notes"
                    value={editingRequest.reviewer_notes || ''}
                    onChange={(e) => setEditingRequest({...editingRequest, reviewer_notes: e.target.value})}
                    rows={3}
                    placeholder="Add notes about this request..."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveEditedRequest}>
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </FundingManagerLayout>
  );
};

export default FundingRequests;