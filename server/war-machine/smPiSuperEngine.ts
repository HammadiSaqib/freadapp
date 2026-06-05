type BureauPI = {
  full_name: string | null;
  aka_names: string[];
  dob: string | null;
  ssn: string | null;
  current_addresses: string[];
  previous_addresses: string[];
  phones: string[];
  employment: string[];
};

type EnginePayload = {
  consumer_id: string;
  pi: {
    experian: BureauPI;
    transunion: BureauPI;
    equifax: BureauPI;
  };
  options?: {
    strict_mode?: boolean;
    normalize?: boolean;
  };
};

type TriggerHit = { trigger: string; details: string };

const LAWS = [
  'FCRA §602',
  'FCRA §603',
  'FCRA §605',
  'FCRA §605A',
  'FCRA §605B',
  'FCRA §607(b)',
  'FCRA §609(a)(1)',
  'FCRA §610(b)',
  'FCRA §611(a)',
  'FACTA §112',
  'FACTA §315',
  'GLBA §501(b)',
  'CFPB Identity Consistency Requirement',
  'Metro 2 PII Accuracy Standards',
  'UDAAP',
  'UCC Article 9'
];

const up = (s: string) => s.toUpperCase();
const trimCollapse = (s: string) => s.replace(/\s+/g, ' ').trim();
const removePunctExceptHyphen = (s: string) => s.replace(/[^\w\s-]/g, '');
const onlyDigits = (s: string) => s.replace(/\D/g, '');

const levenshtein = (a: string, b: string) => {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
};

const similarity = (a: string, b: string) => {
  const x = trimCollapse(removePunctExceptHyphen(up(a)));
  const y = trimCollapse(removePunctExceptHyphen(up(b)));
  if (!x && !y) return 1;
  if (!x || !y) return 0;
  const dist = levenshtein(x, y);
  const denom = Math.max(x.length, y.length);
  return denom === 0 ? 1 : 1 - dist / denom;
};

const normalizeNameStr = (s: string | null) => {
  const raw = s ? trimCollapse(s) : '';
  const normalized = trimCollapse(removePunctExceptHyphen(up(raw)));
  let parts: string[] = [];
  if (normalized.includes(',')) {
    const segs = normalized.split(',').map(trimCollapse).filter(Boolean);
    if (segs.length >= 2) {
      const last = segs[0];
      const firstMiddle = segs.slice(1).join(' ');
      parts = trimCollapse(`${firstMiddle} ${last}`).split(' ').filter(Boolean);
    } else {
      parts = normalized.split(' ').filter(Boolean);
    }
  } else {
    parts = normalized.split(' ').filter(Boolean);
  }
  let first = '', middle = '', last = '', suffix = '';
  if (parts.length === 1) {
    first = parts[0];
  } else if (parts.length === 2) {
    first = parts[0];
    last = parts[1];
  } else if (parts.length >= 3) {
    first = parts[0];
    last = parts[parts.length - 1];
    middle = parts.slice(1, -1).join(' ');
  }
  if (/\b(JR|SR|II|III|IV|V)\b/.test(last)) {
    suffix = last;
    last = parts.length >= 2 ? parts[parts.length - 2] : last;
  }
  const full = trimCollapse([first, middle, last, suffix].filter(Boolean).join(' '));
  return { full, first, middle, last, suffix };
};

const normalizeDOB = (s: string | null) => {
  if (!s) return { value: null, valid: false };
  const t = String(s).split('T')[0];
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(t);
  return { value: ok ? t : null, valid: ok };
};

const normalizeSSN = (s: string | null) => {
  if (!s) return { last4: '', valid: false, masked: false };
  const digits = onlyDigits(s);
  const last4 = digits.slice(-4);
  const valid = digits.length === 9 || digits.length === 4;
  const masked = /\*/.test(String(s));
  return { last4, valid, masked };
};

const normalizeAddress = (s: string) => {
  let v = up(trimCollapse(String(s || '')));
  v = v.replace(/\bAPARTMENT\b/g, 'APT');
  v = v.replace(/\bAPT\.\b/g, 'APT');
  v = v.replace(/\bSUITE\b/g, 'STE');
  v = v.replace(/\bSTE\.\b/g, 'STE');
  v = v.replace(/\bUNIT\b/g, 'UNIT');
  return v;
};

const extractState = (addr: string) => {
  const m = addr.match(/\b([A-Z]{2})\b(?=\s*\d{5}(-\d{4})?)/);
  return m ? m[1] : null;
};

const zipValid = (addr: string) => /\b\d{5}(-\d{4})?\b/.test(addr);

const hasStreetNumber = (addr: string) => /\b\d+\b/.test(addr);

const isPoBoxOnly = (addr: string) => /\bPO BOX\b/.test(addr) && !hasStreetNumber(addr.replace(/\bPO BOX\b/, ''));

const normAliases = (arr: string[]) => arr.map(a => trimCollapse(removePunctExceptHyphen(up(a)))).filter(Boolean);

export function runSmPiSuperEngine(input: EnginePayload) {
  const strictMode = input.options?.strict_mode ?? true;
  const doNormalize = input.options?.normalize ?? true;
  const E = input.pi.experian;
  const T = input.pi.transunion;
  const Q = input.pi.equifax;
  const nE = doNormalize ? normalizeNameStr(E.full_name) : { full: E.full_name || '', first: '', middle: '', last: '', suffix: '' };
  const nT = doNormalize ? normalizeNameStr(T.full_name) : { full: T.full_name || '', first: '', middle: '', last: '', suffix: '' };
  const nQ = doNormalize ? normalizeNameStr(Q.full_name) : { full: Q.full_name || '', first: '', middle: '', last: '', suffix: '' };
  const dobE = normalizeDOB(E.dob);
  const dobT = normalizeDOB(T.dob);
  const dobQ = normalizeDOB(Q.dob);
  const ssnE = normalizeSSN(E.ssn);
  const ssnT = normalizeSSN(T.ssn);
  const ssnQ = normalizeSSN(Q.ssn);
  const addrE = (E.current_addresses || []).concat(E.previous_addresses || []).map(normalizeAddress);
  const addrT = (T.current_addresses || []).concat(T.previous_addresses || []).map(normalizeAddress);
  const addrQ = (Q.current_addresses || []).concat(Q.previous_addresses || []).map(normalizeAddress);
  const empE = (E.employment || []).map(s => up(trimCollapse(s)));
  const empT = (T.employment || []).map(s => up(trimCollapse(s)));
  const empQ = (Q.employment || []).map(s => up(trimCollapse(s)));
  const akaE = normAliases(E.aka_names || []);
  const akaT = normAliases(T.aka_names || []);
  const akaQ = normAliases(Q.aka_names || []);
  const issues: string[] = [];
  const hits: TriggerHit[] = [];
  const nameThresh = 0.88;
  const sET = similarity(nE.full, nT.full);
  const sEQ = similarity(nE.full, nQ.full);
  const sTQ = similarity(nT.full, nQ.full);
  if ((nE.full || nT.full || nQ.full) && (sET < nameThresh || sEQ < nameThresh || sTQ < nameThresh)) {
    issues.push('Primary name differs beyond tolerance');
    hits.push({ trigger: 'NAME_MISMATCH', details: `EX=${nE.full}, TU=${nT.full}, EQ=${nQ.full}` });
  }
  const dobVals = [dobE.value, dobT.value, dobQ.value].filter(Boolean);
  if (strictMode && (!dobE.valid || !dobT.valid || !dobQ.valid)) {
    issues.push('Invalid DOB format');
    const d = `EX=${E.dob}, TU=${T.dob}, EQ=${Q.dob}`;
    hits.push({ trigger: 'DOB_INVALID_FORMAT', details: d });
  }
  if (dobVals.length > 0) {
    const uniqDob = Array.from(new Set(dobVals));
    if (uniqDob.length > 1) {
      issues.push('DOB mismatch across bureaus');
      hits.push({ trigger: 'DOB_MISMATCH', details: `EX=${dobE.value || 'N/A'}, TU=${dobT.value || 'N/A'}, EQ=${dobQ.value || 'N/A'}` });
    }
  } else {
    issues.push('Missing DOB');
    hits.push({ trigger: 'DOB_MISSING', details: `EX=${E.dob}, TU=${T.dob}, EQ=${Q.dob}` });
  }
  const anyMissingSSN = !ssnE.valid || !ssnT.valid || !ssnQ.valid;
  const last4Set = Array.from(new Set([ssnE.last4, ssnT.last4, ssnQ.last4].filter(Boolean)));
  if (anyMissingSSN) {
    issues.push('Missing SSN');
    hits.push({ trigger: 'SSN_MISSING', details: `EX=***-**-${ssnE.last4 || 'N/A'}, TU=***-**-${ssnT.last4 || 'N/A'}, EQ=***-**-${ssnQ.last4 || 'N/A'}` });
  } else {
    const mismatchLast4 = last4Set.length > 1;
    if (mismatchLast4) {
      issues.push('SSN mismatch across bureaus');
      hits.push({ trigger: 'SSN_MISMATCH', details: `EX=${ssnE.last4 || 'N/A'}, TU=${ssnT.last4 || 'N/A'}, EQ=${ssnQ.last4 || 'N/A'}` });
    }
    const inconsistentMasking = (ssnE.masked ? 1 : 0) + (ssnT.masked ? 1 : 0) + (ssnQ.masked ? 1 : 0);
    if (inconsistentMasking > 0 && inconsistentMasking < 3) {
      issues.push('SSN masked inconsistently');
      hits.push({ trigger: 'SSN_MASK_INCONSISTENT', details: `EX_masked=${ssnE.masked}, TU_masked=${ssnT.masked}, EQ_masked=${ssnQ.masked}` });
    }
  }
  const middlePresence = [nE.middle ? 1 : 0, nT.middle ? 1 : 0, nQ.middle ? 1 : 0];
  if (new Set(middlePresence).size > 1) {
    issues.push('Missing/extra middle initial inconsistency');
    hits.push({ trigger: 'MIDDLE_INITIAL_INCONSISTENT', details: `EX=${nE.middle || 'NONE'}, TU=${nT.middle || 'NONE'}, EQ=${nQ.middle || 'NONE'}` });
  }
  const aliasUnion = Array.from(new Set([...akaE, ...akaT, ...akaQ]));
  for (const a of aliasUnion) {
    const present = [akaE.includes(a), akaT.includes(a), akaQ.includes(a)];
    if (present.filter(Boolean).length === 1) {
      issues.push('Alias present on one bureau only');
      hits.push({ trigger: 'AKA_INCONSISTENT', details: `${a}` });
    }
  }
  const statesE = Array.from(new Set(addrE.map(extractState).filter(Boolean)));
  const statesT = Array.from(new Set(addrT.map(extractState).filter(Boolean)));
  const statesQ = Array.from(new Set(addrQ.map(extractState).filter(Boolean)));
  const allStates = Array.from(new Set([...statesE, ...statesT, ...statesQ]));
  for (const st of allStates) {
    const presence = [statesE.includes(st), statesT.includes(st), statesQ.includes(st)];
    if (presence.filter(Boolean).length === 1) {
      issues.push('Out-of-state address appears only on one bureau');
      hits.push({ trigger: 'ADDRESS_STATE_OUTLIER', details: `${st}` });
    }
  }
  const invalidZipAny = [...addrE, ...addrT, ...addrQ].some(a => !zipValid(a));
  if (invalidZipAny) {
    issues.push('Invalid ZIP format');
    hits.push({ trigger: 'ZIP_INVALID', details: 'One or more addresses have invalid ZIP' });
  }
  const poBoxOnlyAny = [...addrE, ...addrT, ...addrQ].some(a => isPoBoxOnly(a));
  if (poBoxOnlyAny) {
    issues.push('PO BOX only address without street');
    hits.push({ trigger: 'ADDRESS_POBOX_ONLY', details: 'PO BOX only' });
  }
  const streetMissingAny = [...addrE, ...addrT, ...addrQ].some(a => !hasStreetNumber(a));
  if (streetMissingAny) {
    issues.push('Street number missing in address');
    hits.push({ trigger: 'ADDRESS_STREET_MISSING', details: 'Street number missing' });
  }
  const empPresence = [
    empE.length > 0 ? 1 : 0,
    empT.length > 0 ? 1 : 0,
    empQ.length > 0 ? 1 : 0
  ];
  if (new Set(empPresence).size > 1) {
    issues.push('Employment presence inconsistent across bureaus');
    hits.push({ trigger: 'EMPLOYMENT_INCONSISTENT', details: `EX=${empE.length}, TU=${empT.length}, EQ=${empQ.length}` });
  }
  const contradiction = (sET < nameThresh || sEQ < nameThresh || sTQ < nameThresh) && (new Set(dobVals).size > 1);
  if (contradiction) {
    issues.push('Name mismatch with DOB mismatch');
    hits.push({ trigger: 'COMPOUND_INCONSISTENCY', details: 'Name and DOB mismatch' });
  }
  const requiredMissing = [
    nE.full, nT.full, nQ.full
  ].some(v => !v) || [
    dobE.value, dobT.value, dobQ.value
  ].some(v => !v) || [
    ssnE.last4, ssnT.last4, ssnQ.last4
  ].some(v => !v);
  if (requiredMissing) {
    issues.push('Missing or invalid personal information');
    hits.push({ trigger: 'PI_MISSING_OR_INVALID', details: 'One or more required fields missing' });
  }
  const match = issues.length === 0;
  const human = match
    ? 'Personal Information matches across all bureaus.'
    : `Detected ${issues.length} issue(s) across bureaus.`;
  const reason = match ? 'All fields consistent' : 'One or more triggers indicate inconsistency or invalid data';
  const backend_json = {
    section: 'Personal Information',
    match,
    issues_detected: issues,
    reason,
    laws: match ? [] : LAWS
  };
  const debug = {
    normalized: {
      experian: {
        name: nE,
        dob: dobE.value,
        ssn: ssnE,
        addresses: addrE,
        employment: empE,
        aliases: akaE
      },
      transunion: {
        name: nT,
        dob: dobT.value,
        ssn: ssnT,
        addresses: addrT,
        employment: empT,
        aliases: akaT
      },
      equifax: {
        name: nQ,
        dob: dobQ.value,
        ssn: ssnQ,
        addresses: addrQ,
        employment: empQ,
        aliases: akaQ
      }
    },
    trigger_hits: hits
  };
  return {
    human_summary: human,
    backend_json,
    debug
  };
}

export default { runSmPiSuperEngine };
