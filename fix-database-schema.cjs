const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixDatabaseSchema() {
    let connection;
    
    try {
        // Connect to MySQL
        connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST || 'localhost',
            port: process.env.MYSQL_PORT || 3306,
            user: process.env.MYSQL_USER || 'root',
            password: process.env.MYSQL_PASSWORD || '',
            database: process.env.MYSQL_DATABASE || 'creditrepair_db'
        });

        console.log('✅ Connected to MySQL database');

        // Check and fix credit_report_history table
        console.log('\n🔍 Checking credit_report_history table structure...');
        
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'credit_report_history'
            ORDER BY ORDINAL_POSITION
        `, [process.env.MYSQL_DATABASE]);

        console.log('Current columns:', columns.map(col => col.COLUMN_NAME));

        // Check for missing score columns
        const requiredColumns = ['experian_score', 'equifax_score', 'transunion_score'];
        const existingColumns = columns.map(col => col.COLUMN_NAME);
        const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

        if (missingColumns.length > 0) {
            console.log(`\n⚠️  Missing columns: ${missingColumns.join(', ')}`);
            
            for (const column of missingColumns) {
                console.log(`\n➕ Adding column: ${column}`);
                await connection.execute(`
                    ALTER TABLE credit_report_history 
                    ADD COLUMN ${column} int(11) DEFAULT NULL 
                    CHECK (${column} >= 300 AND ${column} <= 850)
                `);
                console.log(`✅ Added ${column} column`);
            }
        } else {
            console.log('✅ All required score columns exist');
        }

        // Check if groups table exists and has correct structure
        console.log('\n🔍 Checking groups table...');
        
        try {
            const [groupsCheck] = await connection.execute(`
                SELECT COUNT(*) as count FROM information_schema.tables 
                WHERE table_schema = ? AND table_name = 'groups'
            `, [process.env.MYSQL_DATABASE]);

            if (groupsCheck[0].count === 0) {
                console.log('⚠️  Groups table does not exist, creating it...');
                
                // Create groups table based on reference schema
                await connection.execute(`
                    CREATE TABLE \`groups\` (
                        \`id\` int(11) NOT NULL AUTO_INCREMENT,
                        \`name\` varchar(255) NOT NULL,
                        \`description\` text DEFAULT NULL,
                        \`created_by\` int(11) NOT NULL,
                        \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
                        \`created_at\` datetime NOT NULL DEFAULT current_timestamp(),
                        \`updated_at\` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
                        PRIMARY KEY (\`id\`),
                        KEY \`idx_created_by\` (\`created_by\`),
                        KEY \`idx_is_active\` (\`is_active\`)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                `);
                console.log('✅ Created groups table');
            } else {
                console.log('✅ Groups table exists');
            }
        } catch (error) {
            console.error('❌ Error checking/creating groups table:', error.message);
        }

        // Test a simple query on each problematic table
        console.log('\n🧪 Testing database queries...');
        
        try {
            const [activities] = await connection.execute('SELECT COUNT(*) as count FROM activities LIMIT 1');
            console.log(`✅ Activities table: ${activities[0].count} records`);
        } catch (error) {
            console.error('❌ Activities table error:', error.message);
        }

        try {
            const [creditHistory] = await connection.execute('SELECT COUNT(*) as count FROM credit_report_history LIMIT 1');
            console.log(`✅ Credit report history table: ${creditHistory[0].count} records`);
        } catch (error) {
            console.error('❌ Credit report history table error:', error.message);
        }

        try {
            const [groups] = await connection.execute('SELECT COUNT(*) as count FROM `groups` LIMIT 1');
            console.log(`✅ Groups table: ${groups[0].count} records`);
        } catch (error) {
            console.error('❌ Groups table error:', error.message);
        }

        console.log('\n✅ Database schema check completed!');

    } catch (error) {
        console.error('❌ Database connection error:', error);
        console.error('Connection details:', {
            host: process.env.MYSQL_HOST,
            port: process.env.MYSQL_PORT,
            user: process.env.MYSQL_USER,
            database: process.env.MYSQL_DATABASE
        });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the fix
fixDatabaseSchema().catch(console.error);