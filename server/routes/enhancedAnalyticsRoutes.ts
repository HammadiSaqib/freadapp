import { Request, Response } from 'express';
import { runQuery, getQuery, allQuery, logActivity } from '../database/databaseAdapter.js';
import { AuthRequest } from '../middleware/securityMiddleware.js';
import { sanitizeInput } from '../config/security.js';
import { z } from 'zod';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

// Enhanced validation schemas
const analyticsQuerySchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).default('monthly'),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  client_id: z.string().regex(/^\d+$/).transform(Number).optional(),
  bureau: z.enum(['experian', 'equifax', 'transunion']).optional(),
  status: z.enum(['active', 'inactive', 'completed', 'on_hold']).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).refine(n => n <= 1000, 'Limit cannot exceed 1000').default('100')
});

const dashboardQuerySchema = z.object({
  include_trends: z.string().transform(val => val === 'true').default('true'),
  include_comparisons: z.string().transform(val => val === 'true').default('true'),
  time_range: z.enum(['7d', '30d', '90d', '1y']).default('30d')
});

// Enhanced dashboard analytics with comprehensive metrics
export async function getDashboardAnalytics(req: AuthRequest, res: Response) {
  try {
    const queryParams = dashboardQuerySchema.parse(req.query);
    const { include_trends, include_comparisons, time_range } = queryParams;
    const userId = req.user!.id;
    
    // Calculate date ranges based on time_range
    const now = new Date();
    let daysBack: number;
    
    switch (time_range) {
      case '7d': daysBack = 7; break;
      case '30d': daysBack = 30; break;
      case '90d': daysBack = 90; break;
      case '1y': daysBack = 365; break;
      default: daysBack = 30;
    }
    
    const currentPeriodStart = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(currentPeriodStart.getTime() - daysBack * 24 * 60 * 60 * 1000);
    
    // Enhanced client statistics (clients belonging to the logged-in user)
    const clientStats = await getQuery(`
      SELECT 
        COUNT(*) as total_clients,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_clients,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_clients,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_clients,
        COUNT(CASE WHEN created_at >= ? THEN 1 END) as new_clients_current,
        COUNT(CASE WHEN created_at >= ? AND created_at < ? THEN 1 END) as new_clients_previous,
        AVG(CASE WHEN credit_score IS NOT NULL THEN credit_score END) as avg_credit_score,
        AVG(CASE WHEN target_score IS NOT NULL THEN target_score END) as avg_target_score,
        COUNT(CASE WHEN credit_score > previous_credit_score THEN 1 END) as clients_improved,
        SUM(CASE WHEN credit_score > previous_credit_score THEN credit_score - previous_credit_score ELSE 0 END) as total_score_improvement
      FROM clients 
      WHERE user_id = ?
    `, [currentPeriodStart.toISOString(), previousPeriodStart.toISOString(), currentPeriodStart.toISOString(), userId]);
    
    // Enhanced dispute statistics (disputes for clients belonging to the logged-in user)
    const disputeStats = await getQuery(`
      SELECT 
        COUNT(*) as total_disputes,
        COUNT(CASE WHEN d.status = 'draft' THEN 1 END) as draft_disputes,
        COUNT(CASE WHEN d.status = 'submitted' THEN 1 END) as submitted_disputes,
        COUNT(CASE WHEN d.status = 'in_progress' THEN 1 END) as in_progress_disputes,
        COUNT(CASE WHEN d.status = 'resolved' THEN 1 END) as resolved_disputes,
        COUNT(CASE WHEN d.status = 'rejected' THEN 1 END) as rejected_disputes,
        COUNT(CASE WHEN d.created_at >= ? THEN 1 END) as new_disputes_current,
        COUNT(CASE WHEN d.created_at >= ? AND d.created_at < ? THEN 1 END) as new_disputes_previous,
        COUNT(CASE WHEN d.priority = 'high' THEN 1 END) as high_priority_disputes,
        AVG(CASE WHEN d.filed_date IS NOT NULL AND d.response_date IS NOT NULL 
                 THEN julianday(d.response_date) - julianday(d.filed_date) END) as avg_resolution_days
      FROM disputes d
      JOIN clients c ON d.client_id = c.id
      WHERE c.user_id = ?
    `, [currentPeriodStart.toISOString(), previousPeriodStart.toISOString(), currentPeriodStart.toISOString(), userId]);
    
    // Calculate success rates and improvements
    const totalCompleted = (disputeStats?.resolved_disputes || 0) + (disputeStats?.rejected_disputes || 0);
    const successRate = totalCompleted > 0 ? Math.round(((disputeStats?.resolved_disputes || 0) / totalCompleted) * 100) : 0;
    
    const avgScoreImprovement = clientStats?.clients_improved > 0 
      ? Math.round((clientStats?.total_score_improvement || 0) / clientStats.clients_improved)
      : 0;
    
    // Calculate percentage changes for trends
    let trends = {};
    if (include_trends) {
      const clientChange = clientStats?.new_clients_previous > 0
        ? Math.round(((clientStats.new_clients_current - clientStats.new_clients_previous) / clientStats.new_clients_previous) * 100)
        : 0;
      
      const disputeChange = disputeStats?.new_disputes_previous > 0
        ? Math.round(((disputeStats.new_disputes_current - disputeStats.new_disputes_previous) / disputeStats.new_disputes_previous) * 100)
        : 0;
      
      trends = {
        client_growth: {
          current: clientStats?.new_clients_current || 0,
          previous: clientStats?.new_clients_previous || 0,
          change_percent: clientChange,
          trend: clientChange >= 0 ? 'up' : 'down'
        },
        dispute_growth: {
          current: disputeStats?.new_disputes_current || 0,
          previous: disputeStats?.new_disputes_previous || 0,
          change_percent: disputeChange,
          trend: disputeChange >= 0 ? 'up' : 'down'
        }
      };
    }
    
    // Get bureau performance breakdown (for the logged-in user's clients)
    const bureauPerformance = await allQuery(`
      SELECT 
        d.bureau,
        COUNT(*) as total_disputes,
        COUNT(CASE WHEN d.status = 'resolved' THEN 1 END) as resolved_disputes,
        COUNT(CASE WHEN d.status = 'rejected' THEN 1 END) as rejected_disputes,
        ROUND(COUNT(CASE WHEN d.status = 'resolved' THEN 1 END) * 100.0 / 
              NULLIF(COUNT(CASE WHEN d.status IN ('resolved', 'rejected') THEN 1 END), 0), 1) as success_rate,
        AVG(CASE WHEN d.filed_date IS NOT NULL AND d.response_date IS NOT NULL 
                 THEN julianday(d.response_date) - julianday(d.filed_date) END) as avg_resolution_days
      FROM disputes d
      JOIN clients c ON d.client_id = c.id
      WHERE c.user_id = ?
      GROUP BY d.bureau
      ORDER BY success_rate DESC
    `, [userId]);
    
    // Get recent activities summary
    const recentActivities = await allQuery(`
      SELECT 
        activity_type,
        COUNT(*) as count,
        MAX(created_at) as last_occurrence
      FROM activities
      WHERE user_id = ? AND created_at >= ?
      GROUP BY activity_type
      ORDER BY count DESC
      LIMIT 10
    `, [userId, currentPeriodStart.toISOString()]);
    
    // Build comprehensive response
    const analytics = {
      overview: {
        total_clients: clientStats?.total_clients || 0,
        active_clients: clientStats?.active_clients || 0,
        completed_clients: clientStats?.completed_clients || 0,
        total_disputes: disputeStats?.total_disputes || 0,
        active_disputes: (disputeStats?.submitted_disputes || 0) + (disputeStats?.in_progress_disputes || 0),
        resolved_disputes: disputeStats?.resolved_disputes || 0,
        success_rate: successRate,
        avg_score_improvement: avgScoreImprovement,
        avg_resolution_days: Math.round(disputeStats?.avg_resolution_days || 0)
      },
      client_metrics: {
        total: clientStats?.total_clients || 0,
        active: clientStats?.active_clients || 0,
        completed: clientStats?.completed_clients || 0,
        on_hold: clientStats?.on_hold_clients || 0,
        new_this_period: clientStats?.new_clients_current || 0,
        avg_credit_score: Math.round(clientStats?.avg_credit_score || 0),
        avg_target_score: Math.round(clientStats?.avg_target_score || 0),
        clients_improved: clientStats?.clients_improved || 0
      },
      dispute_metrics: {
        total: disputeStats?.total_disputes || 0,
        draft: disputeStats?.draft_disputes || 0,
        submitted: disputeStats?.submitted_disputes || 0,
        in_progress: disputeStats?.in_progress_disputes || 0,
        resolved: disputeStats?.resolved_disputes || 0,
        rejected: disputeStats?.rejected_disputes || 0,
        new_this_period: disputeStats?.new_disputes_current || 0,
        high_priority: disputeStats?.high_priority_disputes || 0,
        success_rate: successRate,
        avg_resolution_days: Math.round(disputeStats?.avg_resolution_days || 0)
      },
      bureau_performance: bureauPerformance.map(bureau => ({
        ...bureau,
        avg_resolution_days: bureau.avg_resolution_days ? Math.round(bureau.avg_resolution_days) : null
      })),
      recent_activity_summary: recentActivities,
      time_range,
      generated_at: new Date().toISOString()
    };
    
    // Add trends if requested
    if (include_trends) {
      analytics.trends = trends;
    }
    
    // Log activity
    await logActivity(
      'dashboard_analytics_viewed',
      `Viewed dashboard analytics (${time_range})`,
      userId,
      undefined,
      undefined,
      { time_range, include_trends, include_comparisons },
      req.ip,
      req.get('User-Agent')
    );
    
    res.json({
      success: true,
      data: analytics
    });
    
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch dashboard analytics'
    });
  }
}

// Enhanced revenue analytics with detailed financial metrics
export async function getRevenueAnalytics(req: AuthRequest, res: Response) {
  try {
    const queryParams = analyticsQuerySchema.parse(req.query);
    const { period, date_from, date_to, limit } = queryParams;
    const userId = req.user!.id;
    
    // Determine date format and range based on period
    let dateFormat: string;
    let dateRange: string;
    let defaultRange: string;
    
    switch (period) {
      case 'daily':
        dateFormat = '%Y-%m-%d';
        dateRange = "DATE('now', '-30 days')";
        defaultRange = '30 days';
        break;
      case 'weekly':
        dateFormat = '%Y-W%W';
        dateRange = "DATE('now', '-12 weeks')";
        defaultRange = '12 weeks';
        break;
      case 'monthly':
        dateFormat = '%Y-%m';
        dateRange = "DATE('now', '-12 months')";
        defaultRange = '12 months';
        break;
      case 'quarterly':
        dateFormat = '%Y-Q' || "CASE WHEN CAST(strftime('%m', created_at) AS INTEGER) <= 3 THEN '1' WHEN CAST(strftime('%m', created_at) AS INTEGER) <= 6 THEN '2' WHEN CAST(strftime('%m', created_at) AS INTEGER) <= 9 THEN '3' ELSE '4' END";
        dateRange = "DATE('now', '-2 years')";
        defaultRange = '2 years';
        break;
      case 'yearly':
        dateFormat = '%Y';
        dateRange = "DATE('now', '-5 years')";
        defaultRange = '5 years';
        break;
      default:
        dateFormat = '%Y-%m';
        dateRange = "DATE('now', '-12 months')";
        defaultRange = '12 months';
    }
    
    // Build date filter
    let dateFilter = '';
    let dateParams: string[] = [];
    
    if (date_from && date_to) {
      dateFilter = 'AND DATE(c.created_at) >= ? AND DATE(c.created_at) <= ?';
      dateParams = [date_from, date_to];
    } else if (date_from) {
      dateFilter = 'AND DATE(c.created_at) >= ?';
      dateParams = [date_from];
    } else if (date_to) {
      dateFilter = 'AND DATE(c.created_at) <= ?';
      dateParams = [date_to];
    } else {
      dateFilter = `AND DATE(c.created_at) >= ${dateRange}`;
    }
    
    // Enhanced revenue query with multiple revenue streams
    const revenueQuery = `
      SELECT 
        strftime('${dateFormat}', c.created_at) as period,
        COUNT(*) as new_clients,
        COUNT(*) * 99 as setup_revenue,  -- One-time setup fee
        COUNT(CASE WHEN c.status = 'active' THEN 1 END) * 49 as monthly_revenue,  -- Monthly subscription
        COUNT(CASE WHEN c.status = 'completed' THEN 1 END) * 199 as completion_bonus,  -- Success bonus
        (COUNT(*) * 99) + (COUNT(CASE WHEN c.status = 'active' THEN 1 END) * 49) + 
        (COUNT(CASE WHEN c.status = 'completed' THEN 1 END) * 199) as total_revenue,
        AVG(c.credit_score) as avg_credit_score,
        COUNT(CASE WHEN c.credit_score > COALESCE(c.previous_credit_score, 0) THEN 1 END) as improved_clients
      FROM clients c
      WHERE c.user_id = ? ${dateFilter}
      GROUP BY strftime('${dateFormat}', c.created_at)
      ORDER BY period DESC
      LIMIT ?
    `;
    
    const revenueData = await allQuery(revenueQuery, [userId, ...dateParams, limit]);
    
    // Calculate totals and growth metrics
    const totalRevenue = revenueData.reduce((sum: number, item: any) => sum + (item.total_revenue || 0), 0);
    const totalClients = revenueData.reduce((sum: number, item: any) => sum + (item.new_clients || 0), 0);
    
    // Calculate growth rate (comparing last two periods)
    let growthRate = 0;
    if (revenueData.length >= 2) {
      const current = revenueData[0]?.total_revenue || 0;
      const previous = revenueData[1]?.total_revenue || 0;
      growthRate = previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;
    }
    
    // Calculate average revenue per client
    const avgRevenuePerClient = totalClients > 0 ? Math.round(totalRevenue / totalClients) : 0;
    
    // Get revenue breakdown by service type
    const serviceBreakdown = [
      {
        service: 'Setup Fees',
        revenue: revenueData.reduce((sum: number, item: any) => sum + (item.setup_revenue || 0), 0),
        percentage: 0
      },
      {
        service: 'Monthly Subscriptions',
        revenue: revenueData.reduce((sum: number, item: any) => sum + (item.monthly_revenue || 0), 0),
        percentage: 0
      },
      {
        service: 'Completion Bonuses',
        revenue: revenueData.reduce((sum: number, item: any) => sum + (item.completion_bonus || 0), 0),
        percentage: 0
      }
    ];
    
    // Calculate percentages
    serviceBreakdown.forEach(service => {
      service.percentage = totalRevenue > 0 ? Math.round((service.revenue / totalRevenue) * 100) : 0;
    });
    
    // Get monthly recurring revenue (MRR)
    const mrrQuery = `
      SELECT 
        COUNT(CASE WHEN status = 'active' THEN 1 END) * 49 as current_mrr,
        COUNT(CASE WHEN status = 'active' AND created_at >= DATE('now', '-30 days') THEN 1 END) * 49 as new_mrr
      FROM clients 
      WHERE user_id = ?
    `;
    
    const mrrData = await getQuery(mrrQuery, [userId]);
    
    // Calculate projected annual recurring revenue
    const arr = (mrrData?.current_mrr || 0) * 12;
    
    // Log activity
    await logActivity(
      'revenue_analytics_viewed',
      `Viewed revenue analytics (${period})`,
      userId,
      undefined,
      undefined,
      { period, date_from, date_to, total_revenue: totalRevenue },
      req.ip,
      req.get('User-Agent')
    );
    
    res.json({
      success: true,
      data: {
        summary: {
          total_revenue: totalRevenue,
          growth_rate: growthRate,
          avg_revenue_per_client: avgRevenuePerClient,
          total_clients: totalClients,
          current_mrr: mrrData?.current_mrr || 0,
          new_mrr: mrrData?.new_mrr || 0,
          projected_arr: arr
        },
        period_data: revenueData.reverse(), // Return in chronological order
        service_breakdown: serviceBreakdown,
        financial_metrics: {
          monthly_recurring_revenue: mrrData?.current_mrr || 0,
          annual_recurring_revenue: arr,
          customer_lifetime_value: avgRevenuePerClient * 8, // Estimated 8-month average
          churn_rate: 5, // Mock 5% monthly churn rate
          acquisition_cost: 25 // Mock customer acquisition cost
        },
        period,
        date_range: {
          from: date_from || `${defaultRange} ago`,
          to: date_to || 'now'
        },
        generated_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch revenue analytics'
    });
  }
}

// Enhanced performance metrics with detailed KPIs
export async function getPerformanceMetrics(req: AuthRequest, res: Response) {
  try {
    const queryParams = analyticsQuerySchema.parse(req.query);
    const { period, date_from, date_to, bureau, limit } = queryParams;
    const userId = req.user!.id;
    
    // Build date filter
    let dateFilter = '';
    let dateParams: string[] = [];
    
    if (date_from && date_to) {
      dateFilter = 'AND DATE(created_at) >= ? AND DATE(created_at) <= ?';
      dateParams = [date_from, date_to];
    } else {
      dateFilter = "AND DATE(created_at) >= DATE('now', '-12 months')";
    }
    
    // Client acquisition and retention metrics
    const acquisitionQuery = `
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as new_clients,
        AVG(credit_score) as avg_initial_score,
        AVG(target_score) as avg_target_score,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_clients,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_clients,
        AVG(CASE WHEN credit_score IS NOT NULL AND previous_credit_score IS NOT NULL 
                 THEN credit_score - previous_credit_score END) as avg_score_improvement
      FROM clients 
      WHERE user_id = ? ${dateFilter}
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month DESC
      LIMIT ?
    `;
    
    const acquisitionData = await allQuery(acquisitionQuery, [userId, ...dateParams, limit]);
    
    // Bureau performance with enhanced metrics
    let bureauFilter = '';
    let bureauParams: string[] = [];
    
    if (bureau) {
      bureauFilter = 'AND d.bureau = ?';
      bureauParams = [bureau];
    }
    
    const bureauQuery = `
      SELECT
        d.bureau,
        COUNT(*) as total_disputes,
        COUNT(CASE WHEN d.status = 'resolved' THEN 1 END) as successful_disputes,
        COUNT(CASE WHEN d.status = 'rejected' THEN 1 END) as rejected_disputes,
        COUNT(CASE WHEN d.status IN ('submitted', 'in_progress') THEN 1 END) as pending_disputes,
        ROUND(COUNT(CASE WHEN d.status = 'resolved' THEN 1 END) * 100.0 / 
              NULLIF(COUNT(CASE WHEN d.status IN ('resolved', 'rejected') THEN 1 END), 0), 1) as success_rate,
        AVG(CASE WHEN d.filed_date IS NOT NULL AND d.response_date IS NOT NULL 
                 THEN julianday(d.response_date) - julianday(d.filed_date) END) as avg_resolution_days,
        COUNT(CASE WHEN d.priority = 'high' THEN 1 END) as high_priority_disputes,
        COUNT(CASE WHEN d.dispute_type = 'fraudulent' THEN 1 END) as fraud_disputes
      FROM disputes d
      JOIN clients c ON d.client_id = c.id
      WHERE c.user_id = ? ${bureauFilter}
      GROUP BY d.bureau
      ORDER BY success_rate DESC
    `;
    
    const bureauStats = await allQuery(bureauQuery, [userId, ...bureauParams]);
    
    // Dispute type performance
    const disputeTypeQuery = `
      SELECT 
        d.dispute_type,
        COUNT(*) as total_count,
        COUNT(CASE WHEN d.status = 'resolved' THEN 1 END) as resolved_count,
        ROUND(COUNT(CASE WHEN d.status = 'resolved' THEN 1 END) * 100.0 / COUNT(*), 1) as success_rate,
        AVG(CASE WHEN d.filed_date IS NOT NULL AND d.response_date IS NOT NULL 
                 THEN julianday(d.response_date) - julianday(d.filed_date) END) as avg_resolution_days
      FROM disputes d
      JOIN clients c ON d.client_id = c.id
      WHERE c.user_id = ?
      GROUP BY d.dispute_type
      ORDER BY success_rate DESC
    `;
    
    const disputeTypeStats = await allQuery(disputeTypeQuery, [userId]);
    
    // Credit score improvement trends
    const scoreImprovementQuery = `
      SELECT 
        strftime('%Y-%m', updated_at) as month,
        AVG(CASE WHEN credit_score IS NOT NULL AND previous_credit_score IS NOT NULL 
                 THEN credit_score - previous_credit_score END) as avg_improvement,
        COUNT(CASE WHEN credit_score > COALESCE(previous_credit_score, 0) THEN 1 END) as improved_clients,
        COUNT(CASE WHEN credit_score < COALESCE(previous_credit_score, 999) THEN 1 END) as declined_clients,
        MAX(credit_score - COALESCE(previous_credit_score, 0)) as max_improvement,
        MIN(credit_score - COALESCE(previous_credit_score, 0)) as min_change
      FROM clients 
      WHERE user_id = ? 
        AND credit_score IS NOT NULL 
        AND previous_credit_score IS NOT NULL
        AND DATE(updated_at) >= DATE('now', '-12 months')
      GROUP BY strftime('%Y-%m', updated_at)
      ORDER BY month DESC
      LIMIT ?
    `;
    
    const scoreImprovementData = await allQuery(scoreImprovementQuery, [userId, limit]);
    
    // Overall performance KPIs
    const kpiQuery = `
      SELECT 
        -- Client KPIs
        COUNT(DISTINCT c.id) as total_clients,
        COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_clients,
        COUNT(DISTINCT CASE WHEN c.status = 'completed' THEN c.id END) as completed_clients,
        
        -- Dispute KPIs
        COUNT(d.id) as total_disputes,
        COUNT(CASE WHEN d.status = 'resolved' THEN 1 END) as resolved_disputes,
        COUNT(CASE WHEN d.status = 'rejected' THEN 1 END) as rejected_disputes,
        
        -- Performance KPIs
        AVG(CASE WHEN c.credit_score IS NOT NULL AND c.previous_credit_score IS NOT NULL 
                 THEN c.credit_score - c.previous_credit_score END) as avg_score_improvement,
        AVG(CASE WHEN d.filed_date IS NOT NULL AND d.response_date IS NOT NULL 
                 THEN julianday(d.response_date) - julianday(d.filed_date) END) as avg_resolution_days,
        
        -- Efficiency KPIs
        COUNT(d.id) * 1.0 / NULLIF(COUNT(DISTINCT c.id), 0) as disputes_per_client,
        COUNT(CASE WHEN d.status = 'resolved' THEN 1 END) * 1.0 / NULLIF(COUNT(d.id), 0) as overall_success_rate
      FROM clients c
      LEFT JOIN disputes d ON c.id = d.client_id
      WHERE c.user_id = ?
    `;
    
    const kpiData = await getQuery(kpiQuery, [userId]);
    
    // Calculate additional metrics
    const clientRetentionRate = kpiData?.total_clients > 0 
      ? Math.round(((kpiData.active_clients + kpiData.completed_clients) / kpiData.total_clients) * 100)
      : 0;
    
    const disputeEfficiencyScore = kpiData?.avg_resolution_days > 0 
      ? Math.max(0, Math.round(100 - (kpiData.avg_resolution_days - 30) * 2)) // Penalty for > 30 days
      : 0;
    
    // Log activity
    await logActivity(
      'performance_metrics_viewed',
      `Viewed performance metrics (${period})`,
      userId,
      undefined,
      undefined,
      { period, bureau, date_from, date_to },
      req.ip,
      req.get('User-Agent')
    );
    
    res.json({
      success: true,
      data: {
        key_performance_indicators: {
          total_clients: kpiData?.total_clients || 0,
          active_clients: kpiData?.active_clients || 0,
          completed_clients: kpiData?.completed_clients || 0,
          client_retention_rate: clientRetentionRate,
          total_disputes: kpiData?.total_disputes || 0,
          resolved_disputes: kpiData?.resolved_disputes || 0,
          overall_success_rate: Math.round((kpiData?.overall_success_rate || 0) * 100),
          avg_score_improvement: Math.round(kpiData?.avg_score_improvement || 0),
          avg_resolution_days: Math.round(kpiData?.avg_resolution_days || 0),
          disputes_per_client: Math.round((kpiData?.disputes_per_client || 0) * 10) / 10,
          dispute_efficiency_score: disputeEfficiencyScore
        },
        client_acquisition: acquisitionData.reverse().map(item => ({
          ...item,
          avg_initial_score: Math.round(item.avg_initial_score || 0),
          avg_target_score: Math.round(item.avg_target_score || 0),
          avg_score_improvement: Math.round(item.avg_score_improvement || 0)
        })),
        bureau_performance: bureauStats.map(bureau => ({
          ...bureau,
          avg_resolution_days: bureau.avg_resolution_days ? Math.round(bureau.avg_resolution_days) : null
        })),
        dispute_type_performance: disputeTypeStats.map(type => ({
          ...type,
          avg_resolution_days: type.avg_resolution_days ? Math.round(type.avg_resolution_days) : null
        })),
        score_improvement_trends: scoreImprovementData.reverse().map(item => ({
          ...item,
          avg_improvement: Math.round(item.avg_improvement || 0),
          max_improvement: item.max_improvement || 0,
          min_change: item.min_change || 0
        })),
        period,
        filters: {
          bureau,
          date_from,
          date_to
        },
        generated_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch performance metrics'
    });
  }
}

// Enhanced client analytics with demographic insights
export async function getClientAnalytics(req: AuthRequest, res: Response) {
  try {
    const queryParams = analyticsQuerySchema.parse(req.query);
    const { status, limit } = queryParams;
    const userId = req.user!.id;
    
    // Build status filter
    let statusFilter = '';
    let statusParams: string[] = [];
    
    if (status) {
      statusFilter = 'AND status = ?';
      statusParams = [status];
    }
    
    // Client status distribution
    const statusQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM clients WHERE user_id = ?), 1) as percentage,
        AVG(credit_score) as avg_credit_score,
        AVG(CASE WHEN credit_score IS NOT NULL AND previous_credit_score IS NOT NULL 
                 THEN credit_score - previous_credit_score END) as avg_improvement
      FROM clients 
      WHERE user_id = ? ${statusFilter}
      GROUP BY status
      ORDER BY count DESC
    `;
    
    const statusDistribution = await allQuery(statusQuery, [userId, userId, ...statusParams]);
    
    // Credit score distribution with detailed ranges
    const scoreQuery = `
      SELECT 
        CASE 
          WHEN credit_score IS NULL THEN 'No Score'
          WHEN credit_score < 300 THEN 'Invalid (< 300)'
          WHEN credit_score < 580 THEN 'Poor (300-579)'
          WHEN credit_score < 670 THEN 'Fair (580-669)'
          WHEN credit_score < 740 THEN 'Good (670-739)'
          WHEN credit_score < 800 THEN 'Very Good (740-799)'
          ELSE 'Excellent (800+)'
        END as score_range,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM clients WHERE user_id = ?), 1) as percentage,
        MIN(credit_score) as min_score,
        MAX(credit_score) as max_score,
        AVG(credit_score) as avg_score
      FROM clients 
      WHERE user_id = ? ${statusFilter}
      GROUP BY score_range
      ORDER BY MIN(COALESCE(credit_score, 0))
    `;
    
    const scoreDistribution = await allQuery(scoreQuery, [userId, userId, ...statusParams]);
    
    // Employment and income analysis
    const employmentQuery = `
      SELECT 
        employment_status,
        COUNT(*) as count,
        AVG(annual_income) as avg_income,
        MIN(annual_income) as min_income,
        MAX(annual_income) as max_income,
        AVG(credit_score) as avg_credit_score,
        COUNT(CASE WHEN credit_score > COALESCE(previous_credit_score, 0) THEN 1 END) as improved_count
      FROM clients 
      WHERE user_id = ? AND employment_status IS NOT NULL ${statusFilter}
      GROUP BY employment_status
      ORDER BY count DESC
    `;
    
    const employmentData = await allQuery(employmentQuery, [userId, ...statusParams]);
    
    // Geographic distribution (enhanced with state analysis)
    const geoQuery = `
      SELECT 
        state,
        COUNT(*) as count,
        AVG(credit_score) as avg_credit_score,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_clients,
        ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*), 1) as completion_rate
      FROM clients 
      WHERE user_id = ? AND state IS NOT NULL ${statusFilter}
      GROUP BY state
      ORDER BY count DESC
      LIMIT ?
    `;
    
    const geoData = await allQuery(geoQuery, [userId, ...statusParams, limit]);
    
    // Age demographics (calculated from date of birth)
    const ageQuery = `
      SELECT 
        CASE 
          WHEN date_of_birth IS NULL THEN 'Unknown'
          WHEN (julianday('now') - julianday(date_of_birth)) / 365.25 < 25 THEN '18-24'
          WHEN (julianday('now') - julianday(date_of_birth)) / 365.25 < 35 THEN '25-34'
          WHEN (julianday('now') - julianday(date_of_birth)) / 365.25 < 45 THEN '35-44'
          WHEN (julianday('now') - julianday(date_of_birth)) / 365.25 < 55 THEN '45-54'
          WHEN (julianday('now') - julianday(date_of_birth)) / 365.25 < 65 THEN '55-64'
          ELSE '65+'
        END as age_group,
        COUNT(*) as count,
        AVG(credit_score) as avg_credit_score,
        AVG(annual_income) as avg_income,
        COUNT(CASE WHEN credit_score > COALESCE(previous_credit_score, 0) THEN 1 END) as improved_count
      FROM clients 
      WHERE user_id = ? ${statusFilter}
      GROUP BY age_group
      ORDER BY 
        CASE age_group
          WHEN '18-24' THEN 1
          WHEN '25-34' THEN 2
          WHEN '35-44' THEN 3
          WHEN '45-54' THEN 4
          WHEN '55-64' THEN 5
          WHEN '65+' THEN 6
          ELSE 7
        END
    `;
    
    const ageData = await allQuery(ageQuery, [userId, ...statusParams]);
    
    // Client lifecycle analysis
    const lifecycleQuery = `
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as new_clients,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_this_month,
        AVG(CASE WHEN status = 'completed' AND updated_at IS NOT NULL 
                 THEN julianday(updated_at) - julianday(created_at) END) as avg_completion_days,
        AVG(credit_score) as avg_initial_score,
        AVG(CASE WHEN credit_score IS NOT NULL AND previous_credit_score IS NOT NULL 
                 THEN credit_score - previous_credit_score END) as avg_improvement
      FROM clients 
      WHERE user_id = ? AND DATE(created_at) >= DATE('now', '-12 months') ${statusFilter}
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month DESC
      LIMIT ?
    `;
    
    const lifecycleData = await allQuery(lifecycleQuery, [userId, ...statusParams, limit]);
    
    // Log activity
    await logActivity(
      'client_analytics_viewed',
      'Viewed client analytics dashboard',
      userId,
      undefined,
      undefined,
      { status, filters_applied: !!status },
      req.ip,
      req.get('User-Agent')
    );
    
    res.json({
      success: true,
      data: {
        status_distribution: statusDistribution.map(item => ({
          ...item,
          avg_credit_score: Math.round(item.avg_credit_score || 0),
          avg_improvement: Math.round(item.avg_improvement || 0)
        })),
        credit_score_distribution: scoreDistribution.map(item => ({
          ...item,
          avg_score: Math.round(item.avg_score || 0)
        })),
        employment_breakdown: employmentData.map(item => ({
          ...item,
          avg_income: Math.round(item.avg_income || 0),
          min_income: Math.round(item.min_income || 0),
          max_income: Math.round(item.max_income || 0),
          avg_credit_score: Math.round(item.avg_credit_score || 0),
          improvement_rate: item.count > 0 ? Math.round((item.improved_count / item.count) * 100) : 0
        })),
        geographic_distribution: geoData.map(item => ({
          ...item,
          avg_credit_score: Math.round(item.avg_credit_score || 0)
        })),
        age_demographics: ageData.map(item => ({
          ...item,
          avg_credit_score: Math.round(item.avg_credit_score || 0),
          avg_income: Math.round(item.avg_income || 0),
          improvement_rate: item.count > 0 ? Math.round((item.improved_count / item.count) * 100) : 0
        })),
        client_lifecycle: lifecycleData.reverse().map(item => ({
          ...item,
          avg_completion_days: Math.round(item.avg_completion_days || 0),
          avg_initial_score: Math.round(item.avg_initial_score || 0),
          avg_improvement: Math.round(item.avg_improvement || 0)
        })),
        filters: {
          status
        },
        generated_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error fetching client analytics:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch client analytics'
    });
  }
}

// Enhanced financial insights with predictive analytics
export async function getFinancialInsights(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;
    
    // Current financial metrics
    const currentMetricsQuery = `
      SELECT 
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_clients,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_clients,
        COUNT(*) as total_clients,
        COUNT(CASE WHEN created_at >= DATE('now', '-30 days') THEN 1 END) as new_clients_30d,
        COUNT(CASE WHEN created_at >= DATE('now', '-7 days') THEN 1 END) as new_clients_7d,
        AVG(CASE WHEN credit_score IS NOT NULL AND previous_credit_score IS NOT NULL 
                 THEN credit_score - previous_credit_score END) as avg_improvement
      FROM clients 
      WHERE user_id = ?
    `;
    
    const currentMetrics = await getQuery(currentMetricsQuery, [userId]);
    
    // Revenue calculations with multiple streams
    const setupFee = 99;
    const monthlyFee = 49;
    const completionBonus = 199;
    
    const currentMRR = (currentMetrics?.active_clients || 0) * monthlyFee;
    const newMRR = (currentMetrics?.new_clients_30d || 0) * monthlyFee;
    const completionRevenue = (currentMetrics?.completed_clients || 0) * completionBonus;
    const setupRevenue = (currentMetrics?.total_clients || 0) * setupFee;
    
    const totalRevenue = setupRevenue + completionRevenue + (currentMRR * 6); // Estimated 6-month average
    const projectedARR = currentMRR * 12;
    
    // Customer metrics
    const avgCustomerLifetime = 8; // months
    const customerLTV = (monthlyFee * avgCustomerLifetime) + setupFee + (completionBonus * 0.7); // 70% completion rate
    const customerAcquisitionCost = 25; // Mock CAC
    const ltvcacRatio = customerAcquisitionCost > 0 ? Math.round((customerLTV / customerAcquisitionCost) * 10) / 10 : 0;
    
    // Growth metrics
    const monthlyGrowthQuery = `
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as new_clients
      FROM clients 
      WHERE user_id = ? AND DATE(created_at) >= DATE('now', '-6 months')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month DESC
      LIMIT 6
    `;
    
    const monthlyGrowth = await allQuery(monthlyGrowthQuery, [userId]);
    
    // Calculate growth rate
    let growthRate = 0;
    if (monthlyGrowth.length >= 2) {
      const current = monthlyGrowth[0]?.new_clients || 0;
      const previous = monthlyGrowth[1]?.new_clients || 0;
      growthRate = previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;
    }
    
    // Revenue breakdown by service
    const revenueBreakdown = [
      {
        service: 'Setup Fees',
        revenue: setupRevenue,
        percentage: totalRevenue > 0 ? Math.round((setupRevenue / totalRevenue) * 100) : 0,
        description: 'One-time client onboarding fees'
      },
      {
        service: 'Monthly Subscriptions',
        revenue: currentMRR * 6, // 6-month estimate
        percentage: totalRevenue > 0 ? Math.round(((currentMRR * 6) / totalRevenue) * 100) : 0,
        description: 'Recurring monthly service fees'
      },
      {
        service: 'Completion Bonuses',
        revenue: completionRevenue,
        percentage: totalRevenue > 0 ? Math.round((completionRevenue / totalRevenue) * 100) : 0,
        description: 'Success-based completion bonuses'
      }
    ];
    
    // Financial projections (next 12 months)
    const projectedNewClients = Math.max(1, Math.round((currentMetrics?.new_clients_30d || 1) * 1.1)); // 10% growth assumption
    const projectedMRRGrowth = projectedNewClients * monthlyFee;
    const projectedCompletions = Math.round(projectedNewClients * 0.7); // 70% completion rate
    const projectedAnnualRevenue = (projectedMRRGrowth * 12) + (projectedNewClients * setupFee) + (projectedCompletions * completionBonus);
    
    // Churn analysis (mock data)
    const churnRate = 5; // 5% monthly churn
    const retentionRate = 100 - churnRate;
    const churnImpact = currentMRR * (churnRate / 100);
    
    // Financial health score (0-100)
    const healthFactors = {
      revenue_growth: Math.min(100, Math.max(0, growthRate + 50)), // Normalize growth rate
      client_retention: retentionRate,
      ltv_cac_ratio: Math.min(100, ltvcacRatio * 10), // Good ratio is 3:1+
      mrr_stability: currentMRR > 0 ? Math.min(100, (currentMRR / 1000) * 10) : 0 // Normalize MRR
    };
    
    const financialHealthScore = Math.round(
      (healthFactors.revenue_growth * 0.3) +
      (healthFactors.client_retention * 0.25) +
      (healthFactors.ltv_cac_ratio * 0.25) +
      (healthFactors.mrr_stability * 0.2)
    );
    
    // Log activity
    await logActivity(
      'financial_insights_viewed',
      'Viewed financial insights dashboard',
      userId,
      undefined,
      undefined,
      { 
        current_mrr: currentMRR, 
        total_clients: currentMetrics?.total_clients,
        financial_health_score: financialHealthScore 
      },
      req.ip,
      req.get('User-Agent')
    );
    
    res.json({
      success: true,
      data: {
        current_metrics: {
          monthly_recurring_revenue: currentMRR,
          annual_recurring_revenue: projectedARR,
          new_mrr_this_month: newMRR,
          total_revenue_ytd: totalRevenue,
          active_clients: currentMetrics?.active_clients || 0,
          completed_clients: currentMetrics?.completed_clients || 0,
          new_clients_30d: currentMetrics?.new_clients_30d || 0,
          growth_rate: growthRate
        },
        customer_metrics: {
          customer_lifetime_value: Math.round(customerLTV),
          customer_acquisition_cost: customerAcquisitionCost,
          ltv_cac_ratio: ltvcacRatio,
          average_customer_lifetime_months: avgCustomerLifetime,
          churn_rate: churnRate,
          retention_rate: retentionRate,
          churn_impact_monthly: Math.round(churnImpact)
        },
        revenue_breakdown: revenueBreakdown,
        financial_projections: {
          projected_annual_revenue: Math.round(projectedAnnualRevenue),
          projected_new_clients_monthly: projectedNewClients,
          projected_mrr_growth_monthly: Math.round(projectedMRRGrowth),
          projected_completions_monthly: projectedCompletions,
          break_even_new_clients: Math.ceil(1000 / monthlyFee) // Assuming $1000 monthly costs
        },
        financial_health: {
          overall_score: financialHealthScore,
          score_breakdown: healthFactors,
          health_status: financialHealthScore >= 80 ? 'Excellent' : 
                        financialHealthScore >= 60 ? 'Good' : 
                        financialHealthScore >= 40 ? 'Fair' : 'Needs Improvement',
          recommendations: [
            growthRate < 10 ? 'Focus on client acquisition to improve growth rate' : null,
            ltvcacRatio < 3 ? 'Optimize customer acquisition costs or increase LTV' : null,
            churnRate > 10 ? 'Implement retention strategies to reduce churn' : null,
            currentMRR < 5000 ? 'Scale monthly recurring revenue for better stability' : null
          ].filter(Boolean)
        },
        monthly_trends: monthlyGrowth.reverse(),
        generated_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error fetching financial insights:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch financial insights'
    });
  }
}

// Enhanced recent activities with filtering and pagination
export async function getRecentActivities(req: AuthRequest, res: Response) {
  try {
    const queryParams = z.object({
      limit: z.string().regex(/^\d+$/).transform(Number).refine(n => n <= 100, 'Limit cannot exceed 100').default('20'),
      offset: z.string().regex(/^\d+$/).transform(Number).default('0'),
      activity_type: z.string().max(50).optional(),
      client_id: z.string().regex(/^\d+$/).transform(Number).optional(),
      dispute_id: z.string().regex(/^\d+$/).transform(Number).optional(),
      date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
    }).parse(req.query);
    
    const { limit, offset, activity_type, client_id, dispute_id, date_from, date_to } = queryParams;
     const userId = req.user!.id;
     
     // Build filters
     let filters = [];
     let params = [userId];
     
     if (activity_type) {
       filters.push('a.activity_type = ?');
       params.push(activity_type);
     }
     
     if (client_id) {
       filters.push('a.client_id = ?');
       params.push(client_id.toString());
     }
     
     if (dispute_id) {
       filters.push('a.dispute_id = ?');
       params.push(dispute_id.toString());
     }
     
     if (date_from) {
       filters.push('DATE(a.created_at) >= ?');
       params.push(date_from);
     }
     
     if (date_to) {
       filters.push('DATE(a.created_at) <= ?');
       params.push(date_to);
     }
     
     const whereClause = filters.length > 0 ? 'AND ' + filters.join(' AND ') : '';
     
     // Get activities with enhanced details
     const activitiesQuery = `
       SELECT
         a.id,
         a.activity_type,
         a.description,
         a.metadata,
         a.created_at,
         a.client_id,
         a.dispute_id,
         a.ip_address,
         a.user_agent,
         c.first_name,
         c.last_name,
         c.email as client_email,
         d.account_name as dispute_account,
         d.bureau as dispute_bureau,
         d.status as dispute_status
       FROM activities a
       LEFT JOIN clients c ON a.client_id = c.id
       LEFT JOIN disputes d ON a.dispute_id = d.id
       WHERE a.user_id = ? ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?
     `;
     
     const activities = await allQuery(activitiesQuery, [...params, limit, offset]);
     
     // Get total count for pagination
     const countQuery = `
       SELECT COUNT(*) as total
       FROM activities a
       LEFT JOIN clients c ON a.client_id = c.id
       LEFT JOIN disputes d ON a.dispute_id = d.id
       WHERE a.user_id = ? ${whereClause}
     `;
     
     const countResult = await getQuery(countQuery, params);
     const total = countResult?.total || 0;
     
     // Process activities (parse metadata JSON)
     const processedActivities = activities.map(activity => ({
       ...activity,
       metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
       client_name: activity.first_name && activity.last_name 
         ? `${activity.first_name} ${activity.last_name}` 
         : null
     }));
     
     // Get activity type summary
     const activitySummaryQuery = `
       SELECT 
         activity_type,
         COUNT(*) as count,
         MAX(created_at) as last_occurrence
       FROM activities
       WHERE user_id = ? ${whereClause.replace('a.', '')}
       GROUP BY activity_type
       ORDER BY count DESC
       LIMIT 10
     `;
     
     const activitySummary = await allQuery(activitySummaryQuery, params);
     
     res.json({
       success: true,
       data: {
         activities: processedActivities,
         pagination: {
           limit,
           offset,
           total,
           has_next: offset + limit < total,
           has_prev: offset > 0
         },
         activity_summary: activitySummary,
         filters: {
           activity_type,
           client_id,
           dispute_id,
           date_from,
           date_to
         },
         generated_at: new Date().toISOString()
       }
     });
     
   } catch (error) {
     console.error('Error fetching recent activities:', error);
     
     if (error instanceof z.ZodError) {
       return res.status(400).json({
         success: false,
         error: 'Invalid query parameters',
         details: error.errors.map(err => ({
           field: err.path.join('.'),
           message: err.message
         }))
       });
     }
     
     res.status(500).json({
       success: false,
       error: 'Internal server error',
       message: 'Failed to fetch recent activities'
     });
  }
}

function getGa4Credentials():
  | { client_email: string; private_key: string }
  | undefined {
  const json =
    process.env.GA4_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (json) {
    try {
      const parsed = JSON.parse(json);
      const client_email = String(parsed.client_email || '');
      const private_key = String(parsed.private_key || '').replace(/\\n/g, '\n');
      if (client_email && private_key) return { client_email, private_key };
    } catch {}
  }

  const client_email =
    process.env.GA4_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
  const private_key =
    process.env.GA4_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;

  if (client_email && private_key) {
    return {
      client_email,
      private_key: private_key.replace(/\\n/g, '\n'),
    };
  }

  return undefined;
}

export async function getGa4Realtime(req: AuthRequest, res: Response) {
  try {
    const propertyId =
      process.env.GA4_PROPERTY_ID || process.env.GOOGLE_ANALYTICS_PROPERTY_ID;

    if (!propertyId) {
      return res.status(501).json({
        success: false,
        error: 'GA4_PROPERTY_ID not configured',
      });
    }

    const credentials = getGa4Credentials();
    const client = credentials
      ? new BetaAnalyticsDataClient({ credentials })
      : new BetaAnalyticsDataClient();

    const [report] = await client.runRealtimeReport({
      property: `properties/${propertyId}`,
      metrics: [{ name: 'activeUsers' }],
      dimensions: [{ name: 'unifiedScreenName' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 10,
    });

    const activeUsers = Number(
      report?.totals?.[0]?.metricValues?.[0]?.value ?? 0,
    );

    const topScreens = (report?.rows || [])
      .map((row) => {
        const screen = row.dimensionValues?.[0]?.value || '(unknown)';
        const users = Number(row.metricValues?.[0]?.value ?? 0);
        return { screen, active_users: users };
      })
      .filter((r) => r.active_users > 0);

    res.json({
      success: true,
      data: {
        active_users: Number.isFinite(activeUsers) ? activeUsers : 0,
        top_screens: topScreens,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching GA4 realtime report:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch GA4 realtime analytics',
    });
  }
}

// Export insights for external reporting
export async function exportAnalyticsData(req: AuthRequest, res: Response) {
  try {
    const queryParams = z.object({
      export_type: z.enum(['clients', 'disputes', 'activities', 'financial', 'all']).default('all'),
      format: z.enum(['json', 'csv']).default('json'),
      date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
    }).parse(req.query);
    
    const { export_type, format, date_from, date_to } = queryParams;
    const userId = req.user!.id;
    
    // Build date filter
    let dateFilter = '';
    let dateParams: string[] = [];
    
    if (date_from && date_to) {
      dateFilter = 'AND DATE(created_at) >= ? AND DATE(created_at) <= ?';
      dateParams = [date_from, date_to];
    } else if (date_from) {
      dateFilter = 'AND DATE(created_at) >= ?';
      dateParams = [date_from];
    } else if (date_to) {
      dateFilter = 'AND DATE(created_at) <= ?';
      dateParams = [date_to];
    }
    
    let exportData: any = {};
    
    // Export clients data
    if (export_type === 'clients' || export_type === 'all') {
      const clientsQuery = `
        SELECT 
          id, first_name, last_name, email, phone, 
          address, city, state, zip_code, ssn, date_of_birth,
          employment_status, annual_income, credit_score, 
          previous_credit_score, target_score, status,
          created_at, updated_at
        FROM clients 
        WHERE user_id = ? ${dateFilter}
        ORDER BY created_at DESC
      `;
      
      exportData.clients = await allQuery(clientsQuery, [userId, ...dateParams]);
    }
    
    // Export disputes data
    if (export_type === 'disputes' || export_type === 'all') {
      const disputesQuery = `
        SELECT 
          d.id, d.client_id, d.bureau, d.account_name, 
          d.dispute_reason, d.dispute_type, d.status, d.priority,
          d.filed_date, d.response_date, d.result, d.notes,
          d.created_at, d.updated_at,
          c.first_name, c.last_name, c.email
        FROM disputes d
        JOIN clients c ON d.client_id = c.id
        WHERE c.user_id = ? ${dateFilter.replace('created_at', 'd.created_at')}
        ORDER BY d.created_at DESC
      `;
      
      exportData.disputes = await allQuery(disputesQuery, [userId, ...dateParams]);
    }
    
    // Export activities data
    if (export_type === 'activities' || export_type === 'all') {
      const activitiesQuery = `
        SELECT 
          id, activity_type, description, metadata,
          client_id, dispute_id, ip_address, created_at
        FROM activities 
        WHERE user_id = ? ${dateFilter}
        ORDER BY created_at DESC
        LIMIT 1000
      `;
      
      exportData.activities = await allQuery(activitiesQuery, [userId, ...dateParams]);
    }
    
    // Export financial data
    if (export_type === 'financial' || export_type === 'all') {
      const financialQuery = `
        SELECT 
          strftime('%Y-%m', created_at) as month,
          COUNT(*) as new_clients,
          COUNT(*) * 99 as setup_revenue,
          COUNT(CASE WHEN status = 'active' THEN 1 END) * 49 as monthly_revenue,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) * 199 as completion_revenue
        FROM clients 
        WHERE user_id = ? ${dateFilter}
        GROUP BY strftime('%Y-%m', created_at)
        ORDER BY month DESC
      `;
      
      exportData.financial = await allQuery(financialQuery, [userId, ...dateParams]);
    }
    
    // Log export activity
    await logActivity(
      'analytics_data_exported',
      `Exported analytics data (${export_type}, ${format})`,
      userId,
      undefined,
      undefined,
      { export_type, format, date_from, date_to },
      req.ip,
      req.get('User-Agent')
    );
    
    // Return data based on format
    if (format === 'json') {
      res.json({
        success: true,
        data: {
          ...exportData,
          export_info: {
            export_type,
            format,
            date_range: { from: date_from, to: date_to },
            exported_at: new Date().toISOString()
          }
        }
      });
    } else {
      // CSV format (simplified - would need proper CSV library in production)
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics_export_${new Date().toISOString().split('T')[0]}.csv"`);
      
      let csvContent = 'Export Type,Data Type,Count\n';
      Object.keys(exportData).forEach(key => {
        csvContent += `${export_type},${key},${exportData[key].length}\n`;
      });
      
      res.send(csvContent);
    }
    
  } catch (error) {
    console.error('Error exporting analytics data:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to export analytics data'
    });
  }
}
