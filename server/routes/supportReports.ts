import express from 'express';
import { executeQuery } from '../database/mysqlConfig.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { SupportMetrics, AgentPerformance, TicketAnalytics } from '../database/mysqlSchema.js';
import { supportAnalyticsService } from '../services/supportAnalyticsService.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Get support metrics for dashboard
router.get('/metrics', async (req, res) => {
  try {
    const { dateRange = '7d' } = req.query as { dateRange?: string };
    
    const metrics = await supportAnalyticsService.calculateMetrics(dateRange);
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching support metrics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch support metrics' });
  }
});

// Get analytics data for charts
router.get('/analytics', async (req, res) => {
  try {
    const { period = '7d' } = req.query as { period?: string };
    
    const analytics = await supportAnalyticsService.getAnalyticsData(period);
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

// Get agent performance data
router.get('/performance', async (req, res) => {
  try {
    const { period = '7d' } = req.query as { period?: string };
    
    const performance = await supportAnalyticsService.getAgentPerformance(period);
    res.json(performance);
  } catch (error) {
    console.error('Error fetching agent performance:', error);
    res.status(500).json({ error: 'Failed to fetch agent performance data' });
  }
});

// Get insights and recommendations
router.get('/insights', async (req, res) => {
  try {
    const { dateRange = '30d' } = req.query;
    
    let dateFilter = '';
    switch (dateRange) {
      case '7d':
        dateFilter = `AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`;
        break;
      case '30d':
        dateFilter = `AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`;
        break;
      case '90d':
        dateFilter = `AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)`;
        break;
      case '1y':
        dateFilter = `AND created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)`;
        break;
    }

    // Get peak hours analysis
    const [peakHours] = await executeQuery<any[]>(`
      SELECT 
        HOUR(created_at) as hour,
        COUNT(*) as ticket_count
      FROM tickets
      WHERE 1=1 ${dateFilter}
      GROUP BY HOUR(created_at)
      ORDER BY ticket_count DESC
      LIMIT 1
    `);

    // Get most common category
    const [topCategory] = await executeQuery<any[]>(`
      SELECT 
        category,
        COUNT(*) as count,
        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM tickets WHERE 1=1 ${dateFilter})), 0) as percentage
      FROM tickets
      WHERE 1=1 ${dateFilter}
      GROUP BY category
      ORDER BY count DESC
      LIMIT 1
    `);

    const insights = {
      peakHours: peakHours ? `${peakHours.hour}:00-${peakHours.hour + 1}:00` : '2-4 PM',
      topCategory: topCategory ? {
        name: topCategory.category,
        percentage: topCategory.percentage
      } : { name: 'Credit Repair', percentage: 45 }
    };

    res.json({
      success: true,
      data: { insights }
    });
  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch insights' });
  }
});

export default router;