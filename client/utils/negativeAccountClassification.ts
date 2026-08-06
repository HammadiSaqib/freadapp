const accountText = (value: unknown): string => String(value ?? '').trim().toLowerCase();

export const isChargeOffNegativeAccount = (account: any): boolean => {
  const status = [account?.status, account?.AccountStatus, account?.AccountCondition]
    .map(accountText)
    .join(' ');
  const paymentStatus = [
    account?.paymentHistory,
    account?.PaymentStatus,
    account?.paymentStatus,
    account?.WorstPayStatus,
  ]
    .map(accountText)
    .join(' ');

  // Covers charge-off, charge off, chargeoff, charged off, and phrases such as
  // "charged off as bad debt" without relying on one bureau's exact wording.
  return paymentStatus.includes('charge') || status.includes('charge');
};

export const isLatePaymentNegativeAccount = (account: any): boolean => {
  const status = accountText(account?.status || account?.AccountStatus || account?.AccountCondition);
  const paymentStatus = accountText(account?.paymentHistory || account?.PaymentStatus || account?.paymentStatus);
  const worstPayStatus = accountText(account?.WorstPayStatus || account?.worstStatus);
  const accountType = accountText(account?.AccountType);
  const accountTypeDescription = accountText(account?.AccountTypeDescription);
  const remark = accountText(account?.Remark);
  const payStatusHistory = String(account?.PayStatusHistory || account?.payStatusHistory || '').toUpperCase();
  const lateCount = Number(account?.latePayments?.total ?? 0);
  const amountPastDue = Number.parseFloat(String(account?.AmountPastDue ?? account?.amountPastDue ?? '0')) || 0;

  const collectionLike =
    paymentStatus.includes('collection') ||
    accountType.includes('collection') ||
    accountTypeDescription.includes('collection');

  // A charge-off is its own, more severe category. A past-due balance or old late
  // history on that tradeline must not also classify it as a late payment.
  if (collectionLike || isChargeOffNegativeAccount(account)) return false;

  const lateTerms = ['late', 'past due', 'delinquent', 'default', 'overdue', 'was past due'];
  const hasLateText = [status, paymentStatus, worstPayStatus, remark].some((text) =>
    lateTerms.some((term) => text.includes(term)),
  );
  const hasNumericLateStatus = /\b(?:30|60|90|120|150|180)\b/.test(
    `${paymentStatus} ${worstPayStatus} ${status}`,
  );
  const hasLateHistory = /[1-9]/.test(payStatusHistory);

  return hasLateText || hasNumericLateStatus || hasLateHistory || lateCount > 0 || amountPastDue > 0;
};
