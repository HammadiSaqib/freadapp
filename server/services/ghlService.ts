import axios from 'axios';

const DEFAULT_BASE_URL = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';

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

function buildCustomFields(scores: {
  creditScore?: number | null;
  experianScore?: number | null;
  equifaxScore?: number | null;
  transunionScore?: number | null;
} | undefined, reportDate: string | null | undefined, mappings: FieldMappings) {
  const fields: Array<{ id: string; value: string | number }> = [];
  const addField = (id?: string | null, value?: string | number | null) => {
    if (!id) return;
    if (value === null || typeof value === 'undefined') return;
    fields.push({ id, value });
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
  customFields?: Array<{ id: string; value: string | number }> | null;
}) {
  const { baseUrl, token, locationId, email, phone, firstName, lastName, tags, customFields } = params;
  if (!locationId || (!email && !phone)) return { contactId: null, skipped: true };

  let contactId: string | null = null;
  if (email) {
    contactId = await findContactId(baseUrl, token, locationId, email);
  }
  if (!contactId && phone) {
    contactId = await findContactId(baseUrl, token, locationId, phone);
  }

  const payload: any = {
    locationId,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    email: email || undefined,
    phone: phone || undefined,
    tags: tags && tags.length > 0 ? tags : undefined,
    customField: customFields && customFields.length > 0 ? customFields : undefined
  };

  if (contactId) {
    const url = `${baseUrl}/contacts/${contactId}`;
    const resp = await axios.put(url, payload, { headers: getAuthHeaders(token), timeout: 15000 });
    return { contactId: extractContactId(resp.data) || contactId, skipped: false };
  }

  const url = `${baseUrl}/contacts/`;
  const resp = await axios.post(url, payload, { headers: getAuthHeaders(token), timeout: 15000 });
  return { contactId: extractContactId(resp.data), skipped: false };
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
