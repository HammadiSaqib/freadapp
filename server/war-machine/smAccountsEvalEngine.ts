type RawAccount = Record<string, any>;

type AccountsEvalPayload = {
  command: 'WAR_MACHINE.ACCOUNTS_EVAL';
  version: string;
  case_id: string;
  consumer_id: string;
  normalize?: boolean;
  match_strategy?: 'strict' | 'lenient';
  bureau_ids?: number[];
  data: {
    Accounts: RawAccount[];
  };
};

const FULL_ACCOUNT_LAWSET = {
  FCRA: ["§602","§603","§604(a–f)","§605","§605A","§605B","§606","§607(a)","§607(b)","§607(c)","§609(a)(1)","§609(a)(2)","§609(a)(3)","§611(a–e)","§615","§616","§617","§623(a)(1)","§623(a)(2)","§623(a)(5)","§623(a)(7)","§623(b)"],
  FACTA: ["§112","§113","§151","§153","§315"],
  GLBA: ["§501(a)–(b)","§502(a)–(b)","§503–§504"],
  Metro2: ["ALL Metro 2 Account Reporting Standards","ALL Portfolio Type Standards","ALL Status and Special Comment Rules","ALL DOFD and Compliance Condition Rules","ALL Payment Rating and Current Status Rules"],
  Regulatory: ["CFPB Accuracy & Integrity Rule","CFPB Furnisher Rule","OCC, FDIC, NCUA accuracy guidelines","FTC Misrepresentation Doctrine"],
  Other: ["UDAAP","UCC Article 9 (obligation attachment)","Bankruptcy Abuse Prevention and Consumer Protection Act"]
};

const up = (s: string) => s.toUpperCase();
const trimCollapse = (s: string) => s.replace(/\s+/g, ' ').trim();
const removePunctExceptHyphen = (s: string) => s.replace(/[^\w\s-]/g, '');
const digitsOnly = (s: string) => s.replace(/\D/g, '');
const normStr = (s: any) => up(trimCollapse(removePunctExceptHyphen(String(s ?? '').trim())));
const parseNum = (v: any) => {
  if (v === null || v === undefined) return null;
  const digits = String(v).replace(/[^0-9.-]/g, '');
  const n = Number(digits);
  return isNaN(n) ? null : n;
};
const parseDate = (s: any) => {
  const raw = String(s ?? '').trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    const dd = digitsOnly(raw);
    if (dd.length === 8) {
      const y = dd.slice(0,4);
      const m = dd.slice(4,6);
      const day = dd.slice(6,8);
      const d2 = new Date(`${y}-${m}-${day}T00:00:00Z`);
      return isNaN(d2.getTime()) ? null : d2;
    }
    return null;
  }
  return d;
};
const fmtDate = (d: Date | null) => (d ? d.toISOString().slice(0,10) : null);

const canonicalCreditor = (s: any) => {
  const t = String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (/navyfederal|navyfcu/.test(t)) return 'NAVY FEDERAL CREDIT UNION';
  if (/creditone|crdtonebnk/.test(t)) return 'CREDIT ONE BANK';
  if (/jpmcb|chase|jpmmorgan/.test(t)) return 'CHASE';
  if (/americanexpress|amex/.test(t)) return 'AMERICAN EXPRESS';
  if (/discover/.test(t)) return 'DISCOVER';
  if (/capitalone|capone/.test(t)) return 'CAPITAL ONE';
  if (/synchrony|syncb/.test(t)) return 'SYNCHRONY BANK';
  if (/citi(bank)?/.test(t)) return 'CITIBANK';
  if (/wellsfargo/.test(t)) return 'WELLS FARGO';
  if (/barclays/.test(t)) return 'BARCLAYS';
  return normStr(s);
};

const isNegative = (acc: RawAccount, strict: boolean) => {
  const text = (x: any) => String(x || '').toLowerCase();
  const upText = (x: any) => String(x || '').toUpperCase();
  const hasAny = (s: string, words: string[]) => words.some(w => s.includes(w));
  const paymentStatus = text(acc.PaymentStatus);
  const worstStatus = text(acc.WorstPayStatus);
  const accountCondition = text(acc.AccountCondition);
  const remark = text(acc.Remark);
  const amountPastDue = parseNum(acc.AmountPastDue) || 0;
  const psh = upText(acc.PayStatusHistory);
  const paymentRating = upText(acc.PaymentRating);
  const currentStatus = upText(acc.CurrentStatus);
  const specialComment = upText(acc.SpecialComment);
  const complianceCode = upText(acc.ComplianceConditionCode);

  const negativeWords = ['late','collection','chargeoff','charge off','derogatory','repossession','bankruptcy'];
  const isPSHNegative = () => {
    if (!psh) return false;
    if (/CO|R|L|W|U/.test(psh)) return true;
    if (/[1-9]/.test(psh)) return true;
    return false;
  };
  const isPaymentRatingNegative = () => {
    if (!paymentRating) return false;
    if (/CO|R|L|W|U/.test(paymentRating)) return true;
    if (/[1-9]/.test(paymentRating)) return true;
    return false;
  };
  const isCurrentStatusNegative = () => {
    if (!currentStatus) return false;
    if (/CO|COLLECT|DEROG|REPOS/.test(currentStatus)) return true;
    if (/[1-9]/.test(currentStatus)) return true;
    return false;
  };
  const isSpecialCommentNegative = () => {
    if (!specialComment) return false;
    if (/COLLECT|CHARGE ?OFF|PAST ?DUE|DELINQ|BANKRUPTCY/.test(specialComment)) return true;
    return false;
  };
  const isComplianceNegative = () => {
    if (!complianceCode) return false;
    return true;
  };

  if (hasAny(paymentStatus, negativeWords)) return true;
  if (hasAny(worstStatus, negativeWords)) return true;
  if (amountPastDue > 0) return true;
  if (isPSHNegative()) return true;
  if (isPaymentRatingNegative()) return true;
  if (isCurrentStatusNegative()) return true;
  if (isSpecialCommentNegative()) return true;
  if (isComplianceNegative()) return true;
  if (hasAny(accountCondition, ['derog'])) return true;
  if (hasAny(remark, negativeWords)) return true;
  if (strict) {
    if (paymentStatus && !/current/.test(paymentStatus)) return true;
  }
  return false;
};

const fieldAccessors: Record<string, (acc: RawAccount) => any> = {
  CreditorName: (a) => canonicalCreditor(a.CreditorName || a.creditor),
  AccountNumber: (a) => digitsOnly(String(a.AccountNumber || a.accountNumber || '')) || null,
  OriginalCreditor: (a) => normStr(a.OriginalCreditor),
  PortfolioType: (a) => normStr(a.PortfolioType),
  Industry: (a) => normStr(a.Industry || a.IndustryCode),

  DateOpened: (a) => fmtDate(parseDate(a.DateOpened)),
  DateClosed: (a) => fmtDate(parseDate(a.DateClosed)),
  DateLastActive: (a) => fmtDate(parseDate(a.DateLastActive)),
  DateLastPayment: (a) => fmtDate(parseDate(a.DateLastPayment)),
  DOFD: (a) => fmtDate(parseDate(a.DateFirstDelinquency || a.DOFD)),
  DateReported: (a) => fmtDate(parseDate(a.DateReported)),
  DateAccountStatus: (a) => fmtDate(parseDate(a.DateAccountStatus)),

  HighBalance: (a) => parseNum(a.HighBalance),
  CurrentBalance: (a) => parseNum(a.CurrentBalance),
  AmountPastDue: (a) => parseNum(a.AmountPastDue),
  CreditLimit: (a) => parseNum(a.CreditLimit),
  OriginalLoanAmount: (a) => parseNum(a.OriginalLoanAmount),

  AccountTypeDescription: (a) => normStr(a.AccountTypeDescription),
  AccountType: (a) => normStr(a.AccountType),
  CreditType: (a) => normStr(a.CreditType),
  PaymentFrequency: (a) => normStr(a.PaymentFrequency),
  TermType: (a) => normStr(a.TermType),
  AccountDesignator: (a) => normStr(a.AccountDesignator),
  AccountCondition: (a) => normStr(a.AccountCondition),
  PaymentStatus: (a) => normStr(a.PaymentStatus),

  PayStatusHistoryStartDate: (a) => fmtDate(parseDate(a.PayStatusHistoryStartDate)),
  PayStatusHistory: (a) => String(a.PayStatusHistory || '').toUpperCase() || null,

  CurrentStatus: (a) => normStr(a.CurrentStatus),
  PaymentRating: (a) => normStr(a.PaymentRating),
  SpecialComment: (a) => normStr(a.SpecialComment),
  ComplianceConditionCode: (a) => normStr(a.ComplianceConditionCode),
  FCRAComplianceDate: (a) => fmtDate(parseDate(a.FCRAComplianceDate)),
};

const fieldsToCheck = Object.keys(fieldAccessors);

export function runAccountsEvalEngine(input: AccountsEvalPayload) {
  const strict = (input.match_strategy ?? 'strict') === 'strict';
  const normalize = input.normalize ?? true;
  const bureauIds = input.bureau_ids && input.bureau_ids.length ? input.bureau_ids : [1,2,3];
  const raw = Array.isArray(input.data?.Accounts) ? input.data.Accounts : [];

  const keyFor = (acc: RawAccount) => {
    const cred = canonicalCreditor(acc.CreditorName || acc.creditor);
    const numDigits = digitsOnly(String(acc.AccountNumber || acc.accountNumber || ''));
    if (numDigits.length >= 4) {
      const last4 = numDigits.slice(-4);
      return `${cred}|${last4}`;
    }
    const typeDesc = normStr(acc.AccountTypeDescription || acc.CreditType || acc.AccountType || '');
    const opened = fmtDate(parseDate(acc.DateOpened));
    return `${cred}|${typeDesc}|${opened || ''}`;
  };

  const grouped: Map<string, Record<number, RawAccount>> = new Map();
  raw.forEach((acc) => {
    const bid = Number((acc?.BureauId ?? acc?.bureauId ?? acc?.bureau_id ?? acc?.BureauID ?? acc?.Bureau) ?? 0);
    const key = keyFor(acc);
    const existing = grouped.get(key) || {};
    existing[bid] = acc;
    grouped.set(key, existing);
  });

  const accountsOut: any[] = [];
  let positiveSkipped = 0;
  let negativeDetected = 0;
  let negativeWithViolations = 0;

  grouped.forEach((byBureau, tradeline_key) => {
    const bureaus_present = Object.keys(byBureau).map(n => Number(n)).filter(n => bureauIds.includes(n));
    const anyNegative = Object.values(byBureau).some(acc => isNegative(acc, strict));
    const creditorNameSample = Object.values(byBureau)[0]?.CreditorName;

    if (!anyNegative) {
      positiveSkipped++;
      accountsOut.push({
        tradeline_key,
        account_status: 'Positive',
        account_type_output: 'Positive account — skipped',
        bureaus_present,
        violations: []
      });
      return;
    }

    negativeDetected++;
    const violations: any[] = [];

    // Bureau presence check for negative tradeline
    const missingBureaus = bureauIds.filter(id => !bureaus_present.includes(id));
    if (missingBureaus.length > 0) {
      const presenceDetails: Record<string, any> = {};
      bureauIds.forEach(id => {
        const acc = byBureau[id];
        presenceDetails[String(id)] = acc ? 'PRESENT' : null;
      });
      violations.push({
        field: 'BureauPresence',
        match: false,
        what_mismatched: presenceDetails,
        reason: `Tradeline missing in bureaus: ${missingBureaus.join(', ')}`,
        laws: { FULL_ACCOUNT_LAWSET: true }
      });
    }

    // Field-by-field checks
    fieldsToCheck.forEach((fieldName) => {
      const getVal = fieldAccessors[fieldName];
      const values: Record<number, any> = {};
      bureauIds.forEach((id) => {
        const acc = byBureau[id];
        values[id] = acc ? getVal(acc) : null;
      });
      const vals = bureauIds.map(id => values[id]).filter(v => v !== undefined);
      const anyMissing = bureauIds.some(id => values[id] === null || values[id] === undefined || values[id] === '');
      const canonical = vals
        .map(v => (typeof v === 'string' ? v : v === null ? null : v))
        .filter(v => v !== null);
      const uniqueVals = Array.from(new Set(canonical.map(v => JSON.stringify(v))));
      const mismatch = uniqueVals.length > 1;
      if (anyMissing || mismatch) {
        violations.push({
          field: fieldName,
          match: false,
          what_mismatched: {
            '1': values[1] ?? null,
            '2': values[2] ?? null,
            '3': values[3] ?? null
          },
          reason: anyMissing
            ? `Missing or blank value in one or more bureaus for ${fieldName}`
            : `Values differ across bureaus for ${fieldName}`,
          laws: { FULL_ACCOUNT_LAWSET: true }
        });
      }
    });

    const account_type_output =
      violations.length > 0
        ? 'Negative account — violations detected'
        : 'Negative account — no violations';
    if (violations.length > 0) negativeWithViolations++;

    accountsOut.push({
      tradeline_key,
      account_status: 'Negative',
      account_type_output,
      bureaus_present,
      violations
    });
  });

  const result = {
    section: 'Accounts',
    case_id: input.case_id,
    summary: {
      total_records: raw.length,
      positive_skipped: positiveSkipped,
      negative_detected: negativeDetected,
      negative_with_violations: negativeWithViolations
    },
    accounts: accountsOut
  };

  return result;
}

export default { runAccountsEvalEngine };
