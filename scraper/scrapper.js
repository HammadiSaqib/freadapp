import puppeteer from 'puppeteer';
import fs from 'fs';
import axios from 'axios';
import * as cheerio from 'cheerio';
import UserAgent from 'user-agents';
import { normalizeUnifiedDob, normalizeYearOnlyDob } from '../shared/partialDob.js';

// Sleep utility compatible across Puppeteer versions
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export class Scraper {
  constructor(conf) { 
    this.conf = conf;
    this.lastPageText = '';
  }

  async initialize() {
    const userAgent = new UserAgent({ deviceCategory: "desktop" });
    const configuredHeadless = this.conf?.puppeteerConfig?.headless;
    const forceHeaded = process.env.SCRAPER_HEADED === '1' || configuredHeadless === false;

    // Use effective puppeteer configuration and force headed mode when requested
    const puppeteerConfig = {
      ...this.conf.puppeteerConfig,
      headless: forceHeaded ? false : configuredHeadless,
      devtools: forceHeaded ? true : !!this.conf.puppeteerConfig.devtools,
      args: this.conf.puppeteerConfig.args || []
    };

    console.log('Launching Puppeteer with mode:', {
      headless: puppeteerConfig.headless,
      devtools: puppeteerConfig.devtools,
      forceHeaded
    });
    
    this.browser = await puppeteer.launch(puppeteerConfig);
    this.page = await this.browser.newPage();
    this.page.setUserAgent(userAgent.toString())

    // Check if preload file exists before reading
    if (this.conf.puppeteerPreloadJs && this.conf.puppeteerPreloadJs[0] && fs.existsSync(this.conf.puppeteerPreloadJs[0])) {
      const preloadFile = fs.readFileSync(this.conf.puppeteerPreloadJs[0], { encoding: 'utf-8' });
      await this.page.evaluateOnNewDocument(preloadFile);
    }
    
    await this.page.setViewport(this.conf.puppeteerResolution)
    await this.page.setExtraHTTPHeaders(this.conf.puppeteerHttpHeaders)
  }

  async initializeTest() {
    this.browser = await puppeteer.launch();
    this.page = await this.browser.newPage();
  }

  async navigateTo(url) {
    if (!this.page) throw new Error('Page is not initialized. Call initialize() first.');
    await this.page.goto(url);
  }

  async Scrap(debug = false, username, password) {
    try {
      await this.initialize();
      await this.navigateTo(this.conf.url);
      this.lastPageText = '';
      let data = {};
      const responseCandidates = [];
      const inquiryPayloadsByBureau = { EFX: [], EXP: [], TU: [] };

      const inquiryEndpoints = {
        EFX: 'https://api.myfreescorenow.com/api/member/equifax/inquiries',
        EXP: 'https://api.myfreescorenow.com/api/member/experian/inquiries',
        TU: 'https://api.myfreescorenow.com/api/member/transunion/inquiries',
      };

      const inferBureauFromUrl = (url = '') => {
        const u = String(url).toLowerCase();
        if (u.includes('/equifax/')) return 'EFX';
        if (u.includes('/experian/')) return 'EXP';
        if (u.includes('/transunion/')) return 'TU';
        return '';
      };

      const addInquiryPayload = (url, payload) => {
        const bureau = inferBureauFromUrl(url);
        if (!bureau || !payload || typeof payload !== 'object') return;
        inquiryPayloadsByBureau[bureau].push(payload);
      };

      const countInquiryPayloads = (source) => {
        return ['EFX', 'EXP', 'TU'].reduce((sum, bureau) => {
          const value = source?.[bureau];
          if (Array.isArray(value)) return sum + value.length;
          return sum + (value ? 1 : 0);
        }, 0);
      };

      const hasInquiryLikeData = (node, depth = 0) => {
        if (depth > 8 || node === null || node === undefined) return false;
        if (Array.isArray(node)) return node.some((item) => hasInquiryLikeData(item, depth + 1));
        if (typeof node !== 'object') return false;

        for (const [key, value] of Object.entries(node)) {
          const k = String(key).toLowerCase();
          if (k.includes('inquir') && value) {
            if (Array.isArray(value) && value.length > 0) return true;
            if (typeof value === 'object') return true;
          }
          if (hasInquiryLikeData(value, depth + 1)) return true;
        }
        return false;
      };

      const fetchInquiriesPerBureau = async () => {
        if (!this.page) return { EFX: [], EXP: [], TU: [] };
        const result = await this.page.evaluate(async (endpoints) => {
          const out = { EFX: [], EXP: [], TU: [] };
          const entries = Object.entries(endpoints || {});

          for (const [bureau, url] of entries) {
            try {
              const response = await fetch(url, {
                method: 'POST',
                credentials: 'include',
                headers: {
                  'content-type': 'application/json',
                },
                body: '{}',
              });

              if (!response.ok) continue;
              const text = await response.text();
              if (!text) continue;

              let parsed = null;
              try {
                parsed = JSON.parse(text);
              } catch (_) {
                continue;
              }
              out[bureau] = parsed;
            } catch (_) {
              // continue best-effort
            }
          }

          return out;
        }, inquiryEndpoints);

        return result || { EFX: [], EXP: [], TU: [] };
      };

      // Fallback: fetch credit report JSON per bureau if not captured automatically
      const reportEndpoints = {
        EFX: 'https://api.myfreescorenow.com/api/member/equifax/credit-report',
        EXP: 'https://api.myfreescorenow.com/api/member/experian/credit-report',
        TU:  'https://api.myfreescorenow.com/api/member/transunion/credit-report',
      };

      const fetchReportsPerBureau = async () => {
        if (!this.page) return { EFX: null, EXP: null, TU: null };
        const result = await this.page.evaluate(async (endpoints) => {
          const out = { EFX: null, EXP: null, TU: null };
          // Extract CSRF token from cookies and possible Bearer token from localStorage
          const cookieStr = document.cookie || '';
          const cookieMap = cookieStr.split(';').reduce((acc, c) => {
            const parts = c.split('=');
            const k = (parts.shift() || '').trim();
            const v = decodeURIComponent(parts.join('='));
            if (k) acc[k] = v;
            return acc;
          }, {});
          const xsrf = cookieMap['XSRF-TOKEN'] || cookieMap['xsrf-token'] || cookieMap['X_XSRF_TOKEN'] || cookieMap['csrf'] || cookieMap['csrftoken'] || null;
          let auth = null;
          try {
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              const val = (localStorage.getItem(key) || '').trim();
              if (/^Bearer\s+/i.test(val)) { auth = val; break; }
              if (key && /token|auth|access/i.test(key) && val && val.length > 10) { auth = 'Bearer ' + val.replace(/^"|"$/g, ''); break; }
            }
          } catch {}
          const buildHeaders = () => {
            const h = { 'content-type': 'application/json' };
            if (xsrf) h['x-xsrf-token'] = xsrf;
            if (auth) h['authorization'] = auth;
            return h;
          };

          const entries = Object.entries(endpoints || {});
          for (const [bureau, url] of entries) {
            try {
              let response = await fetch(url, {
                method: 'POST',
                credentials: 'include',
                headers: buildHeaders(),
                body: '{}',
              });
              if (!response.ok) {
                // Retry as GET if POST is not accepted
                response = await fetch(url, {
                  method: 'GET',
                  credentials: 'include',
                  headers: buildHeaders()
                });
              }
              if (!response.ok) continue;
              const text = await response.text();
              if (!text) continue;
              try { out[bureau] = JSON.parse(text); } catch {}
            } catch {}
          }
          return out;
        }, reportEndpoints);
        return result || { EFX: null, EXP: null, TU: null };
      };

      const scorePayload = (payload, url) => {
        let score = 0;
        if (!payload || typeof payload !== 'object') return score;
        if (payload.BundleComponents) score += 10;
        if (payload.TrueLinkCreditReportType) score += 10;
        if (payload.rawCreditData) score += 8;
        if (payload.sections) score += 6;
        if (payload.CreditReport || payload.Score || payload.Accounts) score += 5;
        if (url.includes('/dsply.aspx')) score += 4;
        if (url.includes('credit-report')) score += 2;
        return score;
      };

      const collectCandidate = (payload, url) => {
        if (!payload || typeof payload !== 'object') return;
        responseCandidates.push({ payload, url, score: scorePayload(payload, url) });
      };

      const tryParsePayloads = (text) => {
        const parsed = [];
        if (!text || typeof text !== 'string') return parsed;

        try {
          parsed.push(JSON.parse(text));
        } catch (_) {
          // continue
        }

        const jsonpMatch = text.match(/^[\w$]+\((.*)\);?$/s);
        if (jsonpMatch && jsonpMatch[1]) {
          try {
            parsed.push(JSON.parse(jsonpMatch[1]));
          } catch (_) {
            // continue
          }
        }

        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace) {
          const maybeJson = text.slice(firstBrace, lastBrace + 1);
          try {
            parsed.push(JSON.parse(maybeJson));
          } catch (_) {
            // continue
          }
        }

        return parsed;
      };

      this.page.on('response', async (response) => {
        const url = response.url();
        const lowerUrl = url.toLowerCase();
        const headers = response.headers() || {};
        const contentType = (headers['content-type'] || '').toLowerCase();
        const isLikelyReportPayload =
          lowerUrl.includes('/dsply.aspx') ||
          lowerUrl.includes('/credit-report') ||
          lowerUrl.includes('report') ||
          lowerUrl.includes('bundle') ||
          contentType.includes('application/json') ||
          contentType.includes('text/javascript');

        if (!isLikelyReportPayload) return;

        let text;
        try {
          text = await response.text();
        } catch (_) {
          return;
        }

        const parsedPayloads = tryParsePayloads(text);
        if (parsedPayloads.length > 0) {
          for (const payload of parsedPayloads) {
            collectCandidate(payload, url);
            if (lowerUrl.includes('inquir')) addInquiryPayload(url, payload);
          }

          const bestCandidate = responseCandidates
            .slice()
            .sort((a, b) => b.score - a.score)[0];

          if (bestCandidate && bestCandidate.score > 0) {
            data = bestCandidate.payload;
          }
          return;
        }

        if (lowerUrl.includes('/dsply.aspx')) {
          try {
            const jsonString = text.replace(/^jsonp_callback\(/, '').replace(/\);$/, '');
            const parsed = JSON.parse(jsonString);
            collectCandidate(parsed, url);
            data = parsed;
          } catch (_) {
            // ignore non-JSONP responses
          }
        }
      });
      // Wait for login fields and perform login using resilient selectors
      const possibleUsernameSelectors = [
        this.conf.selectors?.click_to_username_field,
        '#email',
        'input[name="email"]',
        'input[type="email"]',
        '#j_username',
        'input[name="username"]',
        'input[autocomplete="username"]',
        'input[type="text"]'
      ].filter(Boolean);

      const possiblePasswordSelectors = [
        this.conf.selectors?.click_to_password_field,
        '#password',
        'input[name="password"]',
        'input[type="password"]',
        'input[autocomplete="current-password"]',
        '#j_password'
      ].filter(Boolean);

      const possibleSigninSelectors = [
        this.conf.selectors?.click_to_signin,
        'button[type="submit"]',
        'input[type="submit"]'
      ].filter(Boolean);

      const isHeadlessRun = !(process.env.SCRAPER_HEADED === '1') && this.conf?.puppeteerConfig?.headless !== false;
      const selectorTimeout = isHeadlessRun ? 5000 : 2500;
      let skipLogin = false;

      // In headless mode, SPA hydration can lag a little; wait for any login-like input before selector loops.
      await this.page.waitForFunction(() => {
        return Boolean(
          document.querySelector('#email') ||
          document.querySelector('input[name="email"]') ||
          document.querySelector('input[type="email"]') ||
          document.querySelector('#j_username') ||
          document.querySelector('input[name="username"]') ||
          document.querySelector('input[type="text"]')
        );
      }, { timeout: isHeadlessRun ? 9000 : 4000 }).catch(() => null);

      let usernameSelector = null;
      for (const selector of possibleUsernameSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: selectorTimeout });
          usernameSelector = selector;
          break;
        } catch (e) {
          // continue
        }
      }
      if (!usernameSelector) {
        const authenticatedSessionDetected = await this.page.evaluate(() => {
          const href = (window.location.href || '').toLowerCase();
          if (
            href.includes('/dashboard') ||
            href.includes('/credit-report') ||
            href.includes('/billing') ||
            href.includes('/account')
          ) {
            return true;
          }

          const text = (document.body?.innerText || '').toLowerCase();
          return (
            text.includes('log out') ||
            text.includes('logout') ||
            text.includes('sign out') ||
            text.includes('credit report') ||
            text.includes('billing date') ||
            text.includes('billing frequency')
          );
        }).catch(() => false);

        if (authenticatedSessionDetected) {
          skipLogin = true;
          console.log('Login form not present; continuing with detected authenticated session.');
        }

        if (!skipLogin) {
        if (isHeadlessRun) {
          try {
            fs.mkdirSync('./scraper-output/debug', { recursive: true });
            await this.page.screenshot({ path: './scraper-output/debug/headless-login-missing-field.png', fullPage: true });
            const html = await this.page.content();
            fs.writeFileSync('./scraper-output/debug/headless-login-missing-field.html', html);
          } catch (_) {
            // no-op
          }
        }
        throw new Error('Could not find username/email field');
        }
      }

      if (!skipLogin) {
        let passwordSelector = null;
        for (const selector of possiblePasswordSelectors) {
          try {
            await this.page.waitForSelector(selector, { timeout: selectorTimeout });
            passwordSelector = selector;
            break;
          } catch (e) {
            // continue
          }
        }
        if (!passwordSelector) throw new Error('Could not find password field');

        await this.page.click(usernameSelector, { clickCount: 3 });
        await this.page.type(usernameSelector, username);
        await this.page.click(passwordSelector, { clickCount: 3 });
        await this.page.type(passwordSelector, password);

        let signinClicked = false;
        for (const selector of possibleSigninSelectors) {
          try {
            await this.page.waitForSelector(selector, { timeout: selectorTimeout });
            await this.page.click(selector);
            signinClicked = true;
            break;
          } catch (e) {
            // continue
          }
        }

        // Fallback: click button by visible text for MUI/SPA logins
        if (!signinClicked) {
          signinClicked = await this.page.evaluate(() => {
            const candidates = Array.from(document.querySelectorAll('button, input[type="submit"], [role="button"]'));
            const btn = candidates.find((el) => {
              const text = (el.textContent || el.getAttribute('value') || '').trim().toLowerCase();
              return text === 'login' || text.includes('log in') || text.includes('sign in');
            });
            if (!btn) return false;
            btn.click();
            return true;
          });
        }

        if (!signinClicked) {
          throw new Error('Could not find/click login submit button');
        }

        await this.page.setDefaultNavigationTimeout(30000);
        await Promise.race([
          this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => null),
          sleep(1500)
        ]);
      }

      // Ensure dashboard page is loaded after login, then navigate directly to report page
      const dashboardUrl = 'https://app.myfreescorenow.com/dashboard';
      const creditReportUrl = 'https://app.myfreescorenow.com/credit-report';
      const equifaxReportEndpoint = 'https://api.myfreescorenow.com/api/member/equifax/credit-report';

      const reachedDashboard = await Promise.race([
        this.page.waitForFunction(
          () => window.location.href.includes('/dashboard'),
          { timeout: 10000 }
        ).then(() => true).catch(() => false),
        sleep(1000).then(() => this.page.url().includes('/dashboard'))
      ]);

      if (!reachedDashboard) {
        try {
          await this.page.goto(dashboardUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        } catch (e) {
          // continue to credit-report attempt below
        }
      }

      const exactReportResponsePromise = this.page.waitForResponse((res) => {
        if (res.url() !== equifaxReportEndpoint) return false;
        if (res.request().method() !== 'POST') return false;
        const postData = (res.request().postData() || '').trim();
        return postData === '{}' || postData === '';
      }, { timeout: 12000 }).catch(() => null);

      await this.page.goto(creditReportUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
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
            const text = normalize(element.textContent || element.value || element.getAttribute('aria-label') || '');
            return text === 'select date' || text.includes('select date');
          });

          if (!target) return false;
          target.click();
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
          sleep(1500)
        ]);
      };

      await trySelectLatestReportDate();

      const exactReportResponse = await exactReportResponsePromise;
      if (exactReportResponse) {
        try {
          const responseText = await exactReportResponse.text();
          const parsedPayloads = tryParsePayloads(responseText);
          if (parsedPayloads.length > 0) {
            for (const payload of parsedPayloads) {
              collectCandidate(payload, equifaxReportEndpoint);
            }
            const bestExact = parsedPayloads
              .slice()
              .sort((a, b) => scorePayload(b, equifaxReportEndpoint) - scorePayload(a, equifaxReportEndpoint))[0];
            if (bestExact) data = bestExact;
            console.log('Captured exact Equifax report XHR response');
          }
        } catch (e) {
          console.log('Failed to parse exact Equifax report XHR response');
        }
      }

      // Allow API/XHR calls to settle and capture payload responses
      await Promise.race([
        this.page.waitForResponse((res) => {
          const u = res.url().toLowerCase();
          return u.includes('/dsply.aspx') || u.includes('credit-report') || u.includes('report');
        }, { timeout: 7000 }).catch(() => null),
        sleep(2000)
      ]);

      if (responseCandidates.length > 0) {
        const best = responseCandidates.slice().sort((a, b) => b.score - a.score)[0];
        if (best && best.payload) {
          data = best.payload;
          console.log(`Using best captured JSON candidate by score: ${best.score}`);
        }
      }

      console.log('Captured JSON response candidates:', responseCandidates.length);

      // If we still don't have a convincing report payload, try explicit fetch to credit-report endpoints
      const looksLikeReport = (obj) => {
        if (!obj || typeof obj !== 'object') return false;
        return Boolean(
          obj.BundleComponents || obj.TrueLinkCreditReportType || obj.rawCreditData || obj.sections ||
          obj.CreditReport || obj.Score || obj.Accounts
        );
      };

      if (!data || Object.keys(data).length === 0 || !looksLikeReport(data)) {
        try {
          const reports = await fetchReportsPerBureau();
          const preferred = reports.EFX || reports.EXP || reports.TU;
          if (preferred && looksLikeReport(preferred)) {
            data = preferred;
            console.log('Using fallback bureau credit-report fetch');
          }
        } catch {}
      }

      if (responseCandidates.length > 0) {
        try {
          const latest = responseCandidates[responseCandidates.length - 1];
          if (latest) {
            const captureDir = './scraper-output/captured-json';
            fs.mkdirSync(captureDir, { recursive: true });
            const selectedLatestPayload = {
              selectedStrategy: 'latest-candidate',
              selectedIndex: responseCandidates.length,
              totalCandidates: responseCandidates.length,
              url: latest.url,
              score: latest.score,
              capturedAt: new Date().toISOString(),
              data: latest.payload
            };
            fs.writeFileSync(`${captureDir}/selected_latest.json`, JSON.stringify(selectedLatestPayload, null, 2));
            console.log('Saved selected latest JSON candidate to: ./scraper-output/captured-json/selected_latest.json');
          }
        } catch (saveCandidatesError) {
          console.error('Failed to save captured JSON candidates:', saveCandidatesError?.message || saveCandidatesError);
        }
      }

      const payloadRoot = (data && data.data && data.data.data)
        ? data.data.data
        : (data && data.reportData && data.reportData.data)
          ? data.reportData.data
          : data;

      if (payloadRoot && typeof payloadRoot === 'object' && this.lastPageText) {
        const domPublicRecords = this.extractMyFreeScoreNowPublicRecords(this.lastPageText);
        const existingPublicRecords = Array.isArray(payloadRoot.PublicRecords)
          ? payloadRoot.PublicRecords
          : Array.isArray(payloadRoot.publicRecords)
            ? payloadRoot.publicRecords
            : [];

        if (domPublicRecords.length > 0 && existingPublicRecords.length === 0) {
          payloadRoot.PublicRecords = domPublicRecords;
          console.log(`Attached public records from rendered report section (${domPublicRecords.length} records)`);
        }
      }

      if (payloadRoot && typeof payloadRoot === 'object' && !hasInquiryLikeData(payloadRoot)) {
        const fromCaptured = inquiryPayloadsByBureau;
        const capturedCount = countInquiryPayloads(fromCaptured);

        if (capturedCount > 0) {
          payloadRoot.fetchedInquiries = fromCaptured;
          console.log(`Attached inquiries from captured responses (${capturedCount} payloads)`);
        } else {
          const fetchedInquiries = await fetchInquiriesPerBureau();
          const fetchedCount = countInquiryPayloads(fetchedInquiries);
          if (fetchedCount > 0) {
            payloadRoot.fetchedInquiries = fetchedInquiries;
            console.log(`Fetched fallback inquiries per bureau (${fetchedCount} payloads)`);
          } else {
            console.log('No inquiry data found in raw payload or fallback inquiry endpoints');
          }
        }
      }

      // Try multiple possible selectors for the report container and do not hard-fail
      const possibleReportContainerSelectors = [
        '.report-container',
        '#report-container',
        '.credit-report',
        '#credit-report',
        '.report-data',
        '.report-content',
        '.report'
      ];

      let reportContainerFound = false;
      for (const selector of possibleReportContainerSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 2500 });
          reportContainerFound = true;
          break;
        } catch (e) {
          // continue to next selector
        }
      }

      // Even if the container isn’t found, continue and try extracting data
      await sleep(2000);

      // Take a screenshot for debugging
      if (debug) {
        const screenshotPath = './credit-report-screenshot.png';
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
      }

      this.lastPageText = await this.page.evaluate(() => document.body?.innerText || '').catch(() => '');

      // If no data was captured from responses, try extracting from the page
      if (!data || Object.keys(data).length === 0) {
        try {
          const html = await this.page.content();
          fs.writeFileSync('./credit-report-page.html', html);

          // Try evaluations from config if available
          if (this.conf && this.conf.evaluations) {
            try {
              const stateData = await this.page.evaluate((evalString) => {
                try {
                  return Function('return ' + evalString)();
                } catch (e) {
                  return null;
                }
              }, this.conf.evaluations.get_state_data);
              if (stateData) data = stateData;
            } catch (e) {
              // ignore evaluation errors
            }
            if (!data || Object.keys(data).length === 0) {
              try {
                const ceoData = await this.page.evaluate((evalString) => {
                  try {
                    return Function('return ' + evalString)();
                  } catch (e) {
                    return null;
                  }
                }, this.conf.evaluations.get_ceo_info);
                if (ceoData) data = ceoData;
              } catch (e) {
                // ignore evaluation errors
              }
            }
          }

          // If still empty, try to extract JSON from script tags
          if (!data || Object.keys(data).length === 0) {
            data = await this.page.evaluate(() => {
              const scripts = Array.from(document.querySelectorAll('script'));
              for (const script of scripts) {
                const content = script.textContent || '';
                if (content.includes('BundleComponents') || content.includes('TrueLinkCreditReportType')) {
                  try {
                    const match = content.match(/\{[\s\S]*\}/);
                    if (match) {
                      return JSON.parse(match[0]);
                    }
                  } catch (e) {
                    // continue
                  }
                }
              }
              if (window.hasOwnProperty('creditReportData') || window.hasOwnProperty('reportData')) {
                return window.creditReportData || window.reportData;
              }
              return {};
            });
          }
        } catch (extractionError) {
          // continue even if extraction fails, Parse will handle empty data
        }
      }

      const parsedReport = await this.Parse(data);
      if (parsedReport && Object.keys(parsedReport).length > 0) {
        return parsedReport;
      }
      return data;
    } catch (error) {
      console.log(error);
      throw error;
    } finally {
      if (!debug) this.close();
    }
  }

  async Parse(credit_report) {
    try {
      // Check for MyScoreIQ structure (rawCreditData + sections)
      if (credit_report.rawCreditData || credit_report.sections || Array.isArray(credit_report.data)) {
        return this.parseMyScoreIQ(
          credit_report.rawCreditData || credit_report.sections
            ? credit_report
            : { rawCreditData: credit_report }
        );
      }

      let modifiedReport = {};
      let original_report = (credit_report.hasOwnProperty('BundleComponents'))
        ? credit_report['BundleComponents']['BundleComponent'] : undefined

      let bureau = {
        'TUC': { id: 1, name: 'TransUnion', symbol: 'TUC' },
        'EXP': { id: 2, name: 'Experian', symbol: 'EXP' },
        'EQF': { id: 3, name: 'Equifax', symbol: 'EQF' }
      }
      const attr = (obj, key) => obj?.[key] ?? obj?.[`@${key}`] ?? '';
      const desc = (obj) => attr(obj, 'description');
      const bureauIdFromSource = (source) => bureau[attr(source?.Bureau, 'symbol')]?.id || 0;
      let merged_credit_report = undefined;

      if (original_report) {
        original_report = original_report.filter((obj) => {
          const typeValue = obj?.Type?.$ || obj?.Type?.['@description'] || obj?.Type?.description || obj?.Type;
          return typeValue === 'MergeCreditReports' || Boolean(obj?.TrueLinkCreditReportType?.Borrower);
        })
        merged_credit_report = (original_report.length) ? original_report[0].TrueLinkCreditReportType : undefined;

        if (merged_credit_report) {
          modifiedReport.CreditReport = [
            {
              "DateReport": "2024-11-26",
              "ReportProvider": "MyFreeScoreNow"
            }]

          //Section Borrower Name 
          const BorrowerName = await this.convertToArrayOfObjects(merged_credit_report.Borrower.BorrowerName)

          modifiedReport.Name = BorrowerName.map((borrower) => {
            return {
              "BureauId": bureauIdFromSource(borrower.Source),
              "FirstName": attr(borrower.Name, 'first') || '',
              "Middle": attr(borrower.Name, 'middle') || '',
              "LastName": attr(borrower.Name, 'last') || '',
              "NameType": desc(borrower.NameType) || ''
            }
          })

          //Section Borrower Current Address
          const BorrowerAddress = await this.convertToArrayOfObjects(merged_credit_report.Borrower.BorrowerAddress)

          modifiedReport.Address = BorrowerAddress.map((borrower) => {
            return {
              "BureauId": bureauIdFromSource(borrower.Source),
              "StreetAddress": attr(borrower.CreditAddress, 'unparsedStreet') || `${attr(borrower.CreditAddress, 'houseNumber')} ${attr(borrower.CreditAddress, 'streetName')} ${attr(borrower.CreditAddress, 'unit')}`,
              "City": attr(borrower.CreditAddress, 'city'),
              "State": attr(borrower.CreditAddress, 'stateCode'),
              "Zip": attr(borrower.CreditAddress, 'postalCode'),
              "AddressType": "Current"
            }
          })

          //Section Borrower Previous Address
          const PreviousAddress = await this.convertToArrayOfObjects(merged_credit_report.Borrower.PreviousAddress)

          modifiedReport.Address = PreviousAddress.map((borrower) => {
            return {
              "BureauId": bureauIdFromSource(borrower.Source),
              "StreetAddress": attr(borrower.CreditAddress, 'unparsedStreet') || `${attr(borrower.CreditAddress, 'houseNumber')} ${attr(borrower.CreditAddress, 'streetName')} ${attr(borrower.CreditAddress, 'unit')}`,
              "City": attr(borrower.CreditAddress, 'city'),
              "State": attr(borrower.CreditAddress, 'stateCode'),
              "Zip": attr(borrower.CreditAddress, 'postalCode'),
              "AddressType": "Previous"
            }
          })

          //Section Borrower DOB
          const Birth = await this.convertToArrayOfObjects(merged_credit_report.Borrower.Birth)

          modifiedReport.DOB = Birth.map((borrower) => {
            return {
              "BureauId": bureauIdFromSource(borrower.Source),
              "DOB": normalizeUnifiedDob(attr(borrower, 'date'))
            }
          })

          const CreditScore = await this.convertToArrayOfObjects(merged_credit_report.Borrower.CreditScore)
          //Section Borrower Score
          modifiedReport.Score = CreditScore.map((borrower) => {
            return {
              "BureauId": bureauIdFromSource(borrower.Source),
              "Score": attr(borrower, 'riskScore'),
              "ScoreType": attr(borrower, 'scoreName'),
              "DateScore": borrower.Source.InquiryDate
            }
          })

          const Employer = await this.convertToArrayOfObjects(merged_credit_report.Borrower.Employer)

          //Section Borrower Employer
          modifiedReport.Employer = Employer.map((borrower) => {
            return {
              "BureauId": bureauIdFromSource(borrower.Source),
              "EmployerName": attr(borrower, 'name'),
              "DateUpdated": attr(borrower, 'dateUpdated'),
              "DateReported": attr(borrower, 'dateReported')
            }
          })

          merged_credit_report.InquiryPartition = await this.convertToArrayOfObjects(merged_credit_report.InquiryPartition)
          //Section Borrower Inquiries
          modifiedReport.Inquiries = merged_credit_report.InquiryPartition.map((borrower) => {
            return {
              "BureauId": bureauIdFromSource(borrower.Inquiry?.Source),
              "DateInquiry": attr(borrower.Inquiry, 'inquiryDate'),
              "CreditorName": attr(borrower.Inquiry, 'subscriberName'),
              "InquiryType": attr(borrower.Inquiry, 'inquiryType'),
              "Industry": desc(borrower.Inquiry?.IndustryCode)
            }
          })

          const publicRecordPartitions = await this.convertToArrayOfObjects(
            merged_credit_report.PulblicRecordPartition || merged_credit_report.PublicRecordPartition
          );

          modifiedReport.PublicRecords = publicRecordPartitions.flatMap((partition) => {
            const publicRecords = Array.isArray(partition?.PublicRecord)
              ? partition.PublicRecord
              : (partition?.PublicRecord ? [partition.PublicRecord] : []);

            return publicRecords
              .filter((publicRecord) => bureauIdFromSource(publicRecord?.Source))
              .map((publicRecord) => {
                return {
                  "BureauId": bureauIdFromSource(publicRecord.Source),
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
              });
          });

          if (modifiedReport.PublicRecords.length === 0 && this.lastPageText) {
            modifiedReport.PublicRecords = this.extractMyFreeScoreNowPublicRecords(this.lastPageText);
          }

          //Section Borrower Accounts
          modifiedReport.Accounts = [];

          merged_credit_report.TradeLinePartition = await this.convertToArrayOfObjects(merged_credit_report.TradeLinePartition)

          merged_credit_report.TradeLinePartition.map((borrower) => {
            if (!Array.isArray(borrower.Tradeline)) borrower.Tradeline = [borrower.Tradeline]
            let accounts = borrower.Tradeline.map((tradeline) => {
              if (!Array.isArray(tradeline?.Remark)) tradeline.Remark = [tradeline.Remark || undefined]
              modifiedReport.Accounts.push({
                "BureauId": bureauIdFromSource(tradeline.Source),
                "AccountTypeDescription": attr(borrower, 'accountTypeDescription'),
                "HighBalance": attr(tradeline, 'highBalance'),
                "DateReported": attr(tradeline, 'dateReported'),
                "DateOpened": attr(tradeline, 'dateOpened'),
                "AccountNumber": attr(tradeline, 'accountNumber'),
                "DateAccountStatus": attr(tradeline, 'dateAccountStatus'),
                "CurrentBalance": attr(tradeline, 'currentBalance'),
                "CreditorName": attr(tradeline, 'creditorName'),
                "AccountCondition": desc(tradeline?.AccountCondition),
                "AccountDesignator": desc(tradeline?.AccountDesignator),
                "DisputeFlag": desc(tradeline?.DisputeFlag),
                "Industry": desc(tradeline?.IndustryCode),
                "AccountStatus": desc(tradeline?.OpenClosed),
                "PaymentStatus": desc(tradeline?.PayStatus),
                "AmountPastDue": attr(tradeline?.GrantedTrade, 'amountPastDue'),
                "AccountType": desc(tradeline?.GrantedTrade?.AccountType),
                "CreditType": desc(tradeline?.GrantedTrade?.CreditType),
                "PaymentFrequency": desc(tradeline?.GrantedTrade?.PaymentFrequency),
                "TermType": desc(tradeline?.GrantedTrade?.TermType),
                "WorstPayStatus": desc(tradeline?.GrantedTrade?.WorstPayStatus),
                "PayStatusHistoryStartDate": attr(tradeline?.GrantedTrade?.PayStatusHistory, 'startDate'),
                "PayStatusHistory": attr(tradeline?.GrantedTrade?.PayStatusHistory, 'status'),
                "Remark": desc(tradeline.Remark[0]?.RemarkCode),
                "CreditLimit": tradeline?.GrantedTrade?.CreditLimit
              })
            })
          })

          //Section Borrower Creditors
          const Subscriber = await this.convertToArrayOfObjects(merged_credit_report.Subscriber)

          modifiedReport.Creditors = Subscriber.map((borrower) => {
            return {
              "BureauId": bureauIdFromSource(borrower.Source),
              "CreditorName": attr(borrower, 'name'),
              "CreditorAddress": attr(borrower.CreditAddress, 'unparsedStreet') || '',
              "CreditorCity": attr(borrower.CreditAddress, 'city')?.trim(),
              "CreditorState": attr(borrower.CreditAddress, 'stateCode'),
              "CreditorZip": attr(borrower.CreditAddress, 'postalCode'),
              "CreditorPhone": attr(borrower, 'telephone'),
              "Industry": desc(borrower.IndustryCode)
            }
          })
        }
        modifiedReport.Accounts = Array.isArray(modifiedReport.Accounts)
          ? modifiedReport.Accounts.sort((a, b) => a.BureauId - b.BureauId)
          : [];
      }
      return modifiedReport;
    } catch (error) {
      throw error;
    }
  }

  normalizeMyFreeScoreNowValue(value) {
    const normalized = String(value ?? '').replace(/\u00a0/g, ' ').trim();
    if (!normalized || normalized === '--' || normalized.toLowerCase() === 'n/a') {
      return '';
    }
    return normalized;
  }

  extractMyFreeScoreNowPublicRecords(pageText) {
    if (!pageText || typeof pageText !== 'string') {
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
    const records = [];
    let currentType = '';
    let currentRows = {};

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

  // Helper to extract 3-bureau values from MyScoreIQ section text
  extractThreeBureauData(text, startLabel, endLabel) {
    if (!text) return ['', '', ''];
    try {
      // Find start index
      const startIdx = text.indexOf(startLabel);
      if (startIdx === -1) return ['', '', ''];

      // Find end index (next label or end of string)
      let endIdx = text.length;
      if (endLabel) {
        const nextLabelIdx = text.indexOf(endLabel, startIdx + startLabel.length);
        if (nextLabelIdx !== -1) endIdx = nextLabelIdx;
      }

      // Extract the chunk
      let chunk = text.substring(startIdx + startLabel.length, endIdx).trim();
      
      // Split by tab. We expect roughly 3 columns.
      // But values might have newlines.
      // Strategy: Split by `\t` and take the first 3 non-emptyish parts?
      // No, empty fields are valid (e.g. \t\t).
      
      const parts = chunk.split('\t');
      // parts[0] is often the remainder of the first line or empty if label was followed by \t
      
      // If label is "Name:", chunk might be "ALI BADI\tALI BADI\tALI BADI"
      // Split: ["ALI BADI", "ALI BADI", "ALI BADI"]
      
      // If label is "Date of Birth:", chunk might be "\n1989\n\t\n1989\n\t\n1989"
      // Split: ["\n1989\n", "\n1989\n", "\n1989"]
      
      // We take up to 3 parts.
      let values = [];
      for (let i = 0; i < parts.length && values.length < 3; i++) {
        // Clean up newlines
        let val = parts[i].trim();
        // If it's the very first part and empty, it might be just the separator after label?
        // But "Name:\t" -> parts[0] is empty.
        // If "Name: Val1\t", parts[0] is Val1.
        
        // Actually, if split by `\t`, we should take the first 3 elements generally.
        // But we need to be careful if the chunk includes the *next* section's text in the last part?
        // We truncated chunk at `endLabel`, so we should be safeish.
        // But `endLabel` logic above is simple.
        
        values.push(val);
      }
      
      // Pad if missing
      while (values.length < 3) values.push('');
      
      return values;
    } catch (e) {
      return ['', '', ''];
    }
  }

  async parseMyScoreIQ(data) {
    const { rawCreditData, sections } = data;
    const modifiedReport = {};
    const reportDate = new Date().toISOString().split('T')[0];
    const rawReports = Array.isArray(rawCreditData?.data) ? rawCreditData.data : [];
    const bureauNameToId = { TransUnion: 1, Experian: 2, Equifax: 3 };
    const bureauIdForRawReport = (report, fallbackIndex = 0) => {
      return bureauNameToId[report?.bureau] || [1, 2, 3][fallbackIndex] || 0;
    };
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const formatRawAddress = (address) => clean([
      address?.house_number,
      address?.pre_directional,
      address?.street_name,
      address?.suffix,
      address?.post_directional,
      address?.unit
    ].filter(Boolean).join(' '));
    const parseRawScore = (report) => {
      const directScore = parseInt(report?.score || report?.credit_score || report?.fico_score, 10);
      if (Number.isFinite(directScore) && directScore > 0) return directScore;

      const scoreDetail = Array.isArray(report?.score_details) ? report.score_details[0] : report?.score_details;
      const scoreDetailValue = parseInt(scoreDetail?.score, 10);
      if (Number.isFinite(scoreDetailValue) && scoreDetailValue > 0) return scoreDetailValue;

      const rawContent = report?.credit_score_content?.content
        || report?.credit_score_content
        || scoreDetail?.credit_score_content?.content
        || scoreDetail?.credit_score_content;
      if (rawContent) {
        try {
          const content = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
          const score = parseInt(content?.score, 10);
          if (Number.isFinite(score) && score > 0) return score;
        } catch (e) {}
      }

      return 0;
    };

    // Concatenate all section values to handle fragmented text
    const fullText = Object.values(sections || {}).join('\n');

    // Helper to get block
    const getBlock = (start, end) => {
        if (!fullText) return '';
        const s = fullText.indexOf(start);
        if (s === -1) return '';
        const e = fullText.indexOf(end, s);
        if (e === -1) return fullText.substring(s);
        return fullText.substring(s, e);
    };

    // 1. CreditReport
    modifiedReport.CreditReport = [{
      DateReport: reportDate,
      ReportProvider: 'MyScoreIQ'
    }];

    // Bureau IDs
    const bureaus = [1, 2, 3]; // TU, EXP, EQF

    // 2. Personal Information
    // Extract block from "Personal Information" to "Credit Score" (or "FICO® Score")
    let personalInfo = getBlock('Personal Information', 'Credit Score');
    if (!personalInfo) personalInfo = getBlock('Personal Information', 'FICO® Score');
    if (!personalInfo) personalInfo = fullText; // Fallback
    
    // Name
    if (rawReports.some((report) => Array.isArray(report?.names) && report.names.length > 0)) {
      modifiedReport.Name = rawReports.flatMap((report, idx) => {
        const bureauId = bureauIdForRawReport(report, idx);
        return (report.names || []).map((name) => ({
          BureauId: bureauId,
          FirstName: clean(name?.first_name),
          Middle: clean(name?.middle_name),
          LastName: clean(name?.last_name),
          NameType: 'Primary'
        }));
      });
    } else {
      const names = this.extractThreeBureauData(personalInfo, 'Name:', 'Also Known As:');
      modifiedReport.Name = bureaus.map((bid, idx) => {
        const full = names[idx] || '';
        const parts = full.split(' ').filter(p => p);
        return {
          BureauId: bid,
          FirstName: parts[0] || '',
          Middle: parts.length > 2 ? parts[1] : '',
          LastName: parts.length > 1 ? parts[parts.length - 1] : '',
          NameType: 'Primary'
        };
      });
    }

    // DOB
    if (rawReports.some((report) => report?.year_of_birth)) {
      modifiedReport.DOB = rawReports.map((report, idx) => ({
        BureauId: bureauIdForRawReport(report, idx),
        DOB: normalizeYearOnlyDob(report?.year_of_birth)
      }));
    } else {
      const dobs = this.extractThreeBureauData(personalInfo, 'Date of Birth:', 'Current Address(es):');
      modifiedReport.DOB = bureaus.map((bid, idx) => {
        const dob = normalizeUnifiedDob(dobs[idx] || '');
        return {
          BureauId: bid,
          DOB: dob
        };
      });
    }

    // Address - Current
    const currAddrs = this.extractThreeBureauData(personalInfo, 'Current Address(es):', 'Previous Address(es):');
    const prevAddrs = this.extractThreeBureauData(personalInfo, 'Previous Address(es):', 'Employers:');
    
    const parseAddress = (addrStr) => {
        if (!addrStr) return { StreetAddress: '', City: '', State: '', Zip: '' };
        
        // Strategy 1: Split by newlines (most reliable for MyScoreIQ structure)
        // Example: "8 FOXWOOD LN\nTHORNWOOD, NY\n10594\n03/2023"
        const lines = addrStr.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length >= 2) {
             const street = lines[0];
             // Join the rest to handle split City/State/Zip
             const rest = lines.slice(1).join(' '); 
             // Regex for "City, ST Zip"
             const match = rest.match(/^(.*?),\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/);
             if (match) {
                 return {
                     StreetAddress: street,
                     City: match[1].trim(),
                     State: match[2],
                     Zip: match[3]
                 };
             }
        }

        // Strategy 2: Fallback regex on single line
        const cleanAddr = addrStr.replace(/[\n\t]+/g, ' ').trim();
        // Try to find State and Zip at the end
        const matchEnd = cleanAddr.match(/,\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)(?:.*)$/);
        if (matchEnd) {
             const state = matchEnd[1];
             const zip = matchEnd[2];
             // Everything before the comma is Street + City
             // We can't reliably separate them without another delimiter.
             // We will return the full prefix as StreetAddress for safety.
             const prefix = cleanAddr.substring(0, matchEnd.index).trim();
             return {
                 StreetAddress: prefix,
                 City: '',
                 State: state,
                 Zip: zip
             };
        }
        
        // Fallback: entire string as StreetAddress
        return { StreetAddress: cleanAddr, City: '', State: '', Zip: '' };
    };

    modifiedReport.Address = [];
    if (rawReports.some((report) => Array.isArray(report?.addresses) && report.addresses.length > 0)) {
      rawReports.forEach((report, idx) => {
        const bureauId = bureauIdForRawReport(report, idx);
        (report.addresses || []).forEach((address, addressIndex) => {
          modifiedReport.Address.push({
            BureauId: bureauId,
            StreetAddress: formatRawAddress(address),
            City: clean(address?.city),
            State: clean(address?.state),
            Zip: clean(address?.zipcode),
            AddressType: addressIndex === 0 ? 'Current' : 'Previous'
          });
        });
      });
    } else {
      bureaus.forEach((bid, idx) => {
        if (currAddrs[idx]) {
          const parsed = parseAddress(currAddrs[idx]);
          modifiedReport.Address.push({
            BureauId: bid,
            StreetAddress: parsed.StreetAddress,
            City: parsed.City,
            State: parsed.State,
            Zip: parsed.Zip,
            AddressType: 'Current'
          });
        }
        if (prevAddrs[idx]) {
          const parsed = parseAddress(prevAddrs[idx]);
          modifiedReport.Address.push({
            BureauId: bid,
            StreetAddress: parsed.StreetAddress,
            City: parsed.City,
            State: parsed.State,
            Zip: parsed.Zip,
            AddressType: 'Previous'
          });
        }
      });
    }

    // Employer
    const employers = this.extractThreeBureauData(personalInfo, 'Employers:', 'Back to Top');
    modifiedReport.Employer = bureaus.map((bid, idx) => {
      return {
        BureauId: bid,
        EmployerName: employers[idx] || '',
        DateHired: '',
        DateReported: ''
      };
    });

    // 3. Scores
    if (rawReports.length > 0) {
      modifiedReport.Score = rawReports.map((report, idx) => ({
        BureauId: bureauIdForRawReport(report, idx),
        ScoreType: 'FICO 8',
        Score: parseRawScore(report),
        DateScore: report?.report_date ? String(report.report_date).split('T')[0] : reportDate,
        ScoreFactors: []
      }));
    } else {
      const scoreBlock = getBlock('Credit Score', 'Summary');
      const scores = this.extractThreeBureauData(scoreBlock, 'FICO® Score 8:', 'Lender Rank:');
      modifiedReport.Score = bureaus.map((bid, idx) => {
        return {
          BureauId: bid,
          ScoreType: 'FICO 8',
          Score: parseInt(scores[idx]) || 0,
          DateScore: reportDate,
          ScoreFactors: []
        };
      });
    }

    // 4. Accounts from rawCreditData
    modifiedReport.Accounts = [];
    if (rawCreditData && rawCreditData.data && rawCreditData.data[0] && rawCreditData.data[0].accounts) {
      rawCreditData.data[0].accounts.forEach(acc => {
        bureaus.forEach(bid => {
           modifiedReport.Accounts.push({
             BureauId: bid,
             AccountName: acc.name,
             AccountNumber: acc.number,
             AccountType: acc.type,
             AccountStatus: acc.type_definition_flags?.account_status || 'Open',
             DateOpened: acc.date_opened ? acc.date_opened.split('T')[0] : '',
             Balance: acc.balance,
             PaymentStatus: acc.payment_status,
             HighCredit: acc.high_balance,
             CreditLimit: acc.limit,
             MonthlyPayment: acc.monthly_payment,
             TermMonths: '', 
             DateReported: acc.status_date ? acc.status_date.split('T')[0] : '',
             DateLastPayment: acc.last_payment_date ? acc.last_payment_date.split('T')[0] : '',
             DateLastActive: acc.status_date ? acc.status_date.split('T')[0] : '',
             Comments: acc.comments ? JSON.stringify(acc.comments) : '',
             PaymentHistory: JSON.stringify(acc.payment_histories || []) 
           });
        });
      });
    }

    // 5. Inquiries
    modifiedReport.Inquiries = [];
    // Find Inquiries section
    // "Inquiries\n\tBelow are the names..."
    const inquiryBlock = getBlock('Inquiries\n\tBelow are the names', 'Public Information');
    
    if (inquiryBlock) {
       const lines = inquiryBlock.split('\n');
       // Skip header and empty lines. Header ends with "Credit Bureau"
       let startParsing = false;
       for (const line of lines) {
         if (line.includes('Credit Bureau') && line.includes('Creditor Name')) {
           startParsing = true;
           continue;
         }
         if (!startParsing) continue;
         if (line.trim() === '' || line.includes('Back to Top')) continue;

         // Line: Creditor Name\tType\tDate\tBureau
         const cols = line.split('\t');
         if (cols.length >= 4) {
           const bureauName = cols[3].trim();
           let bid = 0;
           if (bureauName.includes('TransUnion')) bid = 1;
           else if (bureauName.includes('Experian')) bid = 2;
           else if (bureauName.includes('Equifax')) bid = 3;
           
           if (bid > 0) {
             modifiedReport.Inquiries.push({
               BureauId: bid,
               SubscriberName: cols[0],
               Industry: cols[1],
               DateOfInquiry: cols[2]
             });
           }
         }
       }
    }

    // 6. Public Records
    modifiedReport.PublicRecords = [];
    // Assuming "None Reported" for now based on sample. 
    
    return modifiedReport;
  }

  async convertToArrayOfObjects(variable) {
    if (Array.isArray(variable)) {
      return variable; // Return as is if it's already an array
    } else if (typeof variable === 'object' && variable !== null) {
      return [variable]; // Convert object to array of objects
    }
    return []; // Return empty array for other data types
  }

  async close() {
    if (!this.browser) throw new Error('Browser is not initialized. Call initialize() first.');
    if (this.page) await this.page.close();
    await this.browser.close();
  }
}
