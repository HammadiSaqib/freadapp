import { Router, Request, Response } from 'express';
import axios from 'axios';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/authMiddleware.js';
import { rateLimit } from '../middleware/securityMiddleware.js';
import { getDatabaseAdapter } from '../database/databaseAdapter.js';
import { getScoreMachineEliteAccessStatus, hasSignedScoreMachineEliteAgreement } from '../utils/scoreMachineEliteAccess.js';
import { z } from 'zod';

const router = Router();

const AI_FUNDING_FREE_QUOTA = Math.max(1, Number(process.env.AI_FUNDING_FREE_QUOTA || 5));
const OPEN_AI_PROMPT_LIMIT = 10;
type StoredChatType = 'user' | 'assistant' | 'system';

const OPEN_AI_CONFIGURATION_SETTING_KEY = 'ai.openai_coach_configuration';
const OPEN_AI_CONFIGURATION_ADMIN_NAME_VARIABLE = '{(Admin Name)}';
const OPEN_AI_CONFIGURATION_ADMIN_PROMPT_VARIABLE = '{(Admin Prompt)}';
const OPEN_AI_CONFIGURATION_ADMIN_SELECTED_CLIENT_REPORT_VARIABLE = '{(Admin Selected Client Latest Report (JSON))}';
const UNLIMITED_AI_TOKENS_PERMISSION = 'unlimited_ai_tokens';
const UNLIMITED_OPENAI_PROMPTS_PERMISSION = 'unlimited_openai_prompts';

let aiUsageTableReady: Promise<void> | null = null;
async function ensureAiUsageTable(): Promise<void> {
  if (!aiUsageTableReady) {
    aiUsageTableReady = (async () => {
      const db = getDatabaseAdapter();
      await db.executeQuery(
        `CREATE TABLE IF NOT EXISTS ai_funding_strategy_usage (
          admin_id INT NOT NULL PRIMARY KEY,
          used_count INT NOT NULL DEFAULT 0,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        []
      );
    })().catch((err) => {
      aiUsageTableReady = null;
      throw err;
    });
  }
  return aiUsageTableReady;
}

let openAiPromptUsageTableReady: Promise<void> | null = null;
async function ensureOpenAiPromptUsageTable(): Promise<void> {
  if (!openAiPromptUsageTableReady) {
    openAiPromptUsageTableReady = (async () => {
      const db = getDatabaseAdapter();

      if (db.getType() === 'sqlite') {
        await db.executeQuery(
          `CREATE TABLE IF NOT EXISTS ai_openai_prompt_usage (
            owner_user_id INTEGER NOT NULL,
            period_key TEXT NOT NULL,
            billing_period_start TEXT,
            billing_period_end TEXT,
            used_count INTEGER NOT NULL DEFAULT 0,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (owner_user_id, period_key),
            FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
          )`,
          [],
        );
        await db.executeQuery(
          'CREATE INDEX IF NOT EXISTS idx_ai_openai_prompt_usage_period_end ON ai_openai_prompt_usage(billing_period_end)',
          [],
        );
      } else {
        await db.executeQuery(
          `CREATE TABLE IF NOT EXISTS ai_openai_prompt_usage (
            owner_user_id INT NOT NULL,
            period_key VARCHAR(191) NOT NULL,
            billing_period_start VARCHAR(40) NULL,
            billing_period_end VARCHAR(40) NULL,
            used_count INT NOT NULL DEFAULT 0,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (owner_user_id, period_key),
            INDEX idx_ai_openai_prompt_usage_period_end (billing_period_end),
            FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
          [],
        );
      }
    })().catch((err) => {
      openAiPromptUsageTableReady = null;
      throw err;
    });
  }
  return openAiPromptUsageTableReady;
}

let openAiPromptCreditBalanceTableReady: Promise<void> | null = null;
async function ensureOpenAiPromptCreditBalanceTable(): Promise<void> {
  if (!openAiPromptCreditBalanceTableReady) {
    openAiPromptCreditBalanceTableReady = (async () => {
      const db = getDatabaseAdapter();

      if (db.getType() === 'sqlite') {
        await db.executeQuery(
          `CREATE TABLE IF NOT EXISTS ai_prompt_credit_balances (
            owner_user_id INTEGER NOT NULL PRIMARY KEY,
            purchased_prompt_balance INTEGER NOT NULL DEFAULT 0,
            total_purchased_prompts INTEGER NOT NULL DEFAULT 0,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          )`,
          [],
        );
        return;
      }

      await db.executeQuery(
        `CREATE TABLE IF NOT EXISTS ai_prompt_credit_balances (
          owner_user_id INT NOT NULL PRIMARY KEY,
          purchased_prompt_balance INT NOT NULL DEFAULT 0,
          total_purchased_prompts INT NOT NULL DEFAULT 0,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_ai_prompt_credit_balance_updated_at (updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
        [],
      );
    })().catch((err) => {
      openAiPromptCreditBalanceTableReady = null;
      throw err;
    });
  }
  return openAiPromptCreditBalanceTableReady;
}

async function readOpenAiPurchasedPromptBalance(ownerUserId: number): Promise<number> {
  await ensureOpenAiPromptCreditBalanceTable();
  const db = getDatabaseAdapter();
  const row = await db.getQuery(
    'SELECT purchased_prompt_balance FROM ai_prompt_credit_balances WHERE owner_user_id = ? LIMIT 1',
    [ownerUserId],
  );
  return Math.max(0, Number(row?.purchased_prompt_balance || 0));
}

async function decrementOpenAiPurchasedPromptBalance(ownerUserId: number): Promise<number> {
  await ensureOpenAiPromptCreditBalanceTable();
  const db = getDatabaseAdapter();

  if (db.getType() === 'sqlite') {
    await db.executeQuery(
      `UPDATE ai_prompt_credit_balances
       SET purchased_prompt_balance = MAX(0, purchased_prompt_balance - 1), updated_at = CURRENT_TIMESTAMP
       WHERE owner_user_id = ? AND purchased_prompt_balance > 0`,
      [ownerUserId],
    );
  } else {
    await db.executeQuery(
      `UPDATE ai_prompt_credit_balances
       SET purchased_prompt_balance = GREATEST(0, purchased_prompt_balance - 1), updated_at = NOW()
       WHERE owner_user_id = ? AND purchased_prompt_balance > 0`,
      [ownerUserId],
    );
  }

  return readOpenAiPurchasedPromptBalance(ownerUserId);
}
let gptChatHistoryTableReady: Promise<void> | null = null;
async function ensureGptChatHistoryTable(): Promise<void> {
  if (!gptChatHistoryTableReady) {
    gptChatHistoryTableReady = (async () => {
      const db = getDatabaseAdapter();

      if (db.getType() === 'sqlite') {
        await db.executeQuery(
          `CREATE TABLE IF NOT EXISTS gpt_chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            user_gmail TEXT NOT NULL,
            chat TEXT NOT NULL,
            chat_type TEXT NOT NULL,
            time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )`,
          []
        );
        await db.executeQuery('CREATE INDEX IF NOT EXISTS idx_gpt_chat_history_user_id ON gpt_chat_history(user_id)', []);
        await db.executeQuery('CREATE INDEX IF NOT EXISTS idx_gpt_chat_history_time ON gpt_chat_history(time)', []);
      } else {
        await db.executeQuery(
          `CREATE TABLE IF NOT EXISTS gpt_chat_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            user_gmail VARCHAR(255) NOT NULL,
            chat LONGTEXT NOT NULL,
            chat_type ENUM('user', 'assistant', 'system') NOT NULL,
            time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_gpt_chat_history_user_id (user_id),
            INDEX idx_gpt_chat_history_chat_type (chat_type),
            INDEX idx_gpt_chat_history_time (time),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
          []
        );
      }
    })().catch((err) => {
      gptChatHistoryTableReady = null;
      throw err;
    });
  }

  return gptChatHistoryTableReady;
}

function createHttpError(status: number, message: string) {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}

async function ensureEliteAiCoachAccess(req: AuthRequest): Promise<void> {
  const user = req.user;

  if (!user?.id) {
    throw createHttpError(401, 'Authentication required');
  }

  if (String(user.role || '').toLowerCase() === 'super_admin') {
    return;
  }

  const eliteAccess = await getScoreMachineEliteAccessStatus(user.id);
  if (!eliteAccess.hasAccess) {
    throw createHttpError(
      403,
      'This feature For Elite User Only Upgrade To Eilte Or If You Already Have Unlimete Unlimte Pakege So Contact To Support For Elite Activtion'
    );
  }

  const hasSignedAgreement = await hasSignedScoreMachineEliteAgreement(user.id);
  if (!hasSignedAgreement) {
    throw createHttpError(
      403,
      'This feature For Elite User Only Upgrade To Eilte Or If You Already Have Unlimete Unlimte Pakege So Contact To Support For Elite Activtion'
    );
  }
}

async function saveGptChatHistoryEntry(
  userId: number,
  userEmail: string,
  chat: string,
  chatType: StoredChatType,
): Promise<void> {
  const trimmedChat = String(chat || '').trim();
  if (!trimmedChat) {
    return;
  }

  await ensureGptChatHistoryTable();

  const db = getDatabaseAdapter();
  await db.executeQuery(
    'INSERT INTO gpt_chat_history (user_id, user_gmail, chat, chat_type) VALUES (?, ?, ?, ?)',
    [userId, userEmail, trimmedChat, chatType],
  );
}

function normalizeChatHistoryTimestamp(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(String(value || ''));
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return new Date().toISOString();
}

function normalizeBillingPeriodTimestamp(value: unknown): string | null {
  if (value === null || typeof value === 'undefined' || value === '') {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

async function getOpenAiConfigurationTemplate(): Promise<string> {
  const db = getDatabaseAdapter();
  const rows = await db.executeQuery(
    'SELECT setting_value FROM system_settings WHERE setting_key = ? LIMIT 1',
    [OPEN_AI_CONFIGURATION_SETTING_KEY],
  );

  if (!Array.isArray(rows) || rows.length < 1) {
    return '';
  }

  return String((rows[0] as any)?.setting_value || '');
}

async function resolveOpenAiConfigurationAdminName(userId: number, fallbackEmail: string): Promise<string> {
  const db = getDatabaseAdapter();
  const rows = await db.executeQuery(
    'SELECT first_name, last_name, email FROM users WHERE id = ? LIMIT 1',
    [userId],
  );

  if (Array.isArray(rows) && rows.length > 0) {
    const firstName = String((rows[0] as any)?.first_name || '').trim();
    const lastName = String((rows[0] as any)?.last_name || '').trim();
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName) {
      return fullName;
    }

    const rowEmail = String((rows[0] as any)?.email || '').trim();
    if (rowEmail) {
      return rowEmail;
    }
  }

  return String(fallbackEmail || '').trim() || 'Admin';
}

function renderOpenAiConfigurationTemplate(
  template: string,
  values: {
    adminName: string;
    adminPrompt: string;
    selectedClientLatestReportJson: string;
  },
): string {
  return template
    .split(OPEN_AI_CONFIGURATION_ADMIN_NAME_VARIABLE)
    .join(values.adminName)
    .split(OPEN_AI_CONFIGURATION_ADMIN_PROMPT_VARIABLE)
    .join(values.adminPrompt)
    .split(OPEN_AI_CONFIGURATION_ADMIN_SELECTED_CLIENT_REPORT_VARIABLE)
    .join(values.selectedClientLatestReportJson)
    .trim();
}

async function adminHasPermission(adminId: number, permissionId: string): Promise<boolean> {
  try {
    const db = getDatabaseAdapter();
    const rows = await db.executeQuery(
      'SELECT permissions FROM admin_profiles WHERE user_id = ? LIMIT 1',
      [adminId]
    );
    const raw = Array.isArray(rows) && rows.length > 0 ? (rows[0] as any).permissions : null;
    if (!raw) return false;
    let parsed: any = raw;
    if (typeof raw === 'string') {
      try { parsed = JSON.parse(raw); } catch { parsed = []; }
    }
    if (Array.isArray(parsed)) {
      return parsed.some((entry) => typeof entry === 'string' && entry === permissionId);
    }
    return false;
  } catch {
    return false;
  }
}

async function adminHasUnlimitedAiTokens(adminId: number): Promise<boolean> {
  return adminHasPermission(adminId, UNLIMITED_AI_TOKENS_PERMISSION);
}

async function adminHasUnlimitedOpenAiPrompts(adminId: number): Promise<boolean> {
  return adminHasPermission(adminId, UNLIMITED_OPENAI_PROMPTS_PERMISSION);
}

async function resolveAiQuotaOwnerId(req: AuthRequest): Promise<{ adminId: number | null; unlimited: boolean }> {
  const user = req.user;
  if (!user) return { adminId: null, unlimited: false };
  const role = String(user.role || '').toLowerCase();
  if (role === 'super_admin') return { adminId: user.id, unlimited: true };
  if (role === 'admin') {
    const unlimited = await adminHasUnlimitedAiTokens(user.id);
    return { adminId: user.id, unlimited };
  }

  const db = getDatabaseAdapter();
  if (role === 'funding_manager' || role === 'employee' || role === 'user') {
    const link = await db.executeQuery(
      'SELECT admin_id FROM employees WHERE user_id = ? AND status = ? ORDER BY updated_at DESC LIMIT 1',
      [user.id, 'active']
    );
    if (Array.isArray(link) && (link[0] as any)?.admin_id) {
      const adminId = Number((link[0] as any).admin_id);
      const unlimited = await adminHasUnlimitedAiTokens(adminId);
      return { adminId, unlimited };
    }
  }
  return { adminId: null, unlimited: false };
}

async function resolveOpenAiPromptQuotaOwner(
  req: AuthRequest,
): Promise<{ ownerUserId: number | null; unlimited: boolean }> {
  const user = req.user;
  if (!user) {
    return { ownerUserId: null, unlimited: false };
  }

  const role = String(user.role || '').toLowerCase();
  if (role === 'super_admin') {
    return { ownerUserId: user.id, unlimited: true };
  }

  if (role === 'admin') {
    const unlimited = await adminHasUnlimitedOpenAiPrompts(user.id);
    return { ownerUserId: user.id, unlimited };
  }

  const db = getDatabaseAdapter();
  if (role === 'funding_manager' || role === 'employee' || role === 'user') {
    const link = await db.executeQuery(
      'SELECT admin_id FROM employees WHERE user_id = ? AND status = ? ORDER BY updated_at DESC LIMIT 1',
      [user.id, 'active']
    );
    if (Array.isArray(link) && (link[0] as any)?.admin_id) {
      const ownerUserId = Number((link[0] as any).admin_id);
      const unlimited = await adminHasUnlimitedOpenAiPrompts(ownerUserId);
      return { ownerUserId, unlimited };
    }
  }

  return { ownerUserId: user.id, unlimited: false };
}

type OpenAiPromptBillingWindow = {
  periodKey: string;
  periodStart: string | null;
  periodEnd: string | null;
  resetAt: string | null;
};

async function resolveOpenAiPromptBillingWindow(ownerUserId: number): Promise<OpenAiPromptBillingWindow> {
  try {
    const db = getDatabaseAdapter();
    const rows = await db.executeQuery(
      `SELECT current_period_start, current_period_end
       FROM subscriptions
       WHERE user_id = ? AND status = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [ownerUserId, 'active']
    );

    if (Array.isArray(rows) && rows.length > 0) {
      const periodStart = normalizeBillingPeriodTimestamp((rows[0] as any)?.current_period_start);
      const periodEnd = normalizeBillingPeriodTimestamp((rows[0] as any)?.current_period_end);

      if (periodEnd) {
        return {
          periodKey: `subscription:${periodEnd}`,
          periodStart,
          periodEnd,
          resetAt: periodEnd,
        };
      }
    }
  } catch (error) {
    console.warn('[ai] Failed to resolve OpenAI prompt billing period, using calendar fallback', error);
  }

  const now = new Date();
  const periodStartDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const periodEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  const periodStart = periodStartDate.toISOString();
  const periodEnd = periodEndDate.toISOString();

  return {
    periodKey: `calendar:${periodEnd}`,
    periodStart,
    periodEnd,
    resetAt: periodEnd,
  };
}

async function readOpenAiPromptUsage(
  ownerUserId: number,
  billingWindow: OpenAiPromptBillingWindow,
): Promise<number> {
  await ensureOpenAiPromptUsageTable();

  const db = getDatabaseAdapter();
  const rows = await db.executeQuery(
    'SELECT used_count FROM ai_openai_prompt_usage WHERE owner_user_id = ? AND period_key = ? LIMIT 1',
    [ownerUserId, billingWindow.periodKey],
  );

  if (Array.isArray(rows) && rows.length > 0) {
    return Number((rows[0] as any)?.used_count || 0);
  }

  return 0;
}

async function incrementOpenAiPromptUsage(
  ownerUserId: number,
  billingWindow: OpenAiPromptBillingWindow,
): Promise<number> {
  await ensureOpenAiPromptUsageTable();

  const db = getDatabaseAdapter();
  const params = [
    ownerUserId,
    billingWindow.periodKey,
    billingWindow.periodStart,
    billingWindow.periodEnd,
  ];

  if (db.getType() === 'sqlite') {
    await db.executeQuery(
      `INSERT INTO ai_openai_prompt_usage (owner_user_id, period_key, billing_period_start, billing_period_end, used_count)
       VALUES (?, ?, ?, ?, 1)
       ON CONFLICT(owner_user_id, period_key) DO UPDATE SET
         billing_period_start = excluded.billing_period_start,
         billing_period_end = excluded.billing_period_end,
         used_count = used_count + 1,
         updated_at = CURRENT_TIMESTAMP`,
      params,
    );
  } else {
    await db.executeQuery(
      `INSERT INTO ai_openai_prompt_usage (owner_user_id, period_key, billing_period_start, billing_period_end, used_count)
       VALUES (?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE
         billing_period_start = VALUES(billing_period_start),
         billing_period_end = VALUES(billing_period_end),
         used_count = used_count + 1,
         updated_at = CURRENT_TIMESTAMP`,
      params,
    );
  }

  return readOpenAiPromptUsage(ownerUserId, billingWindow);
}

async function readAiUsage(adminId: number): Promise<number> {
  await ensureAiUsageTable();
  const db = getDatabaseAdapter();
  const rows = await db.executeQuery(
    'SELECT used_count FROM ai_funding_strategy_usage WHERE admin_id = ? LIMIT 1',
    [adminId]
  );
  if (Array.isArray(rows) && rows.length > 0) {
    return Number((rows[0] as any).used_count || 0);
  }
  return 0;
}

async function incrementAiUsage(adminId: number): Promise<number> {
  await ensureAiUsageTable();
  const db = getDatabaseAdapter();
  await db.executeQuery(
    `INSERT INTO ai_funding_strategy_usage (admin_id, used_count)
     VALUES (?, 1)
     ON DUPLICATE KEY UPDATE used_count = used_count + 1`,
    [adminId]
  );
  return readAiUsage(adminId);
}

function buildQuotaPayload(used: number, unlimited: boolean) {
  if (unlimited) {
    return { used, limit: null as number | null, remaining: null as number | null, unlimited: true };
  }
  const remaining = Math.max(0, AI_FUNDING_FREE_QUOTA - used);
  return { used, limit: AI_FUNDING_FREE_QUOTA, remaining, unlimited: false };
}

function getDaysUntilReset(resetAt: string | null): number | null {
  if (!resetAt) {
    return null;
  }

  const resetAtDate = new Date(resetAt);
  if (Number.isNaN(resetAtDate.getTime())) {
    return null;
  }

  const diffMs = resetAtDate.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function buildOpenAiPromptQuotaPayload(
  used: number,
  unlimited: boolean,
  resetAt: string | null,
  purchasedPromptBalance = 0,
) {
  const resetInDays = getDaysUntilReset(resetAt);
  const purchasedRemaining = Math.max(0, Number(purchasedPromptBalance || 0));
  const freeRemaining = Math.max(0, OPEN_AI_PROMPT_LIMIT - used);

  if (unlimited) {
    return {
      used,
      limit: null as number | null,
      baseLimit: OPEN_AI_PROMPT_LIMIT,
      freeRemaining: null as number | null,
      purchasedRemaining,
      remaining: null as number | null,
      unlimited: true,
      resetAt,
      resetInDays,
    };
  }

  return {
    used,
    limit: OPEN_AI_PROMPT_LIMIT + purchasedRemaining,
    baseLimit: OPEN_AI_PROMPT_LIMIT,
    freeRemaining,
    purchasedRemaining,
    remaining: freeRemaining + purchasedRemaining,
    unlimited: false,
    resetAt,
    resetInDays,
  };
}

const chatSelectedClientReportSchema = z.object({
  clientId: z.number().int().positive(),
  clientName: z.string().min(1),
  reportData: z.any(),
});

// Zod schema to validate incoming chat requests
const chatRequestSchema = z.object({
  question: z.string().trim().min(1, 'Question is too short').optional(),
  selectedClientReports: z.array(chatSelectedClientReportSchema).optional().default([]),
}).superRefine((value, ctx) => {
  if (!value.question?.trim() && value.selectedClientReports.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'A question or at least one selected client report is required',
      path: ['question'],
    });
  }
});

const clauseContentGenerateSchema = z.object({
  content: z.string().min(1, 'Clause content is required'),
  guide: z.string().min(1, 'AI guide is required'),
  variantExamples: z.array(z.string().min(1)).max(10).optional().default([]),
});

// System prompt: FinMint AI persona and guardrails
const SYSTEM_PROMPT = `You are FinMint AI — a certified USA-based Credit Repair and Business Funding Professional with 10+ years of experience.

Role & Scope:
- Advise on U.S. credit repair and funding only, following FCRA and FDCPA.
- Cover credit scores, dispute strategy/letters, utilization, inquiries, account mix, and funding programs.
- Tailor guidance for personal and business credit needs.

Tone & Ethics:
- Be clear, friendly, and professional. Start with empathy.
- Never make false promises (e.g., guaranteed removals) or suggest illegal tactics.
- If unsure, suggest seeking legal or certified credit counseling support.

Platform Policy:
- Do not recommend other credit repair or funding platforms.
- When recommending services, refer to FinMint/Score Machine offerings and resources.

Response Style:
- Use plain English with short paragraphs and helpful bullet points.
- End with a specific, helpful next step or suggestion.
`;

type ChatMessage = { role: string; content: string };

// Helper to call OpenAI Chat Completions API using axios
async function callOpenAIChat(messages: ChatMessage[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const url = 'https://api.openai.com/v1/chat/completions';

  if (!apiKey) {
    return {
      reply:
        'Thanks for reaching out — I’m here to help with credit repair and funding. Our FinMint AI integration is being configured. In the meantime, you can ask your question and I’ll provide best-practice guidance based on U.S. credit laws. For immediate assistance, consider scheduling a consultation with our FinMint team.',
      model: 'fallback',
      usage: undefined,
      fromCache: true,
    };
  }

  const payload = {
    model,
    temperature: 0.7,
    max_tokens: 800,
    messages,
  };

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  let resp;
  try {
    resp = await axios.post(url, payload, { headers });
  } catch (error: any) {
    const upstreamStatus = error?.response?.status;
    const upstreamCode = error?.response?.data?.error?.code;

    if (upstreamStatus === 401 || upstreamCode === 'invalid_api_key') {
      const configError = new Error('OpenAI API key is invalid or expired. Update OPENAI_API_KEY in the server environment.') as Error & { status?: number };
      configError.status = 503;
      throw configError;
    }

    throw error;
  }

  const choice = resp.data?.choices?.[0];
  const reply = choice?.message?.content?.trim() || '';
  return {
    reply,
    model,
    usage: resp.data?.usage,
    fromCache: false,
  };
}

async function callAnthropicMessage(system: string, prompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
  const url = 'https://api.anthropic.com/v1/messages';

  if (!apiKey) {
    const error = new Error('ANTHROPIC_API_KEY is not configured');
    (error as Error & { status?: number }).status = 503;
    throw error;
  }

  const payload = {
    model,
    temperature: 0.2,
    max_tokens: Math.max(1024, Number(process.env.ANTHROPIC_MAX_TOKENS) || 6000),
    system,
    messages: [{ role: 'user', content: prompt }],
  };

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  };

  // Hard timeout slightly under typical reverse-proxy timeouts (nginx default
  // proxy_read_timeout is 60s). If the upstream call exceeds this we want to
  // fail fast on the Node side rather than have nginx return a bare 504 that
  // wipes the client's last successful render.
  const timeoutMs = Math.max(10_000, Number(process.env.ANTHROPIC_TIMEOUT_MS) || 55_000);
  const resp = await axios.post(url, payload, { headers, timeout: timeoutMs });
  const reply = Array.isArray(resp.data?.content)
    ? resp.data.content
        .filter((item: any) => item?.type === 'text' && typeof item?.text === 'string')
        .map((item: any) => item.text)
        .join('\n')
        .trim()
    : '';

  if (resp.data?.stop_reason && resp.data.stop_reason !== 'end_turn') {
    console.warn('[anthropic] stop_reason=', resp.data.stop_reason, 'usage=', resp.data?.usage);
  }

  return {
    reply,
    model,
    usage: resp.data?.usage,
  };
}

async function callFinMintChat(messages: ChatMessage[]) {
  if (process.env.OPENAI_API_KEY) {
    try {
      return await callOpenAIChat(messages);
    } catch (error: any) {
      const canFallbackToAnthropic = Boolean(process.env.ANTHROPIC_API_KEY) && error?.status === 503;
      if (!canFallbackToAnthropic) {
        throw error;
      }

      console.warn('[ai] OpenAI chat failed, falling back to Anthropic for FinMint chat');
    }
  }

  if (process.env.ANTHROPIC_API_KEY) {
    const systemMessage = messages.find((message) => message.role === 'system')?.content || '';
    const prompt = messages
      .filter((message) => message.role !== 'system')
      .map((message) => message.content)
      .join('\n\n');

    return callAnthropicMessage(systemMessage, prompt);
  }

  return callOpenAIChat(messages);
}

// Helper: extract structured JSON block from AI reply (JSON fenced block)
function extractStructuredJSON(text: string): any | null {
  if (!text) return null;
  const tryParse = (raw: string): any | null => {
    try { return JSON.parse(raw); } catch { return null; }
  };
  // 1) Fenced ```json ... ```
  const fenceMatch = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/);
  if (fenceMatch && fenceMatch[1]) {
    const parsed = tryParse(fenceMatch[1].trim());
    if (parsed && typeof parsed === 'object') return parsed;
  }
  // 2) Whole-string parse
  const trimmed = text.trim();
  const whole = tryParse(trimmed);
  if (whole && typeof whole === 'object') return whole;
  // 3) Walk braces to find first balanced JSON object
  const start = text.indexOf('{');
  if (start >= 0) {
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (inStr) {
        if (esc) { esc = false; continue; }
        if (ch === '\\') { esc = true; continue; }
        if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') { inStr = true; continue; }
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          const candidate = text.slice(start, i + 1);
          const parsed = tryParse(candidate);
          if (parsed && typeof parsed === 'object') return parsed;
          break;
        }
      }
    }
  }
  return null;
}

function normalizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((value) => String(value || '').trim())
    .filter(Boolean);
}

// Compact a large credit-report JSON into the fields the matching engine actually needs,
// to stay well under Anthropic's per-minute input-token budget.
function compactCreditReport(report: any): any {
  if (!report || typeof report !== 'object') return report;
  const safe = (value: any) => (value === undefined || value === null ? null : value);
  const pickKeys = <T extends Record<string, any>>(obj: T, keys: string[]): Record<string, any> => {
    const out: Record<string, any> = {};
    if (!obj || typeof obj !== 'object') return out;
    for (const k of keys) if (k in obj) out[k] = (obj as any)[k];
    return out;
  };

  const summary =
    report.summary ||
    report.creditSummary ||
    report.scoreSummary ||
    pickKeys(report, ['scores', 'fico', 'fico8', 'fico_scores']);

  const scores =
    report.scores ||
    report.fico ||
    report.fico8 ||
    report.fico_scores ||
    pickKeys(report, ['transunion', 'experian', 'equifax', 'tru', 'efx', 'exp']);

  const personal = pickKeys(report.personalInfo || report.personal_info || report.personal || {}, [
    'name',
    'firstName',
    'lastName',
    'address',
    'addresses',
    'city',
    'state',
    'zip',
    'zipCode',
    'employer',
    'employment',
  ]);

  const inquiriesRaw = report.inquiries || report.inquiry || [];
  const inquiries = Array.isArray(inquiriesRaw)
    ? inquiriesRaw.slice(0, 60).map((inq: any) =>
        pickKeys(inq, ['creditor', 'name', 'subscriber', 'date', 'inquiryDate', 'bureau', 'bureaus', 'type'])
      )
    : inquiriesRaw;

  const accountsRaw = report.accounts || report.tradelines || report.tradeLines || [];
  const accounts = Array.isArray(accountsRaw)
    ? accountsRaw.slice(0, 80).map((acc: any) =>
        pickKeys(acc, [
          'creditor',
          'name',
          'subscriber',
          'accountType',
          'type',
          'accountStatus',
          'status',
          'paymentStatus',
          'balance',
          'creditLimit',
          'highCredit',
          'utilization',
          'utilizationPercent',
          'opened',
          'openedDate',
          'dateOpened',
          'lastReported',
          'lastReportedDate',
          'monthsReviewed',
          'paymentHistory',
          'late30',
          'late60',
          'late90',
          'pastDue',
          'remarks',
          'bureau',
          'bureaus',
          'reportedBy',
          'isRevolving',
          'isInstallment',
          'category',
        ])
      )
    : accountsRaw;

  const negativesRaw = report.negatives || report.collections || report.publicRecords || [];
  const negatives = Array.isArray(negativesRaw)
    ? negativesRaw.slice(0, 30).map((n: any) =>
        pickKeys(n, ['type', 'creditor', 'name', 'amount', 'balance', 'status', 'date', 'bureau', 'bureaus'])
      )
    : negativesRaw;

  return {
    scores: safe(scores),
    summary: safe(summary),
    personal: safe(personal),
    inquiries,
    accounts,
    negatives,
  };
}

function normalizeFundingStrategyPayload(
  payload: any,
  availableCards: Array<{
    id: number;
    bank_name?: string;
    card_name: string;
    credit_bureaus?: string[];
  }>,
  compareUpTo: number,
) {
  const cardById = new Map(availableCards.map((card) => [Number(card.id), card]));
  const requestedIds: number[] = Array.isArray(payload?.recommended_card_ids)
    ? payload.recommended_card_ids.map((value: unknown) => Number(value)).filter((value: number) => Number.isFinite(value))
    : [];

  const recommendedIds: number[] = Array.from(new Set<number>(requestedIds))
    .filter((id) => cardById.has(id))
    .slice(0, Math.max(1, compareUpTo));

  const rawSteps = Array.isArray(payload?.steps) ? payload.steps : [];
  const steps = rawSteps
    .map((step: any, index: number) => {
      const parsedCardId = Number(step?.card_id);
      const matchedCard = Number.isFinite(parsedCardId) ? cardById.get(parsedCardId) : undefined;
      const title = String(step?.title || '').trim() || `Step ${index + 1}`;
      const detail = String(step?.detail || step?.reason || '').trim();
      const bureau = String(step?.bureau || '').trim() || null;
      const bankName = String(step?.bank_name || matchedCard?.bank_name || '').trim() || null;
      const cardName = String(step?.card_name || matchedCard?.card_name || '').trim() || null;

      if (!detail && !bankName && !cardName) {
        return null;
      }

      return {
        title,
        detail,
        card_id: matchedCard?.id ?? null,
        bureau,
        bank_name: bankName,
        card_name: cardName,
      };
    })
    .filter(Boolean);

  if (steps.length === 0 && recommendedIds.length > 0) {
    recommendedIds.forEach((id, index) => {
      const matchedCard = cardById.get(id);
      if (!matchedCard) return;
      steps.push({
        title: `Step ${index + 1}`,
        detail: `${matchedCard.bank_name || 'Selected bank'} ${matchedCard.card_name} matched the current report and eligible offer set.`,
        card_id: matchedCard.id,
        bureau: normalizeStringArray(matchedCard.credit_bureaus)[0] || null,
        bank_name: matchedCard.bank_name || null,
        card_name: matchedCard.card_name || null,
      });
    });
  }

  return {
    summary:
      String(payload?.summary || payload?.headline || payload?.overall_rationale || '').trim() ||
      'Claude ranked the available offers using the latest client report JSON.',
    overall_rationale: String(payload?.overall_rationale || payload?.rationale || '').trim() || null,
    recommended_card_ids: recommendedIds,
    recommended_bureaus: normalizeStringArray(payload?.recommended_bureaus || payload?.bureau_sequence || payload?.bureaus),
    steps,
    watchouts: normalizeStringArray(payload?.watchouts || payload?.warnings || payload?.risks),
    fallback: String(payload?.fallback || payload?.fallback_strategy || '').trim() || null,
  };
}

const FUNDING_STRATEGY_BUREAUS = ['Experian', 'Equifax', 'TransUnion'] as const;
type FundingStrategyBureau = (typeof FUNDING_STRATEGY_BUREAUS)[number];

function normalizeFundingStrategyBureau(value: unknown): FundingStrategyBureau | null {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'experian' || raw === 'exp') return 'Experian';
  if (raw === 'equifax' || raw === 'efx') return 'Equifax';
  if (raw === 'transunion' || raw === 'tu' || raw === 'tru') return 'TransUnion';
  return null;
}

function normalizeFundingStrategyBureaus(input: unknown): FundingStrategyBureau[] {
  const normalized: FundingStrategyBureau[] = [];
  for (const value of normalizeStringArray(input)) {
    const bureau = normalizeFundingStrategyBureau(value);
    if (bureau && !normalized.includes(bureau)) normalized.push(bureau);
  }
  return normalized;
}

// Parse Tier A cards emitted by the cloud AI between the
// `({RECOMMENDATIONS CARDS FORM THE AI START})` and `({RECOMMENDATIONS CARDS FORM THE AI END})`
// markers. Each card uses tags shaped like `({Variable_Name (value)})` where the value
// may itself contain parentheses. Returns the parsed cards plus the markdown with the
// recommendations block removed (so it isn't duplicated under the summary panel).
type AiCardPick = {
  rank: number;
  card_name: string;
  bank_name?: string;
  card_type?: string;
  apr?: string;
  annual_fee?: string;
  credit_limit_potential?: string;
  bureau?: string;
  application_timing?: string;
  reason?: string;
  inquiry_efficiency?: string;
};

function parseAiRecommendationCards(text: string): { picks: AiCardPick[]; remaining: string } {
  if (!text || typeof text !== 'string') return { picks: [], remaining: text || '' };
  const startMarker = '({RECOMMENDATIONS CARDS FORM THE AI START})';
  const endMarker = '({RECOMMENDATIONS CARDS FORM THE AI END})';
  const startIdx = text.indexOf(startMarker);
  const endIdx = text.indexOf(endMarker);
  if (startIdx < 0 || endIdx < 0 || endIdx <= startIdx) {
    return { picks: [], remaining: text };
  }

  const block = text.slice(startIdx + startMarker.length, endIdx);
  const remaining = (text.slice(0, startIdx) + text.slice(endIdx + endMarker.length))
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Scan the block for `({Name (value)})` tags. The inner value can contain
  // nested parentheses, so we balance them when extracting.
  type Tag = { name: string; value: string };
  const tags: Tag[] = [];
  let i = 0;
  while (i < block.length) {
    const open = block.indexOf('({', i);
    if (open < 0) break;
    let j = open + 2;
    while (j < block.length && block[j] !== '(') j++;
    if (j >= block.length) break;
    const name = block.slice(open + 2, j).trim();
    let depth = 1;
    let k = j + 1;
    while (k < block.length && depth > 0) {
      if (block[k] === '(') depth++;
      else if (block[k] === ')') {
        depth--;
        if (depth === 0) break;
      }
      k++;
    }
    if (depth !== 0) break;
    const value = block.slice(j + 1, k).trim();
    let m = k + 1;
    while (m < block.length && block[m] !== '}') m++;
    if (m >= block.length) break;
    const closeEnd = m + 2; // skip `})`
    if (name) tags.push({ name, value });
    i = closeEnd;
  }

  const fieldMap: Record<string, keyof AiCardPick> = {
    card_name: 'card_name',
    bank_name: 'bank_name',
    card_type: 'card_type',
    apr: 'apr',
    annual_fee: 'annual_fee',
    credit_limit_potential: 'credit_limit_potential',
    bureau: 'bureau',
    application_timing: 'application_timing',
    reason: 'reason',
    inquiry_efficiency: 'inquiry_efficiency',
  };

  const picks: AiCardPick[] = [];
  let current: AiCardPick | null = null;
  for (const tag of tags) {
    const key = fieldMap[tag.name.toLowerCase().replace(/\s+/g, '_')];
    if (!key) continue;
    if (key === 'card_name') {
      if (current) picks.push(current);
      current = { rank: picks.length + 1, card_name: tag.value };
    } else if (current) {
      (current as any)[key] = tag.value;
    }
  }
  if (current) picks.push(current);
  picks.forEach((pick, idx) => { pick.rank = idx + 1; });

  return { picks, remaining };
}

function buildLocalFundingStrategyPicks(options: {
  availableCards: Array<{
    id: number;
    bank_id?: number;
    bank_name?: string;
    card_name: string;
    card_type?: 'personal' | 'business';
    funding_type?: string;
    credit_bureaus?: string[];
  }>;
  goal: 'personal' | 'business' | 'both';
  compareUpTo: number;
  selectedState?: string;
  fundableBureaus?: string[];
  bureauPullCounts?: {
    Experian?: number;
    Equifax?: number;
    TransUnion?: number;
    total?: number;
  };
}) {
  const maxPicks = Math.max(1, Math.min(12, Number(options.compareUpTo) || 4));
  const requestedBureaus = normalizeFundingStrategyBureaus(options.fundableBureaus);
  const openBureausByCount = FUNDING_STRATEGY_BUREAUS.filter((bureau) => {
    const remaining = Number(options.bureauPullCounts?.[bureau]);
    return Number.isFinite(remaining) ? remaining > 0 : true;
  });
  const allowedBureaus = requestedBureaus.length > 0
    ? requestedBureaus.filter((bureau) => openBureausByCount.includes(bureau))
    : openBureausByCount;
  const candidateBureaus = allowedBureaus.length > 0 ? allowedBureaus : [...FUNDING_STRATEGY_BUREAUS];
  const bureauUsage = new Map<FundingStrategyBureau, number>(
    FUNDING_STRATEGY_BUREAUS.map((bureau) => [bureau, 0])
  );
  const goalPreference = options.goal === 'both' ? null : options.goal;

  const rankedCards = options.availableCards
    .map((card, index) => {
      const explicitBureaus = normalizeFundingStrategyBureaus(card.credit_bureaus);
      const normalizedBureaus = explicitBureaus.length > 0 ? explicitBureaus : [...FUNDING_STRATEGY_BUREAUS];
      const goalScore = goalPreference && card.card_type === goalPreference ? 0 : goalPreference ? 1 : 0;
      const bureauScore = normalizedBureaus.some((bureau) => candidateBureaus.includes(bureau)) ? 0 : 1;
      const dataScore = explicitBureaus.length > 0 ? 0 : 1;
      return {
        card,
        index,
        normalizedBureaus,
        goalScore,
        bureauScore,
        dataScore,
      };
    })
    .sort((left, right) => {
      if (left.goalScore !== right.goalScore) return left.goalScore - right.goalScore;
      if (left.bureauScore !== right.bureauScore) return left.bureauScore - right.bureauScore;
      if (left.dataScore !== right.dataScore) return left.dataScore - right.dataScore;
      return left.index - right.index;
    });

  const picks: Array<{
    id: number;
    rank: number;
    bureau: FundingStrategyBureau;
    reason: string;
  }> = [];

  for (const entry of rankedCards) {
    if (picks.length >= maxPicks) break;

    const bureauPool = entry.normalizedBureaus.filter((bureau) => candidateBureaus.includes(bureau));
    const preferredPool = bureauPool.length > 0 ? bureauPool : entry.normalizedBureaus;
    const chosenBureau = [...preferredPool].sort((left, right) => {
      const leftRemaining = Number(options.bureauPullCounts?.[left]);
      const rightRemaining = Number(options.bureauPullCounts?.[right]);
      const normalizedLeftRemaining = Number.isFinite(leftRemaining) ? leftRemaining : 1;
      const normalizedRightRemaining = Number.isFinite(rightRemaining) ? rightRemaining : 1;
      if (normalizedLeftRemaining !== normalizedRightRemaining) {
        return normalizedRightRemaining - normalizedLeftRemaining;
      }
      const leftUsage = bureauUsage.get(left) ?? 0;
      const rightUsage = bureauUsage.get(right) ?? 0;
      if (leftUsage !== rightUsage) return leftUsage - rightUsage;
      return FUNDING_STRATEGY_BUREAUS.indexOf(left) - FUNDING_STRATEGY_BUREAUS.indexOf(right);
    })[0] || 'Experian';

    bureauUsage.set(chosenBureau, (bureauUsage.get(chosenBureau) ?? 0) + 1);

    const reasonParts: string[] = [];
    if (goalPreference && entry.card.card_type === goalPreference) {
      reasonParts.push(`Strong ${goalPreference} fit`);
    } else if (!goalPreference && entry.card.card_type) {
      reasonParts.push(`Balanced ${entry.card.card_type} funding option`);
    } else {
      reasonParts.push('Eligible funding option');
    }
    reasonParts.push(`assigned to ${chosenBureau} based on current bureau-slot context`);
    if (options.selectedState) {
      reasonParts.push(`filtered for ${options.selectedState}`);
    }

    picks.push({
      id: entry.card.id,
      rank: picks.length + 1,
      bureau: chosenBureau,
      reason: `${reasonParts.join(', ')}.`,
    });
  }

  return picks;
}

const fundingStrategySchema = z.object({
  goal: z.enum(['personal', 'business', 'both']).default('both').optional(),
  clientId: z.number().int().positive(),
  report: z.record(z.any()).optional(),
  compareUpTo: z.number().int().min(1).max(12).default(4).optional(),
  selectedState: z.string().trim().max(50).optional(),
  fundableBureaus: z.array(z.string()).optional(),
  bureauPullCounts: z
    .object({
      Experian: z.number().optional(),
      Equifax: z.number().optional(),
      TransUnion: z.number().optional(),
      total: z.number().optional(),
    })
    .optional(),
  availableCards: z
    .array(
      z.object({
        id: z.number().int().positive(),
        bank_id: z.number().int().positive().optional(),
        bank_name: z.string().optional(),
        card_name: z.string(),
        card_type: z.enum(['personal', 'business']).optional(),
        funding_type: z.string().optional(),
        credit_bureaus: z.array(z.string()).optional(),
        recommended: z.boolean().optional(),
        priority_rank: z.number().optional(),
      })
    )
    .optional(),
});

// POST /api/ai/finmint-chat — secured AI chat endpoint
router.get(
  '/finmint-chat/history',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      await ensureEliteAiCoachAccess(req);
      await ensureGptChatHistoryTable();

      const db = getDatabaseAdapter();
      const rows = await db.executeQuery(
        'SELECT id, chat, chat_type, time FROM gpt_chat_history WHERE user_id = ? ORDER BY time ASC, id ASC',
        [req.user.id]
      );

      const messages = (Array.isArray(rows) ? rows : [])
        .map((row: any) => ({
          id: String(row.id),
          type: String(row.chat_type || '').toLowerCase() === 'user' ? 'user' : 'assistant',
          message: String(row.chat || ''),
          timestamp: normalizeChatHistoryTimestamp(row.time),
        }))
        .filter((message) => message.message.trim().length > 0);

      return res.json({ messages });
    } catch (error: any) {
      console.error('❌ FinMint AI chat history error:', error?.response?.data || error?.message || error);
      const status = error?.status || error?.response?.status || 500;
      return res.status(status).json({
        error: error?.status ? error.message : 'Failed to load AI chat history',
        details: error?.status ? undefined : error?.response?.data || undefined,
      });
    }
  }
);

router.get(
  '/finmint-chat/quota',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      await ensureEliteAiCoachAccess(req);

      const promptQuotaOwner = await resolveOpenAiPromptQuotaOwner(req);
      if (!promptQuotaOwner.ownerUserId) {
        return res.status(200).json({
          quota: {
            used: 0,
            limit: OPEN_AI_PROMPT_LIMIT,
            remaining: OPEN_AI_PROMPT_LIMIT,
            unlimited: false,
            resetAt: null,
            resetInDays: null,
            unlinked: true,
          },
        });
      }

      const promptBillingWindow = await resolveOpenAiPromptBillingWindow(promptQuotaOwner.ownerUserId);
      const currentPromptUsage = await readOpenAiPromptUsage(promptQuotaOwner.ownerUserId, promptBillingWindow);
      const purchasedPromptBalance = await readOpenAiPurchasedPromptBalance(promptQuotaOwner.ownerUserId);

      return res.json({
        quota: buildOpenAiPromptQuotaPayload(
          currentPromptUsage,
          promptQuotaOwner.unlimited,
          promptBillingWindow.resetAt,
          purchasedPromptBalance,
        ),
      });
    } catch (error: any) {
      console.error('❌ FinMint AI chat quota error:', error?.response?.data || error?.message || error);
      const status = error?.status || error?.response?.status || 500;
      return res.status(status).json({
        error: error?.status ? error.message : 'Failed to load AI chat quota',
        details: error?.status ? undefined : error?.response?.data || undefined,
      });
    }
  }
);

router.post(
  '/finmint-chat',
  authenticateToken,
  rateLimit({ windowMs: 60_000, maxRequests: 30, message: 'Too many AI requests, please try again in a minute' }),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id || !req.user.email) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      await ensureEliteAiCoachAccess(req);

      const parsed = chatRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
      }

      const promptQuotaOwner = await resolveOpenAiPromptQuotaOwner(req);
      if (!promptQuotaOwner.ownerUserId) {
        return res.status(403).json({ error: 'No account is linked for Open AI prompt tracking.' });
      }

      const promptBillingWindow = await resolveOpenAiPromptBillingWindow(promptQuotaOwner.ownerUserId);
      const currentPromptUsage = await readOpenAiPromptUsage(promptQuotaOwner.ownerUserId, promptBillingWindow);
      const purchasedPromptBalance = await readOpenAiPurchasedPromptBalance(promptQuotaOwner.ownerUserId);
      const freePromptsRemaining = Math.max(0, OPEN_AI_PROMPT_LIMIT - currentPromptUsage);
      const totalPromptsRemaining = freePromptsRemaining + purchasedPromptBalance;
      if (!promptQuotaOwner.unlimited && totalPromptsRemaining <= 0) {
        return res.status(402).json({
          error: `You have reached your prompt limit. Please purchase more prompts or wait until your free ${OPEN_AI_PROMPT_LIMIT} prompts reset.`,
          quota: buildOpenAiPromptQuotaPayload(
            currentPromptUsage,
            promptQuotaOwner.unlimited,
            promptBillingWindow.resetAt,
            purchasedPromptBalance,
          ),
        });
      }

      const { question, selectedClientReports } = parsed.data;
      const trimmedQuestion = question?.trim() || '';
      const openAiConfigurationTemplate = await getOpenAiConfigurationTemplate();

      if (!openAiConfigurationTemplate.trim()) {
        return res.status(400).json({
          error: 'Open AI configuration is empty. Please update it in Super Admin Settings.',
        });
      }

      const adminName = await resolveOpenAiConfigurationAdminName(req.user.id, req.user.email);
      const selectedClientLatestReportJson = selectedClientReports.length > 0
        ? JSON.stringify(selectedClientReports[0], null, 2)
        : '';
      const promptContent = renderOpenAiConfigurationTemplate(openAiConfigurationTemplate, {
        adminName,
        adminPrompt: trimmedQuestion,
        selectedClientLatestReportJson,
      });

      const messages: Array<{ role: string; content: string }> = promptContent
        ? [{ role: 'user', content: promptContent }]
        : [];

      if (messages.length < 1) {
        return res.status(400).json({
          error: 'Open AI configuration rendered to an empty prompt. Update the template or provide the required values.',
        });
      }

      const selectedClientsSummary = selectedClientReports.map((client) => client.clientName).join(', ');
      const historyContent = trimmedQuestion && selectedClientsSummary
        ? `${trimmedQuestion}\n\nSelected clients: ${selectedClientsSummary}`
        : trimmedQuestion || (selectedClientsSummary ? `Selected clients: ${selectedClientsSummary}` : '');

      if (historyContent) {
        await saveGptChatHistoryEntry(req.user.id, req.user.email, historyContent, 'user');
      }

      const result = await callFinMintChat(messages);

      // If OpenAI key is missing, the reply will be a graceful fallback
      if (!result.reply) {
        return res.status(502).json({ error: 'AI service returned no content' });
      }

      await saveGptChatHistoryEntry(req.user.id, req.user.email, result.reply, 'assistant');

      let updatedPromptUsage = currentPromptUsage;
      let updatedPurchasedPromptBalance = purchasedPromptBalance;
      if (!promptQuotaOwner.unlimited) {
        if (currentPromptUsage < OPEN_AI_PROMPT_LIMIT) {
          updatedPromptUsage = await incrementOpenAiPromptUsage(promptQuotaOwner.ownerUserId, promptBillingWindow);
        } else {
          updatedPurchasedPromptBalance = await decrementOpenAiPurchasedPromptBalance(promptQuotaOwner.ownerUserId);
        }
      }

      res.json({
        reply: result.reply,
        model: result.model,
        usage: result.usage,
        quota: buildOpenAiPromptQuotaPayload(
          updatedPromptUsage,
          promptQuotaOwner.unlimited,
          promptBillingWindow.resetAt,
          updatedPurchasedPromptBalance,
        ),
      });
    } catch (error: any) {
      console.error('❌ FinMint AI chat error:', error?.response?.data || error?.message || error);
      const status = error?.status || error?.response?.status || 500;
      return res.status(status).json({
        error: error?.status ? error.message : 'Failed to process AI chat request',
        details: error?.status ? undefined : error?.response?.data || undefined,
      });
    }
  }
);

router.post(
  '/letter-clause-generate',
  authenticateToken,
  requireRole('super_admin'),
  rateLimit({ windowMs: 60_000, maxRequests: 12, message: 'Too many AI clause generation requests, try again shortly' }),
  async (req: Request, res: Response) => {
    try {
      const parsed = clauseContentGenerateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
      }

      if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
        return res.status(503).json({ error: 'No AI provider is configured for clause generation' });
      }

      const { content, guide, variantExamples } = parsed.data;
      const systemPrompt =
        'You rewrite a single dispute-letter clause for an internal letter template editor. Return only raw HTML. Do not include markdown, explanations, or wrapper text. Preserve placeholder tokens exactly as provided. Keep the same intent, improve clarity and structure, and keep the result suitable for a dispute letter clause.';
      const examplesSection = variantExamples.length
        ? `\n\nHERE IS THE EXAMPLE OF THE FORMAT:\n${variantExamples
            .map((example, index) => `(${index + 1})\n${example}`)
            .join('\n\n')}\n\nUse the selected examples only as formatting/style references when useful. Do not copy facts that are not already present in the clause content.`
        : '';
      const userPrompt = `CLAUSE CONTENT INPUT:\n${content}${examplesSection}\n\nAI GUIDE:\n${guide}\n\nRewrite the clause above using the guide. Return only the final HTML for the clause content field.`;
      const messages: Array<{ role: string; content: string }> = [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ];

      let result: { reply: string; model: string; usage?: any };

      if (process.env.OPENAI_API_KEY) {
        try {
          result = await callOpenAIChat(messages);
        } catch (error: any) {
          const canFallbackToAnthropic = Boolean(process.env.ANTHROPIC_API_KEY) && error?.status === 503;
          if (!canFallbackToAnthropic) {
            throw error;
          }

          result = await callAnthropicMessage(systemPrompt, userPrompt);
        }
      } else {
        result = await callAnthropicMessage(systemPrompt, userPrompt);
      }

      const generatedContent = String(result.reply || '')
        .replace(/^```(?:html)?\s*/i, '')
        .replace(/```$/i, '')
        .trim();

      if (!generatedContent || result.model === 'fallback') {
        return res.status(502).json({ error: 'AI service returned no usable content' });
      }

      return res.json({ content: generatedContent, model: result.model, usage: result.usage });
    } catch (error: any) {
      console.error('❌ Letter clause generation error:', error?.response?.data || error?.message || error);
      const status = error?.status || error?.response?.status || 500;
      return res.status(status).json({
        error: error?.status ? error?.message : 'Failed to generate clause content',
        details: error?.status ? error?.message : error?.response?.data || undefined,
      });
    }
  }
);

// POST /api/ai/finmint-analyze-report — analyze a client's credit report JSON
router.post(
  '/finmint-analyze-report',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  rateLimit({ windowMs: 60_000, maxRequests: 20, message: 'Too many AI analysis requests, try again shortly' }),
  async (req: Request, res: Response) => {
    try {
      // Validate payload with Zod
      const analysisSchema = z.object({
        goal: z.enum(['credit', 'funding', 'both']).default('both').optional(),
        clientId: z.number().int().positive().optional(),
        report: z.record(z.any()).optional(),
      }).refine(data => !!data.report, {
        message: 'report is required (send latest client report JSON)',
        path: ['report'],
      });

      const parsed = analysisSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
      }

      const { goal = 'both', clientId, report } = parsed.data as { goal: 'credit'|'funding'|'both'; clientId?: number; report: Record<string, any> };

      // Specialized analysis prompt layered on top of FinMint guardrails
      const ANALYSIS_PROMPT = `${SYSTEM_PROMPT}\n\nYou are an expert U.S. Credit Underwriter and Credit Repair Analyst with 10+ years of professional experience. You understand Metro 2 formatting, credit bureau reporting rules, FCRA, credit score algorithms, utilization weighting, inquiry segmentation, and risk scoring. Your task is to analyze the provided structured credit report JSON and return clear, accurate insights.\n\nYou MUST:\n- Identify negative items correctly.\n- Explain WHY items are negative (late payments, charge-off, collection, high utilization, etc.).\n- Provide recommendations using U.S. credit repair strategy language.\n- Write in a friendly, professional tone at an 8th grade reading level.\n- Do NOT guess or add data that is not in the JSON. If something is missing, say "Not available in report".\n\nReturn your analysis in this exact format (use concise bullet points):\n\n1. **Credit Summary Overview**\n   - Total Accounts\n   - Open Accounts\n   - Closed Accounts\n   - Average Age of Credit\n   - Utilization %\n   - Number of Inquiries (past 12 months)\n   - Score Range (if available)\n\n2. **Negative Item Breakdown**\n   For EACH negative account, list:\n   - Creditor Name\n   - Account Type (Credit Card, Auto Loan, etc.)\n   - Status (Late, Charge-Off, Collection, Repossession, Bankruptcy, etc.)\n   - Date of First Delinquency (if available)\n   - Current Balance / Charged-off Amount\n   - Explanation of why this hurts the score\n   - Recommended dispute or resolution strategy\n\n3. **Positive Accounts & Strength Factors**\n   - Identify accounts helping score\n   - Age, payment history, and credit mix benefits\n\n4. **Utilization Analysis**\n   - Current utilization %\n   - Which accounts are high\n   - How much to pay down to improve score fastest\n\n5. **Inquiry Risk Assessment**\n   - List of inquiries by bureau\n   - Which ones are impacting score most\n   - Safe dispute or removal options (if applicable)\n\n6. **Score Improvement Plan (Step-by-Step)**\n   - What to dispute\n   - What to pay down first\n   - What new credit (if any) should be added\n   - Expected score increase estimate ranges\n\nIMPORTANT — Provide a machine-readable summary for UI cards:\nAfter the six sections, append a JSON block named STRUCTURED_JSON following this schema. Do NOT use code fences. Use null for unknown values, and compute metrics from the JSON data when possible.\n\n{\n  "scores": { "experian": number|null, "equifax": number|null, "transunion": number|null },\n  "metrics": {\n    "total_accounts": number|null,\n    "open_accounts": number|null,\n    "closed_accounts": number|null,\n    "average_age_months": number|null,\n    "revolving_utilization_pct": number|null\n  },\n  "negatives": [\n    {\n      "creditor": string,\n      "account_type": string|null,\n      "bureau": string|null,\n      "status": string|null,\n      "first_delinquency": string|null,\n      "balance": number|null,\n      "explanation": string,\n      "strategy": string\n    }\n  ],\n  "strengths": string[],\n  "inquiries": {\n    "count": number|null,\n    "recent_12_months": number|null,\n    "by_bureau": { "experian": number|null, "equifax": number|null, "transunion": number|null },\n    "list": Array<{ "creditor": string|null, "date": string|null, "bureau": string|null }>|null\n  },\n  "plan_steps": string[]\n}\n\nContext:\n- Goal: ${goal.toUpperCase()}\n- ClientId: ${clientId ?? 'N/A'}\n`;

      // Inject the JSON report. Keep message compact by stringifying.
      const reportJson = JSON.stringify(report);
      const messages: Array<{ role: string; content: string }> = [
        { role: 'system', content: ANALYSIS_PROMPT },
        { role: 'user', content: `Below is the user's credit report data in JSON format. Analyze it thoroughly and provide a full credit evaluation following the exact format above.\n\nJSON DATA:\n${reportJson}` },
      ];

      const result = await callOpenAIChat(messages);

      if (!result.reply) {
        return res.status(502).json({ error: 'AI service returned no content' });
      }

      // Attempt to extract structured JSON from the AI response
      const structured = extractStructuredJSON(result.reply);

      return res.json({
        analysis: result.reply,
        structured,
        model: result.model,
        usage: result.usage,
      });
    } catch (error: any) {
      console.error('❌ FinMint AI report analysis error:', error?.response?.data || error?.message || error);
      const status = error?.response?.status || 500;
      return res.status(status).json({
        error: 'Failed to analyze credit report',
        details: error?.response?.data || undefined,
      });
    }
  }
);

router.post(
  '/funding-diy-strategy',
  authenticateToken,
  requireRole('admin', 'super_admin', 'funding_manager', 'employee', 'user'),
  rateLimit({ windowMs: 60_000, maxRequests: 12, message: 'Too many AI funding strategy requests, try again shortly' }),
  async (req: Request, res: Response) => {
    try {
      const parsed = fundingStrategySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
      }

      const owner = await resolveAiQuotaOwnerId(req as AuthRequest);
      if (!owner.adminId) {
        return res.status(403).json({ error: 'No admin workspace is linked to this account, so AI-Matched cannot be used.' });
      }

      const currentUsed = await readAiUsage(owner.adminId);
      if (!owner.unlimited && currentUsed >= AI_FUNDING_FREE_QUOTA) {
        return res.status(402).json({
          error: `You have used all ${AI_FUNDING_FREE_QUOTA} free AI-Matched runs.`,
          quota: buildQuotaPayload(currentUsed, owner.unlimited),
        });
      }

      const {
        clientId,
        report,
        availableCards = [],
        goal = 'both',
        compareUpTo = 4,
        selectedState,
        fundableBureaus,
        bureauPullCounts,
      } = parsed.data;

      const hasReport = !!report && typeof report === 'object' && Object.keys(report).length > 0;
      const normalizedAvailableCards = Array.isArray(availableCards)
        ? availableCards
            .filter(
              (card): card is {
                id: number;
                bank_id?: number;
                bank_name?: string;
                card_name: string;
                card_type?: 'personal' | 'business';
                funding_type?: string;
                credit_bureaus?: string[];
              } => Number.isFinite(card?.id) && typeof card?.card_name === 'string' && card.card_name.trim().length > 0
            )
            .map((card) => ({
              id: Number(card.id),
              bank_id: card.bank_id,
              bank_name: card.bank_name,
              card_name: card.card_name,
              card_type: card.card_type,
              funding_type: card.funding_type,
              credit_bureaus: Array.isArray(card.credit_bureaus) ? card.credit_bureaus : undefined,
            }))
        : [];
      const localPicks = buildLocalFundingStrategyPicks({
        availableCards: normalizedAvailableCards,
        goal,
        compareUpTo,
        selectedState,
        fundableBureaus,
        bureauPullCounts,
      });

      const systemPrompt = `# COMPLETE CREDIT CARD MATCHING ENGINE PROMPT v2.7
## 30-Mile Radius HARD ENFORCED | Self-Contained Verification (No Live Lookup Needed) | 12-Card Maximum Strategy | Full Bureau Optimization | System-Variable Output | Top-of-Response Cards with START/END Markers | Verification Summary Only After END Marker

You are an AI-powered credit card application strategist. Your role is to analyze a client's credit report JSON and generate a precise, ranked list of credit card recommendations optimized for maximum funding access while minimizing hard inquiries across all three credit bureaus.

🚨 **HARD RULES — READ THESE FIRST:**

1. **30-Mile Radius Enforcement:** Every Category 1 (branch-relationship) card recommended MUST have a confirmed physical branch within 30 miles of the client's address from the JSON. NO EXCEPTIONS.
2. **No Live Verification Needed:** This prompt contains a complete hardcoded knowledge base in Step 4.5 (PERMANENT BLOCKLIST + per-state branch maps + built-in swap recommendations). You DO NOT need to access FDIC/NCUA/Google Maps. Use the hardcoded knowledge base in Step 4.5 to verify and swap cards.
3. **Permanent Blocklist:** Discover, Barclays US, Synchrony, and Citibank Maryland branches are PERMANENTLY blocked from Category 1. They MUST be either swapped (if branch-relationship is required) or correctly classified as Category 2 (Digital-Only Nationwide).
4. **No Hallucinating Branches:** Do NOT claim a bank has branches in a metro if the hardcoded knowledge base says it doesn't.

**CORE LOGIC:**

**1. Parse the JSON credit report** and extract:
- Personal credit score (FICO 8 preferred, note if VantageScore)
- Business credit score (if applicable)
- Current inquiries on each bureau: Experian (EXP), Equifax (EFX), TransUnion (TRU)
- Revolving accounts, balances, limits, and utilization percentage
- Payment history (any lates 30+, collections, charge-offs, maintenance fees)
- Account age and history length
- **Geographic location: Extract the client's CURRENT address (street + city + state + zip) from the JSON Address array (look for AddressType = "Current"). This address is the anchor point for the 30-mile radius. If multiple addresses exist, use the most recently reported current address.**
- List of current creditors and card types already on report

**2. Calculate remaining inquiry slots per bureau:**
- Maximum allowed per bureau: 4 inquiries
- Remaining slots per bureau = 4 minus current inquiries
- If any bureau has 4 inquiries, that bureau is locked out
- Total maximum applications: 12 cards across all three bureaus (4 per bureau max)

**3. Apply underwriting criteria filters (HARD STOPS):**
- Personal credit score: minimum 700
- Business credit score: minimum 730
- Revolving utilization: under 30 percent
- Minimum active accounts: 5 primary accounts
- Seasoning requirement: all accounts must be 2+ years old with good payment history
- Minimum credit limit per account: $5,000
- **Hard stops:** No late payments (30+ days), no collections, no charge-offs, no maintenance fees
- Flag if score differs 50+ points across bureaus for client awareness

**4. Geo-locate the client** using the address from the credit report:
- Define a **30-mile radius** from the client's CURRENT address (zip code anchor)
- Use the hardcoded knowledge base in Step 4.5 to identify which banks/credit unions have branches in the client's metro area
- Cast wide net: all institution types (big banks, regionals, credit unions, community banks, small nationals, fintechs)

---

## 🚨 STEP 4.5: HARDCODED VERIFICATION KNOWLEDGE BASE — USE THIS INSTEAD OF LIVE LOOKUP 🚨

**This is the SELF-CONTAINED verification system. Do NOT attempt to access external URLs. Use the facts below to classify and verify every recommended card.**

### A. CATEGORY CLASSIFICATION (memorize this list):

**CATEGORY 2 — DIGITAL-ONLY / NATIONAL CARD ISSUERS** (radius rule does NOT apply — always valid):
- **American Express** — No consumer branches anywhere; underwrites nationally
- **Discover** — 1 physical branch in US (Greenwood, DE); acquired by Capital One May 2025; treat all Discover cards as Category 2
- **Barclays US** — Zero consumer retail branches; exited US retail banking 1992; cards-only operation from Wilmington DE / Henderson NV
- **Synchrony** — Zero retail branches anywhere; private-label and co-branded card issuer only
- **Apple Card / GS Bank** — Goldman Sachs has no consumer branches
- **Alliant Credit Union** — 100% online, no branches
- **PenFed Credit Union** — Limited branches; treat as Category 2 unless verified branch within 30 miles via Section C
- **Fintechs** — SoFi, Upgrade, Petal, Deserve, Chime — all Category 2

**CATEGORY 1 — BRANCH-RELATIONSHIP ISSUERS** (radius rule applies — verify presence using Section B & C):
- Chase, Bank of America, Wells Fargo, U.S. Bank, PNC, Truist, M&T Bank, Citizens Bank, Fifth Third, Regions, Huntington, KeyBank, TD Bank, BMO, Capital One (in branch markets only)
- All credit unions WITH physical branches: Navy Federal, MECU, First Financial FCU, SECU MD, NASA FCU, Tower FCU, etc.
- Local community banks (Sandy Spring, First National Bank of PA, etc.)

### B. PERMANENT BLOCKLIST (NEVER include as Category 1, EVER):

These issuers have NO meaningful Category 1 branch presence anywhere relevant to the radius rule. If they appear, either reclassify as Category 2 OR swap entirely:

| Issuer | Status | What to Do |
|---|---|---|
| **Discover** | 1 branch nationwide (DE only) + acquired by Capital One 2025 | Reclassify as Category 2 OR swap entirely (avoid duplicating Capital One) |
| **Barclays US** | Zero consumer branches | Reclassify as Category 2 OR swap |
| **Synchrony** | Zero branches | Reclassify as Category 2 OR swap |
| **Citibank** (in non-Citi markets) | Only ~700 US branches in NYC/LA/SF/DC/Chicago/Miami/select TX | Reclassify as Category 2 OR swap if client is outside Citi markets |
| **U.S. Bank** (in non-USB markets) | Concentrated Midwest/West only | Swap if client is outside USB market (see Section C) |

### C. PER-STATE BRANCH PRESENCE MAP (CATEGORY 1 ISSUERS):

For each US state, here are the Category 1 banks/CUs with confirmed branch presence. Use the client's state from the JSON to match.

**MARYLAND (MD) — especially Baltimore metro / 21xxx zip codes:**
- ✅ Chase, Bank of America, Wells Fargo, PNC, Truist, M&T Bank, Capital One, BMO, TD Bank
- ✅ Credit Unions: Navy Federal, MECU of Baltimore, SECU of Maryland, First Financial FCU of Maryland, Tower FCU
- ❌ NO U.S. Bank in Baltimore metro (only Bethesda/Rockville DC suburbs)
- ❌ NO Citibank in Baltimore County (only Montgomery + Prince George's = DC suburbs)
- ❌ NO NASA FCU in Baltimore County (DC area only)
- ❌ NO PenFed in Baltimore (treat as Category 2)

**VIRGINIA (VA) — especially Northern VA / DC suburbs:**
- ✅ Chase, BofA, Wells Fargo, Capital One, PNC, Truist, TD Bank, M&T (Northern VA)
- ✅ Credit Unions: Navy Federal, PenFed (HQ McLean), NASA FCU
- ❌ NO U.S. Bank consumer branches in VA

**WASHINGTON DC:**
- ✅ Chase, BofA, Wells Fargo, Capital One, PNC, Truist, Citibank (limited), M&T
- ✅ Credit Unions: Navy Federal, PenFed, NASA FCU
- ❌ NO U.S. Bank

**NEW YORK (NY):**
- ✅ Chase, BofA, Wells Fargo, Capital One, Citibank, TD Bank, M&T, KeyBank, HSBC
- ❌ NO U.S. Bank (limited to a few NYC business locations)

**NEW JERSEY (NJ):**
- ✅ Chase, BofA, Wells Fargo, Capital One, PNC, TD Bank, Citizens, M&T, Valley National
- ❌ NO U.S. Bank

**PENNSYLVANIA (PA):**
- ✅ Chase, BofA, Wells Fargo, PNC, Citizens, Truist, M&T, First National Bank of PA, Huntington
- ❌ NO U.S. Bank in most PA markets

**FLORIDA (FL):**
- ✅ Chase, BofA, Wells Fargo, Truist, PNC, Citibank (Miami), Regions, Fifth Third
- ❌ Limited U.S. Bank presence

**TEXAS (TX):**
- ✅ Chase, BofA, Wells Fargo, Capital One, PNC, Truist, U.S. Bank (limited), Citibank (select cities), Frost Bank, Comerica
- ✅ TX-specific: Frost Bank, Plains Capital, Veritex

**CALIFORNIA (CA):**
- ✅ Chase, BofA, Wells Fargo, U.S. Bank, Citibank, Citizens (limited), Comerica, First Republic (now Chase)
- ✅ CA-specific: City National Bank, Bank of the West (now BMO)

**GEORGIA (GA):**
- ✅ Chase, BofA, Wells Fargo, Truist (HQ Charlotte but heavy GA presence), PNC, Regions, Synovus
- ❌ NO U.S. Bank consumer branches

**NORTH CAROLINA (NC):**
- ✅ Bank of America (HQ Charlotte), Truist (HQ Charlotte), Wells Fargo, PNC, First Citizens, First National Bank of PA
- ❌ Limited Chase presence; NO U.S. Bank

**SOUTH CAROLINA (SC):**
- ✅ BofA, Wells Fargo, Truist, PNC, First Citizens, South State Bank
- ❌ Limited Chase, NO U.S. Bank

**OHIO (OH):**
- ✅ Chase, Fifth Third, KeyBank, Huntington, PNC, U.S. Bank, BofA
- ✅ Credit Unions: Wright-Patt CU (heavy OH presence)

**MICHIGAN (MI):**
- ✅ Chase, Comerica, Huntington, PNC, Fifth Third, BofA (limited)
- ✅ Credit Unions: DCU, MSU FCU, Lake Michigan CU

**ILLINOIS (IL):**
- ✅ Chase, BofA, Citibank (Chicago), PNC, Fifth Third, Wintrust, U.S. Bank, BMO
- ✅ Credit Unions: Alliant (HQ Chicago — but online), Consumers CU

**MASSACHUSETTS (MA):**
- ✅ Chase, BofA, Citizens (HQ Providence), Santander, TD Bank, Eastern Bank
- ❌ Limited Wells Fargo, NO U.S. Bank

**WASHINGTON (WA):**
- ✅ Chase, BofA, Wells Fargo, U.S. Bank, KeyBank, Banner Bank, BECU (credit union)

**OREGON (OR):**
- ✅ Chase, BofA, Wells Fargo, U.S. Bank, KeyBank, Banner Bank, OnPoint CU

**MINNESOTA (MN):**
- ✅ U.S. Bank (HQ Minneapolis), Wells Fargo, BMO, TCF (now Huntington), Bremer Bank
- ❌ Limited Chase, NO Citibank consumer

**COLORADO (CO):**
- ✅ Chase, Wells Fargo, U.S. Bank, BofA, FirstBank, KeyBank
- ✅ Credit Unions: Bellco, Ent CU, Canvas CU

**ARIZONA (AZ):**
- ✅ Chase, BofA, Wells Fargo, U.S. Bank, BMO (former MUFG Union)

**MISSOURI (MO):**
- ✅ U.S. Bank (HQ-affiliate), Commerce Bank, Bank of America, Chase, Regions
- ✅ Credit Unions: Anheuser-Busch Employees CU

**NEVADA (NV):**
- ✅ Chase, BofA, Wells Fargo, U.S. Bank, Citibank (limited Vegas)
- ✅ Credit Unions: One Nevada CU

For states NOT listed above: Default to Chase, BofA, Wells Fargo as nationwide branch presence (verify locally), and note that U.S. Bank/Citibank/Capital One have limited national footprints.

### D. BUILT-IN SWAP RECOMMENDATIONS (when a Category 1 card fails verification):

When you remove a failing Category 1 card, replace it using the **same bureau** with a verified alternative from the client's state. Reference table for common swaps:

**If client is in MD/Baltimore metro:**
- ❌ Discover → ✅ M&T Bank Visa with Rewards (67 branches in metro)
- ❌ Citibank → ✅ SECU of Maryland Visa Signature (55 branches statewide, open MD membership)
- ❌ U.S. Bank → ✅ PNC Cash Rewards Visa Business (34 branches in metro)
- ❌ Barclays → ✅ Truist Enjoy Cash Credit Card (33 branches in metro)
- ❌ Synchrony → ✅ MECU Credit Union of Baltimore Visa (7+ branches in metro)
- ❌ NASA FCU → ✅ First Financial FCU of Maryland (Lutherville, ~8 miles)

**If client is in DC/Northern VA:**
- ❌ Discover → ✅ PenFed (HQ McLean — verify branch within 30 mi) OR Capital One (NoVA branches)
- ❌ Citibank → ✅ TD Bank or Capital One
- ❌ U.S. Bank → ✅ PNC or Truist or M&T (Northern VA)

**If client is in NY/NJ:**
- ❌ Discover → ✅ TD Bank or M&T Bank or Valley National
- ❌ U.S. Bank → ✅ Citibank (NY only) or M&T or Citizens

**If client is in CA:**
- ❌ Discover → ✅ Citibank (CA branches OK) or Comerica
- ❌ Barclays → ✅ Wells Fargo or U.S. Bank (CA OK)

**If client is in TX:**
- ❌ Discover → ✅ Frost Bank or Comerica
- ❌ U.S. Bank → ✅ Capital One (TX has branches) or Frost Bank

**If client is in FL:**
- ❌ Discover → ✅ Regions Bank or Fifth Third
- ❌ U.S. Bank → ✅ Truist or PNC

**For all other states:** Default swaps are Chase / BofA / Wells Fargo / PNC (these have the broadest national branch presence).

### E. FAIL-SAFE RULES (HARD ENFORCED):

- ❌ **REMOVE AND REPLACE:** If a Category 1 issuer is on the BLOCKLIST (Section B) or NOT listed for the client's state in Section C → REMOVE the card and substitute using Section D swap recommendations.
- ❌ **NEVER include Discover, Barclays, or Synchrony as Category 1.** They are permanently Category 2 or must be swapped entirely.
- ❌ **NEVER include U.S. Bank for clients in non-USB states** (MD-Baltimore, VA, DC, NJ, NC, SC, GA, MA — see Section C).
- ❌ **NEVER include Citibank as Category 1 outside Citi markets** (NY, LA, SF Bay, DC, Chicago, Miami, select TX). For Maryland Baltimore-area clients, Citibank is Category 2 only or swapped.
- ✅ **Category 2 IS valid:** Digital-only issuers don't need radius verification.

### F. VERIFICATION OUTPUT REQUIREMENT — SUMMARY ONLY:

**🚨 CRITICAL: Do NOT output a per-card Branch Verification Report. Do NOT list each card with branch addresses, distances, or Maps links after the END marker. The cards already appear inside the START/END block — repeating them is redundant.**

**INSTEAD, output ONLY a brief Verification Summary block immediately after the \`({RECOMMENDATIONS CARDS FORM THE AI END})\` marker.**

**Verification Summary Template (use this EXACT format — short, prose-only):**

\`\`\`
🔍 Verification Summary:
All [N] Category 1 issuers ([List names separated by commas]) verified for branch presence in the [client metro] area within 30 miles of [client zip] ✅. All [N] Category 2 issuers ([List names]) correctly flagged as Digital-Only Nationwide — radius rule does not apply ✅. Swaps made during verification: [Either "None — all originals verified" OR list swaps in format: "Original card → Replacement card (one-line reason)"].
\`\`\`

That's it. No tables. No 🏦 / 🌐 emoji blocks. No per-card addresses or Maps links after the END marker. Just the 3-bullet prose Verification Summary.

---

**5. Implement the inverse mix strategy:**
- **If client has 3+ big bank accounts on report:** Prioritize credit unions, regional banks, and community banks
- **If client has 3+ credit union accounts on report:** Prioritize big banks, regional banks, and small nationals
- **If client has 3+ regional bank accounts on report:** Prioritize big banks, credit unions, and small nationals
- Goal: Diversify funding sources across all three categories

**6. Leverage multi-card issuers (same-day stacking rules):**
- American Express: 4 cards on 1 hard inquiry (apply same day)
- Bank of America: 2 cards on 1 hard inquiry (apply same day)
- Capital One: pulls all 3 bureaus but can consolidate 2 applications into 1 pull
- Chase: can sometimes consolidate 2 applications (business + personal) on same day
- Any other multi-card issuers: research and apply same day to consolidate bureau hits

**7. Build the 12-card strategy** by bureau:
- **Per bureau:** Rank up to 4 cards by best-fit-first logic
- Best = longest 0% APR + best terms + best bureau match + lowest transfer fee
- Second = next best terms + balances out bureau usage + diversifies issuer
- Third = accounts for remaining inquiry slots + fills category gaps
- Fourth = last available slot + strategic institution type
- **Stacking plays:** Apply same-day cards together to consolidate bureau hits
- **Timing:** Spread applications across 30–60 days to avoid red flags
- **Verification gate (HARD ENFORCED):** Every Category 1 card must be confirmed via Section 4.5 Section C state map. NO EXCEPTIONS.

**8. Business vs. Personal weighting** (if client requests both):
- If "both" is selected: weight 3 business cards to 1 personal card
- If "business only": all available cards are business
- If "personal only": all available cards are personal

**9. Bureau safety rule (ABSOLUTE):**
- NEVER recommend a card that pulls a bureau at 4 inquiries
- If a bureau is locked, exclude ALL cards pulling that bureau
- Always favor cards pulling the two most-open bureaus first

---

## 🚨 CRITICAL RESPONSE STRUCTURE — MANDATORY ORDER 🚨

**Your response MUST follow this exact order. Cards ALWAYS come at the very TOP of the response — before any analysis, notes, or commentary. NEVER place cards in the middle or at the end.**

### REQUIRED RESPONSE ORDER:

**SECTION 1: START MARKER + TIER A CARDS** (very top of response — FIRST thing in the response)

⚠️ The response MUST begin with this exact marker on its own line as the very first content:

\`({RECOMMENDATIONS CARDS FORM THE AI START})\`

After the START marker, output all Tier A cards grouped by bureau in the mandatory variable format defined below.

⚠️ After the LAST card has been output, you MUST output this exact marker on its own line:

\`({RECOMMENDATIONS CARDS FORM THE AI END})\`

**SECTION 2: VERIFICATION SUMMARY** (immediately after END marker — MANDATORY, SHORT FORMAT)
- Use the Verification Summary template from Step 4.5 Section F
- 3-bullet prose summary only — NO per-card listings

**SECTION 3: CLIENT ANALYSIS**
- Client snapshot (name, location, score, inquiries summary)
- Inquiry slot calculation table
- Underwriting filter check
- Issuer mix diagnosis

**SECTION 4: STRATEGIC NOTES**
- Inverse mix strategy explanation
- Stacking opportunities identified
- Bureau allocation logic

**SECTION 5: TIER B — ALTERNATIVE OPTIONS** (prose format)
- 2–3 backup institutions per primary card (each backup MUST also be branch-verified per Section 4.5)
- 30-mile radius local options
- Distance, terms, key differentiator for each

**SECTION 6: TIER C — BONUS OPPORTUNITIES** (prose format)
- Soft-pull CLI opportunities on existing accounts
- Zero hard-pull fintech options
- Business credit parallel track suggestions
- Personal loan / line of credit complementary products

**SECTION 7: CLIENT AWARENESS FLAGS** (prose format — END of response)
- Score type discrepancies
- Disputed account remarks
- DTI / future underwriting concerns
- Address mismatches across bureaus
- Chase 5/24 status if applicable
- Recommended execution sequence (Day 1, Day 30, Day 60, Day 90)

---

## 🚨 CRITICAL OUTPUT FORMAT RULE FOR TIER A CARDS — DO NOT DEVIATE 🚨

**Every card recommendation in Tier A MUST be output in the EXACT system-variable format below. This is non-negotiable. Our system parses these variable tags — any deviation breaks the data ingestion.**

### MANDATORY CARD OUTPUT TEMPLATE:

\`\`\`
({Card_Name (FULL CARD NAME HERE)}) | ({Bank_Name (ISSUER NAME HERE)})
* ({Card_Type (CARD TYPE DESCRIPTION HERE)})
* ({APR (FULL 0% APR DETAILS OR "No 0% APR" WITH EXPLANATION HERE)})
* ({Annual_Fee (DOLLAR AMOUNT WITH ANY WAIVER NOTES HERE)})
* ({Credit_Limit_Potential (LOW–HIGH RANGE WITH ANY NOTES HERE)})
* ({Bureau (EXP / EFX / TRU)})
* ({Application_Timing (DAY X, STANDALONE OR STACKING NOTES HERE)})
* ({Reason (FULL REASONING PARAGRAPH EXPLAINING WHY THIS CARD FITS THE CLIENT)})
* ({Inquiry_Efficiency (X cards, Y bureau pull)})
\`\`\`

### EXAMPLE (THIS IS THE EXACT FORMAT TO USE):

\`\`\`
({Card_Name (American Express Gold Card®)}) | ({Bank_Name (American Express)})
* ({Card_Type (Personal Premium Business/Travel)})
* ({APR (No 0% APR (Amex charge card model — full balance due monthly))})
* ({Annual_Fee ($250 (waived first year for new cardholders in some cases))})
* ({Credit_Limit_Potential ($10,000–$50,000 (no preset limit))})
* ({Bureau (Experian)})
* ({Application_Timing (Day 30, same day as Amex Platinum (Amex can stack 2 cards on 1 pull))})
* ({Reason (You have existing Amex accounts ($3.5K and $13.5K balances). Gold Card offers 4x points on dining/travel, $120 annual dining credit, $100 annual Uber credit. Charge card model suits your excellent payment history. Consolidates with Platinum same-day.)})
* ({Inquiry_Efficiency (2 cards, 1 EXP pull)})
\`\`\`

### FORMATTING RULES (READ CAREFULLY):
1. EVERY single field MUST be wrapped in \`({Variable_Name (value)})\` — no exceptions
2. Do NOT use markdown bold, italics, or any other styling INSIDE the variable values
3. Do NOT split a card across multiple sections — each card is one complete block
4. Use the asterisk \`*\` bullet for each line of a card (except the first line which is the card name + bank)
5. The first line format is ALWAYS: \`({Card_Name (...)}) | ({Bank_Name (...)})\`
6. If a value contains parentheses, keep them inside the value — do not escape them
7. Output cards grouped by bureau with a clear bureau header before each group
8. Apply this format ONLY to TIER A cards. All other sections use normal prose format.

---

## TIER A CARD STRUCTURE (between START and END markers):

\`({RECOMMENDATIONS CARDS FORM THE AI START})\`

**🟦 EXPERIAN BUREAU (X slots available):**

[Card 1 in mandatory variable format]

[Card 2 in mandatory variable format]

[Card 3 in mandatory variable format]

[Card 4 in mandatory variable format]

**🟩 EQUIFAX BUREAU (X slots available):**

[Repeat variable format for up to 4 cards]

**🟧 TRANSUNION BUREAU (X slots available):**

[Repeat variable format for up to 4 cards]

\`({RECOMMENDATIONS CARDS FORM THE AI END})\`

---

## 🔍 VERIFICATION SUMMARY (appears IMMEDIATELY after END marker — SHORT PROSE FORMAT ONLY):

🔍 Verification Summary:
All [N] Category 1 issuers ([List names]) verified for branch presence in the [client metro] area within 30 miles of [client zip] ✅. All [N] Category 2 issuers ([List names]) correctly flagged as Digital-Only Nationwide — radius rule does not apply ✅. Swaps made during verification: [Either "None — all originals verified" OR list swaps].

⛔ DO NOT OUTPUT:
- ❌ "🔍 BRANCH VERIFICATION REPORT — 30-Mile Radius Confirmation" header
- ❌ "Client Address: ..." line
- ❌ Per-card 🏦 or 🌐 entries listing each card again with addresses
- ❌ Tables of cards with branch counts and Maps links

The cards are already shown inside the START/END block — there is NO need to list them again.

---

**11. Fallback logic** (if insufficient local options in 30-mile radius):
- Shift to regional/state-level banks and credit unions (use Section 4.5 Section C state map)
- Shift to national banks with strong state footprint (Chase, BofA, Wells Fargo are nationwide)
- Shift to national credit unions (Navy Federal, PenFed online tier, Alliant, DCU — verify branch presence per Section C or note as Category 2)
- Shift to national fintechs (Deserve, Upgrade, SoFi — Category 2, no branch needed)
- Always prioritize cards that pull open bureaus only

**12. Client awareness flags:**
- If any bureau has 4+ inquiries (locked)
- If credit score varies 50+ points across bureaus
- If client has fewer than 5 primary accounts
- If any negative marks are close to aging off
- If client is heavy on one institution type and needs diversification

---

## 🔒 FINAL ENFORCEMENT CHECKLIST (verify before delivering response):

- ✅ The response begins with \`({RECOMMENDATIONS CARDS FORM THE AI START})\` as the FIRST line — nothing comes before it
- ✅ Tier A cards appear immediately after the START marker, grouped by bureau
- ✅ Every Tier A card uses \`({Variable_Name (value)})\` syntax for ALL 9 fields
- ✅ No card is missing any of the 9 required variables
- ✅ Bureau headers (🟦 🟩 🟧) appear before each group of cards
- ✅ \`({RECOMMENDATIONS CARDS FORM THE AI END})\` appears immediately after the last card
- ✅ **Verification Summary** appears immediately after the END marker — SHORT prose-only format
- ✅ **NO Discover, Barclays, or Synchrony appear as Category 1** anywhere
- ✅ **NO U.S. Bank appears for clients in non-USB states** (Maryland, VA, DC, NJ, NC, SC, GA, MA, etc.)
- ✅ **NO Citibank appears as Category 1 outside Citi markets** (NY/LA/SF/DC/Chicago/Miami/select TX)
- ✅ Every Category 1 card has confirmed branch presence per Step 4.5 Section C state map
- ✅ All swaps made are documented in the Verification Summary
- ✅ Client Analysis follows immediately after the Verification Summary
- ✅ Tier B alternatives are also branch-verified per Section 4.5
- ✅ Tier B, Tier C, and all other sections use normal prose (NOT variable format)

If ANY of these checks fail, regenerate the response before delivering.

---

**INPUT:**
Paste the client's credit report JSON here.

**OUTPUT ORDER (MANDATORY):**
1. \`({RECOMMENDATIONS CARDS FORM THE AI START})\` marker (FIRST line of response)
2. Tier A Cards in variable format, grouped by bureau (only verified Category 1 + Category 2 cards per Step 4.5)
3. \`({RECOMMENDATIONS CARDS FORM THE AI END})\` marker (after last card)
4. **Short Verification Summary** (3-bullet prose only — no per-card breakdown)
5. Client Analysis
6. Strategic Notes
7. Tier B — Alternative Options (prose, all branch-verified per Step 4.5)
8. Tier C — Bonus Opportunities (prose)
9. Client Awareness Flags (prose — END of response)`;

      const prompt = (() => {
        // Per product requirement: cloud AI receives ONLY the system prompt and the
        // client's whole raw credit-report JSON. No compaction, no client context,
        // no extra instructions appended.
        if (hasReport) {
          return JSON.stringify(report);
        }
        return '{}';
      })();

      // If there's no credit report on file at all, skip the cloud AI entirely so the
      // strict v2.0 prompt can't emit a "CRITICAL DATA ISSUE" warning. Return a clean
      // local-only summary built from the client context + local picks.
      if (!hasReport) {
        const updatedUsed = owner.unlimited ? currentUsed : currentUsed; // no AI call → no quota burn
        const localSummaryParts: string[] = [];
        localSummaryParts.push('### Client Profile Summary');
        localSummaryParts.push('No stored credit report was found for this client, so the AI summary is skipped. Below is a strategy based on goal, state, and bureau-slot context only.');
        localSummaryParts.push('');
        localSummaryParts.push(`- **Goal:** ${goal}`);
        localSummaryParts.push(`- **State:** ${selectedState || 'not provided'}`);
        if (bureauPullCounts) {
          const bp = bureauPullCounts as Record<string, number | undefined>;
          localSummaryParts.push(`- **Bureau slots remaining:** Experian ${bp.Experian ?? '?'}, Equifax ${bp.Equifax ?? '?'}, TransUnion ${bp.TransUnion ?? '?'}`);
        }
        localSummaryParts.push('');
        localSummaryParts.push('Pull a fresh credit report for a precise, AI-driven Tier A/B/C strategy.');
        return res.json({
          strategy: {
            summary_markdown: localSummaryParts.join('\n'),
            picks: localPicks,
            watchouts: [],
          },
          raw: '',
          usage: null,
          quota: buildQuotaPayload(updatedUsed, owner.unlimited),
        });
      }

      const result = await callAnthropicMessage(systemPrompt, prompt);

      if (!result.reply) {
        return res.status(502).json({ error: 'AI returned no content' });
      }
      // Defensive scrub: if the model still emits the forbidden warning, strip it so the user
      // never sees that "CRITICAL DATA ISSUE" block.
      let cleaned = result.reply;
      const dataIssuePatterns = [
        /⚠️?\s*CRITICAL DATA ISSUE[\s\S]*?(?=\n\s*\n|\n#{1,6}\s|$)/gi,
        /\*?\*?CRITICAL DATA ISSUE\*?\*?[\s\S]*?(?=\n\s*\n|\n#{1,6}\s|$)/gi,
        /The credit report JSON is empty or malformed[\s\S]*?(?=\n\s*\n|\n#{1,6}\s|$)/gi,
      ];
      for (const re of dataIssuePatterns) cleaned = cleaned.replace(re, '').trim();

      // Extract Tier A cards from between the system-variable markers and
      // strip that block from the markdown summary so they aren't duplicated.
      const { picks: aiPicks, remaining: cleanedWithoutCards } = parseAiRecommendationCards(cleaned);
      const summaryMarkdown = (aiPicks.length > 0 ? cleanedWithoutCards : cleaned).trim();
      const finalPicks = aiPicks.length > 0 ? aiPicks : localPicks;

      const updatedUsed = owner.unlimited ? currentUsed : await incrementAiUsage(owner.adminId);

      return res.json({
        strategy: {
          summary_markdown: summaryMarkdown,
          picks: finalPicks,
          watchouts: [],
        },
        raw: '',
        usage: result.usage,
        quota: buildQuotaPayload(updatedUsed, owner.unlimited),
      });
    } catch (error: any) {
      console.error('❌ AI funding strategy error:', error?.response?.data || error?.message || error);
      const upstream = error?.response?.data?.error;
      const upstreamType = upstream?.type;
      const status = error?.status || error?.response?.status || 500;
      let friendly = 'Failed to generate funding strategy';
      if (status === 503) friendly = 'AI service is not configured';
      else if (status === 429 || upstreamType === 'rate_limit_error') {
        friendly = 'AI is busy right now (rate limit reached). Please wait a minute and try again.';
      } else if (upstreamType === 'overloaded_error') {
        friendly = 'AI service is temporarily overloaded. Please try again shortly.';
      }
      return res.status(status === 429 ? 429 : status).json({
        error: friendly,
      });
    }
  }
);

router.get(
  '/funding-diy-strategy/quota',
  authenticateToken,
  requireRole('admin', 'super_admin', 'funding_manager', 'employee', 'user'),
  async (req: Request, res: Response) => {
    try {
      const owner = await resolveAiQuotaOwnerId(req as AuthRequest);
      if (!owner.adminId) {
        return res.status(200).json({ quota: { used: 0, limit: AI_FUNDING_FREE_QUOTA, remaining: 0, unlimited: false, unlinked: true } });
      }
      const used = await readAiUsage(owner.adminId);
      return res.json({ quota: buildQuotaPayload(used, owner.unlimited) });
    } catch (error: any) {
      console.error('❌ Failed to read AI funding quota:', error?.message || error);
      return res.status(500).json({ error: 'Failed to read AI quota' });
    }
  }
);

export default router;