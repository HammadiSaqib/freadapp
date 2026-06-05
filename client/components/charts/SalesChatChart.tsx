import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ChatStatsData {
  date: string;
  total_messages: number;
  active_users: number;
  avg_response_time: number;
}

interface TopAgent {
  first_name: string;
  last_name: string;
  messages_sent: number;
  avg_response_time: number;
  clients_helped: number;
}

interface ConversionStats {
  total_chat_users: number;
  converted_users: number;
  conversion_rate: number;
}

interface SalesChatData {
  chatStats: ChatStatsData[];
  topAgents: TopAgent[];
  conversionStats: ConversionStats;
}

interface SalesChatChartProps {
  data: SalesChatData;
  loading?: boolean;
}

const SalesChatChart: React.FC<SalesChatChartProps> = ({ data, loading = false }) => {
  // Debug logging
  console.log('=== SalesChatChart Debug ===');
  console.log('Raw data received:', data);
  console.log('Loading state:', loading);
  console.log('Data type:', typeof data);
  console.log('Data is null/undefined:', data === null || data === undefined);
  
  if (data) {
    console.log('Data properties:');
    console.log('- chatStats:', data.chatStats, 'length:', data.chatStats?.length);
    console.log('- topAgents:', data.topAgents, 'length:', data.topAgents?.length);
    console.log('- conversionStats:', data.conversionStats);
  }
  console.log('=== End SalesChatChart Debug ===');

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-100 animate-pulse rounded"></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-100 animate-pulse rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Add null/undefined checks for data and its properties
  if (!data) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales Chat Analytics</CardTitle>
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
  const hasNoData = (!data.chatStats || data.chatStats.length === 0) && 
                    (!data.topAgents || data.topAgents.length === 0) &&
                    (!data.conversionStats || Object.keys(data.conversionStats).length === 0);

  if (hasNoData) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales Chat Analytics</CardTitle>
            <CardDescription>No chat activity in the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              No chat messages found in the last 30 days. Chat analytics will appear here once users start messaging.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatAgentName = (agent: TopAgent) => {
    return `${agent.first_name} ${agent.last_name}`;
  };

  return (
    <div className="space-y-6">
      {/* Conversion Rate Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Chat Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {(data.conversionStats?.total_chat_users ?? 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Converted Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(data.conversionStats?.converted_users ?? 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {data.conversionStats?.conversion_rate ? 
                (typeof data.conversionStats.conversion_rate === 'string' ? 
                  parseFloat(data.conversionStats.conversion_rate).toFixed(1) : 
                  data.conversionStats.conversion_rate.toFixed(1)
                ) : '0.0'}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Chat Activity Trends</CardTitle>
          <CardDescription>Daily message volume and user engagement over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.chatStats || []}>
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
                  name === 'total_messages' ? 'Total Messages' :
                  name === 'active_users' ? 'Active Users' :
                  'Avg Response Time (min)'
                ]}
              />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="total_messages" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Total Messages"
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="active_users" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Active Users"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="avg_response_time" 
                stroke="#f59e0b" 
                strokeWidth={2}
                name="Avg Response Time (min)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Performing Agents */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Sales Agents</CardTitle>
          <CardDescription>Agents ranked by message volume and client engagement</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.topAgents || []} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis 
                type="category" 
                dataKey="first_name"
                tickFormatter={(value, index) => 
                  data.topAgents && data.topAgents[index] 
                    ? formatAgentName(data.topAgents[index])
                    : value
                }
                width={100}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value, name) => [
                  typeof value === 'number' ? (value ?? 0).toLocaleString() : (value ?? '0'),
                  name === 'messages_sent' ? 'Messages Sent' :
                  name === 'clients_helped' ? 'Clients Helped' :
                  'Avg Response Time (min)'
                ]}
              />
              <Legend />
              <Bar dataKey="messages_sent" fill="#3b82f6" name="Messages Sent" />
              <Bar dataKey="clients_helped" fill="#10b981" name="Clients Helped" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesChatChart;