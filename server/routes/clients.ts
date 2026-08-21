import { Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { runQuery, getQuery, allQuery, getDatabaseAdapter } from '../database/databaseAdapter.js';
import { format } from 'date-fns';
import { executeTransaction } from '../database/mysqlConfig.js';
import { Client } from '../database/schema.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { validateClientQuota } from '../utils/planValidation.js';
import { checkClientCreationKyc, isKycDatabaseRejection, KYC_REQUIRED_RESPONSE } from '../utils/kyc.js';
import { ENV_CONFIG } from '../config/environment.js';
import { fetchCreditReport } from '../services/scrapers/index.js';
import { saveCreditReport } from '../database/dbConnection.js';
import crypto from 'crypto';
import { normalizeYearOnlyDob } from '../../shared/partialDob.js';
import {
  captureEquifaxSettlementScreenshot,
  clickEquifaxSettlementLivePreview,
  closeEquifaxSettlementLiveSession,
  focusEquifaxSettlementLiveSession,
  getEquifaxSettlementLivePreview,
  getEquifaxSettlementSavedScreenshotFile,
  getEquifaxSettlementLiveSessionState,
  saveEquifaxSettlementClientScreenshot,
  scrollEquifaxSettlementLivePreview,
  startEquifaxSettlementLiveSession,
} from '../services/equifaxSettlement.js';

// Validation schemas
const clientSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  street_number_and_name: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  country: z.string().optional(),
  ssn_last_four: z.string().optional(),
  ssn_last_six: z.string().optional(),
  security_freeze_pin: z.string().max(100).optional(),
  date_of_birth: z.string().optional(),
  employment_status: z.string().optional(),
  annual_income: z.union([z.number(), z.string()]).optional(),
  status: z.enum(['active', 'inactive', 'pending']).default('active'),
  credit_score: z.number().optional(),
  experian_score: z.number().optional(),
  equifax_score: z.number().optional(),
  transunion_score: z.number().optional(),
  previous_credit_score: z.number().optional(),
  notes: z.string().optional(),
  platform: z.enum(['creditkarma', 'creditwise', 'freecreditscore', 'experian', 'equifax', 'transunion', 'myfreescorenow', 'identityiq', 'myscoreiq', 'other']).optional(),
  platform_email: z.string().optional(),
  platform_password: z.string().optional(),
  fundable_status: z.enum(['fundable','not_fundable']).optional()
  ,fundable_in_tu: z.union([z.boolean(), z.number().int().min(0).max(1)]).optional()
  ,fundable_in_ex: z.union([z.boolean(), z.number().int().min(0).max(1)]).optional()
  ,fundable_in_eq: z.union([z.boolean(), z.number().int().min(0).max(1)]).optional()
});

const updateClientSchema = clientSchema.partial();
const clientIntakeSchema = z.object({
  platform: z.string().min(1),
  email: z.string().email('Invalid email format'),
  password: z.string().min(1),
  ssnLast4: z.string().optional()
});

function normalizeDateInput(input?: string | null): string | null {
  try {
    if (!input) return null;
    const s = String(input);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const t = s.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
    const d = new Date(s);
    if (!isNaN(d.getTime())) return format(d, 'yyyy-MM-dd');
  } catch {}
  return null;
}

function normalizeSlug(value: string) {
  const trimmed = String(value || '').trim().toLowerCase();
  if (!trimmed) return '';
  return trimmed
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeComparableValue(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

function isMissingClientIdDefault(error: any) {
  return error?.code === 'ER_NO_DEFAULT_FOR_FIELD'
    && String(error?.sqlMessage || error?.message || '').toLowerCase().includes("field 'id'");
}

async function executeClientInsert(connection: any, sql: string, params: any[]) {
  try {
    const [insertResult] = await connection.execute(sql, params);
    return insertResult;
  } catch (error: any) {
    if (!isMissingClientIdDefault(error)) {
      throw error;
    }

    console.warn('clients.id is missing AUTO_INCREMENT; using explicit transaction-scoped client id fallback');
    const [rows] = await connection.execute('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM clients FOR UPDATE');
    const nextId = Number(Array.isArray(rows) ? rows[0]?.next_id : rows?.next_id) || 1;
    const fallbackSql = sql.replace(/INSERT\s+INTO\s+clients\s*\(/i, 'INSERT INTO clients (id, ');

    if (fallbackSql === sql) {
      throw error;
    }

    const [insertResult] = await connection.execute(fallbackSql, [nextId, ...params]);
    return { ...(insertResult as any), insertId: nextId };
  }
}

async function logClientActivitySafely(options: {
  userId: number;
  clientId: number | string | null | undefined;
  activityType: 'create' | 'update' | 'delete';
  description: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  sessionId?: string | null;
}) {
  try {
    await runQuery(`
      INSERT INTO user_activities (user_id, activity_type, resource_type, resource_id, description, ip_address, user_agent, session_id)
      VALUES (?, ?, 'client', ?, ?, ?, ?, ?)
    `, [
      options.userId,
      options.activityType,
      options.clientId || null,
      options.description,
      options.ipAddress || null,
      options.userAgent || null,
      options.sessionId || null
    ]);
  } catch (error: any) {
    console.warn('Failed to log client user activity:', error?.message || error);
  }
}

function shouldReuseExistingScrapedClient(clientData: z.infer<typeof clientSchema>) {
  const normalizedEmail = normalizeComparableValue(clientData.platform_email || clientData.email);
  const normalizedPlatform = normalizeComparableValue(clientData.platform);
  const normalizedNotes = normalizeComparableValue(clientData.notes);
  return Boolean(
    normalizedEmail &&
    normalizedPlatform &&
    normalizedNotes.includes('credit report scraping')
  );
}

async function findExistingClientForAdminByPlatformEmail(adminId: number, options: { email?: string | null; platform?: string | null; }) {
  const normalizedEmail = normalizeComparableValue(options.email);
  const normalizedPlatform = normalizeComparableValue(options.platform);

  if (!adminId || !normalizedEmail || !normalizedPlatform) {
    return null;
  }

  return getQuery(
    `SELECT *
       FROM clients
      WHERE user_id = ?
        AND LOWER(TRIM(COALESCE(platform, ''))) = ?
        AND LOWER(TRIM(COALESCE(NULLIF(platform_email, ''), email, ''))) = ?
      ORDER BY updated_at DESC, id DESC
      LIMIT 1`,
    [adminId, normalizedPlatform, normalizedEmail]
  );
}

function buildReusedClientUpdates(existingClient: any, clientData: z.infer<typeof clientSchema>, actorUserId: number) {
  const updates: Record<string, any> = {
    updated_by: actorUserId,
  };

  const normalizedDateOfBirth = normalizeDateInput(clientData.date_of_birth);
  const mergedNotes = [existingClient?.notes, clientData.notes]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' | ');

  const overwriteIfProvided: Array<[string, any]> = [
    ['first_name', clientData.first_name],
    ['last_name', clientData.last_name],
    ['email', clientData.email],
    ['phone', clientData.phone],
    ['address', clientData.address],
    ['city', clientData.city],
    ['state', clientData.state],
    ['zip_code', clientData.zip_code],
    ['ssn_last_four', clientData.ssn_last_four],
    ['date_of_birth', normalizedDateOfBirth],
    ['employment_status', clientData.employment_status],
    ['annual_income', clientData.annual_income],
    ['credit_score', clientData.credit_score],
    ['experian_score', clientData.experian_score],
    ['equifax_score', clientData.equifax_score],
    ['transunion_score', clientData.transunion_score],
    ['previous_credit_score', clientData.previous_credit_score],
    ['platform', clientData.platform],
    ['platform_email', clientData.platform_email || clientData.email],
    ['platform_password', clientData.platform_password],
    ['fundable_status', clientData.fundable_status],
    ['fundable_in_tu', clientData.fundable_in_tu],
    ['fundable_in_ex', clientData.fundable_in_ex],
    ['fundable_in_eq', clientData.fundable_in_eq],
  ];

  for (const [field, value] of overwriteIfProvided) {
    if (value !== undefined && value !== null && value !== '') {
      updates[field] = value;
    }
  }

  if (mergedNotes && mergedNotes !== String(existingClient?.notes || '').trim()) {
    updates.notes = mergedNotes;
  }

  return updates;
}

function hasMatchingIdentityForMerge(existingClient: any, clientData: z.infer<typeof clientSchema>) {
  const existingFirstName = normalizeComparableValue(existingClient?.first_name);
  const existingLastName = normalizeComparableValue(existingClient?.last_name);
  const incomingFirstName = normalizeComparableValue(clientData.first_name);
  const incomingLastName = normalizeComparableValue(clientData.last_name);

  const existingHasPlaceholderName =
    !existingFirstName ||
    !existingLastName ||
    (existingFirstName === 'unknown' && existingLastName === 'client') ||
    (existingFirstName === 'first' && existingLastName === 'last');

  if (existingHasPlaceholderName && incomingFirstName && incomingLastName) {
    return true;
  }

  if (!existingFirstName || !existingLastName || !incomingFirstName || !incomingLastName) {
    return false;
  }

  if (existingFirstName !== incomingFirstName || existingLastName !== incomingLastName) {
    const existingSsn = normalizeComparableValue(existingClient?.ssn_last_four);
    const incomingSsn = normalizeComparableValue(clientData.ssn_last_four);
    const existingDob = normalizeComparableValue(normalizeDateInput(existingClient?.date_of_birth));
    const incomingDob = normalizeComparableValue(normalizeDateInput(clientData.date_of_birth));

    if ((existingSsn && incomingSsn && existingSsn === incomingSsn) || (existingDob && incomingDob && existingDob === incomingDob)) {
      return true;
    }

    return false;
  }

  const comparablePairs: Array<[string, string]> = [
    [String(existingClient?.ssn_last_four || ''), String(clientData.ssn_last_four || '')],
    [String(existingClient?.phone || ''), String(clientData.phone || '')],
    [String(existingClient?.date_of_birth || ''), String(normalizeDateInput(clientData.date_of_birth) || '')],
  ];

  for (const [existingValue, incomingValue] of comparablePairs) {
    const normalizedExisting = normalizeComparableValue(existingValue);
    const normalizedIncoming = normalizeComparableValue(incomingValue);
    if (normalizedExisting && normalizedIncoming && normalizedExisting !== normalizedIncoming) {
      return false;
    }
  }

  return true;
}

function hasConflictingPlatform(existingClient: any, clientData: z.infer<typeof clientSchema>) {
  const existingPlatform = normalizeComparableValue(existingClient?.platform);
  const incomingPlatform = normalizeComparableValue(clientData.platform);

  if (!existingPlatform || !incomingPlatform) {
    return false;
  }

  return existingPlatform !== incomingPlatform;
}

function canReuseVerifiedIntakeClient(existingClient: any, clientData: z.infer<typeof clientSchema>) {
  const existingEmail = normalizeComparableValue(existingClient?.email || existingClient?.platform_email);
  const incomingEmail = normalizeComparableValue(clientData.email || clientData.platform_email);
  if (!existingEmail || !incomingEmail || existingEmail !== incomingEmail) {
    return false;
  }

  const existingSsn = normalizeComparableValue(existingClient?.ssn_last_four);
  const incomingSsn = normalizeComparableValue(clientData.ssn_last_four);
  if (existingSsn && incomingSsn && existingSsn !== incomingSsn) {
    return false;
  }

  return true;
}

async function findExistingClientForAdminByEmail(adminId: number, email?: string | null) {
  const normalizedEmail = normalizeComparableValue(email);
  if (!adminId || !normalizedEmail) {
    return null;
  }

  return getQuery(
    `SELECT *
       FROM clients
      WHERE user_id = ?
        AND LOWER(TRIM(COALESCE(email, ''))) = ?
      ORDER BY updated_at DESC, id DESC
      LIMIT 1`,
    [adminId, normalizedEmail]
  );
}

async function getExistingUserColumns(): Promise<Set<string>> {
  const adapter = getDatabaseAdapter();

  if (adapter.getType() === 'sqlite') {
    const rows = await allQuery(`PRAGMA table_info(users)`);
    return new Set(
      (rows || []).map((row: any) => String(row?.name || row?.column_name || '').trim()).filter(Boolean)
    );
  }

  const rows = await allQuery(
    `SELECT COLUMN_NAME as column_name
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'`
  );

  return new Set(
    (rows || []).map((row: any) => String(row?.column_name || row?.COLUMN_NAME || '').trim()).filter(Boolean)
  );
}

async function resolveAdminIdFromIntake(tokenRaw: unknown, slugRaw: unknown): Promise<number> {
  const token = String(tokenRaw || '');
  const rawSlug = String(slugRaw || '').trim();
  const slug = normalizeSlug(rawSlug);

  if (token) {
    let payload: any;
    try {
      payload = jwt.verify(token, ENV_CONFIG.JWT_SECRET);
    } catch {
      throw new Error('Invalid or expired intake token');
    }
    if (!payload?.adminId || payload?.scope !== 'client_intake') {
      throw new Error('Invalid intake token scope');
    }
    return Number(payload.adminId);
  }

  if (rawSlug && !slug) {
    throw new Error('Invalid onboarding slug');
  }

  if (slug) {
    let adminRecord = await getQuery(
      "SELECT id FROM users WHERE onboarding_slug = ? AND role IN ('admin','super_admin') LIMIT 1",
      [slug]
    );

    if (!adminRecord?.id && /^\d+$/.test(rawSlug)) {
      adminRecord = await getQuery(
        "SELECT id FROM users WHERE id = ? AND role IN ('admin','super_admin') LIMIT 1",
        [Number(rawSlug)]
      );
    }

    if (!adminRecord?.id) {
      throw new Error('Onboarding link not found');
    }
    return Number(adminRecord.id);
  }

  throw new Error('Intake token required');
}

async function getClientEnrollmentSettings(adminId: number): Promise<{
  allowFreeEnrollment: boolean;
  clientPlans: Array<{
    id: number;
    name: string;
    description: string | null;
    price: number;
    billing_cycle: string;
    features: string[];
  }>;
  clientPlan: null | {
    id: number;
    name: string;
    price: number;
    billing_cycle: string;
  };
  adminPlan: null | {
    id: number;
    name: string;
    client_registration_mode: 'paid' | 'free';
    default_client_plan_id?: number | null;
  };
}> {
  const profile = await getQuery(
    `SELECT allow_free_client_enrollment
       FROM admin_profiles
      WHERE user_id = ?
      LIMIT 1`,
    [adminId]
  );

  const allowFreeFromProfile = Number(profile?.allow_free_client_enrollment ?? 0) === 1 || profile?.allow_free_client_enrollment === true;

  const adminPlan = await getQuery(
    `SELECT sp.id, sp.name, sp.client_registration_mode, sp.default_client_plan_id
       FROM subscriptions s
       JOIN subscription_plans sp
         ON sp.name = s.plan_name
        AND sp.plan_category = 'admin'
        AND (sp.billing_cycle = s.plan_type OR sp.billing_cycle = 'monthly')
      WHERE s.user_id = ?
        AND LOWER(TRIM(COALESCE(s.status, ''))) = 'active'
      ORDER BY s.updated_at DESC, s.created_at DESC, sp.sort_order ASC
      LIMIT 1`,
    [adminId]
  );

  if (allowFreeFromProfile || String(adminPlan?.client_registration_mode || '').toLowerCase() === 'free') {
    return {
      allowFreeEnrollment: true,
      clientPlans: [],
      clientPlan: null,
      adminPlan: adminPlan ? {
        id: Number(adminPlan.id),
        name: String(adminPlan.name || ''),
        client_registration_mode: 'free',
        default_client_plan_id: adminPlan.default_client_plan_id ? Number(adminPlan.default_client_plan_id) : null,
      } : null,
    };
  }

  const planRows = await allQuery(
    `SELECT id, name, description, price, billing_cycle, features
       FROM subscription_plans
      WHERE plan_category = 'client'
        AND is_active = TRUE
        AND billing_cycle IN ('monthly', 'yearly')
      ORDER BY sort_order ASC, created_at ASC`
  );
  const clientPlans = (Array.isArray(planRows) ? planRows : []).map((plan: any) => ({
    id: Number(plan.id),
    name: String(plan.name || ''),
    description: plan.description ? String(plan.description) : null,
    price: Number(plan.price || 0),
    billing_cycle: String(plan.billing_cycle || 'monthly'),
    features: (() => {
      try {
        const parsed = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features;
        return Array.isArray(parsed) ? parsed.map((feature: any) => String(feature)) : [];
      } catch {
        return [];
      }
    })(),
  }));
  const clientPlan = clientPlans[0] || null;

  return {
    allowFreeEnrollment: false,
    clientPlans,
    clientPlan,
    adminPlan: adminPlan ? {
      id: Number(adminPlan.id),
      name: String(adminPlan.name || ''),
      client_registration_mode: 'paid',
      default_client_plan_id: adminPlan.default_client_plan_id ? Number(adminPlan.default_client_plan_id) : null,
    } : null,
  };
}

function fallbackNameFromEmail(email: string) {
  const emailLocal = (email || '').split('@')[0] || '';
  const parts = emailLocal.replace(/[^a-zA-Z._\-\s]/g, ' ').split(/[._\-\s]+/).filter(Boolean);
  const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  if (parts.length >= 2) {
    return { firstName: cap(parts[0]), lastName: cap(parts[1]) };
  }
  if (parts.length === 1) {
    return { firstName: cap(parts[0]), lastName: "Unknown" };
  }
  return { firstName: "Unknown", lastName: "Client" };
}

function parsePositiveInteger(value: any): number {
  const parsed = parseInt(String(value ?? '').replace(/[^\d]/g, ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function asArray<T = any>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

function cleanNamePart(value: any): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function titleCaseName(value: string): string {
  return cleanNamePart(value)
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function getIdentityIqBundleComponents(rawData: any): any[] {
  const bundle = rawData?.BundleComponents?.BundleComponent
    || rawData?.BundleComponent
    || rawData?.TrueLinkCreditReportType?.BundleComponents?.BundleComponent
    || rawData?.rawCreditData?.BundleComponents?.BundleComponent;
  return asArray(bundle);
}

function extractIdentityIqBorrowerName(rawData: any): { firstName: string; lastName: string } {
  const components = getIdentityIqBundleComponents(rawData);
  const candidates: Array<{ firstName: string; lastName: string; isPrimary: boolean }> = [];

  const collectFromBorrowerName = (borrowerName: any) => {
    asArray(borrowerName).forEach((entry: any) => {
      const name = entry?.Name || entry;
      const firstName = cleanNamePart(name?.['@first'] || name?.FirstName || name?.first);
      const lastName = cleanNamePart(name?.['@last'] || name?.LastName || name?.last);
      if (!firstName && !lastName) return;

      const typeText = String(
        entry?.NameType?.['@description'] ||
        entry?.NameType?.['@abbreviation'] ||
        entry?.NameType ||
        ''
      ).toLowerCase();
      candidates.push({
        firstName,
        lastName,
        isPrimary: typeText.includes('primary')
      });
    });
  };

  components.forEach((component) => {
    collectFromBorrowerName(component?.Borrower?.BorrowerName);
    collectFromBorrowerName(component?.TrueLinkCreditReportType?.Borrower?.BorrowerName);
  });
  collectFromBorrowerName(rawData?.Borrower?.BorrowerName || rawData?.BorrowerName);

  const selected = candidates.find((candidate) => candidate.isPrimary) || candidates[0];
  return {
    firstName: titleCaseName(selected?.firstName || ''),
    lastName: titleCaseName(selected?.lastName || '')
  };
}

function extractIdentityIqBorrowerDob(rawData: any): string {
  const components = getIdentityIqBundleComponents(rawData);
  for (const component of components) {
    const borrower = component?.Borrower || component?.TrueLinkCreditReportType?.Borrower;
    const births = asArray(borrower?.Birth);
    for (const birth of births) {
      const value = birth?.['@date'] || birth?.['@birthDate'] || birth?.Date || birth?.DOB || birth;
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
  }
  return '';
}

function extractIdentityIqBorrowerAddress(rawData: any): { address: string; city: string; state: string; zipCode: string } {
  const components = getIdentityIqBundleComponents(rawData);
  for (const component of components) {
    const borrower = component?.Borrower || component?.TrueLinkCreditReportType?.Borrower;
    const addresses = asArray(borrower?.BorrowerAddress);
    for (const entry of addresses) {
      const creditAddress = entry?.CreditAddress || entry;
      const address = cleanNamePart(
        creditAddress?.['@unparsedStreet'] ||
        [
          creditAddress?.['@houseNumber'],
          creditAddress?.['@direction'],
          creditAddress?.['@streetName'],
          creditAddress?.['@streetType'],
          creditAddress?.['@unit']
        ].filter(Boolean).join(' ')
      );
      const city = cleanNamePart(creditAddress?.['@city'] || creditAddress?.City);
      const state = cleanNamePart(creditAddress?.['@stateCode'] || creditAddress?.State);
      const zipCode = cleanNamePart(creditAddress?.['@postalCode'] || creditAddress?.Zip);
      if (address || city || state || zipCode) {
        return { address, city, state, zipCode };
      }
    }
  }

  return { address: '', city: '', state: '', zipCode: '' };
}

function getMyScoreIqRawReports(rawData: any): any[] {
  if (Array.isArray(rawData?.data)) return rawData.data;
  if (Array.isArray(rawData?.rawCreditData?.data)) return rawData.rawCreditData.data;
  return [];
}

function extractMyScoreIqBorrowerName(rawData: any): { firstName: string; lastName: string } {
  for (const report of getMyScoreIqRawReports(rawData)) {
    for (const name of asArray(report?.names)) {
      const firstName = cleanNamePart(name?.first_name || name?.FirstName || name?.first);
      const lastName = cleanNamePart(name?.last_name || name?.LastName || name?.last);
      if (firstName || lastName) {
        return {
          firstName: titleCaseName(firstName),
          lastName: titleCaseName(lastName)
        };
      }
    }
  }

  return { firstName: '', lastName: '' };
}

function extractMyScoreIqBorrowerDob(rawData: any): string {
  for (const report of getMyScoreIqRawReports(rawData)) {
    if (report?.date_of_birth) return String(report.date_of_birth);
    if (report?.dob) return String(report.dob);
    if (report?.year_of_birth) return normalizeYearOnlyDob(report.year_of_birth);
  }
  return '';
}

function extractMyScoreIqBorrowerAddress(rawData: any): { address: string; city: string; state: string; zipCode: string } {
  for (const report of getMyScoreIqRawReports(rawData)) {
    for (const rawAddress of asArray(report?.addresses)) {
      const address = cleanNamePart([
        rawAddress?.house_number,
        rawAddress?.pre_directional,
        rawAddress?.street_name,
        rawAddress?.suffix,
        rawAddress?.post_directional,
        rawAddress?.unit
      ].filter(Boolean).join(' '));
      const city = cleanNamePart(rawAddress?.city);
      const state = cleanNamePart(rawAddress?.state);
      const zipCode = cleanNamePart(rawAddress?.zipcode || rawAddress?.zip_code || rawAddress?.zip);
      if (address || city || state || zipCode) {
        return { address, city, state, zipCode };
      }
    }
  }

  return { address: '', city: '', state: '', zipCode: '' };
}

function parseMyScoreIqRawScore(report: any): number {
  const directScore = parsePositiveInteger(report?.score || report?.credit_score || report?.fico_score);
  if (directScore) return directScore;

  const scoreDetail = Array.isArray(report?.score_details) ? report.score_details[0] : report?.score_details;
  const scoreDetailValue = parsePositiveInteger(scoreDetail?.score);
  if (scoreDetailValue) return scoreDetailValue;

  const rawContent = report?.credit_score_content?.content
    || report?.credit_score_content
    || scoreDetail?.credit_score_content?.content
    || scoreDetail?.credit_score_content;
  if (rawContent) {
    try {
      const content = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
      return parsePositiveInteger(content?.score);
    } catch {}
  }

  return 0;
}

function extractMyScoreIqScores(rawData: any): { experianScore: number; equifaxScore: number; transunionScore: number } {
  const scores = { experianScore: 0, equifaxScore: 0, transunionScore: 0 };
  for (const report of getMyScoreIqRawReports(rawData)) {
    const bureau = String(report?.bureau || '').toLowerCase();
    const score = parseMyScoreIqRawScore(report);
    if (!score) continue;
    if (bureau.includes('experian')) scores.experianScore = score;
    if (bureau.includes('equifax')) scores.equifaxScore = score;
    if (bureau.includes('transunion')) scores.transunionScore = score;
  }
  return scores;
}

function extractClientFromReport(rawReport: any, email: string, allowEmailFallback = true) {
  const reportData = rawReport?.reportData || rawReport;
  const rawCreditData = rawReport?.rawCreditData || rawReport?.raw_credit_data || null;
  const scoreFallback = rawReport?.scores || null;
  let firstName = "";
  let lastName = "";
  let dateOfBirth = "";
  let address = "";
  let city = "";
  let state = "";
  let zipCode = "";
  let creditScore = 0;
  let experianScore = 0;
  let equifaxScore = 0;
  let transunionScore = 0;

  if (reportData?.Name && Array.isArray(reportData.Name) && reportData.Name.length > 0) {
    const primaryName = reportData.Name.find((name: any) => name.NameType === "Primary") || reportData.Name[0];
    firstName = primaryName?.FirstName || "";
    lastName = primaryName?.LastName || "";
  }

  if (!firstName && !lastName) {
    const rawName = extractIdentityIqBorrowerName(rawCreditData || reportData);
    firstName = rawName.firstName;
    lastName = rawName.lastName;
  }

  if (!firstName && !lastName) {
    const rawName = extractMyScoreIqBorrowerName(rawCreditData || reportData);
    firstName = rawName.firstName;
    lastName = rawName.lastName;
  }

  if (reportData?.DOB && Array.isArray(reportData.DOB) && reportData.DOB.length > 0) {
    dateOfBirth = reportData.DOB[0]?.DOB || "";
  }

  if (!dateOfBirth) {
    dateOfBirth = extractIdentityIqBorrowerDob(rawCreditData || reportData);
  }

  if (!dateOfBirth) {
    dateOfBirth = extractMyScoreIqBorrowerDob(rawCreditData || reportData);
  }

  if (reportData?.Address && Array.isArray(reportData.Address) && reportData.Address.length > 0) {
    const currentAddress = reportData.Address.find((addr: any) => addr.AddressType === "Current") || reportData.Address[0];
    address = currentAddress?.StreetAddress || "";
    city = currentAddress?.City || "";
    state = currentAddress?.State || "";
    zipCode = currentAddress?.Zip || "";
  }

  if (!address && !city && !state && !zipCode) {
    const rawAddress = extractIdentityIqBorrowerAddress(rawCreditData || reportData);
    address = rawAddress.address;
    city = rawAddress.city;
    state = rawAddress.state;
    zipCode = rawAddress.zipCode;
  }

  if (!address && !city && !state && !zipCode) {
    const rawAddress = extractMyScoreIqBorrowerAddress(rawCreditData || reportData);
    address = rawAddress.address;
    city = rawAddress.city;
    state = rawAddress.state;
    zipCode = rawAddress.zipCode;
  }

  if (reportData?.Score && Array.isArray(reportData.Score) && reportData.Score.length > 0) {
    reportData.Score.forEach((scoreData: any) => {
      const score = parseInt(scoreData?.Score, 10);
      if (score && score > 0) {
        switch (scoreData?.BureauId) {
          case 1:
            transunionScore = score;
            break;
          case 2:
            experianScore = score;
            break;
          case 3:
            equifaxScore = score;
            break;
        }
      }
    });
    creditScore = Math.max(experianScore, equifaxScore, transunionScore);
  }

  if (!creditScore && scoreFallback && typeof scoreFallback === 'object') {
    experianScore = parsePositiveInteger(scoreFallback.experian) || experianScore;
    equifaxScore = parsePositiveInteger(scoreFallback.equifax) || equifaxScore;
    transunionScore = parsePositiveInteger(scoreFallback.transunion) || transunionScore;
    creditScore = Math.max(experianScore, equifaxScore, transunionScore);
  }

  if (!creditScore) {
    const rawScores = extractMyScoreIqScores(rawCreditData || reportData);
    experianScore = rawScores.experianScore || experianScore;
    equifaxScore = rawScores.equifaxScore || equifaxScore;
    transunionScore = rawScores.transunionScore || transunionScore;
    creditScore = Math.max(experianScore, equifaxScore, transunionScore);
  }

  const verifiedReportName = Boolean(firstName || lastName);

  if (!verifiedReportName && allowEmailFallback) {
    const fallback = fallbackNameFromEmail(email);
    firstName = fallback.firstName;
    lastName = fallback.lastName;
  }

  return {
    firstName,
    lastName,
    dateOfBirth,
    address,
    city,
    state,
    zipCode,
    creditScore,
    experianScore,
    equifaxScore,
    transunionScore,
    verifiedReportName
  };
}

function resolveReportData(scraperResult: any) {
  return scraperResult?.reportData?.reportData
    || scraperResult?.reportData
    || scraperResult?.data?.reportData
    || scraperResult?.data
    || scraperResult?.report?.reportData
    || scraperResult?.report
    || null;
}

function cleanupIntakeScrapedArtifact(filePathValue: any) {
  const rawPath = String(filePathValue || '').trim();
  if (!rawPath) return;

  try {
    const outputDir = path.resolve(process.cwd(), 'scraper-output');
    const resolvedPath = path.resolve(process.cwd(), rawPath);
    if (!resolvedPath.startsWith(outputDir + path.sep)) {
      return;
    }
    if (fs.existsSync(resolvedPath)) {
      fs.unlinkSync(resolvedPath);
    }
  } catch (cleanupError: any) {
    console.warn('Failed to remove invalid intake scrape artifact:', cleanupError?.message || cleanupError);
  }
}

// Get all clients for the authenticated user (or all clients for funding managers)
export async function getClients(req: AuthRequest, res: Response) {
  try {
    const { page = 1, limit = 50, search, status } = req.query;
    
    // Determine base visibility: funding managers see all; admins see their own;
    // employees (role 'user' or 'funding_manager' when created) should see their admin's clients
    let query = 'SELECT * FROM clients';
    let params: any[] = [];

    // Resolve base user context for non-funding_manager users
    let baseUserId: number | null = null;
    const isFundingManager = req.user!.role === 'funding_manager';

    if (!isFundingManager) {
      // Admins/super_admins view their own clients
      if (req.user!.role === 'admin' || req.user!.role === 'super_admin') {
        baseUserId = req.user!.id;
      } else {
        // Try to resolve employee → admin mapping
        const employeeLink = await getQuery(
          'SELECT admin_id FROM employees WHERE user_id = ? AND status = ? ORDER BY updated_at DESC LIMIT 1',
          [req.user!.id, 'active']
        );
        if (employeeLink?.admin_id) {
          baseUserId = employeeLink.admin_id;
        } else {
          // Fallback to the user's own ID (legacy behavior)
          baseUserId = req.user!.id;
        }
      }
    }

    const hasBaseFilter = !isFundingManager;
    if (hasBaseFilter && baseUserId !== null) {
      query += ' WHERE (user_id = ? OR user_id IN (SELECT user_id FROM employees WHERE admin_id = ? AND status = ?))';
      params.push(baseUserId, baseUserId, 'active');
    }
    
    // Add filters
    if (status) {
      query += hasBaseFilter ? ' AND status = ?' : ' WHERE status = ?';
      params.push(status as string);
    }
    
    if (search) {
      const searchCondition = ' (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
      if (!hasBaseFilter && !status) {
        query += ' WHERE' + searchCondition;
      } else {
        query += ' AND' + searchCondition;
      }
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }
    
    // Add pagination
    const offset = (Number(page) - 1) * Number(limit);
    const limitNum = Number(limit);
    query += ` ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
    // Note: LIMIT and OFFSET cannot use parameter placeholders in MySQL
    
    const clients = await allQuery(query, params);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM clients';
    let countParams: any[] = [];

    if (hasBaseFilter && baseUserId !== null) {
      countQuery += ' WHERE (user_id = ? OR user_id IN (SELECT user_id FROM employees WHERE admin_id = ? AND status = ?))';
      countParams.push(baseUserId, baseUserId, 'active');
    }
    
    if (status) {
      countQuery += hasBaseFilter ? ' AND status = ?' : ' WHERE status = ?';
      countParams.push(status as string);
    }
    
    if (search) {
      const searchCondition = ' (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
      if (!hasBaseFilter && !status) {
        countQuery += ' WHERE' + searchCondition;
      } else {
        countQuery += ' AND' + searchCondition;
      }
      const searchParam = `%${search}%`;
      countParams.push(searchParam, searchParam, searchParam);
    }
    
    const countResult = await getQuery(countQuery, countParams);
    const total = countResult?.total || 0;
    
    res.json({
      clients,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get a specific client
export async function getClient(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const requestedClientId = Number(id);

    if (req.user!.role === 'client') {
      if (!Number.isFinite(requestedClientId) || requestedClientId !== Number(req.user!.id)) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const client = await getQuery('SELECT * FROM clients WHERE id = ?', [requestedClientId]);

      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      return res.json(client);
    }
    
    // Resolve admin context for employees to allow viewing their admin's client
    let baseUserId: number = req.user!.id;
    const isFundingManager = req.user!.role === 'funding_manager';
    if (!isFundingManager && req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
      const employeeLink = await getQuery(
        'SELECT admin_id FROM employees WHERE user_id = ? AND status = ? ORDER BY updated_at DESC LIMIT 1',
        [req.user!.id, 'active']
      );
      if (employeeLink?.admin_id) {
        baseUserId = employeeLink.admin_id;
      }
    }

    const client = await getQuery(
      isFundingManager
        ? 'SELECT * FROM clients WHERE id = ?'
        : 'SELECT * FROM clients WHERE id = ? AND (user_id = ? OR user_id IN (SELECT user_id FROM employees WHERE admin_id = ? AND status = ?))',
      isFundingManager ? [id] : [id, baseUserId, baseUserId, 'active']
    );
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    res.json(client);
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Create a new client
export async function createClient(req: AuthRequest, res: Response) {
  try {
    const clientData = clientSchema.parse(req.body);
    let baseUserId: number = req.user!.id;
    const isFundingManager = req.user!.role === 'funding_manager';
    if (!isFundingManager && req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
      const employeeLink = await getQuery(
        'SELECT admin_id FROM employees WHERE user_id = ? AND status = ? ORDER BY updated_at DESC LIMIT 1',
        [req.user!.id, 'active']
      );
      if (employeeLink?.admin_id) {
        baseUserId = employeeLink.admin_id;
      }
    }

    const enrollmentSettings = await getClientEnrollmentSettings(baseUserId);

    if (shouldReuseExistingScrapedClient(clientData)) {
      const existingClient = await findExistingClientForAdminByPlatformEmail(baseUserId, {
        email: clientData.platform_email || clientData.email,
        platform: clientData.platform,
      });

      if (existingClient?.id) {
        const updates = buildReusedClientUpdates(existingClient, clientData, req.user!.id);
        const fields = Object.keys(updates);

        if (fields.length > 0) {
          const setClause = fields.map((field) => `${field} = ?`).join(', ');
          const values = fields.map((field) => updates[field]);
          await runQuery(
            `UPDATE clients SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
            [...values, existingClient.id, baseUserId]
          );
        }

        const refreshedClient = await getQuery(
          'SELECT * FROM clients WHERE id = ?',
          [existingClient.id]
        );

        await runQuery(`
          INSERT INTO activities (user_id, client_id, type, description)
          VALUES (?, ?, ?, ?)
        `, [
          baseUserId,
          existingClient.id,
          'score_updated',
          `Existing client reused for fresh credit report: ${clientData.first_name} ${clientData.last_name}${clientData.platform ? ` (via ${clientData.platform})` : ''}`
        ]);

        await logClientActivitySafely({
          userId: baseUserId,
          activityType: 'update',
          clientId: existingClient.id,
          description: `Existing client reused for fresh credit report: ${clientData.first_name} ${clientData.last_name}${clientData.platform ? ` (via ${clientData.platform})` : ''}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || null
        });

        return res.status(200).json({
          ...refreshedClient,
          reusedExisting: true,
          created: false,
        });
      }
    }

    const emailMatchedClient = await findExistingClientForAdminByEmail(baseUserId, clientData.email);
    if (emailMatchedClient?.id && !hasConflictingPlatform(emailMatchedClient, clientData)) {
      if (!hasMatchingIdentityForMerge(emailMatchedClient, clientData)) {
        return res.status(409).json({
          success: false,
          error: 'Client with this email already exists under a different identity'
        });
      }

      const updates = buildReusedClientUpdates(emailMatchedClient, clientData, req.user!.id);
      const fields = Object.keys(updates);

      if (fields.length > 0) {
        const setClause = fields.map((field) => `${field} = ?`).join(', ');
        const values = fields.map((field) => updates[field]);
        await runQuery(
          `UPDATE clients SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
          [...values, emailMatchedClient.id, baseUserId]
        );
      }

      const refreshedClient = await getQuery(
        'SELECT * FROM clients WHERE id = ?',
        [emailMatchedClient.id]
      );

      await runQuery(`
        INSERT INTO activities (user_id, client_id, type, description)
        VALUES (?, ?, ?, ?)
      `, [
        baseUserId,
        emailMatchedClient.id,
        'client_merged',
        `Existing client merged by matching email and identity: ${clientData.first_name} ${clientData.last_name}`
      ]);

      await logClientActivitySafely({
        userId: baseUserId,
        activityType: 'update',
        clientId: emailMatchedClient.id,
        description: `Existing client merged by matching email and identity: ${clientData.first_name} ${clientData.last_name}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || null
      });

      return res.status(200).json({
        ...refreshedClient,
        reusedExisting: true,
        mergedExisting: true,
        created: false,
      });
    }
    
    const kycGate = await checkClientCreationKyc({
      userId: baseUserId,
      source: 'api_client_create',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || null,
    });
    if (!kycGate.allowed) {
      return res.status(403).json({
        ...KYC_REQUIRED_RESPONSE,
        kyc_status: kycGate.status,
        existing_client_count: kycGate.clientCount,
      });
    }

    // Use transaction to prevent race conditions in quota validation
    const result = await executeTransaction(async (connection) => {
      // Check client quota within transaction to prevent race conditions
      const quotaValidation = await validateClientQuota(baseUserId);
      
      if (!quotaValidation.canAdd) {
        throw new Error(JSON.stringify({
          status: 403,
          error: 'Client quota exceeded',
          message: quotaValidation.error,
          planLimits: quotaValidation.planLimits
        }));
      }
      
      // Store platform credentials if provided
      const platformEmail = clientData.platform_email || clientData.email;
      const platformPassword = clientData.platform_password;
      
      const insertResult = await executeClientInsert(connection, `
        INSERT INTO clients (
          user_id, first_name, last_name, email, phone, address, city, state, zip_code, ssn_last_four,
          date_of_birth, employment_status, annual_income, status, credit_score,
          experian_score, equifax_score, transunion_score, previous_credit_score, notes, 
          platform, platform_email, platform_password, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        baseUserId,
        clientData.first_name || null,
        clientData.last_name || null,
        clientData.email || null,
        clientData.phone || null,
        clientData.address || null,
        clientData.city || null,
        clientData.state || null,
        clientData.zip_code || null,
        clientData.ssn_last_four || null,
        normalizeDateInput(clientData.date_of_birth) || null,
        clientData.employment_status || null,
        clientData.annual_income || null,
        clientData.status || 'active',
        clientData.credit_score || null,
        clientData.experian_score || null,
        clientData.equifax_score || null,
        clientData.transunion_score || null,
        clientData.previous_credit_score || null,
        clientData.notes || null,
        clientData.platform || null,
        platformEmail || null,
        platformPassword || null,
        req.user!.id,
        req.user!.id
      ]);
      
      // connection.execute returns [ResultSetHeader, FieldPacket[]]; we need the header
      return insertResult;
    });
    
    // Get the inserted ID (MySQL uses insertId)
    const insertedId = (result as any)?.insertId;
    
    const newClient = await getQuery(
      'SELECT * FROM clients WHERE id = ?',
      [insertedId]
    );
    
    // Update any credit reports with 'unknown' client_id to use the new client ID
    try {
      const { updateCreditReportClientId } = await import('../database/dbConnection.js');
      await updateCreditReportClientId(insertedId.toString());
      console.log(`Updated credit report history for new client ID: ${insertedId}`);
    } catch (updateError) {
      console.error('Error updating credit report history:', updateError);
      // Don't fail the client creation if report update fails
    }
    
    // Log activity
    await runQuery(`
      INSERT INTO activities (user_id, client_id, type, description)
      VALUES (?, ?, ?, ?)
    `, [
      baseUserId,
      insertedId,
      'client_added',
      `New client added: ${clientData.first_name} ${clientData.last_name}${clientData.platform ? ` (via ${clientData.platform})` : ''}`
    ]);

    await logClientActivitySafely({
      userId: baseUserId,
      activityType: 'create',
      clientId: insertedId,
      description: `New client added: ${clientData.first_name} ${clientData.last_name}${clientData.platform ? ` (via ${clientData.platform})` : ''}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || null
    });

    
    res.status(201).json({
      ...newClient,
      reusedExisting: false,
      created: true,
    });
  } catch (error) {
    if (isKycDatabaseRejection(error)) {
      return res.status(403).json(KYC_REQUIRED_RESPONSE);
    }
    // Handle quota exceeded errors from transaction
    if (error instanceof Error && error.message.startsWith('{')) {
      try {
        const errorData = JSON.parse(error.message);
        if (errorData.status === 403) {
          return res.status(403).json({
            success: false,
            error: errorData.error,
            message: errorData.message,
            planLimits: errorData.planLimits
          });
        }
      } catch (parseError) {
        // If parsing fails, continue to general error handling
      }
    }

    if (!enrollmentSettings.allowFreeEnrollment) {
      return res.status(402).json({
        success: false,
        error: 'Client payment required',
        code: 'CLIENT_PLAN_PAYMENT_REQUIRED',
        message: 'This admin requires clients to pay before they can be added to the CRM.',
        enrollment: {
          allowFreeEnrollment: false,
          clientPlan: enrollmentSettings.clientPlan,
          clientPlans: enrollmentSettings.clientPlans,
          adminPlan: enrollmentSettings.adminPlan,
        }
      });
    }
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createClientIntakeToken(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Access token required' });
  }
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  const token = jwt.sign(
    {
      adminId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      scope: 'client_intake'
    },
    ENV_CONFIG.JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({ token, expiresIn: '7d' });
}

export async function getClientIntakeConfig(req: Request, res: Response) {
  try {
    const adminId = await resolveAdminIdFromIntake((req.query as any)?.token, (req.query as any)?.slug);
    const enrollmentSettings = await getClientEnrollmentSettings(adminId);
    const userColumns = await getExistingUserColumns();
    const intakeSelect = [
      userColumns.has('intake_redirect_url') ? 'u.intake_redirect_url' : 'NULL AS intake_redirect_url',
      userColumns.has('intake_logo_url') ? 'u.intake_logo_url' : 'NULL AS intake_logo_url',
      userColumns.has('intake_primary_color') ? 'u.intake_primary_color' : 'NULL AS intake_primary_color',
      userColumns.has('intake_company_name') ? 'u.intake_company_name' : 'u.company_name AS intake_company_name',
      userColumns.has('intake_website_url') ? 'u.intake_website_url' : 'NULL AS intake_website_url',
      userColumns.has('intake_email') ? 'u.intake_email' : 'u.email AS intake_email',
      userColumns.has('intake_phone_number') ? 'u.intake_phone_number' : 'u.phone AS intake_phone_number',
      'u.onboarding_slug',
      'a.partner_monitoring_link',
    ].join(',\n         ');

    const admin = await getQuery(
      `SELECT
         ${intakeSelect}
       FROM users u
       LEFT JOIN affiliate_referrals ar ON ar.referred_user_id = u.id
       LEFT JOIN affiliates a ON a.id = ar.affiliate_id
       WHERE u.id = ? AND u.role IN ('admin','super_admin')
       ORDER BY ar.referral_date ASC
       LIMIT 1`,
      [adminId]
    );

    if (!admin) {
      return res.status(404).json({ error: 'Onboarding link not found' });
    }

    const defaultMonitoringLink = "https://www.myscoreiq.com/get-fico-preferred.aspx?offercode=432142UK";
    
    // FREEZED: Logic to determine monitoring link based on referral partner
    /*
    const monitoringLink = admin.partner_monitoring_link && admin.partner_monitoring_link.trim() 
      ? admin.partner_monitoring_link.trim() 
      : defaultMonitoringLink;
    */

    // HARDCODED: Always redirect to default link for now per request
    const monitoringLink = defaultMonitoringLink;

    return res.json({
      success: true,
      data: {
        onboardingSlug: admin.onboarding_slug || null,
        enrollment: {
          allowFreeEnrollment: enrollmentSettings.allowFreeEnrollment,
          requiresPayment: !enrollmentSettings.allowFreeEnrollment,
          clientPlan: enrollmentSettings.clientPlan,
          clientPlans: enrollmentSettings.clientPlans,
          adminPlan: enrollmentSettings.adminPlan,
        },
        redirectUrl: admin.intake_redirect_url || null,
        logoUrl: admin.intake_logo_url || null,
        primaryColor: admin.intake_primary_color || null,
        companyName: admin.intake_company_name || null,
        websiteUrl: admin.intake_website_url || null,
        contactEmail: admin.intake_email || null,
        contactPhone: admin.intake_phone_number || null,
        monitoringLink
      }
    });
  } catch (error: any) {
    const message = String(error?.message || 'Internal server error');
    if (message === 'Invalid or expired intake token') {
      return res.status(401).json({ error: message });
    }
    if (['Invalid intake token scope', 'Intake token required', 'Invalid onboarding slug'].includes(message)) {
      return res.status(400).json({ error: message });
    }
    if (message === 'Onboarding link not found') {
      return res.status(404).json({ error: message });
    }
    console.error('Error fetching intake config:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function submitClientIntake(req: Request, res: Response) {
  try {
    try {
      req.setTimeout?.(300000);
      res.setTimeout?.(300000);
      req.socket?.setTimeout?.(300000);
    } catch {}

    let adminId: number | null = null;
    try {
      adminId = await resolveAdminIdFromIntake((req.query as any)?.token || (req.body as any)?.token, (req.query as any)?.slug || (req.body as any)?.slug);
    } catch (error: any) {
      const message = String(error?.message || 'Invalid intake request');
      if (message === 'Invalid or expired intake token') {
        return res.status(401).json({ error: message });
      }
      if (message === 'Onboarding link not found') {
        return res.status(404).json({ error: message });
      }
      if (message === 'Invalid intake token scope') {
        return res.status(403).json({ error: message });
      }
      return res.status(400).json({ error: message });
    }

    if (!adminId) {
      return res.status(403).json({ error: 'Invalid intake token scope' });
    }

    const enrollmentSettings = await getClientEnrollmentSettings(adminId);
    let paidEnrollmentRequest: any = null;
    if (!enrollmentSettings.allowFreeEnrollment) {
      const enrollmentSessionId = String((req.body as any)?.enrollmentSessionId || '').trim();
      if (enrollmentSessionId) {
        paidEnrollmentRequest = await getQuery(
          `SELECT cer.*
             FROM client_enrollment_requests cer
             JOIN subscription_plans sp
               ON sp.id = cer.plan_id
              AND sp.plan_category = 'client'
            WHERE cer.admin_id = ?
              AND cer.stripe_checkout_session_id = ?
            LIMIT 1`,
          [adminId, enrollmentSessionId]
        );
      }

      if (!paidEnrollmentRequest || String(paidEnrollmentRequest.status) !== 'paid') {
        const alreadyCompleted = String(paidEnrollmentRequest?.status || '') === 'completed';
        return res.status(alreadyCompleted ? 409 : 402).json({
          success: false,
          error: alreadyCompleted ? 'This paid enrollment has already been completed' : 'Client payment required',
          code: alreadyCompleted ? 'CLIENT_ENROLLMENT_ALREADY_COMPLETED' : 'CLIENT_PLAN_PAYMENT_REQUIRED',
          message: alreadyCompleted
            ? 'This Stripe Checkout session cannot be reused for another intake.'
            : 'Select a client plan and complete payment before submitting the intake form.',
          enrollment: {
            allowFreeEnrollment: false,
            clientPlan: enrollmentSettings.clientPlan,
            clientPlans: enrollmentSettings.clientPlans,
            adminPlan: enrollmentSettings.adminPlan,
          }
        });
      }
    }

    const intakeData = clientIntakeSchema.parse(req.body);
    const checkoutEmail = String(paidEnrollmentRequest?.email || '').trim().toLowerCase();
    if (checkoutEmail && checkoutEmail !== intakeData.email.trim().toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'The intake email must match the email used during Stripe Checkout',
        code: 'CLIENT_ENROLLMENT_EMAIL_MISMATCH',
      });
    }

    const existingIntakeClient = await findExistingClientForAdminByPlatformEmail(adminId, {
      email: intakeData.email,
      platform: intakeData.platform,
    }) || await findExistingClientForAdminByEmail(adminId, intakeData.email);
    if (!existingIntakeClient?.id) {
      const kycGate = await checkClientCreationKyc({
        userId: adminId,
        source: 'public_client_intake',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || null,
      });
      if (!kycGate.allowed) {
        return res.status(403).json({
          ...KYC_REQUIRED_RESPONSE,
          kyc_status: kycGate.status,
          existing_client_count: kycGate.clientCount,
        });
      }
    }

    const quotaValidation = await validateClientQuota(adminId);
    if (!quotaValidation.canAdd) {
      return res.status(403).json({
        success: false,
        error: 'Client quota exceeded',
        message: quotaValidation.error,
        planLimits: quotaValidation.planLimits
      });
    }

    const scraperOptions: any = {
      saveHtml: false,
      takeScreenshots: false,
      outputDir: './scraper-output',
      clientId: 'unknown'
    };
    if (intakeData.ssnLast4) {
      scraperOptions.ssnLast4 = intakeData.ssnLast4;
    }

    const scraperResult = await fetchCreditReport(
      intakeData.platform,
      intakeData.email,
      intakeData.password,
      scraperOptions
    );

    const reportData = resolveReportData(scraperResult);
    const extractionReportData = {
      reportData,
      rawCreditData: scraperResult?.rawCreditData,
      scores: scraperResult?.scores
    };
    const extracted = extractClientFromReport(extractionReportData, intakeData.email, false);

    if (!extracted.verifiedReportName) {
      cleanupIntakeScrapedArtifact(scraperResult?.filePath || scraperResult?.converted_report_path || reportData?.filePath || reportData?.converted_report_path);
      return res.status(422).json({
        success: false,
        error: 'Unable to verify client name from credit report',
        message: `We couldn't verify your name in the ${intakeData.platform} report. Please double-check the monitoring email and password. If those are correct, your password may have changed or the monitoring subscription may need renewal.`
      });
    }

    const notesMessage = `Client created via intake with credit report scraping from ${intakeData.platform}. Bureau Scores - Experian: ${extracted.experianScore || 'N/A'}, Equifax: ${extracted.equifaxScore || 'N/A'}, TransUnion: ${extracted.transunionScore || 'N/A'}`;
    const clientData = {
      first_name: extracted.firstName,
      last_name: extracted.lastName,
      email: intakeData.email,
      date_of_birth: extracted.dateOfBirth || undefined,
      address: extracted.address || undefined,
      city: extracted.city || undefined,
      state: extracted.state || undefined,
      zip_code: extracted.zipCode || undefined,
      credit_score: extracted.creditScore > 0 ? extracted.creditScore : undefined,
      experian_score: extracted.experianScore > 0 ? extracted.experianScore : undefined,
      equifax_score: extracted.equifaxScore > 0 ? extracted.equifaxScore : undefined,
      transunion_score: extracted.transunionScore > 0 ? extracted.transunionScore : undefined,
      status: 'active' as const,
      platform: intakeData.platform as z.infer<typeof clientSchema>['platform'],
      platform_email: intakeData.email,
      platform_password: intakeData.password,
      ssn_last_four: intakeData.ssnLast4 || undefined,
      notes: notesMessage
    };

    let insertedId: number | string | undefined;
    let created = true;

    const platformMatchedClient = await findExistingClientForAdminByPlatformEmail(adminId, {
      email: intakeData.email,
      platform: intakeData.platform
    });
    const emailMatchedClient = platformMatchedClient?.id
      ? null
      : await findExistingClientForAdminByEmail(adminId, intakeData.email);
    const existingClient = platformMatchedClient || emailMatchedClient;

    if (existingClient?.id) {
      const identityMatches = hasMatchingIdentityForMerge(existingClient, clientData);
      const canReuseVerifiedIntake = canReuseVerifiedIntakeClient(existingClient, clientData);

      if (emailMatchedClient?.id && hasConflictingPlatform(emailMatchedClient, clientData) && !identityMatches && !canReuseVerifiedIntake) {
        return res.status(409).json({
          success: false,
          error: 'Client with this email already exists under a different platform'
        });
      }

      if (!identityMatches && !canReuseVerifiedIntake) {
        return res.status(409).json({
          success: false,
          error: 'Client with this email already exists under a different identity'
        });
      }

      const updates = buildReusedClientUpdates(existingClient, clientData, adminId);
      const fields = Object.keys(updates);
      if (fields.length > 0) {
        const setClause = fields.map((field) => `${field} = ?`).join(', ');
        const values = fields.map((field) => updates[field]);
        await runQuery(
          `UPDATE clients SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
          [...values, existingClient.id, adminId]
        );
      }

      insertedId = existingClient.id;
      created = false;
    } else {
      const result = await executeTransaction(async (connection) => {
        const transactionQuotaValidation = await validateClientQuota(adminId);
        if (!transactionQuotaValidation.canAdd) {
          throw new Error(JSON.stringify({
            status: 403,
            error: 'Client quota exceeded',
            message: transactionQuotaValidation.error,
            planLimits: transactionQuotaValidation.planLimits
          }));
        }

        const insertResult = await executeClientInsert(connection, `
          INSERT INTO clients (
            user_id, first_name, last_name, email, phone, address, city, state, zip_code, ssn_last_four,
            date_of_birth, employment_status, annual_income, status, credit_score,
            experian_score, equifax_score, transunion_score, previous_credit_score, notes, 
            platform, platform_email, platform_password, created_by, updated_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          adminId,
          extracted.firstName || null,
          extracted.lastName || null,
          intakeData.email,
          null,
          extracted.address || null,
          extracted.city || null,
          extracted.state || null,
          extracted.zipCode || null,
          intakeData.ssnLast4 || null,
          normalizeDateInput(extracted.dateOfBirth) || null,
          null,
          null,
          'active',
          extracted.creditScore || null,
          extracted.experianScore || null,
          extracted.equifaxScore || null,
          extracted.transunionScore || null,
          null,
          notesMessage,
          intakeData.platform || null,
          intakeData.email || null,
          intakeData.password || null,
          adminId,
          adminId
        ]);
        return insertResult;
      });

      insertedId = (result as any)?.insertId;
    }

    const newClient = await getQuery(
      'SELECT * FROM clients WHERE id = ?',
      [insertedId]
    );

    if (created) {
      try {
        const { updateCreditReportClientId } = await import('../database/dbConnection.js');
        await updateCreditReportClientId(String(insertedId));
      } catch {}
    }

    if (insertedId) {
      try {
        await saveCreditReport({
          client_id: String(insertedId),
          platform: intakeData.platform,
          report_path: scraperResult?.filePath || reportData?.filePath || null,
          status: 'completed',
          credit_score: extracted.creditScore || null,
          experian_score: extracted.experianScore || null,
          equifax_score: extracted.equifaxScore || null,
          transunion_score: extracted.transunionScore || null,
          report_date: null,
          notes: notesMessage
        });
      } catch {}
    }

    const activityDescription = created
      ? `New client added: ${extracted.firstName} ${extracted.lastName}${intakeData.platform ? ` (via ${intakeData.platform})` : ''}`
      : `Existing client reused for fresh intake credit report: ${extracted.firstName} ${extracted.lastName}${intakeData.platform ? ` (via ${intakeData.platform})` : ''}`;

    try {
      await runQuery(`
        INSERT INTO activities (user_id, client_id, type, description)
        VALUES (?, ?, ?, ?)
      `, [
        adminId,
        insertedId,
        created ? 'client_added' : 'score_updated',
        activityDescription
      ]);
    } catch (activityError: any) {
      console.warn('Failed to log client intake activity:', activityError?.message || activityError);
    }

    try {
      await runQuery(`
        INSERT INTO user_activities (user_id, activity_type, resource_type, resource_id, description, ip_address, user_agent, session_id)
        VALUES (?, ?, 'client', ?, ?, ?, ?, ?)
      `, [
        adminId,
        created ? 'create' : 'update',
        insertedId,
        activityDescription,
        (req as any).ip || null,
        req.get('User-Agent') || null,
        null
      ]);
    } catch (userActivityError: any) {
      console.warn('Failed to log client intake user activity:', userActivityError?.message || userActivityError);
    }

    if (paidEnrollmentRequest?.id) {
      const completionResult: any = await runQuery(
        `UPDATE client_enrollment_requests
            SET status = 'completed',
                first_name = ?,
                last_name = ?,
                email = ?,
                platform = ?,
                platform_email = ?,
                created_client_id = ?,
                completed_at = COALESCE(completed_at, NOW()),
                updated_at = NOW()
          WHERE id = ?
            AND admin_id = ?
            AND status = 'paid'`,
        [
          extracted.firstName || null,
          extracted.lastName || null,
          intakeData.email,
          intakeData.platform || null,
          intakeData.email,
          insertedId,
          paidEnrollmentRequest.id,
          adminId,
        ]
      );
      if (Number(completionResult?.affectedRows || 0) !== 1) {
        return res.status(409).json({
          success: false,
          error: 'This paid enrollment has already been completed',
          code: 'CLIENT_ENROLLMENT_ALREADY_COMPLETED',
        });
      }
    }

    res.status(201).json({
      success: true,
      data: {
        client: newClient,
        clientId: insertedId,
        clientName: `${extracted.firstName} ${extracted.lastName}`.trim(),
        reusedExisting: !created,
        created
      }
    });
  } catch (error: any) {
    if (isKycDatabaseRejection(error)) {
      return res.status(403).json(KYC_REQUIRED_RESPONSE);
    }
    if (error instanceof Error && error.message.startsWith('{')) {
      try {
        const errorData = JSON.parse(error.message);
        if (errorData.status === 403) {
          return res.status(403).json({
            success: false,
            error: errorData.error,
            message: errorData.message,
            planLimits: errorData.planLimits
          });
        }
      } catch {}
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error submitting client intake:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Update a client
export async function updateClient(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const updates = updateClientSchema.parse(req.body);
    const normalizedUpdates: any = { ...updates };
    if (typeof normalizedUpdates.fundable_in_tu !== 'undefined') {
      normalizedUpdates.fundable_in_tu = Number(Boolean(normalizedUpdates.fundable_in_tu));
    }
    if (typeof normalizedUpdates.fundable_in_ex !== 'undefined') {
      normalizedUpdates.fundable_in_ex = Number(Boolean(normalizedUpdates.fundable_in_ex));
    }
    if (typeof normalizedUpdates.fundable_in_eq !== 'undefined') {
      normalizedUpdates.fundable_in_eq = Number(Boolean(normalizedUpdates.fundable_in_eq));
    }
    if (typeof updates.date_of_birth !== 'undefined') {
      const raw = updates.date_of_birth as any;
      const isEmpty = raw === null || (typeof raw === 'string' && raw.trim() === '');
      if (isEmpty) {
        delete normalizedUpdates.date_of_birth;
      } else {
        const normalized = normalizeDateInput(String(raw));
        if (normalized === null) {
          delete normalizedUpdates.date_of_birth;
        } else {
          normalizedUpdates.date_of_birth = normalized;
        }
      }
    }
    // If ssn_last_six is provided, auto-derive ssn_last_four from its last 4 digits
    if (typeof normalizedUpdates.ssn_last_six === 'string') {
      const cleaned = normalizedUpdates.ssn_last_six.replace(/\D/g, '').slice(0, 6);
      normalizedUpdates.ssn_last_six = cleaned || null;
      if (cleaned && cleaned.length >= 4) {
        normalizedUpdates.ssn_last_four = cleaned.slice(-4);
      }
    }
    // Trim / nullify security_freeze_pin
    if (typeof normalizedUpdates.security_freeze_pin === 'string') {
      const trimmed = normalizedUpdates.security_freeze_pin.trim();
      normalizedUpdates.security_freeze_pin = trimmed || null;
    }
    // Coerce annual_income to number
    if (typeof normalizedUpdates.annual_income === 'string') {
      const parsed = parseFloat(normalizedUpdates.annual_income);
      if (isNaN(parsed)) {
        delete normalizedUpdates.annual_income;
      } else {
        normalizedUpdates.annual_income = parsed;
      }
    }
    
    if (Object.keys(normalizedUpdates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    const isFundingManager = req.user!.role === 'funding_manager';
    let baseUserId: number = req.user!.id;
    if (!isFundingManager && req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
      const employeeLink = await getQuery(
        'SELECT admin_id FROM employees WHERE user_id = ? AND status = ? ORDER BY updated_at DESC LIMIT 1',
        [req.user!.id, 'active']
      );
      if (employeeLink?.admin_id) {
        baseUserId = employeeLink.admin_id;
      }
    }
    const existingClient = await getQuery(
      isFundingManager ? 'SELECT * FROM clients WHERE id = ?' : 'SELECT * FROM clients WHERE id = ? AND user_id = ?',
      isFundingManager ? [id] : [id, baseUserId]
    );
    
    if (!existingClient) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    // Build dynamic update query
    const fields = Object.keys(normalizedUpdates);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => normalizedUpdates[field as keyof typeof normalizedUpdates]);
    const whereClause = isFundingManager ? 'id = ?' : 'id = ? AND user_id = ?';
    const params = isFundingManager ? [...values, id] : [...values, id, baseUserId];
    await runQuery(
      `UPDATE clients SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE ${whereClause}`,
      params
    );
    
    const updatedClient = await getQuery(
      'SELECT * FROM clients WHERE id = ?',
      [id]
    );

    
    res.json(updatedClient);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error updating client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Delete a client
export async function deleteClient(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    
    // Check if client exists and belongs to user
    const existingClient = await getQuery(
      'SELECT * FROM clients WHERE id = ? AND user_id = ?',
      [id, req.user!.id]
    );
    
    if (!existingClient) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    // Delete client (this will cascade to related disputes due to foreign key constraints)
    await runQuery(
      'DELETE FROM clients WHERE id = ? AND user_id = ?',
      [id, req.user!.id]
    );
    
    const desc = `Client deleted: ${existingClient.first_name || ''} ${existingClient.last_name || ''}${existingClient.email ? ` (${existingClient.email})` : ''} (IP: ${req.ip})`;
    try {
      await runQuery(
        `INSERT INTO activities (user_id, client_id, type, description, metadata)
         VALUES (?, ?, ?, ?, ?)`,
        [
          req.user!.id,
          Number(id),
          'note_added',
          desc,
          JSON.stringify({ event: 'client_deleted', ip_address: req.ip, user_agent: req.get('User-Agent') || null })
        ]
      );
    } catch {}
    try {
      await runQuery(
        `INSERT INTO user_activities (user_id, activity_type, resource_type, resource_id, description, ip_address, user_agent, session_id)
         VALUES (?, 'delete', 'client', ?, ?, ?, ?, ?)`,
        [
          req.user!.id,
          Number(id),
          desc,
          req.ip,
          req.get('User-Agent') || null,
          null
        ]
      );
    } catch {}

    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get client statistics
export async function getClientStats(req: AuthRequest, res: Response) {
  try {
    // Funding managers can see stats for all clients, others see only their own
    const whereClause = req.user!.role === 'funding_manager' ? '' : 'WHERE user_id = ?';
    const params = req.user!.role === 'funding_manager' ? [] : [req.user!.id];
    
    const stats = await getQuery(`
      SELECT 
        COUNT(*) as total_clients,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_clients,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_clients,
        COUNT(CASE WHEN status = 'on_hold' THEN 1 END) as on_hold_clients,
        AVG(credit_score) as avg_credit_score,
        COUNT(CASE WHEN credit_score > previous_credit_score THEN 1 END) as improved_scores
      FROM clients 
      ${whereClause}
    `, params);
    
    // Get recent clients (last 30 days)
    const recentWhereClause = req.user!.role === 'funding_manager' 
      ? 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)' 
      : 'WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    const recentParams = req.user!.role === 'funding_manager' ? [] : [req.user!.id];
    
    const recentClients = await getQuery(`
      SELECT COUNT(*) as recent_clients
      FROM clients 
      ${recentWhereClause}
    `, recentParams);
    
    res.json({
      ...stats,
      recent_clients: recentClients?.recent_clients || 0
    });
  } catch (error) {
    console.error('Error fetching client stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// =============================================================================
// EQUIFAX SETTLEMENT ROUTES
// =============================================================================

class ClientInputError extends Error {}

async function getAccessibleEquifaxClient(req: AuthRequest, id: string) {
  let baseUserId: number = req.user!.id;
  const isFundingManager = req.user!.role === 'funding_manager';
  if (!isFundingManager && req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
    const employeeLink = await getQuery(
      'SELECT admin_id FROM employees WHERE user_id = ? AND status = ? ORDER BY updated_at DESC LIMIT 1',
      [req.user!.id, 'active']
    );
    if (employeeLink?.admin_id) {
      baseUserId = employeeLink.admin_id;
    }
  }

  const client = await getQuery(
    isFundingManager
      ? 'SELECT id, first_name, last_name, ssn_last_six FROM clients WHERE id = ?'
      : 'SELECT id, first_name, last_name, ssn_last_six FROM clients WHERE id = ? AND (user_id = ? OR user_id IN (SELECT user_id FROM employees WHERE admin_id = ? AND status = ?))',
    isFundingManager ? [id] : [id, baseUserId, baseUserId, 'active']
  );

  return client;
}

function validateEquifaxClientData(client: any) {
  const lastName = String(client?.last_name || '').trim();
  const ssnLastSix = String(client?.ssn_last_six || '').trim();

  if (!lastName) {
    throw new ClientInputError('Client last name is required before running the Equifax settlement check');
  }

  if (!/^\d{6}$/.test(ssnLastSix)) {
    throw new ClientInputError('Client SSN last 6 digits are required before running the Equifax settlement check');
  }

  return {
    lastName,
    ssnLastSix,
  };
}

const equifaxPreviewClickSchema = z.object({
  xRatio: z.number().min(0).max(1),
  yRatio: z.number().min(0).max(1),
});

const equifaxPreviewScrollSchema = z.object({
  deltaY: z.number().min(-2000).max(2000),
});

export async function getEquifaxSettlementSnapshot(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const client = await getAccessibleEquifaxClient(req, id);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const { lastName, ssnLastSix } = validateEquifaxClientData(client);

    const snapshot = await captureEquifaxSettlementScreenshot({
      lastName,
      ssnLastSix,
    });

    return res.json({ success: true, data: snapshot });
  } catch (error: any) {
    if (error instanceof ClientInputError) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error capturing Equifax settlement snapshot:', error);
    return res.status(502).json({
      error: error?.message || 'Failed to capture Equifax settlement snapshot',
    });
  }
}

export async function startEquifaxSettlementLiveBrowser(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const client = await getAccessibleEquifaxClient(req, id);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const { lastName, ssnLastSix } = validateEquifaxClientData(client);
    const data = await startEquifaxSettlementLiveSession({
      clientId: Number(id),
      userId: req.user!.id,
      lastName,
      ssnLastSix,
    });

    return res.json({ success: true, data });
  } catch (error: any) {
    if (error instanceof ClientInputError) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error starting Equifax live browser session:', error);
    return res.status(502).json({
      error:
        error?.message ||
        'Failed to open the live Equifax browser window. This feature works best when the app is running locally on your desktop.',
    });
  }
}

export async function getEquifaxSettlementLiveBrowser(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const client = await getAccessibleEquifaxClient(req, id);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const data = await getEquifaxSettlementLiveSessionState({
      clientId: Number(id),
      userId: req.user!.id,
    });

    return res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching Equifax live browser session:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to fetch Equifax live browser session status',
    });
  }
}

export async function getEquifaxSettlementLiveBrowserPreview(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const client = await getAccessibleEquifaxClient(req, id);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const data = await getEquifaxSettlementLivePreview({
      clientId: Number(id),
      userId: req.user!.id,
    });

    return res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching Equifax live preview:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to fetch the Equifax live preview',
    });
  }
}

export async function clickEquifaxSettlementPreview(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const client = await getAccessibleEquifaxClient(req, id);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const payload = equifaxPreviewClickSchema.parse(req.body || {});
    const data = await clickEquifaxSettlementLivePreview({
      clientId: Number(id),
      userId: req.user!.id,
      xRatio: payload.xRatio,
      yRatio: payload.yRatio,
    });

    return res.json({ success: true, data });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error clicking Equifax live preview:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to interact with the Equifax live preview',
    });
  }
}

export async function scrollEquifaxSettlementPreview(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const client = await getAccessibleEquifaxClient(req, id);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const payload = equifaxPreviewScrollSchema.parse(req.body || {});
    const data = await scrollEquifaxSettlementLivePreview({
      clientId: Number(id),
      userId: req.user!.id,
      deltaY: payload.deltaY,
    });

    return res.json({ success: true, data });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error scrolling Equifax live preview:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to scroll the Equifax live preview',
    });
  }
}

export async function getEquifaxSettlementSavedScreenshot(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const client = await getAccessibleEquifaxClient(req, id);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const savedScreenshot = getEquifaxSettlementSavedScreenshotFile(Number(id));
    if (!savedScreenshot) {
      return res.json({ success: true, data: null });
    }

    return res.json({
      success: true,
      data: {
        fileName: savedScreenshot.fileName,
        imageUrl: savedScreenshot.imageUrl,
        updatedAt: savedScreenshot.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error fetching saved Equifax screenshot:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to fetch the saved Equifax screenshot',
    });
  }
}

export async function serveEquifaxSettlementSavedScreenshot(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const client = await getAccessibleEquifaxClient(req, id);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const savedScreenshot = getEquifaxSettlementSavedScreenshotFile(Number(id));
    if (!savedScreenshot) {
      return res.status(404).json({ error: 'Saved screenshot not found' });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.sendFile(savedScreenshot.absolutePath);
  } catch (error: any) {
    console.error('Error serving saved Equifax screenshot:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to serve the saved Equifax screenshot',
    });
  }
}

export async function saveEquifaxSettlementScreenshot(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const client = await getAccessibleEquifaxClient(req, id);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const data = await saveEquifaxSettlementClientScreenshot({
      clientId: Number(id),
      userId: req.user!.id,
      firstName: String(client.first_name || 'Client'),
    });

    return res.json({
      success: true,
      data: {
        fileName: data.fileName,
        imageUrl: data.imageUrl,
        updatedAt: data.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error saving Equifax screenshot:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to save the Equifax screenshot',
    });
  }
}

export async function focusEquifaxSettlementLiveBrowser(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const client = await getAccessibleEquifaxClient(req, id);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const data = await focusEquifaxSettlementLiveSession({
      clientId: Number(id),
      userId: req.user!.id,
    });

    return res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error focusing Equifax live browser session:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to focus the Equifax live browser window',
    });
  }
}

export async function closeEquifaxSettlementLiveBrowser(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const client = await getAccessibleEquifaxClient(req, id);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const data = await closeEquifaxSettlementLiveSession({
      clientId: Number(id),
      userId: req.user!.id,
    });

    return res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error closing Equifax live browser session:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to close the Equifax live browser window',
    });
  }
}
