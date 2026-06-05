const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkContentTables() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
  });

  try {
    console.log('=== Checking Content Tables Structure ===\n');

    // Check what tables exist in the database
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('Available tables:');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`- ${tableName}`);
    });
    console.log('\n');

    // Check for content-related tables
    const contentTableNames = [
      'course_videos',
      'course_materials', 
      'course_quizzes',
      'course_modules',
      'videos',
      'materials',
      'quizzes',
      'modules'
    ];

    for (const tableName of contentTableNames) {
      try {
        console.log(`=== Checking ${tableName} table ===`);
        
        // Check if table exists and get structure
        const [structure] = await connection.execute(`DESCRIBE ${tableName}`);
        console.log(`${tableName} structure:`);
        structure.forEach(col => {
          console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
        });

        // Get sample data
        const [data] = await connection.execute(`SELECT * FROM ${tableName} LIMIT 3`);
        console.log(`${tableName} sample data (${data.length} records):`);
        if (data.length > 0) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log('  No data found');
        }
        console.log('\n');

      } catch (error) {
        console.log(`${tableName}: Table does not exist or error: ${error.message}\n`);
      }
    }

    // Test the actual queries used in the API
    console.log('=== Testing API Content Queries ===\n');

    try {
      const [videoStats] = await connection.execute(`
        SELECT COUNT(*) as total_videos 
        FROM course_videos
      `);
      console.log('Video stats:', videoStats[0]);
    } catch (error) {
      console.log('Video query error:', error.message);
    }

    try {
      const [materialStats] = await connection.execute(`
        SELECT COUNT(*) as total_materials 
        FROM course_materials
      `);
      console.log('Material stats:', materialStats[0]);
    } catch (error) {
      console.log('Material query error:', error.message);
    }

    try {
      const [quizStats] = await connection.execute(`
        SELECT COUNT(*) as total_quizzes,
               COALESCE(SUM(JSON_LENGTH(questions)), 0) as total_questions
        FROM course_quizzes
      `);
      console.log('Quiz stats:', quizStats[0]);
    } catch (error) {
      console.log('Quiz query error:', error.message);
    }

    try {
      const [moduleStats] = await connection.execute(`
        SELECT COUNT(*) as total_modules
        FROM course_modules
      `);
      console.log('Module stats:', moduleStats[0]);
    } catch (error) {
      console.log('Module query error:', error.message);
    }

  } catch (error) {
    console.error('Database connection error:', error);
  } finally {
    await connection.end();
  }
}

checkContentTables().catch(console.error);