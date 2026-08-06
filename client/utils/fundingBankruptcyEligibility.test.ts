import { describe, expect, it } from "vitest";
import { getBankruptcyBureaus } from "./fundingBankruptcyEligibility";

describe("getBankruptcyBureaus", () => {
  it("maps bureau id 3 bankruptcy records to Equifax", () => {
    const result = getBankruptcyBureaus({
      reportData: { PublicRecords: [{ BureauId: 3, Classification: "Chapter 7 Bankruptcy" }] },
    });

    expect([...result]).toEqual(["Equifax"]);
  });

  it("supports nested reports and named bureaus", () => {
    const result = getBankruptcyBureaus({
      reportData: {
        reportData: {
          publicRecords: [
            { bureau: "Experian", RecordType: "BANKRUPTCY" },
            { bureau: "Trans Union", type: "Tax lien" },
          ],
        },
      },
    });

    expect([...result]).toEqual(["Experian"]);
  });

  it("does not block a bureau for non-bankruptcy public records", () => {
    const result = getBankruptcyBureaus({
      PublicRecords: [{ BureauId: 3, Classification: "Civil judgment" }],
    });

    expect([...result]).toEqual([]);
  });
});
