const DEFAULT_DATE_LOCALE = "en-US";
const DEFAULT_SHORT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "2-digit",
  day: "2-digit",
  year: "2-digit",
};

type DateLocaleArg = string | string[] | undefined;
type PatchedGlobal = typeof globalThis & {
  __scoreMachineUsDateLocalePatched__?: boolean;
};

const shouldApplyDefaultLocale = (locales?: DateLocaleArg) => {
  if (locales == null) return true;
  if (Array.isArray(locales)) return locales.length === 0;
  return String(locales).trim().length === 0;
};

export const installUsDateLocaleDefaults = () => {
  const patchedGlobal = globalThis as PatchedGlobal;
  if (patchedGlobal.__scoreMachineUsDateLocalePatched__) {
    return;
  }

  patchedGlobal.__scoreMachineUsDateLocalePatched__ = true;

  const originalToLocaleDateString = Date.prototype.toLocaleDateString;
  const originalToLocaleString = Date.prototype.toLocaleString;

  Date.prototype.toLocaleDateString = function patchedToLocaleDateString(
    locales?: DateLocaleArg,
    options?: Intl.DateTimeFormatOptions,
  ) {
    const resolvedLocales = shouldApplyDefaultLocale(locales)
      ? DEFAULT_DATE_LOCALE
      : locales;
    const resolvedOptions = options ?? DEFAULT_SHORT_DATE_OPTIONS;

    return originalToLocaleDateString.call(this, resolvedLocales, resolvedOptions);
  };

  Date.prototype.toLocaleString = function patchedToLocaleString(
    locales?: DateLocaleArg,
    options?: Intl.DateTimeFormatOptions,
  ) {
    const resolvedLocales = shouldApplyDefaultLocale(locales)
      ? DEFAULT_DATE_LOCALE
      : locales;

    return originalToLocaleString.call(this, resolvedLocales, options);
  };
};
