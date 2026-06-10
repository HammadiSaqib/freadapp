import { Request, Response } from 'express';
import archiver from 'archiver';
import JSZip from 'jszip';
import puppeteer from 'puppeteer';
import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runQuery, getQuery, allQuery } from '../database/databaseAdapter.js';
import { AuthRequest } from '../middleware/securityMiddleware.js';
import { emailService } from '../services/emailService.js';
import {
  appendClientDocumentsToPdf,
  appendClientDocumentsToZip,
  CLIENT_DOCUMENTS_PAGE_RULE_VERSION,
  loadClientDocumentsForClient,
} from '../utils/disputeLetterClientDocuments.js';

const DISPUTE_LETTER_ZIP_CONTENTS_VERSION = Math.max(2, CLIENT_DOCUMENTS_PAGE_RULE_VERSION + 1);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a safe filename segment: trim, collapse whitespace to underscores, strip
 * anything that isn't alphanumeric, underscore, or hyphen.
 */
function safeName(value: unknown, maxLength = 80): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .substring(0, maxLength);
}

type DisputeLetterZipRequestLetter = {
  bureauKey?: string;
  bureauName?: string;
  categoryLabel?: string;
  contentType?: string;
  contentTypeLabel?: string;
  round?: number | string;
  itemLabels?: unknown[];
};

const BUREAU_FILE_LABELS: Record<string, string> = {
  experian: 'Experian',
  equifax: 'Equifax',
  transunion: 'TransUnion',
};

function formatDisputeLetterFileTimestamp(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  const seconds = String(value.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

function getDisputeLetterBureauFileLabel(letter: DisputeLetterZipRequestLetter, fallbackBureauName: string): string {
  const normalizedBureauKey = String(letter?.bureauKey || '').toLowerCase().replace(/[^a-z]/g, '');
  if (normalizedBureauKey && BUREAU_FILE_LABELS[normalizedBureauKey]) {
    return BUREAU_FILE_LABELS[normalizedBureauKey];
  }

  const fallback = String(fallbackBureauName || '').toLowerCase();
  if (fallback.includes('equifax')) return 'Equifax';
  if (fallback.includes('experian')) return 'Experian';
  if (fallback.includes('transunion') || fallback.includes('trans union')) return 'TransUnion';

  return safeName(fallbackBureauName || 'Unknown');
}

function buildDisputeLetterCategoryFileSegment(letter: DisputeLetterZipRequestLetter): string {
  return safeName(letter?.categoryLabel || 'Category', 180) || 'Category';
}

const DISPUTE_LETTER_CATEGORY_SORT_ORDER = [
  'personal-information',
  'public-record',
  'inquiries',
  'charge-off-collection',
  'late-payment',
  'student-loan',
];

function normalizeDisputeLetterCategorySortKey(value: unknown): string {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return '';
  if (text.includes('personal info') || text.includes('personal-information') || text.includes('personal information') || text.includes('identity')) return 'personal-information';
  if (text.includes('public')) return 'public-record';
  if (text.includes('student')) return 'student-loan';
  if (text.includes('inquir')) return 'inquiries';
  if (text.includes('charge') || text.includes('collect')) return 'charge-off-collection';
  if (text.includes('late') || text.includes('delinquen') || text.includes('past due')) return 'late-payment';
  return text;
}

function getDisputeLetterCategorySortRank(letter: DisputeLetterZipRequestLetter): number {
  const normalizedCategory = normalizeDisputeLetterCategorySortKey(letter?.categoryLabel);
  const categoryIndex = DISPUTE_LETTER_CATEGORY_SORT_ORDER.indexOf(normalizedCategory);
  return categoryIndex >= 0 ? categoryIndex : DISPUTE_LETTER_CATEGORY_SORT_ORDER.length;
}

function sortDisputeLettersForOutput<T extends DisputeLetterZipRequestLetter>(letters: T[]): T[] {
  return letters
    .map((letter, index) => ({ letter, index }))
    .sort((left, right) => {
      const rankDiff = getDisputeLetterCategorySortRank(left.letter) - getDisputeLetterCategorySortRank(right.letter);
      if (rankDiff !== 0) return rankDiff;
      return left.index - right.index;
    })
    .map(({ letter }) => letter);
}

function buildDisputeLetterPdfFileName(
  sequenceNumber: number,
  firstName: string,
  middleName: string,
  lastName: string,
  letter: DisputeLetterZipRequestLetter,
  fallbackBureauName: string,
  timestamp: string,
): string {
  const attackType = safeName(letter?.contentTypeLabel || letter?.contentType || 'Standard', 40) || 'Standard';
  const normalizedRound = Number(letter?.round);
  const roundSegment = Number.isFinite(normalizedRound) && normalizedRound > 0
    ? `Round_${normalizedRound}`
    : 'Round_Unknown';
  const bureauSegment = getDisputeLetterBureauFileLabel(letter, fallbackBureauName);
  const categorySegment = buildDisputeLetterCategoryFileSegment(letter);

  const fileNameParts = [
    String(Math.max(1, sequenceNumber || 1)),
    firstName || 'Client',
    middleName,
    lastName,
    attackType,
    roundSegment,
    bureauSegment,
    categorySegment,
    timestamp,
  ].filter(Boolean);

  return `${fileNameParts.join('_')}.pdf`;
}

/** Detect available client address columns */
let clientHasMiddleNameColumnPromise: Promise<boolean> | null = null;

async function getClientAddressExpression(alias = 'c'): Promise<string> {
  try {
    const cols = await allQuery(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients'
       AND COLUMN_NAME IN ('street_number_and_name', 'address')`,
      [],
    );
    const names = (cols as any[]).map((r: any) => r.COLUMN_NAME || r.column_name);
    if (names.includes('street_number_and_name') && names.includes('address')) {
      return `COALESCE(NULLIF(${alias}.street_number_and_name, ''), ${alias}.address)`;
    }
    if (names.includes('street_number_and_name')) return `${alias}.street_number_and_name`;
    return `${alias}.address`;
  } catch {
    return `${alias}.address`;
  }
}

async function getClientMiddleNameExpression(alias = 'c'): Promise<string> {
  if (!clientHasMiddleNameColumnPromise) {
    clientHasMiddleNameColumnPromise = (async () => {
      const cols = await allQuery(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients'
         AND COLUMN_NAME = 'middle_name'`,
        [],
      );
      return (cols as any[]).length > 0;
    })().catch((error) => {
      clientHasMiddleNameColumnPromise = null;
      console.warn('Failed to detect client middle_name column, omitting middle name from ZIP generation:', error);
      return false;
    });
  }

  return (await clientHasMiddleNameColumnPromise) ? `${alias}.middle_name` : `''`;
}

let disputeLetterZipHistoryColumnPromise: Promise<boolean> | null = null;
let disputeLetterZipSentToPrintingColumnPromise: Promise<boolean> | null = null;
let disputeLetterZipClientDocumentsVersionColumnPromise: Promise<boolean> | null = null;
let disputeLetterZipSenderColumnsPromise: Promise<boolean> | null = null;

async function hasDisputeLetterZipHistoryColumn(): Promise<boolean> {
  const columns = await allQuery(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'dispute_letter_zips'
       AND COLUMN_NAME = 'history_id'`,
    [],
  );

  return Array.isArray(columns) && columns.length > 0;
}

async function hasDisputeLetterZipSentToPrintingColumn(): Promise<boolean> {
  const columns = await allQuery(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'dispute_letter_zips'
       AND COLUMN_NAME = 'sent_to_printing_at'`,
    [],
  );

  return Array.isArray(columns) && columns.length > 0;
}

async function hasDisputeLetterZipClientDocumentsVersionColumn(): Promise<boolean> {
  const columns = await allQuery(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'dispute_letter_zips'
       AND COLUMN_NAME = 'client_documents_version'`,
    [],
  );

  return Array.isArray(columns) && columns.length > 0;
}

async function hasDisputeLetterZipSenderColumns(): Promise<boolean> {
  const columns = await allQuery(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'dispute_letter_zips'
       AND COLUMN_NAME IN ('sender_name', 'sender_email', 'sender_phone')`,
    [],
  );

  return Array.isArray(columns) && columns.length === 3;
}

async function ensureDisputeLetterZipHistoryColumn(): Promise<boolean> {
  if (!disputeLetterZipHistoryColumnPromise) {
    disputeLetterZipHistoryColumnPromise = (async () => {
      try {
        if (await hasDisputeLetterZipHistoryColumn()) {
          return true;
        }

        await runQuery(
          `ALTER TABLE dispute_letter_zips ADD COLUMN history_id INT NULL`,
          [],
        );

        try {
          await runQuery(
            `CREATE INDEX idx_dispute_letter_zips_history_id ON dispute_letter_zips (history_id)`,
            [],
          );
        } catch (indexError: any) {
          if (!/duplicate key name|already exists/i.test(String(indexError?.message || ''))) {
            console.warn('Failed to create history_id index on dispute_letter_zips:', indexError);
          }
        }

        return true;
      } catch (error: any) {
        if (/duplicate column name|already exists/i.test(String(error?.message || ''))) {
          return true;
        }

        disputeLetterZipHistoryColumnPromise = null;
        console.warn('Failed to ensure history_id column on dispute_letter_zips:', error);
        return false;
      }
    })();
  }

  return disputeLetterZipHistoryColumnPromise;
}

async function ensureDisputeLetterZipSentToPrintingColumn(): Promise<boolean> {
  if (!disputeLetterZipSentToPrintingColumnPromise) {
    disputeLetterZipSentToPrintingColumnPromise = (async () => {
      try {
        if (await hasDisputeLetterZipSentToPrintingColumn()) {
          return true;
        }

        await runQuery(
          `ALTER TABLE dispute_letter_zips ADD COLUMN sent_to_printing_at DATETIME NULL`,
          [],
        );

        try {
          await runQuery(
            `CREATE INDEX idx_dispute_letter_zips_sent_to_printing_at ON dispute_letter_zips (sent_to_printing_at)`,
            [],
          );
        } catch (indexError: any) {
          if (!/duplicate key name|already exists/i.test(String(indexError?.message || ''))) {
            console.warn('Failed to create sent_to_printing_at index on dispute_letter_zips:', indexError);
          }
        }

        return true;
      } catch (error: any) {
        if (/duplicate column name|already exists/i.test(String(error?.message || ''))) {
          return true;
        }

        disputeLetterZipSentToPrintingColumnPromise = null;
        console.warn('Failed to ensure sent_to_printing_at column on dispute_letter_zips:', error);
        return false;
      }
    })();
  }

  return disputeLetterZipSentToPrintingColumnPromise;
}

async function ensureDisputeLetterZipClientDocumentsVersionColumn(): Promise<boolean> {
  if (!disputeLetterZipClientDocumentsVersionColumnPromise) {
    disputeLetterZipClientDocumentsVersionColumnPromise = (async () => {
      try {
        if (await hasDisputeLetterZipClientDocumentsVersionColumn()) {
          return true;
        }

        await runQuery(
          `ALTER TABLE dispute_letter_zips ADD COLUMN client_documents_version INT NOT NULL DEFAULT 0`,
          [],
        );

        return true;
      } catch (error: any) {
        if (/duplicate column name|already exists/i.test(String(error?.message || ''))) {
          return true;
        }

        disputeLetterZipClientDocumentsVersionColumnPromise = null;
        console.warn('Failed to ensure client_documents_version column on dispute_letter_zips:', error);
        return false;
      }
    })();
  }

  return disputeLetterZipClientDocumentsVersionColumnPromise;
}

async function ensureDisputeLetterZipSenderColumns(): Promise<boolean> {
  if (!disputeLetterZipSenderColumnsPromise) {
    disputeLetterZipSenderColumnsPromise = (async () => {
      try {
        if (await hasDisputeLetterZipSenderColumns()) {
          return true;
        }

        const senderColumnDefinitions = [
          { name: 'sender_name', sql: `ALTER TABLE dispute_letter_zips ADD COLUMN sender_name VARCHAR(255) NULL` },
          { name: 'sender_email', sql: `ALTER TABLE dispute_letter_zips ADD COLUMN sender_email VARCHAR(255) NULL` },
          { name: 'sender_phone', sql: `ALTER TABLE dispute_letter_zips ADD COLUMN sender_phone VARCHAR(50) NULL` },
        ];

        for (const column of senderColumnDefinitions) {
          try {
            await runQuery(column.sql, []);
          } catch (columnError: any) {
            if (!/duplicate column name|already exists/i.test(String(columnError?.message || ''))) {
              throw columnError;
            }
          }
        }

        return await hasDisputeLetterZipSenderColumns();
      } catch (error: any) {
        disputeLetterZipSenderColumnsPromise = null;
        console.warn('Failed to ensure sender columns on dispute_letter_zips:', error);
        return false;
      }
    })();
  }

  return disputeLetterZipSenderColumnsPromise;
}

async function updateDisputeLetterZipFileRecord(
  zipId: number,
  fileName: string,
  filePath: string,
  zipContentsVersion: number,
) {
  const canStoreClientDocumentVersion = await ensureDisputeLetterZipClientDocumentsVersionColumn();

  if (canStoreClientDocumentVersion) {
    await runQuery(
      `UPDATE dispute_letter_zips
       SET status = 'completed', file_name = ?, file_path = ?, client_documents_version = ?
       WHERE id = ?`,
      [fileName, filePath, zipContentsVersion, zipId],
    );
    return;
  }

  await runQuery(
    `UPDATE dispute_letter_zips SET status = 'completed', file_name = ?, file_path = ? WHERE id = ?`,
    [fileName, filePath, zipId],
  );
}

async function markDisputeLetterZipClientDocumentsVersion(zipId: number, clientDocumentsVersion: number) {
  if (!zipId) return;

  const canStoreClientDocumentVersion = await ensureDisputeLetterZipClientDocumentsVersionColumn();
  if (!canStoreClientDocumentVersion) return;

  await runQuery(
    `UPDATE dispute_letter_zips
     SET client_documents_version = ?
     WHERE id = ?`,
    [clientDocumentsVersion, zipId],
  );
}

async function maybeRefreshSavedZipWithClientDocuments(zipRecord: any): Promise<Buffer | null> {
  const zipId = Number(zipRecord?.id || 0);
  const currentVersion = Number(zipRecord?.client_documents_version || 0);
  if (currentVersion >= DISPUTE_LETTER_ZIP_CONTENTS_VERSION) {
    return null;
  }

  const clientInfo = await loadZipManifestClientInfo(Number(zipRecord?.client_id || 0));
  if (!clientInfo) {
    return null;
  }

  const savedFilePath = String(zipRecord?.file_path || '');
  if (!savedFilePath || !fs.existsSync(savedFilePath)) {
    return null;
  }

  let refreshedZipBuffer = fs.readFileSync(savedFilePath);

  if (currentVersion < CLIENT_DOCUMENTS_PAGE_RULE_VERSION) {
    const clientDocuments = await loadClientDocumentsForClient(Number(zipRecord?.client_id || 0));
    if (clientDocuments.length > 0) {
      refreshedZipBuffer = await appendClientDocumentsToZip(refreshedZipBuffer, clientDocuments);
    }
  }

  refreshedZipBuffer = await upsertDisputeLetterManifestCsvInZip(refreshedZipBuffer, clientInfo);
  fs.writeFileSync(savedFilePath, refreshedZipBuffer);

  await markDisputeLetterZipClientDocumentsVersion(zipId, DISPUTE_LETTER_ZIP_CONTENTS_VERSION);
  zipRecord.client_documents_version = DISPUTE_LETTER_ZIP_CONTENTS_VERSION;

  return refreshedZipBuffer;
}

async function createDisputeLetterZipRecord(
  userId: number,
  clientId: number,
  letterCount: number,
  historyId: number | null,
) {
  const canStoreHistoryId = await ensureDisputeLetterZipHistoryColumn();

  if (canStoreHistoryId) {
    return runQuery(
      `INSERT INTO dispute_letter_zips (user_id, client_id, letter_count, status, history_id, created_at)
       VALUES (?, ?, ?, 'generating', ?, NOW())`,
      [userId, clientId, letterCount, historyId],
    );
  }

  return runQuery(
    `INSERT INTO dispute_letter_zips (user_id, client_id, letter_count, status, created_at)
     VALUES (?, ?, ?, 'generating', NOW())`,
    [userId, clientId, letterCount],
  );
}

async function maybeAttachHistoryToZip(zipId: number, historyId: number | null) {
  if (!zipId || !historyId) {
    return;
  }

  const canStoreHistoryId = await ensureDisputeLetterZipHistoryColumn();
  if (!canStoreHistoryId) {
    return;
  }

  await runQuery(
    `UPDATE dispute_letter_zips SET history_id = COALESCE(history_id, ?) WHERE id = ?`,
    [historyId, zipId],
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface LetterPdfData {
  clientName: string;
  clientAddress: string;
  clientCityStateZip: string;
  clientDob: string;
  clientSsnLast4: string;
  bureauName: string;
  bureauAddress: string;
  date: string;
  content: string;
  contentHtml?: string;
  skipHeader?: boolean;
}

// ─── PDF rendering (plain text fallback) ─────────────────────────────────────

function stripHtmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '  • ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function renderPlainTextPdfBuffer(data: LetterPdfData): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 54, size: 'LETTER' });
  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  stream.on('data', (chunk) => chunks.push(chunk as Buffer));
  const completion = new Promise<Buffer>((resolve, reject) => {
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
  doc.pipe(stream);

  const marginLeft = doc.page.margins.left;
  const pageWidth = doc.page.width;
  const textWidth = pageWidth - marginLeft - doc.page.margins.right;

  if (!data.skipHeader) {
    const headerY = doc.y;
    const colWidth = textWidth / 2;
    doc.font('Times-Bold').fontSize(12).text(data.clientName || '', marginLeft, headerY, { width: colWidth });
    doc.font('Times-Roman').fontSize(11);
    if (data.clientAddress) doc.text(data.clientAddress, marginLeft, doc.y, { width: colWidth });
    if (data.clientCityStateZip) doc.text(data.clientCityStateZip, marginLeft, doc.y, { width: colWidth });
    if (data.clientDob) doc.text(`Date of Birth: ${data.clientDob}`, marginLeft, doc.y, { width: colWidth });
    if (data.clientSsnLast4) doc.text(`SSN (Last 4): ${data.clientSsnLast4}`, marginLeft, doc.y, { width: colWidth });
    const leftEndY = doc.y;
    const rightX = marginLeft + colWidth;
    let ry = headerY;
    doc.font('Times-Bold').fontSize(12).text(data.bureauName || '', rightX, ry, { width: colWidth, align: 'right' });
    ry = doc.y;
    doc.font('Times-Roman').fontSize(11);
    for (const bLine of (data.bureauAddress || '').split('\n').filter(Boolean)) {
      doc.text(bLine.trim(), rightX, ry, { width: colWidth, align: 'right' }); ry = doc.y;
    }
    doc.text(`Date: ${data.date || ''}`, rightX, ry, { width: colWidth, align: 'right' }); ry = doc.y;
    doc.x = marginLeft;
    doc.y = Math.max(leftEndY, ry) + 24;
  }

  const rawContent = stripHtmlToPlainText(data.content || '');
  const paragraphs = rawContent.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  for (const para of paragraphs) {
    if (doc.y > doc.page.height - doc.page.margins.bottom - 80) doc.addPage();
    doc.font('Times-Roman').fontSize(11).text(para, marginLeft, doc.y, { width: textWidth, lineGap: 3 });
    doc.moveDown(0.5);
  }

  doc.end();
  return completion;
}

// ─── Rich HTML-based PDF rendering (matches inline preview) ──────────────────

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildLetterPdfDocumentHtml(data: LetterPdfData): string {
  const leftLines = [data.clientName, data.clientAddress, data.clientCityStateZip,
    data.clientDob ? `Date of Birth: ${data.clientDob}` : '',
    data.clientSsnLast4 ? `SSN (Last 4): ${data.clientSsnLast4}` : ''].filter(Boolean);
  const rightLines = [data.bureauName, ...String(data.bureauAddress || '').split('\n').map(l => l.trim()).filter(Boolean),
    data.date ? `Date: ${data.date}` : ''].filter(Boolean);

  const bodyHtml = (data.contentHtml || '').trim()
    ? data.contentHtml!
    : `<p>${escapeHtml(stripHtmlToPlainText(data.content || '')).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br />')}</p>`;

  const headerHtml = data.skipHeader ? '' : `<section class="letter-header">
    <div class="letter-header__column">${leftLines.map((l, i) => i === 0 ? `<div class="letter-header__name">${escapeHtml(l)}</div>` : `<div>${escapeHtml(l)}</div>`).join('')}</div>
    <div class="letter-header__column letter-header__column--right">${rightLines.map((l, i) => i === 0 ? `<div class="letter-header__name">${escapeHtml(l)}</div>` : `<div>${escapeHtml(l)}</div>`).join('')}</div>
  </section>`;

  return `<!doctype html><html><head><meta charset="utf-8" /><style>
@page { size: Letter; margin: 0.75in; }
html, body { margin: 0; padding: 0; background: #ffffff; }
body { color: #111827; font-family: "Times New Roman", Times, serif; font-size: 12pt; line-height: 1.55; }
* { box-sizing: border-box; }
.letter-header { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); column-gap: 0.5in; align-items: start; }
.letter-header__column { white-space: pre-line; }
.letter-header__column--right { text-align: right; }
.letter-header__name { font-size: 12pt; font-weight: 700; }
.letter-body { margin-top: ${data.skipHeader ? '0' : '24px'}; }
.letter-body .flat-letter-segment { display: block; margin: 0 0 0.85em; }
.letter-body .flat-letter-segment:last-child { margin-bottom: 0; }
.letter-body p, .letter-body ul, .letter-body ol, .letter-body blockquote, .letter-body table { margin: 0 0 0.65em; }
.letter-body h1, .letter-body h2, .letter-body h3, .letter-body h4, .letter-body h5, .letter-body h6 { margin: 0 0 0.45em; font-weight: 700; line-height: 1.25; }
.letter-body ul, .letter-body ol { padding-left: 1.4em; }
.letter-body li { margin-bottom: 0.25em; }
.letter-body .letter-block-spacer { height: 0.6em; }
</style></head><body>${headerHtml}<main class="letter-body">${bodyHtml}</main></body></html>`;
}

async function renderRichPdfBuffer(data: LetterPdfData): Promise<Buffer> {
  const fullHtml = buildLetterPdfDocumentHtml(data);
  try {
    const execPath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_BIN || undefined;
    const timeoutMs = 15000;
    const launchPromise = puppeteer.launch({
      headless: true,
      executablePath: execPath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      timeout: timeoutMs,
    });
    const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Puppeteer launch timed out')), timeoutMs));
    const browser = await Promise.race([launchPromise, timeoutPromise]);
    try {
      const page = await browser.newPage();
      await page.setContent(fullHtml, { waitUntil: 'load', timeout: 10000 });
      await page.emulateMediaType('screen');
      const pdfBuffer = await page.pdf({
        format: 'Letter',
        printBackground: true,
        margin: { top: '0.75in', right: '0.75in', bottom: '0.75in', left: '0.75in' },
      });
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('Rich PDF rendering failed, falling back to plain text PDF:', error);
    return renderPlainTextPdfBuffer(data);
  }
}

// ─── Bureau config ───────────────────────────────────────────────────────────

const BUREAU_CONFIG: Record<string, { name: string; address: string }> = {
  experian: { name: 'Experian', address: 'Experian\nPO BOX 4500\nALLEN, TX 75013' },
  equifax: { name: 'Equifax Information Services LLC', address: 'Equifax Information Services LLC\nP.O. Box 740256\nATLANTA, GA 30374' },
  transunion: { name: 'TransUnion LLC', address: 'TransUnion LLC\nConsumer Dispute Center\nP.O. Box 2000\nCHESTER, PA 19016' },
};

type ZipManifestClientInfo = {
  clientName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};

type ZipManifestRow = ZipManifestClientInfo & {
  fileName: string;
  recName: string;
  recAddress: string;
  recCityStateZip: string;
};

function normalizeZipManifestValue(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function quoteZipManifestValue(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function buildZipManifestClientInfo(client: any): ZipManifestClientInfo {
  return {
    clientName: [client?.first_name, client?.middle_name, client?.last_name].filter(Boolean).join(' ').trim(),
    address: normalizeZipManifestValue(client?.address || ''),
    city: normalizeZipManifestValue(client?.city || ''),
    state: normalizeZipManifestValue(client?.state || ''),
    zip: normalizeZipManifestValue(client?.zip_code || ''),
  };
}

async function loadZipManifestClientInfo(clientId: number): Promise<ZipManifestClientInfo | null> {
  if (!Number.isFinite(clientId) || clientId <= 0) {
    return null;
  }

  const addrExpr = await getClientAddressExpression('c');
  const middleNameExpr = await getClientMiddleNameExpression('c');
  const client = await getQuery(
    `SELECT c.first_name, ${middleNameExpr} as middle_name, c.last_name,
            ${addrExpr} as address, c.city, c.state, c.zip_code
     FROM clients c WHERE c.id = ?`,
    [clientId],
  );

  if (!client) {
    return null;
  }

  return buildZipManifestClientInfo(client);
}

function buildZipManifestFileName(clientFullName: string): string {
  const normalizedName = normalizeZipManifestValue(clientFullName)
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .trim();

  return `${normalizedName || 'Client'}.csv`;
}

function getZipManifestRecipientFields(bureauName: string, bureauAddress: string) {
  const recName = normalizeZipManifestValue(bureauName);
  const addressLines = String(bureauAddress || '')
    .split('\n')
    .map((line) => normalizeZipManifestValue(line))
    .filter(Boolean);
  const dedupedAddressLines =
    addressLines.length > 0 && recName && addressLines[0].toLowerCase() === recName.toLowerCase()
      ? addressLines.slice(1)
      : addressLines;

  return {
    recName,
    recAddress: dedupedAddressLines.slice(0, -1).join(' ').trim(),
    recCityStateZip: dedupedAddressLines.length > 0 ? dedupedAddressLines[dedupedAddressLines.length - 1] : '',
  };
}

function buildZipManifestRow(
  clientInfo: ZipManifestClientInfo,
  pdfFileName: string,
  bureauName: string,
  bureauAddress: string,
): ZipManifestRow {
  const recipientFields = getZipManifestRecipientFields(bureauName, bureauAddress);

  return {
    ...clientInfo,
    fileName: String(pdfFileName || '').replace(/\.pdf$/i, ''),
    ...recipientFields,
  };
}

function buildZipManifestCsv(rows: ZipManifestRow[]): string {
  const header = 'ClientName,Address,City,State,Zip,FileName,RecName,RecAddress,"RecCity / RecState / RecZip"';
  const csvRows = rows.map((row) => [
    quoteZipManifestValue(row.clientName),
    quoteZipManifestValue(row.address),
    quoteZipManifestValue(row.city),
    normalizeZipManifestValue(row.state),
    normalizeZipManifestValue(row.zip),
    quoteZipManifestValue(row.fileName),
    quoteZipManifestValue(row.recName),
    quoteZipManifestValue(row.recAddress),
    quoteZipManifestValue(row.recCityStateZip),
  ].join(','));

  return [header, ...csvRows].join('\n');
}

function inferBureauKeyFromZipPdfName(fileName: string): string | null {
  const normalized = String(fileName || '').toLowerCase().replace(/[^a-z]/g, '');

  if (normalized.includes('experian') || normalized.includes('exper')) return 'experian';
  if (normalized.includes('equifax') || normalized.includes('equif')) return 'equifax';
  if (normalized.includes('transunion') || normalized.includes('trans')) return 'transunion';

  return null;
}

async function upsertDisputeLetterManifestCsvInZip(
  zipBuffer: Buffer,
  clientInfo: ZipManifestClientInfo,
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(zipBuffer);
  const pdfEntries = Object.values(zip.files).filter(
    (entry) => !entry.dir && path.extname(entry.name).toLowerCase() === '.pdf',
  );

  if (!pdfEntries.length) {
    return zipBuffer;
  }

  const rows = pdfEntries.map((entry) => {
    const bureauKey = inferBureauKeyFromZipPdfName(path.basename(entry.name));
    const bureauConfig = bureauKey ? BUREAU_CONFIG[bureauKey] : null;

    return buildZipManifestRow(
      clientInfo,
      path.basename(entry.name),
      bureauConfig?.name || '',
      bureauConfig?.address || '',
    );
  });

  zip.file(buildZipManifestFileName(clientInfo.clientName), buildZipManifestCsv(rows));

  return Buffer.from(
    await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    }),
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/dispute-letters/generate-zip
// Generates a ZIP containing all dispute letter PDFs for the given outputs
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateDisputeLetterZip(req: AuthRequest, res: Response) {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { clientId, letters, historyId, persistOnly } = req.body;
    const shouldPersistOnly = persistOnly === true;
    const normalizedHistoryId = Number(historyId);
    const linkedHistoryId = Number.isFinite(normalizedHistoryId) && normalizedHistoryId > 0
      ? normalizedHistoryId
      : null;

    if (!clientId) {
      res.status(400).json({ error: 'clientId is required' });
      return;
    }
    if (!Array.isArray(letters) || letters.length === 0) {
      res.status(400).json({ error: 'letters array is required and must not be empty' });
      return;
    }

    // Fetch client record
    const addrExpr = await getClientAddressExpression('c');
    const middleNameExpr = await getClientMiddleNameExpression('c');
    const client = await getQuery(
      `SELECT c.id, c.first_name, ${middleNameExpr} as middle_name, c.last_name, c.email, c.phone,
              ${addrExpr} as address, c.city, c.state, c.zip_code,
              c.date_of_birth, c.ssn_last_four
       FROM clients c WHERE c.id = ?`,
      [clientId],
    );

    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    const firstName = safeName((client as any).first_name);
    const middleName = safeName((client as any).middle_name || '');
    const lastName = safeName((client as any).last_name);
    const clientIdStr = String(clientId);

    // Insert a zip record into DB to get an ID
    const zipResult = await createDisputeLetterZipRecord(
      userId,
      Number(clientId),
      letters.length,
      linkedHistoryId,
    );
    const zipId = (zipResult as any).insertId || (zipResult as any).lastID || 0;

    // Build ZIP filename
    const middlePart = middleName ? `_${middleName}` : '';
    const zipFileName = `letter_${clientIdStr}_${firstName}${middlePart}_${lastName}_${zipId}.zip`;

    // Build client info for PDF headers
    const clientName = [(client as any).first_name, (client as any).middle_name, (client as any).last_name].filter(Boolean).join(' ').trim();
    const clientAddress = String((client as any).address || '').trim();
    const clientCityStateZip = [(client as any).city, (client as any).state, (client as any).zip_code].filter(Boolean).join(', ').trim();
    const clientDob = String((client as any).date_of_birth || (client as any).dob || '');
    const clientSsnLast4 = String((client as any).ssn_last_four || '');
    const generationDate = new Date();
    const todayDate = generationDate.toLocaleDateString('en-US');
    const generationTimestamp = formatDisputeLetterFileTimestamp(generationDate);
    const clientManifestInfo = buildZipManifestClientInfo(client);
    const clientDocuments = await loadClientDocumentsForClient(Number(clientId));
    const zipContentsVersion = DISPUTE_LETTER_ZIP_CONTENTS_VERSION;
    const manifestRows: ZipManifestRow[] = [];

    // Create archive into memory buffer (so we can save to disk + stream to response)
    const archive = archiver('zip', { zlib: { level: 6 } });
    const zipStream = new PassThrough();
    const zipChunks: Buffer[] = [];
    zipStream.on('data', (chunk) => zipChunks.push(chunk as Buffer));
    const zipCompletion = new Promise<Buffer>((resolve, reject) => {
      zipStream.on('end', () => resolve(Buffer.concat(zipChunks)));
      zipStream.on('error', reject);
    });
    archive.on('error', (err) => {
      console.error('Archive error:', err);
    });
    archive.pipe(zipStream);

    const orderedLetters = sortDisputeLettersForOutput(letters as DisputeLetterZipRequestLetter[]);

    // Generate each PDF and add to archive
    for (let i = 0; i < orderedLetters.length; i++) {
      const letter = (orderedLetters[i] || {}) as DisputeLetterZipRequestLetter & Record<string, any>;
      const bureauKey = String(letter.bureauKey || '').toLowerCase().replace(/[^a-z]/g, '');
      const bureauName = letter.bureauName || BUREAU_CONFIG[bureauKey]?.name || 'Unknown';
      const bureauAddress = BUREAU_CONFIG[bureauKey]?.address || '';

      // Build PDF data
      const hasRichHtml = !!(letter.letterContentHtml || '').trim();
      const pdfData: LetterPdfData = {
        clientName,
        clientAddress,
        clientCityStateZip,
        clientDob,
        clientSsnLast4,
        bureauName,
        bureauAddress,
        date: todayDate,
        content: letter.letterContent || '',
        contentHtml: letter.letterContentHtml || '',
        skipHeader: hasRichHtml, // contentHtml already contains the header
      };

      let pdfBuffer: Buffer;
      try {
        pdfBuffer = await renderRichPdfBuffer(pdfData);
        if (clientDocuments.length > 0) {
          pdfBuffer = await appendClientDocumentsToPdf(pdfBuffer, clientDocuments);
        }
      } catch (err) {
        console.error(`Failed to render PDF for letter ${i}:`, err);
        continue;
      }

      // Build PDF filename
      const pdfFileName = buildDisputeLetterPdfFileName(
        i + 1,
        firstName,
        middleName,
        lastName,
        letter,
        bureauName,
        generationTimestamp,
      );

      archive.append(pdfBuffer, { name: pdfFileName });
      manifestRows.push(buildZipManifestRow(clientManifestInfo, pdfFileName, bureauName, bureauAddress));
    }

    archive.append(buildZipManifestCsv(manifestRows), {
      name: buildZipManifestFileName(clientManifestInfo.clientName),
    });

    await archive.finalize();
    const zipBuffer = await zipCompletion;

    // Save ZIP to disk for public download later
    let savedFilePath = '';
    try {
      const __filename2 = fileURLToPath(import.meta.url);
      const __dirname2 = path.dirname(__filename2);
      const uploadsDir = path.resolve(__dirname2, '../../uploads/dispute-zips');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      savedFilePath = path.join(uploadsDir, zipFileName);
      fs.writeFileSync(savedFilePath, zipBuffer);
    } catch (saveErr) {
      console.error('Failed to save ZIP to disk:', saveErr);
    }

    // Update zip record status
    try {
      await updateDisputeLetterZipFileRecord(zipId, zipFileName, savedFilePath, zipContentsVersion);
    } catch (updateErr) {
      console.error('Failed to update zip record:', updateErr);
    }

    if (shouldPersistOnly) {
      res.json({
        success: true,
        zipId,
        fileName: zipFileName,
      });
      return;
    }

    // Send ZIP to client
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
    res.setHeader('X-Zip-Id', String(zipId));
    res.setHeader('X-Zip-Filename', zipFileName);
    res.setHeader('Content-Length', zipBuffer.length);
    res.end(zipBuffer);
  } catch (error: any) {
    console.error('Error generating dispute letter ZIP:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate ZIP file' });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/dispute-letters/send-for-printing
// Sends a beautiful email to sales@totalpostnprint.com with letter details
// ═══════════════════════════════════════════════════════════════════════════════

export async function sendForPrinting(req: AuthRequest, res: Response) {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { clientId, letters, zipId, historyId } = req.body;
    const normalizedZipId = Number(zipId);
    const requestedZipId = Number.isFinite(normalizedZipId) && normalizedZipId > 0
      ? normalizedZipId
      : null;
    const normalizedHistoryId = Number(historyId);
    const linkedHistoryId = Number.isFinite(normalizedHistoryId) && normalizedHistoryId > 0
      ? normalizedHistoryId
      : null;
    const providedLetters = Array.isArray(letters) ? letters : [];
    const senderName = String(req.body?.senderName || '').trim();
    const senderEmail = String(req.body?.senderEmail || '').trim();
    const senderPhone = String(req.body?.senderPhone || '').trim();
    const senderNote = String(req.body?.senderNote || '').trim();

    if (!clientId) {
      res.status(400).json({ error: 'clientId is required' });
      return;
    }

    if (!senderName || !senderEmail || !senderPhone) {
      res.status(400).json({ error: 'senderName, senderEmail, and senderPhone are required' });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
      res.status(400).json({ error: 'senderEmail must be a valid email address' });
      return;
    }

    let existingZipRecord: any = null;
    let reusingSavedZip = false;
    if (requestedZipId) {
      existingZipRecord = await getQuery(
        `SELECT * FROM dispute_letter_zips WHERE id = ? AND client_id = ?`,
        [requestedZipId, clientId],
      );

      const existingFilePath = String(existingZipRecord?.file_path || '');
      reusingSavedZip = Boolean(existingZipRecord && existingFilePath && fs.existsSync(existingFilePath));
    }

    if (!reusingSavedZip && providedLetters.length === 0) {
      res.status(400).json({ error: 'letters array is required when no saved ZIP is available' });
      return;
    }

    // Fetch admin/sender info
    const admin = await getQuery(
      `SELECT id, first_name, last_name, email, phone FROM users WHERE id = ?`,
      [userId],
    );
    if (!admin) {
      res.status(404).json({ error: 'Admin user not found' });
      return;
    }

    // Fetch client info
    const addrExpr = await getClientAddressExpression('c');
    const middleNameExpr = await getClientMiddleNameExpression('c');
    const client = await getQuery(
      `SELECT c.id, c.first_name, ${middleNameExpr} as middle_name, c.last_name, c.email, c.phone,
              ${addrExpr} as address, c.city, c.state, c.zip_code,
              c.date_of_birth, c.ssn_last_four
       FROM clients c WHERE c.id = ?`,
      [clientId],
    );
    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    const clientFirstName = (client as any).first_name || '';
    const clientMiddleName = (client as any).middle_name || '';
    const clientLastName = (client as any).last_name || '';
    const clientEmail = (client as any).email || '';
    const clientFullName = [clientFirstName, clientMiddleName, clientLastName].filter(Boolean).join(' ');
    const safeSenderName = escapeHtml(senderName);
    const safeSenderEmail = escapeHtml(senderEmail);
    const safeSenderPhone = escapeHtml(senderPhone);
    const safeSenderNote = senderNote ? escapeHtml(senderNote).replace(/\r?\n/g, '<br />') : '';

    const clientIdStr = String(clientId);
    const firstName = safeName(clientFirstName);
    const middleName = safeName(clientMiddleName);
    const lastName = safeName(clientLastName);
    const middlePart = middleName ? `_${middleName}` : '';

    let actualZipId = reusingSavedZip ? Number(existingZipRecord?.id || 0) : 0;
    if (!reusingSavedZip) {
      try {
        const zipResult = await createDisputeLetterZipRecord(
          userId,
          Number(clientId),
          providedLetters.length,
          linkedHistoryId,
        );
        actualZipId = (zipResult as any).insertId || (zipResult as any).lastID || 0;
      } catch (dbErr) {
        console.error('Failed to create zip record for print request:', dbErr);
        actualZipId = 0;
      }
    } else {
      await maybeAttachHistoryToZip(actualZipId, linkedHistoryId);
    }

    const zipIdStr = String(actualZipId || requestedZipId || 0);
    const zipFileName = reusingSavedZip
      ? String(existingZipRecord?.file_name || `dispute_letters_${zipIdStr}.zip`)
      : `letter_${clientIdStr}_${firstName}${middlePart}_${lastName}_${zipIdStr}.zip`;

    // Build download URL – always use the admin subdomain so the link works
    const baseUrl = 'https://admin.thescoremachine.com';
    const downloadUrl = `${baseUrl}/api/dispute-letters/download-zip/${zipIdStr}`;

    // Build bureau summary
    const bureauSet = new Set(providedLetters.map((l: any) => l.bureauName || 'Unknown'));
    const bureauList = reusingSavedZip ? 'Saved ZIP file' : Array.from(bureauSet).join(', ');
    const bureauCount = reusingSavedZip ? 1 : bureauSet.size;
    const letterCount = reusingSavedZip
      ? Number(existingZipRecord?.letter_count || 0) || providedLetters.length
      : providedLetters.length;

    // Build beautiful email HTML (table-based for email client compatibility)
    const emailHtml = `
    <!DOCTYPE html>
    <html lang="en" xmlns="http://www.w3.org/1999/xhtml">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />
      <title>Print Request - Fread App Elite</title>
      <!--[if mso]>
      <style type="text/css">
        table { border-collapse: collapse; }
        td { font-family: Arial, sans-serif; }
      </style>
      <![endif]-->
    </head>
    <body style="margin:0;padding:0;background-color:#f0f4ff;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
      <!-- Wrapper -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f4ff;">
        <tr>
          <td align="center" style="padding:40px 20px;">
            <!-- Container -->
            <table role="presentation" width="680" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td align="center" style="background:linear-gradient(135deg,#0ea5e9 0%,#0284c7 40%,#0369a1 100%);background-color:#0284c7;padding:40px 40px 32px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" valign="middle" style="padding-right:16px;">
                        <img src="cid:company-logo" alt="Fread App Elite" width="60" height="60" style="display:block;width:60px;height:60px;border-radius:12px;background-color:#ffffff;object-fit:contain;" />
                      </td>
                      <td align="left" valign="middle">
                        <div style="color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;line-height:1.2;">Fread App Elite</div>
                        <div style="color:rgba(255,255,255,0.85);font-size:13px;font-weight:400;margin-top:4px;">Professional Credit Management Platform</div>
                      </td>
                    </tr>
                  </table>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;">
                    <tr>
                      <td style="background-color:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.3);color:#ffffff;padding:8px 20px;border-radius:50px;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">
                        &#128424; PRINT REQUEST
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:40px;">
                  <!-- Greeting -->
                  <div style="font-size:22px;font-weight:700;color:#0c4a6e;margin-bottom:8px;">New Print Request</div>
                  <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 32px 0;">
                    A credit repair professional has submitted dispute letters for printing and mailing.
                    Please find the details and download link below.
                  </p>

                  <!-- Stats Row -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
                    <tr>
                      <td width="50%" style="padding-right:8px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f9ff;border:1px solid #bae6fd;border-radius:14px;">
                          <tr>
                            <td align="center" style="padding:20px;">
                              <div style="font-size:28px;font-weight:800;color:#0284c7;line-height:1;">${letterCount}</div>
                              <div style="font-size:12px;font-weight:500;color:#64748b;margin-top:6px;">Letters</div>
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td width="50%" style="padding-left:8px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f9ff;border:1px solid #bae6fd;border-radius:14px;">
                          <tr>
                            <td align="center" style="padding:20px;">
                              <div style="font-size:28px;font-weight:800;color:#0284c7;line-height:1;">${bureauCount}</div>
                              <div style="font-size:12px;font-weight:500;color:#64748b;margin-top:6px;">Bureaus</div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Sender Information -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:24px;">
                    <tr>
                      <td style="padding:24px 28px;">
                        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#0284c7;margin-bottom:16px;border-left:4px solid #0284c7;padding-left:10px;">Sender Information</div>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td width="50%" valign="top" style="padding:0 8px 14px 0;">
                              <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Full Name</div>
                              <div style="font-size:15px;font-weight:500;color:#1e293b;">${safeSenderName}</div>
                            </td>
                            <td width="50%" valign="top" style="padding:0 0 14px 8px;">
                              <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Email</div>
                              <div style="font-size:15px;font-weight:500;color:#1e293b;word-break:break-all;">${safeSenderEmail}</div>
                            </td>
                          </tr>
                          <tr>
                            <td width="50%" valign="top" style="padding:0 8px 0 0;">
                              <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Phone</div>
                              <div style="font-size:15px;font-weight:500;color:#1e293b;">${safeSenderPhone}</div>
                            </td>
                            <td width="50%" valign="top" style="padding:0 0 0 8px;">
                              <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Bureaus</div>
                              <div style="font-size:15px;font-weight:500;color:#1e293b;">${bureauList}</div>
                            </td>
                          </tr>
                          ${safeSenderNote ? `
                          <tr>
                            <td colspan="2" valign="top" style="padding:14px 0 0 0;">
                              <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Note</div>
                              <div style="font-size:15px;font-weight:500;color:#1e293b;line-height:1.6;">${safeSenderNote}</div>
                            </td>
                          </tr>` : ''}
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Client Information -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:24px;">
                    <tr>
                      <td style="padding:24px 28px;">
                        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#0284c7;margin-bottom:16px;border-left:4px solid #0284c7;padding-left:10px;">Client Information</div>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td width="50%" valign="top" style="padding:0 8px 14px 0;">
                              <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Full Name</div>
                              <div style="font-size:15px;font-weight:500;color:#1e293b;">${clientFullName || 'N/A'}</div>
                            </td>
                            <td width="50%" valign="top" style="padding:0 0 14px 8px;">
                              <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Client ID</div>
                              <div style="font-size:15px;font-weight:500;color:#1e293b;">#${clientIdStr}</div>
                            </td>
                          </tr>
                          <tr>
                            <td width="50%" valign="top" style="padding:0 8px 0 0;">
                              <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Email</div>
                              <div style="font-size:15px;font-weight:500;color:#1e293b;word-break:break-all;">${clientEmail || 'N/A'}</div>
                            </td>
                            <td width="50%" valign="top" style="padding:0 0 0 8px;">
                              <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Phone</div>
                              <div style="font-size:15px;font-weight:500;color:#1e293b;">${(client as any).phone || 'N/A'}</div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Download Section -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#0ea5e9 0%,#0284c7 100%);background-color:#0284c7;border-radius:12px;margin-bottom:24px;">
                    <tr>
                      <td align="center" style="padding:28px;">
                        <div style="color:#ffffff;font-size:16px;font-weight:700;margin-bottom:8px;">Download Dispute Letters</div>
                        <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-bottom:20px;">${letterCount} PDF${letterCount > 1 ? 's' : ''} packaged in a single ZIP file</div>
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td align="center" style="background-color:#ffffff;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                              <a href="https://printing-team.thescoremachine.com/dispute-letter" target="_blank" style="display:inline-block;color:#0284c7;text-decoration:none;padding:14px 28px;font-weight:700;font-size:15px;font-family:Arial,sans-serif;">&#128424; Printing Team Portal</a>
                            </td>
                            <td width="16"></td>
                            <td align="center" style="background-color:#ffffff;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                              <a href="${downloadUrl}" target="_blank" style="display:inline-block;color:#0284c7;text-decoration:none;padding:14px 28px;font-weight:700;font-size:15px;font-family:Arial,sans-serif;">&#11015; Download ZIP File</a>
                            </td>
                          </tr>
                        </table>
                        <div style="color:rgba(255,255,255,0.7);font-size:11px;margin-top:12px;font-family:monospace;word-break:break-all;">${zipFileName}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td align="center" style="background-color:#f8fafc;padding:32px 40px;border-top:1px solid #e2e8f0;">
                  <div style="font-size:16px;font-weight:700;color:#0c4a6e;margin-bottom:4px;">Fread App Elite</div>
                  <div style="font-size:13px;color:#64748b;margin-bottom:16px;">Professional Credit Management Platform</div>
                  <div style="font-size:12px;color:#94a3b8;">&copy; ${new Date().getFullYear()} Fread App Elite. All rights reserved.</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    let zipBuffer: Buffer;
    let savedFilePath = reusingSavedZip ? String(existingZipRecord?.file_path || '') : '';

    if (reusingSavedZip) {
      try {
        const refreshedZipBuffer = await maybeRefreshSavedZipWithClientDocuments(existingZipRecord);
        zipBuffer = refreshedZipBuffer || fs.readFileSync(savedFilePath);
      } catch (readErr) {
        console.error('Failed to read saved ZIP for print request:', readErr);
        res.status(404).json({ error: 'Saved ZIP file not found on server. Please regenerate from the application.' });
        return;
      }
    } else {
      const clientManifestInfo = buildZipManifestClientInfo(client);
      const clientDocuments = await loadClientDocumentsForClient(Number(clientId));
      const zipContentsVersion = DISPUTE_LETTER_ZIP_CONTENTS_VERSION;
      const manifestRows: ZipManifestRow[] = [];
      const zipChunks: Buffer[] = [];
      const zipArchive = archiver('zip', { zlib: { level: 6 } });
      const zipStream = new PassThrough();
      zipStream.on('data', (chunk) => zipChunks.push(chunk as Buffer));
      const zipCompletion = new Promise<Buffer>((resolve, reject) => {
        zipStream.on('end', () => resolve(Buffer.concat(zipChunks)));
        zipStream.on('error', reject);
      });
      zipArchive.pipe(zipStream);

      const generationDate = new Date();
      const generationDateLabel = generationDate.toLocaleDateString('en-US');
      const generationTimestamp = formatDisputeLetterFileTimestamp(generationDate);
      const orderedLetters = sortDisputeLettersForOutput(providedLetters as DisputeLetterZipRequestLetter[]);

      for (let i = 0; i < orderedLetters.length; i++) {
        const letter = (orderedLetters[i] || {}) as DisputeLetterZipRequestLetter & Record<string, any>;
        const bureauKey = String(letter.bureauKey || '').toLowerCase().replace(/[^a-z]/g, '');
        const bureauName = letter.bureauName || BUREAU_CONFIG[bureauKey]?.name || 'Unknown';
        const bureauAddress = BUREAU_CONFIG[bureauKey]?.address || '';

        const hasRichHtml = !!(letter.letterContentHtml || '').trim();
        const pdfData: LetterPdfData = {
          clientName: [clientFirstName, clientMiddleName, clientLastName].filter(Boolean).join(' '),
          clientAddress: String((client as any).address || '').trim(),
          clientCityStateZip: [(client as any).city, (client as any).state, (client as any).zip_code].filter(Boolean).join(', '),
          clientDob: String((client as any).date_of_birth || ''),
          clientSsnLast4: String((client as any).ssn_last_four || ''),
          bureauName,
          bureauAddress,
          date: generationDateLabel,
          content: letter.letterContent || '',
          contentHtml: letter.letterContentHtml || '',
          skipHeader: hasRichHtml,
        };

        try {
          let pdfBuf = await renderRichPdfBuffer(pdfData);
          if (clientDocuments.length > 0) {
            pdfBuf = await appendClientDocumentsToPdf(pdfBuf, clientDocuments);
          }
          const pdfFileName = buildDisputeLetterPdfFileName(
            i + 1,
            firstName,
            middleName,
            lastName,
            letter,
            bureauName,
            generationTimestamp,
          );
          zipArchive.append(pdfBuf, { name: pdfFileName });
          manifestRows.push(buildZipManifestRow(clientManifestInfo, pdfFileName, bureauName, bureauAddress));
        } catch (err) {
          console.error(`Failed to render PDF for email attachment letter ${i}:`, err);
        }
      }

      zipArchive.append(buildZipManifestCsv(manifestRows), {
        name: buildZipManifestFileName(clientManifestInfo.clientName),
      });

      await zipArchive.finalize();
      zipBuffer = await zipCompletion;

      try {
        const __filenameZip = fileURLToPath(import.meta.url);
        const __dirnameZip = path.dirname(__filenameZip);
        const uploadsDir = path.resolve(__dirnameZip, '../../uploads/dispute-zips');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        savedFilePath = path.join(uploadsDir, zipFileName);
        fs.writeFileSync(savedFilePath, zipBuffer);
      } catch (saveErr) {
        console.error('Failed to save ZIP to disk for print request:', saveErr);
      }

      if (actualZipId > 0) {
        try {
          await updateDisputeLetterZipFileRecord(actualZipId, zipFileName, savedFilePath, zipContentsVersion);
          await maybeAttachHistoryToZip(actualZipId, linkedHistoryId);
        } catch (updateErr) {
          console.error('Failed to update zip record:', updateErr);
        }
      }
    }

    // Read logo for inline CID attachment
    let logoBuffer: Buffer | null = null;
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const logoPath = path.resolve(__dirname, '../../public/image.png');
      if (fs.existsSync(logoPath)) {
        logoBuffer = fs.readFileSync(logoPath);
      }
    } catch (logoErr) {
      console.warn('Could not read logo file for email:', logoErr);
    }

    // Send email
    const emailAttachments: Array<{ filename: string; content: Buffer; contentType: string; cid?: string }> = [
      {
        filename: zipFileName,
        content: zipBuffer,
        contentType: 'application/zip',
      },
    ];
    if (logoBuffer) {
      emailAttachments.push({
        filename: 'logo.png',
        content: logoBuffer,
        contentType: 'image/png',
        cid: 'company-logo',
      });
    }

    const emailSent = await emailService.sendEmail({
      to: 'sales@totalpostnprint.com',
      subject: `Print Request — ${clientFullName} — ${letterCount} Dispute Letter${letterCount > 1 ? 's' : ''} | Fread App Elite`,
      html: emailHtml,
      attachments: emailAttachments,
    });

    if (emailSent) {
      const sentToPrintingAt = new Date().toISOString();
      if (actualZipId > 0) {
        try {
          const canStoreSentToPrintingAt = await ensureDisputeLetterZipSentToPrintingColumn();
          const canStoreSenderFields = await ensureDisputeLetterZipSenderColumns();
          const updateClauses: string[] = [];
          const updateParams: Array<string | number | null> = [];

          if (canStoreSentToPrintingAt) {
            updateClauses.push(`sent_to_printing_at = COALESCE(sent_to_printing_at, NOW())`);
          }

          updateClauses.push(`print_note = ?`);
          updateParams.push(senderNote || null);

          if (canStoreSenderFields) {
            updateClauses.push(`sender_name = ?`);
            updateClauses.push(`sender_email = ?`);
            updateClauses.push(`sender_phone = ?`);
            updateParams.push(senderName, senderEmail, senderPhone);
          }

          if (updateClauses.length > 0) {
            await runQuery(
              `UPDATE dispute_letter_zips
               SET ${updateClauses.join(', ')}
               WHERE id = ?`,
              [...updateParams, actualZipId],
            );
          }
        } catch (sentUpdateErr) {
          console.error('Failed to mark ZIP as sent to printing:', sentUpdateErr);
        }
      }

      res.json({
        success: true,
        message: 'Print request sent successfully to sales@totalpostnprint.com',
        zipFileName,
        zipId: actualZipId,
        letterCount,
        print_status: String(existingZipRecord?.print_status || '').trim() || 'Action Required',
        print_note: senderNote || null,
        sent_to_printing_at: sentToPrintingAt,
      });
    } else {
      res.status(500).json({ error: 'Failed to send email. Please try again.' });
    }
  } catch (error: any) {
    console.error('Error sending for printing:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to send print request' });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/dispute-letters/download-zip/:zipId
// Re-downloads a previously generated ZIP (regenerates from stored letter data)
// ═══════════════════════════════════════════════════════════════════════════════

export async function downloadZipById(req: Request, res: Response) {
  try {
    const zipId = req.params.zipId;
    if (!zipId) {
      res.status(400).json({ error: 'zipId is required' });
      return;
    }

    const zipRecord = await getQuery(
      `SELECT * FROM dispute_letter_zips WHERE id = ?`,
      [zipId],
    );

    if (!zipRecord) {
      res.status(404).json({ error: 'ZIP record not found' });
      return;
    }

    const filePath = (zipRecord as any).file_path;
    const fileName = (zipRecord as any).file_name || `dispute_letters_${zipId}.zip`;

    if (!filePath || !fs.existsSync(filePath)) {
      res.status(404).json({ error: 'ZIP file not found on server. Please regenerate from the application.' });
      return;
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const refreshedZipBuffer = await maybeRefreshSavedZipWithClientDocuments(zipRecord);
    if (refreshedZipBuffer) {
      res.setHeader('Content-Length', refreshedZipBuffer.length);
      res.end(refreshedZipBuffer);
      return;
    }

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    fileStream.on('error', (err) => {
      console.error('Error streaming ZIP file:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream ZIP file' });
      }
    });
  } catch (error: any) {
    console.error('Error downloading ZIP:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to retrieve ZIP' });
    }
  }
}
