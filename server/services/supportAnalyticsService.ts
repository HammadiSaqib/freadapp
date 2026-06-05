import { getDatabaseAdapter } from '../database/databaseAdapter.js';

interface TicketMetrics {
  totalTickets: number;
  totalTicketsChange: string;
  avgResponseTime: string;
  avgResponseTimeChange: string;
  resolutionRate: string;
  resolutionRateChange: string;
  customerSatisfaction: string;
  customerSatisfactionChange: string;
}

interface AnalyticsData {
  trends: Array<{ name: string; tickets: number; resolved: number }>;
  categories: Array<{ name: string; value: number; tickets: number }>;
  satisfaction: Array<{ name: string; satisfaction: number }>;
  responseTime: Array<{ name: string; value: number }>;
}

interface AgentPerformanceData {
  agents: Array<{
    name: string;
    ticketsResolved: number;
    avgResponseTime: string;
    satisfaction: number;
    efficiency: number;
  }>;
}

export class SupportAnalyticsService {
  private getDb() {
    return getDatabaseAdapter();
  }

  async calculateMetrics(period: string): Promise<TicketMetrics> {
    const days = this.getPeriodDays(period);
    const currentPeriodStart = new Date();
    currentPeriodStart.setDate(currentPeriodStart.getDate() - days);
    
    const previousPeriodStart = new Date();
    previousPeriodStart.setDate(previousPeriodStart.getDate() - (days * 2));
    const previousPeriodEnd = new Date(currentPeriodStart);

    // Get current period metrics
    const currentMetrics = await this.getMetricsForPeriod(currentPeriodStart, new Date());
    const previousMetrics = await this.getMetricsForPeriod(previousPeriodStart, previousPeriodEnd);

    return {
      totalTickets: currentMetrics.totalTickets || 0,
      totalTicketsChange: this.calculatePercentageChange(currentMetrics.totalTickets || 0, previousMetrics.totalTickets || 0),
      avgResponseTime: this.formatResponseTime(currentMetrics.avgResponseTime || 0),
      avgResponseTimeChange: this.calculatePercentageChange(previousMetrics.avgResponseTime || 0, currentMetrics.avgResponseTime || 0), // Inverted for response time
      resolutionRate: `${(currentMetrics.resolutionRate || 0).toFixed(1)}%`,
      resolutionRateChange: this.calculatePercentageChange(currentMetrics.resolutionRate || 0, previousMetrics.resolutionRate || 0),
      customerSatisfaction: `${(currentMetrics.customerSatisfaction || 4.5).toFixed(1)}/5`,
      customerSatisfactionChange: this.calculateChange(currentMetrics.customerSatisfaction || 4.5, previousMetrics.customerSatisfaction || 4.5)
    };
  }

  async getAnalyticsData(period: string): Promise<AnalyticsData> {
    const days = this.getPeriodDays(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trends = await this.getTicketTrends(startDate, days);
    const categories = await this.getTicketCategories(startDate);
    const satisfaction = await this.getSatisfactionTrends(startDate, days);
    const responseTime = await this.getResponseTimeTrends(startDate, days);

    return {
      trends,
      categories,
      satisfaction,
      responseTime
    };
  }

  async getAgentPerformance(period: string): Promise<AgentPerformanceData> {
    const days = this.getPeriodDays(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const agents = await this.getAgentMetrics(startDate);
    return { agents };
  }

  private async getMetricsForPeriod(startDate: Date, endDate: Date) {
    const tickets = await this.getDb().allQuery(`
      SELECT 
        COUNT(*) as totalTickets,
        AVG(CASE WHEN t.status = 'resolved' THEN 
          TIMESTAMPDIFF(HOUR, t.created_at, t.updated_at) 
        END) as avgResponseTime,
        (COUNT(CASE WHEN t.status = 'resolved' THEN 1 END) * 100.0 / COUNT(*)) as resolutionRate,
        AVG(COALESCE(ta.customer_satisfaction_rating, 4.5)) as customerSatisfaction
      FROM tickets t
      LEFT JOIN ticket_analytics ta ON t.id = ta.ticket_id
      WHERE t.created_at >= ? AND t.created_at <= ?
    `, [startDate, endDate]);

    const result = tickets[0] || {};
    return {
      totalTickets: Number(result.totalTickets) || 0,
      avgResponseTime: Number(result.avgResponseTime) || 0,
      resolutionRate: Number(result.resolutionRate) || 0,
      customerSatisfaction: Number(result.customerSatisfaction) || 4.5
    };
  }

  private async getTicketTrends(startDate: Date, days: number) {
    const trends = [];
    const interval = days <= 7 ? 1 : Math.ceil(days / 7); // Daily for week, weekly for longer periods

    for (let i = 0; i < Math.min(days, 7); i += interval) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + interval);

      const tickets = await this.getDb().allQuery(`
         SELECT 
           COUNT(*) as total,
           COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved
         FROM tickets 
         WHERE created_at >= ? AND created_at < ?
       `, [date, nextDate]);

      const result = tickets[0] || { total: 0, resolved: 0 };
      trends.push({
        name: this.formatDateLabel(date, days),
        tickets: result.total,
        resolved: result.resolved
      });
    }

    return trends;
  }

  private async getTicketCategories(startDate: Date) {
    const categories = await this.getDb().allQuery(`
      SELECT 
        category,
        COUNT(*) as count
      FROM tickets 
      WHERE created_at >= ?
      GROUP BY category
      ORDER BY count DESC
    `, [startDate]);

    const total = categories.reduce((sum: number, cat: any) => sum + cat.count, 0);
    
    return categories.map((cat: any, index: number) => ({
      name: cat.category || 'General',
      value: Math.round((cat.count / total) * 100),
      tickets: cat.count,
      color: this.getCategoryColor(index)
    }));
  }

  private async getSatisfactionTrends(startDate: Date, days: number) {
    const trends = [];
    const interval = Math.max(1, Math.ceil(days / 6)); // Show 6 data points max

    for (let i = 0; i < days; i += interval) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + interval);

      const satisfaction = await this.getDb().allQuery(`
        SELECT AVG(COALESCE(ta.customer_satisfaction_rating, 4.5)) as avgSatisfaction
        FROM tickets t
        LEFT JOIN ticket_analytics ta ON t.id = ta.ticket_id
        WHERE t.created_at >= ? AND t.created_at < ? AND t.status = 'resolved'
      `, [date, nextDate]);

      const result = satisfaction[0] || { avgSatisfaction: 4.5 };
      const satisfactionValue = parseFloat(result.avgSatisfaction) || 4.5;
      trends.push({
        name: this.formatDateLabel(date, days),
        satisfaction: parseFloat(satisfactionValue.toFixed(1))
      });
    }

    return trends;
  }

  private async getResponseTimeTrends(startDate: Date, days: number) {
    const trends = [];
    const interval = Math.max(1, Math.ceil(days / 4)); // Show 4 data points

    for (let i = 0; i < days; i += interval) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + interval);

      const responseTime = await this.getDb().allQuery(`
        SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as avgTime
        FROM tickets 
        WHERE created_at >= ? AND created_at < ? AND status = 'resolved'
      `, [date, nextDate]);

      const result = responseTime[0] || { avgTime: 2.4 };
      const avgTimeValue = parseFloat(result.avgTime) || 2.4;
      trends.push({
        name: `Week ${Math.floor(i / 7) + 1}`,
        value: parseFloat(avgTimeValue.toFixed(1))
      });
    }

    return trends;
  }

  private async getAgentMetrics(startDate: Date) {
    const agents = await this.getDb().allQuery(`
      SELECT 
        CONCAT(u.first_name, ' ', u.last_name) as name,
        COUNT(t.id) as ticketsResolved,
        AVG(TIMESTAMPDIFF(HOUR, t.created_at, t.updated_at)) as avgResponseTime,
        AVG(COALESCE(ta.customer_satisfaction_rating, 4.5)) as satisfaction
      FROM users u
      LEFT JOIN tickets t ON u.id = t.assignee_id AND t.status = 'resolved' AND t.created_at >= ?
      LEFT JOIN ticket_analytics ta ON t.id = ta.ticket_id
      WHERE u.role IN ('support', 'admin')
      GROUP BY u.id, u.first_name, u.last_name
      HAVING ticketsResolved > 0
      ORDER BY ticketsResolved DESC
      LIMIT 10
    `, [startDate]);

    return agents.map((agent: any) => {
      const satisfactionValue = parseFloat(agent.satisfaction) || 4.5;
      return {
        name: agent.name || 'Unknown Agent',
        ticketsResolved: agent.ticketsResolved || 0,
        avgResponseTime: this.formatResponseTime(agent.avgResponseTime || 2.4),
        satisfaction: parseFloat(satisfactionValue.toFixed(1)),
        efficiency: Math.min(100, Math.round(((agent.ticketsResolved || 0) / 10) * 100)) // Simple efficiency calculation
      };
    });
  }

  private getPeriodDays(period: string): number {
    switch (period) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case '1y': return 365;
      default: return 7;
    }
  }

  private calculatePercentageChange(current: number, previous: number): string {
    if (previous === 0) return '+0%';
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
  }

  private calculateChange(current: number, previous: number): string {
    const change = current - previous;
    return `${change >= 0 ? '+' : ''}${change.toFixed(1)}`;
  }

  private formatResponseTime(hours: number): string {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    }
    return `${hours.toFixed(1)}h`;
  }

  private formatDateLabel(date: Date, totalDays: number): string {
    if (totalDays <= 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else if (totalDays <= 30) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short' });
    }
  }

  private getCategoryColor(index: number): string {
    const colors = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'];
    return colors[index % colors.length];
  }
}

export const supportAnalyticsService = new SupportAnalyticsService();