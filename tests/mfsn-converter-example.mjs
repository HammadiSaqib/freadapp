import { convertMFSNToLegacyFormat } from '../server/services/scrapers/converter.js';

const sampleNewJson = {
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
          Primary: 'John M Doe',
        },
        BirthYear: 631152000000,
        Employer: {
          EFX: [{ name: 'ACME INC', occupation: 'Engineer' }],
          EXP: [{ name: 'ACME INC', occupation: 'Engineer' }],
          TU: [{ name: 'ACME INC', occupation: 'Engineer' }],
        },
      },
      currentAddress: {
        EFX: { streetAddress: '100 Main St', city: 'Dallas', state: 'TX', zip: '75001' },
        EXP: { streetAddress: '100 Main St', city: 'Dallas', state: 'TX', zip: '75001' },
        TU: { streetAddress: '100 Main St', city: 'Dallas', state: 'TX', zip: '75001' },
      },
      previousAddresses: {
        EFX: [{ streetAddress: '50 Old Rd', city: 'Plano', state: 'TX', zip: '75024' }],
      },
      finalAccountDetails: {
        positive: {
          open: [
            {
              creditorName: { EFX: 'CHASE', EXP: 'CHASE', TU: 'CHASE' },
              accountNumber: { EFX: '****1111', EXP: '****1111', TU: '****1111' },
              dateOpened: { EFX: 1609459200000, EXP: 1609459200000, TU: 1609459200000 },
              currentBalance: { EFX: '1000', EXP: '900', TU: '950' },
              creditLimit: { EFX: '5000', EXP: '5000', TU: '5000' },
              accountStatus: { EFX: 'Open', EXP: 'Open', TU: 'Open' },
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
      Inquiries: {
        EFX: [{ subscriberName: 'BMW FIN', dateOfInquiry: 1710460800000 }],
      },
      PublicRecords: {
        EFX: [{ type: 'Lien', amount: '0', dateFiled: 1514764800000, status: 'Closed' }],
      },
    },
  },
};

const legacy = convertMFSNToLegacyFormat(sampleNewJson, {
  clientId: 33,
  username: 'john@example.com',
});

console.log(JSON.stringify(legacy, null, 2));
