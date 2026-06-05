// Script to verify credit report formatter functionality
import fs from 'fs';

// Import formatter functions directly
const { formatCreditScore, formatAccountCount, formatCurrency } = await import('./client/utils/creditReportFormatter.js');

// Test cases for formatCreditScore
function testFormatCreditScore() {
  console.log('\n=== Testing formatCreditScore ===');
  const testCases = [
    { input: 650, expected: '650' },
    { input: '720', expected: '720' },
    { input: null, expected: 'N/A' },
    { input: undefined, expected: 'N/A' },
    { input: '', expected: 'N/A' },
    { input: 'invalid', expected: 'N/A' }
  ];
  
  testCases.forEach(test => {
    const result = formatCreditScore(test.input);
    const passed = result === test.expected;
    console.log(`Input: ${JSON.stringify(test.input)}, Result: ${result}, Expected: ${test.expected}, ${passed ? 'PASSED' : 'FAILED'}`);
  });
}

// Test cases for formatAccountCount
function testFormatAccountCount() {
  console.log('\n=== Testing formatAccountCount ===');
  const testCases = [
    { input: 5, expected: '5' },
    { input: '10', expected: '10' },
    { input: null, expected: 'N/A' },
    { input: undefined, expected: 'N/A' },
    { input: '', expected: 'N/A' },
    { input: 'invalid', expected: 'N/A' }
  ];
  
  testCases.forEach(test => {
    const result = formatAccountCount(test.input);
    const passed = result === test.expected;
    console.log(`Input: ${JSON.stringify(test.input)}, Result: ${result}, Expected: ${test.expected}, ${passed ? 'PASSED' : 'FAILED'}`);
  });
}

// Test cases for formatCurrency
function testFormatCurrency() {
  console.log('\n=== Testing formatCurrency ===');
  const testCases = [
    { input: 1000, expected: '$1,000' },
    { input: '2500', expected: '$2,500' },
    { input: null, expected: 'N/A' },
    { input: undefined, expected: 'N/A' },
    { input: '', expected: 'N/A' },
    { input: 'invalid', expected: 'N/A' }
  ];
  
  testCases.forEach(test => {
    const result = formatCurrency(test.input);
    const passed = result === test.expected;
    console.log(`Input: ${JSON.stringify(test.input)}, Result: ${result}, Expected: ${test.expected}, ${passed ? 'PASSED' : 'FAILED'}`);
  });
}

// Main function to run all tests
async function main() {
  try {
    console.log('Credit Report Formatter Verification');
    console.log('==================================');
    
    // Run tests for each formatter function
    testFormatCreditScore();
    testFormatAccountCount();
    testFormatCurrency();
    
    console.log('\n==================================');
    console.log('Verification complete!');
  } catch (error) {
    console.error('Error during verification:', error);
  }
}

// Run the verification
main();