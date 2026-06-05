import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ReportStatsData {
  date: string;
  total_reports: number;
  unique_users: number;
  successful_reports: number;
  failed_reports: number;
  avg_processing_time: number;
}

interface BureauStats {
  bureau_name: string;
  total_pulls: number;
  successful_pulls: number;
  avg_processing_time: number;
  failed_pulls: number;
}

interface UserActivity {
  first_name: string;
  last_name: string;
  email: string;
  reports_pulled: number;
  last_report_date: string;
  avg_processing_time: number;
}

interface ErrorAnalysis {
  error_type: string;
  error_count: number;
  error_percentage: number;
}

interface ReportPullingData {
  reportStats: ReportStatsData[];
  bureauStats: BureauStats[];
  userActivity: UserActivity[];
  errorAnalysis: ErrorAnalysis[];
}

interface ReportPullingChartProps {
  data: ReportPullingData;
  loading?: boolean;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const ReportPullingChart: React.FC<ReportPullingChartProps> = ({ data, loading = false }) => {
  // Debug logging
  console.log('=== ReportPullingChart Debug ===');
  console.log('Raw data received:', data);
  console.log('Loading state:', loading);
  console.log('Data type:', typeof data);
  console.log('Data is null/undefined:', data === null || data === undefined);
  
  if (data) {
    console.log('Data properties:');
    console.log('- reportStats:', data.reportStats, 'length:', data.reportStats?.length);
    console.log('- bureauStats:', data.bureauStats, 'length:', data.bureauStats?.length);
    console.log('- userActivity:', data.userActivity, 'length:', data.userActivity?.length);
    console.log('- errorAnalysis:', data.errorAnalysis, 'length:', data.errorAnalysis?.length);
  }
  console.log('=== End ReportPullingChart Debug ===');

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle>Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-100 animate-pulse rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Add null/undefined checks for data and its properties
  if (!data) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Report Pulling Analytics</CardTitle>
            <CardDescription>Unable to load analytics data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              No data available. Please check your connection and try again.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if we have empty data arrays
  const hasNoData = (!data.reportStats || data.reportStats.length === 0) && 
                    (!data.bureauStats || data.bureauStats.length === 0) &&
                    (!data.userActivity || data.userActivity.length === 0) &&
                    (!data.errorAnalysis || data.errorAnalysis.length === 0);

  if (hasNoData) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Report Pulling Analytics</CardTitle>
            <CardDescription>No report activity in the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              No credit reports pulled in the last 30 days. Analytics will appear here once users start pulling reports.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatUserName = (user: UserActivity) => {
    return `${user.first_name} ${user.last_name}`;
  };

  const successRate = (data.reportStats || []).reduce((acc, stat) => {
    const total = stat.successful_reports + stat.failed_reports;
    return total > 0 ? acc + (stat.successful_reports / total) * 100 : acc;
  }, 0) / Math.max((data.reportStats || []).length, 1);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {(data.reportStats || []).reduce((acc, stat) => acc + stat.total_reports, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {successRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {(data.userActivity || []).length.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {((data.reportStats || []).reduce((acc, stat) => acc + stat.avg_processing_time, 0) / Math.max((data.reportStats || []).length, 1)).toFixed(1)}s
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Activity Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Report Pulling Trends</CardTitle>
          <CardDescription>Daily report volume and success rates over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.reportStats || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                tick={{ fontSize: 12 }}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                labelFormatter={(value) => `Date: ${formatDate(value)}`}
                formatter={(value, name) => [
                  typeof value === 'number' ? (value ?? 0).toLocaleString() : (value ?? '0'),
                  name === 'total_reports' ? 'Total Reports' :
                  name === 'successful_reports' ? 'Successful Reports' :
                  name === 'failed_reports' ? 'Failed Reports' :
                  name === 'unique_users' ? 'Unique Users' :
                  'Avg Processing Time (s)'
                ]}
              />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="total_reports" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Total Reports"
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="successful_reports" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Successful Reports"
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="failed_reports" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="Failed Reports"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="avg_processing_time" 
                stroke="#f59e0b" 
                strokeWidth={2}
                name="Avg Processing Time (s)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bureau Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Bureau Performance</CardTitle>
            <CardDescription>Report pulling statistics by credit bureau</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.bureauStats || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bureau_name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    typeof value === 'number' ? (value ?? 0).toLocaleString() : (value ?? '0'),
                    name === 'total_pulls' ? 'Total Pulls' :
                    name === 'successful_pulls' ? 'Successful Pulls' :
                    'Failed Pulls'
                  ]}
                />
                <Legend />
                <Bar dataKey="successful_pulls" fill="#10b981" name="Successful Pulls" />
                <Bar dataKey="failed_pulls" fill="#ef4444" name="Failed Pulls" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Error Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Error Analysis</CardTitle>
            <CardDescription>Distribution of error types in failed reports</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.errorAnalysis || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ error_type, error_percentage }) => `${error_type}: ${error_percentage?.toFixed(1) || '0.0'}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="error_count"
                >
                  {(data.errorAnalysis || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name) => [
                    `${value} errors (${(data.errorAnalysis || []).find(e => e.error_count === value)?.error_percentage?.toFixed(1) || '0.0'}%)`,
                    'Count'
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Active Users */}
      <Card>
        <CardHeader>
          <CardTitle>Most Active Users</CardTitle>
          <CardDescription>Users with highest report pulling activity</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={(data.userActivity || []).slice(0, 10)} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis 
                type="category" 
                dataKey="first_name"
                tickFormatter={(value, index) => 
                  data.userActivity && data.userActivity[index] 
                    ? formatUserName(data.userActivity[index])
                    : value
                }
                width={120}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value, name) => [
                  typeof value === 'number' ? value.toLocaleString() : value,
                  name === 'reports_pulled' ? 'Reports Pulled' :
                  'Avg Processing Time (s)'
                ]}
              />
              <Legend />
              <Bar dataKey="reports_pulled" fill="#3b82f6" name="Reports Pulled" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportPullingChart;