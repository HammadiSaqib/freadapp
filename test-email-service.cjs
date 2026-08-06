const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmailService() {
  console.log('🧪 Testing Email Service Configuration...\n');
  
  // Create transporter with the same configuration as the app
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

  try {
    // Test 1: Verify connection
    console.log('1. Testing email service connection...');
    await transporter.verify();
    console.log('✅ Email service connection verified successfully\n');

    // Test 2: Send a test email
    console.log('2. Sending test email...');
    const testEmail = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Score Machine'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Send to self for testing
      subject: 'Test Email - Score Machine Email Service',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Email Service Test</h2>
          <p>This is a test email to verify that the email service is working correctly.</p>
          <p><strong>Configuration Details:</strong></p>
          <ul>
            <li>Service: Gmail SMTP</li>
            <li>From: ${process.env.EMAIL_FROM_ADDRESS}</li>
            <li>Timestamp: ${new Date().toISOString()}</li>
          </ul>
          <p style="color: #16a34a;">✅ If you received this email, the service is working properly!</p>
        </div>
      `,
      text: `
        Email Service Test
        
        This is a test email to verify that the email service is working correctly.
        
        Configuration Details:
        - Service: Gmail SMTP
        - From: ${process.env.EMAIL_FROM_ADDRESS}
        - Timestamp: ${new Date().toISOString()}
        
        ✅ If you received this email, the service is working properly!
      `
    };

    const result = await transporter.sendMail(testEmail);
    console.log('✅ Test email sent successfully!');
    console.log(`📧 Message ID: ${result.messageId}`);
    console.log(`📬 Sent to: ${testEmail.to}\n`);

    // Test 3: Test verification code email template
    console.log('3. Testing verification code email template...');
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    const verificationEmail = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Score Machine'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: 'Email Verification Code - Score Machine',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">Score Machine</h1>
            <p style="color: #6b7280; margin: 5px 0;">Affiliate Registration</p>
          </div>
          
          <div style="background: #f8fafc; border-radius: 8px; padding: 30px; text-align: center;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Verify Your Email Address</h2>
            <p style="color: #4b5563; margin-bottom: 30px;">
              Thank you for registering as an affiliate! Please use the verification code below to complete your registration:
            </p>
            
            <div style="background: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <div style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 4px;">
                ${verificationCode}
              </div>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              This code will expire in 15 minutes. If you didn't request this verification, please ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px;">
              © 2024 Score Machine. All rights reserved.
            </p>
          </div>
        </div>
      `,
      text: `
        Score Machine - Email Verification
        
        Thank you for registering as an affiliate!
        
        Your verification code is: ${verificationCode}
        
        This code will expire in 15 minutes.
        
        If you didn't request this verification, please ignore this email.
      `
    };

    const verificationResult = await transporter.sendMail(verificationEmail);
    console.log('✅ Verification code email sent successfully!');
    console.log(`📧 Message ID: ${verificationResult.messageId}`);
    console.log(`🔢 Verification Code: ${verificationCode}\n`);

    console.log('🎉 All email service tests passed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Email service connection: ✅ Working');
    console.log('- Test email sending: ✅ Working');
    console.log('- Verification email template: ✅ Working');
    console.log('\n💡 The email service is ready for use in the application.');

  } catch (error) {
    console.error('❌ Email service test failed:', error);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Check if Gmail credentials are correct in .env file');
    console.log('2. Ensure Gmail account has "App Passwords" enabled');
    console.log('3. Verify that the app password is correct (not the regular Gmail password)');
    console.log('4. Check if 2-factor authentication is enabled on the Gmail account');
  }
}

testEmailService().catch(console.error);