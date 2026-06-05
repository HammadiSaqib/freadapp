import { describe, it, expect } from 'vitest';
import {
  convertNewToLegacy,
  convertAccountsToLegacy,
  buildLegacyReportData,
  toBureauId,
  assertValidBureauIds,
} from '../server/services/scrapers/converter.js';

const currentFileJson = {
  clientInfo: {
    clientId: 'unknown',
    username: 'tester@example.com',
    timestamp: '2026-02-28T00:00:06.423Z',
  },
  reportData: {
    success: true,
    message: 'Success',
    data: {
      date: { EFX: 1741392000000, EXP: 1741392000000, TU: 1741392000000 },
      Borrower: {
        BorrowerName: {
          Primary: {
            EFX: 'MARTIKA R DABNEY',
            EXP: 'MARTIKA R DABNEY',
            TU: 'MARTIKA R DABNEY',
          },
        },
        BirthYear: { EFX: 631152000000, EXP: 631152000000, TU: 631152000000 },
      },
      RiskScore: { EFX: 711, EXP: 702, TU: 695 },
      currentAddress: {
        EFX: { line1: '100 MAIN ST', city: 'DALLAS', state: 'TX', zip: '75001' },
        EXP: { line1: '100 MAIN ST', city: 'DALLAS', state: 'TX', zip: '75001' },
        TU: { line1: '100 MAIN ST', city: 'DALLAS', state: 'TX', zip: '75001' },
      },
      previousAddresses: {
        EFX: [{ line1: '50 OLD RD', city: 'PLANO', state: 'TX', zip: '75024' }],
      },
      finalAccountDetails: {
        positive: {
          open: [
            {
              accountName: { EFX: 'AMEX', EXP: 'AMEX', TU: 'AMEX' },
              accountNumber: { EFX: '****1234', EXP: '****1234', TU: '****1234' },
              accountType: { EFX: 'REVOLVING', EXP: 'REVOLVING', TU: 'REVOLVING' },
              accountStatus: { EFX: 'PAYS_AS_AGREED', EXP: 'PAYS_AS_AGREED', TU: 'PAYS_AS_AGREED' },
              accountCondition: { EFX: 'OPEN', EXP: 'OPEN', TU: 'OPEN' },
              dateOpened: { EFX: 1609459200000, EXP: 1609459200000, TU: 1609459200000 },
              reportedDate: { EFX: 1741392000000, EXP: 1741392000000, TU: 1741392000000 },
              balanceAmount: { EFX: { amount: '100' }, EXP: { amount: '200' }, TU: { amount: '300' } },
              highCreditAmount: { EFX: { amount: '500' }, EXP: { amount: '600' }, TU: { amount: '700' } },
              creditLimitAmount: { EFX: { amount: '1000' }, EXP: { amount: '1000' }, TU: { amount: '1000' } },
              pastDueAmount: { EFX: { amount: '0' }, EXP: { amount: '0' }, TU: { amount: '0' } },
              paymentHistory: {
                EFX: [{ monthType: 'PAYS_AS_AGREED', year: 2025, month: 1 }],
                EXP: [{ monthType: 'PAYS_AS_AGREED', year: 2025, month: 1 }],
                TU: [{ monthType: 'PAYS_AS_AGREED', year: 2025, month: 1 }],
              },
              comments: {
                EFX: [{ description: 'OK' }],
                EXP: [{ description: 'OK' }],
                TU: [{ description: 'OK' }],
              },
            },
          ],
          closed: [],
        },
        negative: { open: [], closed: [] },
      },
    },
  },
};

describe('convertNewToLegacy', () => {
  it('maps bureau providers to canonical BureauId values', () => {
    expect(toBureauId('EFX')).toBe(3);
    expect(toBureauId('EXP')).toBe(2);
    expect(toBureauId('TU')).toBe(1);
  });

  it('throws when any converted object has invalid BureauId', () => {
    expect(() => assertValidBureauIds({
      Accounts: [{ BureauId: 4 }],
      Inquiries: [],
      Score: [],
      Name: [],
      Address: [],
      DOB: [],
      Employer: [],
      PublicRecords: [],
    })).toThrowError('Invalid BureauId mapping detected');
  });

  it('outputs strict legacy schema and flat Accounts', () => {
    const out = convertNewToLegacy(currentFileJson, '49', 'tester@example.com');

    expect(out.clientInfo.clientId).toBe('49');
    expect(out.clientInfo.username).toBe('tester@example.com');

    const expectedKeys = ['Accounts', 'Address', 'CreditReport', 'DOB', 'Employer', 'Inquiries', 'Name', 'PublicRecords', 'Score'];
    expect(Object.keys(out.reportData).sort()).toEqual(expectedKeys.sort());

    expect(out.reportData.success).toBeUndefined();
    expect(out.reportData.message).toBeUndefined();
    expect(out.reportData.data).toBeUndefined();

    expect(Array.isArray(out.reportData.Name)).toBe(true);
    expect(out.reportData.Name.length).toBeGreaterThan(0);
    expect(out.reportData.Name.every((n) => typeof n.BureauId === 'number')).toBe(true);

    expect(Array.isArray(out.reportData.Accounts)).toBe(true);
    expect(out.reportData.Accounts.length).toBe(3);
    expect(out.reportData.Accounts.every((a) => typeof a.BureauId === 'number')).toBe(true);
    expect(out.reportData.Accounts.every((a) => !('EFX' in a || 'EXP' in a || 'TU' in a))).toBe(true);
  });

  it('buildLegacyReportData(raw) returns strict 9 legacy keys only', () => {
    const raw = currentFileJson.reportData.data;
    const reportData = buildLegacyReportData(raw);
    const expectedKeys = ['Accounts', 'Address', 'CreditReport', 'DOB', 'Employer', 'Inquiries', 'Name', 'PublicRecords', 'Score'];

    expect(Object.keys(reportData).sort()).toEqual(expectedKeys.sort());
    expect(reportData.success).toBeUndefined();
    expect(reportData.message).toBeUndefined();
    expect(reportData.data).toBeUndefined();
    expectedKeys.forEach((key) => {
      expect(Array.isArray(reportData[key])).toBe(true);
    });
  });

  it('maps raw.allInquiries data into legacy Inquiries and dedupes', () => {
    const withInquiries = JSON.parse(JSON.stringify(currentFileJson));
    withInquiries.reportData.data.allInquiries = [
      {
        provider: 'EFX',
        type: 'HARD',
        reportedDate: 1739577600000,
        contactInformation: {
          contactName: 'ACME BANK',
          address: '123 Test St',
          phone: '555-111-2222',
        },
      },
      {
        provider: 'EFX',
        type: 'HARD',
        reportedDate: 1739577600000,
        contactInformation: {
          contactName: 'ACME BANK',
        },
      },
      {
        provider: 'EXP',
        type: 'SOFT',
        reportedDate: 1739664000000,
        contactInformation: {
          contactName: 'LENDER X',
        },
      },
    ];

    const out = convertNewToLegacy(withInquiries, '49', 'tester@example.com');
    expect(out.reportData.Inquiries.length).toBe(2);

    const first = out.reportData.Inquiries[0];
    expect(first).toHaveProperty('BureauId');
    expect(first).toHaveProperty('CreditorName');
    expect(first).toHaveProperty('InquiryType');
    expect(first).toHaveProperty('DateInquiry');
    expect(first).toHaveProperty('Industry');
    expect(first).toHaveProperty('PermissiblePurpose');
    expect(first.DateInquiry).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(first.Industry).toBeNull();
    expect(first.PermissiblePurpose).toBeNull();

    const expInquiry = out.reportData.Inquiries.find((i) => i.BureauId === 2);
    expect(expInquiry).toBeDefined();
    expect(expInquiry.InquiryType).toBe('Soft');
  });

  it('converts accounts to strict legacy account schema with TU missing-history fallback', () => {
    const src = {
      date: { EFX: 1741392000000, EXP: 1741392000000, TU: 1741392000000 },
      finalAccountDetails: {
        positive: {
          open: [
            {
              accountName: { TU: 'SYNCB STORE' },
              accountNumber: { TU: '****9999' },
              accountType: { TU: 'REVOLVING' },
              accountStatus: { TU: 'PAYS_AS_AGREED' },
              paymentResponsibility: { TU: 'AUTHORIZED_USER' },
              dateOpened: { TU: 1609459200000 },
              reportedDate: { TU: 1741392000000 },
              balanceAmount: { TU: { amount: '0' } },
              highCreditAmount: { TU: { amount: '450' } },
              creditLimitAmount: { TU: { amount: '500' } },
              pastDueAmount: { TU: { amount: '0' } },
            },
            {
              accountName: { TU: 'SYNCB STORE' },
              accountNumber: { TU: '****9999' },
              accountType: { TU: 'REVOLVING' },
              accountStatus: { TU: 'PAYS_AS_AGREED' },
              dateOpened: { TU: 1609459200000 },
              reportedDate: { TU: 1741392000000 },
            },
          ],
          closed: [],
        },
        negative: { open: [], closed: [] },
      },
    };

    const accounts = convertAccountsToLegacy(src);
    expect(accounts.length).toBe(1);

    const a = accounts[0];
    expect(Object.keys(a)).toEqual([
      'BureauId',
      'AccountTypeDescription',
      'HighBalance',
      'DateReported',
      'DateOpened',
      'AccountNumber',
      'DateAccountStatus',
      'CurrentBalance',
      'CreditorName',
      'AccountCondition',
      'AccountDesignator',
      'DisputeFlag',
      'Industry',
      'AccountStatus',
      'PaymentStatus',
      'AmountPastDue',
      'AccountType',
      'CreditType',
      'PaymentFrequency',
      'TermType',
      'WorstPayStatus',
      'PayStatusHistoryStartDate',
      'PayStatusHistory',
      'Remark',
      'CreditLimit',
    ]);

    expect(a.BureauId).toBe(1);
    expect(a.AccountTypeDescription).toBe('Revolving Account');
    expect(a.CreditType).toBe('Revolving Account');
    expect(a.AccountType).toBe('Charge account');
    expect(a.AccountDesignator).toBe('Authorized User');
    expect(a.PayStatusHistory).toBe('U'.repeat(24));
    expect(a.WorstPayStatus).toBe('Current');
    expect(a.PaymentStatus).toBe('Current');
    expect(a.DisputeFlag).toBe('Account not disputed');
    expect(typeof a.CurrentBalance).toBe('string');
    expect(a.DateReported).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(a.DateOpened).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(a.PayStatusHistoryStartDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
