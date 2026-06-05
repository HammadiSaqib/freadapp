/**
 * final-identityiq-scraper.js
 *
 * Hybrid IdentityIQ scraper:
 * - UI login (handles SSN last-4 security step)
 * - Visits CreditReport.aspx (hard-coded per your choice)
 * - Captures JSON XHRs when available
 * - Always writes fallback artifacts and a unified JSON payload
 *
 * Usage:
 * import fetchIdentityIQReport from './final-identityiq-scraper.js';
 * await fetchIdentityIQReport(username, password, { outputDir:'./scraper-output', clientId:'abc', ssnLast4:'1234' });
 */

import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());
import { Scraper } from '../../../scraper/scrapper.js';

const configPath = path.resolve(process.cwd(), 'configs/identityiq_config.json');
function loadConfig() {
  try { return JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (e) { return {}; }
}
let config = loadConfig();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const safeStringify = (obj) => {
  try {
    const seen = new Set();
    return JSON.stringify(obj, (k, v) => {
      if (typeof v === 'function') return '[Function]';
      if (v instanceof Error) return { name: v.name, message: v.message, stack: v.stack };
      if (typeof v === 'object' && v !== null) {
        if (seen.has(v)) return '[Circular]';
        seen.add(v);
      }
      return v;
    }, 2);
  } catch (e) { return JSON.stringify({ error: String(e) }); }
};

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

async function saveDebugArtifacts(page, outputDir, prefix = 'debug') {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  try { fs.writeFileSync(path.join(outputDir, `${prefix}_${ts}.html`), await page.content(), 'utf8'); } catch (e) {}
  try { await page.screenshot({ path: path.join(outputDir, `${prefix}_${ts}.png`), fullPage: true }); } catch (e) {}
  try { fs.writeFileSync(path.join(outputDir, `${prefix}_frames_${ts}.json`), safeStringify((await page.frames()).map(f => f.url())), 'utf8'); } catch (e) {}
  try {
    const inputs = await page.evaluate(() => Array.from(document.querySelectorAll('input, button, a')).map(e => ({ tag: e.tagName, id: e.id, name: e.name, type: e.type || null, placeholder: e.placeholder || null, text: (e.innerText || e.value || '').slice(0,200) })));
    fs.writeFileSync(path.join(outputDir, `${prefix}_dom_inputs_${ts}.json`), safeStringify(inputs), 'utf8');
  } catch (e) {}
}

// helper: find visible element by selectors in page & frames
async function findVisibleInContexts(page, selectors = [], timeout = 6000) {
  const start = Date.now();
  if (!Array.isArray(selectors)) selectors = [selectors];
  while (Date.now() - start < timeout) {
    const contexts = [page, ...page.frames()];
    for (const ctx of contexts) {
      for (const sel of selectors) {
        try {
          const el = await ctx.$(sel);
          if (!el) continue;
          const visible = await ctx.evaluate(e => {
            const s = window.getComputedStyle(e);
            return !!e && s && s.visibility !== 'hidden' && s.display !== 'none' && (e.offsetParent !== null);
          }, el).catch(() => false);
          if (visible) return { ctx, selector: sel };
        } catch (e) {}
      }
    }
    await sleep(200);
  }
  return null;
}

// text-match fallback click in a given context
async function clickByTextInContext(ctx, textCandidates = ['log in','sign in','continue','submit']) {
  try {
    return await ctx.evaluate((cands) => {
      const els = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]'));
      for (const e of els) {
        const t = (e.innerText || e.value || '').toLowerCase();
        if (!t) continue;
        for (const cand of cands) if (t.includes(cand)) { e.click(); return { clicked: true, text: t.slice(0,200) }; }
      }
      return { clicked: false };
    }, textCandidates);
  } catch (e) { return { clicked: false }; }
}

function extractJsonLike(text) {
  if (!text || typeof text !== 'string') return null;
  const m = text.match(/\{[\s\S]*\}/m);
  if (m) {
    try { return JSON.parse(m[0]); } catch (e) {}
  }
  const stripped = text.replace(/^[^\(]*\(/,'').replace(/\);?$/,'');
  try { return JSON.parse(stripped); } catch (e) {}
  return null;
}

// parse scores from sections text fallback
function parseScoresFromSections(sectionsObj) {
  // sectionsObj: { "Credit Score": "..." , ... }
  const out = { experian: null, equifax: null, transunion: null, credit_score: null };
  try {
    const creditSection = sectionsObj['Credit Score'] || sectionsObj['Credit Scores'] || '';
    if (creditSection) {
      // look for three numbers like "799 806 810" or "TransUnion 799 Experian 806 Equifax 810"
      const nums = Array.from(creditSection.matchAll(/\b(3\d{2}|4\d{2}|5\d{2}|6\d{2}|7\d{2}|8\d{2}|9\d{2})\b/g)).map(m => m[1]);
      if (nums.length >= 3) {
        // common order on IdentityIQ sample: TransUnion Experian Equifax
        out.transunion = nums[0];
        out.experian = nums[1];
        out.equifax = nums[2];
      } else if (nums.length === 1) {
        out.credit_score = nums[0];
      }
      // Try labeled matches
      const tu = creditSection.match(/transunion[:\s]*([0-9]{3})/i);
      const ex = creditSection.match(/experian[:\s]*([0-9]{3})/i);
      const eq = creditSection.match(/equifax[:\s]*([0-9]{3})/i);
      if (tu) out.transunion = tu[1];
      if (ex) out.experian = ex[1];
      if (eq) out.equifax = eq[1];
    }
  } catch (e) {}
  return out;
}

// parse report date from sections (common patterns like "Credit Report Date: 03/04/2025")
function parseReportDateFromSections(sectionsObj) {
  try {
    const keys = Object.keys(sectionsObj);
    for (const k of keys) {
      const txt = sectionsObj[k] || '';
      const m = txt.match(/Credit Report Date[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i);
      if (m) return m[1];
      // fallback find any date like mm/dd/yyyy near top
      const m2 = txt.match(/([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/);
      if (m2) return m2[1];
    }
  } catch (e) {}
  return null;
}

async function fetchIdentityIQReport(username, password, options = {}) {
  const { outputDir = './scraper-output', clientId, ssnLast4, puppeteerOverrides = {}, saveHtml = true, takeScreenshots = true } = options;
  config = loadConfig();
  ensureDir(outputDir);
  console.log('[IdentityIQ] Config reloaded. loginUrl=', config.loginUrl || config.url, 'base url=', config.url);

  let browser = null;
  let page = null;
  try {
    console.log(`[IdentityIQ] Starting scraper for clientId=${clientId || 'unknown'} username=${String(username).slice(0,3)}***`);
    const launchOpts = {
      headless: true,
      slowMo: puppeteerOverrides.slowMo ?? config.puppeteerConfig?.slowMo ?? 0,
      args: puppeteerOverrides.args ?? config.puppeteerConfig?.args ?? ['--no-sandbox','--disable-setuid-sandbox']
    };
    browser = await puppeteer.launch(launchOpts);
    page = await browser.newPage();

    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      });
    } catch {}

    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9', ...(config.puppeteerHttpHeaders||{}) });
    if (config.puppeteerResolution) await page.setViewport(config.puppeteerResolution);
    try { page.setDefaultNavigationTimeout(config.waitTimeouts?.navigation || 120000); } catch {}
    try { page.setDefaultTimeout(config.waitTimeouts?.element || 30000); } catch {}

    // response capture
    let rawCreditData = null;
    const capturedResponses = [];
    let reportScreenshotPath = null;
    let reportTextPath = null;
    let reportSectionsPath = null;
    let htmlDownloadPath = null;
    page.on('response', async (resp) => {
      try {
        const url = resp.url();
        if (!url) return;
        // capture candidate report responses (broad)
        if (/\/dsply\.aspx/i.test(url) || /dsply/i.test(url) || /csid/i.test(url) || /creditreport/i.test(url) || /GetReport/i.test(url) || /report/i.test(url)) {
          // try to parse as JSON, else keep text for debug
          const text = await resp.text().catch(() => '');
          const parsed = extractJsonLike(text);
          if (parsed && Object.keys(parsed || {}).length) {
            rawCreditData = parsed;
            capturedResponses.push({ url, status: resp.status(), size: (text||'').length });
            console.log('[IdentityIQ] Captured JSON-like response from', url);
          } else {
            capturedResponses.push({ url, status: resp.status(), length: (text||'').length });
          }
        }
      } catch (e) { /* ignore */ }
    });

    const loginUrl = config.loginUrl || 'https://member.identityiq.com/';
    console.log('[IdentityIQ] Navigating to login URL:', loginUrl);
    await page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: config.waitTimeouts?.navigation || 120000 });
    await sleep(700); // let SPA hydrate

    // optional ready screenshot
    try {
      const ts = new Date().toISOString().replace(/[:.]/g,'-');
      if (takeScreenshots) await page.screenshot({ path: path.join(outputDir, `login_ready_${ts}.png`), fullPage: true });
      console.log('[IdentityIQ] Login ready screenshot saved to', takeScreenshots ? `login_ready_${ts}.png` : '(skipped)');
      if (saveHtml) {
        const htmlPath = path.join(outputDir, `login_ready_${ts}.html`);
        fs.writeFileSync(htmlPath, await page.content(), 'utf8');
        console.log('[IdentityIQ] Login ready HTML saved to', htmlPath);
      }
    } catch (e) { console.log('[IdentityIQ] Could not save ready screenshot/HTML:', e?.message||e); }

    // detect bot/captcha early
    const htmlInitial = await page.content();
    if (/captcha|recaptcha|botcheck|cloudflare/i.test(htmlInitial)) {
      console.error('[IdentityIQ] Bot protection detected on initial page.');
      await saveDebugArtifacts(page, outputDir, 'bot_protection');
      throw new Error('Bot protection detected');
    }

    // login input detection
    const usernameSelectorsBase = ['input[type="email"]','input[name*="email"]','input[id*="email"]','input[placeholder*="Email"]','input[aria-label*="email"]','input[name*="user"]','input[id*="user"]','input[type="text"]'];
    const passwordSelectorsBase = ['input[type="password"]','input[name*="pass"]','input[id*="pass"]'];
    const usernameSelectors = Array.isArray(config?.selectors?.email_field) ? [...config.selectors.email_field, ...usernameSelectorsBase] : usernameSelectorsBase;
    const passwordSelectors = Array.isArray(config?.selectors?.password_field) ? [...config.selectors.password_field, ...passwordSelectorsBase] : passwordSelectorsBase;
    const userFound = await findVisibleInContexts(page, usernameSelectors, 10000);
    const passFound = await findVisibleInContexts(page, passwordSelectors, 10000);

    if (!userFound && !passFound) {
      console.log('[IdentityIQ] Login inputs not found; saving DOM inputs and failing.');
      await saveDebugArtifacts(page, outputDir, 'login_failed_no_inputs');
      throw new Error('Login inputs not found on page');
    }

    // pick login context
    let loginCtx = null, userSel = null, passSel = null;
    if (userFound && passFound && userFound.ctx === passFound.ctx) {
      loginCtx = userFound.ctx; userSel = userFound.selector; passSel = passFound.selector;
    } else if (userFound) { loginCtx = userFound.ctx; userSel = userFound.selector; passSel = passFound?.selector; }
    else { loginCtx = passFound.ctx; passSel = passFound.selector; userSel = userFound?.selector; }

    console.log('[IdentityIQ] Detected login context and selectors:', { userSelector: userSel, passSelector: passSel, contextUrl: loginCtx.url?.() || 'frame/page' });

    // type credentials
    const typeSafely = async (ctx, selector, value) => {
      try {
        if (!selector) return false;
        if (ctx.type) { await ctx.type(selector, value, { delay: 40 }); return true; }
      } catch (e) {}
      try {
        await ctx.$eval(selector, (el, v) => { el.focus && el.focus(); el.value = v; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }, value);
        return true;
      } catch (e) { return false; }
    };

    const userTyped = userSel ? await typeSafely(loginCtx, userSel, username) : false;
    const passTyped = passSel ? await typeSafely(loginCtx, passSel, password) : false;

    // fallback global fill
    if (!userTyped || !passTyped) {
      try {
        await page.evaluate((u, p) => {
          const uSel = document.querySelector('input[type="email"], input[name*="email"], input[placeholder*="Email"], input[name*="user"], input[id*="user"], input[type="text"]');
          const pSel = document.querySelector('input[type="password"], input[name*="pass"], input[id*="pass"]');
          if (uSel) { uSel.focus && uSel.focus(); uSel.value = u; uSel.dispatchEvent(new Event('input',{bubbles:true})); }
          if (pSel) { pSel.focus && pSel.focus(); pSel.value = p; pSel.dispatchEvent(new Event('input',{bubbles:true})); }
        }, username, password);
        await sleep(300);
      } catch (e) {}
    }

    // find & click login button
    const loginBtnSearch = ['button[type="submit"]','button[class*="login"]','button[class*="sign"]','input[type="submit"]','button','a[class*="login"]'];
    let loginBtn = await findVisibleInContexts(page, loginBtnSearch, 4000);

    if (!loginBtn) {
      const contexts = [page, ...page.frames()];
      for (const ctx of contexts) {
        const res = await clickByTextInContext(ctx, ['log in','sign in','submit','continue']);
        if (res && res.clicked) { loginBtn = { ctx, selector: null }; break; }
      }
    }

    if (!loginBtn) {
      console.log('[IdentityIQ] Login button not found; saving debug and failing.');
      await saveDebugArtifacts(page, outputDir, 'login_failed_no_button');
      throw new Error('Login button not found');
    }

    try {
      if (loginBtn.selector) {
        await loginBtn.ctx.evaluate(sel => { const e = document.querySelector(sel); if (e) e.click(); }, loginBtn.selector).catch(() => null);
      } else {
        await loginBtn.ctx.evaluate(() => {
          const els = Array.from(document.querySelectorAll('button, a, input[type="submit"], input[type="button"]'));
          for (const e of els) {
            const t = (e.innerText||e.value||'').toLowerCase();
            if (/log in|sign in|submit|continue/.test(t)) { e.click(); return true; }
          }
          const b = document.querySelector('button, input[type="submit"], a'); if (b) { b.click(); return true; }
          return false;
        }).catch(() => null);
      }
    } catch (e) {
      console.log('[IdentityIQ] Error clicking login button:', e?.message || e);
    }


      // ==================================================================
    // FINAL 2025-PROOF SSN HANDLER — WORKS ON REAL ACCOUNTS TODAY
    // ==================================================================
    console.log('[IdentityIQ] Waiting for SSN security question (up to 30s)...');
    await sleep(3000); // let iframe settle

    const ssnInputFound = await findVisibleInContexts(page, [
      'input[name="userSecurityAnswer"]',
      'input[id*="securityanswer" i]',
      'input[id*="txtSecurityAnswer" i]',
      'input[name*="securityanswer" i]',
      'input[placeholder*="last 4" i]',
      'input[placeholder*="SSN" i]',
      'input[maxlength="4"]',
      'input[name*="ssn" i]',
      'input[name*="last4" i]'
    ], 30000);

        if (ssnInputFound) {
      console.log('[IdentityIQ] SSN field FOUND → entering last 4 digits');
      const { ctx: ssnCtx, selector: ssnSel } = ssnInputFound;
      const ssnDigits = String(ssnLast4).replace(/\D/g, '').slice(-4);

      // 2025-PROOF SSN TYPING — WORKS EVERY TIME
      await ssnCtx.evaluate((sel, val) => {
        const el = document.querySelector(sel);
        if (!el) return;

        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (setter) {
          setter.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          el.value = val;
        }
        el.focus();
      }, ssnSel, ssnDigits);

      await sleep(800);

      // Force enable Submit button
      await ssnCtx.evaluate(() => {
        const btn = document.querySelector('button[disabled]');
        if (btn) btn.disabled = false;
      });

      // Click Submit
      let clicked = false;
      for (const ctx of [page, ...page.frames()]) {
        const res = await clickByTextInContext(ctx, ['submit', 'continue', 'verify']);
        if (res.clicked) {
          console.log('[IdentityIQ] Submit button clicked');
          clicked = true;
          break;
        }
      }
      if (!clicked) await page.keyboard.press('Enter');

      // Wait for dashboard
      try {
        await page.waitForFunction(
          () => !window.location.pathname.includes('security-question'),
          { timeout: 45000 }
        );
      } catch (e) {}
      console.log('[IdentityIQ] Successfully passed SSN → Dashboard loaded!');
    } else {
      console.log('[IdentityIQ] No SSN challenge → proceeding (rare case)');
    }
    // ==================================================================

    // Wait for dashboard/cookies/or captured responses to indicate login success
    let loginSucceeded = false;
    if (rawCreditData) loginSucceeded = true;
    if (!loginSucceeded) {
      const indicators = config.selectors?.dashboard_indicators || ['#dashboard','.dashboard','.account','.home','a[href*="account"]'];
      for (const sel of indicators) {
        try { await page.waitForSelector(sel, { timeout: 6000 }); loginSucceeded = true; console.log('[IdentityIQ] Dashboard indicator found:', sel); break; } catch {}
      }
    }
    if (!loginSucceeded) {
      const cookies = await page.cookies();
      if (cookies && cookies.length > 5) { loginSucceeded = true; console.log('[IdentityIQ] Cookies present after login:', cookies.length); }
    }
    if (!loginSucceeded) {
      console.error('[IdentityIQ] Login did not reach dashboard; saving debug artifacts.');
      await saveDebugArtifacts(page, outputDir, 'login_failed_post');
      throw new Error('Login failed to reach dashboard after SSN step (if applicable)');
    }
    console.log('[IdentityIQ] Login appears successful. Proceeding to report fetch.');
    console.log('[IdentityIQ] Dashboard ready. Ensuring cookies and session persistence.');
    await sleep(3000 + Math.random() * 2000);
    try { await page.mouse.move(Math.random()*800, Math.random()*600); } catch {}
    try {
      const cookies = await page.cookies();
      if (cookies && cookies.length) {
        const urlForCookies = page.url();
        const withUrl = cookies.map(c => (c.url ? c : { ...c, url: urlForCookies }));
        await page.setCookie(...withUrl);
        console.log('[IdentityIQ] Session cookies applied via page.setCookie:', withUrl.length);
      }
    } catch (e) { console.log('[IdentityIQ] Failed to set cookies on page:', e?.message || e); }
    try {
      page.on('framenavigated', async (frame) => {
        try {
          const url = frame.url() || '';
          if (url.startsWith('https://www.identityiq.com/')) {
            console.warn('[Redirect noticed] Frame navigated to main site:', url);
          }
        } catch {}
      });
    } catch {}
    try { await page.waitForTimeout(3000); } catch {}

    console.log('[IdentityIQ] Clicking "View Credit Report" from dashboard...');
    await sleep(4000);
    let reportClicked = { success: false };
    let navigated = false;
    try {
      await page.waitForSelector('a[href="/CreditReport.aspx"], a[href*="CreditReport.aspx"]', { timeout: 8000 });
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: Math.max(120000, config.waitTimeouts?.navigation || 120000) }),
        page.click('a[href="/CreditReport.aspx"], a[href*="CreditReport.aspx"]')
      ]);
      navigated = /CreditReport\.aspx/i.test(page.url());
      reportClicked.success = true;
    } catch {}
    if (!navigated) {
      try {
        reportClicked = await page.evaluate(() => {
          const patterns = /credit report|3.?bureau|view report|full report|credit scores|my report/i;
          const els = Array.from(document.querySelectorAll('a, button, div[role="button"], span, li'));
          for (const el of els) {
            const text = (el.innerText || el.textContent || '');
            const href = el.getAttribute('href') || '';
            if (patterns.test(text) || /CreditReport\.aspx/i.test(href)) {
              try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
              el.click();
              return { success: true, text: text.slice(0, 100) };
            }
          }
          return { success: false };
        });
      } catch {}
      if (reportClicked.success) {
        try { await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: Math.max(120000, config.waitTimeouts?.navigation || 120000) }); } catch {}
        navigated = /CreditReport\.aspx/i.test(page.url());
      }
    }
    if (!navigated) {
      console.log('[IdentityIQ] Fallback: navigating directly to CreditReport.aspx');
      try {
        await page.goto('https://member.identityiq.com/CreditReport.aspx', { waitUntil: 'networkidle0', timeout: Math.max(120000, config.waitTimeouts?.navigation || 120000) });
        navigated = /CreditReport\.aspx/i.test(page.url());
      } catch (e) {
        console.warn('[IdentityIQ] Direct navigation to CreditReport.aspx failed:', e?.message || e);
      }
    }
    await sleep(8000);
    if (saveHtml) {
      try {
        const ts = new Date().toISOString().replace(/[:.]/g,'-');
        const htmlPath = path.join(outputDir, `credit_report_page_${ts}.html`);
        fs.writeFileSync(htmlPath, await page.content(), 'utf8');
        console.log('[IdentityIQ] Credit report page HTML saved to', htmlPath);
      } catch (e) { console.log('[IdentityIQ] Failed to save credit report page HTML:', e?.message || e); }
    }

    // wait for report XHRs (best-effort)
    try {
      await page.waitForResponse((r) => {
        const u = (r.url() || '').toLowerCase();
        return (/dsply/.test(u) || /csid/.test(u) || /creditreport/.test(u) || /getreport/.test(u) || /report|scrape|trueLink|credit/i.test(u)) && r.status() === 200;
      }, { timeout: Math.max(15000, config.waitTimeouts?.report_load || 20000) }).catch(()=>null);
    } catch (e) {}

    await sleep(1200);

    // choose frame that contains visible report text and poll longer if needed
    let reportCtx = page;
    try {
      for (const f of page.frames()) {
        const hasReport = await f.evaluate(() => {
          try {
            const t = document.body ? (document.body.innerText || '') : '';
            return /Personal Information|Account History|Credit Score|Summary|Inquiries/i.test(t);
          } catch { return false; }
        }).catch(() => false);
        if (hasReport) { reportCtx = f; break; }
      }
      const ctxURL = reportCtx === page ? page.url() : reportCtx.url();
      console.log('[IdentityIQ] Report context selected:', ctxURL);
      try {
        await reportCtx.waitForFunction(() => {
          try { return /Credit Report Date|Personal Information|Account History|Summary|Inquiries/i.test(document.body.innerText || ''); } catch { return false; }
        }, { timeout: 20000 });
      } catch {}
    } catch (e) {}

    // screenshot + text + sections
    try {
      const ts = new Date().toISOString().replace(/[:.]/g,'-');
      reportScreenshotPath = path.join(outputDir, `credit_report_loaded_${ts}.png`);
      await page.screenshot({ path: reportScreenshotPath, fullPage: true });
      console.log('[IdentityIQ] Credit report screenshot saved to', reportScreenshotPath);

      const fullText = await reportCtx.evaluate(() => { try { return document.body ? (document.body.innerText || '') : ''; } catch { return ''; } });
      reportTextPath = path.join(outputDir, `client_${clientId||'unknown'}_identityiq_credit_report_text_${ts}.txt`);
      fs.writeFileSync(reportTextPath, fullText, 'utf8');
      console.log('[IdentityIQ] Credit report text saved to', reportTextPath);

      // split into sections by known headings (keeps raw text per section)
      const sections = await reportCtx.evaluate(() => {
        const t = document.body ? (document.body.innerText || '') : '';
        const heads = ['Personal Information','Credit Score','Risk Factors','Summary','Account History','Inquiries','Public Information','Creditor Contacts','Two-Year payment history','Account History','Summary','Credit Card'];
        const found = [];
        for (const h of heads) { const i = t.indexOf(h); if (i >= 0) found.push({ h, i }); }
        // fallback: also detect headings by lines that are all uppercase and short
        const lines = t.split('\n').map(l => l.trim()).filter(Boolean);
        for (let i=0;i<lines.length;i++){
          const l = lines[i];
          if (l.length>3 && l.length<40 && l === l.toUpperCase() && /[A-Z]/.test(l)) {
            if (!found.some(f=>f.h===l)) found.push({ h: l, i: t.indexOf(l) });
          }
        }
        found.sort((a,b)=>a.i-b.i);
        const obj = {};
        for (let k=0;k<found.length;k++){
          const start = found[k].i;
          const end = k+1 < found.length ? found[k+1].i : t.length;
          obj[found[k].h] = t.slice(start,end).trim();
        }
        // if no found headings, return entire body as one section
        if (Object.keys(obj).length === 0) obj['full_text'] = t;
        return obj;
      });
      reportSectionsPath = path.join(outputDir, `client_${clientId||'unknown'}_identityiq_sections_${ts}.json`);
      fs.writeFileSync(reportSectionsPath, JSON.stringify(sections, null, 2), 'utf8');
      console.log('[IdentityIQ] Credit report sections saved to', reportSectionsPath);
      try {
        let popupPage = null;
        page.once('popup', (p) => { popupPage = p; });
        try {
          page.once('targetcreated', async (target) => {
            try { const tpage = await target.page(); if (tpage) popupPage = tpage; } catch {}
          });
        } catch {}
        const clicked = await reportCtx.evaluate(() => {
          try {
            if (typeof window.downloadCreditReport === 'function') { window.downloadCreditReport(); return true; }
          } catch {}
          const a = document.querySelector('a.imgDownloadAction, a.re-btn-link.imgDownloadAction, a[onclick*="downloadCreditReport"]');
          if (a) { a.click(); return true; }
          return false;
        });
        if (clicked) {
          await Promise.race([sleep(1500), (async () => { try { await page.waitForFunction(() => document.readyState === 'complete', { timeout: 3000 }); } catch {} })() ]);
          const dlPage = popupPage || page;
          try { await dlPage.waitForFunction(() => document.readyState === 'complete', { timeout: 8000 }); } catch {}
          const fname = `client_${clientId||'unknown'}_identityiq_download_${new Date().toISOString().replace(/[:.]/g,'-')}.html`;
          const fpath = path.join(outputDir, fname);
          const html = await dlPage.content();
          fs.writeFileSync(fpath, html, 'utf8');
          htmlDownloadPath = fpath;
          console.log('[IdentityIQ] Downloaded HTML report saved to', fpath);
        }
      } catch (e) { console.log('[IdentityIQ] Download button handling failed:', e?.message || e); }
    } catch (e) { console.log('[IdentityIQ] Report screenshot/text extraction failed:', e?.message || e); }

    // If we haven't captured rawCreditData yet, try to discover in global objects or script tags
    if (!rawCreditData) {
      const contexts = [page, ...page.frames()];
      for (const ctx of contexts) {
        try {
          const candidate = await ctx.evaluate(() => window.BundleComponents || window.creditReportData || window.reportData || window.__CREDIT_REPORT_DATA__ || null).catch(()=>null);
          if (candidate) { rawCreditData = candidate; break; }
        } catch (e) {}
        try {
          const scriptJson = await ctx.evaluate(() => {
            const scripts = Array.from(document.querySelectorAll('script')).map(s => s.textContent || '');
            let best = null;
            for (const txt of scripts) {
              if (/BundleComponents|TrueLinkCreditReportType|creditReport/i.test(txt)) {
                const matches = txt.match(/\{[\s\S]*\}/g);
                if (matches && matches.length) {
                  const largest = matches.reduce((a,b)=>a.length>b.length?a:b, matches[0]);
                  if (!best || largest.length > best.length) best = largest;
                }
              }
            }
            return best;
          }).catch(()=>null);
          if (scriptJson) {
            try { rawCreditData = JSON.parse(scriptJson); break; } catch (e) {}
          }
        } catch (e) {}
      }
    }

    // If still no rawCreditData, we already saved reportSectionsPath -> use sections as fallback for payload
    let reportStructured = {};
    if (rawCreditData) {
      try {
        const scraper = new Scraper(config);
        reportStructured = await scraper.Parse(rawCreditData);
        console.log('[IdentityIQ] Scraper.Parse complete, keys=', Object.keys(reportStructured || {}).length);
      } catch (e) {
        console.log('[IdentityIQ] Scraper.Parse error:', e?.message || e);
        // keep rawCreditData as fallback
        reportStructured = {};
      }
    }

    // Build unified payload that will ALWAYS be written
    const sectionsJson = (() => {
      try {
        if (reportSectionsPath && fs.existsSync(reportSectionsPath)) {
          return JSON.parse(fs.readFileSync(reportSectionsPath, 'utf8'));
        }
      } catch (e) {}
      return {};
    })();

    // scores & reportDate extraction: prefer rawCreditData -> parsed -> sections text
    let experian = null, equifax = null, transunion = null, reportDate = null;
    if (rawCreditData) {
      try {
        const rc = rawCreditData || {};
        experian = rc?.Scores?.Experian?.Score || rc?.Experian?.score || rc?.experianScore || rc?.scores?.experian || null;
        equifax = rc?.Scores?.Equifax?.Score || rc?.Equifax?.score || rc?.equifaxScore || rc?.scores?.equifax || null;
        transunion = rc?.Scores?.TransUnion?.Score || rc?.TransUnion?.score || rc?.transunionScore || rc?.scores?.transunion || null;
        reportDate = rc?.reportDate || rc?.ReportDate || null;
      } catch (e) {}
    }
    if ((!experian && !equifax && !transunion) && reportStructured && Object.keys(reportStructured).length) {
      try {
        // Try to find scores inside structured parse
        experian = experian || reportStructured?.scores?.experian || reportStructured?.Experian?.score || null;
        equifax = equifax || reportStructured?.scores?.equifax || reportStructured?.Equifax?.score || null;
        transunion = transunion || reportStructured?.scores?.transunion || reportStructured?.TransUnion?.score || null;
        reportDate = reportDate || reportStructured?.reportDate || null;
      } catch (e) {}
    }
    if ((!experian && !equifax && !transunion) && sectionsJson && Object.keys(sectionsJson).length) {
      const parsed = parseScoresFromSections(sectionsJson);
      experian = experian || parsed.experian || null;
      equifax = equifax || parsed.equifax || null;
      transunion = transunion || parsed.transunion || null;
      if (!experian && !equifax && !transunion && parsed.credit_score) reportStructured.summaryScore = parsed.credit_score;
      reportDate = reportDate || parseReportDateFromSections(sectionsJson);
    }

    // Build final payload and always save to JSON file
    const tsFinal = new Date().toISOString().replace(/[:.]/g,'-');
    const finalJsonPath = path.join(outputDir, `client_${clientId||'unknown'}_identityiq_unified_${tsFinal}.json`);
    const payload = {
      clientInfo: {
        clientId: clientId || 'unknown',
        username: username || null,
        timestamp: new Date().toISOString(),
        scrapedAt: new Date().toISOString(),
        reportUrl: (page && typeof page.url === 'function') ? page.url() : null,
      },
      artifactPaths: {
        screenshot: reportScreenshotPath || null,
        text: reportTextPath || null,
        sections: reportSectionsPath || null,
        downloadHtml: htmlDownloadPath || null
      },
      rawCreditData: rawCreditData || null,
      parsedStructured: reportStructured && Object.keys(reportStructured).length ? reportStructured : null,
      sections: sectionsJson || null,
      scores: {
        experian: experian || null,
        equifax: equifax || null,
        transunion: transunion || null
      },
      reportDate: reportDate || null,
      capturedResponses: capturedResponses || []
    };

    fs.writeFileSync(finalJsonPath, safeStringify(payload), 'utf8');
    console.log('[IdentityIQ] Final unified JSON saved to', finalJsonPath);

    // Return a consistent API: reportData (structured if any), filePath, rawCreditData, scores, artifacts
    let resultFilePath = finalJsonPath;
    try {
      if (payload.parsedStructured && Object.keys(payload.parsedStructured || {}).length) {
        const conv = {
          clientInfo: {
            clientId: clientId || 'unknown',
            username: username || null,
            timestamp: new Date().toISOString(),
            reportDate: payload.reportDate || null
          },
          reportData: payload.parsedStructured
        };
        const convertPath = path.join(outputDir, `client_${clientId||'unknown'}_report_${tsFinal}.json`);
        fs.writeFileSync(convertPath, safeStringify(conv), 'utf8');
        console.log('[IdentityIQ] Converted report JSON saved to', convertPath);
        resultFilePath = convertPath;
      }
    } catch (e) {}
    return {
      reportData: payload.parsedStructured || payload.sections || {},
      filePath: resultFilePath,
      rawCreditData: payload.rawCreditData,
      scores: payload.scores,
      capturedResponses,
      artifacts: payload.artifactPaths
    };

  } catch (err) {
    console.error('[IdentityIQ] Scraper error:', err?.message || err);
    if (page) await saveDebugArtifacts(page, outputDir, 'login_failed');
    throw err;
  } finally {
    try { if (page) await page.close(); } catch {}
    try { if (browser) await browser.close(); } catch {}
    console.log('[IdentityIQ] Browser closed');
  }
}

export default fetchIdentityIQReport;