const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import the email service from the server
const { createTransport } = require('nodemailer');

console.log('=== DEBUGGING SERVER EMAIL SERVICE ===');

// Test the exact configuration used by the server
const config = {
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT || '587', 10),
  EMAIL_SECURE: process.env.EMAIL_SECURE === 'true',
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || '',
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'Score Machine',
  EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER || '',
};

console.log('=== SERVER EMAIL CONFIG ===');
console.log('EMAIL_HOST:', config.EMAIL_HOST);
console.log('EMAIL_PORT:', config.EMAIL_PORT);
console.log('EMAIL_SECURE:', config.EMAIL_SECURE);
console.log('EMAIL_USER:', config.EMAIL_USER);
console.log('EMAIL_PASSWORD:', config.EMAIL_PASSWORD ? '***HIDDEN***' : 'NOT SET');
console.log('EMAIL_FROM_NAME:', config.EMAIL_FROM_NAME);
console.log('EMAIL_FROM_ADDRESS:', config.EMAIL_FROM_ADDRESS);

// Create transporter using the same configuration as the server
const transporter = createTransport({
  host: config.EMAIL_HOST,
  port: config.EMAIL_PORT,
  secure: config.EMAIL_SECURE,
  auth: {
    user: config.EMAIL_USER,
    pass: config.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false
  }
});

console.log('\n=== TESTING SERVER EMAIL CONFIGURATION ===');

async function testServerEmailConfig() {
  try {
    console.log('Testing connection...');
    await transporter.verify();
    console.log('✅ Server email configuration test successful');
    
    // Test sending an email
    console.log('Testing email send...');
    const result = await transporter.sendMail({
      from: `"${config.EMAIL_FROM_NAME}" <${config.EMAIL_FROM_ADDRESS}>`,
      to: config.EMAIL_USER, // Send to self for testing
      subject: 'Server Email Configuration Test',
      html: '<h1>Server Email Test</h1><p>This email was sent using the server configuration.</p>',
      text: 'Server Email Test - This email was sent using the server configuration.'
    });
    
    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    
  } catch (error) {
    console.error('❌ Server email configuration test failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error command:', error.command);
  }
}

testServerEmailConfig();