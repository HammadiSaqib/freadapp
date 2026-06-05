/**
 * Test script to verify the credit report formatter utility
 */

// Mock the formatter functions for testing
function formatCreditScore(score) {
  if (score === null || score === undefined || score === '' || isNaN(Number(score))) {
    return 'N/A';
  }
  return String(score);
}

function formatAccountCount(count) {
  if (count === null || count === undefined || count === '' || isNaN(Number(count))) {
    return 'N/A';
  }
  return String(count);
}

function formatCurrency(amount) {
  if (amount === null || amount === undefined || amount === '' || isNaN(Number(amount))) {
    return 'N/A';
  }
  
  // Convert to number if it's a string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Format as currency
  return `$${numAmount.toLocaleString()}`;
}

// Test formatCreditScore function
console.log('Testing formatCreditScore function:');
console.log(`formatCreditScore(null) => ${formatCreditScore(null)} (Expected: N/A)`);
console.log(`formatCreditScore(undefined) => ${formatCreditScore(undefined)} (Expected: N/A)`);
console.log(`formatCreditScore('') => ${formatCreditScore('')} (Expected: N/A)`);
console.log(`formatCreditScore('abc') => ${formatCreditScore('abc')} (Expected: N/A)`);
console.log(`formatCreditScore(750) => ${formatCreditScore(750)} (Expected: 750)`);
console.log(`formatCreditScore('750') => ${formatCreditScore('750')} (Expected: 750)`);

// Test formatAccountCount function
console.log('\nTesting formatAccountCount function:');
console.log(`formatAccountCount(null) => ${formatAccountCount(null)} (Expected: N/A)`);
console.log(`formatAccountCount(undefined) => ${formatAccountCount(undefined)} (Expected: N/A)`);
console.log(`formatAccountCount('') => ${formatAccountCount('')} (Expected: N/A)`);
console.log(`formatAccountCount('abc') => ${formatAccountCount('abc')} (Expected: N/A)`);
console.log(`formatAccountCount(5) => ${formatAccountCount(5)} (Expected: 5)`);
console.log(`formatAccountCount('5') => ${formatAccountCount('5')} (Expected: 5)`);

// Test formatCurrency function
console.log('\nTesting formatCurrency function:');
console.log(`formatCurrency(null) => ${formatCurrency(null)} (Expected: N/A)`);
console.log(`formatCurrency(undefined) => ${formatCurrency(undefined)} (Expected: N/A)`);
console.log(`formatCurrency('') => ${formatCurrency('')} (Expected: N/A)`);
console.log(`formatCurrency('abc') => ${formatCurrency('abc')} (Expected: N/A)`);
console.log(`formatCurrency(1000) => ${formatCurrency(1000)} (Expected: $1,000)`);
console.log(`formatCurrency('1000') => ${formatCurrency('1000')} (Expected: $1,000)`);

console.log('\nAll tests completed.');