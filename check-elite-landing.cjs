const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'creditrepair_db',
  });

  const [cols] = await conn.query(
    "SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'affiliates' AND COLUMN_NAME = 'elite_landing_page'"
  );
  console.log('elite_landing_page column:', cols);

  const [rows] = await conn.query(
    "SELECT id, email, first_name, last_name, referral_slug, status, elite_landing_page FROM affiliates WHERE referral_slug = ? OR email = ? LIMIT 5",
    ['bellasloanacademy', 'bellasloanacademy']
  );
  console.log('affiliate rows:', rows);

  await conn.end();
})().catch((err) => {
  console.error('check failed:', err);
  process.exit(1);
});
