const mysql = require('mysql2/promise');

async function checkAffiliatesTable() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });
  
  console.log('=== Checking Affiliates Table vs Actual Commissions ===');
  
  // Get affiliate data from affiliates table
  const [affiliates] = await connection.execute(
    'SELECT id, email, total_earnings FROM affiliates WHERE email = ?', 
    ['a@gmail.com']
  );
  
  const affiliate = affiliates[0];
  console.log('Affiliate table data:', affiliate);
  
  // Get actual total earnings from commissions table (paid only)
  const [actualPaidEarnings] = await connection.execute(
    'SELECT COALESCE(SUM(commission_amount), 0) as actual_paid_earnings FROM affiliate_commissions WHERE affiliate_id = ? AND status = "paid"',
    [affiliate.id]
  );
  
  // Get actual total earnings from commissions table (paid + pending)
  const [actualAllEarnings] = await connection.execute(
    'SELECT COALESCE(SUM(commission_amount), 0) as actual_all_earnings FROM affiliate_commissions WHERE affiliate_id = ? AND status IN ("paid", "pending")',
    [affiliate.id]
  );
  
  console.log('\n=== Comparison ===');
  console.log('Affiliates table total_earnings:', affiliate.total_earnings);
  console.log('Actual paid commissions:', actualPaidEarnings[0].actual_paid_earnings);
  console.log('Actual all commissions (paid + pending):', actualAllEarnings[0].actual_all_earnings);
  
  console.log('\n=== Issue Analysis ===');
  console.log('The affiliates.total_earnings field is outdated!');
  console.log('It should be updated to match actual commission data.');
  
  await connection.end();
}

checkAffiliatesTable().catch(console.error);