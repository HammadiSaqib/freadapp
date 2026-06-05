import { Response } from "express";
import { runQuery, getQuery, allQuery } from "../database/databaseAdapter.js";
import { AuthRequest } from "../middleware/authMiddleware.js";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

async function resolveAnalyticsUserId(user: AuthRequest["user"]): Promise<number> {
  if (!user) return 0;
  if (user.role === "admin" || user.role === "super_admin") return user.id;
  if (user.role === "client") return user.id;
  const employeeLink = await getQuery(
    "SELECT admin_id FROM employees WHERE user_id = ? AND status = ? ORDER BY updated_at DESC LIMIT 1",
    [user.id, "active"],
  );
  if (employeeLink?.admin_id) return Number(employeeLink.admin_id);
  return user.id;
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
      const client_email = String(parsed.client_email || "");
      const private_key = String(parsed.private_key || "").replace(/\\n/g, "\n");
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
      private_key: private_key.replace(/\\n/g, "\n"),
    };
  }

  return undefined;
}

// Get dashboard overview analytics
export async function getDashboardAnalytics(req: AuthRequest, res: Response) {
  try {
    const userId = await resolveAnalyticsUserId(req.user);
    console.log("getDashboardAnalytics called for user ID:", userId);

    // Get current date ranges
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayLastMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Total clients from clients table - FIXED: Added user_id filter
    const clientStats = await getQuery(
      `
      SELECT COUNT(*) as current_count,
             SUM(CASE WHEN DATE(created_at) >= DATE(?) THEN 1 ELSE 0 END) as this_month_count,
             SUM(CASE WHEN DATE(created_at) >= DATE(?) AND DATE(created_at) <= DATE(?) THEN 1 ELSE 0 END) as last_month_count
      FROM clients
      WHERE user_id = ?
    `,
      [
        firstDayThisMonth.toISOString().split("T")[0],
        firstDayLastMonth.toISOString().split("T")[0],
        lastDayLastMonth.toISOString().split("T")[0],
        userId,
      ],
    );

    console.log("Client stats query result:", clientStats);

    // Also check if there are any clients at all - FIXED: Added user_id filter
    const allClients = await getQuery(
      "SELECT COUNT(*) as total FROM clients WHERE user_id = ?",
      [userId],
    );
    console.log("Total clients for user:", allClients);

    // Active disputes from disputes table - FIXED: Added user_id filter through JOIN
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const disputeStats = await getQuery(
      `
      SELECT COUNT(*) as active_disputes,
             SUM(CASE WHEN DATE(d.created_at) >= DATE(?) THEN 1 ELSE 0 END) as new_this_week
      FROM disputes d
      JOIN clients c ON d.client_id = c.id
      WHERE d.status IN ('pending', 'investigating') AND c.user_id = ?
    `,
      [lastWeek.toISOString().split("T")[0], userId],
    );

    // Average score improvement from clients table - FIXED: Added user_id filter
    const scoreStats = await getQuery(
      `
      SELECT AVG(credit_score) as avg_score,
             COUNT(CASE WHEN credit_score IS NOT NULL THEN 1 END) as clients_with_scores,
             COUNT(CASE WHEN credit_score > 650 THEN 1 END) as improved_count
      FROM clients
      WHERE credit_score IS NOT NULL AND user_id = ?
    `,
      [userId],
    );

    // Success rate calculation from disputes table - FIXED: Added user_id filter through JOIN
    const successStats = await getQuery(
      `
      SELECT
        COUNT(CASE WHEN d.status IN ('resolved') THEN 1 END) as successful,
        COUNT(*) as total
      FROM disputes d
      JOIN clients c ON d.client_id = c.id
      WHERE c.user_id = ?
    `,
      [userId],
    );
    const successRate =
      successStats.total > 0
        ? (successStats.successful / successStats.total) * 100
        : 0;

    // Client categorization stats from clients table - FIXED: Added user_id filter
    const categorizationStats = await getQuery(
      `
      SELECT 
        COUNT(CASE WHEN fundable_status = 'fundable' THEN 1 END) as fundable_clients,
        COUNT(CASE WHEN fundable_status = 'not_fundable' THEN 1 END) as not_fundable_clients,
        COUNT(CASE WHEN 
          first_name IS NOT NULL AND 
          last_name IS NOT NULL AND 
          email IS NOT NULL AND 
          phone IS NOT NULL AND 
          address IS NOT NULL 
        THEN 1 END) as ready_clients,
        COUNT(CASE WHEN 
          first_name IS NULL OR 
          last_name IS NULL OR 
          email IS NULL OR 
          phone IS NULL OR 
          address IS NULL 
        THEN 1 END) as not_ready_clients
      FROM clients
      WHERE user_id = ?
    `,
      [userId],
    );

    console.log("Categorization stats query result:", categorizationStats);

    // Funding invoices paid this month (count of paid invoices for this user's clients)
    const fundingInvoicesPaidThisMonth = await getQuery(
      `
      SELECT COUNT(*) as paid_count
      FROM invoices
      WHERE user_id = ?
        AND status = 'paid'
        AND paid_at IS NOT NULL
        AND DATE(paid_at) >= DATE(?)
        AND client_id IS NOT NULL
    `,
      [
        userId,
        firstDayThisMonth.toISOString().split("T")[0],
      ],
    );

    // Calculate percentage changes
    const clientChange =
      clientStats.last_month_count > 0
        ? ((clientStats.this_month_count - clientStats.last_month_count) /
            clientStats.last_month_count) *
          100
        : 0;

    const analytics = {
      total_clients: {
        current: clientStats.current_count,
        change: Math.round(clientChange),
        change_text: `${clientChange >= 0 ? "+" : ""}${Math.round(clientChange)}% from last month`,
      },
      ready: categorizationStats.ready_clients || 0,
      notReady: categorizationStats.not_ready_clients || 0,
      fundable: categorizationStats.fundable_clients || 0,
      notFundable: categorizationStats.not_fundable_clients || 0,
      funding_invoices_paid_this_month: (fundingInvoicesPaidThisMonth as any)?.paid_count || 0,
      active_disputes: {
        current: disputeStats.active_disputes,
        new_this_week: disputeStats.new_this_week,
        change_text: `${disputeStats.new_this_week} new this week`,
      },
      avg_score_improvement: {
        current: Math.round(scoreStats.avg_score || 0),
        total_improved: scoreStats.improved_count,
        change_text: `Average credit score`,
      },
      success_rate: {
        current: Math.round(successRate),
        successful_disputes: successStats.successful,
        total_disputes: successStats.total,
        change_text: `Dispute success rate`,
      },
    };

    console.log("Dashboard analytics result:", analytics);
    res.json(analytics);
  } catch (error) {
    console.error("Error fetching dashboard analytics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Get revenue analytics
export async function getRevenue(req: AuthRequest, res: Response) {
  try {
    const { period = "monthly" } = req.query;
    const userId = await resolveAnalyticsUserId(req.user);

    // Mock revenue data based on client count (in real app, you'd have a payments table)
    let dateFormat: string;
    let dateRange: string;

    switch (period) {
      case "daily":
        dateFormat = "%Y-%m-%d";
        dateRange = "DATE('now', '-30 days')";
        break;
      case "weekly":
        dateFormat = "%Y-W%W";
        dateRange = "DATE('now', '-12 weeks')";
        break;
      default:
        dateFormat = "%Y-%m";
        dateRange = "DATE('now', '-12 months')";
    }

    const revenueData = await allQuery(`
      SELECT 
        strftime('${dateFormat}', created_at) as period,
        COUNT(*) * 99 as revenue,  -- Mock: $99 per client
        COUNT(*) as new_clients
      FROM clients 
      WHERE user_id = ? AND DATE(created_at) >= ${dateRange}
      GROUP BY strftime('${dateFormat}', created_at)
      ORDER BY period DESC
      LIMIT 12
    `, [userId]);

    // Calculate total revenue
    const totalRevenue = revenueData.reduce(
      (sum: number, item: any) => sum + item.revenue,
      0,
    );

    // Calculate growth rate (comparing last two periods)
    const growth =
      revenueData.length >= 2
        ? (((revenueData[0] as any).revenue - (revenueData[1] as any).revenue) /
            (revenueData[1] as any).revenue) *
          100
        : 0;

    res.json({
      total_revenue: totalRevenue,
      growth_rate: Math.round(growth),
      period_data: revenueData.reverse(), // Return in chronological order
      period: period,
    });
  } catch (error) {
    console.error("Error fetching revenue analytics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Get performance metrics
export async function getPerformanceMetrics(req: AuthRequest, res: Response) {
  try {
    const userId = await resolveAnalyticsUserId(req.user);

    // Client acquisition metrics
    const acquisitionData = await allQuery(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as new_clients,
        AVG(credit_score) as avg_initial_score
      FROM clients 
      WHERE user_id = ? AND DATE(created_at) >= DATE('now', '-12 months')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month DESC
      LIMIT 12
    `, [userId]);

    // Dispute success rates by bureau
    const bureauStats = await allQuery(`
      SELECT
        bureau,
        COUNT(*) as total_disputes,
        COUNT(CASE WHEN d.status IN ('deleted', 'updated') THEN 1 END) as successful_disputes,
        ROUND(COUNT(CASE WHEN d.status IN ('deleted', 'updated') THEN 1 END) * 100.0 / COUNT(*), 1) as success_rate
      FROM disputes d
      JOIN clients c ON d.client_id = c.id
      WHERE c.user_id = ?
      GROUP BY bureau
    `, [userId]);

    // Average time to resolution
    const resolutionStats = await getQuery(`
      SELECT 
        AVG(JULIANDAY(response_date) - JULIANDAY(filed_date)) as avg_resolution_days,
        COUNT(CASE WHEN response_date IS NOT NULL THEN 1 END) as resolved_disputes
      FROM disputes d
      JOIN clients c ON d.client_id = c.id
      WHERE c.user_id = ? AND response_date IS NOT NULL
    `, [userId]) as any;

    // Credit score improvements over time
    const scoreImprovementData = await allQuery(`
      SELECT 
        strftime('%Y-%m', updated_at) as month,
        AVG(credit_score - previous_credit_score) as avg_improvement,
        COUNT(CASE WHEN credit_score > previous_credit_score THEN 1 END) as improved_clients
      FROM clients 
      WHERE user_id = ? 
        AND credit_score IS NOT NULL 
        AND previous_credit_score IS NOT NULL
        AND DATE(updated_at) >= DATE('now', '-12 months')
      GROUP BY strftime('%Y-%m', updated_at)
      ORDER BY month DESC
      LIMIT 12
    `, [userId]);

    res.json({
      client_acquisition: acquisitionData.reverse(),
      bureau_performance: bureauStats,
      average_resolution_days: Math.round(
        resolutionStats.avg_resolution_days || 0,
      ),
      score_improvements: scoreImprovementData.reverse(),
      total_resolved_disputes: resolutionStats.resolved_disputes || 0,
    });
  } catch (error) {
    console.error("Error fetching performance metrics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Get client analytics
export async function getClientAnalytics(req: AuthRequest, res: Response) {
  try {
    const userId = await resolveAnalyticsUserId(req.user);

    // Client status distribution
    const statusDistribution = await allQuery(`
      SELECT 
        status,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM clients WHERE user_id = ?), 1) as percentage
      FROM clients 
      WHERE user_id = ?
      GROUP BY status
    `, [userId, userId]);

    // Credit score distribution
    const scoreDistribution = await allQuery(`
      SELECT 
        CASE 
          WHEN credit_score < 580 THEN 'Poor (300-579)'
          WHEN credit_score < 670 THEN 'Fair (580-669)'
          WHEN credit_score < 740 THEN 'Good (670-739)'
          WHEN credit_score < 800 THEN 'Very Good (740-799)'
          ELSE 'Excellent (800+)'
        END as score_range,
        COUNT(*) as count
      FROM clients 
      WHERE user_id = ? AND credit_score IS NOT NULL
      GROUP BY score_range
      ORDER BY MIN(credit_score)
    `, [userId]);

    // Employment status breakdown
    const employmentBreakdown = await allQuery(`
      SELECT 
        employment_status,
        COUNT(*) as count,
        AVG(annual_income) as avg_income
      FROM clients 
      WHERE user_id = ? AND employment_status IS NOT NULL
      GROUP BY employment_status
    `, [userId]);

    // Geographic distribution (mock data based on area codes)
    const geoData = await allQuery(`
      SELECT 
        SUBSTR(phone, 2, 3) as area_code,
        COUNT(*) as count
      FROM clients 
      WHERE user_id = ?
      GROUP BY SUBSTR(phone, 2, 3)
      ORDER BY count DESC
      LIMIT 10
    `, [userId]);

    res.json({
      status_distribution: statusDistribution,
      credit_score_distribution: scoreDistribution,
      employment_breakdown: employmentBreakdown,
      geographic_distribution: geoData,
    });
  } catch (error) {
    console.error("Error fetching client analytics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Get financial insights
export async function getFinancialInsights(req: AuthRequest, res: Response) {
  try {
    const userId = await resolveAnalyticsUserId(req.user);

    // Monthly recurring revenue (MRR) - mock calculation
    const { mrr } = await getQuery(`
      SELECT COUNT(*) * 99 as mrr
      FROM clients 
      WHERE user_id = ? AND status = 'active'
    `, [userId]) as { mrr: number };

    // Annual recurring revenue projection
    const arr = mrr * 12;

    // Client lifetime value (mock calculation)
    const cltv = 99 * 8; // Average 8 months per client

    // Average revenue per client
    const { total_clients } = await getQuery(`
      SELECT COUNT(*) as total_clients
      FROM clients 
      WHERE user_id = ?
    `, [userId]) as { total_clients: number };
    const arpc = total_clients > 0 ? mrr / total_clients : 0;

    // Revenue breakdown by service (mock data)
    const revenueBreakdown = [
      { service: "Credit Monitoring", revenue: mrr * 0.3, percentage: 30 },
      { service: "Dispute Services", revenue: mrr * 0.5, percentage: 50 },
      { service: "Credit Coaching", revenue: mrr * 0.15, percentage: 15 },
      { service: "Other Services", revenue: mrr * 0.05, percentage: 5 },
    ];

    // Monthly growth rate
    const growthData = await getQuery(`
      SELECT 
        COUNT(CASE WHEN DATE(created_at) >= DATE('now', 'start of month') THEN 1 END) as this_month,
        COUNT(CASE WHEN DATE(created_at) >= DATE('now', '-1 month', 'start of month') 
              AND DATE(created_at) < DATE('now', 'start of month') THEN 1 END) as last_month
      FROM clients 
      WHERE user_id = ?
    `, [userId]) as { this_month: number; last_month: number };
    const growthRate =
      growthData.last_month > 0
        ? ((growthData.this_month - growthData.last_month) /
            growthData.last_month) *
          100
        : 0;

    res.json({
      monthly_recurring_revenue: mrr,
      annual_recurring_revenue: arr,
      customer_lifetime_value: cltv,
      average_revenue_per_client: Math.round(arpc),
      growth_rate: Math.round(growthRate),
      revenue_breakdown: revenueBreakdown,
      financial_metrics: {
        total_revenue_ytd: mrr * new Date().getMonth() + 1, // Year to date
        new_client_revenue_this_month: growthData.this_month * 99,
        churn_rate: 5, // Mock 5% monthly churn
      },
    });
  } catch (error) {
    console.error("Error fetching financial insights:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Get revenue analytics
export async function getRevenueAnalytics(req: AuthRequest, res: Response) {
  try {
    const { period = 'monthly' } = req.query;
    const userId = await resolveAnalyticsUserId(req.user);

    // Determine date format based on period
    let dateFormat: string;
    switch (period) {
      case 'daily':
        dateFormat = '%Y-%m-%d';
        break;
      case 'weekly':
        dateFormat = '%Y-W%W';
        break;
      case 'monthly':
        dateFormat = '%Y-%m';
        break;
      case 'yearly':
        dateFormat = '%Y';
        break;
      default:
        dateFormat = '%Y-%m';
    }

    const revenueData = await allQuery(`
      SELECT 
        strftime('${dateFormat}', created_at) as period,
        COUNT(*) as new_clients,
        COUNT(*) * 99 as revenue
      FROM clients
      WHERE user_id = ? AND DATE(created_at) >= DATE('now', '-12 months')
      GROUP BY strftime('${dateFormat}', created_at)
      ORDER BY period DESC
      LIMIT 12
    `, [userId]);

    res.json({
      period_data: revenueData.reverse(),
      total_revenue: revenueData.reduce((sum: number, item: any) => sum + (item.revenue || 0), 0)
    });
  } catch (error) {
    console.error("Error fetching revenue analytics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Get recent activities
export async function getRecentActivities(req: AuthRequest, res: Response) {
  try {
    const { limit = 10 } = req.query;
    const userId = await resolveAnalyticsUserId(req.user);

    // Sanitize and enforce a safe numeric limit (avoid binding LIMIT as a param)
    const parsedLimit = parseInt(String(limit), 10);
    const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100 ? parsedLimit : 10;

    const activitiesSql = `
      SELECT
        a.*,
        c.first_name,
        c.last_name
      FROM activities a
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC
      LIMIT ${safeLimit}
    `;

    const activities = await allQuery(activitiesSql, [userId]);

    res.json(activities);
  } catch (error) {
    console.error("Error fetching recent activities:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getGa4Realtime(req: AuthRequest, res: Response) {
  try {
    const propertyId =
      process.env.GA4_PROPERTY_ID || process.env.GOOGLE_ANALYTICS_PROPERTY_ID;

    if (!propertyId) {
      return res.status(501).json({
        success: false,
        error: "GA4_PROPERTY_ID not configured",
      });
    }

    const credentials = getGa4Credentials();
    const client = credentials
      ? new BetaAnalyticsDataClient({ credentials })
      : new BetaAnalyticsDataClient();

    const [report] = await client.runRealtimeReport({
      property: `properties/${propertyId}`,
      metrics: [{ name: "activeUsers" }],
      dimensions: [{ name: "unifiedScreenName" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: 10,
    });

    const activeUsers = Number(
      report?.totals?.[0]?.metricValues?.[0]?.value ?? 0,
    );

    const topScreens = (report?.rows || [])
      .map((row) => {
        const screen = row.dimensionValues?.[0]?.value || "(unknown)";
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
    console.error("Error fetching GA4 realtime report:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to fetch GA4 realtime analytics",
    });
  }
}

// ── Elite Dashboard aggregate endpoint ──
// Returns all real data needed by EliteDashboard in a single request
export async function getEliteDashboardData(req: AuthRequest, res: Response) {
  try {
    const userId = await resolveAnalyticsUserId(req.user);
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // ── 1) Invoice revenue (real from invoices table) ──
    const revenueThisMonth = await getQuery(
      `SELECT
         COALESCE(SUM(total), 0) as total_revenue,
         COALESCE(SUM(amount_paid), 0) as total_collected,
         COALESCE(SUM(balance_due), 0) as total_outstanding,
         COUNT(*) as invoice_count,
         COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
         COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count,
         COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count
       FROM invoices
       WHERE user_id = ? AND DATE(issued_date) >= DATE(?)`,
      [userId, firstDayThisMonth.toISOString().split("T")[0]],
    );

    const revenueLastMonth = await getQuery(
      `SELECT
         COALESCE(SUM(total), 0) as total_revenue,
         COALESCE(SUM(amount_paid), 0) as total_collected,
         COALESCE(SUM(balance_due), 0) as total_outstanding
       FROM invoices
       WHERE user_id = ? AND DATE(issued_date) >= DATE(?) AND DATE(issued_date) <= DATE(?)`,
      [userId, firstDayLastMonth.toISOString().split("T")[0], lastDayLastMonth.toISOString().split("T")[0]],
    );

    const revenueGrowth = Number(revenueLastMonth?.total_revenue) > 0
      ? Math.round(((Number(revenueThisMonth?.total_revenue) - Number(revenueLastMonth?.total_revenue)) / Number(revenueLastMonth?.total_revenue)) * 100)
      : 0;
    const collectedGrowth = Number(revenueLastMonth?.total_collected) > 0
      ? Math.round(((Number(revenueThisMonth?.total_collected) - Number(revenueLastMonth?.total_collected)) / Number(revenueLastMonth?.total_collected)) * 100)
      : 0;
    const outstandingGrowth = Number(revenueLastMonth?.total_outstanding) > 0
      ? Math.round(((Number(revenueThisMonth?.total_outstanding) - Number(revenueLastMonth?.total_outstanding)) / Number(revenueLastMonth?.total_outstanding)) * 100)
      : 0;

    // ── 2) Client status distribution (real) ──
    const statusDist = await allQuery(
      `SELECT
         status,
         COUNT(*) as count
       FROM clients WHERE user_id = ? GROUP BY status`,
      [userId],
    );

    // ── 3) Credit score distribution (real) ──
    const scoreDist = await allQuery(
      `SELECT
         CASE
           WHEN credit_score < 580 THEN 'Poor'
           WHEN credit_score < 670 THEN 'Fair'
           WHEN credit_score < 740 THEN 'Good'
           WHEN credit_score < 800 THEN 'Very Good'
           ELSE 'Excellent'
         END as score_range,
         COUNT(*) as count
       FROM clients
       WHERE user_id = ? AND credit_score IS NOT NULL
       GROUP BY score_range
       ORDER BY MIN(credit_score)`,
      [userId],
    );

    // ── 4) Dispute details (real) ──
    const disputeBreakdown = await getQuery(
      `SELECT
         COUNT(*) as total_disputes,
         COUNT(CASE WHEN d.status IN ('pending', 'investigating') THEN 1 END) as active_disputes,
         COUNT(CASE WHEN d.status = 'resolved' THEN 1 END) as resolved_disputes,
         COUNT(CASE WHEN d.status IN ('deleted', 'updated') THEN 1 END) as successful_disputes,
         COUNT(CASE WHEN DATE(d.created_at) >= DATE(?) THEN 1 END) as disputes_this_month,
         COUNT(CASE WHEN DATE(d.created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as disputes_this_week
       FROM disputes d
       JOIN clients c ON d.client_id = c.id
       WHERE c.user_id = ?`,
      [firstDayThisMonth.toISOString().split("T")[0], userId],
    );

    // ── 5) Clients needing attention (real counts for tasks) ──
    const clientAttention = await getQuery(
      `SELECT
         COUNT(CASE WHEN credit_score IS NULL OR credit_score = 0 THEN 1 END) as no_score_count,
         COUNT(CASE WHEN updated_at < DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as stale_clients,
         COUNT(CASE WHEN credit_score > previous_credit_score AND credit_score IS NOT NULL AND previous_credit_score IS NOT NULL THEN 1 END) as improving_clients,
         COUNT(CASE WHEN credit_score <= previous_credit_score AND credit_score IS NOT NULL AND previous_credit_score IS NOT NULL THEN 1 END) as declining_or_stable_clients,
         COUNT(CASE WHEN fundable_status = 'fundable' AND credit_score > 650 THEN 1 END) as ready_for_matching,
         COUNT(CASE WHEN fundable_status = 'not_fundable' THEN 1 END) as need_dispute_work,
         COUNT(0) as locked_active_clients
       FROM clients WHERE user_id = ?`,
      [userId],
    );

    // ── 6) Bureau-level fundability (real) ──
    const bureauFundability = await getQuery(
      `SELECT
         COUNT(CASE WHEN fundable_in_tu = 1 THEN 1 END) as fundable_tu,
         COUNT(CASE WHEN fundable_in_ex = 1 THEN 1 END) as fundable_ex,
         COUNT(CASE WHEN fundable_in_eq = 1 THEN 1 END) as fundable_eq,
         COUNT(*) as total_with_data
       FROM clients WHERE user_id = ? AND (fundable_in_tu IS NOT NULL OR fundable_in_ex IS NOT NULL OR fundable_in_eq IS NOT NULL)`,
      [userId],
    );

    // ── 7) Monthly client growth (real) ──
    const monthlyGrowth = await getQuery(
      `SELECT
         COUNT(CASE WHEN DATE(created_at) >= DATE(?) THEN 1 END) as new_this_month,
         COUNT(CASE WHEN DATE(created_at) >= DATE(?) AND DATE(created_at) <= DATE(?) THEN 1 END) as new_last_month,
         COUNT(*) as total_clients
       FROM clients WHERE user_id = ?`,
      [
        firstDayThisMonth.toISOString().split("T")[0],
        firstDayLastMonth.toISOString().split("T")[0],
        lastDayLastMonth.toISOString().split("T")[0],
        userId,
      ],
    );

    const clientGrowthPct = Number(monthlyGrowth?.new_last_month) > 0
      ? Math.round(((Number(monthlyGrowth?.new_this_month) - Number(monthlyGrowth?.new_last_month)) / Number(monthlyGrowth?.new_last_month)) * 100)
      : 0;

    // ── 8) Clients with generated dispute letters (lifetime) ──
    const clientsWithLettersResult = await getQuery(
      `SELECT COUNT(DISTINCT client_id) as count
       FROM dispute_letter_history
       WHERE user_id = ? AND client_id IS NOT NULL`,
      [userId],
    );

    // ── 9) Overdue invoices per client (real) ──
    const overdueInvoiceClients = await allQuery(
      `SELECT
         i.client_id,
         c.first_name,
         c.last_name,
         SUM(i.balance_due) as total_overdue
       FROM invoices i
       JOIN clients c ON c.id = i.client_id
       WHERE i.user_id = ? AND i.status = 'overdue' AND i.balance_due > 0
       GROUP BY i.client_id
       ORDER BY total_overdue DESC
       LIMIT 10`,
      [userId],
    );

    res.json({
      revenue: {
        this_month: Number(revenueThisMonth?.total_revenue) || 0,
        collected: Number(revenueThisMonth?.total_collected) || 0,
        outstanding: Number(revenueThisMonth?.total_outstanding) || 0,
        last_month: Number(revenueLastMonth?.total_revenue) || 0,
        invoice_count: Number(revenueThisMonth?.invoice_count) || 0,
        paid_count: Number(revenueThisMonth?.paid_count) || 0,
        overdue_count: Number(revenueThisMonth?.overdue_count) || 0,
        sent_count: Number(revenueThisMonth?.sent_count) || 0,
        growth_pct: revenueGrowth,
        collected_growth_pct: collectedGrowth,
        outstanding_growth_pct: outstandingGrowth,
      },
      disputes: {
        total: Number(disputeBreakdown?.total_disputes) || 0,
        active: Number(disputeBreakdown?.active_disputes) || 0,
        resolved: Number(disputeBreakdown?.resolved_disputes) || 0,
        successful: Number(disputeBreakdown?.successful_disputes) || 0,
        this_month: Number(disputeBreakdown?.disputes_this_month) || 0,
        this_week: Number(disputeBreakdown?.disputes_this_week) || 0,
      },
      client_status: statusDist,
      credit_score_distribution: scoreDist,
      client_attention: {
        no_score: Number(clientAttention?.no_score_count) || 0,
        stale: Number(clientAttention?.stale_clients) || 0,
        improving: Number(clientAttention?.improving_clients) || 0,
        declining_or_stable: Number(clientAttention?.declining_or_stable_clients) || 0,
        ready_for_matching: Number(clientAttention?.ready_for_matching) || 0,
        need_dispute_work: Number(clientAttention?.need_dispute_work) || 0,
        locked_active: Number(clientAttention?.locked_active_clients) || 0,
      },
      bureau_fundability: {
        transunion: Number(bureauFundability?.fundable_tu) || 0,
        experian: Number(bureauFundability?.fundable_ex) || 0,
        equifax: Number(bureauFundability?.fundable_eq) || 0,
        total_assessed: Number(bureauFundability?.total_with_data) || 0,
      },
      client_growth: {
        new_this_month: Number(monthlyGrowth?.new_this_month) || 0,
        new_last_month: Number(monthlyGrowth?.new_last_month) || 0,
        total: Number(monthlyGrowth?.total_clients) || 0,
        growth_pct: clientGrowthPct,
      },
      overdue_clients: overdueInvoiceClients.map((r: any) => ({
        client_id: r.client_id,
        name: [r.first_name, r.last_name].filter(Boolean).join(' '),
        total_overdue: Number(r.total_overdue) || 0,
      })),
      clients_with_letters: Number(clientsWithLettersResult?.count) || 0,
    });
  } catch (error) {
    console.error("Error fetching elite dashboard data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
