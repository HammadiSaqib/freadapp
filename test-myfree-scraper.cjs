// Test script for MyFreeScoreNow scraper (CommonJS version)
const path = require('path');
const fs = require('fs');

/**
 * Detects Chrome installation path on the current system
 * @returns {string|null} Path to Chrome executable or null if not found
 */
function detectChromePath() {
  // Common Chrome installation paths
  const commonPaths = [
    // Windows paths
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    // Add more paths as needed
  ];

  // Check if any of the common paths exist
  for (const chromePath of commonPaths) {
    if (fs.existsSync(chromePath)) {
      console.log(`Chrome found at: ${chromePath}`);
      return chromePath;
    }
  }

  console.error('Chrome not found in common installation paths');
  return null;
}

// Detect Chrome path
const chromePath = detectChromePath();
if (!chromePath) {
  console.error('Chrome not found. Please specify the path manually in the options.');
  process.exit(1);
}

// Replace with actual credentials for testing
const username = 'test_username';
const password = 'test_password';

// Options for the scraper
const options = {
  saveHtml: true,
  takeScreenshots: true,
  outputDir: './scraper-output',
  chromePath: chromePath // Use detected Chrome path
};

// Update the puppeteer configuration file directly
const configPath = path.resolve(process.cwd(), 'configs/pupeeter_saad.json');
const configData = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(configData);

// Update the Chrome path in the config
config.puppeteerConfig.executablePath = chromePath;

// Write the updated config back to the file
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log(`Updated Chrome path in config to: ${chromePath}`);

console.log('Configuration updated successfully. You can now run the scraper with the correct Chrome path.');
console.log('To test the scraper, use the web interface at http://localhost:3001/credit-reports/scraper');