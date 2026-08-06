import React, { useEffect, useState } from 'react';
import ClientLayout from '../../components/ClientLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MessageCircle, 
  Phone, 
  Mail, 
  Clock, 
  HelpCircle, 
  Search,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { apiRequest } from '@/lib/api';

interface SupportTicket {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  category: string;
}

interface FAQItem {
  id: number | string;
  question: string;
  answer: string;
  category: string;
}

const Support = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: '',
    priority: '',
    description: ''
  });
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [faqsLoading, setFaqsLoading] = useState(true);
  const [faqsError, setFaqsError] = useState<string | null>(null);

  const getStatusColor = (status: SupportTicket['status'] | string) => {
    switch (status) {
      case 'open':
      case 'Open':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
      case 'Pending':
        return 'bg-purple-100 text-purple-800';
      case 'resolved':
      case 'Resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
      case 'Closed':
        return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: SupportTicket['priority'] | string) => {
    switch (priority) {
      case 'high':
      case 'High':
        return 'bg-red-100 text-red-800';
      case 'medium':
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
      case 'Low':
        return 'bg-green-100 text-green-800';
      case 'urgent':
      case 'Urgent':
        return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatLabel = (value: string) => {
    return value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setTicketsLoading(true);
        setTicketsError(null);
        const data = await apiRequest('/api/support/tickets/my');
        setSupportTickets(data.tickets || []);
      } catch (error) {
        console.error('Error fetching support tickets:', error);
        setTicketsError('Failed to load tickets');
      } finally {
        setTicketsLoading(false);
      }
    };

    fetchTickets();
  }, []);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        setFaqsLoading(true);
        setFaqsError(null);
        const data = await apiRequest('/api/knowledge-base/faqs');
        const items = Array.isArray(data?.data) ? data.data : [];
        const mapped: FAQItem[] = items.map((f: any) => ({
          id: f.id,
          question: f.question,
          answer: f.answer,
          category: f.category
        }));
        setFaqs(mapped);
      } catch (error) {
        console.error('Error fetching FAQs:', error);
        setFaqsError('Failed to load FAQs');
      } finally {
        setFaqsLoading(false);
      }
    };

    fetchFaqs();
  }, []);

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ClientLayout title="Support Center" description="Get help and find answers to your questions">
      <div className="space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <Phone className="h-12 w-12 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Phone Support</h3>
              <p className="text-sm text-gray-600 mb-3">Call us at (475) 259-8768</p>
              <Button variant="outline" asChild>
                <a href="tel:+15551234567">Call Now</a>
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <Mail className="h-12 w-12 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Email Support</h3>
              <p className="text-sm text-gray-600 mb-3">Send us an email</p>
              <Button variant="outline" asChild>
                <a href="mailto:support@thescoremachine.com">
                  Send Email
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Support Hours */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-green-600" />
                <div>
                  <h4 className="font-semibold">Support Hours</h4>
                  <p className="text-sm text-gray-600">Monday To Saturday From 11:00AM to 7:00PM EST</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">
                Currently Open
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="faq" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="tickets">My Tickets</TabsTrigger>
            <TabsTrigger value="contact">Contact Us</TabsTrigger>
          </TabsList>

          <TabsContent value="faq">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  Frequently Asked Questions
                </CardTitle>
                <CardDescription>
                  Find quick answers to common questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search FAQs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {faqsLoading && (
                  <div className="text-sm text-gray-600">Loading FAQs...</div>
                )}
                {faqsError && (
                  <div className="text-sm text-red-600">{faqsError}</div>
                )}
                {!faqsLoading && !faqsError && (
                  <>
                    <div className="space-y-4">
                      {filteredFaqs.map((faq) => (
                        <div key={faq.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold">{faq.question}</h4>
                            <Badge variant="outline">{faq.category}</Badge>
                          </div>
                          <p className="text-sm text-gray-600">{faq.answer}</p>
                        </div>
                      ))}
                    </div>

                    {filteredFaqs.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No FAQs found matching your search.</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tickets">
            <Card>
              <CardHeader>
                <CardTitle>Support Tickets</CardTitle>
                <CardDescription>
                  View and manage your support requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ticketsLoading && (
                  <div className="text-sm text-gray-600">Loading tickets...</div>
                )}
                {ticketsError && (
                  <div className="text-sm text-red-600">{ticketsError}</div>
                )}
                {!ticketsLoading && !ticketsError && supportTickets.length === 0 && (
                  <div className="text-sm text-gray-500">No tickets yet.</div>
                )}
                {!ticketsLoading && !ticketsError && supportTickets.length > 0 && (
                  <div className="space-y-4">
                    {supportTickets.map((ticket) => (
                      <div key={ticket.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">{ticket.subject}</h4>
                            <p className="text-sm text-gray-600">Ticket #{ticket.id}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={getStatusColor(ticket.status)}>
                              {formatLabel(ticket.status)}
                            </Badge>
                            <Badge className={getPriorityColor(ticket.priority)}>
                              {formatLabel(ticket.priority)}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                          <div>
                            <span className="text-gray-600">Created:</span>
                            <span className="ml-2 font-medium">
                              {new Date(ticket.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Last Update:</span>
                            <span className="ml-2 font-medium">
                              {new Date(ticket.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                          <Button variant="outline" size="sm">
                            Add Reply
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6">
                  <Button className="bg-green-600 hover:bg-green-700">
                    Create New Ticket
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle>Contact Support</CardTitle>
                <CardDescription>
                  Submit a new support request
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="Brief description of your issue"
                      value={ticketForm.subject}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, subject: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select value={ticketForm.category} onValueChange={(value) => setTicketForm(prev => ({ ...prev, category: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General Question</SelectItem>
                          <SelectItem value="technical">Technical Issue</SelectItem>
                          <SelectItem value="billing">Billing</SelectItem>
                          <SelectItem value="dispute">Dispute Process</SelectItem>
                          <SelectItem value="account">Account Management</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={ticketForm.priority} onValueChange={(value) => setTicketForm(prev => ({ ...prev, priority: value }))}>
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
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Please provide detailed information about your issue..."
                      rows={6}
                      value={ticketForm.description}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button className="bg-green-600 hover:bg-green-700">
                      Submit Ticket
                    </Button>
                    <Button variant="outline">
                      Save Draft
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </ClientLayout>
  );
};

export default Support;
