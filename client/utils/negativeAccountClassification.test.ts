import { describe, expect, it } from 'vitest';
import {
  isChargeOffNegativeAccount,
  isLatePaymentNegativeAccount,
} from './negativeAccountClassification';

describe('negative account classification', () => {
  it('classifies TransUnion charged-off bad debt as a charge-off only', () => {
    const account = {
      BureauId: 1,
      CreditorName: 'SYNCB/CARECR',
      AccountStatus: 'Closed',
      AccountCondition: 'Closed',
      PaymentStatus: 'Charged off as bad debt',
      AmountPastDue: '3117',
      WorstPayStatus: 'Current',
      PayStatusHistory: '',
    };

    expect(isChargeOffNegativeAccount(account)).toBe(true);
    expect(isLatePaymentNegativeAccount(account)).toBe(false);
  });

  it.each(['Charge-off', 'Charge off', 'Chargeoff', 'Charged off as bad debt'])(
    'recognizes the charge-off wording %s',
    (PaymentStatus) => {
      expect(isChargeOffNegativeAccount({ PaymentStatus })).toBe(true);
    },
  );

  it('still classifies a non-charge-off past-due tradeline as late', () => {
    expect(
      isLatePaymentNegativeAccount({
        PaymentStatus: 'Current',
        AmountPastDue: '150',
        PayStatusHistory: '',
      }),
    ).toBe(true);
  });
});
