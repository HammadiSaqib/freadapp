/**
 * Credit Report Scraper Routes
 * 
 * API endpoints for scraping credit reports from various platforms
 */

import express from 'express';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { fetchCreditReport, PLATFORMS } from '../services/scrapers/index.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { getDatabaseAdapter } from '../database/databaseAdapter.js';
import { emailService } from '../services/emailService.js';

const router = express.Router();

// In-memory scrape jobs store
const scrapeJobs = new Map();
const makeJobId = () => `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
const updateJob = (jobId, changes) => {
  const existing = scrapeJobs.get(jobId) || { id: jobId };
  const updated = { ...existing, ...changes };
  scrapeJobs.set(jobId, updated);
  return updated;
};

const normalizeLookupValue = (value) => String(value || '').trim().toLowerCase();

const resolveBaseUserId = async (req) => {
  const user = req.user;
  if (!user || !user.id) return null;
  if (user.role === 'funding_manager' || user.role === 'admin' || user.role === 'super_admin') {
    return Number(user.id);
  }

  try {
    const db = getDatabaseAdapter();
    const rows = await db.executeQuery(
      'SELECT admin_id FROM employees WHERE user_id = ? AND status = ? ORDER BY updated_at DESC LIMIT 1',
      [user.id, 'active']
    );
    if (Array.isArray(rows) && rows.length > 0 && rows[0]?.admin_id) {
      return Number(rows[0].admin_id);
    }
  } catch (error) {
    console.error('Failed resolving base user for scrape match:', error);
  }

  return Number(user.id);
};

const findExistingClientIdForScrape = async (req, platform, username) => {
  const normalizedPlatform = normalizeLookupValue(platform);
  const normalizedUsername = normalizeLookupValue(username);
  if (!normalizedPlatform || !normalizedUsername) return null;

  const baseUserId = await resolveBaseUserId(req);
  if (!baseUserId) return null;

  const db = getDatabaseAdapter();
  const rows = await db.executeQuery(
    `SELECT id
       FROM clients
      WHERE user_id = ?
        AND LOWER(TRIM(COALESCE(platform, ''))) = ?
        AND LOWER(TRIM(COALESCE(NULLIF(platform_email, ''), email, ''))) = ?
      ORDER BY updated_at DESC, id DESC
      LIMIT 1`,
    [baseUserId, normalizedPlatform, normalizedUsername]
  );

  if (Array.isArray(rows) && rows.length > 0 && rows[0]?.id) {
    return Number(rows[0].id);
  }

  return null;
};

// Validation schema for scraper requests
const scraperRequestSchema = z.object({
  platform: z.string().min(1).refine(val => {
    return Object.values(PLATFORMS).includes(val.toLowerCase());
  }, {
    message: 'Unsupported platform'
  }),
  credentials: z.object({
    username: z.string().min(1),
    password: z.string().min(1)
  }),
  options: z.object({
    saveHtml: z.boolean().optional(),
    takeScreenshots: z.boolean().optional(),
    outputDir: z.string().optional(),
    ssnLast4: z.string().length(4).optional()
  }).optional()
});

/**
 * @route POST /api/credit-reports/scrape
 * @desc Scrape credit report from specified platform
 * @access Private
 */
router.post('/scrape', authenticateToken, async (req, res) => {
  try {
    try {
      req.setTimeout?.(300000);
      res.setTimeout?.(300000);
      req.socket?.setTimeout?.(300000);
    } catch {}
    try {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('X-Accel-Buffering', 'no');
    } catch {}
    let __keepAlive = null;
    try {
      __keepAlive = setInterval(() => { try { res.write(' '); } catch {} }, 10000);
      res.on('close', () => { try { clearInterval(__keepAlive); } catch {} });
    } catch {}
    // Validate request body
    const validationResult = scraperRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validationResult.error.errors
      });
    }
    
    const { platform, credentials, options } = validationResult.data;
    const requestedClientId = req.query.clientId || req.body.clientId || 'unknown';
    let clientId = requestedClientId;

    if (!clientId || String(clientId) === 'unknown') {
      try {
        const matchedClientId = await findExistingClientIdForScrape(req, platform, credentials.username);
        if (matchedClientId) {
          clientId = String(matchedClientId);
          console.log(`Matched existing client ${clientId} for ${platform} / ${credentials.username}`);
        }
      } catch (matchError) {
        console.error('Failed to match existing client for scrape:', matchError);
      }
    }
    
    // Set default options
    const scraperOptions = {
      saveHtml: false,
      takeScreenshots: false,
      outputDir: './scraper-output',
      clientId: clientId,
      ...options
    };

    // Async job-based scraping mode: returns immediately
    const asyncFlag = (
      (options && options.async === true) ||
      ['1','true','yes'].includes(String(req.query.async || '').toLowerCase())
    );

    if (asyncFlag) {
      try { clearInterval(__keepAlive); } catch {}
      const jobId = makeJobId();
      const ws = (req.app && (req.app).websocketService) ? (req.app).websocketService : null;
      updateJob(jobId, {
        status: 'queued',
        progress: 0,
        platform,
        clientId,
        userId: (req.user && req.user.id) ? req.user.id : null,
        startedAt: new Date().toISOString()
      });

      // Respond immediately
      res.status(202).json({ success: true, jobId, status: 'queued' });

      // Run job in background
      setImmediate(async () => {
        try {
          updateJob(jobId, { status: 'running', progress: 5 });
          try { ws?.broadcastToStream?.('scrape_jobs', 'scrape_job_update', { jobId, status: 'running', progress: 5 }); } catch {}

          const startTime = Date.now();
          const reportData = await fetchCreditReport(
            platform,
            credentials.username,
            credentials.password,
            scraperOptions
          );

          const durationMs = Date.now() - startTime;
          updateJob(jobId, { progress: 60, durationMs });
          try { ws?.broadcastToStream?.('scrape_jobs', 'scrape_job_update', { jobId, status: 'running', progress: 60, durationMs }); } catch {}

          // Extract and save report history to DB (fallbacks for scraper payload)
          try {
            const dbUtil = await import('../database/dbConnection.js');

            // Compute scores
            let experianScore = null;
            let equifaxScore = null;
            let transunionScore = null;
            let creditScore = null;
            let reportDate = null;
            let notes = null;

            // From normalized route structures
            if (reportData && reportData.reportData && Array.isArray(reportData.reportData.Score)) {
              const scores = reportData.reportData.Score;
              scores.forEach(score => {
                const scoreValue = parseInt(score.Score);
                if (!isNaN(scoreValue)) {
                  if (score.BureauId === 1) transunionScore = scoreValue;
                  if (score.BureauId === 2) experianScore = scoreValue;
                  if (score.BureauId === 3) equifaxScore = scoreValue;
                }
              });
            } else if (reportData && Array.isArray(reportData.Score)) {
              const scores = reportData.Score;
              scores.forEach(score => {
                const scoreValue = parseInt(score.Score);
                if (!isNaN(scoreValue)) {
                  if (score.BureauId === 1) transunionScore = scoreValue;
                  if (score.BureauId === 2) experianScore = scoreValue;
                  if (score.BureauId === 3) equifaxScore = scoreValue;
                }
              });
            } else if (reportData && reportData.scores && typeof reportData.scores === 'object') {
              // Fallback to scraper's scores object
              const s = reportData.scores;
              const toInt = (v) => { const n = parseInt(String(v)); return isNaN(n) ? null : n; };
              experianScore = toInt(s.experian);
              equifaxScore = toInt(s.equifax);
              transunionScore = toInt(s.transunion);
            }
            const validScores = [experianScore, equifaxScore, transunionScore].filter(v => v !== null);
            if (validScores.length > 0) creditScore = Math.max(...validScores);

            // Report date fallback
            if (reportData && reportData.reportData && reportData.reportData.ReportDate) {
              reportDate = reportData.reportData.ReportDate;
            } else if (reportData && Array.isArray(reportData.CreditReport) && reportData.CreditReport[0]?.DateReport) {
              reportDate = reportData.CreditReport[0].DateReport;
            } else {
              reportDate = new Date().toISOString().substring(0,10);
            }

            // Notes
            notes = JSON.stringify({
              platform,
              scraped_at: new Date().toISOString(),
              has_scores: !!(experianScore || equifaxScore || transunionScore),
              bureau_scores: { experian: experianScore, equifax: equifaxScore, transunion: transunionScore }
            });

            const historyData = {
              client_id: clientId,
              platform,
              report_path: reportData.converted_report_path || reportData.filePath || null,
              status: 'completed',
              credit_score: creditScore,
              experian_score: experianScore,
              equifax_score: equifaxScore,
              transunion_score: transunionScore,
              report_date: reportDate,
              notes
            };

            const timeoutMs = 10000;
            const savePromise = dbUtil.saveCreditReport(historyData);
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB save timeout')), timeoutMs));
            const result = await Promise.race([savePromise, timeoutPromise]);
            
            updateJob(jobId, { status: 'completed', progress: 100, reportId: result.insertId, result: {
              convertedReportPath: reportData.converted_report_path || null,
              filePath: reportData.filePath || null,
              durationMs,
              creditScore,
              scores: { experian: experianScore, equifax: equifaxScore, transunion: transunionScore }
            }, finishedAt: new Date().toISOString() });
            try { ws?.broadcastToStream?.('scrape_jobs', 'scrape_job_done', { jobId, status: 'completed', reportId: result.insertId }); } catch {}
            if (updateJob(jobId, {}).userId) { try { ws?.broadcastToUser?.(updateJob(jobId, {}).userId, 'scrape_job_done', { jobId, reportId: result.insertId }); } catch {} }
            
            const hasScores = experianScore !== null || equifaxScore !== null || transunionScore !== null;
            let rawReportDate = null;
            if (reportData && reportData.reportData && reportData.reportData.ReportDate) {
              rawReportDate = reportData.reportData.ReportDate;
            } else if (reportData && Array.isArray(reportData.CreditReport) && reportData.CreditReport[0] && reportData.CreditReport[0].DateReport) {
              rawReportDate = reportData.CreditReport[0].DateReport;
            }
            const hasRealReportDate = !!rawReportDate;
            const numericClientId = clientId && clientId !== 'unknown' ? parseInt(String(clientId), 10) : NaN;
            if (hasScores && hasRealReportDate && !isNaN(numericClientId) && req.user && req.user.email) {
              try {
                const clientRows = await dbUtil.executeQuery(
                  'SELECT first_name, last_name FROM clients WHERE id = ? LIMIT 1',
                  [numericClientId]
                );
                const clientRow = Array.isArray(clientRows) && clientRows.length ? clientRows[0] : null;
                const clientName = clientRow ? `${clientRow.first_name || ''} ${clientRow.last_name || ''}`.trim() : `Client #${numericClientId}`;
                const formattedDate = (() => {
                  try {
                    const d = new Date(rawReportDate);
                    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
                  } catch {}
                  return String(rawReportDate);
                })();
                const scoresSummaryParts = [];
                if (experianScore !== null) scoresSummaryParts.push(`Experian: ${experianScore}`);
                if (equifaxScore !== null) scoresSummaryParts.push(`Equifax: ${equifaxScore}`);
                if (transunionScore !== null) scoresSummaryParts.push(`TransUnion: ${transunionScore}`);
                const scoresSummary = scoresSummaryParts.join(' | ');
                const html = `
                  <p>A new credit report has been scraped successfully.</p>
                  <p><strong>Client:</strong> ${clientName}</p>
                  <p><strong>Client ID:</strong> ${numericClientId}</p>
                  <p><strong>Platform:</strong> ${platform}</p>
                  <p><strong>Report Date:</strong> ${formattedDate}</p>
                  <p><strong>Scores:</strong> ${scoresSummary || 'N/A'}</p>
                `;
                const textLines = [
                  'A new credit report has been scraped successfully.',
                  `Client: ${clientName}`,
                  `Client ID: ${numericClientId}`,
                  `Platform: ${platform}`,
                  `Report Date: ${formattedDate}`,
                  `Scores: ${scoresSummary || 'N/A'}`
                ];
                emailService.sendEmail({
                  to: req.user.email,
                  subject: `New credit report for ${clientName || 'client'} (${String(platform)})`,
                  html,
                  text: textLines.join('\n')
                }).catch(err => {
                  console.error('Failed to send credit report admin email:', err);
                });
              } catch (e) {
                console.error('Error preparing credit report admin email:', e);
              }
            }
          } catch (dbErr) {
            updateJob(jobId, { status: 'failed', progress: 100, error: String(dbErr && dbErr.message || dbErr) });
            try { ws?.broadcastToStream?.('scrape_jobs', 'scrape_job_error', { jobId, error: String(dbErr && dbErr.message || dbErr) }); } catch {}
          }
        } catch (err) {
          updateJob(jobId, { status: 'failed', progress: 100, error: String(err && err.message || err) });
          try { (req.app && (req.app).websocketService)?.broadcastToStream?.('scrape_jobs', 'scrape_job_error', { jobId, error: String(err && err.message || err) }); } catch {}
        }
      });

      return; // ensure no sync path execution
    }
    
    // Start scraping process
    console.log(`Starting credit report scrape for platform: ${platform}, clientId: ${clientId}`);
    const safeOptionsLog = {
      ...scraperOptions,
      ssnLast4: scraperOptions.ssnLast4 ? '****' : undefined,
      outputDir: scraperOptions.outputDir,
    };
    console.log('Scraper options:', safeOptionsLog);
    
    const startTime = Date.now();
    const reportData = await fetchCreditReport(
      platform,
      credentials.username,
      credentials.password,
      scraperOptions
    );
    console.log("🔥🔥 FULL RAW MyScoreIQ SCRAPER OUTPUT:", JSON.stringify(reportData, null, 2));

    const durationMs = Date.now() - startTime;
    console.log(`Scrape finished for ${platform} in ${durationMs}ms`);

    // Normalize MyScoreIQ output to MyFreeScoreNow-like and extract section paths
    try {
      // --- Start robust MyScoreIQ conversion block ---
if (platform && String(platform).toLowerCase() === String(PLATFORMS.MYSCOREIQ).toLowerCase()) {
  const outDir = scraperOptions.outputDir || './scraper-output';
  const cid = String(clientId || 'unknown');
  const ts = new Date().toISOString().replace(/[:.]/g, '-');

  // 1) Debug: log top-level keys and small sample so we know what the scraper returned
  try {
    console.log("🔥 RAW SCRAPER OUTPUT KEYS:", Object.keys(reportData || {}).join(', '));
    // print a small sample (protect large outputs)
    const sample = (() => {
      try {
        const preview = { keys: Object.keys(reportData || {}) };
        if (reportData && typeof reportData === 'object') {
          // include the first-level small values for quick diagnosis
          for (const k of Object.keys(reportData)) {
            try {
              const v = reportData[k];
              if (typeof v === 'string' && v.length < 200) preview[k] = v;
              else if (Array.isArray(v)) preview[k] = `array(${v.length})`;
              else if (v && typeof v === 'object') preview[k] = `object(${Object.keys(v).slice(0,5).join(',')}${Object.keys(v).length>5 ? ',...' : ''})`;
            } catch {}
          }
        }
        return preview;
      } catch { return null; }
    })();
    console.log('🔥 RAW SCRAPER OUTPUT SAMPLE:', JSON.stringify(sample, null, 2));
  } catch (e) {
    console.warn('Failed to log raw scraper output sample:', e?.message || e);
  }

  // Helper: safe read
  const safeGet = (obj, pathArr) => {
    try {
      return pathArr.reduce((acc, p) => (acc && typeof acc === 'object' ? acc[p] : undefined), obj);
    } catch { return undefined; }
  };

  // Helper: merge arrays across object of bureaus if present
  const mergeAcrossBureaus = (obj, keyNames = []) => {
    const bureaus = ['TransUnion','Experian','Equifax','transunion','experian','equifax'];
    const out = [];
    for (const b of bureaus) {
      if (obj && obj[b] && typeof obj[b] === 'object') {
        for (const k of keyNames) {
          if (Array.isArray(obj[b][k])) {
            for (const item of obj[b][k]) {
              try { out.push({ ...(item || {}), bureau: b }); } catch { out.push(item); }
            }
          }
          // try alternative key name casing
          const alt = Object.keys(obj[b]).find(x => x.toLowerCase() === k.toLowerCase());
          if (alt && Array.isArray(obj[b][alt])) {
            for (const item of obj[b][alt]) {
              try { out.push({ ...(item || {}), bureau: b }); } catch { out.push(item); }
            }
          }
        }
      }
    }
    return out;
  };

  const flattenRawData = (obj, key) => {
    const out = [];
    try {
      const list = obj && obj.data;
      if (Array.isArray(list)) {
        for (const entry of list) {
          const v = entry && entry[key];
          if (!v) continue;
          if (Array.isArray(v)) {
            for (const item of v) {
              try { out.push({ ...(item || {}), bureau: entry?.bureau, year_of_birth: entry?.year_of_birth }); }
              catch { out.push(item); }
            }
          } else {
            try { out.push({ ...(v || {}), bureau: entry?.bureau, year_of_birth: entry?.year_of_birth }); }
            catch { out.push(v); }
          }
        }
      }
    } catch {}
    return out;
  };

  const bureauToId = (b) => {
    try {
      const s = String(b || '').toLowerCase();
      if (s.includes('trans')) return 1;
      if (s.includes('exper')) return 2;
      if (s.includes('equif')) return 3;
    } catch {}
    return null;
  };
  const bureauToIdMSQ = (b) => {
    try {
      const s = String(b || '').toLowerCase();
      if (s.includes('trans')) return 1;
      if (s.includes('equif')) return 3;
      if (s.includes('exper')) return 2;
    } catch {}
    return null;
  };
  const bureauIndexToIdMSQ = (i) => {
    if (i === 0) return 2;
    if (i === 1) return 1;
    if (i === 2) return 3;
    return null;
  };

  const bureauToIdMSQScore = (b) => {
    try {
      const s = String(b || '').toLowerCase();
      if (s.includes('trans')) return 1;
      if (s.includes('equif')) return 3;
      if (s.includes('exper')) return 2;
    } catch {}
    return null;
  };
  const bureauIndexToIdMSQScore = (i) => {
    if (i === 0) return 2;
    if (i === 1) return 1;
    if (i === 2) return 3;
    return null;
  };

  // Helper: shallow find arrays by name on an object (case-insensitive)
  const findArrayByNames = (obj, nameCandidates=[]) => {
    if (!obj || typeof obj !== 'object') return null;
    for (const key of Object.keys(obj)) {
      for (const cand of nameCandidates) {
        if (key.toLowerCase() === cand.toLowerCase() && Array.isArray(obj[key])) {
          return obj[key];
        }
      }
    }
    return null;
  };

  // Helper: recursively scan object for arrays which look like accounts/inquiries
  const looksLikeAccountArray = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return false;
    const first = arr.find(i => i && typeof i === 'object');
    if (!first) return false;
    const accountHints = ['creditor','creditorName','creditor_name','accountNumber','account_number','currentBalance','current_balance','dateOpened','date_opened','paymentHistory','payStatusHistory'];
    let hits = 0;
    for (const h of accountHints) if (Object.keys(first).some(k => k.toLowerCase().includes(h.toLowerCase()))) hits++;
    return hits >= 1;
  };

  const looksLikeInquiryArray = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return false;
    const first = arr.find(i => i && typeof i === 'object');
    if (!first) return false;
    const hints = ['company_name','company_type','date_of_inquiry','creditorname','industry','dateinquiry'];
    return hints.some(h => Object.keys(first).some(k => k.toLowerCase().includes(h)));
  };

  const looksLikeEmployerArray = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return false;
    const first = arr.find(i => i && typeof i === 'object');
    if (!first) return false;
    const hints = ['employername','dateupdated','datereported','name','date_first_reported','date_last_updated'];
    return hints.some(h => Object.keys(first).some(k => k.toLowerCase().includes(h)));
  };

  const looksLikeAddressArray = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return false;
    const first = arr.find(i => i && typeof i === 'object');
    if (!first) return false;
    const hints = ['house_number','street_name','suffix','city','state','zipcode','streetaddress','zip'];
    return hints.some(h => Object.keys(first).some(k => k.toLowerCase().includes(h)));
  };

  const looksLikePublicRecordArray = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return false;
    const first = arr.find(i => i && typeof i === 'object');
    if (!first) return false;
    const hints = ['public','bankruptcy','court','filing','case'];
    return hints.some(h => Object.keys(first).some(k => k.toLowerCase().includes(h)));
  };

  const findArrayRecursively = (obj, nameCandidates=[]) => {
    const seen = new Set();
    const queue = [obj];
    while (queue.length) {
      const cur = queue.shift();
      if (!cur || typeof cur !== 'object') continue;
      if (Array.isArray(cur)) {
        if (nameCandidates.length) {
          if (looksLikeAccountArray(cur)) return cur;
        } else {
          // if no nameCandidates, return the first array that looks like accounts
          if (looksLikeAccountArray(cur)) return cur;
        }
      }
      for (const k of Object.keys(cur)) {
        const v = cur[k];
        if (v && typeof v === 'object' && !seen.has(v)) {
          seen.add(v);
          queue.push(v);
        }
        // also check named arrays directly
        if (Array.isArray(v) && nameCandidates.length) {
          if (nameCandidates.some(n => k.toLowerCase() === n.toLowerCase()) && looksLikeAccountArray(v)) return v;
        }
      }
    }
    return null;
  };

  const findArrayRecursivelyTyped = (obj, predicate) => {
    const seen = new Set();
    const queue = [obj];
    while (queue.length) {
      const cur = queue.shift();
      if (!cur || typeof cur !== 'object') continue;
      if (Array.isArray(cur)) {
        if (predicate(cur)) return cur;
      }
      for (const k of Object.keys(cur)) {
        const v = cur[k];
        if (v && typeof v === 'object' && !seen.has(v)) {
          seen.add(v);
          queue.push(v);
        }
      }
    }
    return null;
  };

  // possible candidate containers to inspect (order matters)
  const candidates = [
    reportData?.rawCreditData,
    reportData?.raw,
    reportData?.reportData,
    reportData?.data,
    reportData?.report,
    reportData?.parsed,
    reportData?.scraped,
    reportData?.artifacts,
    reportData?.artifacts?.sections,
    reportData
  ].filter(Boolean);

  // default arrays
  let accounts = [], inquiries = [], publicRecords = [], addresses = [], employers = [];

  const firstRaw = reportData?.rawCreditData || reportData?.report || reportData?.reportData || reportData?.data || null;
  if (firstRaw && typeof firstRaw === 'object') {
    if (Array.isArray(firstRaw?.data)) {
      const list = firstRaw.data;
      for (let i = 0; i < list.length; i++) {
        const entry = list[i];
        const bi = entry?.bureau_id ?? bureauToIdMSQ(entry?.bureau) ?? bureauIndexToIdMSQ(i % 3);
        const accs = Array.isArray(entry?.accounts) ? entry.accounts : [];
        for (const acc of accs) {
          const item = { ...(acc || {}) };
          item.bureau = entry?.bureau;
          item.bureau_id = bi ?? null;
          accounts.push(item);
        }
        const inqs = Array.isArray(entry?.inquiries) ? entry.inquiries : [];
        for (const inq of inqs) {
          const ii = { ...(inq || {}) };
          ii.bureau = entry?.bureau;
          ii.bureau_id = bi ?? null;
          inquiries.push(ii);
        }
        const prs = Array.isArray(entry?.public_records) ? entry.public_records : [];
        for (const pr of prs) {
          const pp = { ...(pr || {}) };
          pp.bureau = entry?.bureau;
          pp.bureau_id = bi ?? null;
          publicRecords.push(pp);
        }
        const addrs = Array.isArray(entry?.addresses) ? entry.addresses : [];
        for (const addr of addrs) {
          const aa = { ...(addr || {}) };
          aa.bureau = entry?.bureau;
          aa.bureau_id = bi ?? null;
          addresses.push(aa);
        }
        const emps = Array.isArray(entry?.employers) ? entry.employers : [];
        for (const emp of emps) {
          const ee = { ...(emp || {}) };
          ee.bureau = entry?.bureau;
          ee.bureau_id = bi ?? null;
          employers.push(ee);
        }
      }
    }
    if (!inquiries.length) inquiries = mergeAcrossBureaus(firstRaw, ['Inquiries','inquiries','CreditInquiries']);
    if (!publicRecords.length) publicRecords = mergeAcrossBureaus(firstRaw, ['PublicRecords','public_records','PublicRecordsList']);
    if (!addresses.length) addresses = mergeAcrossBureaus(firstRaw, ['Addresses','addresses']);
    if (!employers.length) employers = mergeAcrossBureaus(firstRaw, ['Employers','employers']);
  }

  // 2) If still empty, try find arrays by name at top-level candidates
  if (!accounts.length) {
    for (const c of candidates) {
      const found = findArrayByNames(c, ['Accounts','AccountsList','accounts','tradelines','creditAccounts']);
      if (Array.isArray(found) && found.length) { accounts = found; break; }
    }
    if (!accounts.length && firstRaw) {
      accounts = flattenRawData(firstRaw, 'accounts');
    }
  }
  if (!inquiries.length) {
    for (const c of candidates) {
      const found = findArrayByNames(c, ['Inquiries','inquiries','CreditInquiries']);
      if (Array.isArray(found) && found.length) { inquiries = found; break; }
    }
    if (!inquiries.length && firstRaw) {
      inquiries = flattenRawData(firstRaw, 'inquiries');
    }
  }
  if (!publicRecords.length) {
    for (const c of candidates) {
      const found = findArrayByNames(c, ['PublicRecords','public_records','publicrecords']);
      if (Array.isArray(found) && found.length) { publicRecords = found; break; }
    }
    if (!publicRecords.length && firstRaw) {
      publicRecords = flattenRawData(firstRaw, 'public_records');
    }
  }
  if (!addresses.length) {
    for (const c of candidates) {
      const found = findArrayByNames(c, ['Addresses','addresses','Address']);
      if (Array.isArray(found) && found.length) { addresses = found; break; }
    }
    if (!addresses.length && firstRaw) {
      addresses = flattenRawData(firstRaw, 'addresses');
    }
  }
  if (!employers.length) {
    for (const c of candidates) {
      const found = findArrayByNames(c, ['Employers','employers','Employer']);
      if (Array.isArray(found) && found.length) { employers = found; break; }
    }
    if (!employers.length && firstRaw) {
      employers = flattenRawData(firstRaw, 'employers');
    }
  }

  // 3) Final fallback: recursive scan for any array that looks like accounts
  if (!accounts.length) {
    const found = findArrayRecursively(reportData, ['Accounts','accounts','tradelines']);
    if (found) accounts = found;
  }
  if (!inquiries.length) {
    const found = findArrayRecursivelyTyped(reportData, looksLikeInquiryArray);
    if (found) inquiries = found;
  }
  if (!publicRecords.length) {
    const found = findArrayRecursivelyTyped(reportData, looksLikePublicRecordArray);
    if (found) publicRecords = found;
  }
  if (!addresses.length) {
    const found = findArrayRecursivelyTyped(reportData, looksLikeAddressArray);
    if (found) addresses = found;
  }
  if (!employers.length) {
    const found = findArrayRecursivelyTyped(reportData, looksLikeEmployerArray);
    if (found) employers = found;
  }

  // Final normalization: ensure arrays (maybe null -> empty)
  accounts = Array.isArray(accounts) ? accounts : [];
  inquiries = Array.isArray(inquiries) ? inquiries : [];
  publicRecords = Array.isArray(publicRecords) ? publicRecords : [];
  addresses = Array.isArray(addresses) ? addresses : [];
  employers = Array.isArray(employers) ? employers : [];

  // Extra debug logs so you can see counts quickly
  console.log(`MyScoreIQ -> extracted counts: accounts=${accounts.length}, inquiries=${inquiries.length}, publicRecords=${publicRecords.length}, addresses=${addresses.length}, employers=${employers.length}`);

  // Normalize accounts to MyFreeScoreNow-like shape and ensure creditor is a string
  const normalizeStr = (v, def = '') => {
    if (v === null || v === undefined) return def;
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return String(v);
    if (typeof v === 'object') {
      if (v && typeof v.name === 'string') return v.name;
    }
    try { return JSON.stringify(v); } catch { return def; }
  };
  const toYMD = (s) => {
    try {
      if (!s) return '';
      const str = String(s);
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
        const [d,m,y] = str.split('/');
        return `${y}-${m}-${d}`;
      }
      if (/^\d{4}-\d{2}-\d{2}T/.test(str)) return str.slice(0,10);
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        const mm = String(d.getMonth()+1).padStart(2,'0');
        const dd = String(d.getDate()).padStart(2,'0');
        return `${d.getFullYear()}-${mm}-${dd}`;
      }
    } catch {}
    return '';
  };
  const parseDate = (v) => {
    const s = normalizeStr(v, '');
    if (!s) return null;
    const d = new Date(s);
    if (isNaN(d.getTime())) {
      const m = s.match(/\d{4}-\d{2}-\d{2}/) || s.match(/\d{2}\/\d{2}\/\d{4}/);
      return m ? m[0] : null;
    }
    return d.toISOString();
  };
  const toNumber = (v) => {
    const s = normalizeStr(v, '');
    const n = parseFloat(s.replace(/[^0-9.\-]/g, ''));
    return isNaN(n) ? 0 : n;
  };
  const toTitle = (s) => {
    const str = normalizeStr(s, '');
    return str ? str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) : str;
  };
  const statusToLetter = (s) => {
    const t = normalizeStr(s, '').toLowerCase();
    if (!t) return 'C';
    if (t.includes('ok') || t.includes('current') || t.includes('paid') || t.includes('as agreed')) return 'C';
    if (t.includes('30')) return '1';
    if (t.includes('60')) return '2';
    if (t.includes('90')) return '3';
    if (t.includes('late') || t.includes('delinquent')) return 'L';
    if (t.includes('charge')) return 'X';
    return 'C';
  };
  const pick = (...vals) => {
    for (const v of vals) {
      const s = normalizeStr(v, '');
      if (s) return s;
    }
    return '';
  };
  const deriveInquiryType = (inq) => {
    const base = normalizeStr(inq?.InquiryType || inq?.type || inq?.inquiry_type, '');
    const industry = normalizeStr(inq?.company_type || inq?.companyType || inq?.Industry || inq?.industry, '').toLowerCase();
    const name = normalizeStr(inq?.company_name || inq?.companyName || inq?.CreditorName || inq?.creditor?.name || inq?.creditor, '').toLowerCase();
    if (/mortgage|home|real\s*estate|mtg/.test(industry) || /mortgage|home|real\s*estate|mtg/.test(name)) return 'Mortgage Loan Inquiry';
    if (/auto|automotive|vehicle|car/.test(industry) || /auto|automotive|vehicle|car/.test(name)) return 'Auto Loan Inquiry';
    if (/card|visa|mastercard|discover|amex|credit\s*card|bank|cbna|syncb/.test(industry) || /card|visa|mastercard|discover|amex|credit\s*card|bank|cbna|syncb/.test(name)) return 'Credit Card Inquiry';
    return base || 'Regular Inquiry';
  };

  const buildPayStatusHistory = (a) => {
    if (Array.isArray(a?.payment_histories)) {
      const monthsOrder = ['january','february','march','april','may','june','july','august','september','october','november','december'];
      const ph = [...a.payment_histories].sort((x, y) => {
        const ax = parseInt(normalizeStr(x?.calendar_year, '0')) || 0;
        const ay = parseInt(normalizeStr(y?.calendar_year, '0')) || 0;
        return ax - ay;
      });
      const parts = [];
      for (const rec of ph) {
        for (const m of monthsOrder) {
          if (rec[m]) parts.push(statusToLetter(rec[m]));
        }
      }
      return parts.join('');
    }
    const hist = normalizeStr(a?.PayStatusHistory?.status || a?.paymentHistory || '', '');
    if (!hist) return '';
    return hist.split(/[\s,;|]+/).map(statusToLetter).join('');
  };
  const buildPayStatusHistoryStartDate = (a) => {
    if (!Array.isArray(a?.payment_histories) || !a.payment_histories.length) {
      return toYMD(parseDate(a?.balance_date || a?.status_date)) || '';
    }
    const monthsOrder = ['january','february','march','april','may','june','july','august','september','october','november','december'];
    let best = null;
    for (const rec of a.payment_histories) {
      const yStr = normalizeStr(rec?.calendar_year, '');
      const y = parseInt(yStr) || 0;
      for (let mi = 0; mi < monthsOrder.length; mi++) {
        const m = monthsOrder[mi];
        const v = rec[m];
        if (!v) continue;
        const mm = String(mi + 1).padStart(2, '0');
        const ds = `${y}-${mm}-01`;
        const t = new Date(ds).getTime();
        if (!isNaN(t)) {
          if (best === null || t < best) best = t;
        }
      }
    }
    if (best === null) return toYMD(parseDate(a?.balance_date || a?.status_date)) || '';
    const d = new Date(best);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-01`;
  };

  const accountsFormal = accounts.map((a, idx) => {
    const creditorName = normalizeStr(a?.CreditorName || a?.name || a?.creditor?.name || a?.creditor, '');
    const bureauId = a?.bureau_id ?? bureauToIdMSQ(a?.bureau || a?.Bureau || a?.Source?.Bureau?.symbol) ?? bureauIndexToIdMSQ(idx % 3);
    const termsStr = normalizeStr(a?.terms, '');
    const pf = termsStr && /month/i.test(termsStr) ? 'Monthly' : normalizeStr(a?.GrantedTrade?.PaymentFrequency?.description || 'Monthly', '');
    const tt = termsStr || normalizeStr(a?.GrantedTrade?.TermType?.description || 'Provided', '');
    const remarkStr = normalizeStr(Array.isArray(a?.remarks) ? a.remarks.map(r => r?.message).filter(Boolean).join('; ') : '', '');
    const street = pick(a?.creditor?.address?.street, a?.creditor?.address?.streetAddress, a?.creditor_address, a?.subscriberAddress?.streetaddress, a?.subscriberAddress?.street, a?.address);
    const city = pick(a?.creditor?.address?.city, a?.creditor_city, a?.subscriberAddress?.city);
    const state = pick(a?.creditor?.address?.state, a?.creditor_state, a?.subscriberAddress?.state);
    const zip = pick(a?.creditor?.address?.zip, a?.creditor_zip, a?.subscriberAddress?.zip, a?.subscriberAddress?.zipcode);
    const key = [bureauId, creditorName, street, city, state, zip].map(v => String(v).toUpperCase().trim()).join('|');
    const creditorId = createHash('sha1').update(key).digest('hex');
    return {
      BureauId: bureauId,
      CreditorId: creditorId,
      AccountTypeDescription: toTitle(a?.classification || a?.type || a?.AccountTypeDescription),
      HighBalance: normalizeStr(a?.high_balance || a?.HighBalance || a?.GrantedTrade?.highBalance || toNumber(a?.high_balance), ''),
      DateReported: toYMD(parseDate(a?.balance_date || a?.status_date || a?.DateReported || a?.dateReported)) || '',
      DateOpened: toYMD(parseDate(a?.date_opened || a?.DateOpened || a?.dateOpened || a?.opened)) || '',
      AccountNumber: normalizeStr(a?.number || a?.AccountNumber || a?.accountNumber, '').replace(/\*/g, ''),
      DateAccountStatus: toYMD(parseDate(a?.status_date || a?.dateAccountStatus || a?.DateReported || a?.dateReported)) || '',
      CurrentBalance: String(toNumber(a?.balance || a?.CurrentBalance || a?.current_balance)),
      CreditorName: creditorName || normalizeStr(a?.CreditorName, ''),
      AccountCondition: normalizeStr(a?.open_closed || a?.AccountCondition?.description || a?.type_definition_flags?.account_status || a?.account_condition, ''),
      AccountDesignator: normalizeStr(a?.responsibility || a?.AccountDesignator?.description, ''),
      DisputeFlag: normalizeStr(a?.DisputeFlag?.description || '', ''),
      Industry: normalizeStr(a?.business_type || a?.Industry || a?.IndustryCode?.description, ''),
      AccountStatus: normalizeStr(a?.type_definition_flags?.account_status || a?.account_status || a?.OpenClosed?.description, ''),
      PaymentStatus: normalizeStr(a?.payment_status || a?.payment_status_class || a?.PayStatus?.description, ''),
      AmountPastDue: String(toNumber(a?.past_due_amount || a?.GrantedTrade?.amountPastDue)),
      AccountType: toTitle(a?.type || a?.GrantedTrade?.AccountType?.description || a?.type_raw),
      CreditType: toTitle(a?.type_definition_flags?.industry_and_account_type || a?.GrantedTrade?.CreditType?.description || a?.classification || a?.type),
      PaymentFrequency: pf,
      TermType: tt,
      WorstPayStatus: normalizeStr(a?.GrantedTrade?.WorstPayStatus?.description || 'Current', ''),
      PayStatusHistoryStartDate: buildPayStatusHistoryStartDate(a) || '',
      PayStatusHistory: buildPayStatusHistory(a) || '',
      Remark: remarkStr ? remarkStr : null,
      CreditLimit: String(toNumber(a?.limit || a?.CreditLimit || a?.credit_limit))
    };
  });

  const accountsAlias = accounts.map((a) => {
    const creditorName = normalizeStr(a?.CreditorName || a?.name || a?.creditor?.name || a?.creditor, 'Unknown Creditor');
    return {
      creditor: creditorName,
      name: normalizeStr(a?.name || a?.CreditorName || creditorName, ''),
      type: normalizeStr(a?.AccountTypeDescription || a?.classification || a?.type, ''),
      CurrentBalance: toNumber(a?.CurrentBalance || a?.balance),
      CreditLimit: toNumber(a?.CreditLimit || a?.limit),
      DateOpened: parseDate(a?.DateOpened || a?.date_opened || a?.opened),
      DateReported: parseDate(a?.DateReported || a?.status_date),
    };
  });

  const inquiriesFormal = inquiries.map((inq, idx) => ({
    BureauId: inq?.bureau_id ?? bureauToIdMSQ(inq?.bureau) ?? bureauIndexToIdMSQ(idx % 3),
    DateInquiry: toYMD(parseDate(inq?.DateInquiry || inq?.date || inq?.date_of_inquiry || inq?.inquiry_date)) || '',
    CreditorName: normalizeStr(inq?.company_name || inq?.companyName || inq?.CreditorName || inq?.creditor?.name || inq?.creditor, ''),
    InquiryType: normalizeStr(deriveInquiryType(inq), ''),
    Industry: normalizeStr(inq?.company_type || inq?.companyType || inq?.Industry || inq?.industry, '')
  }));

  let employersFormal = (Array.isArray(employers) ? employers : []).map((emp, idx) => ({
    EmployerName: normalizeStr(emp?.EmployerName || emp?.name || '', ''),
    BureauId: emp?.bureau_id ?? bureauToIdMSQ(emp?.bureau) ?? bureauIndexToIdMSQ(idx % 3),
    DateReported: (toYMD(parseDate(emp?.DateReported || emp?.date_first_reported)) || null),
    DateUpdated: (toYMD(parseDate(emp?.DateUpdated || emp?.date_last_updated)) || null)
  }));
  employersFormal = employersFormal.filter(e => e.EmployerName || e.DateReported || e.DateUpdated);

  const latestTimeByBureau = () => {
    const times = new Map();
    for (const a of Array.isArray(addresses) ? addresses : []) {
      const d = parseDate(a?.date_last_updated || a?.DateLastUpdated || a?.date_first_reported || a?.DateFirstReported || a?.DateReported);
      if (!d) continue;
      const t = new Date(d).getTime();
      const bi = a?.bureau_id ?? bureauToIdMSQ(a?.bureau || a?.Bureau);
      if (!bi) continue;
      const prev = times.get(bi) || 0;
      if (t > prev) times.set(bi, t);
    }
    return times;
  };
  const latestMap = latestTimeByBureau();
  const combineStreet = (a) => {
    const parts = [a?.house_number, a?.pre_directional, a?.street_name, a?.suffix, a?.post_directional]
      .map((p) => normalizeStr(p, '').trim())
      .filter((p) => !!p);
    let street = parts.join(' ').replace(/\s+/g, ' ').trim();
    const unit = normalizeStr(a?.unit, '').trim();
    if (unit) street = `${street} ${unit}`;
    return street;
  };
  const addressesFormalPre = (Array.isArray(addresses) ? addresses : []).map((a, idx) => {
    const reported = parseDate(a?.date_last_updated || a?.DateLastUpdated || a?.date_first_reported || a?.DateFirstReported || a?.DateReported);
    const reportedTime = reported ? new Date(reported).getTime() : 0;
    const bureauId = a?.bureau_id ?? bureauToIdMSQ(a?.bureau || a?.Bureau) ?? bureauIndexToIdMSQ(idx % 3);
    return {
      BureauId: bureauId,
      StreetAddress: combineStreet(a),
      City: normalizeStr(a?.city || a?.City, ''),
      State: normalizeStr(a?.state || a?.State, ''),
      Zip: normalizeStr(a?.zipcode || a?.Zip || a?.zip, ''),
      _reportedTime: reportedTime
    };
  });
  const addressesFormal = addressesFormalPre
    .map(a => ({
      BureauId: a.BureauId,
      StreetAddress: a.StreetAddress,
      City: a.City,
      State: a.State,
      Zip: a.Zip,
      AddressType: a._reportedTime && a._reportedTime === (latestMap.get(a.BureauId) || 0) ? 'Current' : 'Previous'
    }))
    .filter(a => a.StreetAddress || a.City || a.State || a.Zip);

  // Build converted report (UCS-style simplified)
  // ===== Add MyFreeScoreNow-format extras (CreditReport, Name, DOB, Score) =====
  const getNonEmptyArray = (arr) => (Array.isArray(arr) && arr.length > 0 ? arr : null);

// Extract Score arrays
let scoreArray = [];
try {
  scoreArray =
    getNonEmptyArray(mergeAcrossBureaus(firstRaw, ["Score", "Scores", "VantageScore"])) ||
    findArrayByNames(reportData, ["Score", "Scores"]) ||
    findArrayByNames(reportData?.reportData, ["Score", "Scores"]) ||
    [];
} catch (e) {}

if (!scoreArray || scoreArray.length === 0) {
  const rawScores = flattenRawData(firstRaw, 'score_details');
  scoreArray = rawScores.map((s, idx) => ({
    BureauId: s?.bureau_id ?? bureauToIdMSQScore(s?.bureau) ?? bureauIndexToIdMSQScore(idx % 3),
    Score: s?.score || '',
    ScoreType: s?.model || '',
    DateScore: s?.score_dt ? String(s.score_dt).split('T')[0] : null
  }));
}

  scoreArray = (Array.isArray(scoreArray) ? scoreArray : []).map((s, idx) => ({
  BureauId: s?.BureauId ?? s?.bureau_id ?? bureauToIdMSQScore(s?.bureau) ?? bureauIndexToIdMSQScore(idx % 3),
  Score: normalizeStr(s?.Score ?? s?.score, ''),
  ScoreType: normalizeStr(s?.ScoreType ?? s?.model, ''),
  DateScore: toYMD(s?.DateScore ?? s?.score_dt ?? parseDate(s?.score_dt)) || ''
}));

// Extract Names
let nameArray = [];
try {
  nameArray =
    getNonEmptyArray(mergeAcrossBureaus(firstRaw, ["Name", "Names"])) ||
    findArrayByNames(reportData, ["Name", "Names"]) ||
    findArrayByNames(reportData?.reportData, ["Name", "Names"]) ||
    [];
} catch (e) {}

if (!nameArray || nameArray.length === 0) {
  const rawNames = flattenRawData(firstRaw, 'names');
  nameArray = rawNames.map((n, idx) => ({
    BureauId: n?.bureau_id ?? bureauToIdMSQ(n?.bureau) ?? bureauIndexToIdMSQ(idx % 3),
    FirstName: n?.first_name || '',
    Middle: n?.middle_name || '',
    LastName: n?.last_name || '',
    NameType: 'Primary'
  }));
}
const nameByBureau = new Map();
for (const n of nameArray) {
  const bi = n?.BureauId ?? bureauToIdMSQ(n?.bureau);
  if (!bi) continue;
  if (!nameByBureau.has(bi)) nameByBureau.set(bi, n);
}
const nameArrayFormal = [1,2,3].map((id) => {
  const existing = nameByBureau.get(id);
  return {
    BureauId: id,
    FirstName: existing ? normalizeStr(existing.FirstName, '') : '',
    Middle: existing ? normalizeStr(existing.Middle, '') : '',
    LastName: existing ? normalizeStr(existing.LastName, '') : '',
    NameType: existing ? normalizeStr(existing.NameType, 'Primary') : 'Primary'
  };
});

// Extract DOBs
let dobArray = [];
try {
  dobArray =
    getNonEmptyArray(mergeAcrossBureaus(firstRaw, ["DOB", "DateOfBirth"])) ||
    findArrayByNames(reportData, ["DOB", "DateOfBirth"]) ||
    findArrayByNames(reportData?.reportData, ["DOB", "DateOfBirth"]) ||
    [];
} catch (e) {}

if (!dobArray || dobArray.length === 0) {
  const rawNamesForDob = flattenRawData(firstRaw, 'names');
  dobArray = rawNamesForDob.map((n, idx) => {
    const bi = n?.bureau_id ?? bureauToIdMSQ(n?.bureau) ?? bureauIndexToIdMSQ(idx % 3);
    const y = normalizeStr(n?.year_of_birth, '');
    const hasY = /^\d{4}$/.test(y);
    const full = toYMD(parseDate(n?.dob || n?.date_of_birth)) || '';
    const dobVal = full || (hasY ? `${y}-01-01` : '');
    return {
      BureauId: bi,
      DOB: dobVal
    };
  });
}
const dobByBureau = new Map();
for (const d of dobArray) {
  const bi = d?.BureauId ?? bureauToIdMSQ(d?.bureau);
  if (!bi) continue;
  if (!dobByBureau.has(bi)) dobByBureau.set(bi, d);
}
const dobArrayFormal = [1,2,3].map((id) => {
  const existing = dobByBureau.get(id);
  return {
    BureauId: id,
    DOB: existing ? (toYMD(existing.DOB) || '') : ''
  };
});

console.log(`MyScoreIQ -> extras extracted counts: name=${nameArray.length}, dob=${dobArray.length}, score=${scoreArray.length}`);

// Extract Credit Report Metadata (Date + Provider)
const creditReportArray = [
  {
    DateReport:
      reportData.reportDate ||
      reportData?.ReportDate ||
      new Date().toISOString().substring(0, 10),
    ReportProvider: "MyScoreIQ"
  }
];
const toDDMMYYYY = (s) => {
  try {
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(s))) {
      const [y,m,d] = String(s).split('-');
      return `${d}/${m}/${y}`;
    }
    const d = new Date(String(s));
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2,'0');
      const mm = String(d.getMonth()+1).padStart(2,'0');
      const yy = d.getFullYear();
      return `${dd}/${mm}/${yy}`;
    }
  } catch {}
  return null;
};

// ===== Final converted report (UCS full schema) =====
  let publicRecordsFormal = (Array.isArray(publicRecords) ? publicRecords : []).map((pr, idx) => ({
    BureauId: pr?.bureau_id ?? bureauToIdMSQ(pr?.bureau || pr?.Bureau || pr?.Source?.Bureau?.symbol) ?? bureauIndexToIdMSQ(idx % 3),
    RecordType: normalizeStr(pr?.RecordType || pr?.type || pr?.category || pr?.public_record_type || pr?.bankruptcy_chapter || pr?.judgment_type, ''),
    DateFiled: (parseDate(pr?.DateFiled || pr?.filing_date || pr?.date_filed || pr?.filed) || null)?.slice(0,10) || null,
    Status: (normalizeStr(pr?.Status || pr?.status || pr?.disposition, '') || null),
    Amount: (normalizeStr(pr?.Amount || pr?.amount || pr?.liability || pr?.balance_due, '') || null)
  }));
  publicRecordsFormal = publicRecordsFormal.filter(pr => {
    const hasType = !!normalizeStr(pr.RecordType, '');
    const hasAny = !!(pr.DateFiled || pr.Status || pr.Amount);
    return hasType && hasAny;
  });

  const extractScoreExtras = () => {
    const outFactors = [];
    const outContent = [];
    try {
      const src = firstRaw && typeof firstRaw === 'object' ? firstRaw : {};
      const list = Array.isArray(src?.data) ? src.data : [];
      for (let i = 0; i < list.length; i++) {
        const entry = list[i];
        const bi = entry?.bureau_id ?? bureauToIdMSQ(entry?.bureau) ?? bureauIndexToIdMSQ(i % 3);
        const sd = entry?.score_details || {};
        const f1 = Array.isArray(entry?.credit_score_factor) ? entry.credit_score_factor : null;
        const f2 = Array.isArray(sd?.credit_score_factor) ? sd.credit_score_factor : null;
        const factors = f1 || f2 || [];
        for (const f of factors) {
          outFactors.push({ BureauId: bi ?? null, ...f });
        }
        const c1 = sd?.credit_score_content || null;
        const c2 = entry?.credit_score_content || null;
        const content = c1 || c2;
        if (content && typeof content === 'object') {
          outContent.push({ BureauId: bi ?? null, ...content });
        }
      }
    } catch {}
    return { ScoreFactors: outFactors, ScoreContent: outContent };
  };
  const creditors = (() => {
    const out = [];
    const seen = new Set();
    const getBi = (x, idx=0) => x?.bureau_id ?? bureauToIdMSQ(x?.bureau || x?.Bureau || x?.Source?.Bureau?.symbol) ?? bureauIndexToIdMSQ(idx % 3);
    const add = (bi, name, street, city, state, zip, phone, industry) => {
      const key = [bi, name, street, city, state, zip].map(v => String(v).toUpperCase().trim()).join('|');
      if (seen.has(key)) return;
      seen.add(key);
      const creditorId = createHash('sha1').update(key).digest('hex');
      out.push({
        CreditorId: creditorId,
        BureauId: bi,
        CreditorName: normalizeStr(name, ''),
        StreetAddress: normalizeStr(street, ''),
        City: normalizeStr(city, ''),
        State: normalizeStr(state, ''),
        Zip: normalizeStr(zip, ''),
        Phone: normalizeStr(phone, ''),
        Industry: normalizeStr(industry, '')
      });
    };
    for (let i = 0; i < accounts.length; i++) {
      const a = accounts[i];
      const bi = getBi(a, i);
      const name = pick(a?.creditor?.name, a?.CreditorName, a?.name);
      const street = pick(a?.creditor?.address?.street, a?.creditor?.address?.streetAddress, a?.creditor_address, a?.subscriberAddress?.streetaddress, a?.subscriberAddress?.street, a?.address);
      const city = pick(a?.creditor?.address?.city, a?.creditor_city, a?.subscriberAddress?.city);
      const state = pick(a?.creditor?.address?.state, a?.creditor_state, a?.subscriberAddress?.state);
      const zip = pick(a?.creditor?.address?.zip, a?.creditor_zip, a?.subscriberAddress?.zip, a?.subscriberAddress?.zipcode);
      const phone = pick(a?.creditor?.phone, a?.phone, a?.subscriberPhone);
      const industry = pick(a?.business_type, a?.Industry, a?.IndustryCode?.description);
      if (name) add(bi, name, street, city, state, zip, phone, industry);
    }
    for (let i = 0; i < inquiries.length; i++) {
      const inq = inquiries[i];
      const bi = getBi(inq, i);
      const name = pick(inq?.company_name, inq?.companyName, inq?.CreditorName, inq?.creditor?.name, inq?.creditor);
      const street = pick(inq?.address?.street, inq?.address?.streetAddress, inq?.streetaddress, inq?.subscriberAddress?.streetaddress);
      const city = pick(inq?.address?.city, inq?.city, inq?.subscriberAddress?.city);
      const state = pick(inq?.address?.state, inq?.state, inq?.subscriberAddress?.state);
      const zip = pick(inq?.address?.zip, inq?.zip, inq?.subscriberAddress?.zip, inq?.subscriberAddress?.zipcode);
      const phone = pick(inq?.phone, inq?.subscriberPhone);
      const industry = pick(inq?.company_type, inq?.companyType, inq?.Industry, inq?.industry);
      if (name) add(bi, name, street, city, state, zip, phone, industry);
    }
    return out;
  })();
  const identityBlock = (() => {
    let ssn = '';
    let yob = null;
    let fdob = null;
    try {
      const list = Array.isArray(firstRaw?.data) ? firstRaw.data : [];
      for (let i = 0; i < list.length; i++) {
        const entry = list[i];
        const s1 = normalizeStr(entry?.ssn_masked, '');
        const s2 = normalizeStr(entry?.ssn, '');
        const s3 = normalizeStr(entry?.ssn_last4 || entry?.ssnLast4, '');
        const y = normalizeStr(entry?.year_of_birth, '');
        if (!ssn) {
          if (s1) ssn = s1;
          else if (/^\d{9}$/.test(s2)) ssn = `***-**-${s2.slice(-4)}`;
          else if (/^\d{4}$/.test(s3)) ssn = `***-**-${s3}`;
        }
        if (!yob && /^\d{4}$/.test(y)) yob = y;
      }
      const firstDob = dobArrayFormal.find(d => normalizeStr(d?.DOB, ''))?.DOB || '';
      fdob = firstDob ? firstDob : null;
    } catch {}
    return { SSN: ssn, YearOfBirth: yob, FullDOB: fdob };
  })();
  const nowIso = normalizeStr(new Date().toISOString(), '');
  const now = new Date(nowIso);
  const withinMonths = (dstr, months) => {
    try {
      if (!dstr) return false;
      const d = new Date(String(dstr));
      if (isNaN(d.getTime())) return false;
      const diffMs = now.getTime() - d.getTime();
      const diffMonths = diffMs / (1000*60*60*24*30.4375);
      return diffMonths <= months;
    } catch { return false; }
  };
  const isNegative = (acc) => {
    const ps = normalizeStr(acc?.PaymentStatus, '').toLowerCase();
    const hist = normalizeStr(acc?.PayStatusHistory, '');
    if (/(late|delinquent|charge|collection|default|repossession|foreclosure)/.test(ps)) return true;
    if (/[123LX]/.test(hist)) return true;
    return false;
  };
  const isOpen = (acc) => /open/i.test(normalizeStr(acc?.AccountStatus, ''));
  const isClosed = (acc) => /clos/i.test(normalizeStr(acc?.AccountStatus, ''));
  const toNum = (s) => {
    const n = toNumber(s);
    return isNaN(n) ? 0 : n;
  };
  const summaryBlock = (() => {
    const totalAcc = accountsFormal.length;
    const openAcc = accountsFormal.filter(isOpen).length;
    const closedAcc = accountsFormal.filter(isClosed).length;
    const negAcc = accountsFormal.filter(isNegative).length;
    const inq24 = inquiriesFormal.filter(i => withinMonths(i?.DateInquiry, 24)).length;
    const prTotal = publicRecordsFormal.length;
    const totalBal = accountsFormal.reduce((sum, a) => sum + toNum(a?.CurrentBalance), 0);
    const totalLimit = accountsFormal.reduce((sum, a) => sum + toNum(a?.CreditLimit), 0);
    return {
      TotalAccounts: totalAcc,
      TotalOpenAccounts: openAcc,
      TotalClosedAccounts: closedAcc,
      TotalNegativeAccounts: negAcc,
      TotalInquiriesLast24Months: inq24,
      TotalPublicRecords: prTotal,
      TotalBalances: totalBal,
      TotalCreditLimit: totalLimit
    };
  })();
  const summaryByBureau = [1,2,3].map(bi => {
    const accs = accountsFormal.filter(a => a.BureauId === bi);
    const inqs = inquiriesFormal.filter(a => a.BureauId === bi);
    const prs = publicRecordsFormal.filter(a => a.BureauId === bi);
    const totalAcc = accs.length;
    const openAcc = accs.filter(isOpen).length;
    const closedAcc = accs.filter(isClosed).length;
    const negAcc = accs.filter(isNegative).length;
    const inq24 = inqs.filter(i => withinMonths(i?.DateInquiry, 24)).length;
    const prTotal = prs.length;
    const totalBal = accs.reduce((sum, a) => sum + toNum(a?.CurrentBalance), 0);
    const totalLimit = accs.reduce((sum, a) => sum + toNum(a?.CreditLimit), 0);
    return {
      BureauId: bi,
      TotalAccounts: totalAcc,
      TotalOpenAccounts: openAcc,
      TotalClosedAccounts: closedAcc,
      TotalNegativeAccounts: negAcc,
      TotalInquiriesLast24Months: inq24,
      TotalPublicRecords: prTotal,
      TotalBalances: totalBal,
      TotalCreditLimit: totalLimit
    };
  });
  const extras = extractScoreExtras();
  const converted = {
  clientInfo: {
    clientId: cid,
    username: credentials.username,
    timestamp: new Date().toISOString(),
    reportDate: toDDMMYYYY(creditReportArray[0]?.DateReport) || null
  },

  reportData: {
    CreditReport: creditReportArray,
    Name: nameArrayFormal,
    Address: addressesFormal,
    DOB: dobArrayFormal,
    Score: scoreArray,
    Employer: employersFormal,
    Inquiries: inquiriesFormal,
    PublicRecords: publicRecordsFormal,
    Accounts: accountsFormal,
    Creditors: creditors,
    Identity: identityBlock,
    Summary: summaryBlock,
    SummaryByBureau: summaryByBureau
  },
  ExtraFields: {
    ScoreFactors: extras.ScoreFactors,
    ScoreContent: extras.ScoreContent
  }
  };

  const schema = z.object({
    clientInfo: z.object({
      clientId: z.string(),
      username: z.string().nullable(),
      timestamp: z.string(),
      reportDate: z.string().nullable()
    }),
    reportData: z.object({
      CreditReport: z.array(z.object({
        DateReport: z.string(),
        ReportProvider: z.string()
      })),
      Name: z.array(z.object({
        BureauId: z.number(),
        FirstName: z.string(),
        Middle: z.string(),
        LastName: z.string(),
        NameType: z.string()
      })),
      Address: z.array(z.object({
        BureauId: z.number(),
        StreetAddress: z.string(),
        City: z.string(),
        State: z.string(),
        Zip: z.string(),
        AddressType: z.string()
      })),
      DOB: z.array(z.object({
        BureauId: z.number(),
        DOB: z.string()
      })),
      Score: z.array(z.object({
        BureauId: z.number().nullable(),
        Score: z.string(),
        ScoreType: z.string(),
        DateScore: z.string().nullable()
      })),
      Employer: z.array(z.object({
        BureauId: z.number(),
        EmployerName: z.string(),
        DateUpdated: z.string().nullable(),
        DateReported: z.string().nullable()
      })),
      Inquiries: z.array(z.object({
        BureauId: z.number(),
        DateInquiry: z.string(),
        CreditorName: z.string(),
        InquiryType: z.string(),
        Industry: z.string()
      })),
      PublicRecords: z.array(z.object({
        BureauId: z.number(),
        RecordType: z.string(),
        DateFiled: z.string().nullable(),
        Status: z.string().nullable(),
        Amount: z.string().nullable()
      })),
      Accounts: z.array(z.object({
        BureauId: z.number(),
        CreditorId: z.string(),
        AccountTypeDescription: z.string(),
        HighBalance: z.string(),
        DateReported: z.string(),
        DateOpened: z.string(),
        AccountNumber: z.string(),
        DateAccountStatus: z.string(),
        CurrentBalance: z.string(),
        CreditorName: z.string(),
        AccountCondition: z.string(),
        AccountDesignator: z.string(),
        DisputeFlag: z.string(),
        Industry: z.string(),
        AccountStatus: z.string(),
        PaymentStatus: z.string(),
        AmountPastDue: z.string(),
        AccountType: z.string(),
        CreditType: z.string(),
        PaymentFrequency: z.string(),
        TermType: z.string(),
        WorstPayStatus: z.string(),
        PayStatusHistoryStartDate: z.string(),
        PayStatusHistory: z.string(),
        Remark: z.string().nullable(),
        CreditLimit: z.string()
      })),
      Creditors: z.array(z.object({
        CreditorId: z.string(),
        BureauId: z.number(),
        CreditorName: z.string(),
        StreetAddress: z.string(),
        City: z.string(),
        State: z.string(),
        Zip: z.string(),
        Phone: z.string(),
        Industry: z.string()
      })),
      Identity: z.object({
        SSN: z.string(),
        YearOfBirth: z.string().nullable(),
        FullDOB: z.string().nullable()
      }),
      Summary: z.object({
        TotalAccounts: z.number(),
        TotalOpenAccounts: z.number(),
        TotalClosedAccounts: z.number(),
        TotalNegativeAccounts: z.number(),
        TotalInquiriesLast24Months: z.number(),
        TotalPublicRecords: z.number(),
        TotalBalances: z.number(),
        TotalCreditLimit: z.number()
      }),
      SummaryByBureau: z.array(z.object({
        BureauId: z.number(),
        TotalAccounts: z.number(),
        TotalOpenAccounts: z.number(),
        TotalClosedAccounts: z.number(),
        TotalNegativeAccounts: z.number(),
        TotalInquiriesLast24Months: z.number(),
        TotalPublicRecords: z.number(),
        TotalBalances: z.number(),
        TotalCreditLimit: z.number()
      }))
    }).strict()
  , ExtraFields: z.object({
    ScoreFactors: z.array(z.record(z.any())),
    ScoreContent: z.array(z.record(z.any()))
  }).optional()
  }).strict();
  const parsed = schema.safeParse(converted);
  if (!parsed.success) {
    console.warn('MyScoreIQ schema validation failed', parsed.error?.errors);
  }


  // Write converted file
  try {
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const convertedPath = path.join(outDir, `client_${cid}_myscoreiq_converted_${ts}.json`);
    fs.writeFileSync(convertedPath, JSON.stringify(converted, null, 2), 'utf8');
    reportData.converted_report_path = convertedPath;
    reportData.filePath = convertedPath;
    try {
      reportData.reportData = converted.reportData;
      reportData.Score = converted.reportData?.Score;
      reportData.CreditReport = converted.reportData?.CreditReport;
      reportData.ReportDate = converted.reportData?.CreditReport?.[0]?.DateReport;
    } catch {}
    console.log('MyScoreIQ converted report saved to:', convertedPath);
  } catch (e) {
    console.error('Failed to save converted report:', e?.message || e);
  }
}
// --- End robust MyScoreIQ conversion block ---


    } catch (convErr) {
      console.warn('MyScoreIQ conversion warning:', convErr?.message || convErr);
    }

    try {
      if (platform && String(platform).toLowerCase() === String(PLATFORMS.IDENTITYIQ).toLowerCase()) {
        const outDir = scraperOptions.outputDir || './scraper-output';
        const cid = String(clientId || 'unknown');
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const raw = reportData?.rawCreditData || reportData;
        const bureauFromType = (t) => {
          const s = String(t || '').toLowerCase();
          if (s.includes('exp')) return 1;
          if (s.includes('eqf')) return 2;
          if (s.includes('tuc')) return 3;
          return null;
        };
        const bureauFromStr = (b) => {
          const s = String(b || '').toLowerCase();
          if (s.includes('exper')) return 1;
          if (s.includes('equif')) return 2;
          if (s.includes('trans')) return 3;
          return null;
        };
        const bureauFromCode = (c) => {
          const s = String(c || '').toLowerCase();
          if (s.includes('exp')) return 1;
          if (s.includes('eqf')) return 2;
          if (s.includes('tuc')) return 3;
          return null;
        };
        const normalizeStr = (v, def = '') => {
          if (v === null || v === undefined) return def;
          if (typeof v === 'string') return v;
          if (typeof v === 'number') return String(v);
          if (typeof v === 'object') {
            if (v && typeof v.name === 'string') return v.name;
            if (v && typeof v.$ === 'string') return v.$;
          }
          try { return JSON.stringify(v); } catch { return def; }
        };
        const parseDate = (v) => {
          const s = normalizeStr(v, '');
          if (!s) return null;
          const d = new Date(s);
          if (isNaN(d.getTime())) {
            const m = s.match(/\d{4}-\d{2}-\d{2}/) || s.match(/\d{2}\/\d{2}\/\d{4}/);
            return m ? m[0] : null;
          }
          return d.toISOString();
        };
        const toNumber = (v) => {
          const s = normalizeStr(v, '');
          const n = parseFloat(s.replace(/[^0-9.\-]/g, ''));
          return isNaN(n) ? 0 : n;
        };
        const toTitle = (s) => {
          const str = normalizeStr(s, '');
          return str ? str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) : str;
        };
        const accountsIQ = [];
        const inquiriesIQ = [];
        const employersIQ = [];
        const addressesIQ = [];
        const scoresIQ = [];
        const namesIQ = [];
        const birthsIQ = [];
        const q = [{ node: raw, bureau: null }];
        const seen = new Set();
        while (q.length) {
          const { node, bureau } = q.shift();
          if (!node || typeof node !== 'object') continue;
          if (seen.has(node)) continue;
          seen.add(node);
          const typeVal = normalizeStr(node?.Type?.$, null);
          const nextBureau = typeVal ? bureauFromType(typeVal) : bureau;
          for (const k of Object.keys(node)) {
            const v = node[k];
            if (!v) continue;
            if (k === 'Tradeline' && Array.isArray(v)) {
              for (const a of v) {
                const bi = a?.['@bureau'] ? bureauFromStr(a['@bureau']) : nextBureau;
                accountsIQ.push({ a, bi });
              }
            } else if (k === 'Inquiry' && Array.isArray(v)) {
              for (const inq of v) {
                const bi = nextBureau;
                inquiriesIQ.push({ inq, bi });
              }
            } else if (k === 'Inquiry' && typeof v === 'object' && !Array.isArray(v)) {
              const bi = nextBureau;
              inquiriesIQ.push({ inq: v, bi });
            } else if (k === 'BorrowerAddress' && Array.isArray(v)) {
              for (const addr of v) {
                const bi = bureauFromStr(addr?.Source?.Bureau?.['@abbreviation']) || bureauFromCode(addr?.Source?.Bureau?.['@symbol']) || nextBureau;
                addressesIQ.push({ addr, bi });
              }
            } else if (k === 'BorrowerName' && Array.isArray(v)) {
              for (const n of v) {
                const bi = bureauFromStr(n?.Source?.Bureau?.['@abbreviation']) || bureauFromCode(n?.Source?.Bureau?.['@symbol']) || nextBureau;
                namesIQ.push({ n, bi });
              }
            } else if (k === 'Birth' && Array.isArray(v)) {
              for (const b of v) {
                const bi = bureauFromStr(b?.Source?.Bureau?.['@abbreviation']) || bureauFromCode(b?.Source?.Bureau?.['@symbol']) || nextBureau;
                birthsIQ.push({ b, bi });
              }
            } else if (k === 'Employer' && Array.isArray(v)) {
              for (const emp of v) {
                const bi = nextBureau;
                employersIQ.push({ emp, bi });
              }
            } else if (k === 'CreditScoreType' && typeof v === 'object') {
              const bi = nextBureau;
              scoresIQ.push({ s: v, bi });
            }
            if (typeof v === 'object') q.push({ node: v, bureau: nextBureau });
          }
        }
        const accountsFormal = accountsIQ.map(({ a, bi }, idx) => {
          const remarkArr = Array.isArray(a?.Remark) ? a.Remark : (a?.Remark ? [a.Remark] : []);
          const remark = remarkArr.reduce((acc, r) => acc || normalizeStr(r?.RemarkCode?.['@description'] || ''), '');
          return {
            BureauId: bi ?? ((idx % 3) + 1),
            AccountTypeDescription: toTitle(a?.GrantedTrade?.AccountType?.['@description'] || a?.GrantedTrade?.AccountType?.description || ''),
            HighBalance: String(toNumber(a?.['@highBalance'] || a?.GrantedTrade?.highBalance || a?.GrantedTrade?.HighBalance?.$)),
            DateReported: (parseDate(a?.['@dateReported']) || '')?.slice(0,10) || '',
            DateOpened: (parseDate(a?.['@dateOpened']) || '')?.slice(0,10) || '',
            AccountNumber: normalizeStr(a?.['@accountNumber'] || '').replace(/\*/g, ''),
            DateAccountStatus: (parseDate(a?.['@dateAccountStatus']) || '')?.slice(0,10) || '',
            CurrentBalance: String(toNumber(a?.['@currentBalance'])),
            CreditorName: normalizeStr(a?.['@creditorName'] || ''),
            AccountCondition: normalizeStr(a?.OpenClosed?.['@description'] || a?.AccountCondition?.['@description'] || a?.AccountCondition?.description || ''),
            AccountDesignator: normalizeStr(a?.AccountDesignator?.['@description'] || a?.AccountDesignator?.description || ''),
            DisputeFlag: normalizeStr(a?.VerificationIndicator?.['@description'] || a?.DisputeFlag?.['@description'] || a?.DisputeFlag?.description || ''),
            Industry: normalizeStr(a?.IndustryCode?.['@description'] || a?.IndustryCode?.description || ''),
            AccountStatus: normalizeStr(a?.GrantedTrade?.PayStatus?.['@description'] || a?.GrantedTrade?.PayStatus?.description || ''),
            PaymentStatus: normalizeStr(a?.GrantedTrade?.PayStatus?.['@description'] || a?.GrantedTrade?.PayStatus?.description || ''),
            AmountPastDue: String(toNumber(a?.GrantedTrade?.AmountPastDue?.$ || a?.GrantedTrade?.amountPastDue || a?.['@amountPastDue'])),
            AccountType: toTitle(a?.GrantedTrade?.CreditType?.['@description'] || a?.['@accountTypeDescription'] || ''),
            CreditType: toTitle(a?.GrantedTrade?.CreditType?.['@abbreviation'] || a?.GrantedTrade?.CreditType?.['@symbol'] || a?.['@accountTypeAbbreviation'] || a?.['@accountTypeSymbol'] || ''),
            PaymentFrequency: normalizeStr(a?.GrantedTrade?.PaymentFrequency?.['@description'] || a?.GrantedTrade?.PaymentFrequency?.description || ''),
            TermType: normalizeStr(a?.GrantedTrade?.TermType?.['@description'] || a?.GrantedTrade?.TermType?.description || ''),
            WorstPayStatus: normalizeStr(a?.GrantedTrade?.WorstPayStatus?.['@description'] || a?.GrantedTrade?.WorstPayStatus?.description || ''),
            PayStatusHistoryStartDate: (parseDate(a?.GrantedTrade?.PayStatusHistory?.['@startDate'] || a?.GrantedTrade?.PayStatusHistory?.startDate) || '')?.slice(0,10) || '',
            PayStatusHistory: normalizeStr(a?.GrantedTrade?.PayStatusHistory?.['@status'] || ''),
            Remark: remark || null,
            CreditLimit: String(toNumber(a?.GrantedTrade?.CreditLimit?.$ || a?.GrantedTrade?.creditLimit || a?.['@creditLimit']))
          };
        });
        const toInquiryTypeFlag = (inq) => {
          const abbrRaw = normalizeStr(inq?.InquiryType?.['@abbreviation'] || inq?.['@inquiryType'] || '').trim().toUpperCase();
          const desc = normalizeStr(inq?.InquiryType?.['@description'] || '').toLowerCase();
          const subscriber = normalizeStr(inq?.['@subscriberName'] || '').toLowerCase();
          if (abbrRaw) {
            if (abbrRaw === 'PRM' || abbrRaw === 'ANA' || abbrRaw === 'AM0' || abbrRaw === 'AMO') return abbrRaw;
            if (abbrRaw === 'I') return 'I';
            return abbrRaw;
          }
          if (desc.includes('promotional') || desc.includes('soft') || desc.includes('analytics') || desc.includes('analytical')) return 'PRM';
          const lenderPatterns = /(bank|card|finance|credit|capital|auto|loan|mortgage|federal|fccu|fcu|us bank|keybank|jpmcb|chase|barclays|navy|pentagon|coaf|td auto|bmw|green)/;
          if (lenderPatterns.test(subscriber)) return 'I';
          return 'PRM';
        };
        const inquiriesFormal = inquiriesIQ.map(({ inq, bi }, idx) => ({
          BureauId: bi ?? ((idx % 3) + 1),
          DateInquiry: (parseDate(inq?.['@inquiryDate']) || '')?.slice(0,10) || '',
          CreditorName: normalizeStr(inq?.['@subscriberName'] || ''),
          InquiryType: toInquiryTypeFlag(inq),
          Industry: normalizeStr(
            inq?.IndustryCode?.['@description'] || inq?.IndustryCode?.['@abbreviation'] || inq?.Industry?.['@description'] || inq?.Industry?.['@abbreviation'] || ''
          )
        }));
        const employersFormal = employersIQ.map(({ emp, bi }, idx) => ({
          EmployerName: normalizeStr(emp?.['@name'] || ''),
          BureauId: bi ?? ((idx % 3) + 1),
          DateReported: (parseDate(emp?.['@dateReported']) || '')?.slice(0,10) || '',
          DateUpdated: (parseDate(emp?.['@dateUpdated']) || '')?.slice(0,10) || '',
          Position: normalizeStr(emp?.['@position'] || ''),
          Income: toNumber(emp?.['@income'] || 0)
        }));
        const addressesFormal = addressesIQ.map(({ addr, bi }, idx) => {
          const ca = addr?.CreditAddress || {};
          const streetRaw = normalizeStr(ca?.['@unparsedStreet'] || '');
          const builtStreet = [normalizeStr(ca?.['@houseNumber'] || ''), normalizeStr(ca?.['@streetName'] || ''), normalizeStr(ca?.['@streetType'] || '')].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
          const street = streetRaw ? streetRaw.replace(/\s+/g,' ').trim() : builtStreet;
          const city = normalizeStr(ca?.['@city'] || '');
          const state = normalizeStr(ca?.['@stateCode'] || '');
          const zip = normalizeStr(ca?.['@postalCode'] || '');
          const order = normalizeStr(addr?.['@addressOrder'] || '');
          const addressType = order === '0' ? 'Current' : 'Previous';
          return {
            BureauId: bi ?? ((idx % 3) + 1),
            StreetAddress: street,
            City: city,
            State: state,
            Zip: zip,
            AddressType: addressType
          };
        }).filter(a => a.StreetAddress || a.City || a.State || a.Zip);
        const namesFormal = namesIQ.map(({ n, bi }, idx) => ({
          BureauId: bi ?? ((idx % 3) + 1),
          FirstName: normalizeStr(n?.Name?.['@first'] || ''),
          Middle: normalizeStr(n?.Name?.['@middle'] || ''),
          LastName: normalizeStr(n?.Name?.['@last'] || ''),
          NameType: normalizeStr(n?.NameType?.['@description'] || n?.NameType?.description || 'Primary')
        }));
        const dobsFormal = birthsIQ.map(({ b, bi }, idx) => {
          const y = normalizeStr(b?.BirthDate?.['@year'] || '');
          const m = normalizeStr(b?.BirthDate?.['@month'] || '');
          const d = normalizeStr(b?.BirthDate?.['@day'] || '');
          const dateRaw = normalizeStr(b?.['@date'] || '');
          const date = (parseDate(dateRaw || (y && m && d ? `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}` : '')) || '')?.slice(0,10) || '';
          return {
            BureauId: bi ?? ((idx % 3) + 1),
            DOB: date
          };
        });
        const baseDateScore = (parseDate(reportData?.reportDate || reportData?.clientInfo?.timestamp) || '')?.slice(0,10) || '';
        const bureauScoresMap = new Map();
        for (const { s, bi } of scoresIQ) {
          const id = bi ?? null;
          if (!id) continue;
          bureauScoresMap.set(id, {
            BureauId: id,
            Score: normalizeStr(s?.['@riskScore'] || '') || null,
            ScoreType: normalizeStr(s?.['@scoreName'] || s?.['@model'] || ''),
            DateScore: baseDateScore
          });
        }
        const scoresArrayFull = [1,2,3].map(id => (bureauScoresMap.get(id) || { BureauId: id, Score: null, ScoreType: '', DateScore: baseDateScore }));
        const creditorsMap = new Map();
        const pushCreditor = (name, street, city, state, zip, phone, industry) => {
          const key = [normalizeStr(name||''), normalizeStr(street||''), normalizeStr(city||''), normalizeStr(state||''), normalizeStr(zip||'')].join('|').toLowerCase();
          if (!creditorsMap.has(key)) creditorsMap.set(key, { CreditorName: normalizeStr(name||''), StreetAddress: normalizeStr(street||''), City: normalizeStr(city||''), State: normalizeStr(state||''), Zip: normalizeStr(zip||''), Phone: normalizeStr(phone||''), Industry: normalizeStr(industry||'') });
        };
        for (const a of accountsFormal) { pushCreditor(a.CreditorName, '', '', '', '', '', a.Industry); }
        for (const inq of inquiriesFormal) { pushCreditor(inq.CreditorName, '', '', '', '', '', inq.Industry); }
        const creditorsArray = Array.from(creditorsMap.values()).map((c, idx) => ({ CreditorId: idx+1, ...c }));
        const birthYears = birthsIQ.map(({ b }) => normalizeStr(b?.BirthDate?.['@year'] || '')).filter(Boolean);
        const dobCandidates = birthsIQ.map(({ b }) => {
          const y = normalizeStr(b?.BirthDate?.['@year'] || '');
          const m = normalizeStr(b?.BirthDate?.['@month'] || '');
          const d = normalizeStr(b?.BirthDate?.['@day'] || '');
          const dateRaw = normalizeStr(b?.['@date'] || '');
          const date = (parseDate(dateRaw || (y && m && d ? `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}` : '')) || '')?.slice(0,10) || '';
          return date;
        }).filter(Boolean);
        const fullDob = dobCandidates[0] || null;
        const yearOfBirth = birthYears[0] || '';
        const fullName = (() => {
          try {
            const primary = namesFormal.find(n => /primary/i.test(normalizeStr(n?.NameType || '')));
            const parts = [normalizeStr(primary?.FirstName||''), normalizeStr(primary?.Middle||''), normalizeStr(primary?.LastName||'')].filter(Boolean);
            return parts.join(' ').trim() || '';
          } catch { return ''; }
        })();
        let ssnLast4 = '';
        try {
          const socials = [];
          const q2 = [{ node: raw }];
          const seen2 = new Set();
          while (q2.length) {
            const { node } = q2.shift();
            if (!node || typeof node !== 'object' || seen2.has(node)) continue;
            seen2.add(node);
            for (const k of Object.keys(node)) {
              const v = node[k];
              if (!v) continue;
              if (k === 'Social' && Array.isArray(v)) { for (const s of v) { socials.push(s); } }
              if (typeof v === 'object') q2.push({ node: v });
            }
          }
          const ssnRaw = normalizeStr(socials[0]?.SocialSecurityNumber?.['$'] || '');
          const digits = ssnRaw.replace(/[^0-9]/g,'');
          ssnLast4 = digits.length >= 4 ? digits.slice(-4) : '';
        } catch {}
        const maskedSSN = `XXX-XX-${ssnLast4 || '0000'}`;
        const identityBlock = { SSN: maskedSSN, YearOfBirth: yearOfBirth, FullDOB: fullDob, FullName: fullName };
        const namesByBureau = new Map();
        try {
          for (const n of namesFormal) {
            const id = n.BureauId;
            const existing = namesByBureau.get(id);
            const isPrimary = /primary/i.test(normalizeStr(n?.NameType || ''));
            if (!existing || (isPrimary && !(/primary/i.test(normalizeStr(existing?.NameType || ''))))) {
              namesByBureau.set(id, { BureauId: id, FirstName: n.FirstName || '', Middle: n.Middle || '', LastName: n.LastName || '', NameType: 'Primary' });
            }
          }
        } catch {}
        const fallbackName = { FirstName: normalizeStr(fullName).split(' ')[0] || '', Middle: '', LastName: (() => { const parts = normalizeStr(fullName).split(' '); return parts.length>1 ? parts[parts.length-1] : ''; })(), NameType: 'Primary' };
        const namesArrayFull = [1,2,3].map(id => {
          const v = namesByBureau.get(id);
          return { BureauId: id, FirstName: v?.FirstName || fallbackName.FirstName, Middle: v?.Middle || fallbackName.Middle, LastName: v?.LastName || fallbackName.LastName, NameType: 'Primary' };
        });
        const dobsByBureau = new Map();
        try { for (const d of dobsFormal) { if (d && d.BureauId) dobsByBureau.set(d.BureauId, d.DOB || ''); } } catch {}
        const dobNorm = (s) => ((parseDate(s) || '')?.slice(0,10) || '');
        const fallbackDob = dobNorm(fullDob || '');
        const dobsArrayFull = [1,2,3].map(id => ({ BureauId: id, DOB: dobNorm(dobsByBureau.get(id) || fallbackDob) }));
        const isNegative = (acc) => {
          const ps = normalizeStr(acc?.PaymentStatus || '').toLowerCase();
          const wps = normalizeStr(acc?.WorstPayStatus || '').toLowerCase();
          const pastDue = parseFloat(normalizeStr(acc?.AmountPastDue || '0')) || 0;
          if (/charge|collection/.test(ps)) return true;
          if (/(30|60|90|120|150|180)/.test(wps)) return true;
          if (/late|delinq/.test(ps)) return true;
          if (pastDue > 0) return true;
          return false;
        };
        const totalAccounts = accountsFormal.length;
        const totalOpen = accountsFormal.filter(a => /open/i.test(normalizeStr(a.AccountCondition||''))).length;
        const totalClosed = accountsFormal.filter(a => /closed/i.test(normalizeStr(a.AccountCondition||''))).length;
        const totalNegative = accountsFormal.filter(isNegative).length;
        const now = new Date();
        const tsDate = new Date(reportData?.clientInfo?.timestamp || now.toISOString());
        const monthsDiff = (d) => { try { const dd = new Date(d); return (now.getFullYear()-dd.getFullYear())*12 + (now.getMonth()-dd.getMonth()); } catch { return 999; } };
        const inquiries24 = inquiriesFormal.filter(i => monthsDiff(i.DateInquiry) <= 24).length;
        const prTotal = 0;
        const totalBalances = accountsFormal.reduce((sum,a)=> sum + (parseFloat(normalizeStr(a.CurrentBalance||'0'))||0), 0);
        const totalCreditLimit = accountsFormal.reduce((sum,a)=> sum + (parseFloat(normalizeStr(a.CreditLimit||'0'))||0), 0);
        const summaryByBureau = [1,2,3].map(id => {
          const accs = accountsFormal.filter(a => a.BureauId === id);
          const inqs = inquiriesFormal.filter(i => i.BureauId === id);
          const balances = accs.reduce((sum,a)=> sum + (parseFloat(normalizeStr(a.CurrentBalance||'0'))||0), 0);
          const credit = accs.reduce((sum,a)=> sum + (parseFloat(normalizeStr(a.CreditLimit||'0'))||0), 0);
          const open = accs.filter(a => /open/i.test(normalizeStr(a.AccountCondition||''))).length;
          const closed = accs.filter(a => /closed/i.test(normalizeStr(a.AccountCondition||''))).length;
          const negative = accs.filter(isNegative).length;
          const inq24 = inqs.filter(i => monthsDiff(i.DateInquiry) <= 24).length;
          return { BureauId: id, TotalAccounts: accs.length, TotalOpenAccounts: open, TotalClosedAccounts: closed, TotalNegativeAccounts: negative, TotalInquiriesLast24Months: inq24, TotalPublicRecords: prTotal, TotalBalances: balances, TotalCreditLimit: credit };
        });
        const summary = { TotalAccounts: totalAccounts, TotalOpenAccounts: totalOpen, TotalClosedAccounts: totalClosed, TotalNegativeAccounts: totalNegative, TotalInquiriesLast24Months: inquiries24, TotalPublicRecords: prTotal, TotalBalances: totalBalances, TotalCreditLimit: totalCreditLimit };
        const converted = {
          report: {
            Scores: scoresArrayFull,
            Accounts: accountsFormal,
            Inquiries: inquiriesFormal,
            PublicRecords: [],
            Address: addressesFormal,
            Employer: employersFormal,
            Creditors: creditorsArray,
            Summary: summary,
            SummaryByBureau: summaryByBureau,
            Identity: identityBlock,
            Name: namesArrayFull,
            DOB: dobsArrayFull
          },
          reportData: {
            Scores: scoresArrayFull,
            Accounts: accountsFormal,
            Inquiries: inquiriesFormal,
            PublicRecords: [],
            Address: addressesFormal,
            Employer: employersFormal,
            Creditors: creditorsArray,
            Summary: summary,
            SummaryByBureau: summaryByBureau,
            Identity: identityBlock,
            Name: namesArrayFull,
            DOB: dobsArrayFull
          },
          platform,
          clientId,
          ts,
          rawKeys: Object.keys(reportData || {}),
          extractedCounts: {
            accounts: accountsFormal.length,
            inquiries: inquiriesFormal.length,
            employers: employersFormal.length,
            scores: scoresArrayFull.length
          }
        };
        try {
          if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
          const convertedPath = path.join(outDir, `client_${cid}_identityiq_converted_${ts}.json`);
          fs.writeFileSync(convertedPath, JSON.stringify(converted, null, 2), 'utf8');
          reportData.converted_report_path = convertedPath;
          reportData.filePath = convertedPath;
          try {
            reportData.reportData = converted.reportData;
            reportData.Score = converted.reportData?.Scores;
            reportData.ReportDate = (parseDate(reportData?.clientInfo?.timestamp) || '')?.slice(0,10) || null;
          } catch {}
        } catch {}
      }
    } catch {}
    
    // Save to database
    try {
      // Use the pre-imported database utility
      const dbUtil = await import('../database/dbConnection.js');
      
      console.log('Saving report history to database');
      
      // Extract bureau scores from reportData
      let experianScore = null;
      let equifaxScore = null;
      let transunionScore = null;
      let creditScore = null;
      let reportDate = null;
      let notes = null;

      // Extract scores from reportData if available
      if (reportData && reportData.reportData && reportData.reportData.Score && Array.isArray(reportData.reportData.Score)) {
        const scores = reportData.reportData.Score;
        scores.forEach(score => {
          const scoreValue = parseInt(score.Score);
          if (!isNaN(scoreValue)) {
            if (platform && String(platform).toLowerCase() === String(PLATFORMS.IDENTITYIQ).toLowerCase()) {
              if (score.BureauId === 1) experianScore = scoreValue;
              if (score.BureauId === 2) equifaxScore = scoreValue;
              if (score.BureauId === 3) transunionScore = scoreValue;
            } else {
              if (score.BureauId === 1) transunionScore = scoreValue;
              if (score.BureauId === 2) experianScore = scoreValue;
              if (score.BureauId === 3) equifaxScore = scoreValue;
            }
          }
        });

        // Calculate primary credit score as the maximum of the three
        const validScores = [experianScore, equifaxScore, transunionScore].filter(score => score !== null);
        if (validScores.length > 0) {
          creditScore = Math.max(...validScores);
        }
      } else if (reportData && reportData.Score && Array.isArray(reportData.Score)) {
        const scores = reportData.Score;
        scores.forEach(score => {
          const scoreValue = parseInt(score.Score);
          if (!isNaN(scoreValue)) {
            if (platform && String(platform).toLowerCase() === String(PLATFORMS.IDENTITYIQ).toLowerCase()) {
              if (score.BureauId === 1) experianScore = scoreValue;
              if (score.BureauId === 2) equifaxScore = scoreValue;
              if (score.BureauId === 3) transunionScore = scoreValue;
            } else {
              if (score.BureauId === 1) transunionScore = scoreValue;
              if (score.BureauId === 2) experianScore = scoreValue;
              if (score.BureauId === 3) equifaxScore = scoreValue;
            }
          }
        });
        const validScores = [experianScore, equifaxScore, transunionScore].filter(score => score !== null);
        if (validScores.length > 0) {
          creditScore = Math.max(...validScores);
        }
      }

      // Extract report date if available
      if (reportData && reportData.reportData && reportData.reportData.ReportDate) {
        reportDate = reportData.reportData.ReportDate;
      } else if (reportData && reportData.CreditReport && Array.isArray(reportData.CreditReport) && reportData.CreditReport[0]?.DateReport) {
        reportDate = reportData.CreditReport[0].DateReport;
      }

      // Create notes with additional report information
      if (reportData && (reportData.reportData || reportData.Score)) {
        const noteData = {
          platform: platform,
          scraped_at: new Date().toISOString(),
          has_scores: !!(experianScore || equifaxScore || transunionScore),
          bureau_scores: {
            experian: experianScore,
            equifax: equifaxScore,
            transunion: transunionScore
          }
        };
        notes = JSON.stringify(noteData);
      }

      // Save report history to database
      const historyData = {
        client_id: clientId,
        platform: platform,
        report_path: reportData.converted_report_path || reportData.filePath || null,
        status: 'completed',
        credit_score: creditScore,
        experian_score: experianScore,
        equifax_score: equifaxScore,
        transunion_score: transunionScore,
        report_date: reportDate,
        notes: notes
      };
      
      // Log the data we're trying to save
      console.log('Saving history data:', JSON.stringify(historyData));
      
      // Save to database using our utility with timeout guard
      const timeoutMs = 10000;
      const savePromise = dbUtil.saveCreditReport(historyData);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB save timeout')), timeoutMs));
      const result = await Promise.race([savePromise, timeoutPromise]);
      console.log('Successfully saved report to database with ID:', result.insertId);
      console.log('Saved report history to database');
      
      const hasScores = experianScore !== null || equifaxScore !== null || transunionScore !== null;
      let rawReportDate = null;
      if (reportData && reportData.reportData && reportData.reportData.ReportDate) {
        rawReportDate = reportData.reportData.ReportDate;
      } else if (reportData && Array.isArray(reportData.CreditReport) && reportData.CreditReport[0] && reportData.CreditReport[0].DateReport) {
        rawReportDate = reportData.CreditReport[0].DateReport;
      }
      const hasRealReportDate = !!rawReportDate;
      const numericClientId = clientId && clientId !== 'unknown' ? parseInt(String(clientId), 10) : NaN;
      if (hasScores && hasRealReportDate && !isNaN(numericClientId) && req.user && req.user.email) {
        try {
          const clientRows = await dbUtil.executeQuery(
            'SELECT first_name, last_name FROM clients WHERE id = ? LIMIT 1',
            [numericClientId]
          );
          const clientRow = Array.isArray(clientRows) && clientRows.length ? clientRows[0] : null;
          const clientName = clientRow ? `${clientRow.first_name || ''} ${clientRow.last_name || ''}`.trim() : `Client #${numericClientId}`;
          const formattedDate = (() => {
            try {
              const d = new Date(rawReportDate);
              if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
            } catch {}
            return String(rawReportDate);
          })();
          const scoresSummaryParts = [];
          if (experianScore !== null) scoresSummaryParts.push(`Experian: ${experianScore}`);
          if (equifaxScore !== null) scoresSummaryParts.push(`Equifax: ${equifaxScore}`);
          if (transunionScore !== null) scoresSummaryParts.push(`TransUnion: ${transunionScore}`);
          const scoresSummary = scoresSummaryParts.join(' | ');
          const html = `
            <p>A new credit report has been scraped successfully.</p>
            <p><strong>Client:</strong> ${clientName}</p>
            <p><strong>Client ID:</strong> ${numericClientId}</p>
            <p><strong>Platform:</strong> ${platform}</p>
            <p><strong>Report Date:</strong> ${formattedDate}</p>
            <p><strong>Scores:</strong> ${scoresSummary || 'N/A'}</p>
          `;
          const textLines = [
            'A new credit report has been scraped successfully.',
            `Client: ${clientName}`,
            `Client ID: ${numericClientId}`,
            `Platform: ${platform}`,
            `Report Date: ${formattedDate}`,
            `Scores: ${scoresSummary || 'N/A'}`
          ];
          emailService.sendEmail({
            to: req.user.email,
            subject: `New credit report for ${clientName || 'client'} (${String(platform)})`,
            html,
            text: textLines.join('\n')
          }).catch(err => {
            console.error('Failed to send credit report admin email:', err);
          });
        } catch (e) {
          console.error('Error preparing credit report admin email:', e);
        }
      }
      
      const reportId = result.insertId;
      
      try { clearInterval(__keepAlive); } catch {}
      try {
        res.statusCode = 200;
        res.end(JSON.stringify({
          success: true,
          message: 'Credit report scraped successfully',
          data: reportData,
          extractedPaths: reportData.extracted_paths || null,
          convertedReportPath: reportData.converted_report_path || null,
          reportId: reportId,
          clientId: clientId
        }));
      } catch {}
      return;
    } catch (dbError) {
      console.error('Failed to save report to database:', dbError);
      
      try { clearInterval(__keepAlive); } catch {}
      if (res.headersSent) { return; }
      res.statusCode = 500;
      try {
        res.end(JSON.stringify({
          success: false,
          message: 'Failed to save report to database',
          error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        }));
      } catch {}
      return;
    }
  } catch (error) {
    console.error('Credit report scraper error:', error);
    
    try { clearInterval(__keepAlive); } catch {}
    if (res.headersSent) { return; }
    res.statusCode = 500;
    try {
      res.end(JSON.stringify({
        success: false,
        message: error.message || 'Failed to scrape credit report',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }));
    } catch {}
    return;
  }
});

router.get('/scrape/jobs/:jobId', authenticateToken, (req, res) => {
  try {
    const jobId = req.params.jobId;
    const job = scrapeJobs.get(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const requesterId = req.user && req.user.id ? req.user.id : null;
    if (job.userId && requesterId && job.userId !== requesterId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const data = {
      id: job.id || jobId,
      status: job.status || 'unknown',
      progress: typeof job.progress === 'number' ? job.progress : null,
      platform: job.platform || null,
      clientId: job.clientId || null,
      reportId: job.reportId || null,
      error: job.error || null,
      result: job.result || null,
      startedAt: job.startedAt || null,
      finishedAt: job.finishedAt || null,
      durationMs: job.durationMs || null
    };

    return res.status(200).json({ success: true, job: data });
  } catch (err) {
    return res.status(500).json({ success: false, message: String(err && err.message || err) });
  }
});

/**
 * @route GET /api/credit-reports/platforms
 * @desc Get list of supported platforms
 * @access Private
 */
router.get('/platforms', authenticateToken, (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      platforms: Object.values(PLATFORMS)
    });
  } catch (error) {
    console.error('Error fetching platforms:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch supported platforms'
    });
  }
});

/**
 * @route GET /api/credit-reports/history
 * @desc Get credit report history for a client or all clients
 * @access Private
 */
router.get('/history', authenticateToken, async (req, res) => {
  let connection = null;
  
  try {
    const { clientId } = req.query;
    const userId = req.user.id;
    let baseUserId = userId;
    
    console.log('🔍 DEBUG: GET /api/credit-reports/history request received (JS file)');
    console.log('🔍 DEBUG: User ID:', userId);
    console.log('🔍 DEBUG: Client ID:', clientId || 'not specified');
    console.log('🔍 DEBUG: Is Super Admin:', req.user.role === 'super_admin' ? 'Yes' : 'No');
    console.log('🔍 DEBUG: User object:', JSON.stringify(req.user, null, 2));
    
    // Import database connection with timeout
    const dbUtil = await import('../database/dbConnection.js');
    
    // Set a timeout for the database connection
    const connectionPromise = dbUtil.getConnection();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database connection timeout')), 5000);
    });
    
    connection = await Promise.race([connectionPromise, timeoutPromise]);
    console.log('🔍 DEBUG: Database connection established');

    if (req.user.role !== 'super_admin' && req.user.role !== 'client' && req.user.role !== 'admin') {
      try {
        const [rows] = await connection.query(
          'SELECT admin_id FROM employees WHERE user_id = ? AND status = ? ORDER BY updated_at DESC LIMIT 1',
          [userId, 'active']
        );
        if (Array.isArray(rows) && rows.length > 0 && rows[0]?.admin_id) {
          baseUserId = Number(rows[0].admin_id);
        }
      } catch (err) {
        console.warn('🔍 DEBUG: Failed to resolve admin_id for employee:', err?.message || err);
      }
    }
    
    // Build query based on whether clientId is provided - using credit_report_history table
    let query = `
      SELECT 
        crh.id, 
        crh.client_id, 
        crh.platform,
        crh.report_path,
        crh.status,
        crh.created_at as report_date,
        crh.created_at,
        c.first_name, 
        c.last_name, 
        c.previous_credit_score,
        u.first_name as admin_first_name,
        u.last_name as admin_last_name,
        u.email as admin_email,
        crh.experian_score,
        crh.equifax_score,
        crh.transunion_score,
        crh.credit_score,
        0 as accounts_total, 
        0 as negative_accounts, 
        0 as inquiries_count, 
        0 as public_records
      FROM credit_report_history crh
      LEFT JOIN clients c ON crh.client_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
    `;
    
    const params = [];
    
    // Add user filter based on role
    if (req.user.role === 'super_admin') {
      // Super admin can see all reports - no filter needed
    } else if (req.user.role === 'client') {
      // Client can only see their own reports - filter by client_id
      query += ' WHERE crh.client_id = ?';
      params.push(userId); // For clients, userId is actually their client_id
    } else {
      // Regular users (admin, support, etc.) - filter by user_id
      query += ' WHERE c.user_id = ?';
      params.push(baseUserId);
    }
    
    // Add client filter if clientId is provided (and not already filtered by client role)
    if (clientId && clientId !== 'all' && req.user.role !== 'client') {
      query += params.length > 0 ? ' AND crh.client_id = ?' : ' WHERE crh.client_id = ?';
      params.push(clientId);
    }
    
    query += ' ORDER BY crh.created_at DESC';
    
    console.log('🔍 DEBUG: SQL Query:', query);
    console.log('🔍 DEBUG: Query Parameters:', params);
    
    // Execute the query with timeout
    const queryPromise = connection.query(query, params);
    const queryTimeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query execution timeout')), 8000);
    });
    
    const [reports] = await Promise.race([queryPromise, queryTimeoutPromise]);
    
    console.log('🔍 DEBUG: Query returned rows:', reports ? reports.length : 0);
    
    if (reports && reports.length > 0) {
      console.log('🔍 DEBUG: First row sample:', JSON.stringify(reports[0], null, 2));
    } else {
      console.log('🔍 DEBUG: No rows returned from query');
    }
    
    return res.status(200).json({
      success: true,
      data: reports || []
    });
  } catch (error) {
    console.error('Error fetching credit report history:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch credit report history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    // Always release the connection
    if (connection) {
      try {
        connection.release();
        console.log('🔍 DEBUG: Database connection released');
      } catch (releaseError) {
        console.error('Error releasing database connection:', releaseError);
      }
    }
  }
});

// Get credit report for a specific client (for client dashboard)
router.get('/client/:clientId', authenticateToken, async (req, res) => {
  try {
    const { clientId } = req.params;
    const user = req.user;
    const numericClientId = Number(clientId);

    console.log(`🔍 CR-AUTH: Fetching credit report for client ${clientId}, user.id=${user.id}, user.role='${user.role}'`);

    if (!Number.isFinite(numericClientId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid client ID'
      });
    }

    // Use the database adapter instead of direct MySQL connection.
    const db = getDatabaseAdapter();

    // Authorization logic aligned with clients routes:
    // - funding_manager and super_admin can access any client's reports
    // - admin can access clients in their workspace
    // - non-admin roles (employee/user/client legacy) resolve employee -> admin mapping,
    //   and fall back to their own user scope if no mapping exists
    const role = String(user.role || '').toLowerCase();
    const isFundingManager = role === 'funding_manager';
    const isSuperAdmin = role === 'super_admin';
    const isClient = role === 'client';
    let hasClientAccess = false;

    console.log(`🔍 CR-AUTH: normalizedRole='${role}', isFundingManager=${isFundingManager}, isSuperAdmin=${isSuperAdmin}`);

    if (isFundingManager || isSuperAdmin) {
      hasClientAccess = true;
      console.log(`🔍 CR-AUTH: Granted (privileged role)`);
    } else if (isClient) {
      hasClientAccess = Number(user.id) === numericClientId;
      console.log(`🔍 CR-AUTH: Client self-access=${hasClientAccess} for tokenClientId=${user.id}`);
    } else {
      let baseUserId = Number(user.id);

      if (role !== 'admin') {
        console.log(`🔍 CR-AUTH: Non-admin role, resolving employee->admin mapping for user_id=${user.id}`);
        const employeeLinks = await db.executeQuery(
          'SELECT admin_id FROM employees WHERE user_id = ? AND status = ? ORDER BY updated_at DESC LIMIT 1',
          [user.id, 'active']
        );
        console.log(`🔍 CR-AUTH: employeeLinks result:`, JSON.stringify(employeeLinks));

        if (Array.isArray(employeeLinks) && employeeLinks[0]?.admin_id) {
          baseUserId = Number(employeeLinks[0].admin_id);
          console.log(`🔍 CR-AUTH: Resolved baseUserId=${baseUserId} from employee mapping`);
        } else {
          console.log(`🔍 CR-AUTH: No employee mapping found, using own user.id=${baseUserId} as baseUserId`);
        }
      } else {
        console.log(`🔍 CR-AUTH: Admin role, using own user.id=${baseUserId} as baseUserId`);
      }

      console.log(`🔍 CR-AUTH: Checking client access: clientId=${numericClientId}, baseUserId=${baseUserId}`);
      const accessibleClients = await db.executeQuery(
        `SELECT id
         FROM clients
         WHERE id = ?
           AND (user_id = ? OR user_id IN (
             SELECT user_id FROM employees WHERE admin_id = ? AND status = ?
           ))
         LIMIT 1`,
        [numericClientId, baseUserId, baseUserId, 'active']
      );
      console.log(`🔍 CR-AUTH: accessibleClients result:`, JSON.stringify(accessibleClients));

      hasClientAccess = Array.isArray(accessibleClients) && accessibleClients.length > 0;
    }

    console.log(`🔍 CR-AUTH: Final hasClientAccess=${hasClientAccess} for user.id=${user.id}, role='${role}', clientId=${numericClientId}`);

    if (!hasClientAccess) {
      return res.status(403).json({
        success: false,
        message: `Access denied - insufficient permissions (debug: role=${role}, userId=${user.id}, clientId=${numericClientId})`
      });
    }
    
    const rows = await db.executeQuery(
      `SELECT 
        crh.id,
        crh.client_id,
        crh.platform,
        crh.report_path,
        crh.status,
        crh.created_at,
        c.first_name,
        c.last_name,
        c.platform_email as email
      FROM credit_report_history crh
      JOIN clients c ON crh.client_id = c.id
      WHERE crh.client_id = ?
      ORDER BY crh.created_at DESC
      LIMIT 1`,
      [numericClientId]
    );
    
    console.log('🔍 DEBUG: Database adapter query returned', rows?.length || 0, 'rows');
    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No credit report found for this client'
      });
    }

    const report = rows[0];
    console.log(`🔍 DEBUG: Found report with path: ${report.report_path}`);
    
    // Read the report file
    const fs = await import('fs');
    const path = await import('path');
    
    // Check if the path is absolute or relative
    let reportPath;
    if (path.isAbsolute(report.report_path)) {
      reportPath = report.report_path;
    } else {
      // For relative paths, check if it starts with scraper-output
      if (report.report_path.startsWith('scraper-output')) {
        reportPath = path.join(process.cwd(), report.report_path);
      } else {
        // Default to uploads/credit-reports for legacy paths
        reportPath = path.join(process.cwd(), 'uploads', 'credit-reports', report.report_path);
      }
    }
    
    console.log(`🔍 DEBUG: Looking for file at: ${reportPath}`);
    
    if (!fs.existsSync(reportPath)) {
      return res.status(404).json({
        success: false,
        message: 'Credit report file not found'
      });
    }

    const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    
    console.log('🔍 DEBUG: Successfully loaded JSON file');
    console.log('🔍 DEBUG: reportData keys:', Object.keys(reportData));
    
    // Log activity: report viewed
    try {
      const { getDatabaseAdapter } = await import('../database/databaseAdapter.js');
      const db = getDatabaseAdapter();
      const desc = `Credit report viewed for client ${clientId} (platform: ${report.platform}) (IP: ${req.ip})`;
      try {
        await db.executeQuery(
          `INSERT INTO activities (user_id, client_id, type, description, metadata) VALUES (?, ?, ?, ?, ?)`,
          [
            user.id,
            Number(clientId),
            'note_added',
            desc,
            JSON.stringify({ event: 'report_viewed', platform: report.platform, ip_address: req.ip, user_agent: req.get('User-Agent') || null })
          ]
        );
      } catch (e) {
        console.warn('Activities log insert failed (non-blocking):', e?.message || e);
      }
      try {
        await db.executeQuery(
          `INSERT INTO user_activities (user_id, activity_type, resource_type, resource_id, description, ip_address, user_agent, session_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            user.id,
            'view',
            'credit_report',
            Number(clientId),
            desc,
            req.ip,
            req.get('User-Agent') || null,
            null
          ]
        );
      } catch (e2) {
        console.warn('User activities log insert failed (non-blocking):', e2?.message || e2);
      }
    } catch (logErr) {
      console.warn('Logging error (non-blocking):', logErr?.message || logErr);
    }

    res.json({
      success: true,
      data: {
        ...reportData,
        metadata: {
          id: report.id,
          client_id: report.client_id,
          platform: report.platform,
          status: report.status,
          created_at: report.created_at,
          client_name: `${report.first_name} ${report.last_name}`,
          email: report.email
        }
      }
    });

  } catch (error) {
    console.error('Error fetching client credit report:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/credit-reports/funding-manager/:userId
 * @desc Get latest credit report for a client (funding manager access - only for clients with funding requests)
 * @access Private (Funding Manager only)
 */
router.get('/funding-manager/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    const requestingUserId = req.user.id;
    
    console.log(`🔍 DEBUG: Funding manager ${requestingUserId} requesting credit report for user ${userId}`);
    
    // Only funding managers can access this endpoint
    if (req.user.role !== 'funding_manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Funding manager role required.'
      });
    }
    
    // Get database adapter
    const db = getDatabaseAdapter();
    
    // First, verify that the user has submitted at least one funding request
    const fundingRequestQuery = `
      SELECT COUNT(*) as request_count
      FROM funding_requests fr
      WHERE fr.user_id = ?
    `;
    
    const fundingRequestResult = await db.getQuery(fundingRequestQuery, [userId]);
    
    if (!fundingRequestResult || fundingRequestResult.request_count === 0) {
      return res.status(404).json({
        success: false,
        message: 'No funding requests found for this user. Credit report access denied.'
      });
    }
    
    console.log(`🔍 DEBUG: User ${userId} has ${fundingRequestResult.request_count} funding request(s)`);
    
    // Get the latest credit report for the user's clients
    const query = `
      SELECT 
        crh.id,
        crh.client_id,
        crh.platform,
        crh.report_path,
        crh.status,
        crh.created_at,
        crh.updated_at,
        CONCAT(c.first_name, ' ', c.last_name) as client_name,
        c.email as client_email,
        u.first_name as user_first_name,
        u.last_name as user_last_name,
        u.email as user_email
      FROM credit_report_history crh
      LEFT JOIN clients c ON crh.client_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.user_id = ? 
        AND crh.status = 'completed'
      ORDER BY crh.created_at DESC
      LIMIT 1
    `;
    
    const rows = await db.allQuery(query, [userId]);
    
    console.log(`🔍 DEBUG: Query returned ${rows.length} rows`);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No credit report found for this user\'s clients'
      });
    }
    
    const report = rows[0];
    console.log(`🔍 DEBUG: Found report with path: ${report.report_path}`);
    
    // Parse the JSON report file
    let reportData = null;
    if (report.report_path) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        
        const fullPath = path.resolve(report.report_path);
        console.log(`🔍 DEBUG: Reading file from: ${fullPath}`);
        
        if (fs.existsSync(fullPath)) {
          const fileContent = fs.readFileSync(fullPath, 'utf8');
          reportData = JSON.parse(fileContent);
          console.log(`🔍 DEBUG: Successfully parsed JSON report`);
        } else {
          console.log(`🔍 DEBUG: File not found at path: ${fullPath}`);
        }
      } catch (parseError) {
        console.error('Error parsing JSON report:', parseError);
      }
    }
    
    return res.status(200).json({
      success: true,
      data: {
        metadata: report,
        reportData: reportData,
        fundingRequestCount: fundingRequestResult.request_count
      }
    });
    
  } catch (error) {
    console.error('Error fetching credit report for funding manager:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch credit report',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route GET /api/credit-reports/json-file
 * @desc Get content of a JSON file
 * @access Private
 */
router.get('/json-file', authenticateToken, async (req, res) => {
  try {
    const { path } = req.query;
    
    if (!path || typeof path !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'File path is required'
      });
    }
    
    // Import fs module
    const fs = await import('fs');
    
    // Check if file exists
    if (!fs.existsSync(path)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    // Read the JSON file
    const fileContent = fs.readFileSync(path, 'utf8');
    let jsonData;
    
    try {
      jsonData = JSON.parse(fileContent);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid JSON file'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: jsonData
    });
  } catch (error) {
    console.error('Error reading JSON file:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to read JSON file',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route GET /api/credit-reports/fetch
 * @desc Fetch credit report from specified platform
 * @access Private
 */
router.get('/fetch', authenticateToken, async (req, res) => {
  try {
    // Get query parameters
    const { platform, username, password, clientId } = req.query;
    
    // Validate required parameters
    if (!platform || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: platform, username, and password are required'
      });
    }
    
    // Validate platform
    if (!Object.values(PLATFORMS).includes(platform.toString().toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Unsupported platform: ${platform}. Supported platforms: ${Object.values(PLATFORMS).join(', ')}`
      });
    }
    
    // Set default scraper options
    const scraperOptions = {
      saveHtml: true,
      takeScreenshots: true,
      outputDir: './scraper-output'
    };
    
    console.log(`🔍 Fetching credit report from ${platform} for user ${username}`);
    
    // Call the scraper service
    const result = await fetchCreditReport(
      platform.toLowerCase(),
      { username, password },
      scraperOptions
    );
    
    if (result.success) {
      // If clientId is provided, save to database
      if (clientId) {
        try {
          const dbUtil = await import('../database/dbConnection.js');
          const db = await dbUtil.getConnection();
          
          await db.query(
            'INSERT INTO credit_report_history (client_id, platform, report_path, status, created_at) VALUES (?, ?, ?, ?, NOW())',
            [clientId, platform.toLowerCase(), result.reportPath || '', 'completed']
          );
          
          console.log(`✅ Credit report saved to database for client ${clientId}`);
        } catch (dbError) {
          console.error('Error saving to database:', dbError);
          // Don't fail the request if database save fails
        }
      }

      // Log activity for report fetching
      try {
        const { getDatabaseAdapter } = await import('../database/databaseAdapter.js');
        const db = getDatabaseAdapter();
        const desc = `Credit report fetched for client ${clientId || 'unknown'} on ${String(platform).toLowerCase()} (IP: ${req.ip})`;
        // Activities (MySQL schema)
        try {
          await db.executeQuery(
            `INSERT INTO activities (user_id, client_id, type, description, metadata) VALUES (?, ?, ?, ?, ?)`,
            [
              req.user.id,
              clientId ? Number(clientId) : null,
              'note_added',
              desc,
              JSON.stringify({ event: 'report_fetched', platform: String(platform).toLowerCase(), ip_address: req.ip, user_agent: req.get('User-Agent') || null })
            ]
          );
        } catch (e) {
          console.warn('Activities log insert failed (non-blocking):', e?.message || e);
        }
        // User activities (cross-db, includes IP)
        try {
          await db.executeQuery(
            `INSERT INTO user_activities (user_id, activity_type, resource_type, resource_id, description, ip_address, user_agent, session_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              req.user.id,
              'import',
              'credit_report',
              clientId ? Number(clientId) : null,
              desc,
              req.ip,
              req.get('User-Agent') || null,
              null
            ]
          );
        } catch (e2) {
          console.warn('User activities log insert failed (non-blocking):', e2?.message || e2);
        }
      } catch (logErr) {
        console.warn('Logging error (non-blocking):', logErr?.message || logErr);
      }
      // Notify admins about report fetch
      try {
        const db = getDatabaseAdapter();
        const admins = await db.allQuery(
          `SELECT id, email FROM users WHERE role = 'admin' AND (is_active = 1 OR status = 'active')`
        );
        const title = 'Credit Report Fetched';
        const actorEmail = (req.user && req.user.email) ? req.user.email : 'unknown';
        const msg = `Credit report fetched for client ${clientId || 'unknown'} on ${String(platform).toLowerCase()} by ${actorEmail} (IP: ${req.ip})`;
        for (const admin of admins || []) {
          await db.executeQuery(
            `INSERT INTO admin_notifications (
               recipient_id, sender_id, title, message, type, priority,
               action_url, action_text, expires_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              admin.id,
              req.user ? req.user.id : null,
              title,
              msg,
              'info',
              'low',
              '/admin/reports',
              'View Reports',
              null
            ]
          );
        }
      } catch (notifyErr) {
        console.warn('Admin notification for report fetch failed (non-blocking):', notifyErr?.message || notifyErr);
      }
      
      res.json({
        success: true,
        message: 'Credit report fetched successfully',
        data: result.data,
        reportPath: result.reportPath,
        screenshots: result.screenshots
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to fetch credit report',
        details: result.details
      });
    }
  } catch (error) {
    console.error('Error in fetch endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;
