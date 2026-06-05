import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SupportLayout from "@/components/SupportLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Ticket,
  MessageSquare,
  Users,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Timer,
  Star,
  Activity,
} from "lucide-react";

interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  avgResponseTime: string;
  satisfaction: number;
}

interface RecentTicket {
  id: string | number;
  title: string;
  customer: {
    name: string;
    email: string;
  } | string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "pending" | "resolved" | "closed";
  createdAt: string;
  timeAgo: string;
  assignee?: string;
}

interface TeamPerformance {
  ticketsResolved: number;
  firstResponseTime: string;
  resolutionRate: string;
}

export default function SupportDashboard() {
  const navigate = useNavigate();
  const [ticketStats, setTicketStats] = useState<TicketStats>({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    avgResponseTime: "0 hours",
    satisfaction: 0,
  });

  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance>({
    ticketsResolved: 0,
    firstResponseTime: "0h",
    resolutionRate: "0%",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Import apiRequest function
        const { apiRequest } = await import('@/lib/api');
        
        // Fetch dashboard stats
        const statsResponse = await apiRequest('/api/support/dashboard/stats');
        if (statsResponse) {
          setTicketStats(statsResponse);
        }

        // Fetch recent tickets
        const ticketsResponse = await apiRequest('/api/support/dashboard/recent-tickets?limit=5');
        if (ticketsResponse) {
          setRecentTickets(ticketsResponse);
        }

        // Fetch team performance
        const performanceResponse = await apiRequest('/api/support/dashboard/performance');
        if (performanceResponse) {
          setTeamPerformance(performanceResponse);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "resolved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <SupportLayout
      title="Support Dashboard"
      description="Monitor support metrics and manage customer requests"
    >
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : ticketStats.total}</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{loading ? '...' : ticketStats.open}</div>
              <p className="text-xs text-muted-foreground">
                Requires immediate attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : ticketStats.avgResponseTime}</div>
              <p className="text-xs text-muted-foreground">
                -15% from last week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : `${ticketStats.satisfaction}/5.0`}</div>
              <p className="text-xs text-muted-foreground">
                +0.2 from last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common support tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button className="h-20 flex flex-col items-center justify-center space-y-2 bg-purple-600 hover:bg-purple-700">
                <Ticket className="h-6 w-6" />
                <span>Create New Ticket</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2 border-purple-200 text-purple-700 hover:bg-purple-50">
                <MessageSquare className="h-6 w-6" />
                <span>Start Live Chat</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2 border-purple-200 text-purple-700 hover:bg-purple-50">
                <Users className="h-6 w-6" />
                <span>View All Users</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2 border-purple-200 text-purple-700 hover:bg-purple-50" onClick={() => navigate('/support/affiliate-import')}>
                <Users className="h-6 w-6" />
                <span>Import Affiliates CSV</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Tickets */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Tickets</CardTitle>
            <CardDescription>
              Latest support requests and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">Loading recent tickets...</div>
                </div>
              ) : recentTickets.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">No recent tickets found</div>
                </div>
              ) : (
                recentTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium text-sm">{ticket.id}</span>
                        <Badge className={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                        <Badge className={getStatusColor(ticket.status)}>
                          {ticket.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <h4 className="font-medium mt-1">{ticket.title}</h4>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                        <span>Customer: {typeof ticket.customer === 'string' ? ticket.customer : ticket.customer.name}</span>
                        <span>Created: {ticket.timeAgo}</span>
                        {ticket.assignee && <span>Assignee: {ticket.assignee}</span>}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700 hover:bg-purple-50">
                        View
                      </Button>
                      {ticket.status === "open" && (
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                          Assign
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 text-center">
              <Button variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50">
                View All Tickets
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance</CardTitle>
              <CardDescription>
                Support team metrics for this week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tickets Resolved</span>
                  <span className="text-2xl font-bold text-green-600">{loading ? '...' : teamPerformance.ticketsResolved}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">First Response Time</span>
                  <span className="text-2xl font-bold">{loading ? '...' : teamPerformance.firstResponseTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Resolution Rate</span>
                  <span className="text-2xl font-bold text-green-600">{loading ? '...' : teamPerformance.resolutionRate}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>
                Current system health and alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">API Services</span>
                  </div>
                  <span className="text-sm text-green-600">Operational</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Database</span>
                  </div>
                  <span className="text-sm text-green-600">Operational</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">Email Service</span>
                  </div>
                  <span className="text-sm text-yellow-600">Degraded</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SupportLayout>
  );
}