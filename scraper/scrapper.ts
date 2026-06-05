import puppeteer, { Browser, Page, BrowserContext } from 'puppeteer';
import * as fs from 'fs';
import { Utils } from './utils';
// import { HttpProxyAgent, HttpProxyAgentOptions } from "http-proxy-agent"
// import { HttpsProxyAgent, HttpsProxyAgentOptions } from "https-proxy-agent"
import axios, { AxiosRequestConfig } from 'axios';
import * as cheerio from 'cheerio';
import UserAgent from 'user-agents';
import { isArray } from 'util';

// Extend Window interface to include credit report properties
declare global {
  interface Window {
    creditReportData?: any;
    reportData?: any;
  }
}

export interface PuppeteerConfig {
  headless: boolean;
  executablePath: string;
  userDataDir: string;
  devtools: boolean;
  args: string[];
  ignoreDefaultArgs: string[];
}

export interface PuppeteerResolution {
  width: number;
  height: number;
}

export interface Evaluations {
  get_ceo_info: string;
  get_state_data: string;
  // Add optional properties to fix type error
  [key: string]: string;
}

export interface PuppeteerSelectors {
  captcha_app: string;
  login_page: string;
  click_to_username_field: string;
  click_to_password_field: string;
  click_to_signin: string;
  search_field: string;
  search_button: string;
  get_search_list: string;
}

export interface PuppeteerConfiguration {
  url: string;
  puppeteerConfig: PuppeteerConfig;
  puppeteerResolution: PuppeteerResolution;
  puppeteerPreloadJs: Array<string>;
  puppeteerHttpHeaders: Record<string, string>;
  evaluations: Evaluations;
  selectors: PuppeteerSelectors;
  useIncognito?: boolean;
}

export interface ScraperInterface {
  Scrap(product: any, username: string, password: any, debug?: boolean): Promise<any>;
  //   Crawl(product: any, debug?: boolean): Promise<any>;
  //   UpdateSingleProduct(newPrice: any, product: any): Promise<any>
}



export class Scraper implements ScraperInterface {
  protected browser!: Browser;
  protected page!: Page;
  protected context: BrowserContext | null = null;
  protected incognito: boolean = false;
  protected conf: PuppeteerConfiguration;
  protected lastPageText: string = '';


  constructor(conf: PuppeteerConfiguration) { 
    this.conf = conf;
    
    // Ensure evaluations are properly loaded from config
    if (!this.conf.evaluations) {
      this.conf.evaluations = {
        get_ceo_info: '',
        get_state_data: ''
      };
    }
    
    console.log('Scraper initialized with config:', {
      url: this.conf.url,
      hasEvaluations: !!this.conf.evaluations,
      evaluationKeys: this.conf.evaluations ? Object.keys(this.conf.evaluations) : []
    });
  }

  protected async initialize() {
    const userAgent = new UserAgent({ deviceCategory: "desktop" });
    this.browser = await puppeteer.launch(this.conf.puppeteerConfig);
    this.incognito = process.env.SCRAPER_INCOGNITO === '1' || !!this.conf.useIncognito;
    if (this.incognito) {
      this.context = await this.browser.createBrowserContext();
      this.page = await this.context.newPage();
    } else {
      this.page = await this.browser.newPage();
    }
    this.page.setUserAgent(userAgent.toString())

    const preloadFile = fs.readFileSync(this.conf.puppeteerPreloadJs[0], { encoding: 'utf-8' });
    await this.page.setViewport(this.conf.puppeteerResolution)
    await this.page.evaluateOnNewDocument(preloadFile)
    await this.page.evaluateOnNewDocument(() => {
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}
    })
    await this.page.setExtraHTTPHeaders(this.conf.puppeteerHttpHeaders)
    // let promises = await Promise.all([
    // ])
  }

  protected async initializeTest() {
    this.browser = await puppeteer.launch();
    this.incognito = process.env.SCRAPER_INCOGNITO === '1' || !!this.conf.useIncognito;
    if (this.incognito) {
      this.context = await this.browser.createBrowserContext();
      this.page = await this.context.newPage();
    } else {
      this.page = await this.browser.newPage();
    }
  }


  protected async navigateTo(url: string) {
    if (!this.page) throw new Error('Page is not initialized. Call initialize() first.');

    await this.page.goto(url);




  }

  public async Scrap(debug = false, username: string, password: any) {
    try {
      console.log('Starting scraping process...');
      if (debug) {
        console.log('Debug mode enabled, additional logs will be shown');
      }
      
      // Initialize browser and page
      console.log('Initializing browser...');
      await this.initialize();
      
      // Navigate to the login URL
      console.log(`Navigating to ${this.conf.url}...`);
      await this.navigateTo(this.conf.url);
      this.lastPageText = '';
      let data = {};
      
      // Set up response interceptor
      this.page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('/dsply.aspx')) {
          const text = await response.text();

          // Remove JSONP wrapper
          const jsonString = text.replace(/^jsonp_callback\(/, '').replace(/\);$/, '');

          // Parse the JSON string
          try {
            // Parse JSON response if applicable
            data = JSON.parse(jsonString);
            console.log('Successfully parsed JSON response data');
          } catch (error) {
            try {
              // If not JSON, parse as text
              const textResponse = await response.text();
              console.log('Response is not JSON, received text response');
            } catch (innerError) {
              console.error('Failed to parse response:', innerError);
              throw innerError;
            }
          }
        }
      });
      
      // Wait for login page elements using selectors from config if available
      console.log('Waiting for login page elements...');
      // Try multiple possible selectors for the login page
      const possibleSelectors = [
        this.conf.selectors?.login_page,
        'button[type="submit"][name="loginbttn"]',
        '.content-wrapper.flex.owler-mod.css-33yiqnal.sign-in',
        '#j_username',
        'input[name="username"]',
        'input[type="text"]'
      ].filter(Boolean);
      
      console.log('Trying possible login selectors:', possibleSelectors);
      
      let selectorFound = false;
      for (const selector of possibleSelectors) {
        try {
          console.log(`Trying selector: ${selector}`);
          await this.page.waitForSelector(selector, { timeout: 10000 });
          console.log(`Found selector: ${selector}`);
          selectorFound = true;
          break;
        } catch (e) {
          console.log(`Selector not found: ${selector}`);
        }
      }
      
      if (!selectorFound) {
        console.error('Could not find any login selectors');
        // Take a screenshot to see what's on the page
        const loginScreenshotPath = './login-page-screenshot.png';
        await this.page.screenshot({ path: loginScreenshotPath, fullPage: true });
        console.log(`Login page screenshot saved to ${loginScreenshotPath}`);
        throw new Error('Could not find any login selectors');
      }
      
      console.log('Login page loaded');
      
      // Use selectors from config for login if available
      console.log('Entering login credentials...');
      
      // Try multiple possible selectors for username field
      const possibleUsernameSelectors = [
        this.conf.selectors?.click_to_username_field,
        '#j_username',
        'input[name="username"]',
        'input[type="text"]',
        'input[placeholder*="user"]',
        'input[placeholder*="email"]'
      ].filter(Boolean);
      
      // Try multiple possible selectors for password field
      const possiblePasswordSelectors = [
        this.conf.selectors?.click_to_password_field,
        '#j_password',
        'input[name="password"]',
        'input[type="password"]',
        'input[placeholder*="password"]'
      ].filter(Boolean);
      
      // Try multiple possible selectors for sign-in button
      const possibleSigninSelectors = [
        this.conf.selectors?.click_to_signin,
        'button[type="submit"][name="loginbttn"]',
        'button[type="submit"]',
        'input[type="submit"]',
        'button:contains("Sign In")',
        'button:contains("Login")',
        'a:contains("Sign In")',
        'a:contains("Login")'
      ].filter(Boolean);
      
      // Find and fill username field
      let usernameField = null;
      for (const selector of possibleUsernameSelectors) {
        try {
          console.log(`Trying username selector: ${selector}`);
          await this.page.waitForSelector(selector, { timeout: 5000 });
          usernameField = selector;
          console.log(`Found username field: ${selector}`);
          break;
        } catch (e) {
          console.log(`Username selector not found: ${selector}`);
        }
      }
      
      if (!usernameField) {
        throw new Error('Could not find username field');
      }
      
      // Find and fill password field
      let passwordField = null;
      for (const selector of possiblePasswordSelectors) {
        try {
          console.log(`Trying password selector: ${selector}`);
          await this.page.waitForSelector(selector, { timeout: 5000 });
          passwordField = selector;
          console.log(`Found password field: ${selector}`);
          break;
        } catch (e) {
          console.log(`Password selector not found: ${selector}`);
        }
      }
      
      if (!passwordField) {
        throw new Error('Could not find password field');
      }
      
      // Enter credentials
      await this.page.type(usernameField, username);
      await this.page.type(passwordField, password);
      
      // Find and click sign-in button
      let signinButton = null;
      for (const selector of possibleSigninSelectors) {
        try {
          console.log(`Trying signin selector: ${selector}`);
          await this.page.waitForSelector(selector, { timeout: 5000 });
          signinButton = selector;
          console.log(`Found signin button: ${selector}`);
          break;
        } catch (e) {
          console.log(`Signin selector not found: ${selector}`);
        }
      }
      
      if (!signinButton) {
        throw new Error('Could not find signin button');
      }
      
      // Click the sign-in button
      await this.page.click(signinButton);
      await this.page.setDefaultNavigationTimeout(60000);

      const dashboardUrl = 'https://app.myfreescorenow.com/dashboard';
      const creditReportUrl = 'https://app.myfreescorenow.com/credit-report';
      console.log('Waiting for dashboard URL after login...');

      const reachedDashboard = await Promise.race([
        this.page.waitForFunction(
          () => window.location.href.includes('/dashboard'),
          { timeout: 20000 }
        ).then(() => true).catch(() => false),
        Utils.Sleep(3000).then(() => this.page.url().includes('/dashboard'))
      ]);

      if (!reachedDashboard) {
        console.log('Dashboard not detected, navigating directly to dashboard URL...');
        try {
          await this.page.goto(dashboardUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        } catch (e) {
          console.log('Direct dashboard navigation failed, continuing to credit-report attempt...');
        }
      }

      console.log('Navigating directly to credit report URL...');
      await this.page.goto(creditReportUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      if (!this.page.url().includes('/credit-report')) {
        throw new Error('Failed to navigate to credit report page');
      }

      const trySelectLatestReportDate = async () => {
        const reportState = await this.page.evaluate(() => {
          const text = document.body?.innerText || '';
          return {
            hasDetailedReport: text.includes('Date of Credit Report:') || text.includes('Creditor Contacts'),
            needsDateSelection: /Select Date/i.test(text)
          };
        }).catch(() => ({ hasDetailedReport: false, needsDateSelection: false }));

        if (reportState.hasDetailedReport || !reportState.needsDateSelection) {
          return;
        }

        const clicked = await this.page.evaluate(() => {
          const normalize = (value = '') => value.replace(/\s+/g, ' ').trim().toLowerCase();
          const controls = Array.from(document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]'));
          const target = controls.find((element) => {
            const htmlElement = element as HTMLElement;
            const inputElement = element as HTMLInputElement;
            const text = normalize(htmlElement.textContent || inputElement.value || htmlElement.getAttribute('aria-label') || '');
            return text === 'select date' || text.includes('select date');
          });

          if (!target) return false;
          (target as HTMLElement).click();
          return true;
        }).catch(() => false);

        if (!clicked) {
          return;
        }

        await Promise.race([
          this.page.waitForFunction(() => {
            const text = document.body?.innerText || '';
            return !/Select Date/i.test(text) && (
              text.includes('Date of Credit Report:') ||
              text.includes('Creditor Contacts') ||
              text.includes('Public Records')
            );
          }, { timeout: 8000 }).catch(() => null),
          Utils.Sleep(1500)
        ]);
      };

      await trySelectLatestReportDate();

      // Try multiple possible selectors for the report container
      const possibleReportContainerSelectors = [
        '.report-container',
        '#report-container',
        '.credit-report',
        '#credit-report',
        '.report-data',
        '.report-content',
        '.report'
      ];
      
      console.log('Waiting for report container...');
      console.log('Trying possible report container selectors:', possibleReportContainerSelectors);
      
      let reportContainerFound = false;
      
      for (const selector of possibleReportContainerSelectors) {
        try {
          console.log(`Trying report container selector: ${selector}`);
          await this.page.waitForSelector(selector, { timeout: 10000 });
          reportContainerFound = true;
          console.log(`Found report container: ${selector}`);
          break;
        } catch (e) {
          console.log(`Report container selector not found: ${selector}`);
        }
      }
      
      if (!reportContainerFound) {
        console.log('Could not find report container, but continuing anyway...');
      }
      // Add a delay to ensure the page fully loads before proceeding
      await Utils.Sleep(10000);
      
      // Take a screenshot to see what's on the page
      console.log('Taking screenshot of the credit report page...');
      const screenshotPath = './credit-report-screenshot.png';
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Screenshot saved to ${screenshotPath}`);
      this.lastPageText = await this.page.evaluate(() => document.body?.innerText || '').catch(() => '');
      
      // Log data to verify what's being captured
      console.log('Data captured from response:', Object.keys(data).length > 0 ? 'Data present' : 'No data captured');
      
      // If no data was captured from the response, try to extract it using evaluations from config
      if (Object.keys(data).length === 0) {
        console.log('Attempting to extract data using evaluations from config...');
        try {
          // Get the page HTML for debugging
          const html = await this.page.content();
          console.log('Page HTML length:', html.length);
          
          // Save HTML for debugging
          fs.writeFileSync('./credit-report-page.html', html);
          console.log('Page HTML saved to ./credit-report-page.html');
          
          // Use the evaluations from the configuration to extract data
          if (this.conf.evaluations) {
            console.log('Using evaluations from config:', this.conf.evaluations);
            
            // Try to get state data using the evaluation from config
            try {
              data = await this.page.evaluate((evalString) => {
                console.log('Evaluating:', evalString);
                try {
                  // Use Function constructor to safely evaluate the string in the page context
                  return Function('return ' + evalString)();
                } catch (e) {
                  console.error('Evaluation error:', e);
                  return null;
                }
              }, this.conf.evaluations.get_state_data);
              
              console.log('State data extracted:', data ? 'Success' : 'Failed');
              
              if (data) {
                console.log('Data keys:', Object.keys(data));
              } else {
                // Fallback to CEO info if state data fails
                data = await this.page.evaluate((evalString) => {
                  console.log('Evaluating CEO info:', evalString);
                  try {
                    return Function('return ' + evalString)();
                  } catch (e) {
                    console.error('CEO info evaluation error:', e);
                    return null;
                  }
                }, this.conf.evaluations.get_ceo_info);
                
                console.log('CEO data extracted:', data ? 'Success' : 'Failed');
              }
            } catch (evalError) {
              console.error('Error during evaluation:', evalError);
            }
          }
          
          // If evaluations didn't work, try to extract from script tags
          if (!data || Object.keys(data).length === 0) {
            console.log('Evaluations failed, trying script tag extraction...');
            data = await this.page.evaluate(() => {
              // Look for any script tags that might contain the report data
              const scripts = Array.from(document.querySelectorAll('script'));
              console.log(`Found ${scripts.length} script tags on the page`);
              
              for (const script of scripts) {
                const content = script.textContent || '';
                if (content.includes('BundleComponents') || content.includes('TrueLinkCreditReportType')) {
                  console.log('Found script with credit report data');
                  try {
                    // Try to extract JSON data from the script content
                    // Using a workaround for the 's' flag which requires ES2018
                    const match = content.match(/\{[\s\S]*\}/);
                    if (match) {
                      return JSON.parse(match[0]);
                    }
                  } catch (e) {
                    console.error('Failed to parse script content:', e);
                  }
                }
              }
              
              // Try to find data in global variables
              if (window.hasOwnProperty('creditReportData') || window.hasOwnProperty('reportData')) {
                console.log('Found global credit report data variable');
                return window.creditReportData || window.reportData;
              }
              
              return {};
            });
          }
          
          console.log('Data extraction result:', Object.keys(data || {}).length > 0 ? 'Data present' : 'No data found');
        } catch (e) {
          console.error('Error extracting data from page:', e);
        }
      }

      console.log('Parsing extracted data...');
      const parsedData = await this.Parse(data);
      console.log('Scraping completed successfully');
      return parsedData;
    } catch (error) {
      console.error('Error during scraping:', error);
      // Save error details for debugging
      if (debug) {
        try {
          const errorScreenshotPath = './error-screenshot.png';
          if (this.page) {
            await this.page.screenshot({ path: errorScreenshotPath, fullPage: true });
            console.log(`Error screenshot saved to ${errorScreenshotPath}`);
            
            const errorHtml = await this.page.content();
            fs.writeFileSync('./error-page.html', errorHtml);
            console.log('Error page HTML saved to ./error-page.html');
          }
        } catch (screenshotError) {
          console.error('Failed to capture error state:', screenshotError);
        }
      }
      throw error;
    } finally {
      console.log('Cleaning up resources...');
      if (!debug) {
        try {
          this.close();
          console.log('Browser closed successfully');
        } catch (closeError) {
          console.error('Error closing browser:', closeError);
        }
      }
    }
  }




  protected async Parse(credit_report: any) {

    try {
      let modifiedReport: any = {};
      let original_report = (credit_report as Object).hasOwnProperty('BundleComponents')
        ? credit_report['BundleComponents']['BundleComponent'] : undefined

      let bureau: any = {
        'TUC': { id: 1, name: 'TransUnion', symbol: 'TUC' },
        'EXP': { id: 2, name: 'Experian', symbol: 'EXP' },
        'EQF': { id: 3, name: 'Equifax', symbol: 'EQF' }
      }
      let merged_credit_report: any = undefined;

      if (original_report) {
        original_report = original_report.filter((obj: any) => { return obj.Type == 'MergeCreditReports' })
        merged_credit_report = (original_report.length) ? original_report[0].TrueLinkCreditReportType : undefined;

        if (merged_credit_report) {
          modifiedReport.CreditReport = [
            {
              "DateReport": "2024-11-26",
              "ReportProvider": "MyFreeScoreNow"
            }]

          //Section Borrower Name 
          const BorrowerName = await this.convertToArrayOfObjects(merged_credit_report.Borrower.BorrowerName)

          modifiedReport.Name = BorrowerName.map((borrower: any) => {

            return {
              "BureauId": bureau[borrower.Source.Bureau.symbol].id,
              "FirstName": borrower.Name.first || '',
              "Middle": borrower.Name.middle || '',
              "LastName": borrower.Name.last || '',
              "NameType": borrower.NameType.description || ''
            }
          })

          //Section Borrower Current Address
          const BorrowerAddress = await this.convertToArrayOfObjects(merged_credit_report.Borrower.BorrowerAddress)

          modifiedReport.Address = BorrowerAddress.map((borrower: any) => {
            return {
              "BureauId": bureau[borrower.Source.Bureau.symbol].id,
              "StreetAddress": borrower.CreditAddress.unparsedStreet || `${borrower.CreditAddress.houseNumber} ${borrower.CreditAddress.streetName} ${borrower.CreditAddress.unit}`,
              "City": borrower.CreditAddress.city,
              "State": borrower.CreditAddress.stateCode,
              "Zip": borrower.CreditAddress.postalCode,
              "AddressType": "Current"
            }
          })

          //Section Borrower Previous Address
          const PreviousAddress = await this.convertToArrayOfObjects(merged_credit_report.Borrower.PreviousAddress)

          modifiedReport.Address = PreviousAddress.map((borrower: any) => {
            return {
              "BureauId": bureau[borrower.Source.Bureau.symbol].id,
              "StreetAddress": borrower.CreditAddress.unparsedStreet || `${borrower.CreditAddress.houseNumber} ${borrower.CreditAddress.streetName} ${borrower.CreditAddress.unit}`,
              "City": borrower.CreditAddress.city,
              "State": borrower.CreditAddress.stateCode,
              "Zip": borrower.CreditAddress.postalCode,
              "AddressType": "Previous"
            }
          })

          //Section Borrower DOB
          const Birth = await this.convertToArrayOfObjects(merged_credit_report.Borrower.Birth)

          modifiedReport.DOB = Birth.map((borrower: any) => {
            // Ensure each object has both BureauId and DOB fields
            return {
              "BureauId": bureau[borrower.Source.Bureau.symbol].id,
              "DOB": borrower.date || "Unknown"
            }
          })

          const CreditScore = await this.convertToArrayOfObjects(merged_credit_report.Borrower.CreditScore)
          //Section Borrower Score
          modifiedReport.Score = CreditScore.map((borrower: any) => {

            return {
              "BureauId": bureau[borrower.Source.Bureau.symbol].id,
              "Score": borrower.riskScore,
              "ScoreType": borrower.scoreName,
              "DateScore": borrower.Source.InquiryDate
            }
          })

          const Employer = await this.convertToArrayOfObjects(merged_credit_report.Borrower.Employer)

          //Section Borrower Employer
          modifiedReport.Employer = Employer.map((borrower: any) => {

            return {
              "BureauId": bureau[borrower.Source.Bureau.symbol].id,
              "EmployerName": borrower.name,
              "DateUpdated": borrower.dateUpdated,
              "DateReported": borrower.dateReported
            }
          })

          merged_credit_report.InquiryPartition = await this.convertToArrayOfObjects(merged_credit_report.InquiryPartition)
          //Section Borrower Inquiries
          modifiedReport.Inquiries = merged_credit_report.InquiryPartition.map((borrower: any) => {

            return {
              "BureauId": bureau[borrower.Inquiry.Source.Bureau.symbol].id,
              "DateInquiry": borrower.Inquiry.inquiryDate,
              "CreditorName": borrower.Inquiry.subscriberName,
              "InquiryType": borrower.Inquiry.inquiryType,
              "Industry": borrower.Inquiry.IndustryCode.description
            }
          })

          const publicRecordPartitions = await this.convertToArrayOfObjects(
            merged_credit_report.PulblicRecordPartition || merged_credit_report.PublicRecordPartition
          )

          modifiedReport.PublicRecords = publicRecordPartitions.flatMap((partition: any) => {
            const publicRecords = Array.isArray(partition?.PublicRecord)
              ? partition.PublicRecord
              : (partition?.PublicRecord ? [partition.PublicRecord] : [])

            return publicRecords
              .filter((publicRecord: any) => publicRecord?.Source?.Bureau?.symbol && bureau[publicRecord.Source.Bureau.symbol])
              .map((publicRecord: any) => {
                return {
                  "BureauId": bureau[publicRecord.Source.Bureau.symbol].id,
                  "Date": publicRecord?.dateFiled || publicRecord?.dateReported || '',
                  "DateFiled": publicRecord?.dateFiled || '',
                  "DateReported": publicRecord?.dateReported || '',
                  "Classification": publicRecord?.Classification?.description || publicRecord?.classification || '',
                  "Status": publicRecord?.Status?.description || publicRecord?.status || '',
                  "Industry": publicRecord?.IndustryCode?.description || publicRecord?.industry || '',
                  "Type": publicRecord?.Type?.description || publicRecord?.type || '',
                  "AccountDesignator": publicRecord?.AccountDesignator?.description || publicRecord?.accountDesignator || '',
                  "ReferenceNumber": publicRecord?.referenceNumber || publicRecord?.ReferenceNumber || publicRecord?.docketNumber || publicRecord?.caseNumber || '',
                  "ClosingDate": publicRecord?.closingDate || publicRecord?.dateClosed || '',
                  "Court": publicRecord?.courtName || publicRecord?.court || publicRecord?.Court?.description || '',
                  "AssetAmount": publicRecord?.assetAmount || '',
                  "Liability": publicRecord?.liability || '',
                  "ExemptAmount": publicRecord?.exemptAmount || '',
                  "Remarks": publicRecord?.Remark?.description || publicRecord?.Remarks?.description || publicRecord?.remarks || ''
                }
              })
          });

          if (modifiedReport.PublicRecords.length === 0 && this.lastPageText) {
            modifiedReport.PublicRecords = this.extractMyFreeScoreNowPublicRecords(this.lastPageText)
          }

          //Section Borrower Accounts
          modifiedReport.Accounts = [];

          merged_credit_report.TradeLinePartition = await this.convertToArrayOfObjects(merged_credit_report.TradeLinePartition)


          merged_credit_report.TradeLinePartition.map((borrower: any) => {
          
            if (!Array.isArray(borrower.Tradeline)) borrower.Tradeline = [borrower.Tradeline]
            let accounts = borrower.Tradeline.map((tradeline: any) => {
              if (!Array.isArray(tradeline?.Remark)) tradeline.Remark = [tradeline.Remark || undefined]
              modifiedReport.Accounts.push({
                "BureauId": bureau[tradeline.Source.Bureau.symbol].id,
                "AccountTypeDescription": borrower.accountTypeDescription,
                "HighBalance": tradeline?.highBalance,
                "DateReported": tradeline?.dateReported,
                "DateOpened": tradeline?.dateOpened,
                "AccountNumber": tradeline?.accountNumber,
                "DateAccountStatus": tradeline?.dateAccountStatus,
                "CurrentBalance": tradeline?.currentBalance,
                "CreditorName": tradeline?.creditorName,
                "AccountCondition": tradeline?.AccountCondition?.description,
                "AccountDesignator": tradeline?.AccountDesignator?.description,
                "DisputeFlag": tradeline?.DisputeFlag?.description,
                "Industry": tradeline?.IndustryCode?.description,
                "AccountStatus": tradeline?.OpenClosed?.description,
                "PaymentStatus": tradeline?.PayStatus?.description,
                "AmountPastDue": tradeline?.GrantedTrade?.amountPastDue,
                "AccountType": tradeline?.GrantedTrade?.AccountType.description,
                "CreditType": tradeline?.GrantedTrade?.CreditType.description,
                "PaymentFrequency": tradeline?.GrantedTrade?.PaymentFrequency?.description,
                "TermType": tradeline?.GrantedTrade?.TermType?.description,
                "WorstPayStatus": tradeline?.GrantedTrade?.WorstPayStatus?.description,
                "PayStatusHistoryStartDate": tradeline?.GrantedTrade?.PayStatusHistory?.startDate,
                "PayStatusHistory": tradeline?.GrantedTrade?.PayStatusHistory?.status,
                "Remark": tradeline.Remark[0]?.RemarkCode.description,
                "CreditLimit": tradeline?.GrantedTrade?.CreditLimit
              })

            })

          })

          //Section Borrower Creditors

          const Subscriber = await this.convertToArrayOfObjects(merged_credit_report.Subscriber)

          modifiedReport.Creditors = Subscriber.map((borrower: any) => {

            return {
              "BureauId": bureau[borrower.Source.Bureau.symbol].id,
              "CreditorName": borrower.name,
              "CreditorAddress": borrower.CreditAddress.unparsedStreet || '',
              "CreditorCity": borrower.CreditAddress.city?.trim(),
              "CreditorState": borrower.CreditAddress.stateCode,
              "CreditorZip": borrower.CreditAddress.postalCode,
              "CreditorPhone": borrower.telephone,
              "Industry": borrower.IndustryCode.description
            }
          })
        }
        modifiedReport.Accounts = modifiedReport.Accounts.sort((a: any, b: any) => a.BureauId - b.BureauId);

      }
      return modifiedReport;

    } catch (error) {
      throw error;
    }

  }

  protected normalizeMyFreeScoreNowValue(value: unknown) {
    const normalized = String(value ?? '').replace(/\u00a0/g, ' ').trim();
    if (!normalized || normalized === '--' || normalized.toLowerCase() === 'n/a') {
      return '';
    }
    return normalized;
  }

  protected extractMyFreeScoreNowPublicRecords(pageText: string) {
    if (!pageText) {
      return [];
    }

    const endIndex = pageText.indexOf('Creditor Contacts');
    if (endIndex === -1) {
      return [];
    }

    const startIndex = pageText.lastIndexOf('Public Records', endIndex);
    if (startIndex === -1 || startIndex >= endIndex) {
      return [];
    }

    const section = pageText
      .slice(startIndex + 'Public Records'.length, endIndex)
      .replace(/\r/g, '');

    const lines = section
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return [];
    }

    const bureauIds = [3, 2, 1];
    const records: Array<Record<string, string | number>> = [];
    let currentType = '';
    let currentRows: Record<string, string[]> = {};

    const flushRecord = () => {
      if (!currentType && Object.keys(currentRows).length === 0) {
        return;
      }

      for (let index = 0; index < bureauIds.length; index += 1) {
        const name = this.normalizeMyFreeScoreNowValue(currentRows.Name?.[index] || currentRows['Name ']?.[index] || '');
        const typeValue = this.normalizeMyFreeScoreNowValue(currentRows.Type?.[index] || '');
        const status = this.normalizeMyFreeScoreNowValue(currentRows.Status?.[index] || '');
        const date = this.normalizeMyFreeScoreNowValue(currentRows['Date Filed/Reported']?.[index] || '');
        const referenceNumber = this.normalizeMyFreeScoreNowValue(currentRows['Reference#']?.[index] || '');
        const closingDate = this.normalizeMyFreeScoreNowValue(currentRows['Closing Date']?.[index] || '');
        const assetAmount = this.normalizeMyFreeScoreNowValue(currentRows['Asset Amount']?.[index] || '');
        const courtValue = this.normalizeMyFreeScoreNowValue(currentRows.Court?.[index] || '');
        const liability = this.normalizeMyFreeScoreNowValue(currentRows.Liability?.[index] || '');
        const exemptAmount = this.normalizeMyFreeScoreNowValue(currentRows['Exempt Amount']?.[index] || '');
        const remarks = this.normalizeMyFreeScoreNowValue(currentRows.Remarks?.[index] || '');
        const hasAnyDetail = [
          name,
          typeValue,
          status,
          date,
          referenceNumber,
          closingDate,
          assetAmount,
          courtValue,
          liability,
          exemptAmount,
          remarks
        ].some(Boolean);

        if (!hasAnyDetail) {
          continue;
        }

        const looksLikeCourt = /bkpt|bankrupt|court|\bct\b|district/i.test(name);
        records.push({
          BureauId: bureauIds[index],
          Date: date,
          DateFiled: date,
          DateReported: date,
          Classification: currentType || typeValue || 'Public Record',
          Status: status,
          Industry: 'Public Record',
          Type: currentType || typeValue || 'Public Record',
          AccountDesignator: '',
          ReferenceNumber: referenceNumber,
          ClosingDate: closingDate,
          Court: courtValue || (looksLikeCourt ? name : ''),
          AssetAmount: assetAmount,
          Liability: liability,
          ExemptAmount: exemptAmount,
          Remarks: remarks,
          Name: name,
          CaseNumber: !looksLikeCourt ? name : ''
        });
      }

      currentType = '';
      currentRows = {};
    };

    for (const line of lines) {
      if (!line.includes('\t') && !line.includes(':')) {
        flushRecord();
        currentType = this.normalizeMyFreeScoreNowValue(line);
        continue;
      }

      const parts = line.split('\t').map((part) => part.trim());
      if (parts.length < 2) {
        continue;
      }

      const label = parts[0].replace(/\s*:\s*$/, '');
      const values = parts.slice(1, 4).map((value) => this.normalizeMyFreeScoreNowValue(value));
      while (values.length < 3) {
        values.push('');
      }

      currentRows[label] = values;
    }

    flushRecord();
    return records;
  }

  protected async convertToArrayOfObjects(variable:any) {
    if (Array.isArray(variable)) {
      return variable; // Return as is if it's already an array
    } else if (typeof variable === 'object' && variable !== null) {
      return [variable]; // Convert object to array of objects
    }
    return []; // Return empty array for other data types
  }

  protected async close() {
    if (!this.browser) throw new Error('Browser is not initialized. Call initialize() first.');

    try {
      if (this.page) await this.page.close();
    } catch (error) {
      console.log('Warning: Error closing page, it may already be closed');
    }
    
    try {
      if (this.incognito && this.context) await this.context.close();
    } catch (error) {
      console.log('Warning: Error closing context, it may already be closed');
    }
    
    try {
      await this.browser.close();
    } catch (error) {
      console.log('Warning: Error closing browser, it may already be closed');
    }
  }
}






