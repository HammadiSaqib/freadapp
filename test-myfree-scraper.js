// Test script for MyFreeScoreNow scraper
const { fetchCreditReport, PLATFORMS } = require('./server/services/scrapers/index.js');
const detectChromePath = require('./utils/detectChromePath');

// Replace with actual credentials for testing
const username = 'test_username';
const password = 'test_password';

// Detect Chrome path
const chromePath = detectChromePath();
if (!chromePath) {
  console.error('Chrome not found. Please specify the path manually in the options.');
  process.exit(1);
}

// Options for the scraper
const options = {
  saveHtml: true,
  takeScreenshots: true,
  outputDir: './scraper-output',
  chromePath: chromePath // Use detected Chrome path
};

async function testScraper() {
  try {
    console.log('Starting MyFreeScoreNow scraper test...');
    
    const result = await fetchCreditReport(
      PLATFORMS.MY_FREE_SCORE_NOW,
      username,
      password,
      options
    );
    
    console.log('Scraper completed successfully!');
    console.log('Credit scores:', result.scores);
    console.log('Number of accounts:', result.accounts.length);
    console.log('Number of inquiries:', result.inquiries.length);
    
  } catch (error) {
    console.error('Scraper test failed:', error.message);
  }
}

testScraper();