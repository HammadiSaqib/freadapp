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
 * Scrapes credit report data from IdentityIQ platform
 * @param {string} username - IdentityIQ account username/email
 * @param {string} password - IdentityIQ account password
 * @param {Object} options - Optional configuration parameters
 * @param {string} options.ssnLast4 - Last 4 digits of SSN for security question
 * @param {boolean} options.saveHtml - Whether to save HTML content for debugging
 * @param {boolean} options.takeScreenshots - Whether to take screenshots during the process
 * @param {string} options.outputDir - Directory to save output files
 * @param {string} options.chromePath - Optional path to Chrome executable
 * @param {number} options.clientId - Client ID to associate with the report
 * @returns {Promise<Object>} - Structured credit report data
 */
async function fetchIdentityIQReport(username, password, options = {}) {
  console.log('🔍 DEBUG: IdentityIQ scraper called with options:', JSON.stringify(options, null, 2));
  
  const {
    ssnLast4,
    saveHtml = false,
    takeScreenshots = false,
    outputDir = './scraper-output'
  } = options;
  
  let browser;
  let page;
  
  try {
    console.log('🔐 Initializing IdentityIQ scraper...');
    console.log('🔍 DEBUG: SSN Last 4 received:', ssnLast4);
    
    // Validate required SSN last 4 digits
    if (!ssnLast4 || ssnLast4.length !== 4) {
      console.log('❌ DEBUG: SSN validation failed. ssnLast4:', ssnLast4, 'length:', ssnLast4?.length);
      throw new Error('SSN last 4 digits are required for IdentityIQ scraping');
    }
    
    // Create output directory if it doesn't exist and screenshots are enabled
    if ((saveHtml || takeScreenshots) && !fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Load the IdentityIQ configuration
    const configPath = path.resolve(process.cwd(), 'configs/identityiq_config.json');
    console.log('Loading IdentityIQ configuration from:', configPath);
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData) as PuppeteerConfiguration;
    
    // Log configuration details for debugging
    console.log('IdentityIQ Configuration loaded:', {
      url: config.url,
      loginUrl: config.loginUrl,
      securityQuestionUrl: config.securityQuestionUrl,
      dashboardUrl: config.dashboardUrl,
      creditReportUrl: config.creditReportUrl,
      hasEvaluations: !!config.evaluations,
      evaluationKeys: config.evaluations ? Object.keys(config.evaluations) : [],
      hasSelectors: !!config.selectors
    });
    
    // Override Chrome path if provided in options
    if (options.chromePath) {
      console.log('Using custom Chrome path:', options.chromePath);
      config.puppeteerConfig.executablePath = options.chromePath;
    }
    
    // Create an instance of the IdentityIQ Scraper class
    const scraper = new IdentityIQScraper(config, ssnLast4);
    
    // Call the Scrap method with the provided credentials
    const debug = saveHtml || takeScreenshots;
    const reportData = await scraper.Scrap(debug, username, password);
    
    console.log('✅ IdentityIQ credit report data successfully scraped');
    
    // Save the report data to the database if clientId is provided
    if (options.clientId) {
      await saveReportToDatabase(reportData, options.clientId);
      console.log(`✅ IdentityIQ credit report data saved for client ID: ${options.clientId}`);
    } else {
      // Save to log file for backward compatibility
      const logPath = path.join(process.cwd(), 'scraper-output.log');
      fs.writeFileSync(logPath, `Using credentials for IdentityIQ testing\nUsername: ${username}\nPassword: ${'*'.repeat(password.length)}\nSSN Last 4: ${'*'.repeat(4)}\n🚀 Starting IdentityIQ scraper test...\n✅ IdentityIQ scraper test completed successfully!\n📊 Result data:\n${JSON.stringify(reportData, null, 2)}\n`);
    }
    
    return reportData;
  } catch (err) {
    console.error('❌ Error scraping IdentityIQ credit report:', err);
    throw err;
  }
}

/**
 * Extended Scraper class specifically for IdentityIQ with security question handling
 */
class IdentityIQScraper extends Scraper {
  private ssnLast4: string;
  private creditReportData: any = null;
  
  constructor(conf: PuppeteerConfiguration, ssnLast4: string) {
    super(conf);
    this.ssnLast4 = ssnLast4;
  }
  
  /**
   * Custom scraping method for IdentityIQ with security question handling
   */
  async Scrap(debug: boolean, username: string, password: string): Promise<any> {
    try {
      console.log('🚀 Starting IdentityIQ scraping process...');
      
      // Initialize browser and page
      await this.initialize();
      
      // Navigate to IdentityIQ login page before attaching the dashboard listener
      console.log('📍 Navigating to IdentityIQ login page...');
      await this.page.goto(this.conf.loginUrl || this.conf.url, { 
        waitUntil: 'networkidle2',
        timeout: this.conf.waitTimeouts?.navigation || 120000
      });
      
      // Listen for the dashboard consumer connect payload during login transitions
      const reportTimeout = this.conf.waitTimeouts?.report_load || 120000;
      const consumerConnectPromise = this.waitForConsumerConnectResponse(reportTimeout)
        .then((response) => this.parseConsumerConnectResponse(response));
      
      if (debug) {
        await this.page.screenshot({ path: './scraper-output/01-login-page.png' });
      }
      
      // Perform login
      await this.performLogin(username, password, debug);
      
      // Handle security question if present
      await this.handleSecurityQuestion(debug);
      
      const consumerConnectData = await consumerConnectPromise;
      if (!consumerConnectData) {
        throw new Error('Failed to capture IdentityIQ consumerconnect payload within the expected timeframe.');
      }
      this.creditReportData = consumerConnectData;
      console.log('✅ Captured IdentityIQ report payload from consumerconnect dashboard call.');
      
      console.log('✅ IdentityIQ scraping completed successfully');
      return this.creditReportData;
      
    } catch (error) {
      console.error('❌ IdentityIQ scraping failed:', error);
      throw error;
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
  
  /**
   * Perform login to IdentityIQ
   */
  private async performLogin(username: string, password: string, debug: boolean): Promise<void> {
    console.log('🔐 Performing login...');
    
    // Wait for login form to be available
    await this.page.waitForSelector(this.conf.selectors.email_field[0], { 
      timeout: this.conf.waitTimeouts?.element || 10000 
    });
    
    // Fill in email
    await this.page.type(this.conf.selectors.email_field[0], username);
    console.log('✅ Email entered');
    
    // Fill in password
    await this.page.type(this.conf.selectors.password_field[0], password);
    console.log('✅ Password entered');
    
    if (debug) {
      await this.page.screenshot({ path: './scraper-output/02-credentials-entered.png' });
    }
    
    // Click login button
    await this.page.click(this.conf.selectors.login_button[0]);
    console.log('🔄 Login button clicked, waiting for response...');
    
    // Wait for navigation or security question page
    await this.page.waitForNavigation({ 
      waitUntil: 'domcontentloaded',
      timeout: this.conf.waitTimeouts?.navigation || 120000
    });
    
    if (debug) {
      await this.page.screenshot({ path: './scraper-output/03-after-login.png' });
    }
  }
  
  /**
   * Handle security question if it appears
   */
  private async handleSecurityQuestion(debug: boolean): Promise<void> {
    const currentUrl = this.page.url();
    console.log('🔍 Current URL after login:', currentUrl);
    
    // Check if we're on the security question page
    if (currentUrl.includes('security-question') || currentUrl.includes('security')) {
      console.log('🔒 Security question page detected, handling SSN verification...');
      
      try {
        // Wait for SSN input field
        await this.page.waitForSelector(this.conf.selectors.ssn_field[0], { 
          timeout: this.conf.waitTimeouts?.security_question || 15000 
        });
        
        // Enter SSN last 4 digits
        await this.page.type(this.conf.selectors.ssn_field[0], this.ssnLast4);
        console.log('✅ SSN last 4 digits entered');
        
        if (debug) {
          await this.page.screenshot({ path: './scraper-output/04-security-question.png' });
        }
        
        // Click continue/submit button
        await this.page.click(this.conf.selectors.security_submit_button[0]);
        console.log('🔄 Security question submitted, waiting for response...');
        
        // Wait for navigation to dashboard
        await this.page.waitForNavigation({ 
          waitUntil: 'domcontentloaded',
          timeout: this.conf.waitTimeouts?.navigation || 120000
        });
        
        if (debug) {
          await this.page.screenshot({ path: './scraper-output/05-after-security-question.png' });
        }
        
        console.log('✅ Security question handled successfully');
      } catch (error) {
        console.error('❌ Error handling security question:', error);
        throw new Error(`Failed to handle security question: ${error.message}`);
      }
    } else {
      console.log('ℹ️ No security question detected, proceeding to dashboard...');
    }
  }
  
  private waitForConsumerConnectResponse(timeout: number) {
    return this.page.waitForResponse(
      (response) => response.url().includes('consumerconnect.tui.transunion.com'),
      { timeout }
    );
  }

  private async parseConsumerConnectResponse(response: any): Promise<any | null> {
    if (!response) {
      return null;
    }
    try {
      const url = response.url();
      console.log(`📥 Detected consumerconnect response: ${url}`);
      const headers = response.headers();
      const contentType = headers['content-type'] || headers['Content-Type'] || '';
      const bodyText = await response.text();
      if (!bodyText) {
        console.warn('⚠️ consumerconnect response body was empty.');
        return null;
      }
      if (contentType.includes('application/json')) {
        return JSON.parse(bodyText);
      }
      try {
        return JSON.parse(bodyText);
      } catch (parseError) {
        console.warn('⚠️ consumerconnect response was not JSON. Returning raw text.');
        return bodyText;
      }
    } catch (error) {
      console.warn('⚠️ Failed to parse consumerconnect response:', error);
      return null;
    }
  }

  /**
   * Navigate to credit report page
   */
  private async navigateToCreditReport(debug: boolean): Promise<void> {
    console.log('📊 Navigating to credit report page...');
    
    // Ensure we're on the dashboard
    const currentUrl = this.page.url();
    if (!currentUrl.includes('Dashboard')) {
      console.log('🔄 Navigating to dashboard first...');
      await this.page.goto(this.conf.dashboardUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: this.conf.waitTimeouts?.navigation || 120000
      });
    }
    
    if (debug) {
      await this.page.screenshot({ path: './scraper-output/06-dashboard.png' });
    }
    
    const navigationTimeout = this.conf.waitTimeouts?.navigation || 120000;
    const creditReportSelectors = this.conf.selectors?.credit_report_link ?? [];
    let navigatedToReport = false;
    
    // Try clicking one of the configured credit report links first
    for (const selector of creditReportSelectors) {
      const linkHandle = await this.page.$(selector);
      if (!linkHandle) {
        continue;
      }

      console.log(`🔗 Attempting to open credit report via selector: ${selector}`);
      try {
        await Promise.all([
          this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: navigationTimeout }),
          linkHandle.click()
        ]);
        navigatedToReport = true;
        console.log('✅ Navigated to credit report page via dashboard link');
      } catch (error) {
        const message = (error as Error).message ?? '';
        if (message.includes('Navigation timeout')) {
          console.warn('⚠️ Timed out waiting for navigation after clicking link. Checking current URL before falling back...');
          if (this.page.url().includes('CreditReport')) {
            navigatedToReport = true;
            console.log('✅ Credit report URL detected despite timeout. Continuing...');
          }
        } else {
          await linkHandle.dispose();
          throw error;
        }
      }

      await linkHandle.dispose();
      if (navigatedToReport) {
        break;
      }
    }
    
    // Fallback to direct navigation if clicking links did not succeed
    if (!navigatedToReport) {
      console.log('🔄 Direct navigation fallback to credit report page...');
      try {
        await this.page.goto(this.conf.creditReportUrl, { 
          waitUntil: 'domcontentloaded',
          timeout: navigationTimeout
        });
        navigatedToReport = true;
      } catch (error) {
        const message = (error as Error).message ?? '';
        if (message.includes('Navigation timeout')) {
          console.warn('⚠️ Direct navigation to credit report timed out. Will rely on selector wait as the page likely loaded.');
          if (this.page.url().includes('CreditReport')) {
            navigatedToReport = true;
            console.log('✅ Credit report URL confirmed after timeout. Proceeding...');
          }
        } else {
          throw error;
        }
      }
    }
    
    if (!navigatedToReport) {
      throw new Error('Failed to navigate to IdentityIQ credit report page');
    }
    
    if (debug) {
      await this.page.screenshot({ path: './scraper-output/07-credit-report-page.png' });
    }
    
    console.log('✅ Successfully navigated to credit report page');
  }
  
  /**
   * Extract credit report data from the page
   */
  private async extractCreditReportData(debug: boolean): Promise<any> {
    console.log('📊 Extracting credit report data...');
    
    // Wait for report container to load
    await this.page.waitForSelector(this.conf.selectors.credit_report_container[0], { 
      timeout: this.conf.waitTimeouts?.report_load || 20000 
    });
    
    // Extract data using evaluations from config
    const reportData = await this.page.evaluate((evaluations) => {
      const data: any = {};
      
      // Try to extract data using configured evaluations
      for (const [key, evaluation] of Object.entries(evaluations)) {
        try {
          data[key] = eval(evaluation);
        } catch (error) {
          console.log(`Could not evaluate ${key}:`, error.message);
        }
      }
      
      // Extract basic page content as fallback
      data.pageContent = document.body.innerHTML;
      data.pageTitle = document.title;
      data.currentUrl = window.location.href;
      
      return data;
    }, this.conf.evaluations);
    
    if (debug) {
      await this.page.screenshot({ path: './scraper-output/08-data-extracted.png' });
      
      // Save HTML content for debugging
      const htmlContent = await this.page.content();
      fs.writeFileSync('./scraper-output/credit-report-page.html', htmlContent);
    }
    
    console.log('✅ Credit report data extracted successfully');
    return reportData;
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
      const result = await db.prepare('SELECT MAX(id) as maxId FROM clients').get();
      actualClientId = (result?.maxId || 0) + 1;
      console.log(`Using next available client ID: ${actualClientId}`);
    }
    
    // Insert the credit report data
    const insertStmt = db.prepare(`
      INSERT INTO credit_reports (
        client_id, 
        platform, 
        report_data, 
        created_at, 
        updated_at
      ) VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    const result = insertStmt.run(
      actualClientId,
      'identityiq',
      JSON.stringify(reportData)
    );
    
    console.log(`Credit report saved with ID: ${result.lastInsertRowid}`);
    return result.lastInsertRowid;
  } catch (error) {
    console.error('Error saving to database:', error);
    throw error;
  }
}

export default fetchIdentityIQReport;
