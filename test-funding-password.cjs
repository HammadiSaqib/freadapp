const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'creditrepair_db'
};

async function testFundingPassword() {
    console.log('🔍 Testing funding manager password...\n');
    
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        
        // Get the user's stored password hash
        const [rows] = await connection.execute(
            'SELECT id, email, password_hash FROM users WHERE email = ? AND role = ?',
            ['funding@creditrepairpro.com', 'funding_manager']
        );
        
        if (rows.length === 0) {
            console.log('❌ User not found');
            return;
        }
        
        const user = rows[0];
        console.log('User found:', user.email);
        console.log('Stored hash:', user.password_hash);
        
        // Test different passwords
        const testPasswords = ['funding123', 'password123', 'admin123', 'test123'];
        
        for (const password of testPasswords) {
            console.log(`\nTesting password: "${password}"`);
            const isValid = await bcrypt.compare(password, user.password_hash);
            console.log(`Result: ${isValid ? '✅ VALID' : '❌ Invalid'}`);
            
            if (isValid) {
                console.log(`\n🎉 Correct password found: "${password}"`);
                break;
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

testFundingPassword();