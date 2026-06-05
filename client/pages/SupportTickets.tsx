import { useState, useEffect } from "react";
import SupportLayout from "@/components/SupportLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Search,
  Filter,
  Plus,
  Eye,
  MessageSquare,
  Clock,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Edit,
  Trash2,
  Send
} from "lucide-react";

interface Ticket {
  id: string;
  title: string;
  description: string;
  customer: {
    name: string;
    email: string;
    id: string;
  };
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "pending" | "resolved" | "closed";
  category: string;
  assignee?: {
    name: string;
    id: string;
  };
  created: string;
  updated: string;
  messages: TicketMessage[];
}

interface TicketMessage {
  id: string;
  content: string;
  author: {
    name: string;
    type: "customer" | "support";
  };
  timestamp: string;
}

export default function SupportTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const [createTicketForm, setCreateTicketForm] = useState({
    customer: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    title: "",
    description: "",
    category: "General"
  });
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);

  // Fetch tickets from API
  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(priorityFilter !== 'all' && { priority: priorityFilter })
      });

      const response = await fetch(`/api/support/tickets?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tickets');
      }

      const data = await response.json();
      setTickets(data.tickets || []);
      setPagination(prev => ({
        ...prev,
        total: data.total || 0,
        totalPages: data.totalPages || 0
      }));
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  // Load tickets on component mount and when filters change
  useEffect(() => {
    fetchTickets();
  }, [pagination.page, searchTerm, statusFilter, priorityFilter]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page !== 1) {
        setPagination(prev => ({ ...prev, page: 1 }));
      } else {
        fetchTickets();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "in_progress":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "resolved":
        return "bg-green-100 text-green-800 border-green-200";
      case "closed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertTriangle className="h-3 w-3" />;
      case "in_progress":
        return <Clock className="h-3 w-3" />;
      case "pending":
        return <Clock className="h-3 w-3" />;
      case "resolved":
        return <CheckCircle className="h-3 w-3" />;
      case "closed":
        return <XCircle className="h-3 w-3" />;
      default:
        return <AlertTriangle className="h-3 w-3" />;
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update ticket status');
      }

      // Update local state
      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId ? { ...ticket, status: newStatus as any } : ticket
      ));
    } catch (err) {
      console.error('Error updating ticket status:', err);
      setError('Failed to update ticket status');
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;

    try {
      const response = await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newMessage,
          author_type: 'support'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const newMessageData = await response.json();
      
      // Update tickets state
      setTickets(prev => prev.map(ticket => 
        ticket.id === selectedTicket.id 
          ? { ...ticket, messages: [...ticket.messages, newMessageData] }
          : ticket
      ));
      
      // Update selected ticket state
      setSelectedTicket(prev => prev ? {
        ...prev,
        messages: [...prev.messages, newMessageData]
      } : null);
      
      setNewMessage("");
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  };

  // Handle create ticket
  const handleCreateTicket = async () => {
    if (!createTicketForm.customer || !createTicketForm.title || !createTicketForm.description) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsCreatingTicket(true);
      setError(null);

      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: createTicketForm.title,
          description: createTicketForm.description,
          customer_email: createTicketForm.customer,
          priority: createTicketForm.priority,
          category: createTicketForm.category
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create ticket');
      }

      const newTicket = await response.json();
      
      // Add the new ticket to the list
      setTickets(prev => [newTicket, ...prev]);
      
      // Reset form and close dialog
      setCreateTicketForm({
        customer: "",
        priority: "medium",
        title: "",
        description: "",
        category: "General"
      });
      setIsCreateDialogOpen(false);
      
      // Refresh tickets to get updated data
      fetchTickets();
    } catch (err) {
      console.error('Error creating ticket:', err);
      setError('Failed to create ticket');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  // Reset create form when dialog closes
  const handleCreateDialogClose = (open: boolean) => {
    setIsCreateDialogOpen(open);
    if (!open) {
      setCreateTicketForm({
        customer: "",
        priority: "medium",
        title: "",
        description: "",
        category: "General"
      });
      setError(null);
    }
  };

  return (
    <SupportLayout
      title="Support Tickets"
      description="Manage and respond to customer support requests"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-1 gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search tickets..."
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
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={handleCreateDialogClose}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Ticket</DialogTitle>
                <DialogDescription>
                  Create a new support ticket for a customer issue.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer">Customer Email *</Label>
                    <Input 
                      id="customer" 
                      placeholder="customer@example.com"
                      value={createTicketForm.customer}
                      onChange={(e) => setCreateTicketForm(prev => ({ ...prev, customer: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select 
                      value={createTicketForm.priority} 
                      onValueChange={(value) => setCreateTicketForm(prev => ({ ...prev, priority: value as "low" | "medium" | "high" | "urgent" }))}
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
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={createTicketForm.category} 
                    onValueChange={(value) => setCreateTicketForm(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="General">General</SelectItem>
                      <SelectItem value="Technical">Technical</SelectItem>
                      <SelectItem value="Billing">Billing</SelectItem>
                      <SelectItem value="Account">Account</SelectItem>
                      <SelectItem value="Feature Request">Feature Request</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input 
                    id="title" 
                    placeholder="Brief description of the issue"
                    value={createTicketForm.title}
                    onChange={(e) => setCreateTicketForm(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Detailed description of the issue" 
                    rows={4}
                    value={createTicketForm.description}
                    onChange={(e) => setCreateTicketForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => handleCreateDialogClose(false)}
                    disabled={isCreatingTicket}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="bg-purple-600 hover:bg-purple-700" 
                    onClick={handleCreateTicket}
                    disabled={isCreatingTicket}
                  >
                    {isCreatingTicket ? 'Creating...' : 'Create Ticket'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Tickets List */}
        {loading ? (
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-4 w-16 bg-gray-200 rounded"></div>
                        <div className="h-5 w-12 bg-gray-200 rounded"></div>
                        <div className="h-5 w-16 bg-gray-200 rounded"></div>
                      </div>
                      <div className="h-6 w-3/4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 w-full bg-gray-200 rounded mb-3"></div>
                      <div className="flex items-center gap-6">
                        <div className="h-4 w-24 bg-gray-200 rounded"></div>
                        <div className="h-4 w-20 bg-gray-200 rounded"></div>
                        <div className="h-4 w-16 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-32 bg-gray-200 rounded"></div>
                      <div className="h-8 w-20 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4">
            {tickets.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No tickets found</h3>
                  <p className="text-gray-500 mb-4">There are no support tickets matching your current filters.</p>
                  <Button 
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Ticket
                  </Button>
                </CardContent>
              </Card>
            ) : (
              tickets.map((ticket) => (
                <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-sm text-purple-600">{ticket.id}</span>
                          <Badge className={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                          <Badge className={getStatusColor(ticket.status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(ticket.status)}
                              {ticket.status.replace("_", " ")}
                            </div>
                          </Badge>
                          <span className="text-sm text-gray-500">{ticket.category}</span>
                        </div>
                        <h3 className="font-semibold text-lg mb-2">{ticket.title}</h3>
                        <p className="text-gray-600 mb-3 line-clamp-2">{ticket.description}</p>
                        <div className="flex items-center gap-6 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {ticket.customer.name}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(ticket.created).toLocaleDateString()}
                          </div>
                          {ticket.assignee && (
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              Assigned to {ticket.assignee.name}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4" />
                            {ticket.messages.length} messages
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={ticket.status}
                          onValueChange={(value) => handleStatusChange(ticket.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedTicket(ticket)}
                              className="text-purple-600 border-purple-200 hover:bg-purple-50"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-3">
                                <span>{ticket.title}</span>
                                <Badge className={getPriorityColor(ticket.priority)}>
                                  {ticket.priority}
                                </Badge>
                                <Badge className={getStatusColor(ticket.status)}>
                                  {ticket.status.replace("_", " ")}
                                </Badge>
                              </DialogTitle>
                              <DialogDescription>
                                Ticket {ticket.id} • Created {new Date(ticket.created).toLocaleString()}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-6">
                              <div>
                                <h4 className="font-semibold mb-2">Description</h4>
                                <p className="text-gray-600">{ticket.description}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Customer</h4>
                                  <p>{ticket.customer.name}</p>
                                  <p className="text-sm text-gray-500">{ticket.customer.email}</p>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Assignment</h4>
                                  <p>{ticket.assignee ? ticket.assignee.name : "Unassigned"}</p>
                                </div>
                              </div>
                              <div>
                                <h4 className="font-semibold mb-4">Conversation</h4>
                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                  {ticket.messages.map((message) => (
                                    <div
                                      key={message.id}
                                      className={`p-4 rounded-lg ${
                                        message.author.type === "support"
                                          ? "bg-purple-50 ml-8"
                                          : "bg-gray-50 mr-8"
                                      }`}
                                    >
                                      <div className="flex justify-between items-start mb-2">
                                        <span className="font-medium">{message.author.name}</span>
                                        <span className="text-sm text-gray-500">
                                          {new Date(message.timestamp).toLocaleString()}
                                        </span>
                                      </div>
                                      <p>{message.content}</p>
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-4 space-y-2">
                                  <Textarea
                                    placeholder="Type your response..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    rows={3}
                                  />
                                  <div className="flex justify-end">
                                    <Button
                                      onClick={handleSendMessage}
                                      className="bg-purple-600 hover:bg-purple-700"
                                    >
                                      <Send className="h-4 w-4 mr-2" />
                                      Send Reply
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Pagination */}
        {!loading && tickets.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} tickets
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page <= 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </SupportLayout>
  );
}