const BUREAUS = ['EFX', 'EXP', 'TU'];

export function toBureauId(bureau) {
  if (!bureau) return null;
  const p = String(bureau).toUpperCase();
  if (p === 'EFX' || p === 'EQUIFAX') return 3;
  if (p === 'EXP' || p === 'EXPERIAN') return 2;
  if (p === 'TU' || p === 'TRANSUNION') return 1;
  return null;
}

function readAmountOrDefault(raw, bureau, fallback = '0') {
  const value = readAmount(raw, bureau);
  return value === '' ? asString(fallback) : value;
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

function asString(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function epochToISO(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return value.trim();
  if (typeof value === 'string') {
    const mdY = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdY) {
      const mm = mdY[1].padStart(2, '0');
      const dd = mdY[2].padStart(2, '0');
      return `${mdY[3]}-${mm}-${dd}`;
    }
    const mdYDash = value.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (mdYDash) {
      const mm = mdYDash[1].padStart(2, '0');
      const dd = mdYDash[2].padStart(2, '0');
      return `${mdYDash[3]}-${mm}-${dd}`;
    }
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  const date = Number.isNaN(parsed) ? new Date(String(value)) : new Date(parsed);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function readBureauValue(raw, bureau) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) return raw;
  if (Object.prototype.hasOwnProperty.call(raw, bureau)) return raw[bureau];
  return null;
}

function readAmount(raw, bureau) {
  const value = readBureauValue(raw, bureau);
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && !Array.isArray(value)) {
    if (value.amount !== undefined && value.amount !== null) return asString(value.amount);
    if (value.value !== undefined && value.value !== null) return asString(value.value);
  }
  return asString(value);
}

function firstNonNull(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== '') return value;
  }
  return null;
}

function splitName(fullName) {
  const parts = asString(fullName).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { FirstName: '', Middle: '', LastName: '' };
  if (parts.length === 1) return { FirstName: parts[0], Middle: '', LastName: '' };
  if (parts.length === 2) return { FirstName: parts[0], Middle: '', LastName: parts[1] };
  return {
    FirstName: parts[0],
    Middle: parts.slice(1, -1).join(' '),
    LastName: parts[parts.length - 1],
  };
}

function normalizeStreet(address) {
  if (!address || typeof address !== 'object') return '';
  const line1 = firstNonNull(address.line1, address.streetAddress, address.street, address.addressLine1);
  const line2 = firstNonNull(address.line2, address.addressLine2, '');
  return [asString(line1), asString(line2)].filter(Boolean).join(' ').trim();
}

function normalizeMonthCode(status) {
  const text = String(status || '').toUpperCase();
  if (!text) return 'U';
  if (text.includes('PAYS_AS_AGREED') || text.includes('CURRENT')) return 'C';
  if (text.includes('NOT_REPORTED') || text.includes('UNAVAILABLE') || text.includes('NO_DATA')) return 'U';
  if (text.includes('120') || text.includes('COLLECTION') || text.includes('CHARGE_OFF')) return '4';
  if (text.includes('90')) return '3';
  if (text.includes('60')) return '2';
  if (text.includes('30')) return '1';
  return 'U';
}

function toTitleCase(raw) {
  return asString(raw)
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function mapCondition(rawCondition) {
  const c = String(rawCondition || '').toUpperCase();
  if (c === 'OPEN') return 'Open';
  if (c === 'CLOSED') return 'Closed';
  return 'Open';
}

function mapDesignator(raw) {
  const code = String(raw || '').toUpperCase();
  if (!code) return '';
  if (code === 'INDIVIDUAL') return 'Individual';
  if (code === 'JOINT_CONTRACTUAL_LIABILITY') return 'Joint';
  if (code === 'AUTHORIZED_USER') return 'Authorized User';
  return toTitleCase(code);
}

function shiftMonths(dateISO, deltaMonths) {
  if (!dateISO) return '';
  const [y, m] = String(dateISO).split('-').map(Number);
  if (!y || !m) return '';
  const d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() + deltaMonths);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function computeWorstPayStatus(historyString) {
  if (!historyString) return 'Current';
  if (!/[1234]/.test(historyString)) return 'Current';
  if (historyString.includes('4')) return '120 Days';
  if (historyString.includes('3')) return '90 Days';
  if (historyString.includes('2')) return '60 Days';
  return '30 Days';
}

function ymToKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function addMonths(year, month, delta) {
  const d = new Date(Date.UTC(year, month - 1, 1));
  d.setUTCMonth(d.getUTCMonth() + delta);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

function inferIsMortgage(rawType, loanType, portfolioType, category) {
  const combined = [rawType, loanType, portfolioType, category].map((x) => String(x || '').toUpperCase()).join(' ');
  return /MORTGAGE|REAL[_\s-]?ESTATE|HOME[_\s-]?LOAN/.test(combined);
}

function mapAccountTypeDescription(rawType, loanType, portfolioType, category) {
  const type = String(rawType || '').toUpperCase();
  if (type === 'REVOLVING') return 'Revolving Account';
  if (type === 'INSTALLMENT') return 'Installment Account';
  if (inferIsMortgage(rawType, loanType, portfolioType, category)) return 'Primary or secondary mortgage';
  return 'Unknown';
}

function mapSpecificAccountType(rawType, creditorName, loanType, portfolioType, category) {
  const creditor = String(creditorName || '').toUpperCase();
  const type = String(rawType || '').toUpperCase();
  if (inferIsMortgage(rawType, loanType, portfolioType, category)) return 'Conventional real estate mortgage';
  if (type === 'REVOLVING') {
    if (/(CBNA|SYNCB)/.test(creditor)) return 'Charge account';
    return 'Credit Card';
  }
  if (type === 'INSTALLMENT') {
    if (/(TOYOTA|HONDA|FORD|NISSAN|ALLY|CAPITAL ONE AUTO|SANTANDER|GM FINANCIAL|CHASE AUTO|WELLS FARGO AUTO)/.test(creditor)) {
      return 'Auto Loan';
    }
    return 'Installment Loan';
  }
  return 'Unknown';
}

function mapConditionDetailed(rawCondition, rawStatus, currentBalance, commentsText) {
  const c = String(rawCondition || '').toUpperCase();
  const s = String(rawStatus || '').toUpperCase();
  const remarks = String(commentsText || '').toUpperCase();
  const isTransferred = /TRANSFER/.test(c) || /TRANSFER/.test(s) || /TRANSFER/.test(remarks);
  if (isTransferred) return 'Transferred';

  const isClosed = /CLOSED|PAID|SETTLED|CHARGE_OFF|COLLECTION/.test(c) || /CLOSED|PAID|SETTLED|CHARGE_OFF|COLLECTION/.test(s);
  if (isClosed) {
    const amount = Number.parseFloat(String(currentBalance || '0'));
    if (Number.isFinite(amount) && amount === 0) return 'Paid';
    return 'Closed';
  }
  return 'Open';
}

function mapPaymentFrequency(rawType, termFrequency, termDurationMonths) {
  const type = String(rawType || '').toUpperCase();
  if (type === 'REVOLVING') return '';
  const tf = String(termFrequency || '').toUpperCase();
  if (tf.includes('MONTH') || tf === 'M' || tf === 'MON' || tf === 'MNTH') return 'Monthly (every month)';
  const months = Number.parseInt(termDurationMonths, 10);
  if (Number.isFinite(months) && months > 0) return 'Monthly (every month)';
  return '';
}

function extractPaymentHistory(historyRaw, bureau, fallbackDate) {
  const history = toArray(readBureauValue(historyRaw, bureau));
  const monthsReviewed = Number.parseInt(firstNonNull(
    readBureauValue(historyRaw?.monthsReviewed, bureau),
    readBureauValue(historyRaw?.monthReviewed, bureau),
    readBureauValue(historyRaw?.months, bureau)
  ), 10);
  const targetLength = Math.min(
    48,
    Number.isFinite(monthsReviewed) && monthsReviewed > 0 ? monthsReviewed : 24
  );

  const dayPart = Number.parseInt(String(fallbackDate || '').split('-')[2], 10);
  const reportDay = Number.isFinite(dayPart) && dayPart > 0 ? dayPart : 1;

  if (history.length === 0) {
    return {
      WorstPayStatus: 'Current',
      PayStatusHistoryStartDate: asString(shiftMonths(fallbackDate, -(targetLength - 1)) || fallbackDate),
      PayStatusHistory: 'U'.repeat(targetLength),
    };
  }

  const normalized = history.map((item) => {
    if (typeof item === 'string') {
      return { code: normalizeMonthCode(item), year: null, month: null };
    }
    const rawStatus = firstNonNull(item?.monthType, item?.value, item?.status, item?.code);
    return {
      code: normalizeMonthCode(rawStatus),
      year: Number.parseInt(item?.year, 10) || null,
      month: Number.parseInt(item?.month, 10) || null,
    };
  });

  const dated = normalized.filter((x) => x.year && x.month);
  if (dated.length > 0) {
    dated.sort((a, b) => (b.year - a.year) || (b.month - a.month));
    const newest = { year: dated[0].year, month: dated[0].month };
    const mapByMonth = new Map(dated.map((x) => [ymToKey(x.year, x.month), x.code]));

    const chars = [];
    for (let i = targetLength - 1; i >= 0; i -= 1) {
      const ym = addMonths(newest.year, newest.month, -i);
      chars.push(mapByMonth.get(ymToKey(ym.year, ym.month)) || 'U');
    }
    const oldest = addMonths(newest.year, newest.month, -(targetLength - 1));
    const startDate = `${oldest.year}-${String(oldest.month).padStart(2, '0')}-${String(reportDay).padStart(2, '0')}`;
    const historyString = chars.join('');

    return {
      WorstPayStatus: computeWorstPayStatus(historyString),
      PayStatusHistoryStartDate: startDate,
      PayStatusHistory: historyString,
    };
  }

  const newestFirst = normalized.map((x) => x.code || 'U').slice(0, targetLength);
  const historyString = newestFirst.reverse().join('').padStart(targetLength, 'U');
  return {
    WorstPayStatus: computeWorstPayStatus(historyString),
    PayStatusHistoryStartDate: asString(shiftMonths(fallbackDate, -(targetLength - 1)) || fallbackDate),
    PayStatusHistory: historyString,
  };
}

function mapPaymentStatus(rawStatus) {
  const status = String(rawStatus || '').toUpperCase();
  if (status === 'PAYS_AS_AGREED') return 'Current';
  return status ? 'Delinquent' : '';
}

function getReportPayload(currentFileJson) {
  if (currentFileJson?.reportData?.data?.data) return currentFileJson.reportData.data.data;
  if (currentFileJson?.reportData?.data) return currentFileJson.reportData.data;
  if (currentFileJson?.reportData && currentFileJson.reportData.date) return currentFileJson.reportData;
  if (currentFileJson?.reportData && typeof currentFileJson.reportData === 'object') return currentFileJson.reportData;
  if (currentFileJson?.data?.data?.data) return currentFileJson.data.data.data;
  if (currentFileJson?.data?.data) return currentFileJson.data.data;
  if (currentFileJson?.data && currentFileJson.data.date) return currentFileJson.data;
  if (currentFileJson?.data && typeof currentFileJson.data === 'object') return currentFileJson.data;
  return {};
}

function ensureLegacyArrays(reportData) {
  return {
    CreditReport: toArray(reportData?.CreditReport),
    Name: toArray(reportData?.Name),
    Address: toArray(reportData?.Address),
    DOB: toArray(reportData?.DOB),
    Score: toArray(reportData?.Score),
    Employer: toArray(reportData?.Employer),
    Inquiries: toArray(reportData?.Inquiries),
    PublicRecords: toArray(reportData?.PublicRecords),
    Accounts: toArray(reportData?.Accounts),
  };
}

function assertNoWrapperKeys(reportData) {
  if (Object.prototype.hasOwnProperty.call(reportData, 'success')) {
    throw new Error('Invalid legacy reportData: success key must not exist');
  }
  if (Object.prototype.hasOwnProperty.call(reportData, 'message')) {
    throw new Error('Invalid legacy reportData: message key must not exist');
  }
  if (Object.prototype.hasOwnProperty.call(reportData, 'data')) {
    throw new Error('Invalid legacy reportData: data key must not exist');
  }
}

function mapCreditReport(payload) {
  const reportDateRaw = firstNonNull(
    payload?.ReportDate,
    readBureauValue(payload?.date, 'EFX'),
    readBureauValue(payload?.date, 'EXP'),
    readBureauValue(payload?.date, 'TU')
  );

  return [{
    DateReport: epochToISO(reportDateRaw),
    ReportProvider: 'MyFreeScoreNow',
  }];
}

function mapNames(payload) {
  const primary = payload?.Borrower?.BorrowerName?.Primary;
  const out = [];

  for (const bureau of BUREAUS) {
    const bureauId = toBureauId(bureau);
    const nameRaw = typeof primary === 'string' ? primary : readBureauValue(primary, bureau);
    if (!nameRaw) continue;
    const split = splitName(nameRaw);
    out.push({ BureauId: bureauId, ...split, NameType: 'Primary' });
  }

  return out;
}

export function assertValidBureauIds(reportData) {
  const groups = [
    reportData?.Accounts,
    reportData?.Inquiries,
    reportData?.Score,
    reportData?.Name,
    reportData?.Address,
    reportData?.DOB,
    reportData?.Employer,
    reportData?.PublicRecords,
  ];

  groups.forEach((group) => {
    toArray(group).forEach((row) => {
      if (!row || typeof row !== 'object' || !Object.prototype.hasOwnProperty.call(row, 'BureauId')) return;
      if (![1, 2, 3].includes(row.BureauId)) {
        throw new Error('Invalid BureauId mapping detected');
      }
    });
  });
}

function mapAddresses(payload) {
  const out = [];
  for (const bureau of BUREAUS) {
    const bureauId = toBureauId(bureau);
    const current = readBureauValue(payload?.currentAddress, bureau);
    const currentLine1 = asString(firstNonNull(current?.line1, current?.streetAddress, current?.street, current?.addressLine1));
    if (current && currentLine1) {
      out.push({
        BureauId: bureauId,
        StreetAddress: normalizeStreet(current),
        City: asString(current.city),
        State: asString(current.state),
        Zip: asString(firstNonNull(current.zip, current.postalCode)),
        AddressType: 'Current',
      });
    }

    toArray(readBureauValue(payload?.previousAddresses, bureau)).forEach((prev) => {
      out.push({
        BureauId: bureauId,
        StreetAddress: normalizeStreet(prev),
        City: asString(prev?.city),
        State: asString(prev?.state),
        Zip: asString(firstNonNull(prev?.zip, prev?.postalCode)),
        AddressType: 'Previous',
      });
    });
  }
  return out.filter((x) => x.StreetAddress || x.City || x.State || x.Zip);
}

function mapDOB(payload) {
  const out = [];
  for (const bureau of BUREAUS) {
    const bureauId = toBureauId(bureau);
    const dob = firstNonNull(
      readBureauValue(payload?.dob, bureau),
      readBureauValue(payload?.Borrower?.BirthYear, bureau),
      typeof payload?.Borrower?.BirthYear !== 'object' ? payload?.Borrower?.BirthYear : null
    );
    const formatted = epochToISO(dob);
    if (!formatted) continue;
    out.push({ BureauId: bureauId, DOB: formatted });
  }
  return out;
}

function mapScores(payload, dateReport) {
  const out = [];
  for (const bureau of BUREAUS) {
    const bureauId = toBureauId(bureau);
    const score = readBureauValue(payload?.RiskScore, bureau);
    if (score === null || score === undefined || score === '') continue;
    out.push({
      BureauId: bureauId,
      Score: asString(score),
      ScoreType: 'VantageScore3',
      DateScore: asString(dateReport),
    });
  }
  return out;
}

function mapEmployers(payload) {
  const out = [];
  for (const bureau of BUREAUS) {
    const bureauId = toBureauId(bureau);
    toArray(readBureauValue(payload?.Borrower?.Employer, bureau)).forEach((emp) => {
      if (!emp) return;
      const employerName = typeof emp === 'string'
        ? emp
        : firstNonNull(emp.Address, emp.name, emp.employerName, emp.employer);
      const dateUpdated = epochToISO(firstNonNull(emp?.DateUpdated, emp?.dateUpdated));
      if (!employerName) return;
      out.push({
        BureauId: bureauId,
        EmployerName: asString(employerName).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim(),
        DateUpdated: asString(dateUpdated),
        DateReported: asString(dateUpdated),
      });
    });
  }
  return out;
}

const INQUIRY_HINT_REGEX = /(inquir|hard|soft|creditor|subscriber|member|request|date|permissible|purpose)/i;

function isInquiryLikeObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const hasDate = Boolean(firstNonNull(
    value.inquiryDate,
    value.dateInquiry,
    value.dateOfInquiry,
    value.requestDate,
    value.requestedDate,
    value.date,
    value.inquiredOn
  ));
  const hasCreditor = Boolean(firstNonNull(
    value.creditorName,
    value.subscriberName,
    value.businessName,
    value.memberName,
    value.requestor,
    value.creditor,
    value.subscriber,
    value.name
  ));
  return hasDate && hasCreditor;
}

function normalizeBureauCode(code) {
  const raw = String(code || '').toUpperCase();
  if (raw === 'EQF') return 'EFX';
  if (raw === 'TUC') return 'TU';
  if (raw === 'XPN') return 'EXP';
  return raw;
}

function detectBureauCodeFromValue(value, path = '') {
  const pathParts = String(path).split('.');
  for (const part of pathParts.reverse()) {
    const normalized = normalizeBureauCode(part);
    if (toBureauId(normalized)) return normalized;
  }

  const candidates = [
    value?.bureau,
    value?.Bureau,
    value?.source?.bureau,
    value?.Source?.Bureau?.symbol,
    value?.bureauCode,
  ];
  for (const c of candidates) {
    const normalized = normalizeBureauCode(c);
    if (toBureauId(normalized)) return normalized;
  }
  return '';
}

export function schemaProbe(raw, options = {}) {
  const { limit = 20 } = options;
  const matches = [];
  const inquirySignals = [];

  const pushMatch = (entry, isSignal = false) => {
    if (matches.length < limit) matches.push(entry);
    if (isSignal && inquirySignals.length < limit) inquirySignals.push(entry);
  };

  const walk = (node, path = 'root') => {
    if (node === null || node === undefined) return;

    if (Array.isArray(node)) {
      node.forEach((item, idx) => walk(item, `${path}[${idx}]`));
      return;
    }

    if (typeof node !== 'object') return;

    if (isInquiryLikeObject(node)) {
      pushMatch({ path, reason: 'inquiry-like-object', sample: node }, true);
    }

    Object.entries(node).forEach(([key, value]) => {
      const nextPath = `${path}.${key}`;
      if (INQUIRY_HINT_REGEX.test(key)) {
        const signal = /inquir/i.test(key) || isInquiryLikeObject(value);
        pushMatch({ path: nextPath, reason: `key-match:${key}`, sample: value }, signal);
      }
      walk(value, nextPath);
    });
  };

  walk(raw, 'raw');

  if (matches.length > 0) {
    console.log('[schemaProbe] inquiry-like paths (top 20):');
    matches.slice(0, limit).forEach((m, idx) => {
      let sample = '';
      try {
        sample = JSON.stringify(m.sample);
      } catch (_) {
        sample = '[Unserializable sample]';
      }
      if (sample.length > 240) sample = `${sample.slice(0, 240)}...`;
      console.log(`[schemaProbe][${idx + 1}] ${m.path} (${m.reason}) sample=${sample}`);
    });
  } else {
    console.log('[schemaProbe] no inquiry-like paths found');
  }

  return { matches, inquirySignals };
}

function collectInquiryCandidates(raw) {
  const candidates = [];

  const walk = (node, path = 'raw', bureauHint = '') => {
    if (node === null || node === undefined) return;

    if (Array.isArray(node)) {
      node.forEach((item, idx) => walk(item, `${path}[${idx}]`, bureauHint));
      return;
    }

    if (typeof node !== 'object') return;

    const detectedBureau = detectBureauCodeFromValue(node, path) || bureauHint;
    if (isInquiryLikeObject(node)) {
      candidates.push({ item: node, bureau: detectedBureau, path });
    }

    Object.entries(node).forEach(([key, value]) => {
      const normalized = normalizeBureauCode(key);
      const nextHint = toBureauId(normalized) ? normalized : detectedBureau;
      walk(value, `${path}.${key}`, nextHint);
    });
  };

  walk(raw, 'raw', '');
  return candidates;
}

function readInquiryField(item, bureauCode, fieldNames) {
  for (const field of fieldNames) {
    const value = item?.[field];
    const byBureau = readBureauValue(value, bureauCode);
    const selected = firstNonNull(byBureau, value);
    if (selected !== null && selected !== undefined && selected !== '') return selected;
  }
  return null;
}

function mapInquiryType(rawType) {
  const text = String(rawType || '').toLowerCase();
  if (text.includes('soft')) return 'Soft';
  if (text.includes('hard')) return 'Hard';
  return 'Hard';
}

function mapInquiries(payload) {
  const probe = schemaProbe(payload);
  const list = toArray(firstNonNull(payload?.allInquiries, payload?.data?.allInquiries));
  const out = [];
  const seen = new Set();

  const pushInquiry = (item) => {
    const bureauId = toBureauId(normalizeBureauCode(item?.provider));
    if (!bureauId) return;

    const creditorName = asString(item?.contactInformation?.contactName);
    const dateInquiry = epochToISO(item?.reportedDate);

    const dedupeKey = `${bureauId}|${creditorName}|${dateInquiry}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);

    out.push({
      BureauId: bureauId,
      CreditorName: creditorName,
      InquiryType: String(item?.type || '').toUpperCase() === 'SOFT' ? 'Soft' : 'Hard',
      DateInquiry: dateInquiry,
      Industry: null,
      PermissiblePurpose: null,
    });
  };

  list.forEach((item) => pushInquiry(item));

  const fetchedInquiryCount = BUREAUS.reduce((sum, bureauCode) => {
    const bureauItems = toArray(readBureauValue(payload?.fetchedInquiries, bureauCode));
    return sum + bureauItems.length;
  }, 0);

  if (probe.inquirySignals.length > 0 && out.length === 0) {
    console.warn('[scraper] Inquiry mapping signals detected but no inquiries mapped. Proceeding with empty inquiries.');
  }

  if (fetchedInquiryCount > 0 && out.length === 0) {
    console.warn('[scraper] fetchedInquiries present but mapping produced no results. Proceeding with empty inquiries.');
  }

  return out;
}

function mapPublicRecords(payload) {
  const source = firstNonNull(payload?.PublicRecords, payload?.publicRecords, payload?.Borrower?.PublicRecords);
  if (!source) return [];

  const normalizePublicRecord = (item, fallbackBureauId = null) => {
    if (!item || typeof item !== 'object') return null;

    const explicitBureauId = Number.parseInt(String(firstNonNull(item?.BureauId, item?.bureauId, '')), 10);
    const bureauId = Number.isFinite(explicitBureauId) && explicitBureauId > 0
      ? explicitBureauId
      : firstNonNull(fallbackBureauId, toBureauId(firstNonNull(item?.bureau, item?.bureauCode, item?.provider)));

    if (!bureauId) return null;

    const dateFiled = epochToISO(firstNonNull(item?.DateFiled, item?.dateFiled));
    const dateReported = epochToISO(firstNonNull(item?.DateReported, item?.dateReported));
    const date = epochToISO(firstNonNull(item?.Date, item?.date, dateFiled, dateReported));

    return {
      BureauId: bureauId,
      Type: asString(firstNonNull(item?.Type, item?.type, item?.publicRecordType)),
      Classification: asString(firstNonNull(item?.Classification, item?.classification, item?.Type, item?.type, item?.publicRecordType)),
      Amount: asString(firstNonNull(item?.Amount, item?.amount, item?.AssetAmount, item?.assetAmount)),
      Date: date,
      DateFiled: dateFiled || date,
      DateReported: dateReported || date,
      Status: asString(firstNonNull(item?.Status, item?.status)),
      Industry: asString(firstNonNull(item?.Industry, item?.industry)),
      AccountDesignator: asString(firstNonNull(item?.AccountDesignator, item?.accountDesignator)),
      ReferenceNumber: asString(firstNonNull(item?.ReferenceNumber, item?.referenceNumber, item?.CaseNumber, item?.caseNumber, item?.docketNumber)),
      ClosingDate: epochToISO(firstNonNull(item?.ClosingDate, item?.closingDate, item?.dateClosed)),
      Court: asString(firstNonNull(item?.Court, item?.court, item?.courtName)),
      AssetAmount: asString(firstNonNull(item?.AssetAmount, item?.assetAmount, item?.Amount, item?.amount)),
      Liability: asString(firstNonNull(item?.Liability, item?.liability)),
      ExemptAmount: asString(firstNonNull(item?.ExemptAmount, item?.exemptAmount)),
      Remarks: asString(firstNonNull(item?.Remarks, item?.remarks)),
      Name: asString(firstNonNull(item?.Name, item?.name)),
      CaseNumber: asString(firstNonNull(item?.CaseNumber, item?.caseNumber)),
    };
  };

  if (Array.isArray(source)) {
    return source
      .map((item) => normalizePublicRecord(item))
      .filter(Boolean);
  }

  const out = [];
  for (const bureau of BUREAUS) {
    const bureauId = toBureauId(bureau);
    toArray(readBureauValue(source, bureau)).forEach((item) => {
      const normalized = normalizePublicRecord(item, bureauId);
      if (normalized) out.push(normalized);
    });
  }
  return out;
}

export function convertAccountsToLegacy(src) {
  const payload = src || {};
  const dateReportRaw = firstNonNull(
    payload?.ReportDate,
    readBureauValue(payload?.date, 'EFX'),
    readBureauValue(payload?.date, 'EXP'),
    readBureauValue(payload?.date, 'TU')
  );
  const dateReport = epochToISO(dateReportRaw);
  const buckets = [
    payload?.finalAccountDetails?.positive?.open,
    payload?.finalAccountDetails?.positive?.closed,
    payload?.finalAccountDetails?.negative?.open,
    payload?.finalAccountDetails?.negative?.closed,
  ];

  const out = [];
  const seen = new Set();

  buckets.forEach((bucket) => {
    toArray(bucket).forEach((account) => {
      if (!account || typeof account !== 'object') return;

      for (const bureau of BUREAUS) {
        const bureauId = toBureauId(bureau);
        const creditorName = asString(readBureauValue(account.accountName, bureau));
        if (!creditorName) continue;

        const accountNumber = asString(readBureauValue(account.accountNumber, bureau));
        const dateOpened = epochToISO(readBureauValue(account.dateOpened, bureau));
        const dedupeKey = `${bureauId}|${creditorName}|${accountNumber}|${dateOpened}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        const rawType = asString(readBureauValue(account.accountType, bureau));
        const loanType = asString(readBureauValue(account.loanType, bureau));
        const portfolioType = asString(readBureauValue(account.portfolioType, bureau));
        const category = asString(readBureauValue(account.category, bureau));
        const rawStatus = asString(readBureauValue(account.accountStatus, bureau));
        const accountConditionRaw = firstNonNull(
          readBureauValue(account.accountCondition, bureau),
          readBureauValue(account.activityDesignator, bureau)
        );
        const dateOpenedISO = asString(dateOpened);
        const dateReported = epochToISO(readBureauValue(account.reportedDate, bureau));
        const dateReportedISO = asString(dateReported || dateReport);
        const dateAccountStatus = epochToISO(firstNonNull(
          readBureauValue(account.lastActivityDate, bureau),
          readBureauValue(account.statusDate, bureau),
          readBureauValue(account.reportedDate, bureau)
        ));

        const comments = toArray(readBureauValue(account.comments, bureau));
        const remark = comments
          .map((c) => (typeof c === 'string' ? c : c?.description))
          .filter(Boolean)
          .join('; ') || null;

        const currentBalance = readAmountOrDefault(account.balanceAmount, bureau, '0');
        const amountPastDue = readAmountOrDefault(account.pastDueAmount, bureau, '0');
        const mappedCondition = mapConditionDetailed(accountConditionRaw, rawStatus, currentBalance, remark);
        const preliminaryPaymentStatus = mapPaymentStatus(rawStatus) || 'Delinquent';
        const defaultMissingCode = (bureau === 'TU') ? 'U' : (preliminaryPaymentStatus === 'Current' ? 'C' : 'U');

        const historyInfo = extractPaymentHistory(account.paymentHistory, bureau, dateReportedISO || dateReport);
        const historyString = account?.paymentHistory ? historyInfo.PayStatusHistory : defaultMissingCode.repeat(24);
        const historyStartDate = account?.paymentHistory
          ? historyInfo.PayStatusHistoryStartDate
          : asString(shiftMonths(dateReportedISO || dateReport, -23) || dateReportedISO || dateReport);
        const hasDelinquency = /[1234]/.test(historyString);
        const amountPastDueNum = Number.parseFloat(amountPastDue);
        const paymentStatus = rawStatus.toUpperCase() === 'PAYS_AS_AGREED' || ((Number.isFinite(amountPastDueNum) ? amountPastDueNum : 0) === 0 && !hasDelinquency)
          ? 'Current'
          : 'Delinquent';

        const typeDescription = mapAccountTypeDescription(rawType, loanType, portfolioType, category);
        const specificType = mapSpecificAccountType(rawType, creditorName, loanType, portfolioType, category);

        const termTypeRaw = readBureauValue(account.termType, bureau);
        const termType = termTypeRaw === '' ? '' : 'Provided';

        const paymentFrequency = mapPaymentFrequency(
          rawType,
          readBureauValue(account.termFrequency, bureau),
          readBureauValue(account.termDurationMonths, bureau)
        );

        const accountStatus = ['Paid', 'Transferred', 'Closed'].includes(mappedCondition) ? 'Closed' : 'Open';

        out.push({
          BureauId: bureauId,
          AccountTypeDescription: typeDescription,
          HighBalance: readAmountOrDefault(account.highCreditAmount, bureau, '0'),
          DateReported: dateReportedISO,
          DateOpened: dateOpenedISO,
          AccountNumber: accountNumber,
          DateAccountStatus: asString(dateAccountStatus || dateReportedISO || null),
          CurrentBalance: currentBalance,
          CreditorName: creditorName,
          AccountCondition: mappedCondition,
          AccountDesignator: mapDesignator(readBureauValue(account.paymentResponsibility, bureau)),
          DisputeFlag: 'Account not disputed',
          Industry: asString(firstNonNull(
            readBureauValue(account.industry, bureau),
            readBureauValue(account.creditorClassification, bureau),
            readBureauValue(account.loanType, bureau)
          )),
          AccountStatus: accountStatus,
          PaymentStatus: paymentStatus,
          AmountPastDue: amountPastDue,
          AccountType: specificType,
          CreditType: typeDescription,
          PaymentFrequency: paymentFrequency,
          TermType: termType,
          WorstPayStatus: computeWorstPayStatus(historyString),
          PayStatusHistoryStartDate: historyStartDate,
          PayStatusHistory: historyString,
          Remark: remark,
          CreditLimit: readAmountOrDefault(account.creditLimitAmount, bureau, '0'),
        });
      }
    });
  });

  return out;
}

export function buildLegacyReportData(payload) {
  const reportDateRaw = firstNonNull(
    payload?.ReportDate,
    readBureauValue(payload?.date, 'EFX'),
    readBureauValue(payload?.date, 'EXP'),
    readBureauValue(payload?.date, 'TU')
  );
  const dateReport = epochToISO(reportDateRaw);

  const legacy = {
    CreditReport: [{ DateReport: dateReport, ReportProvider: 'MyFreeScoreNow' }],
    Name: mapNames(payload),
    Address: mapAddresses(payload),
    DOB: mapDOB(payload),
    Score: mapScores(payload, dateReport),
    Employer: mapEmployers(payload),
    Inquiries: mapInquiries(payload),
    PublicRecords: mapPublicRecords(payload),
    Accounts: convertAccountsToLegacy(payload),
  };

  const strictLegacy = ensureLegacyArrays(legacy);
  assertNoWrapperKeys(strictLegacy);
  assertValidBureauIds(strictLegacy);
  return strictLegacy;
}

export function convertNewToLegacy(newFileJson, clientId, username) {
  const payload = getReportPayload(newFileJson);
  const sourceClient = newFileJson?.clientInfo || {};
  const resolvedClientId = firstNonNull(clientId, sourceClient.clientId, 'unknown');
  const resolvedUsername = firstNonNull(username, sourceClient.username, '');

  const reportData = buildLegacyReportData(payload);
  assertNoWrapperKeys(reportData);

  return {
    clientInfo: {
      ...sourceClient,
      clientId: resolvedClientId,
      username: resolvedUsername,
      timestamp: sourceClient.timestamp || new Date().toISOString(),
    },
    reportData,
  };
}

export function convertToLegacy(currentFileJson) {
  return convertNewToLegacy(
    currentFileJson,
    currentFileJson?.clientInfo?.clientId,
    currentFileJson?.clientInfo?.username
  );
}

export function convertMFSNToLegacyFormat(newJson, context = {}) {
  const converted = convertNewToLegacy({
    clientInfo: {
      clientId: context.clientId ?? 'unknown',
      username: context.username ?? '',
      timestamp: newJson?.capturedAt || new Date().toISOString(),
    },
    reportData: newJson,
  }, context.clientId, context.username);

  if (!converted.clientInfo.reportDate) {
    const dateValue = converted.reportData?.CreditReport?.[0]?.DateReport || '';
    if (dateValue) {
      const [y, m, d] = dateValue.split('-');
      converted.clientInfo.reportDate = `${d}/${m}/${y}`;
    }
  }

  return converted;
}

export default convertToLegacy;
