import { describe, expect, it } from 'vitest';
import { Scraper } from '../scraper/scrapper.js';
import { convertNewToLegacy } from '../server/services/scrapers/converter.js';

function buildReport(partitionKey = 'PulblicRecordPartition') {
  return {
    BundleComponents: {
      BundleComponent: [
        {
          Type: 'MergeCreditReports',
          TrueLinkCreditReportType: {
            Borrower: {
              BorrowerName: [],
              BorrowerAddress: [],
              PreviousAddress: [],
              Birth: [],
              CreditScore: [],
              Employer: [],
            },
            InquiryPartition: [],
            [partitionKey]: {
              PublicRecord: {
                Source: { Bureau: { symbol: 'EQF' } },
                dateFiled: '2016-11-22',
                dateReported: '2016-11-22',
                Classification: { description: 'Bankruptcy' },
                Status: { description: 'Discharged' },
                IndustryCode: { description: 'Public Record' },
                Type: { description: 'Bankruptcy' },
                AccountDesignator: { description: 'Individual' },
                referenceNumber: '1637116-DSP-02/17',
                courtName: 'US BKPT CT IL CHICAG',
                assetAmount: '0',
                liability: '0',
                exemptAmount: '0',
              },
            },
            TradeLinePartition: [],
            Subscriber: [],
          },
        },
      ],
    },
  };
}

function buildReportWithoutPublicRecords() {
  const report = buildReport();
  delete report.BundleComponents.BundleComponent[0].TrueLinkCreditReportType.PulblicRecordPartition;
  return report;
}

const domPublicRecordText = `Public Records

	
	
	
Bankruptcy
Name :\t155VF00015\tUS BKPT CT IL CHICAG\t--
Type:\t--\t--\t--
Status:\t--\t--\t--
Date Filed/Reported:\t11-22-2016\t11-22-2016\t--
Reference#:\t1637116-DSP-02/17\t1637116JPC\t--
Closing Date:\t--\t--\t--
Asset Amount:\t0\t0\t--
Court:\t--\t--\t--
Liability:\t0\t0\t--
Exempt Amount:\t0\t0\t--
Remarks:\t--\t--\t--

Creditor Contacts`;

describe('Scraper public record parsing', () => {
  it('keeps single public record objects', async () => {
    const scraper = new Scraper({});
    const parsed = await scraper.Parse(buildReport());

    expect(parsed.PublicRecords).toHaveLength(1);
    expect(parsed.PublicRecords[0]).toMatchObject({
      BureauId: 3,
      Type: 'Bankruptcy',
      Date: '2016-11-22',
      DateFiled: '2016-11-22',
      DateReported: '2016-11-22',
      ReferenceNumber: '1637116-DSP-02/17',
      Court: 'US BKPT CT IL CHICAG',
      AssetAmount: '0',
      Liability: '0',
      ExemptAmount: '0',
    });
  });

  it('supports the correctly spelled public record partition key', async () => {
    const scraper = new Scraper({});
    const parsed = await scraper.Parse(buildReport('PublicRecordPartition'));

    expect(parsed.PublicRecords).toHaveLength(1);
    expect(parsed.PublicRecords[0].Type).toBe('Bankruptcy');
  });

  it('falls back to the rendered MyFreeScoreNow public records section', async () => {
    const scraper = new Scraper({});
    scraper.lastPageText = domPublicRecordText;

    const parsed = await scraper.Parse(buildReportWithoutPublicRecords());

    expect(parsed.PublicRecords).toHaveLength(2);
    expect(parsed.PublicRecords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          BureauId: 3,
          Type: 'Bankruptcy',
          Classification: 'Bankruptcy',
          Date: '11-22-2016',
          ReferenceNumber: '1637116-DSP-02/17',
          Name: '155VF00015',
        }),
        expect.objectContaining({
          BureauId: 2,
          Type: 'Bankruptcy',
          Classification: 'Bankruptcy',
          Date: '11-22-2016',
          ReferenceNumber: '1637116JPC',
          Court: 'US BKPT CT IL CHICAG',
        }),
      ]),
    );
  });

  it('preserves attached DOM public records through legacy conversion', () => {
    const converted = convertNewToLegacy(
      {
        clientInfo: { clientId: 'test-client', username: 'tester@example.com' },
        reportData: {
          data: {
            data: {
              ReportDate: '2026-04-21',
              PublicRecords: [
                {
                  BureauId: 3,
                  Type: 'Bankruptcy',
                  Classification: 'Bankruptcy',
                  Date: '11-22-2016',
                  DateFiled: '11-22-2016',
                  DateReported: '11-22-2016',
                  ReferenceNumber: '1637116-DSP-02/17',
                  Court: 'US BKPT CT IL CHICAG',
                  AssetAmount: '0',
                  Liability: '0',
                  ExemptAmount: '0',
                },
                {
                  BureauId: 2,
                  Type: 'Bankruptcy',
                  Classification: 'Bankruptcy',
                  Date: '11-22-2016',
                  DateFiled: '11-22-2016',
                  DateReported: '11-22-2016',
                  ReferenceNumber: '1637116JPC',
                  Court: 'US BKPT CT IL CHICAG',
                  AssetAmount: '0',
                  Liability: '0',
                  ExemptAmount: '0',
                },
              ],
            },
          },
        },
      },
      'test-client',
      'tester@example.com',
    );

    expect(converted.reportData.PublicRecords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          BureauId: 3,
          Type: 'Bankruptcy',
          Classification: 'Bankruptcy',
          Date: '2016-11-22',
          DateFiled: '2016-11-22',
          DateReported: '2016-11-22',
          ReferenceNumber: '1637116-DSP-02/17',
        }),
        expect.objectContaining({
          BureauId: 2,
          Type: 'Bankruptcy',
          Classification: 'Bankruptcy',
          Date: '2016-11-22',
          DateFiled: '2016-11-22',
          DateReported: '2016-11-22',
          ReferenceNumber: '1637116JPC',
        }),
      ]),
    );
  });
});