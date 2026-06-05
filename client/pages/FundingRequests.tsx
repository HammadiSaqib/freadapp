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
import {
  DollarSign,
  Plus,
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
  user_name: string;
  user_email: string;
}

interface FundingStats {
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  total_amount_requested: number;
  total_amount_approved: number;
}

export default function FundingRequests() {
  const [requests, setRequests] = useState<FundingRequest[]>([]);
  const [stats, setStats] = useState<FundingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<FundingRequest | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  // Form state for creating new funding request
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    amount: "",
    purpose: "",
    priority: "medium" as const,
  });

  useEffect(() => {
    fetchRequests();
    fetchStats();
  }, [currentPage, searchTerm, statusFilter, priorityFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      
      if (!token) {
        throw new Error('Authentication required. Please log in as a funding manager.');
      }
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        search: searchTerm,
        status: statusFilter !== "all" ? statusFilter : "",
        priority: priorityFilter !== "all" ? priorityFilter : "",
      });

      const response = await fetch(`/api/funding-requests?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      }
      
      if (response.status === 403) {
        throw new Error('Access denied. You need funding manager privileges to view funding requests.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch funding requests (${response.status})`);
      }

      const data = await response.json();
      setRequests(data.requests || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching funding requests:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load funding requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      
      if (!token) {
        throw new Error('Authentication required. Please log in as a funding manager.');
      }
      
      const response = await fetch("/api/funding-requests/stats", {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      }
      
      if (response.status === 403) {
        throw new Error('Access denied. You need funding manager privileges to view funding request statistics.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch funding request statistics (${response.status})`);
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching funding stats:", error);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/funding-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Funding request submitted successfully",
        });
        setIsCreateDialogOpen(false);
        setFormData({
          title: "",
          description: "",
          amount: "",
          purpose: "",
          priority: "medium",
        });
        fetchRequests();
        fetchStats();
      } else {
        throw new Error("Failed to create funding request");
      }
    } catch (error) {
      console.error("Error creating funding request:", error);
      toast({
        title: "Error",
        description: "Failed to submit funding request",
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
        {status.replace("_", " ").toUpperCase()}
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
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <FundingManagerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Funding Requests</h1>
            <p className="text-muted-foreground">
              Submit and manage funding requests for your business needs
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Funding Request</DialogTitle>
                <DialogDescription>
                  Submit a new funding request for review and approval
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateRequest} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Request Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="Brief title for your request"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount Requested</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="purpose">Purpose</Label>
                    <Select
                      value={formData.purpose}
                      onValueChange={(value) =>
                        setFormData({ ...formData, purpose: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select purpose" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equipment">Equipment Purchase</SelectItem>
                        <SelectItem value="marketing">Marketing Campaign</SelectItem>
                        <SelectItem value="expansion">Business Expansion</SelectItem>
                        <SelectItem value="inventory">Inventory</SelectItem>
                        <SelectItem value="technology">Technology Upgrade</SelectItem>
                        <SelectItem value="training">Staff Training</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) =>
                        setFormData({ ...formData, priority: value as any })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Provide detailed information about your funding request..."
                    rows={4}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Submit Request</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pending_requests}</div>
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
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
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
                      <TableCell colSpan={7} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : requests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        No funding requests found
                      </TableCell>
                    </TableRow>
                  ) : (
                    requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{request.title}</div>
                            <div className="text-sm text-muted-foreground">
                              by {request.user_name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(request.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {request.purpose.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                        <TableCell>{formatDate(request.requested_date)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Request Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Funding Request Details</DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Title</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedRequest.title}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Amount</Label>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(selectedRequest.amount)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <div className="mt-1">
                      {getStatusBadge(selectedRequest.status)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Priority</Label>
                    <div className="mt-1">
                      {getPriorityBadge(selectedRequest.priority)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Purpose</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedRequest.purpose.replace("_", " ")}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Requested Date</Label>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(selectedRequest.requested_date)}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedRequest.description}
                  </p>
                </div>
                {selectedRequest.reviewer_notes && (
                  <div>
                    <Label className="text-sm font-medium">Reviewer Notes</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedRequest.reviewer_notes}
                    </p>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setIsViewDialogOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </FundingManagerLayout>
  );
}