const AFFILIATE_REFERRAL_KEY = 'scoremachine_affiliate_ref';
const AFFILIATE_REFERRAL_COOKIE = 'scoremachine_affiliate_ref';
const AFFILIATE_REFERRAL_MAX_AGE_SECONDS = 60 * 60 * 24;

function normalizeReferralId(value: unknown) {
  const normalized = String(value || '').trim();
  return normalized.length > 0 ? normalized : '';
}

function getCookieDomain(hostname: string) {
  const normalizedHostname = hostname.toLowerCase();

  if (normalizedHostname === 'localhost' || normalizedHostname.endsWith('.localhost')) {
    return 'localhost';
  }

  if (normalizedHostname === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(normalizedHostname)) {
    return '';
  }

  const parts = normalizedHostname.split('.').filter(Boolean);
  if (parts.length < 2) {
    return '';
  }

  return `.${parts.slice(-2).join('.')}`;
}

function getCookieValue(cookieName: string) {
  if (typeof document === 'undefined') {
    return '';
  }

  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf('=');
    const key = separatorIndex >= 0 ? cookie.slice(0, separatorIndex) : cookie;
    if (key === cookieName) {
      const rawValue = separatorIndex >= 0 ? cookie.slice(separatorIndex + 1) : '';
      try {
        return decodeURIComponent(rawValue);
      } catch {
        return rawValue;
      }
    }
  }

  return '';
}

function writeCookie(referralId: string) {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  const secureSegment = window.location.protocol === 'https:' ? '; Secure' : '';
  const encodedValue = encodeURIComponent(referralId);
  const cookieValue = `${AFFILIATE_REFERRAL_COOKIE}=${encodedValue}; Max-Age=${AFFILIATE_REFERRAL_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secureSegment}`;

  document.cookie = cookieValue;

  const cookieDomain = getCookieDomain(window.location.hostname);
  if (cookieDomain) {
    document.cookie = `${cookieValue}; Domain=${cookieDomain}`;
  }
}

function clearCookie() {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  document.cookie = `${AFFILIATE_REFERRAL_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;

  const cookieDomain = getCookieDomain(window.location.hostname);
  if (cookieDomain) {
    document.cookie = `${AFFILIATE_REFERRAL_COOKIE}=; Max-Age=0; Path=/; Domain=${cookieDomain}; SameSite=Lax`;
  }
}

export function persistAffiliateReferralId(referralId: unknown) {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedReferralId = normalizeReferralId(referralId);
  if (!normalizedReferralId) {
    return;
  }

  try {
    window.localStorage.setItem(AFFILIATE_REFERRAL_KEY, normalizedReferralId);
  } catch {}

  try {
    window.sessionStorage.setItem(AFFILIATE_REFERRAL_KEY, normalizedReferralId);
  } catch {}

  writeCookie(normalizedReferralId);
}

export function getStoredAffiliateReferralId() {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    const sessionValue = normalizeReferralId(window.sessionStorage.getItem(AFFILIATE_REFERRAL_KEY));
    if (sessionValue) {
      return sessionValue;
    }
  } catch {}

  try {
    const localValue = normalizeReferralId(window.localStorage.getItem(AFFILIATE_REFERRAL_KEY));
    if (localValue) {
      return localValue;
    }
  } catch {}

  return normalizeReferralId(getCookieValue(AFFILIATE_REFERRAL_COOKIE));
}

export function clearStoredAffiliateReferralId() {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(AFFILIATE_REFERRAL_KEY);
    } catch {}

    try {
      window.sessionStorage.removeItem(AFFILIATE_REFERRAL_KEY);
    } catch {}
  }

  clearCookie();
}