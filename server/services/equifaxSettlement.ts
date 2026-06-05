import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser, Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';

const EQUIFAX_SETTLEMENT_URL = 'https://eligibility.equifaxbreachsettlement.com/en/Eligibility';
const EQUIFAX_PREVIEW_VIEWPORT = { width: 1365, height: 1024, deviceScaleFactor: 1 } as const;
const EQUIFAX_SCREENSHOT_DIR = path.resolve(
  process.cwd(),
  'public',
  'Equifax Data Breach Settlement Clients ScreenShots',
);
const PUPPETEER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-blink-features=AutomationControlled',
];

type EquifaxSettlementLiveStatus =
  | 'idle'
  | 'launching'
  | 'browser_open'
  | 'awaiting_user'
  | 'result_ready'
  | 'error';

type EquifaxSettlementLiveSession = {
  sessionKey: string;
  clientId: number;
  userId: number;
  lastName: string;
  ssnLastSix: string;
  browser: Browser;
  page: Page;
  startedAt: string;
  updatedAt: string;
  status: EquifaxSettlementLiveStatus;
  lastError: string | null;
};

type EquifaxSettlementPageState = {
  status: EquifaxSettlementLiveStatus;
  pageTitle: string;
  currentUrl: string;
  hasRecaptcha: boolean;
  hasResult: boolean;
  resultHeading: string | null;
  resultSummary: string | null;
};

type EquifaxSettlementPreviewState = {
  screenshotDataUrl: string | null;
  imageWidth: number;
  imageHeight: number;
};

const liveSessions = new Map<string, EquifaxSettlementLiveSession>();

if (!(puppeteer as any).__equifaxSettlementStealthEnabled) {
  puppeteer.use(StealthPlugin());
  (puppeteer as any).__equifaxSettlementStealthEnabled = true;
}

function extractResultText(lines: string[]) {
  const thankYouIndex = lines.findIndex((line) => line === 'Thank You');
  if (thankYouIndex >= 0) {
    return {
      heading: lines[thankYouIndex],
      summary: lines.slice(thankYouIndex + 1, thankYouIndex + 5).join(' ').trim() || null,
    };
  }

  const impactedLine = lines.find((line) =>
    /Based on the information you provided/i.test(line) || /not impacted/i.test(line)
  );

  return {
    heading: impactedLine || 'Equifax Eligibility Result',
    summary: impactedLine
      ? lines.slice(lines.indexOf(impactedLine) + 1, lines.indexOf(impactedLine) + 4).join(' ').trim() || null
      : lines.slice(0, 4).join(' ').trim() || null,
  };
}

function getSessionKey(userId: number, clientId: number) {
  return `${userId}:${clientId}`;
}

function getExecutablePath() {
  return process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_BIN || undefined;
}

function ensureScreenshotDir() {
  if (!fs.existsSync(EQUIFAX_SCREENSHOT_DIR)) {
    fs.mkdirSync(EQUIFAX_SCREENSHOT_DIR, { recursive: true });
  }
}

function sanitizeFileSegment(value: string) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'Client';
}

function getScreenshotFileName(clientId: number, firstName: string) {
  return `${clientId}_${sanitizeFileSegment(firstName)}.jpg`;
}

function findSavedScreenshotFileName(clientId: number) {
  ensureScreenshotDir();
  const prefix = `${clientId}_`;
  const fileName = fs
    .readdirSync(EQUIFAX_SCREENSHOT_DIR)
    .find((entry) => entry.startsWith(prefix) && /\.(jpg|jpeg|png)$/i.test(entry));

  return fileName || null;
}

function getSavedScreenshotAbsolutePath(fileName: string) {
  return path.join(EQUIFAX_SCREENSHOT_DIR, fileName);
}

function getScreenshotContentType(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  if (extension === '.png') return 'image/png';
  return 'image/jpeg';
}

export function getEquifaxSettlementSavedScreenshotFile(clientId: number) {
  const fileName = findSavedScreenshotFileName(clientId);
  if (!fileName) return null;

  const absolutePath = getSavedScreenshotAbsolutePath(fileName);
  if (!fs.existsSync(absolutePath)) return null;

  const stats = fs.statSync(absolutePath);
  const imageBuffer = fs.readFileSync(absolutePath);
  return {
    fileName,
    absolutePath,
    imageUrl: `data:${getScreenshotContentType(fileName)};base64,${imageBuffer.toString('base64')}`,
    updatedAt: stats.mtime.toISOString(),
  };
}

async function launchBrowser(headless: boolean) {
  return puppeteer.launch({
    headless,
    executablePath: getExecutablePath(),
    defaultViewport: EQUIFAX_PREVIEW_VIEWPORT,
    args: PUPPETEER_ARGS,
  });
}

function getViewport(page: Page) {
  return page.viewport() || EQUIFAX_PREVIEW_VIEWPORT;
}

async function collectPageLines(page: Page) {
  return page
    .evaluate(() => {
      return (document.body?.innerText || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    })
    .catch(() => [] as string[]);
}

async function collectPageState(page: Page): Promise<EquifaxSettlementPageState> {
  const [pageTitle, lines, hasRecaptcha] = await Promise.all([
    page.title().catch(() => 'Equifax Data Breach Settlement'),
    collectPageLines(page),
    page
      .evaluate(() => {
        return Boolean(
          document.querySelector('iframe[src*="recaptcha"], iframe[title*="reCAPTCHA"], textarea[name="g-recaptcha-response"]')
        );
      })
      .catch(() => false),
  ]);

  const hasResult = lines.includes('Thank You') || lines.some((line) => /Based on the information you provided|not impacted/i.test(line));
  const summary = extractResultText(lines);

  return {
    status: hasResult ? 'result_ready' : hasRecaptcha ? 'awaiting_user' : 'browser_open',
    pageTitle,
    currentUrl: page.url(),
    hasRecaptcha,
    hasResult,
    resultHeading: hasResult ? summary.heading : null,
    resultSummary: hasResult ? summary.summary : null,
  };
}

function serializeSession(
  session: Pick<EquifaxSettlementLiveSession, 'clientId' | 'userId' | 'startedAt' | 'updatedAt' | 'status' | 'lastError'>,
  pageState?: EquifaxSettlementPageState,
  previewState?: EquifaxSettlementPreviewState,
) {
  return {
    clientId: session.clientId,
    userId: session.userId,
    startedAt: session.startedAt,
    updatedAt: session.updatedAt,
    status: pageState?.status || session.status,
    lastError: session.lastError,
    pageTitle: pageState?.pageTitle || 'Equifax Data Breach Settlement',
    currentUrl: pageState?.currentUrl || EQUIFAX_SETTLEMENT_URL,
    hasRecaptcha: pageState?.hasRecaptcha || false,
    hasResult: pageState?.hasResult || false,
    resultHeading: pageState?.resultHeading || null,
    resultSummary: pageState?.resultSummary || null,
    screenshotDataUrl: previewState?.screenshotDataUrl || null,
    imageWidth: previewState?.imageWidth || EQUIFAX_PREVIEW_VIEWPORT.width,
    imageHeight: previewState?.imageHeight || EQUIFAX_PREVIEW_VIEWPORT.height,
    machineScope: 'local-desktop',
    instructions:
      'This is a live interactive preview of the Equifax browser session. The app keeps refreshing the preview and can relay clicks into the page.',
  };
}

async function capturePreviewState(page: Page): Promise<EquifaxSettlementPreviewState> {
  const viewport = getViewport(page);
  const screenshotBase64 = (await page.screenshot({
    type: 'jpeg',
    quality: 65,
    fullPage: false,
    encoding: 'base64',
  })) as string;

  return {
    screenshotDataUrl: `data:image/jpeg;base64,${screenshotBase64}`,
    imageWidth: viewport.width,
    imageHeight: viewport.height,
  };
}

async function waitForPageSettled(page: Page, timeout = 1200) {
  await Promise.race([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout }).catch(() => null),
    new Promise((resolve) => setTimeout(resolve, timeout)),
  ]);
}

async function closeSessionInternal(sessionKey: string) {
  const existingSession = liveSessions.get(sessionKey);
  if (!existingSession) return;

  liveSessions.delete(sessionKey);
  try {
    await existingSession.browser.close();
  } catch {}
}

async function openSettlementPage(page: Page, lastName: string, ssnLastSix: string) {
  await page.goto(EQUIFAX_SETTLEMENT_URL, {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });

  await page.waitForSelector('#LastName', { timeout: 15000 });
  await page.type('#LastName', lastName, { delay: 20 });
  await page.type('#Identifier', ssnLastSix, { delay: 20 });

  const submitButton = await page.waitForSelector('button[type="submit"]', { timeout: 15000 });
  if (!submitButton) {
    throw new Error('Equifax settlement submit button was not found');
  }

  await Promise.allSettled([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 8000 }),
    submitButton.click(),
  ]);
}

export async function startEquifaxSettlementLiveSession(options: {
  clientId: number;
  userId: number;
  lastName: string;
  ssnLastSix: string;
}) {
  const lastName = String(options.lastName || '').trim();
  const ssnLastSix = String(options.ssnLastSix || '').replace(/\D/g, '');

  if (!lastName) {
    throw new Error('Client last name is required for the Equifax settlement check');
  }
  if (ssnLastSix.length !== 6) {
    throw new Error('Client SSN last 6 digits are required for the Equifax settlement check');
  }

  const sessionKey = getSessionKey(options.userId, options.clientId);
  await closeSessionInternal(sessionKey);

  const browser = await launchBrowser(true);
  const page = await browser.newPage();
  const now = new Date().toISOString();
  const session: EquifaxSettlementLiveSession = {
    sessionKey,
    clientId: options.clientId,
    userId: options.userId,
    lastName,
    ssnLastSix,
    browser,
    page,
    startedAt: now,
    updatedAt: now,
    status: 'launching',
    lastError: null,
  };

  liveSessions.set(sessionKey, session);

  browser.on('disconnected', () => {
    const activeSession = liveSessions.get(sessionKey);
    if (activeSession?.browser === browser) {
      liveSessions.delete(sessionKey);
    }
  });

  try {
    await openSettlementPage(page, lastName, ssnLastSix);

    const pageState = await collectPageState(page);
    const previewState = await capturePreviewState(page);
    session.status = pageState.status;
    session.updatedAt = new Date().toISOString();

    return serializeSession(session, pageState, previewState);
  } catch (error: any) {
    session.status = 'error';
    session.lastError = error?.message || 'Failed to open the live Equifax browser session';
    session.updatedAt = new Date().toISOString();
    await closeSessionInternal(sessionKey);
    throw error;
  }
}

export async function getEquifaxSettlementLiveSessionState(options: {
  clientId: number;
  userId: number;
}) {
  const sessionKey = getSessionKey(options.userId, options.clientId);
  const session = liveSessions.get(sessionKey);

  if (!session) {
    return {
      clientId: options.clientId,
      userId: options.userId,
      status: 'idle' as const,
      lastError: null,
      pageTitle: 'Equifax Data Breach Settlement',
      currentUrl: EQUIFAX_SETTLEMENT_URL,
      hasRecaptcha: false,
      hasResult: false,
      resultHeading: null,
      resultSummary: null,
      startedAt: null,
      updatedAt: null,
      machineScope: 'local-desktop',
      instructions:
        'Open a live browser window on this machine to continue the Equifax settlement check and solve any reCAPTCHA manually.',
    };
  }

  if (!session.browser.isConnected() || session.page.isClosed()) {
    liveSessions.delete(sessionKey);
    return {
      clientId: options.clientId,
      userId: options.userId,
      status: 'idle' as const,
      lastError: null,
      pageTitle: 'Equifax Data Breach Settlement',
      currentUrl: EQUIFAX_SETTLEMENT_URL,
      hasRecaptcha: false,
      hasResult: false,
      resultHeading: null,
      resultSummary: null,
      startedAt: null,
      updatedAt: null,
      machineScope: 'local-desktop',
      instructions:
        'The previous live browser window was closed. Start a new Equifax live session when you are ready.',
    };
  }

  const pageState = await collectPageState(session.page);
  session.status = pageState.status;
  session.updatedAt = new Date().toISOString();

  return serializeSession(session, pageState);
}

export async function getEquifaxSettlementLivePreview(options: {
  clientId: number;
  userId: number;
}) {
  const sessionKey = getSessionKey(options.userId, options.clientId);
  const session = liveSessions.get(sessionKey);

  if (!session || !session.browser.isConnected() || session.page.isClosed()) {
    if (session) {
      liveSessions.delete(sessionKey);
    }

    return {
      clientId: options.clientId,
      userId: options.userId,
      status: 'idle' as const,
      lastError: null,
      pageTitle: 'Equifax Data Breach Settlement',
      currentUrl: EQUIFAX_SETTLEMENT_URL,
      hasRecaptcha: false,
      hasResult: false,
      resultHeading: null,
      resultSummary: null,
      screenshotDataUrl: null,
      imageWidth: EQUIFAX_PREVIEW_VIEWPORT.width,
      imageHeight: EQUIFAX_PREVIEW_VIEWPORT.height,
      startedAt: null,
      updatedAt: null,
      machineScope: 'local-desktop',
      instructions:
        'Open the Equifax live preview to let the system fill the form and show the page below.',
    };
  }

  const [pageState, previewState] = await Promise.all([
    collectPageState(session.page),
    capturePreviewState(session.page),
  ]);
  session.status = pageState.status;
  session.updatedAt = new Date().toISOString();

  return serializeSession(session, pageState, previewState);
}

export async function clickEquifaxSettlementLivePreview(options: {
  clientId: number;
  userId: number;
  xRatio: number;
  yRatio: number;
}) {
  const sessionKey = getSessionKey(options.userId, options.clientId);
  const session = liveSessions.get(sessionKey);
  if (!session || !session.browser.isConnected() || session.page.isClosed()) {
    return {
      ok: false,
      status: 'idle' as const,
    };
  }

  const viewport = getViewport(session.page);
  const x = Math.max(0, Math.min(viewport.width - 1, Math.round(options.xRatio * viewport.width)));
  const y = Math.max(0, Math.min(viewport.height - 1, Math.round(options.yRatio * viewport.height)));

  await session.page.mouse.move(x, y);
  await session.page.mouse.click(x, y, { delay: 60 });
  await waitForPageSettled(session.page);

  const [pageState, previewState] = await Promise.all([
    collectPageState(session.page),
    capturePreviewState(session.page),
  ]);
  session.status = pageState.status;
  session.updatedAt = new Date().toISOString();

  return {
    ok: true,
    ...serializeSession(session, pageState, previewState),
  };
}

export async function scrollEquifaxSettlementLivePreview(options: {
  clientId: number;
  userId: number;
  deltaY: number;
}) {
  const sessionKey = getSessionKey(options.userId, options.clientId);
  const session = liveSessions.get(sessionKey);
  if (!session || !session.browser.isConnected() || session.page.isClosed()) {
    return {
      ok: false,
      status: 'idle' as const,
    };
  }

  const deltaY = Number(options.deltaY) || 0;
  await session.page.mouse.wheel({ deltaY });
  await waitForPageSettled(session.page, 600);

  const [pageState, previewState] = await Promise.all([
    collectPageState(session.page),
    capturePreviewState(session.page),
  ]);
  session.status = pageState.status;
  session.updatedAt = new Date().toISOString();

  return {
    ok: true,
    ...serializeSession(session, pageState, previewState),
  };
}

export async function focusEquifaxSettlementLiveSession(options: {
  clientId: number;
  userId: number;
}) {
  const sessionKey = getSessionKey(options.userId, options.clientId);
  const session = liveSessions.get(sessionKey);
  if (!session || !session.browser.isConnected() || session.page.isClosed()) {
    return {
      ok: false,
      status: 'idle' as const,
    };
  }

  await session.page.bringToFront().catch(() => null);
  const pageState = await collectPageState(session.page);
  session.status = pageState.status;
  session.updatedAt = new Date().toISOString();

  return {
    ok: true,
    ...serializeSession(session, pageState),
  };
}

export async function closeEquifaxSettlementLiveSession(options: {
  clientId: number;
  userId: number;
}) {
  const sessionKey = getSessionKey(options.userId, options.clientId);
  await closeSessionInternal(sessionKey);

  return {
    ok: true,
    clientId: options.clientId,
    userId: options.userId,
    status: 'idle' as const,
  };
}

export async function saveEquifaxSettlementClientScreenshot(options: {
  clientId: number;
  userId: number;
  firstName: string;
}) {
  const sessionKey = getSessionKey(options.userId, options.clientId);
  const session = liveSessions.get(sessionKey);
  if (!session || !session.browser.isConnected() || session.page.isClosed()) {
    throw new Error('No active Equifax preview session is running');
  }

  ensureScreenshotDir();

  const fileName = getScreenshotFileName(options.clientId, options.firstName);
  const filePath = getSavedScreenshotAbsolutePath(fileName);
  const staleFileName = findSavedScreenshotFileName(options.clientId);
  if (staleFileName && staleFileName !== fileName) {
    try {
      fs.unlinkSync(getSavedScreenshotAbsolutePath(staleFileName));
    } catch {}
  }

  await session.page.screenshot({
    path: filePath,
    type: 'jpeg',
    quality: 85,
    fullPage: false,
  });

  const stats = fs.statSync(filePath);
  const imageBuffer = fs.readFileSync(filePath);
  return {
    fileName,
    imageUrl: `data:${getScreenshotContentType(fileName)};base64,${imageBuffer.toString('base64')}`,
    updatedAt: stats.mtime.toISOString(),
  };
}

export async function captureEquifaxSettlementScreenshot(options: {
  lastName: string;
  ssnLastSix: string;
}) {
  const lastName = String(options.lastName || '').trim();
  const ssnLastSix = String(options.ssnLastSix || '').replace(/\D/g, '');

  if (!lastName) {
    throw new Error('Client last name is required for the Equifax settlement check');
  }
  if (ssnLastSix.length !== 6) {
    throw new Error('Client SSN last 6 digits are required for the Equifax settlement check');
  }

  const browser = await launchBrowser(true);

  try {
    const page = await browser.newPage();
    await openSettlementPage(page, lastName, ssnLastSix);

    await page
      .waitForFunction(
        () => {
          const text = document.body?.innerText || '';
          return (
            text.includes('Thank You') ||
            text.includes('Based on the information you provided') ||
            text.toLowerCase().includes('not impacted')
          );
        },
        { timeout: 15000 }
      )
      .catch(() => null);

    const resultLines = await collectPageLines(page);

    const screenshotBase64 = (await page.screenshot({
      type: 'jpeg',
      quality: 70,
      fullPage: true,
      encoding: 'base64',
    })) as string;

    const summary = extractResultText(resultLines);

    return {
      screenshotDataUrl: `data:image/jpeg;base64,${screenshotBase64}`,
      resultHeading: summary.heading,
      resultSummary: summary.summary,
      checkedAt: new Date().toISOString(),
      finalUrl: page.url(),
    };
  } finally {
    await browser.close();
  }
}
