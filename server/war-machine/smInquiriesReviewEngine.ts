type Inquiry = {
  creditor_name: string | null;
  date: string | null;
  type: string | null; // 'HARD' | 'SOFT' | raw code like 'I' | 'S'
  industry: string | null;
};

type InquiriesPayload = {
  consumer_id: string;
  inquiries: {
    experian: Inquiry[];
    transunion: Inquiry[];
    equifax: Inquiry[];
  };
  options?: {
    strict_mode?: boolean;
    normalize?: boolean;
    window_months?: number;
  };
};

type TriggerHit = { trigger: string; details: string };

const up = (s: string) => s.toUpperCase();
const trimCollapse = (s: string) => s.replace(/\s+/g, " ").trim();
const removePunctExceptHyphen = (s: string) => s.replace(/[^\w\s-]/g, "");
const onlyDigits = (s: string) => s.replace(/\D/g, "");

const canonicalCreditor = (s: string) => {
  const t = s.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (/navyfederal|navyfcu/.test(t)) return "NAVY FEDERAL CREDIT UNION";
  if (/creditone|crdtonebnk/.test(t)) return "CREDIT ONE BANK";
  if (/jpmcb|chase|jpmmorgan/.test(t)) return "CHASE";
  if (/americanexpress|amex/.test(t)) return "AMERICAN EXPRESS";
  if (/discover/.test(t)) return "DISCOVER";
  if (/capitalone|capone/.test(t)) return "CAPITAL ONE";
  if (/synchrony|syncb/.test(t)) return "SYNCHRONY BANK";
  if (/citi(bank)?/.test(t)) return "CITIBANK";
  if (/wellsfargo/.test(t)) return "WELLS FARGO";
  if (/barclays/.test(t)) return "BARCLAYS";
  return up(trimCollapse(removePunctExceptHyphen(s)));
};

const normalizeType = (t: string | null) => {
  const raw = String(t || "").toUpperCase().trim();
  if (raw === "I" || /HARD/.test(raw)) return "HARD";
  if (raw === "S" || /SOFT/.test(raw)) return "SOFT";
  return raw || null;
};

const parseDate = (s: string | null) => {
  const raw = String(s || "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    const digits = onlyDigits(raw);
    if (digits.length === 8) {
      const y = digits.slice(0, 4);
      const m = digits.slice(4, 6);
      const day = digits.slice(6, 8);
      const dd = new Date(`${y}-${m}-${day}T00:00:00Z`);
      return isNaN(dd.getTime()) ? null : dd;
    }
    return null;
  }
  return d;
};

const fmtDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export function runInquiriesReviewEngine(input: InquiriesPayload) {
  const strictMode = input.options?.strict_mode ?? true;
  const doNormalize = input.options?.normalize ?? true;
  const windowMonths = input.options?.window_months ?? 12;

  const now = new Date();
  const monthsAgo = new Date(now);
  monthsAgo.setMonth(now.getMonth() - windowMonths);

  const normalizeInquiry = (inq: Inquiry) => {
    const creditor = inq.creditor_name ? canonicalCreditor(inq.creditor_name) : null;
    const type = normalizeType(inq.type);
    const date = parseDate(inq.date);
    const industry = inq.industry ? up(trimCollapse(inq.industry)) : null;
    return {
      creditor,
      type,
      date,
      date_str: fmtDate(date),
      industry,
      raw: inq,
    };
  };

  const E = (input.inquiries?.experian || []).map(normalizeInquiry).filter(x => x.type === "HARD");
  const T = (input.inquiries?.transunion || []).map(normalizeInquiry).filter(x => x.type === "HARD");
  const Q = (input.inquiries?.equifax || []).map(normalizeInquiry).filter(x => x.type === "HARD");

  const hits: TriggerHit[] = [];
  const issues: string[] = [];

  const pushHit = (trigger: string, details: string) => {
    hits.push({ trigger, details });
    issues.push(details);
  };

  const withinWindow = (d: Date | null) => (d ? d >= monthsAgo : false);

  const addBureauStats = (arr: any[]) => {
    const hard = arr.filter((x) => x.type === "HARD");
    const missingPurpose = arr.filter((x) => !x.industry);
    return { total: arr.length, hard: hard.length, soft: 0, missing_purpose: missingPurpose.length };
  };

  const stats = {
    experian: addBureauStats(E),
    transunion: addBureauStats(T),
    equifax: addBureauStats(Q),
  };

  const knownCreditors = new Set([
    "NAVY FEDERAL CREDIT UNION",
    "CREDIT ONE BANK",
    "CHASE",
    "AMERICAN EXPRESS",
    "DISCOVER",
    "CAPITAL ONE",
    "SYNCHRONY BANK",
    "CITIBANK",
    "WELLS FARGO",
    "BARCLAYS",
  ]);

  const all = [
    ...E.map((x) => ({ ...x, bureau: "EXPERIAN" })),
    ...T.map((x) => ({ ...x, bureau: "TRANSUNION" })),
    ...Q.map((x) => ({ ...x, bureau: "EQUIFAX" })),
  ];

  const keyFor = (x: any) => `${x.creditor || ""}|${x.date_str || ""}|${x.type || ""}`;

  const seenByBureau: Record<string, Set<string>> = {
    EXPERIAN: new Set(E.map(keyFor)),
    TRANSUNION: new Set(T.map(keyFor)),
    EQUIFAX: new Set(Q.map(keyFor)),
  };

  const globalCounts = new Map<string, number>();
  all.forEach((x) => {
    const k = keyFor(x);
    globalCounts.set(k, (globalCounts.get(k) || 0) + 1);
  });

  all.forEach((x) => {
    if (!x.industry) {
      pushHit("PURPOSE_MISSING", `${x.bureau} inquiry missing purpose: ${x.creditor || "UNKNOWN"} ${x.date_str || ""}`);
    }
    if (!x.industry) {
      pushHit("HARD_WITHOUT_PURPOSE", `${x.bureau} hard inquiry without permissible purpose: ${x.creditor || "UNKNOWN"} ${x.date_str || ""}`);
    }
    if (x.creditor && !knownCreditors.has(x.creditor)) {
      pushHit("UNRECOGNIZED_CREDITOR", `${x.bureau} inquiry by unrecognized creditor: ${x.creditor}`);
    }
  });

  const duplicates: { key: string; count: number; bureaus: string[] }[] = [];
  globalCounts.forEach((count, key) => {
    if (count > 1) {
      const bureaus = ["EXPERIAN", "TRANSUNION", "EQUIFAX"].filter((b) => seenByBureau[b].has(key));
      duplicates.push({ key, count, bureaus });
      pushHit("DUPLICATE_INQUIRY", `Duplicate inquiry (${count}x) across ${bureaus.join(", ")}: ${key}`);
    }
  });

  const volumeByBureau = {
    EXPERIAN: E.filter((x) => withinWindow(x.date) && x.type === "HARD").length,
    TRANSUNION: T.filter((x) => withinWindow(x.date) && x.type === "HARD").length,
    EQUIFAX: Q.filter((x) => withinWindow(x.date) && x.type === "HARD").length,
  };

  Object.entries(volumeByBureau).forEach(([bureau, count]) => {
    if (count >= 6) {
      pushHit("HIGH_VOLUME_12M", `${bureau} shows ${count} hard inquiries in last ${windowMonths} months`);
    }
  });

  const presenceKeys = new Set<string>();
  ["EXPERIAN", "TRANSUNION", "EQUIFAX"].forEach((b) => seenByBureau[b].forEach((k) => presenceKeys.add(k)));

  const crossInconsistencies: { key: string; present_in: string[] }[] = [];
  presenceKeys.forEach((k) => {
    const present = ["EXPERIAN", "TRANSUNION", "EQUIFAX"].filter((b) => seenByBureau[b].has(k));
    if (present.length === 1 && strictMode) {
      crossInconsistencies.push({ key: k, present_in: present });
      pushHit("CROSS_BUREAU_INCONSISTENT", `Inquiry appears only in ${present[0]}: ${k}`);
    }
  });

  const laws = new Set<string>();
  if (hits.some((h) => h.trigger === "PURPOSE_MISSING" || h.trigger === "HARD_WITHOUT_PURPOSE")) {
    laws.add("FCRA §604");
    laws.add("FCRA §609(a)(1)");
    laws.add("GLBA §501(b)");
  }
  if (hits.some((h) => h.trigger === "DUPLICATE_INQUIRY" || h.trigger === "CROSS_BUREAU_INCONSISTENT")) {
    laws.add("FCRA §607(b)");
    laws.add("Metro 2 Accuracy Standards");
  }
  if (hits.some((h) => h.trigger === "UNRECOGNIZED_CREDITOR")) {
    laws.add("FACTA §112");
    laws.add("FACTA §315");
    laws.add("UDAAP");
  }
  if (hits.some((h) => h.trigger === "HIGH_VOLUME_12M")) {
    laws.add("UDAAP");
  }

  const human = hits.length === 0
    ? "All inquiries appear consistent and valid across bureaus"
    : `Detected ${hits.length} potential issues across inquiries`;

  const backend_json = {
    consumer_id: input.consumer_id,
    window_months: windowMonths,
    issues_detected: Array.from(new Set(issues)),
    laws: Array.from(laws),
    duplicates_found: duplicates,
    cross_bureau_inconsistencies: crossInconsistencies,
    stats,
    normalized: {
      experian: E.map((x) => ({
        creditor: x.creditor,
        type: x.type,
        date: x.date_str,
        industry: x.industry,
      })),
      transunion: T.map((x) => ({
        creditor: x.creditor,
        type: x.type,
        date: x.date_str,
        industry: x.industry,
      })),
      equifax: Q.map((x) => ({
        creditor: x.creditor,
        type: x.type,
        date: x.date_str,
        industry: x.industry,
      })),
    },
  };

  const debug = {
    trigger_hits: hits,
  };

  return {
    human_summary: human,
    backend_json,
    debug,
  };
}

export default { runInquiriesReviewEngine };
