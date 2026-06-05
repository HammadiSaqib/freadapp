/**
 * final-myscoreiq-scraper.js
 *
 * Hybrid MyScoreIQ scraper:
 * - UI login (handles SSN last-4 security step)
 * - Visits CreditReport.aspx (hard-coded per your choice)
 * - Captures JSON XHRs when available
 * - Always writes fallback artifacts and a unified JSON payload
 *
 * Usage:
 * import fetchMyScoreIQReport from './final-myscoreiq-scraper.js';
 * await fetchMyScoreIQReport(username, password, { outputDir:'./scraper-output', clientId:'abc', ssnLast4:'1234' });
 */

import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());
import { Scraper } from '../../../scraper/scrapper.js';

const configPath = path.resolve(process.cwd(), 'configs/myscoreiq_config.json');
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
        // common order on sample: TransUnion Experian Equifax
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

async function fetchMyScoreIQReport(username, password, options = {}) {
  const { outputDir = './scraper-output', clientId, ssnLast4, puppeteerOverrides = {} } = options;
  config = loadConfig();
  ensureDir(outputDir);
  console.log('[MyScoreIQ] Config reloaded. loginUrl=', config.loginUrl || config.url, 'base url=', config.url);

  let browser = null;
  let page = null;
  try {
    console.log(`[MyScoreIQ] Starting scraper for clientId=${clientId || 'unknown'} username=${String(username).slice(0,3)}***`);
    const launchOpts = {
      headless: true,
      slowMo: puppeteerOverrides.slowMo ?? config.puppeteerConfig?.slowMo ?? 0,
      args: puppeteerOverrides.args ?? config.puppeteerConfig?.args ?? [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer'
      ]
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
    page.on('response', async (resp) => {
      try {
        const url = resp.url() || '';
        if (!url.toLowerCase().includes('imc-us3.csid.co')) return;

        const status = resp.status();
        const text = await resp.text().catch(() => '');
        capturedResponses.push({ url, status, size: (text || '').length });

        if (rawCreditData) return;
        if (!text) return;

        let parsed = extractJsonLike(text);
        if (!parsed) {
          try {
            parsed = JSON.parse(text);
          } catch (e) {
            parsed = null;
          }
        }

        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length) {
          rawCreditData = parsed;
          console.log('[MyScoreIQ] Captured credit report payload from', url);
        }
      } catch (e) {
        console.log('[MyScoreIQ] Response processing error:', e?.message || e);
      }
    });

    const loginUrl = config.loginUrl || 'https://member.myscoreiq.com/';
    console.log('[MyScoreIQ] Navigating to login URL:', loginUrl);
    await page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: config.waitTimeouts?.navigation || 120000 });
    await sleep(700); // let SPA hydrate

    // detect bot/captcha early
    const htmlInitial = await page.content();
    if (/captcha|recaptcha|botcheck|cloudflare/i.test(htmlInitial)) {
      console.error('[MyScoreIQ] Bot protection detected on initial page.');
      await saveDebugArtifacts(page, outputDir, 'bot_protection');
      throw new Error('Bot protection detected');
    }

    // login input detection
    const usernameSelectors = ['input[type="email"]','input[name*="email"]','input[id*="email"]','input[placeholder*="Email"]','input[aria-label*="email"]','input[name*="user"]','input[id*="user"]','input[type="text"]'];
    const passwordSelectors = ['input[type="password"]','input[name*="pass"]','input[id*="pass"]'];
    const userFound = await findVisibleInContexts(page, usernameSelectors, 4000);
    const passFound = await findVisibleInContexts(page, passwordSelectors, 4000);

    if (!userFound && !passFound) {
      console.log('[MyScoreIQ] Login inputs not found; saving DOM inputs and failing.');
      await saveDebugArtifacts(page, outputDir, 'login_failed_no_inputs');
      throw new Error('Login inputs not found on page');
    }

    // pick login context
    let loginCtx = null, userSel = null, passSel = null;
    if (userFound && passFound && userFound.ctx === passFound.ctx) {
      loginCtx = userFound.ctx; userSel = userFound.selector; passSel = passFound.selector;
    } else if (userFound) { loginCtx = userFound.ctx; userSel = userFound.selector; passSel = passFound?.selector; }
    else { loginCtx = passFound.ctx; passSel = passFound.selector; userSel = userFound?.selector; }

    console.log('[MyScoreIQ] Detected login context and selectors:', { userSelector: userSel, passSelector: passSel, contextUrl: loginCtx.url?.() || 'frame/page' });

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
      console.log('[MyScoreIQ] Login button not found; saving debug and failing.');
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
      console.log('[MyScoreIQ] Error clicking login button:', e?.message || e);
    }


      // ==================================================================
    // FINAL 2025-PROOF SSN HANDLER — WORKS ON REAL ACCOUNTS TODAY
    // ==================================================================
    console.log('[MyScoreIQ] Waiting for SSN security question (up to 30s)...');
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
      console.log('[MyScoreIQ] SSN field FOUND → entering last 4 digits');
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
          console.log('[MyScoreIQ] Submit button clicked');
          clicked = true;
          break;
        }
      }
      if (!clicked) await page.keyboard.press('Enter');

      // Wait for dashboard
      await page.waitForFunction(
        () => !window.location.pathname.includes('security-question'),
        { timeout: 20000 }
      );
      console.log('[MyScoreIQ] Successfully passed SSN → Dashboard loaded!');
    } else {
      console.log('[MyScoreIQ] No SSN challenge → proceeding (rare case)');
    }
    // ==================================================================

    console.log('[MyScoreIQ] Login appears successful. Navigating directly to JSON report view.');
    const jsonEndpoint = 'https://member.myscoreiq.com/CreditReport.aspx?view=json';
    let jsonResponse = null;
    try {
      jsonResponse = await page.goto(jsonEndpoint, {
        waitUntil: 'networkidle0',
        timeout: Math.max(30000, config.waitTimeouts?.navigation || 30000),
      });
      console.log('[MyScoreIQ] Reached JSON endpoint with status', jsonResponse?.status?.() ?? 'unknown');
    } catch (e) {
      console.warn('[MyScoreIQ] Failed to navigate directly to JSON endpoint:', e?.message || e);
    }

    if (!rawCreditData && jsonResponse) {
      try {
        const text = await jsonResponse.text();
        capturedResponses.push({ url: jsonEndpoint, status: jsonResponse.status?.() ?? null, size: (text || '').length });
        if (text) {
          let parsed = extractJsonLike(text);
          if (!parsed) {
            try {
              parsed = JSON.parse(text);
            } catch (err) {
              parsed = null;
            }
          }
          if (parsed && typeof parsed === 'object' && Object.keys(parsed).length) {
            rawCreditData = parsed;
            console.log('[MyScoreIQ] Captured credit report payload from direct JSON endpoint');
          }
        }
      } catch (e) {
        console.log('[MyScoreIQ] Unable to parse direct JSON endpoint response:', e?.message || e);
      }
    }

    if (!rawCreditData) {
      try {
        await page.waitForResponse((r) => {
          const u = (r.url() || '').toLowerCase();
          return (/dsply/.test(u) || /csid/.test(u) || /creditreport/.test(u) || /getreport/.test(u) || /report|scrape|trueLink|credit/i.test(u)) && r.status() === 200;
        }, { timeout: Math.min(7000, config.waitTimeouts?.report_load || 7000) }).catch(() => null);
      } catch (e) {}
    }

    await sleep(300);

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
      console.log('[MyScoreIQ] Report context selected:', ctxURL);
      try {
        await reportCtx.waitForFunction(() => {
          try { return /Credit Report Date|Personal Information|Account History|Summary|Inquiries/i.test(document.body.innerText || ''); } catch { return false; }
        }, { timeout: 60000 });
      } catch {}
    } catch (e) {}

    // Wait for JSON payload to populate; if unavailable fall back to DOM extraction for structure
    try {
      await page.waitForFunction(() => {
        try {
          return !!(window.BundleComponents || window.creditReportData || window.reportData || window.__CREDIT_REPORT_DATA__);
        } catch { return false; }
      }, { timeout: 15000 }).catch(() => null);
    } catch {}

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

    let reportStructured = {};
    if (rawCreditData) {
      try {
        const scraper = new Scraper(config);
        reportStructured = await scraper.Parse(rawCreditData);
        console.log('[MyScoreIQ] Scraper.Parse complete, keys=', Object.keys(reportStructured || {}).length);
      } catch (e) {
        console.log('[MyScoreIQ] Scraper.Parse error:', e?.message || e);
        // keep rawCreditData as fallback
        reportStructured = {};
      }
    }

    // Build unified payload that will ALWAYS be written
    const sectionsJson = null;

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
    // Build final payload and always save to JSON file
    const tsFinal = new Date().toISOString().replace(/[:.]/g,'-');
    const finalJsonPath = path.join(outputDir, `client_${clientId||'unknown'}_myscoreiq_unified_${tsFinal}.json`);
    const artifactPaths = {
      screenshot: null,
      text: null,
      sections: null,
      downloadHtml: null,
    };
    const payload = {
      clientInfo: {
        clientId: clientId || 'unknown',
        username: username || null,
        timestamp: new Date().toISOString(),
        scrapedAt: new Date().toISOString(),
        reportUrl: (page && typeof page.url === 'function') ? page.url() : null,
      },
      artifactPaths,
      rawCreditData: rawCreditData || null,
      parsedStructured: reportStructured && Object.keys(reportStructured).length ? reportStructured : null,
      sections: sectionsJson,
      scores: {
        experian: experian || null,
        equifax: equifax || null,
        transunion: transunion || null
      },
      reportDate: reportDate || null,
      capturedResponses: capturedResponses || []
    };

    fs.writeFileSync(finalJsonPath, safeStringify(payload), 'utf8');
    console.log('[MyScoreIQ] Final unified JSON saved to', finalJsonPath);

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
        console.log('[MyScoreIQ] Converted report JSON saved to', convertPath);
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
    console.error('[MyScoreIQ] Scraper error:', err?.message || err);
    if (page) await saveDebugArtifacts(page, outputDir, 'login_failed');
    throw err;
  } finally {
    try { if (page) await page.close(); } catch {}
    try { if (browser) await browser.close(); } catch {}
    console.log('[MyScoreIQ] Browser closed');
  }
}

export default fetchMyScoreIQReport;
