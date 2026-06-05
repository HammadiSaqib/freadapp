const jwt = require('jsonwebtoken');
const crypto = require('crypto');

console.log('🔍 Debugging Server JWT Secret...\n');

// Simulate the server's JWT secret generation logic
function generateSecureJWTSecret() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be explicitly set in production');
  }
  
  console.warn('⚠️  Generating temporary JWT secret for development');
  return crypto.randomBytes(64).toString('hex');
}

// This is what the server uses
const serverJWTSecret = process.env.JWT_SECRET || generateSecureJWTSecret();
console.log('Server JWT_SECRET (first 20 chars):', serverJWTSecret.substring(0, 20) + '...');
console.log('Server JWT_SECRET length:', serverJWTSecret.length);

// Generate a token like the server does
const testUser = {
  id: 48,
  email: 'funding@creditrepairpro.com',
  role: 'funding_manager'
};

const serverToken = jwt.sign(testUser, serverJWTSecret, { expiresIn: '24h' });
console.log('\nServer-generated token:', serverToken.substring(0, 50) + '...');

// Test verification with different secrets
console.log('\n--- Testing Token Verification ---');

// 1. With server secret
try {
  const decoded = jwt.verify(serverToken, serverJWTSecret);
  console.log('✅ Verification with server secret: SUCCESS');
} catch (error) {
  console.log('❌ Verification with server secret: FAILED -', error.message);
}

// 2. With hardcoded fallback
const fallbackSecret = 'your-secret-key-change-in-production';
try {
  const decoded = jwt.verify(serverToken, fallbackSecret);
  console.log('✅ Verification with fallback secret: SUCCESS');
} catch (error) {
  console.log('❌ Verification with fallback secret: FAILED -', error.message);
}

// Now test with a token generated using the fallback secret
const fallbackToken = jwt.sign(testUser, fallbackSecret, { expiresIn: '24h' });
console.log('\nFallback-generated token:', fallbackToken.substring(0, 50) + '...');

try {
  const decoded = jwt.verify(fallbackToken, serverJWTSecret);
  console.log('✅ Fallback token verified with server secret: SUCCESS');
} catch (error) {
  console.log('❌ Fallback token verified with server secret: FAILED -', error.message);
}

console.log('\n--- Summary ---');
console.log('Server and fallback secrets match:', serverJWTSecret === fallbackSecret);