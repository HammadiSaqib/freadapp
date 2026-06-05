type RawRecord = Record<string, any>;

type PublicRecordsEvalPayload = {
  command?: 'WAR_PUBLIC_RECORDS_EVAL';
  version: string;
  case_id: string;
  consumer_id: string;
  normalize?: boolean;
  bureau_ids?: number[];
  data: {
    PublicRecords: RawRecord[];
  };
};

const FULL_PUBLIC_RECORD_LAWSET = {
  FCRA: ["§602","§603","§604(a–f)","§605","§605A","§605B","§607(a)","§607(b)","§609(a)(1)","§611(a–e)","§615","§616","§617","§623(a)(1)","§623(b)"],
  FACTA: ["§112","§315","§151"],
  GLBA: ["§501(a)–(b)","§502(a)–(b)","§503–§504"],
  Metro2: ["Public Record Reporting Standards","Consumer Identifier Matching Standards","Accuracy and Completeness Requirements"],
  Regulatory: ["CFPB Accuracy & Integrity Rule","CFPB Furnisher Rule","FTC Misrepresentation Doctrine"],
  Other: ["UDAAP","UCC Article 9","BAPCPA","Privacy Act of 1974"]
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
    const m = raw.match(/\d{4}-\d{2}-\d{2}/) || raw.match(/\d{2}\/\d{2}\/\d{4}/);
    if (m) {
      const iso = m[0].includes('/') ? new Date(m[0]).toISOString() : `${m[0]}T00:00:00Z`;
      const d3 = new Date(iso);
      return isNaN(d3.getTime()) ? null : d3;
    }
    return null;
  }
  return d;
};
const fmtDate = (d: Date | null) => (d ? d.toISOString().slice(0,10) : null);

const fieldAccessors: Record<string, (r: RawRecord) => any> = {
  Type: (r) => normStr(r.RecordType ?? r.Type),
  Classification: (r) => normStr(r.Classification),
  CourtName: (r) => normStr(r.CourtName ?? r.Court),
  DocketNumber: (r) => normStr(r.DocketNumber ?? r.DocketNo),
  CaseNumber: (r) => normStr(r.CaseNumber),
  FilingDate: (r) => fmtDate(parseDate(r.DateFiled ?? r.FilingDate)),
  DischargeDate: (r) => fmtDate(parseDate(r.DischargeDate)),
  Status: (r) => normStr(r.Status),
  Amount: (r) => parseNum(r.Amount)
};

const fieldsToCheck = Object.keys(fieldAccessors);
const criticalFields = ['CourtName','DocketNumber','FilingDate'];

export function runPublicRecordsEvalEngine(input: PublicRecordsEvalPayload) {
  const normalize = input.normalize ?? true;
  const bureauIds = input.bureau_ids && input.bureau_ids.length ? input.bureau_ids : [1,2,3];
  const raw = Array.isArray(input.data?.PublicRecords) ? input.data.PublicRecords : [];

  const isNegativeRecord = (rec: RawRecord) => {
    const type = normStr(rec.RecordType ?? rec.Type);
    const classif = normStr(rec.Classification);
    const status = normStr(rec.Status);
    const anyNegWord = (s: string | null) => {
      const t = String(s || '').toUpperCase();
      return /(BANKRUPTCY|JUDGMENT|LIEN|TAX LIEN|FORECLOSURE|DEROG|COLLECT)/.test(t);
    };
    if (anyNegWord(type)) return true;
    if (anyNegWord(classif)) return true;
    if (anyNegWord(status)) return true;
    return true;
  };

  const keyFor = (rec: RawRecord) => {
    const t = fieldAccessors.Type(rec);
    const c = fieldAccessors.Classification(rec) || '';
    return `${t}|${c}`;
  };

  const grouped: Map<string, Record<number, RawRecord>> = new Map();
  raw.forEach((rec) => {
    const bid = Number((rec?.BureauId ?? rec?.bureauId ?? rec?.bureau_id ?? rec?.BureauID ?? rec?.Bureau) ?? 0);
    const key = keyFor(rec);
    const existing = grouped.get(key) || {};
    existing[bid] = rec;
    grouped.set(key, existing);
  });

  const recordsOut: any[] = [];
  let consistentCount = 0;
  let withViolations = 0;

  grouped.forEach((byBureau, record_key) => {
    const bureaus_present = Object.keys(byBureau).map(n => Number(n)).filter(n => bureauIds.includes(n));
    const violations: any[] = [];
    const anyNegative = Object.values(byBureau).some(rec => isNegativeRecord(rec));

    if (!anyNegative) {
      recordsOut.push({
        record_key,
        bureaus_present,
        match: true,
        record_type_output: 'Positive record — skipped',
        violations: []
      });
      return;
    }

    const missingBureaus = bureauIds.filter(id => !bureaus_present.includes(id));
    if (missingBureaus.length > 0) {
      const presenceDetails: Record<string, any> = {};
      bureauIds.forEach(id => {
        const rec = byBureau[id];
        presenceDetails[String(id)] = rec ? 'PRESENT' : null;
      });
      violations.push({
        field: 'BureauPresence',
        match: false,
        what_mismatched: presenceDetails,
        reason: `Record missing in bureaus: ${missingBureaus.join(', ')}`,
        laws: FULL_PUBLIC_RECORD_LAWSET
      });
    }

    criticalFields.forEach((fname) => {
      const values: Record<number, any> = {};
      bureauIds.forEach((id) => {
        const rec = byBureau[id];
        const accessor = fieldAccessors[fname];
        values[id] = rec ? accessor(rec) : null;
      });
      const anyMissing = bureauIds.some(id => values[id] === null || values[id] === undefined || values[id] === '');
      if (anyMissing) {
        violations.push({
          field: fname,
          match: false,
          what_mismatched: {
            '1': values[1] ?? null,
            '2': values[2] ?? null,
            '3': values[3] ?? null
          },
          reason: `Missing or blank value in one or more bureaus for ${fname}`,
          laws: FULL_PUBLIC_RECORD_LAWSET
        });
      }
    });

    fieldsToCheck.forEach((fname) => {
      if (criticalFields.includes(fname)) return;
      const getVal = fieldAccessors[fname];
      const values: Record<number, any> = {};
      bureauIds.forEach((id) => {
        const rec = byBureau[id];
        values[id] = rec ? getVal(rec) : null;
      });
      const vals = bureauIds.map(id => values[id]).filter(v => v !== undefined);
      const canonical = vals
        .map(v => (typeof v === 'string' ? v : v === null ? null : v))
        .filter(v => v !== null);
      const uniqueVals = Array.from(new Set(canonical.map(v => JSON.stringify(v))));
      const mismatch = uniqueVals.length > 1;
      const anyMissing = bureauIds.some(id => values[id] === null || values[id] === undefined || values[id] === '');
      if (anyMissing || mismatch) {
        violations.push({
          field: fname,
          match: false,
          what_mismatched: {
            '1': values[1] ?? null,
            '2': values[2] ?? null,
            '3': values[3] ?? null
          },
          reason: anyMissing
            ? `Missing or blank value in one or more bureaus for ${fname}`
            : `Values differ across bureaus for ${fname}`,
          laws: FULL_PUBLIC_RECORD_LAWSET
        });
      }
    });

    const match = violations.length === 0;
    const record_type_output = match ? 'Record consistent' : 'Record inconsistencies detected';
    if (match) consistentCount++;
    if (!match) withViolations++;

    recordsOut.push({
      record_key,
      bureaus_present,
      match,
      record_type_output,
      violations
    });
  });

  const result = {
    section: 'PublicRecords',
    case_id: input.case_id,
    summary: {
      total_records: raw.length,
      records_consistent: consistentCount,
      records_with_violations: withViolations
    },
    records: recordsOut
  };

  return result;
}

export default { runPublicRecordsEvalEngine };
