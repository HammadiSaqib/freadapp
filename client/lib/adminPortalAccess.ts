import { buildAliasUrl, getHostAlias } from "./hostRouting";

export type AdminPortalMode = "standard" | "basic" | "elite";

export interface AdminPortalAccessFields {
  role?: string | null;
  admin_portal_mode?: string | null;
  has_score_machine_basic_access?: boolean;
  has_score_machine_elite_access?: boolean;
}

interface ResolveAdminPortalTargetOptions {
  protocol?: string;
  hostname?: string;
  port?: string;
}

const LOCAL_BASIC_PORT = "3000";
const LOCAL_PRIMARY_PORT = "3001";
const BASIC_ADMIN_PRODUCTION_HOSTS = new Set(["admin.tsmbasic.com"]);

const normalizePath = (pathname: string) => {
  if (!pathname) {
    return "/";
  }

  return pathname.startsWith("/") ? pathname : `/${pathname}`;
};

const isLocalPortalEnvironment = (hostname: string) => {
  const normalized = hostname.toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized.endsWith(".localhost");
};

export const getAdminPortalMode = (profile?: AdminPortalAccessFields | null): AdminPortalMode => {
  const rawMode = String(profile?.admin_portal_mode || "").trim().toLowerCase();

  if (rawMode === "basic" || rawMode === "elite") {
    return rawMode;
  }

  if (profile?.has_score_machine_basic_access) {
    return "basic";
  }

  if (profile?.has_score_machine_elite_access) {
    return "elite";
  }

  return "standard";
};

export const hasAdminBasicPortalAccess = (profile?: AdminPortalAccessFields | null) => {
  return getAdminPortalMode(profile) === "basic";
};

export const getPreferredAdminPortalPort = (
  profile?: AdminPortalAccessFields | null,
  hostname?: string,
  currentPort?: string,
) => {
  const resolvedHostname = hostname ?? (typeof window !== "undefined" ? window.location.hostname : "localhost");
  const resolvedCurrentPort = currentPort ?? (typeof window !== "undefined" ? window.location.port : LOCAL_PRIMARY_PORT);

  if (!isLocalPortalEnvironment(resolvedHostname)) {
    return resolvedCurrentPort;
  }

  return hasAdminBasicPortalAccess(profile) ? LOCAL_BASIC_PORT : LOCAL_PRIMARY_PORT;
};

export const resolveAdminPortalTarget = (
  pathname: string,
  profile?: AdminPortalAccessFields | null,
  options?: ResolveAdminPortalTargetOptions,
) => {
  const protocol = options?.protocol ?? (typeof window !== "undefined" ? window.location.protocol : "http:");
  const hostname = options?.hostname ?? (typeof window !== "undefined" ? window.location.hostname : "localhost");
  const port = options?.port ?? (typeof window !== "undefined" ? window.location.port : LOCAL_PRIMARY_PORT);
  const targetPort = getPreferredAdminPortalPort(profile, hostname, port);
  const normalizedPath = normalizePath(pathname);
  const currentAlias = getHostAlias(hostname);

  if (currentAlias === "admin" && port === targetPort) {
    return {
      external: false,
      mode: getAdminPortalMode(profile),
      port: targetPort,
      target: normalizedPath,
    };
  }

  return {
    external: true,
    mode: getAdminPortalMode(profile),
    port: targetPort,
    target: buildAliasUrl("admin", normalizedPath, {
      protocol,
      hostname,
      port: targetPort,
    }),
  };
};

export const isAdminPrimaryPortalHost = (hostname: string, port: string) => {
  return getHostAlias(hostname) === "admin" && isLocalPortalEnvironment(hostname) && port === LOCAL_PRIMARY_PORT;
};

export const isBasicAdminPortalHost = (hostname: string, port: string) => {
  const normalizedHostname = hostname.toLowerCase();

  if (getHostAlias(normalizedHostname) !== "admin") {
    return false;
  }

  if (isLocalPortalEnvironment(normalizedHostname)) {
    return port === LOCAL_BASIC_PORT;
  }

  return BASIC_ADMIN_PRODUCTION_HOSTS.has(normalizedHostname);
};

export const buildBasicAdminSubscriptionUrl = (options?: ResolveAdminPortalTargetOptions) => {
  const protocol = options?.protocol ?? (typeof window !== "undefined" ? window.location.protocol : "http:");
  const hostname = options?.hostname ?? (typeof window !== "undefined" ? window.location.hostname : "localhost");
  const port = isLocalPortalEnvironment(hostname)
    ? LOCAL_BASIC_PORT
    : options?.port ?? (typeof window !== "undefined" ? window.location.port : "");

  return buildAliasUrl("admin", "/subscription", {
    protocol,
    hostname,
    port,
  });
};