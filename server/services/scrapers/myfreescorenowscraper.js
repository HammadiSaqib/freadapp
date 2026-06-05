/**
 * MyFreeScoreNow Scraper
 * 
 * This module provides functionality to scrape credit reports from MyFreeScoreNow.com
 */

import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import UserAgent from 'user-agents';
import { Scraper } from '../../../scraper/scrapper.js';
import { convertNewToLegacy } from './converter.js';

const LEGACY_REPORT_KEYS = [
  'CreditReport',
  'Name',
  'Address',
  'DOB',
  'Score',
  'Employer',
  'Inquiries',
  'PublicRecords',
  'Accounts',
];

// Incognito variant of Scraper that uses a fresh browser context per run
class IncognitoScraper extends Scraper {
  async initialize() {
    const userAgent = new UserAgent({ deviceCategory: 'desktop' });

    const configuredHeadless = this.conf?.puppeteerConfig?.headless;
    const forceHeaded = process.env.SCRAPER_HEADED === '1' || configuredHeadless === false;
    const puppeteerConfig = {
      ...this.conf.puppeteerConfig,
      headless: forceHeaded ? false : configuredHeadless,
      devtools: forceHeaded ? true : !!this.conf.puppeteerConfig?.devtools,
      args: (this.conf.puppeteerConfig?.args || [])
    };

    // Remove persistent profile to avoid cross-client cookies/storage
    if (puppeteerConfig && Object.prototype.hasOwnProperty.call(puppeteerConfig, 'userDataDir')) {
      try { delete puppeteerConfig.userDataDir; } catch {}
    }

    this.browser = await puppeteer.launch(puppeteerConfig);

    if (typeof this.browser.createBrowserContext === 'function') {
      this.context = await this.browser.createBrowserContext();
      this.page = await this.context.newPage();
    } else {
      this.page = await this.browser.newPage();
    }

    this.page.setUserAgent(userAgent.toString());

    // Preload script if present
    if (this.conf.puppeteerPreloadJs && this.conf.puppeteerPreloadJs[0] && fs.existsSync(this.conf.puppeteerPreloadJs[0])) {
      const preloadFile = fs.readFileSync(this.conf.puppeteerPreloadJs[0], { encoding: 'utf-8' });
      await this.page.evaluateOnNewDocument(preloadFile);
    }

    await this.page.setViewport(this.conf.puppeteerResolution);
    await this.page.evaluateOnNewDocument(() => {
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}
    });
    await this.page.setExtraHTTPHeaders(this.conf.puppeteerHttpHeaders);
  }

  async initializeTest() {
    await this.initialize();
  }

  async close() {
    if (!this.browser) throw new Error('Browser is not initialized. Call initialize() first.');
    if (this.page) await this.page.close();
    if (this.context) { try { await this.context.close(); } catch {} }
    await this.browser.close();
  }
}

function hasWrapperKeys(reportData) {
  if (!reportData || typeof reportData !== 'object') return false;
  return (
    Object.prototype.hasOwnProperty.call(reportData, 'success') ||
    Object.prototype.hasOwnProperty.call(reportData, 'message') ||
    Object.prototype.hasOwnProperty.call(reportData, 'data')
  );
}

function isStrictLegacyReportData(reportData) {
  if (!reportData || typeof reportData !== 'object') return false;
  if (hasWrapperKeys(reportData)) return false;
  return LEGACY_REPORT_KEYS.every((key) => Array.isArray(reportData[key]));
}

function resolveScrapedPayloadRoot(scrapedData) {
  if (scrapedData?.reportData?.data?.data) return scrapedData.reportData.data.data;
  if (scrapedData?.reportData?.data) return scrapedData.reportData.data;
  if (scrapedData?.data?.data) return scrapedData.data.data;
  if (scrapedData?.data) return scrapedData.data;
  return scrapedData;
}

// Helper function to safely stringify objects with circular references and non-serializable values
const safeStringify = (obj) => {
  try {
    // Handle circular references
    const seen = new Set();
    return JSON.stringify(obj, (key, value) => {
      // Handle non-serializable values
      if (typeof value === 'function') return '[Function]';
      if (value instanceof RegExp) return value.toString();
      if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
      if (value === undefined) return null;
      
      // Handle circular references
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
      }
      return value;
    }, 2);
  } catch (err) {
    console.error('Error in safeStringify:', err);
    // Fallback to a basic representation
    return JSON.stringify({
      error: 'Could not stringify object',
      reason: err.message,
      partialData: Object.keys(obj)
    });
  }
};

/**
 * Fetch credit report from MyFreeScoreNow
 * @param {string} username - MyFreeScoreNow account username
 * @param {string} password - MyFreeScoreNow account password
 * @param {Object} options - Additional options for the scraper
 * @returns {Promise<Object>} - The scraped credit report data and file path
 */
async function fetchMyFreeScoreNowReport(username, password, options = {}) {
  const { outputDir = './scraper-output', clientId } = options;
  const configPath = path.resolve(process.cwd(), 'configs/pupeeter_saad.json');
  const baseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  // Enforce isolation for MyFreeScoreNow: incognito + no persistent userDataDir
  const config = {
    ...baseConfig,
    useIncognito: true,
    puppeteerConfig: {
      ...baseConfig.puppeteerConfig
    }
  };
  if (config.puppeteerConfig && Object.prototype.hasOwnProperty.call(config.puppeteerConfig, 'userDataDir')) {
    try { delete config.puppeteerConfig.userDataDir; } catch {}
  }
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  try {
    // Use a fresh browser instance without a persistent profile. This proved more reliable
    // than an extra incognito context for loading the dated credit-report view.
    const scraper = new Scraper(config);
    
    // Perform the scraping
    const scrapedData = await scraper.Scrap(false, username, password);
    const domPublicRecords = typeof scraper.extractMyFreeScoreNowPublicRecords === 'function'
      ? scraper.extractMyFreeScoreNowPublicRecords(scraper.lastPageText || '')
      : [];

    if (domPublicRecords.length > 0) {
      if (isStrictLegacyReportData(scrapedData)) {
        if (!Array.isArray(scrapedData.PublicRecords) || scrapedData.PublicRecords.length === 0) {
          scrapedData.PublicRecords = domPublicRecords;
          console.log(`Attached ${domPublicRecords.length} DOM public records to strict legacy MyFreeScoreNow payload`);
        }
      } else {
        const payloadRoot = resolveScrapedPayloadRoot(scrapedData);
        const existingPublicRecords = Array.isArray(payloadRoot?.PublicRecords)
          ? payloadRoot.PublicRecords
          : Array.isArray(payloadRoot?.publicRecords)
            ? payloadRoot.publicRecords
            : [];

        if (payloadRoot && typeof payloadRoot === 'object' && existingPublicRecords.length === 0) {
          payloadRoot.PublicRecords = domPublicRecords;
          console.log(`Attached ${domPublicRecords.length} DOM public records to scraped MyFreeScoreNow payload`);
        }
      }
    }

    let convertedPayload = null;
    if (isStrictLegacyReportData(scrapedData)) {
      convertedPayload = {
        clientInfo: {
          clientId: clientId || 'unknown',
          username,
          timestamp: new Date().toISOString(),
        },
        reportData: scrapedData,
      };
    } else {
      convertedPayload = convertNewToLegacy(
        {
          clientInfo: {
            clientId: clientId || 'unknown',
            username,
            timestamp: new Date().toISOString(),
          },
          reportData: scrapedData,
        },
        clientId || 'unknown',
        username
      );
      console.log('Converted MyFreeScoreNow payload to strict legacy report format');
    }

    const reportData = convertedPayload.reportData;
    if (!isStrictLegacyReportData(reportData)) {
      throw new Error('Invalid converted reportData: strict legacy keys missing');
    }
    if (hasWrapperKeys(reportData)) {
      throw new Error('Invalid converted reportData: success/message/data wrapper keys are not allowed');
    }
    
    // Save the report data to a file
    let filePath = null;
    if (reportData) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `client_${clientId || 'unknown'}_report_${timestamp}.json`;
      filePath = path.join(outputDir, filename);
      
      // Add client information to the report data
      const reportWithClientInfo = {
        clientInfo: {
          clientId: clientId || 'unknown',
          username,
          timestamp: new Date().toISOString(),
          reportDate: new Date().toLocaleDateString()
        },
        reportData
      };

      reportWithClientInfo.clientInfo = {
        ...reportWithClientInfo.clientInfo,
        ...convertedPayload.clientInfo,
      };
      
      // Write the JSON file using safeStringify
      fs.writeFileSync(filePath, safeStringify(reportWithClientInfo));
      console.log(`📁 Report saved to ${filePath}`);
      
      // Add the file path to the report data so it can be saved in the database
      reportData.filePath = filePath;
      
      // Log the file path to verify it's being set correctly
      console.log(`Setting reportData.filePath to: ${filePath}`);
    }
    
    return { reportData, filePath };
  } catch (error) {
    console.error('MyFreeScoreNow scraper error:', error);
    throw error;
  }
}

export default fetchMyFreeScoreNowReport;