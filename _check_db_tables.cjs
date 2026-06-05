const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({ host: 'localhost', user: 'root', password: '', database: 'creditrepair_db' });
  
  const tables = ['support_letter_categories', 'dispute_letter_history', 'dispute_letter_content'];
  for (const t of tables) {
    const [r] = await c.query('SHOW TABLES LIKE ?', [t]);
    console.log(`${t}: ${r.length ? 'EXISTS' : 'MISSING'}`);
  }

  try {
    const [rows] = await c.query('SELECT * FROM support_letter_categories');
    console.log('Categories:', JSON.stringify(rows));
  } catch (e) { console.log('No support_letter_categories table'); }

  try {
    const [rows] = await c.query('SELECT DISTINCT category, bureau, round, type FROM dispute_letter_content LIMIT 20');
    console.log('Content combos:', JSON.stringify(rows));
  } catch (e) { console.log('No dispute_letter_content table'); }

  await c.end();
})();
