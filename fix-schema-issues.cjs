const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixSchemaIssues() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'creditrepair_db'
    });

    console.log('🔧 Fixing remaining schema issues...');

    // Add missing price column to courses table
    try {
      const [priceColumn] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'courses' AND COLUMN_NAME = 'price'
      `, [process.env.MYSQL_DATABASE || 'creditrepair_db']);

      if (priceColumn.length === 0) {
        await connection.execute(`ALTER TABLE courses ADD COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0.00`);
        console.log('✅ Added price column to courses table');
      } else {
        console.log('⏭️  Price column already exists');
      }
    } catch (error) {
      console.error('❌ Error adding price column:', error.message);
    }

    // Check if courses table has 'category' column and rename it to match the queries
    try {
      const [categoryColumn] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'courses' AND COLUMN_NAME = 'category'
      `, [process.env.MYSQL_DATABASE || 'creditrepair_db']);

      if (categoryColumn.length > 0) {
        // If 'category' column exists, we need to handle the data migration
        console.log('📝 Found existing category column, migrating data...');
        
        // First, ensure category_id column exists
        const [categoryIdColumn] = await connection.execute(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'courses' AND COLUMN_NAME = 'category_id'
        `, [process.env.MYSQL_DATABASE || 'creditrepair_db']);

        if (categoryIdColumn.length === 0) {
          await connection.execute(`ALTER TABLE courses ADD COLUMN category_id INT NULL`);
          console.log('✅ Added category_id column');
        }

        // Migrate data from category name to category_id
        await connection.execute(`
          UPDATE courses c 
          SET category_id = (
            SELECT cc.id 
            FROM course_categories cc 
            WHERE cc.name = c.category
          )
          WHERE c.category IS NOT NULL
        `);
        console.log('✅ Migrated category data to category_id');

        // Drop the old category column
        await connection.execute(`ALTER TABLE courses DROP COLUMN category`);
        console.log('✅ Removed old category column');
      } else {
        console.log('⏭️  No category column to migrate');
      }
    } catch (error) {
      console.error('❌ Error handling category column:', error.message);
    }

    // Add additional missing columns that might be referenced in queries
    const additionalColumns = [
      {
        name: 'created_by',
        definition: 'INT NULL'
      },
      {
        name: 'updated_by', 
        definition: 'INT NULL'
      },
      {
        name: 'published_at',
        definition: 'DATETIME NULL'
      },
      {
        name: 'archived_at',
        definition: 'DATETIME NULL'
      }
    ];

    for (const column of additionalColumns) {
      try {
        const [rows] = await connection.execute(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'courses' AND COLUMN_NAME = ?
        `, [process.env.MYSQL_DATABASE || 'creditrepair_db', column.name]);

        if (rows.length === 0) {
          await connection.execute(`ALTER TABLE courses ADD COLUMN ${column.name} ${column.definition}`);
          console.log(`✅ Added column: ${column.name}`);
        } else {
          console.log(`⏭️  Column already exists: ${column.name}`);
        }
      } catch (error) {
        console.error(`❌ Error adding column ${column.name}:`, error.message);
      }
    }

    // Update course_categories table to ensure course_count is properly calculated
    try {
      await connection.execute(`
        UPDATE course_categories cc 
        SET course_count = (
          SELECT COUNT(*) 
          FROM courses c 
          WHERE c.category_id = cc.id
        )
      `);
      console.log('✅ Updated course counts in categories');
    } catch (error) {
      console.error('❌ Error updating course counts:', error.message);
    }

    console.log('✅ Schema issues fixed successfully');

  } catch (error) {
    console.error('❌ Error fixing schema issues:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the function
fixSchemaIssues()
  .then(() => {
    console.log('🎉 Schema fixes completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed to fix schema issues:', error);
    process.exit(1);
  });