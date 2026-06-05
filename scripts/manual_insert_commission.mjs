import { initializeMySQLPool, executeQuery, closeMySQLPool } from "../dist/database/mysqlConfig.js";

function mapStatus(status) {
  const norm = (status || "").toLowerCase();
  if (["approved", "paid", "completed", "success"].includes(norm)) return "approved";
  if (["pending", "awaiting", "open"].includes(norm)) return "pending";
  if (["rejected", "failed", "declined", "cancelled", "canceled"].includes(norm)) return "rejected";
  return "pending";
}

async function run() {
  await initializeMySQLPool();
  try {
    const sampleRows = await executeQuery(
      `SELECT ar.id AS referral_id,
              ar.affiliate_id,
              ar.referred_user_id AS customer_id,
              ar.commission_amount,
              ar.commission_rate,
              ar.status,
              u.first_name,
              u.last_name,
              u.email
       FROM affiliate_referrals ar
       JOIN users u ON u.id = ar.referred_user_id
       WHERE ar.commission_amount > 0
       ORDER BY ar.id DESC
       LIMIT 1`
    );

    const row = sampleRows?.[0];
    if (!row) {
      console.log("No referral with commission_amount > 0 found.");
      return;
    }
    console.log("Sample referral:", row);

    const customerName = [row.first_name, row.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || `User ${row.customer_id}`;
    const orderValue = row.commission_rate
      ? Number(row.commission_amount) / (Number(row.commission_rate) / 100)
      : Number(row.commission_amount);
    const email = row.email || "unknown@example.com";
    const status = mapStatus(row.status);

    try {
      const insertRes = await executeQuery(
        `INSERT INTO affiliate_commissions (
            affiliate_id,
            referral_id,
            customer_id,
            customer_name,
            customer_email,
            order_value,
            commission_rate,
            commission_amount,
            status,
            tier,
            product,
            order_date,
            approval_date,
            payment_date,
            notes,
            tracking_code,
            commission_type,
            created_at,
            updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Bronze', 'Subscription', NOW(), NULL, NULL, NULL, NULL, 'signup', NOW(), NOW())`,
        [
          row.affiliate_id,
          row.referral_id,
          row.customer_id,
          customerName,
          email,
          orderValue,
          Number(row.commission_rate || 0),
          Number(row.commission_amount),
          status,
        ]
      );
      console.log("Insert result:", insertRes);
    } catch (e) {
      console.error("Insert error:", e);
    }

    const verify = await executeQuery(
      "SELECT COUNT(*) AS total, COALESCE(SUM(commission_amount), 0) AS sum_amount FROM affiliate_commissions"
    );
    console.log("verify:", verify);
  } finally {
    await closeMySQLPool();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});