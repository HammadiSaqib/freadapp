// Direct test script for the Scraper class
import fs from 'fs';
import path from 'path';
import { Scraper } from './scraper/scrapper.js';

// Use the provided credentials for testing
const username = 'Kristabadi2021@gmail.com';
const password = 'Badi2021!!';

// Load the configuration file
const configPath = path.resolve(process.cwd(), 'configs/pupeeter_saad.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

async function testDirectScraper() {
  try {
    console.log('Starting direct scraper test with provided credentials...');
    
    // Initialize the scraper with the configuration
    const scraper = new Scraper(config);
    
    // Set debug to true to keep the browser open
    const debug = true;
    
    // Perform the scraping
    const reportData = await scraper.Scrap(debug, username, password);
    
    console.log('Scraper completed successfully!');
    console.log('Report data:', JSON.stringify(reportData, null, 2));
    
  } catch (error) {
    console.error('Direct scraper test failed:', error);
  }
}

testDirectScraper();