import { Request, Response } from 'express';
import { getQuery, allQuery } from '../database/databaseAdapter.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

// Get funding manager dashboard statistics
export async function getFundingManagerDashboardStats(req: AuthRequest, res: Response) {
  try {
    console.log('📊 Fetching funding manager dashboard stats...');
    
    // Only funding managers can access this endpoint
    if (req.user!.role !== 'funding_manager') {
      console.log('❌ Access denied - user role:', req.user!.role);
      return res.status(403).json({ error: 'Access denied. Funding manager role required.' });
    }

    console.log('✅ User authorized as funding manager');

    // Get current date for calculations
    const currentDate = new Date();
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    console.log('📅 Date range:', {
      currentMonth: currentMonth.toISOString().split('T')[0],
      lastMonth: lastMonth.toISOString().split('T')[0]
    });

    // Total Funded Amount
    console.log('💰 Fetching total funded data...');
    const totalFundedQuery = `
      SELECT 
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as total_funded,
        SUM(CASE WHEN status = 'approved' AND reviewed_date >= ? THEN amount ELSE 0 END) as current_month_funded,
        SUM(CASE WHEN status = 'approved' AND reviewed_date >= ? AND reviewed_date < ? THEN amount ELSE 0 END) as last_month_funded
      FROM funding_requests
    `;
    const fundedData = await getQuery(totalFundedQuery, [currentMonth.toISOString().split('T')[0], lastMonth.toISOString().split('T')[0], currentMonth.toISOString().split('T')[0]]);
    console.log('💰 Funded data:', fundedData);

    // Active Investments
    const activeInvestmentsQuery = `
      SELECT 
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as active_investments,
        COUNT(CASE WHEN status = 'approved' AND reviewed_date >= ? THEN 1 END) as current_month_investments,
        COUNT(CASE WHEN status = 'approved' AND reviewed_date >= ? AND reviewed_date < ? THEN 1 END) as last_month_investments
      FROM funding_requests
    `;
    const investmentsData = await getQuery(activeInvestmentsQuery, [currentMonth.toISOString().split('T')[0], lastMonth.toISOString().split('T')[0], currentMonth.toISOString().split('T')[0]]);

    // Portfolio Value (Total + 30% growth assumption)
    const portfolioValue = (fundedData?.total_funded || 0) * 1.3;
    const lastMonthPortfolio = (fundedData?.last_month_funded || 0) * 1.3;
    const currentMonthPortfolio = (fundedData?.current_month_funded || 0) * 1.3;

    // Funded Clients (unique users with approved requests)
    const clientsQuery = `
      SELECT 
        COUNT(DISTINCT CASE WHEN status = 'approved' THEN user_id END) as funded_clients,
        COUNT(DISTINCT CASE WHEN reviewed_date >= ? THEN user_id END) as current_month_clients,
        COUNT(DISTINCT CASE WHEN reviewed_date >= ? AND reviewed_date < ? THEN user_id END) as last_month_clients
      FROM funding_requests
    `;
    const clientsData = await getQuery(clientsQuery, [currentMonth.toISOString().split('T')[0], lastMonth.toISOString().split('T')[0], currentMonth.toISOString().split('T')[0]]);

    // Pending Applications
    const pendingQuery = `
      SELECT 
        COUNT(*) as pending_applications,
        COUNT(CASE WHEN requested_date >= ? THEN 1 END) as current_month_pending,
        COUNT(CASE WHEN requested_date >= ? AND requested_date < ? THEN 1 END) as last_month_pending
      FROM funding_requests 
      WHERE status = 'pending'
    `;
    const pendingData = await getQuery(pendingQuery, [currentMonth.toISOString().split('T')[0], lastMonth.toISOString().split('T')[0], currentMonth.toISOString().split('T')[0]]);

    // Average Ticket Size
    const avgTicketQuery = `
      SELECT 
        AVG(amount) as avg_ticket_size,
        AVG(CASE WHEN requested_date >= ? THEN amount END) as current_month_avg,
        AVG(CASE WHEN requested_date >= ? AND requested_date < ? THEN amount END) as last_month_avg
      FROM funding_requests 
      WHERE status IN ('approved', 'pending', 'under_review')
    `;
    const ticketData = await getQuery(avgTicketQuery, [currentMonth.toISOString().split('T')[0], lastMonth.toISOString().split('T')[0], currentMonth.toISOString().split('T')[0]]);

    // Success Rate
    const successRateQuery = `
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_requests,
        COUNT(CASE WHEN requested_date >= ? THEN 1 END) as current_month_total,
        COUNT(CASE WHEN requested_date >= ? AND status = 'approved' THEN 1 END) as current_month_approved,
        COUNT(CASE WHEN requested_date >= ? AND requested_date < ? THEN 1 END) as last_month_total,
        COUNT(CASE WHEN requested_date >= ? AND requested_date < ? AND status = 'approved' THEN 1 END) as last_month_approved
      FROM funding_requests
    `;
    const successData = await getQuery(successRateQuery, [
      currentMonth.toISOString().split('T')[0], 
      currentMonth.toISOString().split('T')[0],
      lastMonth.toISOString().split('T')[0], 
      currentMonth.toISOString().split('T')[0],
      lastMonth.toISOString().split('T')[0], 
      currentMonth.toISOString().split('T')[0]
    ]);

    // Banks and Cards (real tables)
    let banksData, cardsData;
    try {
      const banksQuery = `
        SELECT COUNT(*) as bank_count FROM banks WHERE is_active = true
      `;
      banksData = await getQuery(banksQuery, []);
      console.log('🔍 DEBUG: Banks data:', banksData);
    } catch (error) {
      console.log('🔍 DEBUG: Banks query error:', (error as any)?.message);
      banksData = { bank_count: 0 };
    }
    
    try {
      const cardsQuery = `
        SELECT COUNT(*) as card_count FROM cards WHERE is_active = true
      `;
      cardsData = await getQuery(cardsQuery, []);
      console.log('🔍 DEBUG: Cards data:', cardsData);
    } catch (error) {
      console.log('🔍 DEBUG: Cards query error:', (error as any)?.message);
      cardsData = { card_count: 0 };
    }

    // Ready / Not Ready for funding based on clients fundable_status
    const readyClientsQuery = `
      SELECT 
        COUNT(*) as ready_for_funding,
        COUNT(CASE WHEN updated_at >= ? THEN 1 END) as current_month_ready,
        COUNT(CASE WHEN updated_at >= ? AND updated_at < ? THEN 1 END) as last_month_ready
      FROM clients
      WHERE fundable_status = 'fundable'
    `;
    const readyData = await getQuery(readyClientsQuery, [
      currentMonth.toISOString().split('T')[0],
      lastMonth.toISOString().split('T')[0],
      currentMonth.toISOString().split('T')[0]
    ]);

    const notReadyClientsQuery = `
      SELECT COUNT(*) as not_ready_for_funding
      FROM clients 
      WHERE fundable_status = 'not_fundable'
    `;
    const notReadyData = await getQuery(notReadyClientsQuery, []);

    // Calculate percentage changes
    const calculatePercentageChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100 * 10) / 10;
    };

    // Calculate Monthly ROI (mock calculation based on funded amounts)
    const monthlyROI = 12.5; // Mock value - would need actual ROI calculation
    const lastMonthROI = 10.2;
    const roiChange = calculatePercentageChange(monthlyROI, lastMonthROI);

    // Build response
    const stats = {
      totalFunded: {
        value: fundedData?.total_funded || 0,
        change: calculatePercentageChange(
          fundedData?.current_month_funded || 0,
          fundedData?.last_month_funded || 0
        )
      },
      activeInvestments: {
        value: investmentsData?.active_investments || 0,
        change: calculatePercentageChange(
          investmentsData?.current_month_investments || 0,
          investmentsData?.last_month_investments || 0
        )
      },
      monthlyROI: {
        value: monthlyROI,
        change: roiChange
      },
      portfolioValue: {
        value: portfolioValue,
        change: calculatePercentageChange(currentMonthPortfolio, lastMonthPortfolio)
      },
      fundedClients: {
        value: clientsData?.funded_clients || 0,
        change: calculatePercentageChange(
          clientsData?.current_month_clients || 0,
          clientsData?.last_month_clients || 0
        )
      },
      pendingApplications: {
        value: pendingData?.pending_applications || 0,
        change: calculatePercentageChange(
          pendingData?.current_month_pending || 0,
          pendingData?.last_month_pending || 0
        )
      },
      avgTicketSize: {
        value: ticketData?.avg_ticket_size || 0,
        change: calculatePercentageChange(
          ticketData?.current_month_avg || 0,
          ticketData?.last_month_avg || 0
        )
      },
      averageTicketSize: {
        value: ticketData?.avg_ticket_size || 0,
        change: calculatePercentageChange(
          ticketData?.current_month_avg || 0,
          ticketData?.last_month_avg || 0
        )
      },
      successRate: {
        value: successData?.total_requests > 0 
          ? Math.round((successData.approved_requests / successData.total_requests) * 100 * 10) / 10
          : 0,
        change: calculatePercentageChange(
          successData?.current_month_total > 0 
            ? (successData.current_month_approved / successData.current_month_total) * 100
            : 0,
          successData?.last_month_total > 0 
            ? (successData.last_month_approved / successData.last_month_total) * 100
            : 0
        )
      },
      numberOfBanks: {
        value: (banksData as any)?.bank_count || 0,
        change: 0
      },
      numberOfCards: {
        value: (cardsData as any)?.card_count || 0,
        change: 0
      },
      readyForFunding: {
        value: readyData?.ready_for_funding || 0,
        change: calculatePercentageChange(
          readyData?.current_month_ready || 0,
          readyData?.last_month_ready || 0
        )
      },
      notReadyForFunding: {
        value: notReadyData?.not_ready_for_funding || 0,
        change: 0 // No change calculation for this metric
      }
    };

    res.json({
      success: true,
      data: stats,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('🔍 DEBUG: Error in getFundingManagerDashboardStats:', error);
    console.error('🔍 DEBUG: Error stack:', error.stack);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch dashboard statistics',
      debug: error.message
    });
  }
}