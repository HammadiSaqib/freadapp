const AUTH_TRANSFER_PREFIX = "__sm_auth_transfer__:";
const AUTH_TRANSFER_TTL_MS = 30_000;
const RETURN_CONTEXT_KEY = "sm_portal_return_context";
const TRANSFER_REDIRECT_KEY = "sm_portal_transfer_redirect";
const TRANSFER_DEBUG_ENDPOINT = "/api/debug/transfer-log";
const TRANSFER_DEBUG_QUEUE_KEY = "sm_transfer_debug_queue";

export const AUTH_STORAGE_KEYS = [
  "auth_token",
  "token",
  "refresh_token",
  "userRole",
  "userId",
  "userName",
] as const;

export type AuthStorageKey = (typeof AUTH_STORAGE_KEYS)[number];

export type StoredAuthSnapshot = Partial<Record<AuthStorageKey, string>>;

export interface PortalReturnContext {
  label: string;
  targetUrl: string;
}

interface AuthTransferPayload {
  targetOrigin: string;
  expiresAt: number;
  auth: StoredAuthSnapshot;
  returnContext: PortalReturnContext | null;
  transferRedirectPath: string | null;
}

function isBrowser() {
  return typeof window !== "undefined";
}

function normalizeAuthSnapshot(snapshot: StoredAuthSnapshot): StoredAuthSnapshot {
  const normalized: StoredAuthSnapshot = { ...snapshot };
  const token = snapshot.auth_token || snapshot.token;

  if (token) {
    normalized.auth_token = token;
    normalized.token = token;
  }

  return normalized;
}

function toUrlSafeBase64(base64: string) {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromUrlSafeBase64(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const remainder = base64.length % 4;
  if (remainder === 0) {
    return base64;
  }

  return `${base64}${"=".repeat(4 - remainder)}`;
}

export function postTransferDebug(event: string, details: Record<string, unknown>) {
  if (!isBrowser()) {
    return;
  }

  const payload = {
    event,
    details,
    origin: window.location.origin,
    pathname: window.location.pathname,
    timestamp: new Date().toISOString(),
  };

  try {
    const existingRaw = window.sessionStorage.getItem(TRANSFER_DEBUG_QUEUE_KEY);
    const existing = existingRaw ? (JSON.parse(existingRaw) as Array<Record<string, unknown>>) : [];
    const next = [...existing, payload].slice(-50);
    window.sessionStorage.setItem(TRANSFER_DEBUG_QUEUE_KEY, JSON.stringify(next));
  } catch {
    // Best-effort queueing only.
  }

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      navigator.sendBeacon(TRANSFER_DEBUG_ENDPOINT, blob);
      return;
    }

    void fetch(TRANSFER_DEBUG_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      keepalive: true,
      body: JSON.stringify(payload),
    });
  } catch {
    return;
  }
}

export async function flushTransferDebugQueue() {
  if (!isBrowser()) {
    return;
  }

  let queue: Array<Record<string, unknown>> = [];
  try {
    const raw = window.sessionStorage.getItem(TRANSFER_DEBUG_QUEUE_KEY);
    queue = raw ? (JSON.parse(raw) as Array<Record<string, unknown>>) : [];
  } catch {
    queue = [];
  }

  if (queue.length === 0) {
    return;
  }

  const remaining: Array<Record<string, unknown>> = [];
  for (const item of queue) {
    try {
      const response = await fetch(TRANSFER_DEBUG_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(item),
      });

      if (!response.ok) {
        remaining.push(item);
      }
    } catch {
      remaining.push(item);
    }
  }

  try {
    if (remaining.length === 0) {
      window.sessionStorage.removeItem(TRANSFER_DEBUG_QUEUE_KEY);
    } else {
      window.sessionStorage.setItem(TRANSFER_DEBUG_QUEUE_KEY, JSON.stringify(remaining.slice(-50)));
    }
  } catch {
    // Ignore storage write failures.
  }
}

function safelyDecodeTransferPayload(value: string): AuthTransferPayload | null {
  const candidates = [value];

  try {
    const decoded = decodeURIComponent(value);
    if (decoded !== value) {
      candidates.push(decoded);
    }
  } catch {
    // Ignore URI decoding failures and continue with raw payload.
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(atob(candidate)) as AuthTransferPayload;
    } catch {
      // Continue to url-safe decoding fallback.
    }

    try {
      return JSON.parse(atob(fromUrlSafeBase64(candidate))) as AuthTransferPayload;
    } catch {
      // Continue searching candidates.
    }
  }

  return null;
}

function safelyEncodeTransferPayload(payload: AuthTransferPayload) {
  return toUrlSafeBase64(btoa(JSON.stringify(payload)));
}

export function getStoredAuthValue(key: AuthStorageKey): string | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setStoredAuthValue(key: AuthStorageKey, value: string) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
}

export function removeStoredAuthValue(key: AuthStorageKey) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    return;
  }
}

export function readStoredAuthSnapshot(): StoredAuthSnapshot {
  const snapshot: StoredAuthSnapshot = {};

  AUTH_STORAGE_KEYS.forEach((key) => {
    const value = getStoredAuthValue(key);
    if (value) {
      snapshot[key] = value;
    }
  });

  return normalizeAuthSnapshot(snapshot);
}

export function hasStoredAuthSnapshot(snapshot: StoredAuthSnapshot = readStoredAuthSnapshot()) {
  return AUTH_STORAGE_KEYS.some((key) => Boolean(snapshot[key]));
}

export function writeStoredAuthSnapshot(snapshot: StoredAuthSnapshot) {
  const normalized = normalizeAuthSnapshot(snapshot);

  AUTH_STORAGE_KEYS.forEach((key) => {
    const value = normalized[key];
    if (typeof value === "string" && value.length > 0) {
      setStoredAuthValue(key, value);
      return;
    }

    removeStoredAuthValue(key);
  });
}

export function clearStoredAuth(options?: { clearReturnContext?: boolean }) {
  AUTH_STORAGE_KEYS.forEach((key) => {
    removeStoredAuthValue(key);
  });

  clearPortalTransferRedirectPath();

  if (options?.clearReturnContext) {
    clearPortalReturnContext();
  }
}

export function getPortalReturnContext(): PortalReturnContext | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(RETURN_CONTEXT_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as PortalReturnContext;
  } catch {
    return null;
  }
}

export function setPortalReturnContext(context: PortalReturnContext | null) {
  if (!isBrowser()) {
    return;
  }

  try {
    if (!context) {
      window.sessionStorage.removeItem(RETURN_CONTEXT_KEY);
      return;
    }

    window.sessionStorage.setItem(RETURN_CONTEXT_KEY, JSON.stringify(context));
  } catch {
    return;
  }
}

export function clearPortalReturnContext() {
  setPortalReturnContext(null);
}

export function getPortalTransferRedirectPath() {
  if (!isBrowser()) {
    return null;
  }

  try {
    return window.sessionStorage.getItem(TRANSFER_REDIRECT_KEY);
  } catch {
    return null;
  }
}

export function setPortalTransferRedirectPath(path: string | null) {
  if (!isBrowser()) {
    return;
  }

  try {
    if (!path) {
      window.sessionStorage.removeItem(TRANSFER_REDIRECT_KEY);
      return;
    }

    window.sessionStorage.setItem(TRANSFER_REDIRECT_KEY, path);
  } catch {
    return;
  }
}

export function clearPortalTransferRedirectPath() {
  setPortalTransferRedirectPath(null);
}

export function stageCrossSubdomainAuthTransfer(
  targetUrlOrOrigin: string,
  options?: {
    auth?: StoredAuthSnapshot;
    returnContext?: PortalReturnContext | null;
    transferRedirectPath?: string | null;
  },
): string | null {
  if (!isBrowser()) {
    return null;
  }

  const auth = normalizeAuthSnapshot(options?.auth ?? readStoredAuthSnapshot());
  const returnContext = options?.returnContext ?? null;
  const transferRedirectPath = options?.transferRedirectPath ?? null;

  if (!hasStoredAuthSnapshot(auth) && !returnContext && !transferRedirectPath) {
    postTransferDebug("stage_bailed", {
      targetUrlOrOrigin,
      reason: "nothing_to_transfer",
    });
    return null;
  }

  const targetOrigin = new URL(targetUrlOrOrigin, window.location.href).origin;

  const payload: AuthTransferPayload = {
    targetOrigin,
    expiresAt: Date.now() + AUTH_TRANSFER_TTL_MS,
    auth,
    returnContext,
    transferRedirectPath,
  };

  const encoded = safelyEncodeTransferPayload(payload);
  window.name = `${AUTH_TRANSFER_PREFIX}${encoded}`;

  postTransferDebug("stage_success", {
    targetUrlOrOrigin,
    targetOrigin,
    hasSnapshot: hasStoredAuthSnapshot(auth),
    authKeys: Object.keys(auth).filter((key) => Boolean((auth as Record<string, string | undefined>)[key])),
    transferRedirectPath,
    hasReturnContext: Boolean(returnContext),
    encodedLength: encoded.length,
  });

  return encoded;
}

export function consumeCrossSubdomainAuthTransfer() {
  if (!isBrowser()) {
    return;
  }

  let raw = window.name;
  let source = "window.name";
  const extractTransferSegment = (value: string) => {
    const separatorIndex = value.indexOf("&");
    return separatorIndex === -1 ? value : value.slice(0, separatorIndex);
  };

  if (!raw.startsWith(AUTH_TRANSFER_PREFIX)) {
    const rawHash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    let decodedHash = rawHash;

    try {
      decodedHash = decodeURIComponent(rawHash);
    } catch {
      // Ignore URI decode failures.
    }

    if (rawHash.startsWith(AUTH_TRANSFER_PREFIX)) {
      raw = extractTransferSegment(rawHash);
      source = "url-hash";
    } else if (decodedHash.startsWith(AUTH_TRANSFER_PREFIX)) {
      raw = extractTransferSegment(decodedHash);
      source = "url-hash";
    }
  }

  if (!raw.startsWith(AUTH_TRANSFER_PREFIX)) {
    postTransferDebug("consume_skipped", {
      reason: "no_transfer_prefix",
      windowNameLength: window.name.length,
      hashPreview: window.location.hash.slice(0, 80),
    });
    void flushTransferDebugQueue();
    return;
  }

  if (source === "url-hash") {
    try {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    } catch {
      // Ignore URL cleanup errors.
    }
  }

  const payload = safelyDecodeTransferPayload(raw.slice(AUTH_TRANSFER_PREFIX.length));
  if (!payload) {
    postTransferDebug("consume_decode_failed", {
      source,
      rawLength: raw.length,
    });
    window.name = "";
    void flushTransferDebugQueue();
    return;
  }

  if (payload.expiresAt <= Date.now()) {
    postTransferDebug("consume_expired", {
      source,
      expiresAt: new Date(payload.expiresAt).toISOString(),
      now: new Date().toISOString(),
    });
    window.name = "";
    void flushTransferDebugQueue();
    return;
  }

  if (payload.targetOrigin !== window.location.origin) {
    postTransferDebug("consume_origin_mismatch", {
      source,
      payloadTargetOrigin: payload.targetOrigin,
      currentOrigin: window.location.origin,
    });
    void flushTransferDebugQueue();
    return;
  }

  if (hasStoredAuthSnapshot(payload.auth)) {
    writeStoredAuthSnapshot(payload.auth);
  }

  setPortalReturnContext(payload.returnContext ?? null);
  setPortalTransferRedirectPath(payload.transferRedirectPath ?? null);
  window.name = "";

  postTransferDebug("consume_success", {
    source,
    authTokenWritten: Boolean(window.localStorage.getItem("auth_token")),
    transferRedirectPath: payload.transferRedirectPath,
    hasReturnContext: Boolean(payload.returnContext),
    authKeys: Object.keys(payload.auth).filter(
      (key) => Boolean((payload.auth as Record<string, string | undefined>)[key]),
    ),
  });
  void flushTransferDebugQueue();
}