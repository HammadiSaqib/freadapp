const jwt = require('jsonwebtoken');
const fs = require('fs');

// This script helps debug the current user's token
// You need to manually copy the token from browser localStorage and paste it here

console.log('=== Current User Token Checker ===\n');

// Instructions for getting the token
console.log('To check your current user token:');
console.log('1. Open browser developer tools (F12)');
console.log('2. Go to Application/Storage tab');
console.log('3. Find localStorage');
console.log('4. Copy the value of "auth_token"');
console.log('5. Paste it below when prompted\n');

// For now, let's try to read from a token file if it exists
try {
  if (fs.existsSync('current-token.txt')) {
    const token = fs.readFileSync('current-token.txt', 'utf8').trim();
    console.log('Found token in current-token.txt file');
    
    if (token) {
      try {
        // Decode without verification to see the payload
        const decoded = jwt.decode(token);
        console.log('Token payload:');
        console.log(JSON.stringify(decoded, null, 2));
        
        if (decoded.role) {
          console.log(`\nUser Role: ${decoded.role}`);
          console.log(`Required Role for banks: funding_manager or admin`);
          console.log(`Access Allowed: ${decoded.role === 'funding_manager' || decoded.role === 'admin' ? 'YES' : 'NO'}`);
        }
      } catch (error) {
        console.log('Error decoding token:', error.message);
      }
    } else {
      console.log('Token file is empty');
    }
  } else {
    console.log('No current-token.txt file found.');
    console.log('Create a file called "current-token.txt" and paste your auth_token from localStorage into it.');
  }
} catch (error) {
  console.log('Error reading token file:', error.message);
}