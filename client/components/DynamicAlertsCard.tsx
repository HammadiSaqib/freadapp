import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, XCircle, Clock, User, CreditCard, Settings } from 'lucide-react';

interface Alert {
  type: 'system' | 'user' | 'payment';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  status: string;
  user_id?: number;
}

interface AlertSummary {
  total_alerts: number;
  critical_alerts: number;
  unresolved_alerts: number;
  alerts_24h: number;
}

interface AlertsData {
  alerts: Alert[];
  summary: AlertSummary;
}

interface DynamicAlertsCardProps {
  data: AlertsData | null;
  loading?: boolean;
  onRefresh?: () => void;
}

const DynamicAlertsCard: React.FC<DynamicAlertsCardProps> = ({ 
  data, 
  loading = false, 
  onRefresh 
}) => {
  const [filter, setFilter] = useState<'all' | 'critical' | 'unresolved'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (autoRefresh && onRefresh) {
      const interval = setInterval(onRefresh, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, onRefresh]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'system': return <Settings className="w-4 h-4" />;
      case 'user': return <User className="w-4 h-4" />;
      case 'payment': return <CreditCard className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const alertTime = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - alertTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  // Provide fallback data if data is null or undefined
  const safeData = data || { alerts: [], summary: { total_alerts: 0, critical_alerts: 0, unresolved_alerts: 0, alerts_24h: 0 } };

  // Ensure alerts is always an array
  const safeAlerts = Array.isArray(safeData.alerts) ? safeData.alerts : [];

  // Ensure summary is always an object with default values
  const safeSummary = safeData.summary || { total_alerts: 0, critical_alerts: 0, unresolved_alerts: 0, alerts_24h: 0 };

  const filteredAlerts = safeAlerts.filter(alert => {
    if (filter === 'critical') return alert.severity === 'critical' || alert.severity === 'high';
    if (filter === 'unresolved') return alert.status !== 'resolved';
    return true;
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 animate-pulse rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Recent Alerts
            </CardTitle>
            <CardDescription>
              {safeSummary.total_alerts} total alerts, {safeSummary.alerts_24h} in last 24h
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
            >
              {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </Button>
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                Refresh
              </Button>
            )}
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{safeSummary.critical_alerts}</div>
            <div className="text-sm text-red-700">Critical</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{safeSummary.unresolved_alerts}</div>
            <div className="text-sm text-yellow-700">Unresolved</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{safeSummary.alerts_24h}</div>
            <div className="text-sm text-blue-700">Last 24h</div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mt-4">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({safeAlerts.length})
          </Button>
          <Button
            variant={filter === 'critical' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('critical')}
          >
            Critical ({safeAlerts.filter(a => a.severity === 'critical' || a.severity === 'high').length})
          </Button>
          <Button
            variant={filter === 'unresolved' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unresolved')}
          >
            Unresolved ({safeAlerts.filter(a => a.status !== 'resolved').length})
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>No alerts match the current filter</p>
            </div>
          ) : (
            filteredAlerts.map((alert, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0 mt-1">
                  {getTypeIcon(alert.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm truncate">{alert.title}</h4>
                    <Badge className={`text-xs ${getSeverityColor(alert.severity)}`}>
                      {alert.severity}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {alert.message}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatTimeAgo(alert.created_at)}</span>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(alert.status)}
                      <span className="capitalize">{alert.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DynamicAlertsCard;