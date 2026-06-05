import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import {
  MessageSquare,
  Search,
  Download,
  Send,
  Brain,
  Sparkles,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Mail,
  Printer,
  Calendar,
  User,
  Building,
  DollarSign,
  Target,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Zap,
  Shield,
  Award,
  TrendingUp,
} from "lucide-react";

// Mock disputes data
const disputes = [
  {
    id: 1,
    clientName: "Sarah Johnson",
    clientId: 1,
    disputeType: "Collection Account",
    creditor: "ABC Medical Collections",
    amount: 750,
    status: "Pending Response",
    bureau: "Experian",
    dateFiled: "2024-01-10",
    dueDate: "2024-02-10",
    reason: "Not Mine",
    description: "This medical collection does not belong to me",
    priority: "High",
    aiGenerated: true,
  },
  {
    id: 2,
    clientName: "Michael Chen",
    clientId: 2,
    disputeType: "Credit Card",
    creditor: "Chase Bank",
    amount: 2450,
    status: "In Review",
    bureau: "TransUnion",
    dateFiled: "2024-01-15",
    dueDate: "2024-02-15",
    reason: "Incorrect Balance",
    description: "Balance amount is incorrect, should be $1,200",
    priority: "Medium",
    aiGenerated: true,
  },
  {
    id: 3,
    clientName: "Emma Davis",
    clientId: 3,
    disputeType: "Inquiry",
    creditor: "Auto Loan Company",
    amount: 0,
    status: "Resolved - Deleted",
    bureau: "Equifax",
    dateFiled: "2023-12-20",
    dueDate: "2024-01-20",
    reason: "Unauthorized Inquiry",
    description: "Did not authorize this hard inquiry",
    priority: "Low",
    aiGenerated: false,
  },
  {
    id: 4,
    clientName: "Robert Wilson",
    clientId: 4,
    disputeType: "Personal Information",
    creditor: "Credit Bureau",
    amount: 0,
    status: "Resolved - Updated",
    bureau: "Experian",
    dateFiled: "2024-01-05",
    dueDate: "2024-02-05",
    reason: "Incorrect Address",
    description: "Address information is outdated",
    priority: "Low",
    aiGenerated: true,
  },
  {
    id: 5,
    clientName: "Lisa Rodriguez",
    clientId: 5,
    disputeType: "Collection Account",
    creditor: "XYZ Collections",
    amount: 320,
    status: "Response Received",
    bureau: "TransUnion",
    dateFiled: "2024-01-12",
    dueDate: "2024-02-12",
    reason: "Paid in Full",
    description: "This collection was paid in full on 12/15/2023",
    priority: "High",
    aiGenerated: true,
  },
];

// Dispute templates
const disputeTemplates = [
  {
    id: 1,
    name: "Account Not Mine",
    category: "Identity Verification",
    description: "For accounts that don't belong to the consumer",
    template: `Dear Credit Bureau,

I am writing to dispute the following item on my credit report:

Account: {creditor}
Account Number: {accountNumber}
Amount: {amount}

I am disputing this account because I have never opened an account with this creditor and this account does not belong to me. I am requesting that this entire account be removed from my credit report.

Please investigate this matter and remove this account from my credit file.

Sincerely,
{clientName}`,
  },
  {
    id: 2,
    name: "Incorrect Balance",
    category: "Account Information",
    description: "For accounts with wrong balance amounts",
    template: `Dear Credit Bureau,

I am writing to dispute the balance amount listed for the following account:

Account: {creditor}
Account Number: {accountNumber}
Reported Balance: {reportedAmount}
Correct Balance: {correctAmount}

The balance shown on my credit report is incorrect. Please investigate and update this account with the correct balance information.

Sincerely,
{clientName}`,
  },
  {
    id: 3,
    name: "Paid Collection",
    category: "Collection Accounts",
    description: "For collections that have been paid",
    template: `Dear Credit Bureau,

I am disputing the following collection account:

Collection Agency: {creditor}
Account Number: {accountNumber}
Amount: {amount}

This collection account was paid in full on {paymentDate}. Please remove this account from my credit report as it should not appear after being satisfied.

Sincerely,
{clientName}`,
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Pending Response":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "In Review":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "Response Received":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "Resolved - Deleted":
      return "bg-green-100 text-green-800 border-green-200";
    case "Resolved - Updated":
      return "bg-green-100 text-green-800 border-green-200";
    case "Denied":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "High":
      return "bg-red-100 text-red-800 border-red-200";
    case "Medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Low":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export default function Disputes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [showNewDispute, setShowNewDispute] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [disputeForm, setDisputeForm] = useState({
    clientId: "",
    disputeType: "",
    creditor: "",
    amount: "",
    reason: "",
    description: "",
    bureau: "",
    priority: "Medium",
  });

  const filteredDisputes = disputes.filter((dispute) => {
    const matchesSearch =
      dispute.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispute.creditor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispute.reason.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || dispute.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: disputes.length,
    "Pending Response": disputes.filter((d) => d.status === "Pending Response")
      .length,
    "In Review": disputes.filter((d) => d.status === "In Review").length,
    "Response Received": disputes.filter(
      (d) => d.status === "Response Received",
    ).length,
    "Resolved - Deleted": disputes.filter(
      (d) => d.status === "Resolved - Deleted",
    ).length,
    "Resolved - Updated": disputes.filter(
      (d) => d.status === "Resolved - Updated",
    ).length,
  };

  const generateAIDispute = () => {
    // Simulate AI generation
    const aiSuggestions = [
      "Based on FCRA Section 611, I request verification of this account.",
      "This item appears to be a violation of the Fair Credit Reporting Act.",
      "Please provide proper documentation validating this debt.",
      "The information reported is inaccurate and requires immediate correction.",
    ];

    const randomSuggestion =
      aiSuggestions[Math.floor(Math.random() * aiSuggestions.length)];

    setDisputeForm({
      ...disputeForm,
      description: `${disputeForm.description}\n\n${randomSuggestion}`,
    });
  };

  return (
    <DashboardLayout
      title="Dispute Management"
      description="Manage credit disputes and generate AI-powered dispute letters"
    >
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-800 dark:to-slate-700">
          <CardContent className="p-4 text-center">
            <MessageSquare className="h-6 w-6 text-ocean-blue mx-auto mb-2" />
            <div className="text-2xl font-bold gradient-text-primary">89</div>
            <div className="text-xs text-muted-foreground">Total Disputes</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-emerald-50/50 dark:from-slate-800 dark:to-slate-700">
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-yellow-600">23</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-green-50/30">
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600">54</div>
            <div className="text-xs text-muted-foreground">Resolved</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-800 dark:to-slate-700">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 text-ocean-blue mx-auto mb-2" />
            <div className="text-2xl font-bold gradient-text-primary">94%</div>
            <div className="text-xs text-muted-foreground">Success Rate</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-emerald-50/50 dark:from-slate-800 dark:to-slate-700">
          <CardContent className="p-4 text-center">
            <Brain className="h-6 w-6 text-sea-green mx-auto mb-2" />
            <div className="text-2xl font-bold gradient-text-secondary">67</div>
            <div className="text-xs text-muted-foreground">AI Generated</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-purple-50/30">
          <CardContent className="p-4 text-center">
            <Award className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-600">18</div>
            <div className="text-xs text-muted-foreground">This Month</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="gradient-text-primary text-2xl">
                Dispute Management Center
              </CardTitle>
              <CardDescription>
                Track, manage, and generate AI-powered dispute letters
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Dialog open={showNewDispute} onOpenChange={setShowNewDispute}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="gradient-primary hover:opacity-90"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Dispute
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="gradient-text-primary text-xl">
                      Create New Dispute
                    </DialogTitle>
                    <DialogDescription>
                      Use AI to generate compliant and effective dispute letters
                    </DialogDescription>
                  </DialogHeader>

                  <Tabs defaultValue="form" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="form">Dispute Form</TabsTrigger>
                      <TabsTrigger value="templates">Templates</TabsTrigger>
                      <TabsTrigger value="preview">Preview & Send</TabsTrigger>
                    </TabsList>

                    <TabsContent value="form" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="clientId">Client</Label>
                          <Select
                            value={disputeForm.clientId}
                            onValueChange={(value) =>
                              setDisputeForm({
                                ...disputeForm,
                                clientId: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select client" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Sarah Johnson</SelectItem>
                              <SelectItem value="2">Michael Chen</SelectItem>
                              <SelectItem value="3">Emma Davis</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="disputeType">Dispute Type</Label>
                          <Select
                            value={disputeForm.disputeType}
                            onValueChange={(value) =>
                              setDisputeForm({
                                ...disputeForm,
                                disputeType: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Credit Card">
                                Credit Card
                              </SelectItem>
                              <SelectItem value="Collection Account">
                                Collection Account
                              </SelectItem>
                              <SelectItem value="Personal Information">
                                Personal Information
                              </SelectItem>
                              <SelectItem value="Inquiry">Inquiry</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="creditor">Creditor/Company</Label>
                          <Input
                            id="creditor"
                            value={disputeForm.creditor}
                            onChange={(e) =>
                              setDisputeForm({
                                ...disputeForm,
                                creditor: e.target.value,
                              })
                            }
                            placeholder="Enter creditor name"
                          />
                        </div>

                        <div>
                          <Label htmlFor="amount">Amount (if applicable)</Label>
                          <Input
                            id="amount"
                            type="number"
                            value={disputeForm.amount}
                            onChange={(e) =>
                              setDisputeForm({
                                ...disputeForm,
                                amount: e.target.value,
                              })
                            }
                            placeholder="0.00"
                          />
                        </div>

                        <div>
                          <Label htmlFor="bureau">Credit Bureau</Label>
                          <Select
                            value={disputeForm.bureau}
                            onValueChange={(value) =>
                              setDisputeForm({ ...disputeForm, bureau: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select bureau" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Experian">Experian</SelectItem>
                              <SelectItem value="TransUnion">
                                TransUnion
                              </SelectItem>
                              <SelectItem value="Equifax">Equifax</SelectItem>
                              <SelectItem value="All Three">
                                All Three
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="priority">Priority</Label>
                          <Select
                            value={disputeForm.priority}
                            onValueChange={(value) =>
                              setDisputeForm({
                                ...disputeForm,
                                priority: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="High">High</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="Low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-2">
                          <Label htmlFor="reason">Dispute Reason</Label>
                          <Input
                            id="reason"
                            value={disputeForm.reason}
                            onChange={(e) =>
                              setDisputeForm({
                                ...disputeForm,
                                reason: e.target.value,
                              })
                            }
                            placeholder="e.g., Not Mine, Incorrect Balance, Paid in Full"
                          />
                        </div>

                        <div className="col-span-2">
                          <div className="flex items-center justify-between mb-2">
                            <Label htmlFor="description">
                              Dispute Description
                            </Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={generateAIDispute}
                              className="gradient-primary text-white border-0"
                            >
                              <Brain className="h-4 w-4 mr-1" />
                              AI Enhance
                            </Button>
                          </div>
                          <Textarea
                            id="description"
                            value={disputeForm.description}
                            onChange={(e) =>
                              setDisputeForm({
                                ...disputeForm,
                                description: e.target.value,
                              })
                            }
                            placeholder="Describe the dispute in detail..."
                            rows={4}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="templates" className="space-y-4">
                      <div className="grid gap-4">
                        {disputeTemplates.map((template) => (
                          <Card
                            key={template.id}
                            className={`cursor-pointer transition-all ${
                              selectedTemplate?.id === template.id
                                ? "gradient-primary text-white"
                                : "hover:bg-gradient-soft"
                            }`}
                            onClick={() => setSelectedTemplate(template)}
                          >
                            <CardHeader>
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-lg">
                                    {template.name}
                                  </CardTitle>
                                  <CardDescription
                                    className={
                                      selectedTemplate?.id === template.id
                                        ? "text-white/80"
                                        : ""
                                    }
                                  >
                                    {template.description}
                                  </CardDescription>
                                </div>
                                <Badge
                                  variant={
                                    selectedTemplate?.id === template.id
                                      ? "secondary"
                                      : "outline"
                                  }
                                >
                                  {template.category}
                                </Badge>
                              </div>
                            </CardHeader>
                          </Card>
                        ))}
                      </div>

                      {selectedTemplate && (
                        <div className="mt-6">
                          <Label>Template Preview</Label>
                          <div className="mt-2 p-4 bg-muted/20 rounded-lg">
                            <pre className="text-sm whitespace-pre-wrap">
                              {selectedTemplate.template}
                            </pre>
                          </div>
                          <Button
                            className="mt-4 gradient-primary"
                            onClick={() => {
                              setDisputeForm({
                                ...disputeForm,
                                description: selectedTemplate.template,
                              });
                            }}
                          >
                            Use This Template
                          </Button>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="preview" className="space-y-4">
                      <div className="bg-gradient-light p-6 rounded-lg">
                        <h3 className="font-semibold mb-4">
                          Dispute Letter Preview
                        </h3>
                        <div className="space-y-3 text-sm">
                          <div>
                            <strong>Client:</strong>{" "}
                            {disputeForm.clientId === "1"
                              ? "Sarah Johnson"
                              : disputeForm.clientId === "2"
                                ? "Michael Chen"
                                : "Emma Davis"}
                          </div>
                          <div>
                            <strong>Dispute Type:</strong>{" "}
                            {disputeForm.disputeType}
                          </div>
                          <div>
                            <strong>Creditor:</strong> {disputeForm.creditor}
                          </div>
                          <div>
                            <strong>Amount:</strong> ${disputeForm.amount}
                          </div>
                          <div>
                            <strong>Bureau:</strong> {disputeForm.bureau}
                          </div>
                          <div>
                            <strong>Reason:</strong> {disputeForm.reason}
                          </div>
                          <div>
                            <strong>Description:</strong>
                            <div className="mt-1 p-3 bg-white rounded border">
                              {disputeForm.description}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button className="gradient-primary hover:opacity-90">
                          <Send className="h-4 w-4 mr-2" />
                          Send Dispute
                        </Button>
                        <Button variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </Button>
                        <Button variant="outline">
                          <Printer className="h-4 w-4 mr-2" />
                          Print & Mail
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search disputes..."
                className="pl-10 bg-gradient-light border-border/40"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Pending Response">
                    Pending Response
                  </SelectItem>
                  <SelectItem value="In Review">In Review</SelectItem>
                  <SelectItem value="Response Received">
                    Response Received
                  </SelectItem>
                  <SelectItem value="Resolved - Deleted">
                    Resolved - Deleted
                  </SelectItem>
                  <SelectItem value="Resolved - Updated">
                    Resolved - Updated
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                More Filters
              </Button>
            </div>
          </div>

          {/* Disputes Table */}
          <div className="rounded-lg border border-border/40 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="gradient-light">
                  <TableHead>Client</TableHead>
                  <TableHead>Dispute Details</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Bureau</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDisputes.map((dispute) => (
                  <TableRow
                    key={dispute.id}
                    className="hover:bg-gradient-light/50 cursor-pointer"
                    onClick={() => setSelectedDispute(dispute)}
                  >
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="gradient-primary text-white text-xs">
                            {dispute.clientName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {dispute.clientName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ID: {dispute.clientId}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{dispute.disputeType}</div>
                        <div className="text-sm text-muted-foreground">
                          {dispute.creditor}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {dispute.reason}
                        </div>
                        {dispute.aiGenerated && (
                          <Badge
                            variant="outline"
                            className="mt-1 border-sea-green/30 text-sea-green"
                          >
                            <Brain className="h-3 w-3 mr-1" />
                            AI Generated
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {dispute.amount > 0 ? (
                        <span className="font-medium">
                          ${dispute.amount.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getStatusColor(dispute.status)}
                      >
                        {dispute.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-ocean-blue/30 text-ocean-blue"
                      >
                        {dispute.bureau}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getPriorityColor(dispute.priority)}
                      >
                        {dispute.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">
                          {new Date(dispute.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDispute(dispute);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dispute Details Modal */}
      {selectedDispute && (
        <Dialog
          open={!!selectedDispute}
          onOpenChange={() => setSelectedDispute(null)}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="gradient-text-primary text-xl">
                    Dispute #{selectedDispute.id} - {selectedDispute.clientName}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedDispute.disputeType} dispute filed on{" "}
                    {new Date(selectedDispute.dateFiled).toLocaleDateString()}
                  </DialogDescription>
                </div>
                <div className="flex gap-2">
                  <Badge
                    variant="outline"
                    className={getStatusColor(selectedDispute.status)}
                  >
                    {selectedDispute.status}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={getPriorityColor(selectedDispute.priority)}
                  >
                    {selectedDispute.priority}
                  </Badge>
                </div>
              </div>
            </DialogHeader>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Dispute Information */}
              <Card className="gradient-light border-0">
                <CardHeader>
                  <CardTitle className="text-lg">Dispute Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-sm text-muted-foreground">
                        Type:
                      </span>
                      <p className="font-medium">
                        {selectedDispute.disputeType}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">
                        Bureau:
                      </span>
                      <p className="font-medium">{selectedDispute.bureau}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">
                        Creditor:
                      </span>
                      <p className="font-medium">{selectedDispute.creditor}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">
                        Amount:
                      </span>
                      <p className="font-medium">
                        {selectedDispute.amount > 0
                          ? `$${selectedDispute.amount.toLocaleString()}`
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">
                        Reason:
                      </span>
                      <p className="font-medium">{selectedDispute.reason}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">
                        Due Date:
                      </span>
                      <p className="font-medium">
                        {new Date(selectedDispute.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="text-sm text-muted-foreground">
                      Description:
                    </span>
                    <p className="mt-1 text-sm">
                      {selectedDispute.description}
                    </p>
                  </div>

                  {selectedDispute.aiGenerated && (
                    <div className="p-3 bg-sea-green/10 rounded-lg border border-sea-green/20">
                      <div className="flex items-center space-x-2 text-sea-green">
                        <Brain className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          AI Generated Letter
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        This dispute was enhanced using AI for optimal
                        compliance and effectiveness.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions & Timeline */}
              <div className="space-y-6">
                <Card className="gradient-light border-0">
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      size="sm"
                      className="w-full justify-start gradient-primary"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Check Status
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Letter
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Send Follow-up
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Dispute
                    </Button>
                  </CardContent>
                </Card>

                <Card className="gradient-light border-0">
                  <CardHeader>
                    <CardTitle className="text-lg">Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div>
                          <p className="text-sm font-medium">Dispute Filed</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(
                              selectedDispute.dateFiled,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                        <div>
                          <p className="text-sm font-medium">Under Review</p>
                          <p className="text-xs text-muted-foreground">
                            Bureau is investigating
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-gray-300 rounded-full mt-2"></div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Response Due
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(
                              selectedDispute.dueDate,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}
