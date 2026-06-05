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
import { Textarea } from "@/components/ui/textarea";
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
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import {
  Zap,
  Play,
  Pause,
  Settings,
  Clock,
  Calendar,
  Mail,
  MessageSquare,
  FileText,
  Users,
  Target,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Plus,
  Edit,
  Trash2,
  Copy,
  ArrowRight,
  Bot,
  Webhook,
  Database,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Eye,
  BarChart3,
  TrendingUp,
  Activity,
  GitBranch,
  Timer,
  Bell,
  Send,
  Sparkles,
  Workflow,
  Cog,
  Rocket,
} from "lucide-react";

// Mock automation data
const workflows = [
  {
    id: 1,
    name: "New Client Onboarding",
    description: "Automated welcome sequence and initial setup for new clients",
    status: "Active",
    trigger: "Client Created",
    steps: 8,
    completions: 247,
    successRate: 96.2,
    lastRun: "2024-01-15 14:30",
    avgTime: "2.3 hours",
    category: "Client Management",
  },
  {
    id: 2,
    name: "Monthly Credit Report Refresh",
    description: "Automatically pull fresh credit reports every 30 days",
    status: "Active",
    trigger: "Schedule (Monthly)",
    steps: 5,
    completions: 1840,
    successRate: 98.7,
    lastRun: "2024-01-15 08:00",
    avgTime: "45 minutes",
    category: "Credit Monitoring",
  },
  {
    id: 3,
    name: "Dispute Follow-up Sequence",
    description: "Automated follow-up emails for pending dispute responses",
    status: "Active",
    trigger: "Dispute Status Change",
    steps: 6,
    completions: 567,
    successRate: 89.4,
    lastRun: "2024-01-15 16:45",
    avgTime: "1.2 hours",
    category: "Dispute Management",
  },
  {
    id: 4,
    name: "Payment Reminder System",
    description: "Automated payment reminders and dunning sequence",
    status: "Paused",
    trigger: "Payment Due",
    steps: 4,
    completions: 123,
    successRate: 78.9,
    lastRun: "2024-01-10 12:00",
    avgTime: "30 minutes",
    category: "Billing",
  },
];

const integrations = [
  {
    id: 1,
    name: "Credit Bureau APIs",
    type: "Data Source",
    status: "Connected",
    description: "Real-time credit report pulling from all major bureaus",
    endpoints: 3,
    lastSync: "2024-01-15 16:00",
  },
  {
    id: 2,
    name: "Email Service (SendGrid)",
    type: "Communication",
    status: "Connected",
    description: "Automated email delivery for client communications",
    endpoints: 1,
    lastSync: "2024-01-15 15:30",
  },
  {
    id: 3,
    name: "Payment Gateway (Stripe)",
    type: "Billing",
    status: "Connected",
    description: "Automated payment processing and subscription management",
    endpoints: 2,
    lastSync: "2024-01-15 14:45",
  },
  {
    id: 4,
    name: "Document Generator",
    type: "Document",
    status: "Active",
    description: "Automated dispute letter and form generation",
    endpoints: 4,
    lastSync: "2024-01-15 16:15",
  },
  {
    id: 5,
    name: "SMS Service (Twilio)",
    type: "Communication",
    status: "Disconnected",
    description: "SMS notifications and alerts for clients",
    endpoints: 1,
    lastSync: "2024-01-10 10:30",
  },
];

const automationStats = {
  totalWorkflows: 12,
  activeWorkflows: 9,
  totalRuns: 3847,
  successRate: 94.3,
  timeSaved: 247,
  costSaved: 12400,
};

const recentActivity = [
  {
    id: 1,
    workflow: "New Client Onboarding",
    client: "Sarah Johnson",
    action: "Welcome email sent",
    status: "Success",
    timestamp: "2024-01-15 16:45",
  },
  {
    id: 2,
    workflow: "Credit Report Refresh",
    client: "Multiple Clients",
    action: "47 reports updated",
    status: "Success",
    timestamp: "2024-01-15 16:30",
  },
  {
    id: 3,
    workflow: "Dispute Follow-up",
    client: "Michael Chen",
    action: "Follow-up reminder sent",
    status: "Success",
    timestamp: "2024-01-15 16:15",
  },
  {
    id: 4,
    workflow: "Payment Reminder",
    client: "Emma Davis",
    action: "Payment reminder failed",
    status: "Error",
    timestamp: "2024-01-15 15:50",
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Active":
    case "Connected":
    case "Success":
      return "bg-green-100 text-green-800 border-green-200";
    case "Paused":
    case "Disconnected":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Error":
    case "Failed":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case "Data Source":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "Communication":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "Billing":
      return "bg-green-100 text-green-800 border-green-200";
    case "Document":
      return "bg-orange-100 text-orange-800 border-orange-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export default function Automation() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [showNewWorkflow, setShowNewWorkflow] = useState(false);
  const [activeTab, setActiveTab] = useState("workflows");

  return (
    <DashboardLayout
      title="Automation Center"
      description="Manage workflows, integrations, and automated processes"
    >
      {/* Coming Soon Overlay */}
      <div className="relative">
        {/* Blurred Background Content */}
        <div className="blur-sm pointer-events-none select-none">
          {/* Automation Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-800 dark:to-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Workflows
                </CardTitle>
                <Zap className="h-4 w-4 text-ocean-blue" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold gradient-text-primary">
                  {automationStats.activeWorkflows}
                </div>
                <p className="text-xs text-muted-foreground">
                  of {automationStats.totalWorkflows} total
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-emerald-50/50 dark:from-slate-800 dark:to-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-sea-green" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold gradient-text-secondary">
                  {automationStats.successRate}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {automationStats.totalRuns} total runs
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-800 dark:to-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
                <Clock className="h-4 w-4 text-ocean-blue" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold gradient-text-primary">
                  {automationStats.timeSaved}h
                </div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-emerald-50/50 dark:from-slate-800 dark:to-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cost Savings</CardTitle>
                <TrendingUp className="h-4 w-4 text-sea-green" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold gradient-text-secondary">
                  ${automationStats.costSaved.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Monthly savings</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-8">
          {/* Workflows Management */}
          <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="gradient-text-primary">
                    Workflow Management
                  </CardTitle>
                  <CardDescription>
                    Create and manage automated business processes
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                  <Dialog
                    open={showNewWorkflow}
                    onOpenChange={setShowNewWorkflow}
                  >
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        className="gradient-primary hover:opacity-90"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        New Workflow
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="gradient-text-primary">
                          Create New Workflow
                        </DialogTitle>
                        <DialogDescription>
                          Build an automated process to streamline your
                          operations
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="workflowName">Workflow Name</Label>
                          <Input
                            id="workflowName"
                            placeholder="Enter workflow name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            placeholder="Describe what this workflow does"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="trigger">Trigger</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select trigger" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="client_created">
                                  Client Created
                                </SelectItem>
                                <SelectItem value="payment_due">
                                  Payment Due
                                </SelectItem>
                                <SelectItem value="dispute_filed">
                                  Dispute Filed
                                </SelectItem>
                                <SelectItem value="schedule">
                                  Schedule
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="category">Category</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="client_management">
                                  Client Management
                                </SelectItem>
                                <SelectItem value="credit_monitoring">
                                  Credit Monitoring
                                </SelectItem>
                                <SelectItem value="dispute_management">
                                  Dispute Management
                                </SelectItem>
                                <SelectItem value="billing">Billing</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => setShowNewWorkflow(false)}
                          >
                            Cancel
                          </Button>
                          <Button className="gradient-primary">
                            Create Workflow
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workflows.map((workflow) => (
                  <Card
                    key={workflow.id}
                    className="border border-border/40 hover:shadow-lg transition-all duration-200 cursor-pointer"
                    onClick={() => setSelectedWorkflow(workflow)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-ocean-blue to-sea-green rounded-lg flex items-center justify-center">
                            <Workflow className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{workflow.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {workflow.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant="outline"
                            className="border-purple-200 text-purple-800"
                          >
                            {workflow.category}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={getStatusColor(workflow.status)}
                          >
                            {workflow.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            Trigger:
                          </span>
                          <p className="font-medium">{workflow.trigger}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Steps:</span>
                          <p className="font-medium">{workflow.steps}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Success Rate:
                          </span>
                          <p className="font-medium text-green-600">
                            {workflow.successRate}%
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Avg. Time:
                          </span>
                          <p className="font-medium">{workflow.avgTime}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          Last run: {workflow.lastRun} • {workflow.completions}{" "}
                          completions
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={
                              workflow.status === "Active"
                                ? "text-red-600"
                                : "text-green-600"
                            }
                          >
                            {workflow.status === "Active" ? (
                              <Pause className="h-3 w-3 mr-1" />
                            ) : (
                              <Play className="h-3 w-3 mr-1" />
                            )}
                            {workflow.status === "Active" ? "Pause" : "Start"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-8">
          {/* Integrations Management */}
          <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="gradient-text-primary">
                    System Integrations
                  </CardTitle>
                  <CardDescription>
                    Manage external service connections and APIs
                  </CardDescription>
                </div>
                <Button size="sm" className="gradient-primary hover:opacity-90">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Integration
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {integrations.map((integration) => (
                  <Card
                    key={integration.id}
                    className="border border-border/40 hover:shadow-lg transition-all duration-200"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <Webhook className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold">
                              {integration.name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {integration.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant="outline"
                            className={getTypeColor(integration.type)}
                          >
                            {integration.type}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={getStatusColor(integration.status)}
                          >
                            {integration.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          <span className="text-muted-foreground">
                            {integration.endpoints} endpoints
                          </span>
                          <span className="text-muted-foreground">
                            Last sync: {integration.lastSync}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Settings className="h-3 w-3 mr-1" />
                            Configure
                          </Button>
                          <Button variant="ghost" size="sm">
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Test
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Available Integrations */}
          <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="gradient-text-secondary">
                Available Integrations
              </CardTitle>
              <CardDescription>
                Popular services you can integrate with
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="border border-border/40 p-4 text-center hover:shadow-lg transition-all duration-200 cursor-pointer">
                  <Database className="h-8 w-8 text-ocean-blue mx-auto mb-2" />
                  <h4 className="font-medium mb-1">Zapier</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Connect to 3000+ apps
                  </p>
                  <Button size="sm" variant="outline">
                    Connect
                  </Button>
                </Card>

                <Card className="border border-border/40 p-4 text-center hover:shadow-lg transition-all duration-200 cursor-pointer">
                  <Mail className="h-8 w-8 text-sea-green mx-auto mb-2" />
                  <h4 className="font-medium mb-1">Mailchimp</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Email marketing automation
                  </p>
                  <Button size="sm" variant="outline">
                    Connect
                  </Button>
                </Card>

                <Card className="border border-border/40 p-4 text-center hover:shadow-lg transition-all duration-200 cursor-pointer">
                  <BarChart3 className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <h4 className="font-medium mb-1">Google Analytics</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Track client interactions
                  </p>
                  <Button size="sm" variant="outline">
                    Connect
                  </Button>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-8">
          {/* Activity Log */}
          <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="gradient-text-primary">
                    Recent Activity
                  </CardTitle>
                  <CardDescription>
                    Latest automation executions and results
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button
                    size="sm"
                    className="gradient-primary hover:opacity-90"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <Card
                    key={activity.id}
                    className="border border-border/40 bg-gradient-light"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div
                            className={`w-3 h-3 rounded-full mt-2 ${
                              activity.status === "Success"
                                ? "bg-green-500"
                                : "bg-red-500"
                            }`}
                          ></div>
                          <div>
                            <h4 className="font-medium">{activity.workflow}</h4>
                            <p className="text-sm text-muted-foreground">
                              {activity.client} • {activity.action}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {activity.timestamp}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={getStatusColor(activity.status)}
                        >
                          {activity.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <div className="grid lg:grid-cols-2 gap-8">
            <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="gradient-text-primary">
                  Performance Metrics
                </CardTitle>
                <CardDescription>
                  Automation efficiency over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Success Rate</span>
                    <span className="text-sm text-green-600 font-bold">
                      94.3%
                    </span>
                  </div>
                  <Progress value={94.3} className="h-2" />

                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      Average Execution Time
                    </span>
                    <span className="text-sm text-ocean-blue font-bold">
                      1.2 hours
                    </span>
                  </div>
                  <Progress value={75} className="h-2" />

                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Error Rate</span>
                    <span className="text-sm text-red-600 font-bold">5.7%</span>
                  </div>
                  <Progress value={5.7} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="gradient-text-secondary">
                  Workflow Statistics
                </CardTitle>
                <CardDescription>Usage breakdown by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-4 bg-gradient-light rounded-lg">
                    <Activity className="h-8 w-8 text-ocean-blue mx-auto mb-2" />
                    <div className="text-2xl font-bold gradient-text-primary">
                      3,847
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Executions
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center p-3 bg-gradient-light rounded">
                      <div className="font-bold text-sea-green">1,234</div>
                      <div className="text-muted-foreground">Client Mgmt</div>
                    </div>
                    <div className="text-center p-3 bg-gradient-light rounded">
                      <div className="font-bold text-ocean-blue">892</div>
                      <div className="text-muted-foreground">Disputes</div>
                    </div>
                    <div className="text-center p-3 bg-gradient-light rounded">
                      <div className="font-bold text-purple-600">756</div>
                      <div className="text-muted-foreground">Monitoring</div>
                    </div>
                    <div className="text-center p-3 bg-gradient-light rounded">
                      <div className="font-bold text-yellow-600">965</div>
                      <div className="text-muted-foreground">Billing</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-8">
          {/* Automation Settings */}
          <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="gradient-text-primary">
                Automation Settings
              </CardTitle>
              <CardDescription>
                Configure global automation preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">
                    Enable Automation
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Master switch for all automated processes
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">
                    Error Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when workflows fail
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Daily Digest</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive daily automation summary
                  </p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">
                    Auto-retry Failed Tasks
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically retry failed workflow steps
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="gradient-text-secondary">
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose how you want to be notified about automation events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email Notifications</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@company.com"
                    defaultValue="admin@company.com"
                  />
                </div>
                <div>
                  <Label htmlFor="webhook">Webhook URL</Label>
                  <Input
                    id="webhook"
                    placeholder="https://api.example.com/webhook"
                  />
                </div>
              </div>

              <div>
                <Label className="text-base font-medium mb-3 block">
                  Notification Types
                </Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="workflow-success"
                      defaultChecked
                    />
                    <Label htmlFor="workflow-success">
                      Workflow completions
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="workflow-errors"
                      defaultChecked
                    />
                    <Label htmlFor="workflow-errors">Workflow errors</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="integration-issues" />
                    <Label htmlFor="integration-issues">
                      Integration disconnections
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="performance-alerts" />
                    <Label htmlFor="performance-alerts">
                      Performance degradation
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Health */}
          <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="gradient-text-primary">
                System Health
              </CardTitle>
              <CardDescription>
                Monitor automation system performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-gradient-light rounded-lg">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-lg font-bold text-green-600">
                    Healthy
                  </div>
                  <div className="text-sm text-muted-foreground">
                    System Status
                  </div>
                </div>

                <div className="text-center p-4 bg-gradient-light rounded-lg">
                  <Timer className="h-8 w-8 text-ocean-blue mx-auto mb-2" />
                  <div className="text-lg font-bold gradient-text-primary">
                    99.8%
                  </div>
                  <div className="text-sm text-muted-foreground">Uptime</div>
                </div>

                <div className="text-center p-4 bg-gradient-light rounded-lg">
                  <Cog className="h-8 w-8 text-sea-green mx-auto mb-2" />
                  <div className="text-lg font-bold gradient-text-secondary">
                    127ms
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Avg Response
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </div>

        {/* Coming Soon Overlay Card */}
        <div className="absolute inset-0 flex items-center justify-center bg-white/10 dark:bg-slate-900/10 backdrop-blur-sm">
          <Card className="w-full max-w-md mx-4 border-0 shadow-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full w-16 h-16 flex items-center justify-center">
                <Rocket className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold gradient-text-primary">
                Coming Soon
              </CardTitle>
              <CardDescription className="text-lg">
                Advanced Automation Center
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                We're building an intelligent automation platform that will revolutionize your workflow management with:
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>AI-powered workflow optimization</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Smart trigger detection</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Advanced integration hub</span>
                </div>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm font-medium text-muted-foreground">
                  Expected Launch: <span className="text-blue-600 dark:text-blue-400">Q3 2026</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Workflow Details Modal */}
      {selectedWorkflow && (
        <Dialog
          open={!!selectedWorkflow}
          onOpenChange={() => setSelectedWorkflow(null)}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="gradient-text-primary text-xl">
                    {selectedWorkflow.name}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedWorkflow.description}
                  </DialogDescription>
                </div>
                <div className="flex gap-2">
                  <Badge
                    variant="outline"
                    className="border-purple-200 text-purple-800"
                  >
                    {selectedWorkflow.category}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={getStatusColor(selectedWorkflow.status)}
                  >
                    {selectedWorkflow.status}
                  </Badge>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6">
              {/* Workflow Overview */}
              <div className="grid md:grid-cols-4 gap-4">
                <Card className="gradient-light border-0 text-center p-4">
                  <Clock className="h-6 w-6 text-ocean-blue mx-auto mb-2" />
                  <div className="font-bold text-ocean-blue">
                    {selectedWorkflow.avgTime}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Avg. Duration
                  </div>
                </Card>

                <Card className="gradient-light border-0 text-center p-4">
                  <Target className="h-6 w-6 text-sea-green mx-auto mb-2" />
                  <div className="font-bold text-sea-green">
                    {selectedWorkflow.successRate}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Success Rate
                  </div>
                </Card>

                <Card className="gradient-light border-0 text-center p-4">
                  <GitBranch className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                  <div className="font-bold text-purple-600">
                    {selectedWorkflow.steps}
                  </div>
                  <div className="text-xs text-muted-foreground">Steps</div>
                </Card>

                <Card className="gradient-light border-0 text-center p-4">
                  <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <div className="font-bold text-green-600">
                    {selectedWorkflow.completions}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Completions
                  </div>
                </Card>
              </div>

              {/* Workflow Steps */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Workflow Steps</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-ocean-blue to-sea-green rounded-full flex items-center justify-center text-white text-sm font-bold">
                        1
                      </div>
                      <div>
                        <div className="font-medium">
                          Trigger: Client Created
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Workflow starts when a new client is added to the
                          system
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-ocean-blue to-sea-green rounded-full flex items-center justify-center text-white text-sm font-bold">
                        2
                      </div>
                      <div>
                        <div className="font-medium">Send Welcome Email</div>
                        <p className="text-sm text-muted-foreground">
                          Automated welcome message with onboarding information
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-ocean-blue to-sea-green rounded-full flex items-center justify-center text-white text-sm font-bold">
                        3
                      </div>
                      <div>
                        <div className="font-medium">Create Client Portal</div>
                        <p className="text-sm text-muted-foreground">
                          Set up secure client access portal with login
                          credentials
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-ocean-blue to-sea-green rounded-full flex items-center justify-center text-white text-sm font-bold">
                        4
                      </div>
                      <div>
                        <div className="font-medium">Schedule Initial Call</div>
                        <p className="text-sm text-muted-foreground">
                          Automatically schedule consultation call and send
                          calendar invite
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="outline">
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </Button>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Workflow
                </Button>
                <Button className="gradient-primary hover:opacity-90">
                  <Play className="h-4 w-4 mr-2" />
                  Run Now
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}
