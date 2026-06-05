import { useState, useEffect } from "react";
import AffiliateLayout from "@/components/AffiliateLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  MousePointer,
  Eye,
  Target,
  Calendar,
  Download,
  RefreshCw,
  Activity,
  Globe,
  Smartphone,
  Monitor,
  MapPin,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AnalyticsStats {
  totalClicks: number;
  uniqueVisitors: number;
  conversions: number;
  conversionRate: number;
  clickThroughRate: number;
  avgSessionDuration: string;
  bounceRate: number;
  topReferralSource: string;
}

interface TrafficSource {
  source: string;
  clicks: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
}

interface GeographicData {
  country: string;
  clicks: number;
  conversions: number;
  revenue: number;
}

interface DeviceData {
  device: string;
  clicks: number;
  percentage: number;
}

interface TimeSeriesData {
  date: string;
  clicks: number;
  conversions: number;
  revenue: number;
}

interface TopPerformingLinks {
  id: string;
  url: string;
  clicks: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
}

export default function AffiliateAnalytics() {
  const { toast } = useToast();
  const [stats, setStats] = useState<AnalyticsStats>({
    totalClicks: 0,
    uniqueVisitors: 0,
    conversions: 0,
    conversionRate: 0,
    clickThroughRate: 0,
    avgSessionDuration: "0:00",
    bounceRate: 0,
    topReferralSource: "N/A",
  });
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([]);
  const [geographicData, setGeographicData] = useState<GeographicData[]>([]);
  const [deviceData, setDeviceData] = useState<DeviceData[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [topLinks, setTopLinks] = useState<TopPerformingLinks[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30d");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const { affiliateApi } = await import('@/lib/api');
      
      // Fetch analytics stats
      const statsResponse = await affiliateApi.getAnalytics({ range: dateRange });
      if (statsResponse.data && statsResponse.data.success && statsResponse.data.data) {
        setStats(statsResponse.data.data);
      }

      // Fetch traffic sources
      const sourcesResponse = await affiliateApi.getTrafficSources({ range: dateRange });
      if (sourcesResponse.data && sourcesResponse.data.success && sourcesResponse.data.data) {
        setTrafficSources(sourcesResponse.data.data);
      }

      // Fetch geographic data
      const geoResponse = await affiliateApi.getGeographicData({ range: dateRange });
      if (geoResponse.data && geoResponse.data.success && geoResponse.data.data) {
        setGeographicData(geoResponse.data.data);
      }

      // Fetch device data
      const deviceResponse = await affiliateApi.getDeviceData({ range: dateRange });
      if (deviceResponse.data && deviceResponse.data.success && deviceResponse.data.data) {
        setDeviceData(deviceResponse.data.data);
      }

      // Fetch time series data
      const timeSeriesResponse = await affiliateApi.getTimeSeriesData({ range: dateRange });
      if (timeSeriesResponse.data && timeSeriesResponse.data.success && timeSeriesResponse.data.data) {
        setTimeSeriesData(timeSeriesResponse.data.data);
      }

      // Fetch top performing links
      const linksResponse = await affiliateApi.getTopLinks({ range: dateRange });
      if (linksResponse.data && linksResponse.data.success && linksResponse.data.data) {
        setTopLinks(linksResponse.data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchAnalyticsData();
    setRefreshing(false);
    toast({
      title: "Data Refreshed",
      description: "Analytics data has been updated",
    });
  };

  const exportAnalytics = () => {
    const csvContent = [
      ['Metric', 'Value'].join(','),
      ['Total Clicks', stats.totalClicks],
      ['Unique Visitors', stats.uniqueVisitors],
      ['Conversions', stats.conversions],
      ['Conversion Rate', `${stats.conversionRate}%`],
      ['Click Through Rate', `${stats.clickThroughRate}%`],
      ['Avg Session Duration', stats.avgSessionDuration],
      ['Bounce Rate', `${stats.bounceRate}%`],
      ['Top Referral Source', stats.topReferralSource],
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `affiliate-analytics-${dateRange}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Smartphone className="h-4 w-4" />;
      case 'desktop':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const formatDuration = (duration: string) => {
    return duration || "0:00";
  };

  return (
    <AffiliateLayout
      title="Analytics & Insights"
      description="Detailed performance analytics and insights"
    >
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={refreshData}
              variant="outline"
              size="sm"
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <Button onClick={exportAnalytics} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {loading ? '...' : (stats?.totalClicks ?? 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all referral links
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
              <Users className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {loading ? '...' : (stats?.uniqueVisitors ?? 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Individual users reached
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversions</CardTitle>
              <Target className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {loading ? '...' : (stats?.conversions ?? 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {loading ? '...' : `${(stats?.conversionRate ?? 0).toFixed(2)}%`} conversion rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Session</CardTitle>
              <Activity className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {loading ? '...' : formatDuration(stats.avgSessionDuration)}
              </div>
              <p className="text-xs text-muted-foreground">
                {loading ? '...' : `${stats.bounceRate.toFixed(1)}%`} bounce rate
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="traffic">Traffic Sources</TabsTrigger>
            <TabsTrigger value="geographic">Geographic</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
            <TabsTrigger value="links">Top Links</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Performance Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Trends</CardTitle>
                  <CardDescription>
                    Clicks, conversions, and revenue over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-lg flex items-center justify-center border">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Performance trends chart
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Interactive chart showing performance over time
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Key Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>Key Insights</CardTitle>
                  <CardDescription>
                    Important performance insights and recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-green-800 dark:text-green-200">
                        Strong Performance
                      </div>
                      <div className="text-sm text-green-700 dark:text-green-300">
                        Your conversion rate is {loading ? '...' : `${stats.conversionRate.toFixed(1)}%`} above average
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                    <Eye className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-blue-800 dark:text-blue-200">
                        Top Traffic Source
                      </div>
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        {loading ? '...' : stats.topReferralSource} is your best performing channel
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg">
                    <Activity className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-orange-800 dark:text-orange-200">
                        Engagement Quality
                      </div>
                      <div className="text-sm text-orange-700 dark:text-orange-300">
                        Average session duration: {loading ? '...' : formatDuration(stats.avgSessionDuration)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="traffic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Traffic Sources</CardTitle>
                <CardDescription>
                  Performance breakdown by traffic source
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-2">
                          <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
                          <div className="w-16 h-3 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                        <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    ))
                  ) : trafficSources.length === 0 ? (
                    <div className="text-center py-8">
                      <Globe className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">No traffic data available</p>
                    </div>
                  ) : (
                    trafficSources.map((source, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{source.source}</span>
                            <Badge variant="outline">
                              {source.conversionRate.toFixed(1)}% CVR
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>{(source?.clicks ?? 0).toLocaleString()} clicks</span>
                            <span>{source?.conversions ?? 0} conversions</span>
                            <span className="text-green-600 font-medium">
                              ${(source?.revenue ?? 0).toLocaleString()} revenue
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="geographic" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Geographic Performance</CardTitle>
                  <CardDescription>
                    Performance by country and region
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="space-y-2">
                            <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
                            <div className="w-16 h-3 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                          <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      ))
                    ) : geographicData.length === 0 ? (
                      <div className="text-center py-8">
                        <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">No geographic data available</p>
                      </div>
                    ) : (
                      geographicData.slice(0, 10).map((geo, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{geo.country}</div>
                              <div className="text-sm text-muted-foreground">
                                {geo.clicks.toLocaleString()} clicks • {geo.conversions} conversions
                              </div>
                            </div>
                          </div>
                          <span className="font-medium text-green-600">
                            ${(geo?.revenue ?? 0).toLocaleString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>World Map</CardTitle>
                  <CardDescription>
                    Visual representation of global performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/10 dark:to-blue-900/10 rounded-lg flex items-center justify-center border">
                    <div className="text-center">
                      <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Interactive world map
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Showing performance by country
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="devices" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Device Breakdown</CardTitle>
                  <CardDescription>
                    Traffic distribution by device type
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                            <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                          <div className="w-12 h-4 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      ))
                    ) : deviceData.length === 0 ? (
                      <div className="text-center py-8">
                        <Monitor className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">No device data available</p>
                      </div>
                    ) : (
                      deviceData.map((device, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getDeviceIcon(device.device)}
                            <span className="font-medium">{device.device}</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-muted-foreground">
                              {device.clicks.toLocaleString()} clicks
                            </span>
                            <Badge variant="outline">
                              {device.percentage.toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Device Distribution</CardTitle>
                  <CardDescription>
                    Visual breakdown of device usage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 rounded-lg flex items-center justify-center border">
                    <div className="text-center">
                      <Monitor className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Device distribution chart
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Pie chart showing device breakdown
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="links" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Links</CardTitle>
                <CardDescription>
                  Your best performing referral links
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-2">
                          <div className="w-48 h-4 bg-gray-200 rounded animate-pulse"></div>
                          <div className="w-32 h-3 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                        <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    ))
                  ) : topLinks.length === 0 ? (
                    <div className="text-center py-8">
                      <Target className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">No link performance data available</p>
                    </div>
                  ) : (
                    topLinks.map((link) => (
                      <div key={link.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm truncate max-w-md">
                              {link.url}
                            </span>
                            <Badge variant="outline">
                              {link.conversionRate.toFixed(1)}% CVR
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>{link.clicks.toLocaleString()} clicks</span>
                            <span>{link.conversions} conversions</span>
                            <span className="text-green-600 font-medium">
                              ${link.revenue.toLocaleString()} revenue
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AffiliateLayout>
  );
}