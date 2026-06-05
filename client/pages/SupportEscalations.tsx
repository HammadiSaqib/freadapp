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
  AlertTriangle,
  Clock,
  User,
  MessageSquare,
  Eye,
  Edit,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
  Calendar,
  Phone,
  Mail,
  Flag,
  Users,
  TrendingUp,
  Filter,
  RefreshCw,
  Plus,
  FileText,
  Send,
  Paperclip
} from "lucide-react";

interface EscalatedTicket {
  id: string;
  title: string;
  description: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
  };
  priority: "critical" | "high" | "medium";
  status: "open" | "in_progress" | "pending_review" | "resolved" | "closed";
  escalationReason: string;
  escalatedBy: string;
  escalatedAt: string;
  assignedTo?: string;
  category: string;
  originalTicketId: string;
  estimatedResolution?: string;
  lastUpdate: string;
  updates: {
    id: string;
    author: string;
    message: string;
    timestamp: string;
    type: "comment" | "status_change" | "assignment";
  }[];
}

export default function SupportEscalations() {
  const [escalations, setEscalations] = useState<EscalatedTicket[]>([
    {
      id: "ESC-001",
      title: "Credit Report Dispute Not Processing",
      description: "Customer's credit report dispute has been stuck in processing for over 30 days. Multiple attempts to resolve through normal channels have failed.",
      customer: {
        name: "John Smith",
        email: "john.smith@email.com",
        phone: "+1 (555) 123-4567",
        avatar: "/api/placeholder/40/40"
      },
      priority: "critical",
      status: "in_progress",
      escalationReason: "Processing delay exceeding SLA",
      escalatedBy: "Sarah Johnson",
      escalatedAt: "2024-01-12T09:30:00Z",
      assignedTo: "Mike Davis",
      category: "Credit Repair",
      originalTicketId: "TKT-5847",
      estimatedResolution: "2024-01-16T17:00:00Z",
      lastUpdate: "2024-01-14T14:20:00Z",
      updates: [
        {
          id: "UPD-001",
          author: "Mike Davis",
          message: "Contacted credit bureau directly. Waiting for response.",
          timestamp: "2024-01-14T14:20:00Z",
          type: "comment"
        },
        {
          id: "UPD-002",
          author: "System",
          message: "Ticket assigned to Mike Davis",
          timestamp: "2024-01-12T10:00:00Z",
          type: "assignment"
        }
      ]
    },
    {
      id: "ESC-002",
      title: "Billing Discrepancy - Overcharged",
      description: "Customer was charged twice for the same service. Refund request has been pending for 2 weeks.",
      customer: {
        name: "Emily Davis",
        email: "emily.davis@email.com",
        phone: "+1 (555) 987-6543"
      },
      priority: "high",
      status: "pending_review",
      escalationReason: "Billing dispute exceeding resolution timeframe",
      escalatedBy: "Lisa Chen",
      escalatedAt: "2024-01-10T11:15:00Z",
      assignedTo: "Robert Wilson",
      category: "Billing",
      originalTicketId: "TKT-5832",
      estimatedResolution: "2024-01-15T12:00:00Z",
      lastUpdate: "2024-01-13T16:45:00Z",
      updates: [
        {
          id: "UPD-003",
          author: "Robert Wilson",
          message: "Refund approved by finance team. Processing payment.",
          timestamp: "2024-01-13T16:45:00Z",
          type: "comment"
        },
        {
          id: "UPD-004",
          author: "System",
          message: "Status changed to Pending Review",
          timestamp: "2024-01-13T16:30:00Z",
          type: "status_change"
        }
      ]
    },
    {
      id: "ESC-003",
      title: "Account Access Issues",
      description: "Customer unable to access account for 5 days. Password reset and account recovery attempts failed.",
      customer: {
        name: "Robert Brown",
        email: "robert.brown@email.com"
      },
      priority: "medium",
      status: "open",
      escalationReason: "Technical issue requiring senior support",
      escalatedBy: "Alex Thompson",
      escalatedAt: "2024-01-13T08:20:00Z",
      category: "Technical",
      originalTicketId: "TKT-5891",
      lastUpdate: "2024-01-13T08:20:00Z",
      updates: [
        {
          id: "UPD-005",
          author: "Alex Thompson",
          message: "Escalated to senior technical team for investigation.",
          timestamp: "2024-01-13T08:20:00Z",
          type: "comment"
        }
      ]
    },
    {
      id: "ESC-004",
      title: "Service Cancellation Request",
      description: "Customer requesting immediate service cancellation and full refund due to unsatisfactory results.",
      customer: {
        name: "Lisa Anderson",
        email: "lisa.anderson@email.com",
        phone: "+1 (555) 456-7890"
      },
      priority: "high",
      status: "resolved",
      escalationReason: "Customer satisfaction issue requiring management review",
      escalatedBy: "Jennifer Lee",
      escalatedAt: "2024-01-08T14:30:00Z",
      assignedTo: "Sarah Johnson",
      category: "Account Management",
      originalTicketId: "TKT-5776",
      lastUpdate: "2024-01-12T11:00:00Z",
      updates: [
        {
          id: "UPD-006",
          author: "Sarah Johnson",
          message: "Resolution reached. Partial refund approved and service cancelled as requested.",
          timestamp: "2024-01-12T11:00:00Z",
          type: "comment"
        },
        {
          id: "UPD-007",
          author: "System",
          message: "Status changed to Resolved",
          timestamp: "2024-01-12T11:00:00Z",
          type: "status_change"
        }
      ]
    }
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [selectedEscalation, setSelectedEscalation] = useState<EscalatedTicket | null>(null);
  const [isEscalationDialogOpen, setIsEscalationDialogOpen] = useState(false);
  const [newComment, setNewComment] = useState("");

  const filteredEscalations = escalations.filter(escalation => {
    const matchesSearch = escalation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         escalation.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         escalation.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === "all" || escalation.priority === priorityFilter;
    const matchesStatus = statusFilter === "all" || escalation.status === statusFilter;
    const matchesAssignee = assigneeFilter === "all" || escalation.assignedTo === assigneeFilter;
    
    return matchesSearch && matchesPriority && matchesStatus && matchesAssignee;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "in_progress":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "pending_review":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "resolved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "closed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "high":
        return <ArrowUp className="h-4 w-4 text-orange-500" />;
      case "medium":
        return <ArrowDown className="h-4 w-4 text-yellow-500" />;
      default:
        return <Flag className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleViewEscalation = (escalation: EscalatedTicket) => {
    setSelectedEscalation(escalation);
    setIsEscalationDialogOpen(true);
  };

  const handleStatusChange = (escalationId: string, newStatus: string) => {
    setEscalations(prev => prev.map(escalation => 
      escalation.id === escalationId 
        ? { ...escalation, status: newStatus as any, lastUpdate: new Date().toISOString() }
        : escalation
    ));
  };

  const handleAssignmentChange = (escalationId: string, assignee: string) => {
    setEscalations(prev => prev.map(escalation => 
      escalation.id === escalationId 
        ? { ...escalation, assignedTo: assignee, lastUpdate: new Date().toISOString() }
        : escalation
    ));
  };

  const handleAddComment = () => {
    if (!selectedEscalation || !newComment.trim()) return;

    const newUpdate = {
      id: `UPD-${Date.now()}`,
      author: "Current User",
      message: newComment,
      timestamp: new Date().toISOString(),
      type: "comment" as const
    };

    setEscalations(prev => prev.map(escalation => 
      escalation.id === selectedEscalation.id 
        ? { 
            ...escalation, 
            updates: [newUpdate, ...escalation.updates],
            lastUpdate: new Date().toISOString()
          }
        : escalation
    ));

    setSelectedEscalation(prev => prev ? {
      ...prev,
      updates: [newUpdate, ...prev.updates],
      lastUpdate: new Date().toISOString()
    } : null);

    setNewComment("");
  };

  const assignees = Array.from(new Set(escalations.map(e => e.assignedTo).filter(Boolean)));

  return (
    <SupportLayout
      title="Escalations"
      description="Manage escalated support cases and high-priority issues"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-1 gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search escalations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                {assignees.map(assignee => (
                  <SelectItem key={assignee} value={assignee!}>{assignee}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
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
              <CardTitle className="text-sm font-medium">Total Escalations</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{escalations.length}</div>
              <p className="text-xs text-muted-foreground">
                +2 from last week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
              <Flag className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {escalations.filter(e => e.priority === "critical").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Require immediate attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {escalations.filter(e => e.status === "in_progress").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Being actively worked on
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3.2 days</div>
              <p className="text-xs text-muted-foreground">
                -15% from last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Escalations List */}
        <Card>
          <CardHeader>
            <CardTitle>Escalated Cases</CardTitle>
            <CardDescription>
              High-priority support cases requiring special attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredEscalations.map((escalation) => (
                <div
                  key={escalation.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex items-center gap-2">
                      {getPriorityIcon(escalation.priority)}
                      <Badge className={getPriorityColor(escalation.priority)}>
                        {escalation.priority}
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-semibold">{escalation.title}</h4>
                        <span className="font-mono text-sm text-purple-600">{escalation.id}</span>
                        <Badge className={getStatusColor(escalation.status)}>
                          {escalation.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline">{escalation.category}</Badge>
                      </div>
                      <p className="text-gray-600 mb-2 line-clamp-1">
                        {escalation.description}
                      </p>
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {escalation.customer.name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Escalated {new Date(escalation.escalatedAt).toLocaleDateString()}
                        </div>
                        {escalation.assignedTo && (
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            Assigned to {escalation.assignedTo}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          {escalation.updates.length} updates
                        </div>
                        {escalation.estimatedResolution && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            ETA: {new Date(escalation.estimatedResolution).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={escalation.status}
                      onValueChange={(value) => handleStatusChange(escalation.id, value)}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="pending_review">Pending Review</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewEscalation(escalation)}
                      className="text-purple-600 border-purple-200 hover:bg-purple-50"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {filteredEscalations.length === 0 && (
              <div className="text-center py-12">
                <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No escalations found</h3>
                <p className="text-gray-500 mb-4">
                  No escalations match your current filters. Try adjusting your search criteria.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setPriorityFilter("all");
                    setStatusFilter("all");
                    setAssigneeFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Escalation Details Dialog */}
        <Dialog open={isEscalationDialogOpen} onOpenChange={setIsEscalationDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            {selectedEscalation && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    {getPriorityIcon(selectedEscalation.priority)}
                    <span>{selectedEscalation.title}</span>
                    <Badge className={getPriorityColor(selectedEscalation.priority)}>
                      {selectedEscalation.priority}
                    </Badge>
                    <Badge className={getStatusColor(selectedEscalation.status)}>
                      {selectedEscalation.status.replace('_', ' ')}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription>
                    {selectedEscalation.id} • Original Ticket: {selectedEscalation.originalTicketId}
                  </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="updates">Updates ({selectedEscalation.updates.length})</TabsTrigger>
                    <TabsTrigger value="customer">Customer Info</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Escalation Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <Label className="font-semibold">Description</Label>
                            <p className="text-gray-600 mt-1">{selectedEscalation.description}</p>
                          </div>
                          <div>
                            <Label className="font-semibold">Escalation Reason</Label>
                            <p className="text-gray-600 mt-1">{selectedEscalation.escalationReason}</p>
                          </div>
                          <div>
                            <Label className="font-semibold">Category</Label>
                            <Badge variant="outline" className="mt-1">{selectedEscalation.category}</Badge>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Assignment & Timeline</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <Label className="font-semibold">Escalated By</Label>
                            <p className="text-gray-600 mt-1">{selectedEscalation.escalatedBy}</p>
                          </div>
                          <div>
                            <Label className="font-semibold">Escalated At</Label>
                            <p className="text-gray-600 mt-1">
                              {new Date(selectedEscalation.escalatedAt).toLocaleString()}
                            </p>
                          </div>
                          {selectedEscalation.assignedTo && (
                            <div>
                              <Label className="font-semibold">Assigned To</Label>
                              <p className="text-gray-600 mt-1">{selectedEscalation.assignedTo}</p>
                            </div>
                          )}
                          {selectedEscalation.estimatedResolution && (
                            <div>
                              <Label className="font-semibold">Estimated Resolution</Label>
                              <p className="text-gray-600 mt-1">
                                {new Date(selectedEscalation.estimatedResolution).toLocaleString()}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="updates" className="space-y-4">
                    <div className="space-y-4">
                      {/* Add Comment */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Add Update</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <Textarea
                              placeholder="Add a comment or update..."
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              rows={3}
                            />
                            <div className="flex justify-between items-center">
                              <Button variant="outline" size="sm">
                                <Paperclip className="h-4 w-4 mr-2" />
                                Attach File
                              </Button>
                              <Button 
                                onClick={handleAddComment}
                                disabled={!newComment.trim()}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Add Update
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Updates Timeline */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Update History</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {selectedEscalation.updates.map((update, index) => (
                              <div key={update.id} className="flex gap-3 pb-4 border-b last:border-b-0">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>
                                    {update.author.split(" ").map(n => n[0]).join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold">{update.author}</span>
                                    <Badge variant="secondary" className="text-xs">
                                      {update.type.replace('_', ' ')}
                                    </Badge>
                                    <span className="text-sm text-gray-500">
                                      {new Date(update.timestamp).toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="text-gray-600">{update.message}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="customer" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Customer Information</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 mb-4">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={selectedEscalation.customer.avatar} />
                            <AvatarFallback>
                              {selectedEscalation.customer.name.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="text-xl font-semibold">{selectedEscalation.customer.name}</h3>
                            <div className="flex items-center gap-4 text-gray-600">
                              <div className="flex items-center gap-1">
                                <Mail className="h-4 w-4" />
                                {selectedEscalation.customer.email}
                              </div>
                              {selectedEscalation.customer.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-4 w-4" />
                                  {selectedEscalation.customer.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <Button variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-50">
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email
                          </Button>
                          <Button variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-50">
                            <Phone className="h-4 w-4 mr-2" />
                            Call Customer
                          </Button>
                        </div>
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