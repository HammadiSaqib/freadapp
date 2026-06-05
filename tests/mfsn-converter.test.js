import { describe, it, expect } from 'vitest';
import { convertMFSNToLegacyFormat } from '../server/services/scrapers/converter.js';

describe('convertMFSNToLegacyFormat', () => {
  it('converts 3 bureau payload into legacy structure', () => {
    const input = {
      index: 12,
      score: 2,
      url: 'https://api.myfreescorenow.com/api/member/equifax/credit-report',
      capturedAt: '2026-02-27T23:15:25.743Z',
      data: {
        success: true,
        message: 'ok',
        data: {
          date: {
            EFX: 1741478400000,
            EXP: 1741478400000,
            TU: 1741478400000,
          },
          RiskScore: {
            EFX: 701,
            EXP: 689,
            TU: 674,
          },
          Borrower: {
            BorrowerName: {
              Primary: {
                EFX: 'John M Doe',
                EXP: 'John M Doe',
                TU: 'John M Doe',
              },
            },
            BirthYear: {
              EFX: 631152000000,
              EXP: 631152000000,
              TU: 631152000000,
            },
            Employer: {
              EFX: [{ name: 'ACME EFX', occupation: 'Engineer' }],
              EXP: [{ name: 'ACME EXP', occupation: 'Engineer' }],
              TU: [{ name: 'ACME TU', occupation: 'Engineer' }],
            },
          },
          currentAddress: {
            EFX: { streetAddress: '100 Main St', city: 'Dallas', state: 'TX', zip: '75001' },
            EXP: { streetAddress: '101 Main St', city: 'Dallas', state: 'TX', zip: '75002' },
            TU: { streetAddress: '102 Main St', city: 'Dallas', state: 'TX', zip: '75003' },
          },
          previousAddresses: {
            EFX: [{ streetAddress: '50 Old Rd', city: 'Plano', state: 'TX', zip: '75024' }],
            EXP: [{ streetAddress: '51 Old Rd', city: 'Plano', state: 'TX', zip: '75024' }],
            TU: [{ streetAddress: '52 Old Rd', city: 'Plano', state: 'TX', zip: '75024' }],
          },
          finalAccountDetails: {
            positive: {
              open: [
                {
                  accountName: { EFX: 'CHASE', EXP: 'CHASE', TU: 'CHASE' },
                  accountNumber: { EFX: '****1111', EXP: '****1111', TU: '****1111' },
                  dateOpened: { EFX: 1609459200000, EXP: 1609459200000, TU: 1609459200000 },
                  currentBalance: { EFX: '1000', EXP: '900', TU: '950' },
                  highBalance: { EFX: '1200', EXP: '1100', TU: '1150' },
                  creditLimit: { EFX: '5000', EXP: '5000', TU: '5000' },
                  accountStatus: { EFX: 'Open', EXP: 'Open', TU: 'Open' },
                  paymentStatus: { EFX: 'Current', EXP: 'Current', TU: 'Current' },
                  paymentHistory: { EFX: ['OK', 'OK'], EXP: ['OK'], TU: ['OK', '30'] },
                },
              ],
              closed: [],
            },
            negative: {
              open: [],
              closed: [],
            },
          },
          allInquiries: [
            {
              provider: 'EFX',
              type: 'HARD',
              reportedDate: 1710460800000,
              contactInformation: { contactName: 'BMW FIN' },
            },
            {
              provider: 'EXP',
              type: 'HARD',
              reportedDate: 1710460800000,
              contactInformation: { contactName: 'AMEX' },
            },
            {
              provider: 'TU',
              type: 'HARD',
              reportedDate: 1710460800000,
              contactInformation: { contactName: 'CITI' },
            },
          ],
          PublicRecords: {
            EFX: [{ type: 'Lien', amount: '0', dateFiled: 1514764800000, status: 'Closed' }],
            EXP: [{ type: 'Judgment', amount: '100', dateFiled: 1514764800000, status: 'Open' }],
            TU: [{ type: 'Bankruptcy', amount: '0', dateFiled: 1514764800000, status: 'Discharged' }],
          },
        },
      },
    };

    const out = convertMFSNToLegacyFormat(input, { clientId: 33, username: 'john@example.com' });

    expect(out.clientInfo.clientId).toBe(33);
    expect(out.clientInfo.username).toBe('john@example.com');
    expect(out.clientInfo.timestamp).toBe('2026-02-27T23:15:25.743Z');
    expect(out.clientInfo.reportDate).toBe('09/03/2025');

    expect(out.reportData.Score).toEqual([
      { BureauId: 3, Score: '701', ScoreType: 'VantageScore3', DateScore: '2025-03-09' },
      { BureauId: 2, Score: '689', ScoreType: 'VantageScore3', DateScore: '2025-03-09' },
      { BureauId: 1, Score: '674', ScoreType: 'VantageScore3', DateScore: '2025-03-09' },
    ]);

    expect(out.reportData.Name).toHaveLength(3);
    expect(out.reportData.Address.filter((a) => a.AddressType === 'Current')).toHaveLength(3);
    expect(out.reportData.Address.filter((a) => a.AddressType === 'Previous')).toHaveLength(3);
    expect(out.reportData.DOB).toHaveLength(3);
    expect(out.reportData.Employer).toHaveLength(3);
    expect(out.reportData.Accounts).toHaveLength(3);
    expect(out.reportData.Inquiries).toHaveLength(3);
    expect(out.reportData.PublicRecords).toHaveLength(3);

    const bureausInAccounts = new Set(out.reportData.Accounts.map((a) => a.BureauId));
    expect(bureausInAccounts.has(1)).toBe(true);
    expect(bureausInAccounts.has(2)).toBe(true);
    expect(bureausInAccounts.has(3)).toBe(true);
  });
});
