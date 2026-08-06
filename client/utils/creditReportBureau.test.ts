import { describe, expect, it } from "vitest";
import { mapCreditReportBureauName } from "./creditReportBureau";

describe("mapCreditReportBureauName", () => {
  it("maps the credit report bureau IDs consistently", () => {
    expect(mapCreditReportBureauName(1)).toBe("TransUnion");
    expect(mapCreditReportBureauName(2)).toBe("Experian");
    expect(mapCreditReportBureauName(3)).toBe("Equifax");
  });

  it("normalizes common textual bureau values", () => {
    expect(mapCreditReportBureauName("Trans Union")).toBe("TransUnion");
    expect(mapCreditReportBureauName("EX")).toBe("Experian");
    expect(mapCreditReportBureauName("efx")).toBe("Equifax");
  });
});
