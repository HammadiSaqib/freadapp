const jwt = require('jsonwebtoken');

console.log('🔍 Debugging JWT Secret Mismatch...\n');

// Check what JWT secrets are being used
const authControllerSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
console.log('AuthController JWT_SECRET:', authControllerSecret);

// Test token generation and verification with different secrets
const testUser = {
  id: 48,
  email: 'funding@creditrepairpro.com',
  role: 'funding_manager'
};

// Generate token with authController secret
const token = jwt.sign(testUser, authControllerSecret, { expiresIn: '24h' });
console.log('\nGenerated token with authController secret:', token.substring(0, 50) + '...');

// Try to verify with the same secret
try {
  const decoded = jwt.verify(token, authControllerSecret);
  console.log('✅ Token verification with authController secret: SUCCESS');
  console.log('Decoded:', decoded);
} catch (error) {
  console.log('❌ Token verification with authController secret: FAILED');
  console.log('Error:', error.message);
}

// Test with middleware secret (from authMiddleware.ts)
const middlewareSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
console.log('\nMiddleware JWT_SECRET:', middlewareSecret);

try {
  const decoded = jwt.verify(token, middlewareSecret);
  console.log('✅ Token verification with middleware secret: SUCCESS');
} catch (error) {
  console.log('❌ Token verification with middleware secret: FAILED');
  console.log('Error:', error.message);
}

// Check if there's a different secret being used
console.log('\nEnvironment variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length || 0);