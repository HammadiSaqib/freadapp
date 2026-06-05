const { executeQuery } = require('./database/mysqlConfig.ts');

async function checkCommissionRates() {
  try {
    console.log('=== Checking affiliate commission rates ===');
    const affiliates = await executeQuery('SELECT id, email, commission_rate, parent_commission_rate, status FROM affiliates ORDER BY id');
    
    console.log('Affiliates with commission rates:');
    affiliates.forEach(a => {
      console.log(`ID: ${a.id}, Email: ${a.email}, Rate: ${a.commission_rate}%, Parent Rate: ${a.parent_commission_rate}%, Status: ${a.status}`);
    });
    
    console.log('\n=== Checking affiliate_referrals with zero commissions ===');
    const zeroCommissions = await executeQuery('SELECT * FROM affiliate_referrals WHERE commission_amount = 0 OR commission_rate = 0 LIMIT 10');
    
    console.log(`Found ${zeroCommissions.length} referrals with zero commission amounts or rates:`);
    zeroCommissions.forEach(r => {
      console.log(`ID: ${r.id}, Affiliate: ${r.affiliate_id}, Amount: ${r.purchase_amount}, Commission: ${r.commission_amount}, Rate: ${r.commission_rate}%`);
    });
    
    console.log('\n=== Checking recent affiliate_referrals ===');
    const recentReferrals = await executeQuery('SELECT * FROM affiliate_referrals ORDER BY created_at DESC LIMIT 5');
    
    console.log(`Recent referrals:`);
    recentReferrals.forEach(r => {
      console.log(`ID: ${r.id}, Affiliate: ${r.affiliate_id}, User: ${r.referred_user_id}, Amount: ${r.purchase_amount}, Commission: ${r.commission_amount}, Rate: ${r.commission_rate}%, Status: ${r.status}, Date: ${r.created_at}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCommissionRates();