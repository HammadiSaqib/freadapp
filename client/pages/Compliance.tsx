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
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Scale,
  Eye,
  Download,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Book,
  Gavel,
  Users,
  Calendar,
  Clock,
  Target,
  Award,
  Zap,
  Info,
  ExternalLink,
  MessageSquare,
  Settings,
  Bell,
  Flag,
  Edit,
  Trash2,
  Star,
  Lightbulb,
  Rocket,
} from "lucide-react";

// Mock compliance data
const complianceChecks = [
  {
    id: 1,
    type: "FCRA Section 611",
    description: "Dispute letter contains required consumer rights language",
    status: "Pass",
    severity: "High",
    letterIds: ["L001", "L003", "L007"],
    lastChecked: "2024-01-15",
    details:
      "All dispute letters include mandatory consumer rights disclosures per FCRA Section 611.",
  },
  {
    id: 2,
    type: "CROA Disclosure",
    description: "Contract includes required 3-day cancellation notice",
    status: "Warning",
    severity: "Critical",
    letterIds: ["C001", "C002"],
    lastChecked: "2024-01-14",
    details:
      "Some contracts missing complete CROA cancellation rights disclosure.",
  },
  {
    id: 3,
    type: "FCRA Section 603",
    description: "Permissible purpose documentation",
    status: "Pass",
    severity: "Medium",
    letterIds: ["R001", "R005"],
    lastChecked: "2024-01-15",
    details:
      "Proper permissible purpose documented for all credit report requests.",
  },
  {
    id: 4,
    type: "State Licensing",
    description: "Active credit services organization license verification",
    status: "Fail",
    severity: "Critical",
    letterIds: [],
    lastChecked: "2024-01-10",
    details:
      "License renewal required for California operations. Deadline: Jan 31, 2024.",
  },
];

const regulations = [
  {
    id: 1,
    title: "Fair Credit Reporting Act (FCRA)",
    section: "Section 611 - Procedure in Case of Disputed Accuracy",
    description:
      "Establishes consumer rights for disputing inaccurate information on credit reports.",
    requirements: [
      "Consumer must provide written notice of dispute",
      "CRA must investigate within 30 days",
      "Must include consumer rights disclosure",
      "Notification requirements for results",
    ],
    penalties: "Up to $1,000 per violation + attorney fees",
    lastUpdated: "2024-01-01",
  },
  {
    id: 2,
    title: "Funding Organizations Act (FROA)",
    section: "Section 404 - Required Disclosures",
    description:
      "Mandates specific disclosures and contract terms for funding services.",
    requirements: [
      "3-day cancellation right disclosure",
      "Written contract required",
      "No advance payment restrictions",
      "Prohibited misrepresentations",
    ],
    penalties: "Up to $10,000 per violation + damages",
    lastUpdated: "2023-12-15",
  },
  {
    id: 3,
    title: "Fair Debt Collection Practices Act (FDCPA)",
    section: "Section 809 - Validation Requirements",
    description:
      "Governs debt collection practices and validation requirements.",
    requirements: [
      "Initial communication notice",
      "Debt validation upon request",
      "Cease communication upon written request",
      "Prohibited practices restrictions",
    ],
    penalties: "Up to $1,000 per violation",
    lastUpdated: "2023-11-20",
  },
];

const auditResults = [
  {
    id: 1,
    date: "2024-01-15",
    type: "Automated Scan",
    itemsChecked: 247,
    violations: 3,
    warnings: 8,
    score: 94,
    status: "Completed",
  },
  {
    id: 2,
    date: "2024-01-08",
    type: "Manual Review",
    itemsChecked: 89,
    violations: 1,
    warnings: 4,
    score: 97,
    status: "Completed",
  },
  {
    id: 3,
    date: "2024-01-01",
    type: "Quarterly Audit",
    itemsChecked: 1250,
    violations: 12,
    warnings: 34,
    score: 91,
    status: "Completed",
  },
];

const templates = [
  {
    id: 1,
    name: "FCRA 611 Compliant Dispute Letter",
    category: "Dispute Letters",
    compliance: ["FCRA Section 611", "Consumer Rights"],
    lastUpdated: "2024-01-10",
    usage: 47,
    status: "Approved",
  },
  {
    id: 2,
    name: "CROA Service Agreement",
    category: "Contracts",
    compliance: ["CROA Section 404", "3-Day Cancellation"],
    lastUpdated: "2024-01-05",
    usage: 23,
    status: "Approved",
  },
  {
    id: 3,
    name: "Debt Validation Request",
    category: "Collection Disputes",
    compliance: ["FDCPA Section 809", "Validation Rights"],
    lastUpdated: "2023-12-28",
    usage: 31,
    status: "Under Review",
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Pass":
    case "Approved":
    case "Completed":
      return "bg-green-100 text-green-800 border-green-200";
    case "Warning":
    case "Under Review":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Fail":
    case "Critical":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "Critical":
      return "bg-red-100 text-red-800 border-red-200";
    case "High":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "Medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Low":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export default function Compliance() {
  const [selectedCheck, setSelectedCheck] = useState<any>(null);
  const [selectedRegulation, setSelectedRegulation] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <DashboardLayout
      title="Compliance Center"
      description="Secure access compliance monitoring and legal requirement management"
    >
      {/* Coming Soon Overlay */}
      <div className="relative">
        {/* Blurred Background Content */}
        <div className="blur-sm pointer-events-none select-none">
          {/* Compliance Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-green-50/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Compliance Score
                </CardTitle>
                <Shield className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">94%</div>
                <p className="text-xs text-muted-foreground">+2% from last month</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-red-50/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Violations
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">3</div>
                <p className="text-xs text-muted-foreground">-2 from last week</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-yellow-50/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Warnings</CardTitle>
                <Flag className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">8</div>
                <p className="text-xs text-muted-foreground">Requires attention</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-800 dark:to-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Last Audit</CardTitle>
                <Calendar className="h-4 w-4 text-ocean-blue" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold gradient-text-primary">15</div>
                <p className="text-xs text-muted-foreground">days ago</p>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 mb-8">
              <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="checks">Compliance Checks</TabsTrigger>
          <TabsTrigger value="regulations">Regulations</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="audits">Audit History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          {/* Compliance Dashboard */}
          <div className="grid lg:grid-cols-2 gap-8">
            <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="gradient-text-primary">
                  Compliance Health
                </CardTitle>
                <CardDescription>
                  Current compliance status across all requirements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">FCRA Compliance</span>
                      <span className="text-sm font-bold text-green-600">
                        96%
                      </span>
                    </div>
                    <Progress value={96} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      1 minor violation requiring attention
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">CROA Compliance</span>
                      <span className="text-sm font-bold text-yellow-600">
                        89%
                      </span>
                    </div>
                    <Progress value={89} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      2 contract disclosures need updating
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">State Licensing</span>
                      <span className="text-sm font-bold text-red-600">
                        78%
                      </span>
                    </div>
                    <Progress value={78} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      1 license renewal pending
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">FDCPA Compliance</span>
                      <span className="text-sm font-bold text-green-600">
                        98%
                      </span>
                    </div>
                    <Progress value={98} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      Excellent compliance record
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="gradient-text-secondary">
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Latest compliance checks and updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        FCRA Section 611 Check Passed
                      </p>
                      <p className="text-xs text-muted-foreground">
                        247 dispute letters verified • 2 hours ago
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        CROA Contract Warning
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Missing cancellation clause in 2 contracts • 4 hours ago
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        License Renewal Alert
                      </p>
                      <p className="text-xs text-muted-foreground">
                        California CSO license expires Jan 31 • 1 day ago
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Template Updated</p>
                      <p className="text-xs text-muted-foreground">
                        FCRA dispute template updated for new requirements • 2
                        days ago
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="gradient-text-primary">
                Quick Compliance Actions
              </CardTitle>
              <CardDescription>
                Common compliance tasks and tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button className="h-20 flex-col gradient-primary hover:opacity-90">
                  <Shield className="h-6 w-6 mb-2" />
                  Run Full Audit
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col border-ocean-blue/30 text-ocean-blue hover:bg-gradient-soft"
                >
                  <FileText className="h-6 w-6 mb-2" />
                  Check Documents
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col border-sea-green/30 text-sea-green hover:bg-gradient-soft"
                >
                  <Book className="h-6 w-6 mb-2" />
                  View Regulations
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col border-purple-300 text-purple-600 hover:bg-gradient-soft"
                >
                  <Download className="h-6 w-6 mb-2" />
                  Export Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checks" className="space-y-8">
          {/* Compliance Checks */}
          <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="gradient-text-primary">
                    Compliance Monitoring
                  </CardTitle>
                  <CardDescription>
                    Automated checks for legal requirements and violations
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                  <Button
                    size="sm"
                    className="gradient-primary hover:opacity-90"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Run Check
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complianceChecks.map((check) => (
                  <Card
                    key={check.id}
                    className="border border-border/40 hover:shadow-lg transition-all duration-200 cursor-pointer"
                    onClick={() => setSelectedCheck(check)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              check.status === "Pass"
                                ? "bg-green-500"
                                : check.status === "Warning"
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            }`}
                          ></div>
                          <div>
                            <h4 className="font-semibold">{check.type}</h4>
                            <p className="text-sm text-muted-foreground">
                              {check.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant="outline"
                            className={getSeverityColor(check.severity)}
                          >
                            {check.severity}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={getStatusColor(check.status)}
                          >
                            {check.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          <span className="text-muted-foreground">
                            Last Checked:
                          </span>
                          <span>
                            {new Date(check.lastChecked).toLocaleDateString()}
                          </span>
                        </div>
                        {check.letterIds.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {check.letterIds.length} items
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regulations" className="space-y-8">
          {/* Regulations Database */}
          <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="gradient-text-primary">
                    Legal Requirements Database
                  </CardTitle>
                  <CardDescription>
                    Comprehensive guide to funding regulations
                  </CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search regulations..."
                    className="pl-10 w-64 bg-gradient-light border-border/40"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {regulations.map((regulation) => (
                  <Card
                    key={regulation.id}
                    className="border border-border/40 hover:shadow-lg transition-all duration-200 cursor-pointer"
                    onClick={() => setSelectedRegulation(regulation)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold mb-2">
                            {regulation.title}
                          </h3>
                          <p className="text-sm text-ocean-blue font-medium mb-2">
                            {regulation.section}
                          </p>
                          <p className="text-muted-foreground">
                            {regulation.description}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          <Scale className="h-3 w-3 mr-1" />
                          Regulation
                        </Badge>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium mb-2">
                            Key Requirements:
                          </h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            {regulation.requirements.map((req, index) => (
                              <li key={index} className="flex items-start">
                                <CheckCircle className="h-3 w-3 text-green-600 mr-2 mt-0.5 shrink-0" />
                                {req}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Penalties:</h4>
                          <p className="text-sm text-red-600 font-medium">
                            {regulation.penalties}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Last Updated:{" "}
                            {new Date(
                              regulation.lastUpdated,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-8">
          {/* Compliance Templates */}
          <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="gradient-text-primary">
                    Compliance Templates
                  </CardTitle>
                  <CardDescription>
                    Legal-compliant document templates and forms
                  </CardDescription>
                </div>
                <Button size="sm" className="gradient-primary hover:opacity-90">
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className="border border-border/40 hover:shadow-lg transition-all duration-200"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold mb-1">
                            {template.name}
                          </h4>
                          <Badge
                            variant="outline"
                            className="border-purple-200 text-purple-800 mb-2"
                          >
                            {template.category}
                          </Badge>
                          <div className="flex flex-wrap gap-1">
                            {template.compliance.map((comp, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs border-green-200 text-green-800"
                              >
                                {comp}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant="outline"
                            className={getStatusColor(template.status)}
                          >
                            {template.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          <span className="text-muted-foreground">
                            Used {template.usage} times
                          </span>
                          <span className="text-muted-foreground">
                            Updated{" "}
                            {new Date(
                              template.lastUpdated,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-3 w-3 mr-1" />
                            Preview
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="h-3 w-3 mr-1" />
                            Download
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

        <TabsContent value="audits" className="space-y-8">
          {/* Audit History */}
          <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="gradient-text-primary">
                    Audit History
                  </CardTitle>
                  <CardDescription>
                    Past compliance audits and results
                  </CardDescription>
                </div>
                <Button size="sm" className="gradient-primary hover:opacity-90">
                  <Plus className="h-4 w-4 mr-2" />
                  New Audit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditResults.map((audit) => (
                  <Card
                    key={audit.id}
                    className="border border-border/40 hover:shadow-lg transition-all duration-200"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{audit.type}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(audit.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <div
                              className={`text-2xl font-bold ${
                                audit.score >= 95
                                  ? "text-green-600"
                                  : audit.score >= 85
                                    ? "text-yellow-600"
                                    : "text-red-600"
                              }`}
                            >
                              {audit.score}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Score
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={getStatusColor(audit.status)}
                          >
                            {audit.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center p-2 bg-gradient-light rounded">
                          <div className="font-bold text-ocean-blue">
                            {audit.itemsChecked}
                          </div>
                          <div className="text-muted-foreground">
                            Items Checked
                          </div>
                        </div>
                        <div className="text-center p-2 bg-gradient-light rounded">
                          <div className="font-bold text-red-600">
                            {audit.violations}
                          </div>
                          <div className="text-muted-foreground">
                            Violations
                          </div>
                        </div>
                        <div className="text-center p-2 bg-gradient-light rounded">
                          <div className="font-bold text-yellow-600">
                            {audit.warnings}
                          </div>
                          <div className="text-muted-foreground">Warnings</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </div>

        {/* Coming Soon Overlay Card */}
        <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm">
          <Card className="w-full max-w-md mx-4 border-0 shadow-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-ocean-blue to-sea-green rounded-full flex items-center justify-center mb-4">
                <Rocket className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold gradient-text-primary">
                Coming Soon
              </CardTitle>
              <CardDescription className="text-base">
                Advanced Compliance Management System
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                We're building a comprehensive compliance management system with automated secure access monitoring, real-time violation detection, and intelligent compliance recommendations.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-center text-muted-foreground">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  Automated compliance scanning
                </div>
                <div className="flex items-center justify-center text-muted-foreground">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  Real-time violation alerts
                </div>
                <div className="flex items-center justify-center text-muted-foreground">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  Regulatory template library
                </div>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm font-medium text-ocean-blue">
                  Expected Launch: Q3 2026
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Compliance Check Details Modal */}
      {selectedCheck && (
        <Dialog
          open={!!selectedCheck}
          onOpenChange={() => setSelectedCheck(null)}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="gradient-text-primary text-xl">
                    {selectedCheck.type}
                  </DialogTitle>
                  <DialogDescription>
                    Compliance check details and recommendations
                  </DialogDescription>
                </div>
                <div className="flex gap-2">
                  <Badge
                    variant="outline"
                    className={getSeverityColor(selectedCheck.severity)}
                  >
                    {selectedCheck.severity}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={getStatusColor(selectedCheck.status)}
                  >
                    {selectedCheck.status}
                  </Badge>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6">
              <Card className="gradient-light border-0">
                <CardHeader>
                  <CardTitle className="text-lg">Check Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-base leading-relaxed mb-4">
                    {selectedCheck.details}
                  </p>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        Last Checked:
                      </span>
                      <p className="font-medium">
                        {new Date(
                          selectedCheck.lastChecked,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Affected Items:
                      </span>
                      <p className="font-medium">
                        {selectedCheck.letterIds.length} documents
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {selectedCheck.status !== "Pass" && (
                <Card className="border-0 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Lightbulb className="h-5 w-5 mr-2 text-yellow-600" />
                      Recommended Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-ocean-blue">
                        <div className="font-medium text-sm">
                          Immediate Action
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Review and update affected documents to ensure
                          compliance with current regulations.
                        </p>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-lg border-l-4 border-sea-green">
                        <div className="font-medium text-sm">Prevention</div>
                        <p className="text-sm text-muted-foreground">
                          Implement automated compliance checking in your
                          document generation workflow.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="outline">Mark as Resolved</Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
                <Button className="gradient-primary hover:opacity-90">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Re-run Check
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Regulation Details Modal */}
      {selectedRegulation && (
        <Dialog
          open={!!selectedRegulation}
          onOpenChange={() => setSelectedRegulation(null)}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="gradient-text-primary text-xl">
                {selectedRegulation.title}
              </DialogTitle>
              <DialogDescription>
                {selectedRegulation.section}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <Card className="gradient-light border-0">
                <CardHeader>
                  <CardTitle className="text-lg">Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-base leading-relaxed">
                    {selectedRegulation.description}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {selectedRegulation.requirements.map((req, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 shrink-0" />
                        <span className="text-sm">{req}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50/50">
                <CardHeader>
                  <CardTitle className="text-lg text-red-800">
                    Penalties for Non-Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-red-700 font-medium">
                    {selectedRegulation.penalties}
                  </p>
                </CardContent>
              </Card>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Full Text
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Guide
                </Button>
                <Button className="gradient-primary hover:opacity-90">
                  <Bookmark className="h-4 w-4 mr-2" />
                  Add to Library
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}

function Bookmark({ className, ...props }: any) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
      />
    </svg>
  );
}
