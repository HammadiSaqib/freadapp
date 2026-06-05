const mysql = require('mysql2/promise');

async function addMissingColumns() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    console.log('Adding missing columns to courses table...');
    
    const alterQueries = [
      {
        name: 'duration_minutes',
        query: 'ALTER TABLE courses ADD COLUMN duration_minutes INT DEFAULT 0 AFTER duration_hours'
      },
      {
        name: 'currency',
        query: 'ALTER TABLE courses ADD COLUMN currency VARCHAR(10) DEFAULT "USD" AFTER price'
      },
      {
        name: 'language',
        query: 'ALTER TABLE courses ADD COLUMN language VARCHAR(50) DEFAULT "English" AFTER tags'
      },
      {
        name: 'certificate_enabled',
        query: 'ALTER TABLE courses ADD COLUMN certificate_enabled BOOLEAN DEFAULT FALSE AFTER language'
      },
      {
        name: 'max_enrollments',
        query: 'ALTER TABLE courses ADD COLUMN max_enrollments INT NULL AFTER certificate_enabled'
      },
      {
        name: 'enrollment_start_date',
        query: 'ALTER TABLE courses ADD COLUMN enrollment_start_date DATETIME NULL AFTER max_enrollments'
      },
      {
        name: 'enrollment_end_date',
        query: 'ALTER TABLE courses ADD COLUMN enrollment_end_date DATETIME NULL AFTER enrollment_start_date'
      },
      {
        name: 'course_start_date',
        query: 'ALTER TABLE courses ADD COLUMN course_start_date DATETIME NULL AFTER enrollment_end_date'
      },
      {
        name: 'course_end_date',
        query: 'ALTER TABLE courses ADD COLUMN course_end_date DATETIME NULL AFTER course_start_date'
      }
    ];
    
    for (const { name, query } of alterQueries) {
      try {
        console.log(`Adding ${name} column...`);
        await connection.execute(query);
        console.log(`✅ Added column: ${name}`);
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`⚠️  Column already exists: ${name}`);
        } else {
          console.error(`❌ Error adding column ${name}:`, error.message);
        }
      }
    }
    
    console.log('\n🎉 All missing columns have been processed!');
    
    // Verify the changes
    console.log('\nVerifying courses table structure...');
    const [columns] = await connection.execute('DESCRIBE courses');
    
    console.log('\nUpdated courses table columns:');
    columns.forEach(col => {
      console.log(`- ${col.Field} (${col.Type})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

addMissingColumns();