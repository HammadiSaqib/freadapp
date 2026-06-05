# Credit Report Scrapers

This directory contains scrapers for various credit report platforms. These scrapers are used to fetch credit report data programmatically.

## Available Scrapers

### MyFreeScoreNow

The MyFreeScoreNow scraper allows you to fetch credit report data from the MyFreeScoreNow platform.

#### Usage

```javascript
import { fetchCreditReport, PLATFORMS } from '../services/scrapers/index.js';

// Credentials for MyFreeScoreNow
const username = 'your_username';
const password = 'your_password';

// Optional configuration
const options = {
  saveHtml: false,        // Save HTML content for debugging
  takeScreenshots: false, // Take screenshots during the process
  outputDir: './output'   // Directory to save output files
};

// Fetch credit report
try {
  const reportData = await fetchCreditReport(
    PLATFORMS.MYFREESCORENOW,
    username,
    password,
    options
  );
  
  console.log('Credit scores:', reportData.scores);
  console.log('Accounts:', reportData.accounts);
} catch (error) {
  console.error('Failed to fetch credit report:', error.message);
}
```

#### Return Data Structure

The scraper returns a structured object with the following properties:

```javascript
{
  timestamp: '2023-06-15T12:34:56.789Z',
  scores: {
    equifax: '720',
    transunion: '715',
    experian: '725'
  },
  summary: {
    transunion: { /* bureau summary data */ },
    experian: { /* bureau summary data */ },
    equifax: { /* bureau summary data */ }
  },
  accounts: [
    /* Array of account objects */
    {
      creditor: 'CAPITAL ONE',
      bureau: 'transunion',
      accountNumber: 'XXXX1234',
      balance: '$1,234',
      creditLimit: '$5,000',
      dateOpened: '01/2020',
      status: 'Current',
      lastReported: '05/2023',
      accountType: 'Revolving',
      paymentHistory: 'No late payments',
      highCredit: '$2,500',
      terms: 'N/A',
      monthlyPayment: '$35'
    },
    // More accounts...
  ],
  inquiries: [
    /* Array of inquiry objects */
    {
      creditor: 'BANK OF AMERICA',
      date: '04/15/2023',
      bureau: 'Equifax'
    },
    // More inquiries...
  ],
  personalInfo: {
    name: 'JOHN DOE',
    address: '123 MAIN ST, ANYTOWN, US 12345',
    previousAddresses: '456 OLD ST, OLDTOWN, US 67890',
    employers: 'ACME CORPORATION'
  },
  message: 'Credit report data successfully extracted'
}
```

#### Limitations

- The scraper requires valid MyFreeScoreNow credentials
- The scraper may break if the website structure changes
- Excessive use may trigger CAPTCHA or account lockouts
- The scraper uses headless browser automation which may be detected by anti-bot systems

## Adding New Scrapers

To add a new scraper for another platform:

1. Create a new file in this directory (e.g., `newPlatformScraper.ts`)
2. Implement the scraper function with the same signature as existing scrapers
3. Add the platform to the `PLATFORMS` enum in `index.ts`
4. Update the `getScraperForPlatform` function in `index.ts` to return your new scraper