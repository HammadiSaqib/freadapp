import { useState, useEffect } from "react";
import SupportLayout from "@/components/SupportLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from "recharts";
import { apiRequest } from '@/lib/api';
import {
  TrendingUp,
  TrendingDown,
  Users,
  User,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertTriangle,
  Star,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  Target,
  Award,
  Activity,
  Zap
} from "lucide-react";

interface MetricCard {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
  icon: React.ReactNode;
}

interface ChartData {
  name: string;
  value: number;
  tickets?: number;
  resolved?: number;
  satisfaction?: number;
}

// API functions for fetching support reports data
const fetchSupportMetrics = async (period: string) => {
  try {
    const response = await apiRequest(`/support/reports/metrics?period=${period}`);
    return response.data.data; // Extract the actual data from the wrapped response
  } catch (error) {
    console.error('Error fetching support metrics:', error);
    return null;
  }
};

const fetchAnalyticsData = async (period: string) => {
  try {
    const response = await apiRequest(`/support/reports/analytics?period=${period}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return null;
  }
};

const fetchAgentPerformance = async (period: string) => {
  try {
    const response = await apiRequest(`/support/reports/performance?period=${period}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching agent performance:', error);
    return null;
  }
};

export default function SupportReports() {
  const [dateRange, setDateRange] = useState("7d");
  const [selectedMetric, setSelectedMetric] = useState("tickets");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [ticketTrendData, setTicketTrendData] = useState<ChartData[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [satisfactionData, setSatisfactionData] = useState<any[]>([]);
  const [responseTimeData, setResponseTimeData] = useState<any[]>([]);
  const [agentPerformance, setAgentPerformance] = useState<any[]>([]);

  // Fetch data from API
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const [metricsData, analyticsData, performanceData] = await Promise.all([
          fetchSupportMetrics(dateRange),
          fetchAnalyticsData(dateRange),
          fetchAgentPerformance(dateRange)
        ]);

        if (metricsData) {
          setMetrics([
            {
              title: "Total Tickets",
              value: metricsData.totalTickets?.toString() || "0",
              change: metricsData.totalTicketsChange || "0%",
              trend: metricsData.totalTicketsChange?.startsWith('+') ? "up" : "down",
              icon: <MessageSquare className="h-4 w-4" />
            },
            {
              title: "Avg Response Time",
              value: metricsData.avgResponseTime || "0h",
              change: metricsData.avgResponseTimeChange || "0%",
              trend: metricsData.avgResponseTimeChange?.startsWith('-') ? "up" : "down",
              icon: <Clock className="h-4 w-4" />
            },
            {
              title: "Resolution Rate",
              value: metricsData.resolutionRate || "0%",
              change: metricsData.resolutionRateChange || "0%",
              trend: metricsData.resolutionRateChange?.startsWith('+') ? "up" : "down",
              icon: <CheckCircle className="h-4 w-4" />
            },
            {
              title: "Customer Satisfaction",
              value: metricsData.customerSatisfaction || "0/5",
              change: metricsData.customerSatisfactionChange || "0",
              trend: metricsData.customerSatisfactionChange?.startsWith('+') ? "up" : "down",
              icon: <Star className="h-4 w-4" />
            }
          ]);
        }

        if (analyticsData) {
          setTicketTrendData(analyticsData.trends || []);
          setCategoryData(analyticsData.categories || []);
          setSatisfactionData(analyticsData.satisfaction || []);
          setResponseTimeData(analyticsData.responseTime || []);
        }

        if (performanceData) {
          setAgentPerformance(performanceData.agents || []);
        }
      } catch (err) {
        setError('Failed to load support reports data');
        console.error('Error loading support reports:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dateRange]);

  const COLORS = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "up":
        return "text-green-600";
      case "down":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  if (loading) {
    return (
      <SupportLayout
        title="Reports & Analytics"
        description="View support team performance metrics and analytics"
      >
        <div className="space-y-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading support reports...</p>
            </div>
          </div>
        </div>
      </SupportLayout>
    );
  }

  if (error) {
    return (
      <SupportLayout
        title="Reports & Analytics"
        description="View support team performance metrics and analytics"
      >
        <div className="space-y-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()} variant="outline">
                Retry
              </Button>
            </div>
          </div>
        </div>
      </SupportLayout>
    );
  }

  return (
    <SupportLayout
      title="Reports & Analytics"
      description="View support team performance metrics and analytics"
    >
      <div className="space-y-6">
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tickets">Tickets</SelectItem>
                <SelectItem value="response">Response Time</SelectItem>
                <SelectItem value="satisfaction">Satisfaction</SelectItem>
                <SelectItem value="resolution">Resolution Rate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                {metric.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className={`flex items-center text-xs ${getTrendColor(metric.trend)}`}>
                  {getTrendIcon(metric.trend)}
                  <span className="ml-1">{metric.change} from last period</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ticket Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Trends</CardTitle>
              <CardDescription>
                Daily ticket volume and resolution rate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ticketTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="tickets" fill="#8b5cf6" name="New Tickets" />
                  <Bar dataKey="resolved" fill="#a78bfa" name="Resolved" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Ticket Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Categories</CardTitle>
              <CardDescription>
                Distribution of tickets by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Customer Satisfaction */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Satisfaction</CardTitle>
              <CardDescription>
                Monthly satisfaction ratings trend
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={satisfactionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 5]} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="satisfaction" 
                    stroke="#8b5cf6" 
                    strokeWidth={3}
                    dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Response Time */}
          <Card>
            <CardHeader>
              <CardTitle>Average Response Time</CardTitle>
              <CardDescription>
                Weekly response time trends (hours)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={responseTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#8b5cf6" 
                    fill="#c4b5fd" 
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Analytics</CardTitle>
            <CardDescription>
              Comprehensive performance metrics and insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="performance" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="performance">Team Performance</TabsTrigger>
                <TabsTrigger value="trends">Trends & Insights</TabsTrigger>
                <TabsTrigger value="goals">Goals & Targets</TabsTrigger>
              </TabsList>

              <TabsContent value="performance" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg mb-4">Agent Performance</h4>
                  {agentPerformance.map((agent, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <h5 className="font-semibold">{agent.name}</h5>
                            <p className="text-sm text-gray-500">{agent.ticketsResolved} tickets resolved</p>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                          {agent.efficiency}% efficiency
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Avg Response Time</p>
                          <p className="font-semibold">{agent.avgResponseTime}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Satisfaction</p>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="font-semibold">{agent.satisfaction}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Efficiency</p>
                          <Progress value={agent.efficiency} className="mt-1" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="trends" className="space-y-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Key Insights</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-semibold text-green-800">Response Time Improved</p>
                          <p className="text-sm text-green-600">18% faster than last month</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                        <Star className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-semibold text-blue-800">High Satisfaction</p>
                          <p className="text-sm text-blue-600">4.8/5 average rating this month</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                        <Activity className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="font-semibold text-purple-800">Peak Hours</p>
                          <p className="text-sm text-purple-600">Most tickets: 2-4 PM weekdays</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="font-semibold text-yellow-800">Staff Peak Hours</p>
                          <p className="text-sm text-yellow-600">Consider adding staff during 2-4 PM</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                        <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="font-semibold text-blue-800">Automate Common Issues</p>
                          <p className="text-sm text-blue-600">25% of tickets are billing-related</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                        <Award className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-semibold text-green-800">Knowledge Base</p>
                          <p className="text-sm text-green-600">Update FAQ for credit repair topics</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="goals" className="space-y-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Monthly Goals</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">Response Time</span>
                          <span className="text-sm text-gray-500">Target: &lt;2h</span>
                        </div>
                        <Progress value={85} className="mb-1" />
                        <p className="text-sm text-gray-600">Current: 2.4h (85% of goal)</p>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">Resolution Rate</span>
                          <span className="text-sm text-gray-500">Target: 95%</span>
                        </div>
                        <Progress value={94} className="mb-1" />
                        <p className="text-sm text-gray-600">Current: 94.2% (99% of goal)</p>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">Customer Satisfaction</span>
                          <span className="text-sm text-gray-500">Target: 4.5/5</span>
                        </div>
                        <Progress value={96} className="mb-1" />
                        <p className="text-sm text-gray-600">Current: 4.8/5 (107% of goal)</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Team Targets</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Target className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-semibold text-green-800">Tickets Resolved</p>
                            <p className="text-sm text-green-600">1,247 / 1,200 (104%)</p>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">Achieved</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-yellow-600" />
                          <div>
                            <p className="font-semibold text-yellow-800">First Response</p>
                            <p className="text-sm text-yellow-600">2.4h / 2.0h (83%)</p>
                          </div>
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Star className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="font-semibold text-blue-800">Quality Score</p>
                            <p className="text-sm text-blue-600">4.8 / 4.5 (107%)</p>
                          </div>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800">Exceeded</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </SupportLayout>
  );
}