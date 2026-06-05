/**
 * Test script for client-specific credit report scraping
 * 
 * This script demonstrates how to use the credit report scraper with client selection
 * Usage: node test-client-scraper.cjs <clientId>
 */

// Create a simple wrapper to use the ES module in CommonJS
const fetchCreditReport = async (platform, username, password, clientId) => {
  // Dynamically import the ES module
  const { fetchCreditReport } = await import('./server/services/scrapers/index.js');
  return fetchCreditReport(platform, username, password, { 
    saveHtml: true, 
    takeScreenshots: true, 
    outputDir: './scraper-output',
    clientId: clientId
  });
};

async function testClientScraper() {
  try {
    // Get client ID from command line arguments
    const args = process.argv.slice(2);
    const clientId = args[0] ? parseInt(args[0], 10) : null;
    
    if (!clientId) {
      console.error('❌ Error: Client ID is required');
      console.log('Usage: node test-client-scraper.cjs <clientId>');
      process.exit(1);
    }
    
    console.log(`🔍 Testing credit report scraper for client ID: ${clientId}`);
    
    // Use hardcoded credentials for testing
    const platform = 'myfreescorenow';
    const username = "Kristabadi2021@gmail.com";
    const password = "Badi2021!!";
    
    console.log('Using credentials for testing');
    console.log(`Platform: ${platform}`);
    console.log(`Username: ${username}`);
    console.log(`Password: ${'*'.repeat(password.length)}`);
    
    console.log('🔄 Starting credit report scraper test...');
    
    // Run the scraper
    const result = await fetchCreditReport(platform, username, password, clientId);
    
    console.log('✅ Scraper test completed successfully!');
    console.log('📊 Result data:');
    console.log(JSON.stringify(result, null, 2));
    
    // Check if we have scores in the result
    if (result && result.scores) {
      console.log('\n📊 Credit scores:');
      console.log(`  Equifax: ${result.scores.equifax || 'N/A'}`);
      console.log(`  TransUnion: ${result.scores.transunion || 'N/A'}`);
      console.log(`  Experian: ${result.scores.experian || 'N/A'}`);
    }
    
    // Check if we have account summary in the result
    if (result && result.summary && result.summary.transunion) {
      console.log('\n📋 Account summary:');
      console.log(`  Total accounts: ${result.summary.transunion.totalAccounts || 'N/A'} (TransUnion)`);
      console.log(`  Open accounts: ${result.summary.transunion.openAccounts || 'N/A'} (TransUnion)`);
    }
    
    console.log('\n📁 Output saved to ./scraper-output directory');
    console.log(`✅ Credit report data saved for client ID: ${clientId}`);
  } catch (error) {
    console.error('❌ Scraper test failed:', error.message);
    process.exit(1);
  }
}

testClientScraper();