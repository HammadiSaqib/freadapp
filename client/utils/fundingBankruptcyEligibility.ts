export type FundingBureauName = "Experian" | "Equifax" | "TransUnion";

const BUREAU_BY_ID: Record<number, FundingBureauName> = {
  1: "TransUnion",
  2: "Experian",
  3: "Equifax",
};

const normalizeBureau = (value: unknown): FundingBureauName | null => {
  const numeric = Number(value);
  if (Number.isInteger(numeric) && BUREAU_BY_ID[numeric]) return BUREAU_BY_ID[numeric];

  const normalized = String(value ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (normalized === "experian" || normalized === "ex" || normalized === "exp") return "Experian";
  if (normalized === "equifax" || normalized === "eq" || normalized === "efx") return "Equifax";
  if (normalized === "transunion" || normalized === "tu") return "TransUnion";
  return null;
};

const isBankruptcyRecord = (record: any): boolean => {
  const text = [
    record?.Classification,
    record?.classification,
    record?.Type,
    record?.type,
    record?.RecordType,
    record?.recordType,
    record?.publicRecordType,
    record?.Description,
    record?.description,
  ].map((value) => String(value ?? "").toLowerCase()).join(" ");

  return text.includes("bankruptcy");
};

const getPublicRecords = (reportData: any): any[] => {
  const roots = [
    reportData,
    reportData?.reportData,
    reportData?.report_data,
    reportData?.data,
    reportData?.data?.reportData,
    reportData?.reportData?.reportData,
    reportData?.reportData?.report_data,
    reportData?.data?.reportData?.reportData,
  ];

  for (const root of roots) {
    if (Array.isArray(root?.PublicRecords)) return root.PublicRecords;
    if (Array.isArray(root?.publicRecords)) return root.publicRecords;
  }

  return [];
};

export const getBankruptcyBureaus = (reportData: any): Set<FundingBureauName> => {
  const bureaus = new Set<FundingBureauName>();

  for (const record of getPublicRecords(reportData)) {
    if (!isBankruptcyRecord(record)) continue;

    const bureau = normalizeBureau(
      record?.BureauId
      ?? record?.bureauId
      ?? record?.bureau
      ?? record?.Bureau
      ?? record?.bureauName,
    );
    if (bureau) bureaus.add(bureau);
  }

  return bureaus;
};
