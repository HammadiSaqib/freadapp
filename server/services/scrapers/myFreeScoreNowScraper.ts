import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import * as cheerio from 'cheerio';
import path from 'path';
import { fileURLToPath } from 'url';
import { Scraper, PuppeteerConfiguration } from '../../../scraper/scrapper.ts';
// Will dynamically import getDb when needed

// Configure puppeteer with stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

/**
 * Scrapes credit report data from MyFreeScoreNow platform
 * @param {string} username - MyFreeScoreNow account username
 * @param {string} password - MyFreeScoreNow account password
 * @param {Object} options - Optional configuration parameters
 * @param {boolean} options.saveHtml - Whether to save HTML content for debugging
 * @param {boolean} options.takeScreenshots - Whether to take screenshots during the process
 * @param {string} options.outputDir - Directory to save output files
 * @param {string} options.chromePath - Optional path to Chrome executable
 * @param {number} options.clientId - Client ID to associate with the report
 * @returns {Promise<Object>} - Structured credit report data
 */
async function fetchMyFreeScoreNowReport(username, password, options = {}) {
  const {
    saveHtml = false,
    takeScreenshots = false,
    outputDir = './scraper-output'
  } = options;
  
  let browser;
  let page;
  
  try {
    console.log('🔐 Initializing MyFreeScoreNow scraper...');
    
    // Create output directory if it doesn't exist and screenshots are enabled
    if ((saveHtml || takeScreenshots) && !fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Load the configuration from pupeeter_saad.json
    const configPath = path.resolve(process.cwd(), 'configs/pupeeter_saad.json');
    console.log('Loading configuration from:', configPath);
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData) as PuppeteerConfiguration;
    // Force incognito context per client to avoid cross-session persistence
    (config as any).useIncognito = true;
    if ((config as any).puppeteerConfig && Object.prototype.hasOwnProperty.call((config as any).puppeteerConfig, 'userDataDir')) {
      try { delete (config as any).puppeteerConfig.userDataDir; } catch {}
    }
    
    // Log configuration details for debugging
    console.log('Configuration loaded:', {
      url: config.url,
      hasEvaluations: !!config.evaluations,
      evaluationKeys: config.evaluations ? Object.keys(config.evaluations) : [],
      hasSelectors: !!config.selectors
    });
    
    // Override Chrome path if provided in options
    if (options.chromePath) {
      console.log('Using custom Chrome path:', options.chromePath);
      config.puppeteerConfig.executablePath = options.chromePath;
    }
    
    // Create an instance of the Scraper class
    const scraper = new Scraper(config);
    
    // Call the Scrap method with the provided credentials
    const debug = saveHtml || takeScreenshots;
    const reportData = await scraper.Scrap(debug, username, password);
    
    console.log('✅ Credit report data successfully scraped');
    
    // Save the report data to the database if clientId is provided
    if (options.clientId) {
      await saveReportToDatabase(reportData, options.clientId);
      console.log(`✅ Credit report data saved for client ID: ${options.clientId}`);
    } else {
      // Save to log file for backward compatibility
      const logPath = path.join(process.cwd(), 'scraper-output.log');
      fs.writeFileSync(logPath, `Using credentials for testing\nUsername: ${username}\nPassword: ${'*'.repeat(password.length)}\n≡ƒöä Starting MyFreeScoreNow scraper test...\nΓ£à Scraper test completed successfully!\n≡ƒôè Result data:\n${JSON.stringify(reportData, null, 2)}\n`);
    }
    
    return reportData;
  } catch (err) {
    console.error('❌ Error scraping credit report:', err);
    throw err;
  }
}

/**
 * Save credit report data to the database
 * @param {Object} reportData - The scraped credit report data
 * @param {number} clientId - The client ID to associate with the report
 */
async function saveReportToDatabase(reportData, clientId) {
  try {
    // Import getDb from schema
    const { getDb } = await import('../../database/schema.js');
    const db = await getDb();
    
    // If clientId is 'unknown', get the next available client ID
    let actualClientId = clientId;
    if (clientId === 'unknown') {
      try {
        const lastClient = await new Promise((resolve, reject) => {
          db.get('SELECT MAX(id) as maxId FROM clients', [], (err, row) => {
            if (err) {
              console.error('Error getting last client ID:', err);
              reject(err);
            } else {
              resolve(row);
            }
          });
        });
        
        // Set the next client ID (if no clients exist, start with 1)
        actualClientId = (lastClient.maxId || 0) + 1;
        console.log(`Auto-assigned client ID: ${actualClientId} (was 'unknown')`);
      } catch (error) {
        console.error('Error auto-assigning client ID:', error);
        // Fall back to using 'unknown' if there's an error
        actualClientId = clientId;
      }
    }
    
    // Get current date in YYYY-MM-DD format
    const reportDate = new Date().toISOString().split('T')[0];
    
    // Extract scores for each bureau
    const scores = {
      experian: 0,
      equifax: 0,
      transunion: 0
    };
    
    // Map bureau IDs to names
    const bureauMap = {
      1: 'transunion',
      2: 'equifax',
      3: 'experian'
    };
    
    // Extract scores from report data
    if (reportData.Score && Array.isArray(reportData.Score)) {
      reportData.Score.forEach(score => {
        const bureauName = bureauMap[score.BureauId];
        if (bureauName && score.Score) {
          scores[bureauName] = parseInt(score.Score, 10);
        }
      });
    }
    
    // Count accounts
    let accountsTotal = 0;
    let negativeAccounts = 0;
    
    if (reportData.Accounts && Array.isArray(reportData.Accounts)) {
      accountsTotal = reportData.Accounts.length;
      negativeAccounts = reportData.Accounts.filter(account => 
        account.PaymentStatus && account.PaymentStatus !== 'Current'
      ).length;
    }
    
    // Count inquiries
    const inquiriesCount = reportData.Inquiries && Array.isArray(reportData.Inquiries) ? 
      reportData.Inquiries.length : 0;
    
    // Count public records
    const publicRecords = reportData.PublicRecords && Array.isArray(reportData.PublicRecords) ? 
      reportData.PublicRecords.length : 0;
    
    // Get the report file path if available
    const report_path = reportData.filePath || null;
    
    // Insert a record for each bureau that has a score
    for (const [bureau, score] of Object.entries(scores)) {
      if (score > 0) {
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO credit_reports (
              client_id, bureau, score, report_date, report_data, 
              accounts_total, negative_accounts, inquiries_count, public_records, 
              report_path, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `,
            [
              actualClientId,
              bureau,
              score,
              reportDate,
              JSON.stringify(reportData),
              accountsTotal,
              negativeAccounts,
              inquiriesCount,
              publicRecords,
              report_path,
            ],
            function(err) {
              if (err) {
                console.error(`Error saving ${bureau} report:`, err);
                reject(err);
              } else {
                console.log(`Saved ${bureau} report for client ${actualClientId} with score ${score}`);
                resolve(this.lastID);
              }
            }
          );
        });
      }
    }
    
    // Update client's credit score with the highest score
    const highestScore = Math.max(...Object.values(scores));
    if (highestScore > 0) {
      await new Promise((resolve, reject) => {
        db.get('SELECT credit_score FROM clients WHERE id = ?', [actualClientId], (err, row) => {
          if (err) {
            console.error('Error getting client credit score:', err);
            reject(err);
            return;
          }
          
          const previousScore = row && row.credit_score ? row.credit_score : null;
          
          db.run(
            'UPDATE clients SET credit_score = ?, previous_credit_score = ?, updated_at = datetime(\'now\') WHERE id = ?',
            [highestScore, previousScore, actualClientId],
            function(err) {
              if (err) {
                console.error('Error updating client credit score:', err);
                reject(err);
              } else {
                console.log(`Updated client ${actualClientId} credit score to ${highestScore}`);
                resolve(true);
              }
            }
          );
        });
      });
    }
    
  } catch (err) {
    console.error('Error saving report to database:', err);
    throw err;
  }
}

export default fetchMyFreeScoreNowReport;