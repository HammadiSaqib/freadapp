const mysql = require('mysql2/promise');

async function fixTotalEarnings() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });
  
  console.log('=== Fixing Total Earnings in Affiliates Table ===');
  
  // Get affiliate ID
  const [affiliates] = await connection.execute(
    'SELECT id, email, total_earnings FROM affiliates WHERE email = ?', 
    ['a@gmail.com']
  );
  
  const affiliate = affiliates[0];
  console.log('Current affiliate data:', affiliate);
  
  // Calculate correct total earnings (paid commissions only)
  const [actualEarnings] = await connection.execute(
    'SELECT COALESCE(SUM(commission_amount), 0) as actual_paid_earnings FROM affiliate_commissions WHERE affiliate_id = ? AND status = "paid"',
    [affiliate.id]
  );
  
  const correctTotalEarnings = actualEarnings[0].actual_paid_earnings;
  console.log('Correct total earnings (paid only):', correctTotalEarnings);
  
  // Update the affiliates table
  await connection.execute(
    'UPDATE affiliates SET total_earnings = ? WHERE id = ?',
    [correctTotalEarnings, affiliate.id]
  );
  
  console.log('✅ Updated affiliates.total_earnings from', affiliate.total_earnings, 'to', correctTotalEarnings);
  
  // Verify the update
  const [updatedAffiliate] = await connection.execute(
    'SELECT id, email, total_earnings FROM affiliates WHERE id = ?', 
    [affiliate.id]
  );
  
  console.log('Updated affiliate data:', updatedAffiliate[0]);
  
  await connection.end();
}

fixTotalEarnings().catch(console.error);