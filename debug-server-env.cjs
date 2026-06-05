const path = require('path');
const fs = require('fs');

console.log('=== DEBUGGING SERVER ENVIRONMENT VARIABLES ===');

// Check if .env file exists in server directory
const serverEnvPath = path.join(__dirname, 'server', '.env');
const rootEnvPath = path.join(__dirname, '.env');

console.log('Server .env path:', serverEnvPath);
console.log('Root .env path:', rootEnvPath);

console.log('Server .env exists:', fs.existsSync(serverEnvPath));
console.log('Root .env exists:', fs.existsSync(rootEnvPath));

// Load environment variables from root
require('dotenv').config({ path: rootEnvPath });

console.log('\n=== ENVIRONMENT VARIABLES ===');
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***HIDDEN***' : 'NOT SET');
console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
console.log('EMAIL_FROM_NAME:', process.env.EMAIL_FROM_NAME);
console.log('EMAIL_FROM_ADDRESS:', process.env.EMAIL_FROM_ADDRESS);

// Test nodemailer configuration
console.log('\n=== TESTING NODEMAILER CONFIGURATION ===');
const nodemailer = require('nodemailer');

try {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  console.log('✅ Transporter created successfully');
  console.log('Auth user:', transporter.options.auth?.user);
  console.log('Auth pass:', transporter.options.auth?.pass ? '***HIDDEN***' : 'NOT SET');

  // Test connection
  transporter.verify((error, success) => {
    if (error) {
      console.log('❌ Connection test failed:', error.message);
    } else {
      console.log('✅ Connection test successful');
    }
  });

} catch (error) {
  console.error('❌ Error creating transporter:', error.message);
}