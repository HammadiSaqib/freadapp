/**
 * Scrapers Service Module
 * 
 * This module exports all available credit report scrapers and provides
 * a unified interface for accessing them.
 */

import fetchMyFreeScoreNowReport from './myFreeScoreNowScraper.ts';

/**
 * Available scraper platforms
 * @enum {string}
 */
export const PLATFORMS = {
  MY_FREE_SCORE_NOW: 'myfreescorenow',
  // Add more platforms as they are implemented
  // CREDIT_KARMA: 'creditkarma',
  // EXPERIAN: 'experian',
};

/**
 * Get the appropriate scraper function for a given platform
 * @param {string} platform - The platform identifier
 * @returns {Function|null} - The scraper function or null if not supported
 */
export function getScraperForPlatform(platform) {
  const normalizedPlatform = platform.toLowerCase().trim();
  
  switch (normalizedPlatform) {
    case PLATFORMS.MY_FREE_SCORE_NOW:
      return fetchMyFreeScoreNowReport;
    // Add cases for other platforms as they are implemented
    default:
      return null;
  }
}

/**
 * Fetch credit report from specified platform
 * @param {string} platform - The platform to scrape from
 * @param {string} username - Platform account username
 * @param {string} password - Platform account password
 * @param {Object} options - Additional options for the scraper
 * @returns {Promise<Object>} - The scraped credit report data
 * @throws {Error} - If platform is not supported or scraping fails
 */
export async function fetchCreditReport(platform, username, password, options = {}) {
  const scraper = getScraperForPlatform(platform);
  
  if (!scraper) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  
  try {
    return await scraper(username, password, options);
  } catch (error) {
    console.error(`Error scraping from ${platform}:`, error.message);
    throw error;
  }
}

export default {
  fetchCreditReport,
  getScraperForPlatform,
  PLATFORMS,
  scrapers: {
    fetchMyFreeScoreNowReport,
  }
};