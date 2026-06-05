const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const cheerio = require('cheerio');

async function fetchCreditReport(username, password) {
  let browser;
  let page;
  try {
    console.log('🔐 Logging in at 05:25 AM PKT, July 16, 2025...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-blink-features=AutomationControlled',
        '--enable-features=NetworkService',
      ],
    });
    page = await browser.newPage();

    // Set user-agent and viewport to mimic a real browser
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 720 });

    // Log browser console and network requests
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('response', response => {
      if (response.url().includes('api') || response.url().includes('report') || response.url().includes('data')) {
        console.log('Network response:', response.url());
      }
    });

    // Navigate to login page
    await page.goto('https://app.myfreescorenow.com/login', { waitUntil: 'networkidle0' });

    // Wait for login form
    const usernameSelector = '#j_username';
    const passwordSelector = '#j_password';
    const loginButtonSelector = 'button[type="submit"]';
    await page.waitForSelector(usernameSelector, { timeout: 30000 });
    console.log('✅ Login form loaded');

    // Enter credentials and submit
    await page.type(usernameSelector, username);
    await page.type(passwordSelector, password);
    await Promise.all([
      page.click(loginButtonSelector),
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);
    console.log('✅ Logged in. Current URL:', page.url());

    // Check for login errors
    const errorMessage = await page.$('.error-message, .alert-danger');
    if (errorMessage) {
      const errorText = await page.evaluate(el => el.textContent, errorMessage);
      throw new Error(`Login failed: ${errorText}`);
    }

    // Navigate to credit report page
    await page.goto('https://app.myfreescorenow.com/credit-report', { waitUntil: 'networkidle0' });
    console.log('📄 Credit Report page loaded');

    // Switch to Classic view
    const classicButtonSelector = '.btn.btn-sm.btn-secondary.fs-12';
    await page.waitForSelector(classicButtonSelector, { timeout: 10000 });
    await Promise.all([
      page.click(classicButtonSelector),
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);
    console.log('📍 Classic view URL:', page.url());

    // Take screenshot for debugging
    await page.screenshot({ path: 'classic-view.png' });

    // Wait for report data with updated selectors
    const selectors = [
      'h5.fw-bold.m-0.h-60px', // Credit scores
      'div:contains("Summary")',
      'div:contains("Revolving Accounts")',
    ];
    let dataLoaded = false;
    let maxRetries = 3;
    let retries = 0;
    while (retries < maxRetries && !dataLoaded) {
      for (const selector of selectors) {
        try {
          await page.waitForSelector(selector, { timeout: 60000 });
          console.log(`📂 Report data loaded (selector: ${selector})`);
          dataLoaded = true;
          break;
        } catch (error) {
          console.log(`Retry ${retries + 1}/${maxRetries} for selector ${selector}: ${error.message}`);
        }
      }
      if (!dataLoaded) {
        retries++;
        if (retries === maxRetries) {
          await page.screenshot({ path: 'error-page.png' });
          throw new Error('Failed to load report data after retries');
        }
        await page.reload({ waitUntil: 'networkidle0' });
        await page.screenshot({ path: `retry-${retries}-page.png` });
      }
    }

    // Save HTML
    const classicHtml = await page.content();
    fs.writeFileSync('classic-report.html', classicHtml);
    console.log('📂 Classic view saved to classic-report.html');

    // Parse HTML with Cheerio
    const $ = cheerio.load(classicHtml);
    const data = {
      scores: {
        equifax: $('.bg-equifax + dd h5').text().trim() || null,
        transunion: $('.bg-transunion + dd h5').text().trim() || null,
        experian: $('.bg-experian + dd h5').text().trim() || null,
      },
      summary: {
        transunion: {
          totalAccounts: $('.bg-transunion').closest('.grid-rows-10').find('p:contains("Total Accounts")').next().text().trim() || null,
          openAccounts: $('.bg-transunion').closest('.grid-rows-10').find('p:contains("Open Accounts:")').next().text().trim() || null,
          closedAccounts: $('.bg-transunion').closest('.grid-rows-10').find('p:contains("Closed Accounts:")').next().text().trim() || null,
          balances: $('.bg-transunion').closest('.grid-rows-10').find('p:contains("Balances:")').next().text().trim() || null,
        },
        experian: {
          totalAccounts: $('.bg-experian').closest('.grid-rows-10').find('p:contains("Total Accounts")').next().text().trim() || null,
          openAccounts: $('.bg-experian').closest('.grid-rows-10').find('p:contains("Open Accounts:")').next().text().trim() || null,
          closedAccounts: $('.bg-experian').closest('.grid-rows-10').find('p:contains("Closed Accounts:")').next().text().trim() || null,
          balances: $('.bg-experian').closest('.grid-rows-10').find('p:contains("Balances:")').next().text().trim() || null,
        },
        equifax: {
          totalAccounts: $('.bg-equifax').closest('.grid-rows-10').find('p:contains("Total Accounts")').next().text().trim() || null,
          openAccounts: $('.bg-equifax').closest('.grid-rows-10').find('p:contains("Open Accounts:")').next().text().trim() || null,
          closedAccounts: $('.bg-equifax').closest('.grid-rows-10').find('p:contains("Closed Accounts:")').next().text().trim() || null,
          balances: $('.bg-equifax').closest('.grid-rows-10').find('p:contains("Balances:")').next().text().trim() || null,
        },
      },
      accounts: [],
      inquiries: [],
      message: 'Classic report page parsed',
    };

    // Extract accounts (Revolving Accounts)
    $('div:contains("Revolving Accounts")').next().find('.d-grid.grid-cols-4').each((i, grid) => {
      $(grid).find('p:contains("AMEX")').closest('.grid-rows-23').find('p.grid-cell').each((j, cell) => {
        const label = $(cell).text().trim();
        const value = $(cell).next().text().trim();
        if (label && !data.accounts.some(a => a.creditor === 'AMEX' && a.bureau === 'transunion')) {
          data.accounts.push({ creditor: 'AMEX', bureau: 'transunion' }); // Initialize for TransUnion
        }
        const currentAccount = data.accounts.find(a => a.creditor === 'AMEX' && a.bureau === 'transunion');
        if (currentAccount) {
          if (label === 'Account #') currentAccount.accountNumber = value;
          if (label === 'Balance Owed:') currentAccount.balance = value;
          if (label === 'Credit Limit:') currentAccount.creditLimit = value;
          if (label === 'Date Opened:') currentAccount.dateOpened = value;
          if (label === 'Payment Status:') currentAccount.status = value;
        }
        // Adjust for other bureaus if present in the same grid
        if ($(cell).closest('.grid-rows-23').prev().find('.bg-experian').length) {
          if (!data.accounts.some(a => a.creditor === 'AMEX' && a.bureau === 'experian')) {
            data.accounts.push({ creditor: 'AMEX', bureau: 'experian' });
          }
          const expAccount = data.accounts.find(a => a.creditor === 'AMEX' && a.bureau === 'experian');
          if (expAccount) {
            if (label === 'Account #') expAccount.accountNumber = value;
            if (label === 'Balance Owed:') expAccount.balance = value;
            if (label === 'Credit Limit:') expAccount.creditLimit = value;
            if (label === 'Date Opened:') expAccount.dateOpened = value;
            if (label === 'Payment Status:') expAccount.status = value;
          }
        }
        if ($(cell).closest('.grid-rows-23').prev().find('.bg-equifax').length) {
          if (!data.accounts.some(a => a.creditor === 'AMEX' && a.bureau === 'equifax')) {
            data.accounts.push({ creditor: 'AMEX', bureau: 'equifax' });
          }
          const eqfAccount = data.accounts.find(a => a.creditor === 'AMEX' && a.bureau === 'equifax');
          if (eqfAccount) {
            if (label === 'Account #') eqfAccount.accountNumber = value;
            if (label === 'Balance Owed:') eqfAccount.balance = value;
            if (label === 'Credit Limit:') eqfAccount.creditLimit = value;
            if (label === 'Date Opened:') eqfAccount.dateOpened = value;
            if (label === 'Payment Status:') eqfAccount.status = value;
          }
        }
      });
    });

    // Extract inquiries
    $('div:contains("Inquiries")').next().find('p').filter((i, elem) => {
      return ['BMW GREEN', 'NAVY FCU', 'BMW FIN SVC', 'BRCLYSBANKDE', 'CITI CARDS CBNA'].some(creditor => $(elem).text().trim() === creditor);
    }).each((i, elem) => {
      data.inquiries.push({
        creditor: $(elem).text().trim(),
        date: $(elem).next().text().trim() || null,
        bureau: $(elem).next().next().text().trim() || null,
      });
    });

    // Save extracted data
    fs.writeFileSync('report-data.json', JSON.stringify(data, null, 2));
    console.log('📊 Extracted data saved to report-data.json');

    return data;
  } catch (err) {
    console.error('❌ Scraper error:', err.message);
    if (page) await page.screenshot({ path: 'error-page.png' });
    throw new Error(`Scraping failed: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = fetchCreditReport;