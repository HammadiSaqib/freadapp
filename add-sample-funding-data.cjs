const mysql = require('mysql2/promise');

async function addSampleFundingData() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'creditrepair_db'
    });
    
    console.log('Adding sample funding request data...');
    
    // First, let's get a user ID to use as the requester
    const [users] = await connection.execute('SELECT id FROM users WHERE role = "agent" LIMIT 1');
    const userId = users.length > 0 ? users[0].id : 1;
    
    // Get funding manager ID for reviewer
    const [fundingManagers] = await connection.execute('SELECT id FROM users WHERE role = "funding_manager" LIMIT 1');
    const reviewerId = fundingManagers.length > 0 ? fundingManagers[0].id : null;
    
    const sampleData = [
      {
        title: 'Marketing Campaign Equipment',
        description: 'Need funding for new marketing equipment including cameras, lighting, and editing software',
        amount: 15000.00,
        purpose: 'marketing',
        status: 'approved',
        priority: 'high',
        requested_date: '2024-01-15 10:30:00',
        reviewed_date: '2024-01-18 14:20:00',
        reviewer_notes: 'Approved for marketing expansion initiative',
        user_id: userId,
        reviewer_id: reviewerId
      },
      {
        title: 'Office Expansion Project',
        description: 'Funding required for expanding office space and purchasing new furniture',
        amount: 25000.00,
        purpose: 'expansion',
        status: 'approved',
        priority: 'medium',
        requested_date: '2024-01-20 09:15:00',
        reviewed_date: '2024-01-22 16:45:00',
        reviewer_notes: 'Approved for Q1 expansion plan',
        user_id: userId,
        reviewer_id: reviewerId
      },
      {
        title: 'Technology Infrastructure Upgrade',
        description: 'Investment in new servers, software licenses, and IT equipment',
        amount: 35000.00,
        purpose: 'technology',
        status: 'pending',
        priority: 'high',
        requested_date: '2024-01-25 11:00:00',
        user_id: userId
      },
      {
        title: 'Staff Training Program',
        description: 'Professional development and certification programs for team members',
        amount: 8000.00,
        purpose: 'training',
        status: 'under_review',
        priority: 'medium',
        requested_date: '2024-01-28 14:30:00',
        user_id: userId
      },
      {
        title: 'Inventory Management System',
        description: 'New inventory tracking and management software implementation',
        amount: 12000.00,
        purpose: 'inventory',
        status: 'approved',
        priority: 'medium',
        requested_date: '2024-02-01 08:45:00',
        reviewed_date: '2024-02-03 13:15:00',
        reviewer_notes: 'Approved for operational efficiency improvement',
        user_id: userId,
        reviewer_id: reviewerId
      },
      {
        title: 'Equipment Maintenance Fund',
        description: 'Annual maintenance and repair budget for existing equipment',
        amount: 5000.00,
        purpose: 'equipment',
        status: 'rejected',
        priority: 'low',
        requested_date: '2024-02-05 16:20:00',
        reviewed_date: '2024-02-07 10:30:00',
        reviewer_notes: 'Rejected - maintenance should be covered by operational budget',
        user_id: userId,
        reviewer_id: reviewerId
      }
    ];
    
    for (const data of sampleData) {
      const query = `
        INSERT INTO funding_requests 
        (title, description, amount, purpose, status, priority, requested_date, reviewed_date, reviewer_notes, user_id, reviewer_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await connection.execute(query, [
        data.title,
        data.description,
        data.amount,
        data.purpose,
        data.status,
        data.priority,
        data.requested_date,
        data.reviewed_date || null,
        data.reviewer_notes || null,
        data.user_id,
        data.reviewer_id || null
      ]);
    }
    
    console.log(`✅ Added ${sampleData.length} sample funding requests`);
    
    // Check the results
    const [results] = await connection.execute('SELECT COUNT(*) as count FROM funding_requests');
    console.log(`Total funding requests in database: ${results[0].count}`);
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error adding sample data:', error.message);
  }
}

addSampleFundingData();