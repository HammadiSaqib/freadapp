export type CreditReportBureauName = "TransUnion" | "Experian" | "Equifax";

const BUREAU_BY_ID: Record<number, CreditReportBureauName> = {
  1: "TransUnion",
  2: "Experian",
  3: "Equifax",
};

export const mapCreditReportBureauName = (value: unknown): string => {
  const numericValue = Number(value);
  if (Number.isInteger(numericValue) && BUREAU_BY_ID[numericValue]) {
    return BUREAU_BY_ID[numericValue];
  }

  const text = String(value ?? "").trim();
  const normalized = text.toLowerCase().replace(/[^a-z]/g, "");
  if (normalized === "transunion" || normalized === "tu") return "TransUnion";
  if (normalized === "experian" || normalized === "ex" || normalized === "exp") return "Experian";
  if (normalized === "equifax" || normalized === "eq" || normalized === "efx") return "Equifax";
  return text || "Unknown";
};
