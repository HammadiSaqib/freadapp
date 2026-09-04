import axios from 'axios';
import { getQuery, runQuery } from '../database/databaseAdapter.js';

const DEFAULT_BASE_URL = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';
const GHL_TIMEOUT_MS = 15000;

export type GhlIntegrationConfig = {
  accessToken: string;
  locationId?: string | null;
  businessRecordId?: string | null;
  outboundUrl?: string | null;
  customFieldCreditScore?: string | null;
  customFieldExperianScore?: string | null;
  customFieldEquifaxScore?: string | null;
  customFieldTransunionScore?: string | null;
  customFieldReportDate?: string | null;
};

const GHL_ADMIN_MANAGED_TAGS = [
  'TSM-Canceled',
  'TSM-Pastdue',
  'TSM-No-Login-30-Days',
  'tsm-no-report-pull',
  'tsm-payment-failed'
];

type FieldMappings = {
  creditScore?: string | null;
  experianScore?: string | null;
  equifaxScore?: string | null;
  transunionScore?: string | null;
  reportDate?: string | null;
};

function getAuthHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Version: API_VERSION
  };
}

export type GhlApiErrorDetails = {
  responseCode: number | null;
  message: string;
  retryable: boolean;
};

export function getGhlApiErrorDetails(error: any): GhlApiErrorDetails {
  const responseCode = Number(error?.response?.status) || null;
  const data = error?.response?.data;
  const rawMessage = data?.message ?? data?.error ?? data?.errors ?? error?.message;
  const message = Array.isArray(rawMessage)
    ? rawMessage.map(String).join('; ')
    : typeof rawMessage === 'object' && rawMessage
      ? JSON.stringify(rawMessage)
      : String(rawMessage || 'GoHighLevel did not return an error message');

  return {
    responseCode,
    message: responseCode
      ? `GoHighLevel returned ${responseCode}: ${message}`
      : (error?.response
          ? `GoHighLevel request failed: ${message}`
          : error?.code
            ? `Unable to reach GoHighLevel: ${message}`
            : message),
    retryable: responseCode === null || responseCode === 429 || responseCode >= 500
  };
}

export async function validateGhlCredentials(accessToken: string, locationId: string) {
  const token = String(accessToken || '').trim();
  const location = String(locationId || '').trim();
  if (!token) throw new Error('A GoHighLevel Private Integration Token is required');
  if (!location) throw new Error('A GoHighLevel Location ID is required');

  const response = await axios.get(
    `${DEFAULT_BASE_URL}/locations/${encodeURIComponent(location)}`,
    {
      headers: getAuthHeaders(token),
      timeout: GHL_TIMEOUT_MS
    }
  );
  const returnedLocationId = String(
    response.data?.location?.id || response.data?.id || response.data?.locationId || ''
  ).trim();
  if (returnedLocationId && returnedLocationId !== location) {
    throw new Error(`GoHighLevel verified a different location (${returnedLocationId})`);
  }
  return {
    responseCode: Number(response.status) || 200,
    locationName: response.data?.location?.name || response.data?.name || null
  };
}

function buildCustomFields(scores: {
  creditScore?: number | null;
  experianScore?: number | null;
  equifaxScore?: number | null;
  transunionScore?: number | null;
} | undefined, reportDate: string | null | undefined, mappings: FieldMappings) {
  const fields: Array<{ id: string; fieldValue: string | number }> = [];
  const addField = (id?: string | null, value?: string | number | null) => {
    if (!id) return;
    if (value === null || typeof value === 'undefined') return;
    fields.push({ id, fieldValue: value });
  };
  addField(mappings.creditScore, scores?.creditScore ?? null);
  addField(mappings.experianScore, scores?.experianScore ?? null);
  addField(mappings.equifaxScore, scores?.equifaxScore ?? null);
  addField(mappings.transunionScore, scores?.transunionScore ?? null);
  addField(mappings.reportDate, reportDate ?? null);
  return fields;
}

function buildBusinessProperties(scores: {
  creditScore?: number | null;
  experianScore?: number | null;
  equifaxScore?: number | null;
  transunionScore?: number | null;
} | undefined, reportDate: string | null | undefined, mappings: FieldMappings) {
  const props: Record<string, string | number> = {};
  const addProp = (key?: string | null, value?: string | number | null) => {
    if (!key) return;
    if (value === null || typeof value === 'undefined') return;
    props[key] = value;
  };
  addProp(mappings.creditScore, scores?.creditScore ?? null);
  addProp(mappings.experianScore, scores?.experianScore ?? null);
  addProp(mappings.equifaxScore, scores?.equifaxScore ?? null);
  addProp(mappings.transunionScore, scores?.transunionScore ?? null);
  addProp(mappings.reportDate, reportDate ?? null);
  return props;
}

function extractContactId(data: any) {
  return data?.contact?.id
    || data?.contactId
    || data?.id
    || data?.data?.contact?.id
    || data?.data?.id
    || data?.contact?.contactId
    || null;
}

function extractContactTags(data: any): string[] {
  const tags = data?.contact?.tags
    || data?.data?.contact?.tags
    || data?.data?.tags
    || data?.tags
    || [];
  return Array.isArray(tags) ? tags.map((tag) => String(tag).trim()).filter(Boolean) : [];
}

function sanitizeForGhlNote(value: any): any {
  const sensitiveKeys = new Set([
    'password',
    'password_hash',
    'confirm_password',
    'current_password',
    'new_password',
    'token',
    'access_token',
    'refresh_token',
    'secret',
    'api_key'
  ]);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForGhlNote(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !sensitiveKeys.has(key.toLowerCase()))
        .map(([key, item]) => [key, sanitizeForGhlNote(item)])
    );
  }

  return value;
}

async function findContactId(baseUrl: string, token: string, locationId: string, query: string) {
  const url = `${baseUrl}/contacts/search`;
  try {
    const resp = await axios.get(url, {
      headers: getAuthHeaders(token),
      params: { locationId, query },
      timeout: 15000
    });
    const contacts = resp.data?.contacts
      || resp.data?.data?.contacts
      || resp.data?.results?.contacts
      || resp.data?.data?.data?.contacts
      || [];
    const first = Array.isArray(contacts) ? contacts[0] : null;
    return first?.id || first?.contactId || null;
  } catch (error) {
    const status = (error as any)?.response?.status;
    if (status && status !== 404) {
      throw error;
    }
    return null;
  }
}

async function upsertContact(params: {
  baseUrl: string;
  token: string;
  locationId: string;
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  tags?: string[] | null;
  customFields?: Array<{ id: string; fieldValue: string | number }> | null;
}) {
  const { baseUrl, token, locationId, email, phone, firstName, lastName, tags, customFields } = params;
  if (!locationId || (!email && !phone)) return { contactId: null, skipped: true };

  const payload: any = {
    locationId,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    name: [firstName, lastName].filter(Boolean).join(' ') || undefined,
    email: email || undefined,
    phone: phone || undefined,
    tags: tags && tags.length > 0 ? tags : undefined,
    customFields: customFields && customFields.length > 0 ? customFields : undefined,
    source: 'Score Machine'
  };

  const url = `${baseUrl}/contacts/upsert`;
  const resp = await axios.post(url, payload, { headers: getAuthHeaders(token), timeout: GHL_TIMEOUT_MS });
  return {
    contactId: extractContactId(resp.data),
    skipped: false,
    responseCode: Number(resp.status) || 200
  };
}

async function updateBusinessRecord(baseUrl: string, token: string, recordId: string, locationId: string, properties: Record<string, string | number>) {
  if (!token || !recordId || !locationId) return { skipped: true };
  if (!properties || Object.keys(properties).length === 0) return { skipped: true };
  const url = `${baseUrl}/objects/business/records/${recordId}`;
  const resp = await axios.put(url, { properties }, {
    headers: getAuthHeaders(token),
    params: { locationId },
    timeout: 15000
  });
  return { skipped: false, data: resp.data };
}

export async function syncGhlCreditScores(params: {
  integration: GhlIntegrationConfig;
  locationId?: string | null;
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  scores?: {
    creditScore?: number | null;
    experianScore?: number | null;
    equifaxScore?: number | null;
    transunionScore?: number | null;
  };
  reportDate?: string | null;
}) {
  const integration = params.integration;
  const token = integration?.accessToken;
  if (!token) return { skipped: true };

  const locationId = params.locationId || integration.locationId || '';
  if (!locationId) return { skipped: true };

  const baseUrl = integration.outboundUrl || DEFAULT_BASE_URL;
  const mappings: FieldMappings = {
    creditScore: integration.customFieldCreditScore || null,
    experianScore: integration.customFieldExperianScore || null,
    equifaxScore: integration.customFieldEquifaxScore || null,
    transunionScore: integration.customFieldTransunionScore || null,
    reportDate: integration.customFieldReportDate || null
  };
  const customFields = buildCustomFields(params.scores, params.reportDate, mappings);
  const properties = buildBusinessProperties(params.scores, params.reportDate, mappings);

  const upsert = await upsertContact({
    baseUrl,
    token,
    locationId,
    email: params.email,
    phone: params.phone,
    firstName: params.firstName,
    lastName: params.lastName,
    customFields
  });

  if (integration.businessRecordId && Object.keys(properties).length > 0) {
    await updateBusinessRecord(baseUrl, token, integration.businessRecordId, locationId, properties);
  }

  return { contactId: upsert.contactId || null, skipped: upsert.skipped };
}

type ClientSyncEvent =
  | 'client_created'
  | 'client_updated'
  | 'client_imported'
  | 'report_pulled'
  | 'report_updated'
  | string;

type ClientSummary = {
  negativeAccounts: number | null;
  collectionsAndChargeOffs: number | null;
  utilizationPercentage: number | null;
  reportStatus: string | null;
  reportDate: string | null;
};

function parseJson(value: any) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

function collectObjects(value: any, output: any[] = []): any[] {
  if (!value || typeof value !== 'object') return output;
  if (Array.isArray(value)) {
    value.forEach((item) => collectObjects(item, output));
    return output;
  }
  output.push(value);
  Object.values(value).forEach((item) => collectObjects(item, output));
  return output;
}

function firstNumber(objects: any[], keys: string[]): number | null {
  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));
  for (const object of objects) {
    for (const [key, value] of Object.entries(object)) {
      if (!normalizedKeys.has(key.toLowerCase())) continue;
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
  }
  return null;
}

function summarizeReportData(raw: any): Partial<ClientSummary> {
  const parsed = parseJson(raw);
  if (!parsed) return {};
  const objects = collectObjects(parsed);
  const explicitNegatives = firstNumber(objects, [
    'negative_accounts', 'negativeAccounts', 'negative_account_count', 'negativeAccountCount'
  ]);
  const explicitCollections = firstNumber(objects, [
    'collections_and_charge_offs', 'collectionsAndChargeOffs', 'collection_count', 'collectionsCount'
  ]);
  const utilizationPercentage = firstNumber(objects, [
    'utilization_percentage', 'utilizationPercentage', 'utilization', 'revolving_utilization_pct'
  ]);

  let inferredNegative = 0;
  let inferredCollections = 0;
  let sawAccount = false;
  for (const object of objects) {
    const statusText = [
      object?.status,
      object?.accountStatus,
      object?.paymentStatus,
      object?.accountType,
      object?.type,
      object?.creditor
    ].filter(Boolean).join(' ').toLowerCase();
    if (!statusText) continue;
    const looksLikeAccount = 'balance' in object || 'creditLimit' in object || 'accountStatus' in object || 'paymentStatus' in object;
    if (!looksLikeAccount) continue;
    sawAccount = true;
    if (/(negative|late|delinquent|past due|collection|charge.?off|repossession|bankrupt)/i.test(statusText)) {
      inferredNegative += 1;
    }
    if (/(collection|charge.?off)/i.test(statusText)) {
      inferredCollections += 1;
    }
  }

  return {
    negativeAccounts: explicitNegatives ?? (sawAccount ? inferredNegative : null),
    collectionsAndChargeOffs: explicitCollections ?? (sawAccount ? inferredCollections : null),
    utilizationPercentage
  };
}

function compactFields(fields: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== null && value !== undefined && value !== '')
  );
}

function buildSummaryNote(client: any, summary: ClientSummary) {
  const fields = compactFields({
    'Score Machine client ID': client.id,
    'Credit score': client.credit_score,
    'Experian score': client.experian_score,
    'Equifax score': client.equifax_score,
    'TransUnion score': client.transunion_score,
    'Negative accounts': summary.negativeAccounts,
    'Collections and charge-offs': summary.collectionsAndChargeOffs,
    'Utilization percentage': summary.utilizationPercentage,
    'Report status': summary.reportStatus,
    'Report date': summary.reportDate,
    'Client status': client.status,
    'Fundable status': client.fundable_status
  });
  return Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join('\n');
}

async function writeClientSyncLog(params: {
  integrationId: number;
  adminId: number;
  clientId: number;
  eventType: ClientSyncEvent;
  status: 'success' | 'failed';
  message: string;
  responseCode?: number | null;
  errorMessage?: string | null;
  dataFields: string[];
  retryStatus: string;
}) {
  try {
    await runQuery(
      `INSERT INTO integration_activity_logs
       (integration_id, admin_id, direction, event_type, status, message, client_id,
        response_code, error_message, data_fields, retry_status, created_at)
       VALUES (?, ?, 'outbound', ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        params.integrationId,
        params.adminId,
        params.eventType,
        params.status,
        params.message,
        params.clientId,
        params.responseCode ?? null,
        params.errorMessage ?? null,
        JSON.stringify(params.dataFields),
        params.retryStatus
      ]
    );
  } catch (error: any) {
    console.error('Unable to write GoHighLevel activity log:', error?.message || error);
  }
}

async function loadClientSummary(clientId: number): Promise<ClientSummary> {
  let history: any = null;
  let report: any = null;
  try {
    history = await getQuery(
      `SELECT status, credit_score, experian_score, equifax_score, transunion_score, report_date
       FROM credit_report_history WHERE client_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`,
      [String(clientId)]
    );
  } catch {}
  try {
    report = await getQuery(
      `SELECT status, report_data FROM credit_reports WHERE client_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`,
      [clientId]
    );
  } catch {}
  const fromReport = summarizeReportData(report?.report_data);
  return {
    negativeAccounts: fromReport.negativeAccounts ?? null,
    collectionsAndChargeOffs: fromReport.collectionsAndChargeOffs ?? null,
    utilizationPercentage: fromReport.utilizationPercentage ?? null,
    reportStatus: history?.status || report?.status || null,
    reportDate: history?.report_date || null
  };
}

export async function syncAdminClientToGhl(
  adminId: number,
  clientId: number,
  eventType: ClientSyncEvent
) {
  const integration = await getQuery(
    `SELECT * FROM admin_integrations
     WHERE admin_id = ? AND provider = 'ghl' AND is_active = 1
       AND access_token IS NOT NULL AND TRIM(access_token) <> ''
       AND location_id IS NOT NULL AND TRIM(location_id) <> ''
       AND verified_at IS NOT NULL
     ORDER BY id DESC LIMIT 1`,
    [adminId]
  );
  if (!integration?.id) return { skipped: true, reason: 'not_connected' };

  // The admin predicate is the tenant boundary. Never load or sync a client from
  // another administrator, even if a caller supplies a valid foreign client ID.
  const client = await getQuery(
    `SELECT * FROM clients WHERE id = ? AND user_id = ? LIMIT 1`,
    [clientId, adminId]
  );
  if (!client?.id) {
    await writeClientSyncLog({
      integrationId: Number(integration.id),
      adminId,
      clientId,
      eventType,
      status: 'failed',
      message: 'Client was not synchronized because it does not belong to this admin account',
      errorMessage: 'Tenant ownership check failed',
      dataFields: [],
      retryStatus: 'not_retryable'
    });
    return { skipped: true, reason: 'tenant_mismatch' };
  }

  if (!client.email && !client.phone) {
    await writeClientSyncLog({
      integrationId: Number(integration.id),
      adminId,
      clientId,
      eventType,
      status: 'failed',
      message: 'Client requires an email address or phone number before GoHighLevel sync',
      errorMessage: 'Missing contact identity',
      dataFields: [],
      retryStatus: 'not_retryable'
    });
    return { skipped: true, reason: 'missing_identity' };
  }

  const summary = await loadClientSummary(clientId);
  const attempted = compactFields({
    firstName: client.first_name,
    lastName: client.last_name,
    email: client.email,
    phone: client.phone,
    address1: client.street_number_and_name || client.address,
    city: client.city,
    state: client.state,
    postalCode: client.zip_code,
    country: client.country,
    creditScore: client.credit_score,
    experianScore: client.experian_score,
    equifaxScore: client.equifax_score,
    transunionScore: client.transunion_score,
    negativeAccounts: summary.negativeAccounts,
    collectionsAndChargeOffs: summary.collectionsAndChargeOffs,
    utilizationPercentage: summary.utilizationPercentage,
    reportStatus: summary.reportStatus,
    reportDate: summary.reportDate,
    clientStatus: client.status,
    fundableStatus: client.fundable_status
  });
  const dataFields = Object.keys(attempted);
  const fieldMappings = parseJson(integration.field_mappings) || {};
  const customFieldValues = [
    ['creditScore', client.credit_score],
    ['experianScore', client.experian_score],
    ['equifaxScore', client.equifax_score],
    ['transunionScore', client.transunion_score],
    ['negativeAccounts', summary.negativeAccounts],
    ['collectionsAndChargeOffs', summary.collectionsAndChargeOffs],
    ['utilizationPercentage', summary.utilizationPercentage],
    ['reportStatus', summary.reportStatus],
    ['reportDate', summary.reportDate]
  ].flatMap(([key, value]: any[]) => {
    const id = fieldMappings[key]
      || integration[`custom_field_${String(key).replace(/[A-Z]/g, (letter: string) => `_${letter.toLowerCase()}`)}`];
    return id && value !== null && value !== undefined ? [{ id: String(id), fieldValue: value }] : [];
  });

  const payload = {
    locationId: String(integration.location_id),
    firstName: client.first_name || undefined,
    lastName: client.last_name || undefined,
    name: [client.first_name, client.last_name].filter(Boolean).join(' ') || undefined,
    email: client.email || undefined,
    phone: client.phone || undefined,
    address1: client.street_number_and_name || client.address || undefined,
    city: client.city || undefined,
    state: client.state || undefined,
    postalCode: client.zip_code || undefined,
    country: client.country || undefined,
    source: 'Score Machine',
    tags: ['Score Machine Client'],
    customFields: customFieldValues.length ? customFieldValues : undefined
  };

  const delays = [0, 500, 1500];
  for (let attempt = 0; attempt < delays.length; attempt += 1) {
    if (delays[attempt]) await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    try {
      const response = await axios.post(
        `${DEFAULT_BASE_URL}/contacts/upsert`,
        payload,
        { headers: getAuthHeaders(String(integration.access_token)), timeout: GHL_TIMEOUT_MS }
      );
      const contactId = extractContactId(response.data);
      const summaryNote = buildSummaryNote(client, summary);
      if (contactId && summaryNote) {
        await axios.post(
          `${DEFAULT_BASE_URL}/contacts/${encodeURIComponent(contactId)}/notes`,
          { body: summaryNote },
          { headers: getAuthHeaders(String(integration.access_token)), timeout: GHL_TIMEOUT_MS }
        );
      }
      await writeClientSyncLog({
        integrationId: Number(integration.id),
        adminId,
        clientId,
        eventType,
        status: 'success',
        message: `Client synchronized to GoHighLevel location ${integration.location_id}`,
        responseCode: Number(response.status) || 200,
        dataFields,
        retryStatus: attempt === 0 ? 'not_needed' : `succeeded_on_retry_${attempt}`
      });
      return { skipped: false, contactId, responseCode: response.status };
    } catch (error: any) {
      const details = getGhlApiErrorDetails(error);
      const willRetry = details.retryable && attempt < delays.length - 1;
      await writeClientSyncLog({
        integrationId: Number(integration.id),
        adminId,
        clientId,
        eventType,
        status: 'failed',
        message: details.message,
        responseCode: details.responseCode,
        errorMessage: details.message,
        dataFields,
        retryStatus: willRetry
          ? `retry_scheduled_${attempt + 1}`
          : (details.retryable ? 'retry_exhausted' : 'not_retryable')
      });
      if (!willRetry) throw error;
    }
  }
}

export function syncAdminClientToGhlInBackground(
  adminId: number,
  clientId: number,
  eventType: ClientSyncEvent
) {
  void syncAdminClientToGhl(adminId, clientId, eventType).catch((error) => {
    const details = getGhlApiErrorDetails(error);
    console.error('GoHighLevel client sync failed:', details.message);
  });
}

export async function syncGhlAdminSignup(params: {
  userId?: number | string | null;
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  role?: string | null;
  registrationData?: Record<string, any> | null;
}) {
  const token = String(process.env.GHL_ADMIN_SIGNUP_ACCESS_TOKEN || '').trim();
  const locationId = String(process.env.GHL_ADMIN_SIGNUP_LOCATION_ID || '').trim();
  if (!token || !locationId) {
    return { skipped: true, reason: 'missing_ghl_admin_signup_config' };
  }

  if (!params.email && !params.phone) {
    return { skipped: true, reason: 'missing_email_or_phone' };
  }

  const baseUrl = String(process.env.GHL_ADMIN_SIGNUP_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const fullName = [params.firstName, params.lastName].filter(Boolean).join(' ').trim();
  const sanitizedRegistrationData = sanitizeForGhlNote(params.registrationData || {});
  const payload: any = {
    locationId,
    firstName: params.firstName || undefined,
    lastName: params.lastName || undefined,
    name: fullName || undefined,
    email: params.email || undefined,
    phone: params.phone || undefined,
    companyName: params.companyName || undefined,
    source: 'Score Machine Admin Signup',
    tags: ['score-machine-admin-signup', 'new-admin-user', 'tsm-no-report-pull']
  };

  const resp = await axios.post(`${baseUrl}/contacts/upsert`, payload, {
    headers: getAuthHeaders(token),
    timeout: 15000
  });
  const contactId = extractContactId(resp.data);

  if (contactId) {
    const noteBody = [
      'New Score Machine admin signup',
      `User ID: ${params.userId || 'N/A'}`,
      `Name: ${fullName || 'N/A'}`,
      `Email: ${params.email || 'N/A'}`,
      `Phone: ${params.phone || 'N/A'}`,
      `Company: ${params.companyName || 'N/A'}`,
      `Role: ${params.role || 'admin'}`,
      `Signup Data: ${JSON.stringify(sanitizedRegistrationData)}`
    ].join('\n');

    try {
      await axios.post(`${baseUrl}/contacts/${contactId}/notes`, { body: noteBody }, {
        headers: getAuthHeaders(token),
        timeout: 15000
      });
    } catch (noteError: any) {
      console.warn('GHL admin signup contact synced, but note creation failed:', noteError?.response?.data || noteError?.message || noteError);
    }
  }

  return { contactId: contactId || null, skipped: false };
}

export function isGhlAdminLifecycleConfigured(): boolean {
  return Boolean(
    String(process.env.GHL_ADMIN_SIGNUP_ACCESS_TOKEN || '').trim()
    && String(process.env.GHL_ADMIN_SIGNUP_LOCATION_ID || '').trim()
  );
}

export async function syncGhlAdminLifecycleContact(params: {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  desiredTags: string[];
}) {
  const token = String(process.env.GHL_ADMIN_SIGNUP_ACCESS_TOKEN || '').trim();
  const locationId = String(process.env.GHL_ADMIN_SIGNUP_LOCATION_ID || '').trim();
  if (!token || !locationId) {
    return { skipped: true, reason: 'missing_ghl_admin_signup_config' };
  }

  if (!params.email && !params.phone) {
    return { skipped: true, reason: 'missing_email_or_phone' };
  }

  const baseUrl = String(process.env.GHL_ADMIN_SIGNUP_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const fullName = [params.firstName, params.lastName].filter(Boolean).join(' ').trim();
  const upsertResponse = await axios.post(`${baseUrl}/contacts/upsert`, {
    locationId,
    firstName: params.firstName || undefined,
    lastName: params.lastName || undefined,
    name: fullName || undefined,
    email: params.email || undefined,
    phone: params.phone || undefined,
    companyName: params.companyName || undefined,
    source: 'Score Machine Admin Lifecycle'
  }, {
    headers: getAuthHeaders(token),
    timeout: 15000
  });

  const contactId = extractContactId(upsertResponse.data);
  if (!contactId) {
    throw new Error('GHL contact upsert did not return a contact ID');
  }

  const contactResponse = await axios.get(`${baseUrl}/contacts/${contactId}`, {
    headers: getAuthHeaders(token),
    timeout: 15000
  });
  const currentTags = extractContactTags(contactResponse.data);
  const desiredTags = Array.from(new Set(params.desiredTags.map((tag) => String(tag).trim()).filter(Boolean)));
  const desiredTagKeys = new Set(desiredTags.map((tag) => tag.toLowerCase()));
  const currentTagKeys = new Set(currentTags.map((tag) => tag.toLowerCase()));
  const fixedManagedTagKeys = new Set(GHL_ADMIN_MANAGED_TAGS.map((tag) => tag.toLowerCase()));
  const isManagedTag = (tag: string) => (
    fixedManagedTagKeys.has(tag.toLowerCase())
    || /^\(.+\) purchased$/i.test(tag)
  );

  const tagsToRemove = currentTags.filter((tag) => isManagedTag(tag) && !desiredTagKeys.has(tag.toLowerCase()));
  const tagsToAdd = desiredTags.filter((tag) => !currentTagKeys.has(tag.toLowerCase()));

  if (tagsToRemove.length > 0) {
    await axios.delete(`${baseUrl}/contacts/${contactId}/tags`, {
      headers: getAuthHeaders(token),
      data: { tags: tagsToRemove },
      timeout: 15000
    });
  }

  if (tagsToAdd.length > 0) {
    await axios.post(`${baseUrl}/contacts/${contactId}/tags`, { tags: tagsToAdd }, {
      headers: getAuthHeaders(token),
      timeout: 15000
    });
  }

  return {
    contactId,
    skipped: false,
    addedTags: tagsToAdd,
    removedTags: tagsToRemove
  };
}
