const jwt = require('jsonwebtoken');
const token = process.argv[2];
if (!token) {
  console.log('Please provide a token as argument');
  process.exit(1);
}
try {
  const decoded = jwt.decode(token);
  console.log('Token payload:', JSON.stringify(decoded, null, 2));
} catch (error) {
  console.error('Error decoding token:', error.message);
}
