import { clientsApi, creditReportScraperApi } from "@/lib/api";
import { runWithReportPullFeedback, showReportPullError } from "@/lib/reportPullFeedback";

export const BASIC_ADMIN_REPORT_PULL_PLATFORMS = [
  { value: "myfreescorenow", label: "My Free Score Now" },
  { value: "identityiq", label: "IdentityIQ" },
  { value: "myscoreiq", label: "MyScoreIQ" },
] as const;

export type BasicAdminReportPullClient = {
  latestJsonData?: unknown;
  creditReportHistory?: unknown[];
  platform?: string | null;
  platform_email?: string | null;
  platform_password?: string | null;
  ssn_last_four?: string | null;
};

export interface SaveAndPullClientReportInput {
  clientId: string;
  platform: string;
  platformEmail: string;
  platformPassword: string;
  ssnLast4?: string | null;
}

const BASIC_ADMIN_LAST_CLIENT_STORAGE_KEY = "sm_basic_admin_last_client_id";
const BASIC_ADMIN_LAST_PULLED_CLIENT_STORAGE_KEY = "sm_basic_admin_last_pulled_client_id";
export const BASIC_ADMIN_CLIENT_CHANGED_EVENT = "sm-basic-admin-client-changed";

function getStoredBasicAdminClientId(storageKey: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const value = String(window.localStorage.getItem(storageKey) || "").trim();
  return value || null;
}

function setStoredBasicAdminClientId(
  storageKey: string,
  clientId: string | number | null | undefined,
) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedClientId = String(clientId ?? "").trim();

  if (!normalizedClientId) {
    window.localStorage.removeItem(storageKey);
    return;
  }

  window.localStorage.setItem(storageKey, normalizedClientId);
}

export function normalizeBasicAdminBooleanParam(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function requiresReportPullSsn(platform?: string | null) {
  const normalized = String(platform || "").trim().toLowerCase();
  return normalized === "identityiq" || normalized === "myscoreiq";
}

export function hasStoredClientReport(client: BasicAdminReportPullClient | null | undefined) {
  return Boolean(client?.latestJsonData);
}

export function getRememberedBasicAdminClientId() {
  return getStoredBasicAdminClientId(BASIC_ADMIN_LAST_CLIENT_STORAGE_KEY);
}

export function getRememberedBasicAdminLastPulledClientId() {
  return getStoredBasicAdminClientId(BASIC_ADMIN_LAST_PULLED_CLIENT_STORAGE_KEY);
}

export function rememberBasicAdminClientId(clientId: string | number | null | undefined) {
  setStoredBasicAdminClientId(BASIC_ADMIN_LAST_CLIENT_STORAGE_KEY, clientId);
}

export function rememberBasicAdminLastPulledClientId(clientId: string | number | null | undefined) {
  setStoredBasicAdminClientId(BASIC_ADMIN_LAST_PULLED_CLIENT_STORAGE_KEY, clientId);
}

export function notifyBasicAdminClientChanged(clientId: string | number | null | undefined) {
  rememberBasicAdminClientId(clientId);

  if (typeof window === "undefined") {
    return;
  }

  const normalizedClientId = String(clientId ?? "").trim();

  window.dispatchEvent(new CustomEvent(BASIC_ADMIN_CLIENT_CHANGED_EVENT, {
    detail: {
      clientId: normalizedClientId || null,
    },
  }));
}

export function hasReadyReportPullCredentials(client: BasicAdminReportPullClient | null | undefined) {
  const platform = String(client?.platform || "").trim().toLowerCase();
  const platformEmail = String(client?.platform_email || "").trim();
  const platformPassword = String(client?.platform_password || "");
  const ssnLast4 = String(client?.ssn_last_four || "").replace(/\D/g, "").slice(0, 4);

  if (!platform || !platformEmail || !platformPassword) {
    return false;
  }

  if (requiresReportPullSsn(platform) && ssnLast4.length !== 4) {
    return false;
  }

  return true;
}

export async function saveAndPullClientReport(input: SaveAndPullClientReportInput) {
  const platform = String(input.platform || "").trim().toLowerCase();
  const platformEmail = String(input.platformEmail || "").trim();
  const platformPassword = String(input.platformPassword || "");
  const ssnLast4 = String(input.ssnLast4 || "").replace(/\D/g, "").slice(0, 4);

  const updatePayload: Record<string, string> = {
    platform,
    platform_email: platformEmail,
    platform_password: platformPassword,
  };

  if (ssnLast4) {
    updatePayload.ssn_last_four = ssnLast4;
  }

  await clientsApi.updateClient(input.clientId, updatePayload);

  const response = await runWithReportPullFeedback(() =>
    creditReportScraperApi.scrapeReport({
      platform,
      credentials: {
        username: platformEmail,
        password: platformPassword,
      },
      options: {
        ...(requiresReportPullSsn(platform) ? { ssnLast4 } : {}),
      },
      clientId: input.clientId,
    }),
  );

  if ((response as any)?.data?.error) {
    showReportPullError();
    throw new Error((response as any).data.error);
  }

  rememberBasicAdminClientId(input.clientId);
  rememberBasicAdminLastPulledClientId(input.clientId);

  return response;
}