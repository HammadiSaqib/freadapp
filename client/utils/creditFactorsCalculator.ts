interface Account {
  PayStatusHistory?: string;
  CurrentBalance?: string | number;
  CreditLimit?: string | number;
  DateOpened?: string;
  PaymentStatus?: string;
  WorstPayStatus?: string;
  AccountStatus?: string;
  CreditType?: string;
  DateReported?: string;
}

interface CreditFactors {
  label: string;
  value: number;
  color: string;
}

export const calculateCreditFactors = (
  accounts: Account[], 
  scoreType: 'FICO' | 'VantageScore'
): CreditFactors[] => {
  if (!accounts || accounts.length === 0) {
    // Return default hardcoded values if no data
    return getDefaultCreditFactors(scoreType);
  }

  // Calculate actual factors from account data
  const paymentHistoryScore = calculatePaymentHistory(accounts);
  const utilizationScore = calculateUtilization(accounts);
  const creditAgeScore = calculateCreditAge(accounts);
  const newCreditScore = calculateNewCredit(accounts);
  const creditMixScore = calculateCreditMix(accounts);

  if (scoreType === 'VantageScore') {
    return [
      { label: 'Payment History', value: paymentHistoryScore, color: '#85BB65' },
      { label: 'Depth of Credit', value: creditAgeScore + creditMixScore, color: '#333333' },
      { label: 'Credit Utilization', value: utilizationScore, color: '#32CD32' },
      { label: 'Recent Credit', value: newCreditScore, color: '#64748B' },
      { label: 'Balance', value: Math.max(0, 100 - paymentHistoryScore - utilizationScore - newCreditScore - (creditAgeScore + creditMixScore)), color: '#006400' },
      { label: 'Available Credit', value: 2, color: '#D1D5DB' }
    ];
  } else {
    // FICO scoring
    return [
      { label: 'Payment History', value: paymentHistoryScore, color: '#3B82F6' },
      { label: 'Credit Utilization', value: utilizationScore, color: '#10B981' },
      { label: 'Length of Credit History', value: creditAgeScore, color: '#F59E0B' },
      { label: 'Credit Mix', value: creditMixScore, color: '#EF4444' },
      { label: 'New Credit', value: newCreditScore, color: '#8B5CF6' }
    ];
  }
};

const calculatePaymentHistory = (accounts: Account[]): number => {
  let totalPayments = 0;
  let onTimePayments = 0;

  accounts.forEach(account => {
    if (account.PayStatusHistory) {
      const history = account.PayStatusHistory;
      totalPayments += history.length;
      // 'C' typically means current/on-time, 'U' means unrated
      onTimePayments += (history.match(/[CU]/g) || []).length;
    }
  });

  if (totalPayments === 0) return 35; // Default FICO weight

  const paymentRatio = onTimePayments / totalPayments;
  // Scale to appropriate percentage based on performance
  return Math.round(paymentRatio * 45); // Max 45% for excellent payment history
};

const calculateUtilization = (accounts: Account[]): number => {
  let totalBalance = 0;
  let totalLimit = 0;

  accounts.forEach(account => {
    if (account.CreditType === 'Revolving Account') {
      const balance = parseFloat(String(account.CurrentBalance || 0));
      const limit = parseFloat(String(account.CreditLimit || 0));
      
      // Ensure balance and limit are valid numbers
      if (!isNaN(balance) && !isNaN(limit) && isFinite(balance) && isFinite(limit) && limit > 0) {
        totalBalance += balance;
        totalLimit += limit;
      }
    }
  });

  if (totalLimit === 0) return 30; // Default FICO weight

  const utilizationRatio = totalBalance / totalLimit;
  
  // Ensure utilizationRatio is a valid number
  if (isNaN(utilizationRatio) || !isFinite(utilizationRatio)) {
    return 30; // Default FICO weight for invalid calculations
  }
  
  // Lower utilization = higher score contribution
  if (utilizationRatio <= 0.1) return 30; // Excellent utilization
  if (utilizationRatio <= 0.3) return 25; // Good utilization
  if (utilizationRatio <= 0.5) return 20; // Fair utilization
  return 15; // High utilization
};

const calculateCreditAge = (accounts: Account[]): number => {
  if (accounts.length === 0) return 15; // Default FICO weight

  const now = new Date();
  let totalAgeMonths = 0;
  let validAccounts = 0;

  accounts.forEach(account => {
    if (account.DateOpened) {
      const openDate = new Date(account.DateOpened);
      const ageMonths = (now.getTime() - openDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (ageMonths > 0) {
        totalAgeMonths += ageMonths;
        validAccounts++;
      }
    }
  });

  if (validAccounts === 0) return 15;

  const avgAgeMonths = totalAgeMonths / validAccounts;
  // Longer average age = higher score contribution
  if (avgAgeMonths >= 120) return 15; // 10+ years
  if (avgAgeMonths >= 60) return 12;  // 5+ years
  if (avgAgeMonths >= 24) return 10;  // 2+ years
  return 8; // Less than 2 years
};

const calculateNewCredit = (accounts: Account[]): number => {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - (6 * 30 * 24 * 60 * 60 * 1000));
  
  let recentAccounts = 0;
  accounts.forEach(account => {
    if (account.DateOpened) {
      const openDate = new Date(account.DateOpened);
      if (openDate >= sixMonthsAgo) {
        recentAccounts++;
      }
    }
  });

  // More recent accounts = lower score contribution
  if (recentAccounts === 0) return 10; // No recent accounts
  if (recentAccounts <= 2) return 8;   // Few recent accounts
  return 5; // Many recent accounts
};

const calculateCreditMix = (accounts: Account[]): number => {
  const creditTypes = new Set();
  accounts.forEach(account => {
    if (account.CreditType) {
      creditTypes.add(account.CreditType);
    }
  });

  // More diverse credit mix = higher score contribution
  if (creditTypes.size >= 3) return 10; // Excellent mix
  if (creditTypes.size === 2) return 8;  // Good mix
  return 5; // Limited mix
};

const getDefaultCreditFactors = (scoreType: 'FICO' | 'VantageScore'): CreditFactors[] => {
  if (scoreType === 'VantageScore') {
    return [
      { label: 'Payment History', value: 41, color: '#85BB65' },
      { label: 'Depth of Credit', value: 20, color: '#333333' },
      { label: 'Credit Utilization', value: 20, color: '#32CD32' },
      { label: 'Recent Credit', value: 11, color: '#64748B' },
      { label: 'Balance', value: 6, color: '#006400' },
      { label: 'Available Credit', value: 2, color: '#D1D5DB' }
    ];
  } else {
    return [
      { label: 'Payment History', value: 35, color: '#3B82F6' },
      { label: 'Credit Utilization', value: 30, color: '#10B981' },
      { label: 'Length of Credit History', value: 15, color: '#F59E0B' },
      { label: 'Credit Mix', value: 10, color: '#EF4444' },
      { label: 'New Credit', value: 10, color: '#8B5CF6' }
    ];
  }
};