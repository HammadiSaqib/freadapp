const mysql = require('mysql2/promise');

async function checkPendingCommission() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });
  
  console.log('=== Checking Pending Commission Details ===');
  
  // Get affiliate ID for a@gmail.com
  const [affiliates] = await connection.execute('SELECT id, email FROM affiliates WHERE email = ?', ['a@gmail.com']);
  const affiliate = affiliates[0];
  console.log('Affiliate data:', affiliate);
  
  if (!affiliate) {
    console.log('Affiliate not found');
    await connection.end();
    return;
  }
  
  const affiliateId = affiliate.id;
  
  // Get the pending commission details
  console.log('\n=== Pending Commission Details ===');
  const [pendingCommissions] = await connection.execute(`
    SELECT ac.id, ac.affiliate_id, ac.referral_id, ac.commission_amount, ac.status, ac.created_at,
           ar.referred_user_id, ar.status as referral_status
    FROM affiliate_commissions ac
    LEFT JOIN affiliate_referrals ar ON ac.referral_id = ar.id
    WHERE ac.affiliate_id = ? AND ac.status = 'pending'
    ORDER BY ac.created_at DESC
  `, [affiliateId]);
  
  console.log('Pending commissions:');
  pendingCommissions.forEach((comm, index) => {
    console.log(`${index + 1}. Commission ID: ${comm.id}`);
    console.log(`   Referral ID: ${comm.referral_id}`);
    console.log(`   Amount: $${comm.commission_amount}`);
    console.log(`   Status: ${comm.status}`);
    console.log(`   Created: ${comm.created_at}`);
    console.log(`   Referred User ID: ${comm.referred_user_id}`);
    console.log(`   Referral Status: ${comm.referral_status}`);
    console.log('');
  });
  
  // Check if there's a referral record for this pending commission
  if (pendingCommissions.length > 0) {
    const pendingComm = pendingCommissions[0];
    console.log('=== Checking Referral Record ===');
    
    const [referralDetails] = await connection.execute(`
      SELECT ar.*, u.email as referred_user_email, u.created_at as user_created_at
      FROM affiliate_referrals ar
      LEFT JOIN users u ON ar.referred_user_id = u.id
      WHERE ar.id = ?
    `, [pendingComm.referral_id]);
    
    if (referralDetails.length > 0) {
      const referral = referralDetails[0];
      console.log('Referral details:');
      console.log(`   ID: ${referral.id}`);
      console.log(`   Affiliate ID: ${referral.affiliate_id}`);
      console.log(`   Referred User ID: ${referral.referred_user_id}`);
      console.log(`   Actual User Email: ${referral.referred_user_email}`);
      console.log(`   Status: ${referral.status}`);
      console.log(`   Commission Amount: $${referral.commission_amount}`);
      console.log(`   Created: ${referral.created_at}`);
      console.log(`   User Created: ${referral.user_created_at}`);
    }
  }
  
  await connection.end();
}

checkPendingCommission().catch(console.error);