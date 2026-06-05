/**
 * identityiqscraper.js
 *
 * Robust IdentityIQ (ASP.NET) scraper using Puppeteer.
 * Rewritten to handle nested iframes, ASP.NET hidden fields, postbacks, JSON/JSONP responses,
 * and robust debug artifact generation.
 *
 * Usage: import default and call fetchIdentityIQReport(username, password, { outputDir, clientId, ssnLast4, puppeteerOverrides })
 */

import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { Scraper } from '../../../scraper/scrapper.js';

const configPath = path.resolve(process.cwd(), 'configs/identityiq_config.json');
function loadConfig() {
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[IdentityIQ] Failed to load config from', configPath, err?.message || err);
    return {};
  }
}
let config = loadConfig();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const safeStringify = (obj) => {
  try {
    const seen = new Set();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'function') return '[Function]';
      if (value instanceof RegExp) return value.toString();
      if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
      if (value === undefined) return null;
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
      }
      return value;
    }, 2);
  } catch (err) {
    console.error('Error in safeStringify:', err?.message || err);
    return JSON.stringify({ error: 'Could not stringify object', reason: err?.message || String(err), partialKeys: Object.keys(obj || {}) });
  }
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function findFrameWithSelector(page, selector, timeout = 8000) {
  // Try to find a frame (including main page) that contains selector.
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const frames = [page, ...page.frames()];
    for (const ctx of frames) {
      try {
        const found = await ctx.$(selector);
        if (found) return ctx;
      } catch {}
    }
    await sleep(300);
  }
  return null;
}

async function getHiddenFieldsFromContext(ctx) {
  try {
    const fields = await ctx.evaluate(() => {
      const g = (id) => {
        const el = document.querySelector(`#${id}`);
        return el ? el.value || null : null;
      };
      return {
        __VIEWSTATE: g('__VIEWSTATE'),
        __VIEWSTATEGENERATOR: g('__VIEWSTATEGENERATOR'),
        __EVENTVALIDATION: g('__EVENTVALIDATION')
      };
    });
    return fields;
  } catch {
    return { __VIEWSTATE: null, __VIEWSTATEGENERATOR: null, __EVENTVALIDATION: null };
  }
}

async function typeIntoFirstMatch(page, selectors, value, label = 'field', timeout = 10000) {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  for (const sel of list) {
    // re-evaluate frames each attempt
    const contexts = [page, ...page.frames()];
    for (const ctx of contexts) {
      try {
        await ctx.waitForSelector(sel, { timeout: Math.max(2000, timeout / 2) });
        // try typing natively if supported
        try {
          if (ctx.type) {
            await ctx.type(sel, value, { delay: 35 });
            console.log(`[IdentityIQ] Typed into ${label}: ${sel} via ctx.type`);
            return true;
          }
        } catch {}
        // fallback: set value via evaluate in that frame
        try {
          await ctx.$eval(sel, (el, val) => {
            (el.focus && el.focus());
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }, value);
          console.log(`[IdentityIQ] Typed into ${label}: ${sel} via $eval fallback`);
          return true;
        } catch (e) {
          // continue
        }
      } catch {}
    }
  }
  console.log(`[IdentityIQ] Failed to type into any selector for ${label} (tried ${list.length} selectors)`);
  return false;
}

async function clickFirstMatch(page, selectors, label = 'button', timeout = 10000) {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  for (const sel of list) {
    const contexts = [page, ...page.frames()];
    for (const ctx of contexts) {
      try {
        await ctx.waitForSelector(sel, { timeout: Math.max(2000, timeout / 2) });
        const el = await ctx.$(sel);
        if (el) {
          try {
            await el.click({ delay: 40 });
            console.log(`[IdentityIQ] Clicked ${label}: ${sel} via elementHandle.click`);
            return true;
          } catch {
            try {
              await ctx.evaluate((s) => {
                const e = document.querySelector(s);
                if (e) { e.click(); return true; }
                return false;
              }, sel);
              console.log(`[IdentityIQ] Clicked ${label}: ${sel} via evaluate fallback`);
              return true;
            } catch {}
          }
        }
      } catch {}
    }

    // Text-contains fallback executed in main page context
    const containsMatch = sel.match(/^([a-zA-Z0-9\.\#\-]+):contains\((.+)\)$/);
    if (containsMatch) {
      const tag = containsMatch[1];
      const text = containsMatch[2].replace(/^['"]|['"]$/g, '').trim().toLowerCase();
      try {
        const clicked = await page.evaluate(({ tag, text }) => {
          const els = Array.from(document.querySelectorAll(tag));
          const el = els.find(e => (e.innerText || e.textContent || '').toLowerCase().includes(text));
          if (el) { el.click(); return true; }
          return false;
        }, { tag, text });
        if (clicked) {
          console.log(`[IdentityIQ] Clicked ${label} via text match: ${tag} contains "${text}"`);
          return true;
        }
      } catch {}
    }
  }
  console.log(`[IdentityIQ] Failed to click any selector for ${label} (tried ${list.length} selectors)`);
  return false;
}

async function extractJsonLike(text) {
  if (!text || typeof text !== 'string') return null;
  // find the largest {...} block or leading JSONP wrapper
  const jsonMatch = text.match(/\{[\s\S]*\}/m);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {}
  }
  // attempt JSONP strip (callback(...))
  const strip = text.replace(/^[^\(]*\(/, '').replace(/\);?[\s\S]*$/, '');
  try {
    return JSON.parse(strip);
  } catch {}
  return null;
}

async function captureResponseBodies(page, outputDir) {
  // optional: save recent interesting responses if they contain dsply or csid
  // (we attach a listener earlier in main)
  // This helper placeholder kept for symmetry
  return;
}

async function fetchIdentityIQReport(username, password, options = {}) {
  const { outputDir = './scraper-output', clientId, ssnLast4, puppeteerOverrides = {} } = options;
  // reload config
  config = loadConfig();
  ensureDir(outputDir);
  console.log('[IdentityIQ] Config reloaded. loginUrl=', config.loginUrl, 'base url=', config.url);

  let browser = null;
  let page = null;
  try {
    console.log(`[IdentityIQ] Starting scraper for clientId=${clientId || 'unknown'} username=${String(username).slice(0,3)}***`);
    const launchOpts = {
      headless: typeof puppeteerOverrides.headless === 'boolean' ? puppeteerOverrides.headless : (config.puppeteerConfig?.headless ?? true),
      slowMo: puppeteerOverrides.slowMo ?? config.puppeteerConfig?.slowMo,
      args: puppeteerOverrides.args ?? config.puppeteerConfig?.args ?? ['--no-sandbox', '--disable-setuid-sandbox']
    };
    browser = await puppeteer.launch(launchOpts);
    page = await browser.newPage();

    // sensible defaults for headers and viewport
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      ...(config.puppeteerHttpHeaders || {})
    });
    if (config.puppeteerResolution) await page.setViewport(config.puppeteerResolution);

    // timeouts
    try { page.setDefaultNavigationTimeout(config.waitTimeouts?.navigation || 60000); } catch {}
    try { page.setDefaultTimeout(config.waitTimeouts?.element || 15000); } catch {}

    console.log('[IdentityIQ] Browser launched, page initialized');

    // response listener: capture dsply / csid bodies
    let rawCreditData = null;
    page.on('response', async (resp) => {
      try {
        const url = resp.url();
        if (!url) return;
        const status = resp.status();
        if (status !== 200) return;
        if (/\/dsply\.aspx/i.test(url) || /dsply/i.test(url)) {
          const text = await resp.text().catch(() => '');
          const parsed = await extractJsonLike(text);
          if (parsed) {
            rawCreditData = parsed;
            console.log('[IdentityIQ] Captured JSONP credit data from response:', url);
          }
        } else if (/csid/i.test(url)) {
          const text = await resp.text().catch(() => '');
          const parsed = await extractJsonLike(text);
          if (parsed) {
            rawCreditData = parsed;
            console.log('[IdentityIQ] Captured CSID JSON from response:', url);
          }
        }
      } catch (e) {
        // ignore response handler failures
      }
    });

    const targetLoginUrl = config.loginUrl || config.url;
    console.log(`[IdentityIQ] Navigating to login URL: ${targetLoginUrl}`);
    await page.goto(targetLoginUrl, { waitUntil: 'networkidle2', timeout: config.waitTimeouts?.navigation || 60000 });

    // small pause to let scripts attach frames
    await sleep(800);

    // Save a "ready" screenshot (debug)
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const readyShot = path.join(outputDir, `login_ready_${ts}.png`);
      await page.screenshot({ path: readyShot, fullPage: true });
      console.log('[IdentityIQ] Login ready screenshot saved to', readyShot);
    } catch (e) {
      console.log('[IdentityIQ] Could not save ready screenshot:', e?.message || e);
    }

    // Find the frame that contains __VIEWSTATE or a server form. Try multiple heuristics.
    let loginContext = null;
    const frameCandidates = [page, ...page.frames()];
    // Quick check for top-level first
    for (const ctx of frameCandidates) {
      try {
        const hf = await getHiddenFieldsFromContext(ctx);
        if (hf && (hf.__VIEWSTATE || hf.__EVENTVALIDATION || hf.__VIEWSTATEGENERATOR)) {
          loginContext = ctx;
          break;
        }
      } catch {}
    }

    // If not found, attempt to search frames more robustly by selector
    if (!loginContext) {
      // look for either the hidden fields or a form with runat=server
      const selectorsToFind = ['#__VIEWSTATE', 'form[runat="server"]', 'input[name*="__VIEWSTATE"]'];
      for (const sel of selectorsToFind) {
        const ctx = await findFrameWithSelector(page, sel, 7000);
        if (ctx) {
          loginContext = ctx;
          break;
        }
      }
    }

    // As last resort, check frames' HTML for "ViewState" or typical identityiq markers
    if (!loginContext) {
      const frames = [page, ...page.frames()];
      for (const ctx of frames) {
        try {
          const html = await ctx.content();
          if (/__VIEWSTATE/i.test(html) || /ctl00|identityiq/i.test(html)) {
            loginContext = ctx;
            break;
          }
        } catch {}
      }
    }

    if (!loginContext) {
      // debug dump: save page content and frames list
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const dumpPath = path.join(outputDir, `login_failed_${ts}.html`);
      try { fs.writeFileSync(dumpPath, await page.content(), 'utf8'); } catch {}
      console.error('[IdentityIQ] Could not find login frame containing ASP.NET hidden fields. Saved page content to', dumpPath);
      console.error('[IdentityIQ] Frames URLs:', page.frames().map(f => f.url()).slice(0, 40));
      throw new Error('Login frame not found; possible bot-protection or changed layout');
    }

    // get hidden fields from selected context
    const hiddenFields = await getHiddenFieldsFromContext(loginContext);
    console.log('[IdentityIQ] Hidden fields at login:', hiddenFields);

    // If hidden fields are all null, wait longer and re-check (scripts may populate them)
    if (!hiddenFields.__VIEWSTATE && !hiddenFields.__EVENTVALIDATION && !hiddenFields.__VIEWSTATEGENERATOR) {
      // allow more time for JS-injected form
      try {
        await sleep(1200);
        const hf2 = await getHiddenFieldsFromContext(loginContext);
        console.log('[IdentityIQ] Hidden fields re-check:', hf2);
        // prefer hf2 if has values
        if (hf2.__VIEWSTATE || hf2.__EVENTVALIDATION || hf2.__VIEWSTATEGENERATOR) {
          Object.assign(hiddenFields, hf2);
        }
      } catch {}
    }

    // If still none, record DOM and fail early with helpful debug artifacts
    if (!hiddenFields.__VIEWSTATE && !hiddenFields.__EVENTVALIDATION && !hiddenFields.__VIEWSTATEGENERATOR) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const dumpPath = path.join(outputDir, `login_failed_${ts}.html`);
      try { fs.writeFileSync(dumpPath, await loginContext.content(), 'utf8'); } catch {}
      console.error('[IdentityIQ] Hidden fields are still null within chosen frame. Saved frame content to', dumpPath);
      console.error('[IdentityIQ] Frames list:', page.frames().map(f => f.url()).slice(0, 40));
      throw new Error('ASP.NET hidden fields missing in login frame');
    }

    // Attempt to type username/password into common selectors (frame-aware)
    const emailSelectors = config.selectors?.email_field || [
      'input[type="email"]',
      'input[name*="email"]',
      'input[id*="email"]',
      'input[name*="user"]',
      'input[id*="user"]',
      'input[name*="username"]',
      'input[id*="username"]',
      'input[type="text"]'
    ];
    const passSelectors = config.selectors?.password_field || [
      'input[type="password"]',
      'input[name*="pass"]',
      'input[id*="pass"]'
    ];

    // Use the loginContext (frame) as primary context for typing by invoking helper that checks frames
    const emailOk = await typeIntoFirstMatch(loginContext, emailSelectors, username, 'email');
    const passOk = await typeIntoFirstMatch(loginContext, passSelectors, password, 'password');

    if (!emailOk || !passOk) {
      console.log('[IdentityIQ] Could not populate login fields in detected frame; trying global scan & debug outputs');
      // Save inputs map for debugging
      try {
        const inputsDump = await page.evaluate(() => Array.from(document.querySelectorAll('input')).map(i => ({ id: i.id, name: i.name, type: i.type, placeholder: i.placeholder, outerHTML: i.outerHTML.slice(0,200) })));
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const dumpPathJson = path.join(outputDir, `login_dom_inputs_${ts}.json`);
        fs.writeFileSync(dumpPathJson, safeStringify(inputsDump), 'utf8');
        console.log('[IdentityIQ] Saved login inputs map to', dumpPathJson);
      } catch {}
    }

    // Click login button (frame-aware)
    const loginBtnSelectors = config.selectors?.login_button || [
      'button[type="submit"]',
      'input[type="submit"]',
      'button[class*=login]',
      'a[class*=login]',
      'button:contains("Log in")',
      'button:contains("Sign in")',
      'a:contains("Log in")'
    ];

    // Try to click via loginContext first, else fallback to global page click
    let clicked = await clickFirstMatch(loginContext, loginBtnSelectors).catch(() => false);
    if (!clicked) clicked = await clickFirstMatch(page, loginBtnSelectors).catch(() => false);

    // Fallback: trigger ASP.NET __doPostBack if available
    if (!clicked) {
      try {
        const invoked = await loginContext.evaluate(() => {
          try {
            if (typeof window.__doPostBack === 'function') {
              // attempt generic postback - note: this may need an argument; we try to find a likely name
              // Searching for first submit-like control id
              const btn = Array.from(document.querySelectorAll('input,button,a')).find(e => /log ?in|sign ?in|submit/i.test(e.innerText || e.value || ''));
              const name = btn ? (btn.id || btn.name || '') : '';
              if (name) {
                window.__doPostBack(name, '');
                return { invoked: true, name };
              } else {
                // attempt generic: __doPostBack('', '')
                window.__doPostBack('', '');
                return { invoked: true, name: '' };
              }
            }
          } catch (e) {}
          return { invoked: false };
        });
        if (invoked && invoked.invoked) {
          console.log('[IdentityIQ] Attempted __doPostBack fallback', invoked);
        }
      } catch {}
    }

    // Wait for either navigation/networkidle or dashboard indicator
    try {
      await Promise.race([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: config.waitTimeouts?.navigation || 30000 }).catch(() => null),
        (async () => {
          const indicators = Array.isArray(config.selectors?.dashboard_indicators) ? config.selectors.dashboard_indicators : [];
          for (const sel of indicators) {
            try { await page.waitForSelector(sel, { timeout: config.waitTimeouts?.element || 15000 }); return true; } catch {}
          }
          return false;
        })()
      ]);
    } catch (e) {
      // continue
    }

    // small wait for any JS to settle
    await sleep(1200);

    // Save screenshot + HTML after login attempt for debugging
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const shot = path.join(outputDir, `login_attempt_${ts}.png`);
      await page.screenshot({ path: shot, fullPage: true });
      console.log('[IdentityIQ] Login attempt screenshot saved to', shot);
      const htmlDump = path.join(outputDir, `login_after_${ts}.html`);
      fs.writeFileSync(htmlDump, await page.content(), 'utf8');
      console.log('[IdentityIQ] Login attempt HTML saved to', htmlDump);
    } catch (e) {
      console.log('[IdentityIQ] Could not save login attempt artifacts:', e?.message || e);
    }

    // Check if redirect back to login (detect login page element)
    let backToLogin = false;
    if (config.selectors?.login_page) {
      try {
        const onLogin = await page.$(config.selectors.login_page);
        if (onLogin) backToLogin = true;
      } catch {}
    }

    if (backToLogin) {
      console.log('[IdentityIQ] Still on login page after attempt; aborting with debug saved.');
      throw new Error('Still on login page after attempt - possible bad credentials or bot-detection');
    }

    // Navigate to report page or click Credit Report link
    let navigatedViaLink = false;
    try {
      const indicators = Array.isArray(config.selectors?.dashboard_indicators) ? config.selectors.dashboard_indicators : [];
      for (const sel of indicators) {
        try { await page.waitForSelector(sel, { timeout: 3000 }); navigatedViaLink = true; break; } catch {}
      }
      if (navigatedViaLink) {
        const clickedCredit = await clickFirstMatch(page, config.selectors?.credit_report_link || ['a:contains("Credit Report")', 'a:contains("View Report")']);
        if (clickedCredit) {
          try { await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: config.waitTimeouts?.navigation || 30000 }); } catch {}
        } else navigatedViaLink = false;
      }
    } catch (e) {}

    const targetReportUrl = config.creditReportUrl || config.dashboardUrl;
    if (!navigatedViaLink && targetReportUrl) {
      console.log(`[IdentityIQ] Navigating to report page: ${targetReportUrl}`);
      await page.goto(targetReportUrl, { waitUntil: 'networkidle2', timeout: Math.max(45000, config.waitTimeouts?.navigation || 30000) });
    }

    // Wait for dsply or csid responses (we have response listener that will populate rawCreditData)
    try {
      await page.waitForResponse((r) => /dsply/i.test(r.url()) || /csid/i.test(r.url()), { timeout: Math.max(15000, config.waitTimeouts?.report_load || 20000) }).catch(() => null);
    } catch {}

    // If response handler hasn't found rawCreditData yet, try to manually inspect frames/variables
    if (!rawCreditData) {
      const contexts = [page, ...page.frames()];
      for (const ctx of contexts) {
        try {
          const candidate = await ctx.evaluate(() => {
            // common globals in IdentityIQ/TrueLink bundles
            return window.BundleComponents || window.creditReportData || window.reportData || window.__CREDIT_REPORT_DATA__ || null;
          }).catch(() => null);
          if (candidate) { rawCreditData = candidate; break; }
        } catch {}
        try {
          const scriptJson = await ctx.evaluate(() => {
            const scripts = Array.from(document.querySelectorAll('script')).map(s => s.textContent || '');
            let best = null;
            for (const text of scripts) {
              if (/BundleComponents|TrueLinkCreditReportType|creditReport/i.test(text)) {
                const matches = text.match(/\{[\s\S]*\}/g);
                if (matches && matches.length) {
                  // choose the largest match
                  const largest = matches.reduce((a, b) => a.length > b.length ? a : b, matches[0]);
                  if (!best || largest.length > best.length) best = largest;
                }
              }
            }
            return best;
          }).catch(() => null);
          if (scriptJson) {
            try {
              rawCreditData = JSON.parse(scriptJson);
              break;
            } catch {}
          }
        } catch {}
      }
    }

    // Parse into unified structure via Scraper.Parse if we have JSON
    let reportStructured = {};
    if (rawCreditData) {
      try {
        const scraper = new Scraper(config);
        reportStructured = await scraper.Parse(rawCreditData);
        console.log('[IdentityIQ] Parse complete, sections=', Object.keys(reportStructured || {}).length);
      } catch (err) {
        console.log('[IdentityIQ] Error parsing raw credit data:', err?.message || err);
      }
    }

    // Attempt to click Download and save HTML report as fallback
    let htmlReportPath = null;
    try {
      const downloadSelectors = config.selectors?.download_candidates || [
        'a.imgDownloadAction',
        'a[onclick*="downloadCreditReport"]',
        "a:contains(\"Download this report\")",
        "button:contains(\"Download this report\")",
        "a:contains(\"Download Report\")",
        "button:contains(\"Download Report\")",
        "a[href*='CRDownload']",
      ];
      let clickedDownload = await clickFirstMatch(page, downloadSelectors).catch(() => false);
      if (clickedDownload) {
        // handle popup
        let popup = null;
        page.once('popup', (p) => { popup = p; });
        try { await page.waitForTimeout(800); } catch {}
        const dlPage = popup || page;
        try {
          await dlPage.waitForFunction(() => !!document.querySelector('body'), { timeout: 10000 }).catch(() => null);
        } catch {}
        try {
          const ts = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `client_${clientId || 'unknown'}_identityiq_download_${ts}.html`;
          const fullPath = path.join(outputDir, filename);
          const htmlContent = await dlPage.content();
          fs.writeFileSync(fullPath, htmlContent);
          htmlReportPath = fullPath;
          console.log('[IdentityIQ] HTML report saved to', fullPath);
        } catch (e) { console.log('[IdentityIQ] Failed to save HTML download:', e?.message || e); }
      }
    } catch (e) {
      console.log('[IdentityIQ] Error during download attempt:', e?.message || e);
    }

    // Save JSON report if parsed successfully
    let filePath = null;
    if (reportStructured && Object.keys(reportStructured).length) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `client_${clientId || 'unknown'}_identityiq_${timestamp}.json`;
      filePath = path.join(outputDir, filename);
      const reportWithClientInfo = {
        clientInfo: { clientId: clientId || 'unknown', username, timestamp: new Date().toISOString(), reportDate: new Date().toLocaleDateString() },
        reportData: reportStructured
      };
      fs.writeFileSync(filePath, safeStringify(reportWithClientInfo), 'utf8');
      reportStructured.filePath = filePath;
      console.log('[IdentityIQ] Report saved to', filePath);
    }

    if (!filePath && htmlReportPath) {
      filePath = htmlReportPath;
      console.log('[IdentityIQ] Returning HTML file path as report_path:', filePath);
    }

    return { reportData: reportStructured, filePath };
  } catch (error) {
    console.error('[IdentityIQ] Scraper error:', error?.message || error);
    // save page content for debugging
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      if (page) {
        const attempted = await page.content().catch(() => null);
        if (attempted) {
          const dump = path.join(outputDir, `login_failed_${ts}.html`);
          try { fs.writeFileSync(dump, attempted, 'utf8'); console.log('[IdentityIQ] Saved failure HTML to', dump); } catch {}
        }
        const shot = path.join(outputDir, `login_failed_${ts}.png`);
        try { await page.screenshot({ path: shot, fullPage: true }); console.log('[IdentityIQ] Saved failure screenshot to', shot); } catch {}
      }
    } catch (e) {}
    throw error;
  } finally {
    try { if (page) await page.close(); } catch {}
    try { if (browser) await browser.close(); } catch {}
    console.log('[IdentityIQ] Browser closed');
  }
}

export default fetchIdentityIQReport;
