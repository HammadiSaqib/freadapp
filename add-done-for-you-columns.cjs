const mysql = require('mysql2/promise');

async function addDoneForYouColumns() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    console.log('Adding Done for You form columns to funding_requests table...');

    // Add all the Done for You form columns
    const alterTableQuery = `
      ALTER TABLE funding_requests 
      ADD COLUMN IF NOT EXISTS funding_type ENUM('done-for-you', 'diy') DEFAULT NULL AFTER purpose,
      ADD COLUMN IF NOT EXISTS title_position VARCHAR(255) DEFAULT NULL AFTER funding_type,
      ADD COLUMN IF NOT EXISTS intended_use TEXT DEFAULT NULL AFTER title_position,
      ADD COLUMN IF NOT EXISTS business_name VARCHAR(255) DEFAULT NULL AFTER intended_use,
      ADD COLUMN IF NOT EXISTS business_phone VARCHAR(20) DEFAULT NULL AFTER business_name,
      ADD COLUMN IF NOT EXISTS business_email VARCHAR(255) DEFAULT NULL AFTER business_phone,
      ADD COLUMN IF NOT EXISTS business_address TEXT DEFAULT NULL AFTER business_email,
      ADD COLUMN IF NOT EXISTS business_city VARCHAR(100) DEFAULT NULL AFTER business_address,
      ADD COLUMN IF NOT EXISTS business_state VARCHAR(50) DEFAULT NULL AFTER business_city,
      ADD COLUMN IF NOT EXISTS business_zip VARCHAR(10) DEFAULT NULL AFTER business_state,
      ADD COLUMN IF NOT EXISTS date_commenced DATE DEFAULT NULL AFTER business_zip,
      ADD COLUMN IF NOT EXISTS business_website VARCHAR(255) DEFAULT NULL AFTER date_commenced,
      ADD COLUMN IF NOT EXISTS business_industry VARCHAR(100) DEFAULT NULL AFTER business_website,
      ADD COLUMN IF NOT EXISTS entity_type ENUM('LLC', 'Corporation', 'Partnership', 'Sole Proprietorship') DEFAULT NULL AFTER business_industry,
      ADD COLUMN IF NOT EXISTS incorporation_state VARCHAR(50) DEFAULT NULL AFTER entity_type,
      ADD COLUMN IF NOT EXISTS number_of_employees INT DEFAULT NULL AFTER incorporation_state,
      ADD COLUMN IF NOT EXISTS ein VARCHAR(20) DEFAULT NULL AFTER number_of_employees,
      ADD COLUMN IF NOT EXISTS monthly_gross_sales DECIMAL(12, 2) DEFAULT NULL AFTER ein,
      ADD COLUMN IF NOT EXISTS projected_annual_revenue DECIMAL(12, 2) DEFAULT NULL AFTER monthly_gross_sales,
      
      -- Personal Information
      ADD COLUMN IF NOT EXISTS first_name VARCHAR(100) DEFAULT NULL AFTER projected_annual_revenue,
      ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100) DEFAULT NULL AFTER first_name,
      ADD COLUMN IF NOT EXISTS last_name VARCHAR(100) DEFAULT NULL AFTER middle_name,
      ADD COLUMN IF NOT EXISTS date_of_birth DATE DEFAULT NULL AFTER last_name,
      ADD COLUMN IF NOT EXISTS birth_city VARCHAR(100) DEFAULT NULL AFTER date_of_birth,
      ADD COLUMN IF NOT EXISTS ssn VARCHAR(20) DEFAULT NULL AFTER birth_city,
      ADD COLUMN IF NOT EXISTS mothers_maiden_name VARCHAR(100) DEFAULT NULL AFTER ssn,
      ADD COLUMN IF NOT EXISTS home_address TEXT DEFAULT NULL AFTER mothers_maiden_name,
      ADD COLUMN IF NOT EXISTS personal_city VARCHAR(100) DEFAULT NULL AFTER home_address,
      ADD COLUMN IF NOT EXISTS personal_state VARCHAR(50) DEFAULT NULL AFTER personal_city,
      ADD COLUMN IF NOT EXISTS personal_zip VARCHAR(10) DEFAULT NULL AFTER personal_state,
      ADD COLUMN IF NOT EXISTS home_phone VARCHAR(20) DEFAULT NULL AFTER personal_zip,
      ADD COLUMN IF NOT EXISTS mobile_phone VARCHAR(20) DEFAULT NULL AFTER home_phone,
      ADD COLUMN IF NOT EXISTS housing_status ENUM('rent', 'own', 'other') DEFAULT NULL AFTER mobile_phone,
      ADD COLUMN IF NOT EXISTS monthly_housing_payment DECIMAL(10, 2) DEFAULT NULL AFTER housing_status,
      ADD COLUMN IF NOT EXISTS years_at_address DECIMAL(4, 2) DEFAULT NULL AFTER monthly_housing_payment,
      ADD COLUMN IF NOT EXISTS drivers_license VARCHAR(50) DEFAULT NULL AFTER years_at_address,
      ADD COLUMN IF NOT EXISTS issuing_state VARCHAR(50) DEFAULT NULL AFTER drivers_license,
      ADD COLUMN IF NOT EXISTS issue_date DATE DEFAULT NULL AFTER issuing_state,
      ADD COLUMN IF NOT EXISTS expiration_date DATE DEFAULT NULL AFTER issue_date,
      
      -- Employment Information
      ADD COLUMN IF NOT EXISTS current_employer VARCHAR(255) DEFAULT NULL AFTER expiration_date,
      ADD COLUMN IF NOT EXISTS position VARCHAR(100) DEFAULT NULL AFTER current_employer,
      ADD COLUMN IF NOT EXISTS years_at_employer DECIMAL(4, 2) DEFAULT NULL AFTER position,
      ADD COLUMN IF NOT EXISTS employer_phone VARCHAR(20) DEFAULT NULL AFTER years_at_employer,
      ADD COLUMN IF NOT EXISTS employer_address TEXT DEFAULT NULL AFTER employer_phone,
      
      -- Financial Information
      ADD COLUMN IF NOT EXISTS personal_bank_name VARCHAR(100) DEFAULT NULL AFTER employer_address,
      ADD COLUMN IF NOT EXISTS personal_bank_balance DECIMAL(12, 2) DEFAULT NULL AFTER personal_bank_name,
      ADD COLUMN IF NOT EXISTS business_bank_name VARCHAR(100) DEFAULT NULL AFTER personal_bank_balance,
      ADD COLUMN IF NOT EXISTS business_bank_balance DECIMAL(12, 2) DEFAULT NULL AFTER business_bank_name,
      ADD COLUMN IF NOT EXISTS us_citizen ENUM('yes', 'no') DEFAULT NULL AFTER business_bank_balance,
      ADD COLUMN IF NOT EXISTS savings_account ENUM('yes', 'no') DEFAULT NULL AFTER us_citizen,
      ADD COLUMN IF NOT EXISTS investment_accounts ENUM('yes', 'no') DEFAULT NULL AFTER savings_account,
      ADD COLUMN IF NOT EXISTS military_affiliation ENUM('yes', 'no') DEFAULT NULL AFTER investment_accounts,
      ADD COLUMN IF NOT EXISTS other_income ENUM('yes', 'no') DEFAULT NULL AFTER military_affiliation,
      ADD COLUMN IF NOT EXISTS other_assets ENUM('yes', 'no') DEFAULT NULL AFTER other_income,
      ADD COLUMN IF NOT EXISTS banks_to_ignore JSON DEFAULT NULL AFTER other_assets;
    `;

    await connection.execute(alterTableQuery);
    console.log('✅ Successfully added Done for You form columns to funding_requests table');

    // Check the updated table structure
    const [columns] = await connection.execute('DESCRIBE funding_requests');
    console.log('\n📋 Updated table structure:');
    columns.forEach((column, index) => {
      console.log(`${index + 1}. ${column.Field} - ${column.Type} ${column.Null === 'YES' ? '(nullable)' : '(required)'}`);
    });

    console.log('\n✨ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Error adding columns:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run the migration
addDoneForYouColumns().catch(console.error);