const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'creditrepair.db');
const db = new sqlite3.Database(dbPath);

// First check what tables exist
db.all('SELECT name FROM sqlite_master WHERE type="table"', (err, tables) => {
  if (err) {
    console.error('Error getting tables:', err);
    db.close();
    return;
  }
  
  console.log('Available tables:', tables.map(t => t.name));
  
  // Check if subscription_plans exists
  const hasSubscriptionPlans = tables.some(t => t.name === 'subscription_plans');
  
  if (hasSubscriptionPlans) {
    db.all('SELECT name, page_permissions FROM subscription_plans WHERE name = "Professional"', (err, plans) => {
      if (err) {
        console.error('Error querying plans:', err);
      } else {
        console.log('Professional plan:', JSON.stringify(plans, null, 2));
      }
      db.close();
    });
  } else {
    console.log('subscription_plans table does not exist');
    db.close();
  }
});