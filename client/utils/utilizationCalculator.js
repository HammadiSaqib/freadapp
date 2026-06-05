// Utility functions for calculating utilization based on credit type

/**
 * Calculate utilization percentage based on credit type
 * @param {string} creditType - The type of credit account (e.g., "Revolving Account", "Installment Account")
 * @param {string|number} currentBalance - Current balance on the account
 * @param {string|number} creditLimit - Credit limit for revolving accounts
 * @param {string|number} highBalance - High balance for installment accounts
 * @returns {object} - Object containing utilization percentage and additional info
 */
export const calculateUtilization = (creditType, currentBalance, creditLimit, highBalance) => {
  // Convert string values to numbers, handle null/undefined/empty values
  const balance = parseFloat(currentBalance) || 0;
  const limit = parseFloat(creditLimit) || 0;
  const high = parseFloat(highBalance) || 0;

  // Normalize credit type to handle variations in naming
  const normalizedCreditType = (creditType && typeof creditType === 'string') ? creditType.toLowerCase() : '';
  
  if (normalizedCreditType.includes('revolving')) {
    // Revolving Account: Current Balance * 100 / Credit Limit = utilization
    if (limit === 0) {
      return {
        utilization: 0,
        type: 'revolving',
        message: 'No credit limit available',
        rawData: { balance, limit }
      };
    }
    
    const utilization = (balance * 100) / limit;
    return {
      utilization: Math.round(utilization * 100) / 100, // Round to 2 decimal places
      type: 'revolving',
      message: `${balance.toLocaleString()} / ${limit.toLocaleString()} = ${utilization.toFixed(1)}%`,
      rawData: { balance, limit }
    };
    
  } else if (normalizedCreditType.includes('installment')) {
    // Installment Account: Current Balance as percentage of Original Amount (High Balance)
    if (high === 0) {
      return {
        utilization: 0,
        type: 'installment',
        message: 'No original amount available',
        rawData: { balance, high }
      };
    }
    
    // For installment accounts, utilization = (Current Balance / Original Amount) * 100
    const utilization = (balance * 100) / high;
    const amountPaid = high - balance;
    
    return {
      utilization: Math.round(utilization * 100) / 100, // Current balance as % of original
      type: 'installment',
      message: `${balance.toLocaleString()} / ${high.toLocaleString()} = ${utilization.toFixed(1)}%`,
      paymentProgress: (((high - balance) * 100) / high).toFixed(1), // How much paid off
      amountPaid: amountPaid,
      remainingBalance: balance,
      originalAmount: high,
      rawData: { balance, high }
    };
    
  } else {
    // Unknown credit type - default to revolving calculation if credit limit exists
    if (limit > 0) {
      const utilization = (balance * 100) / limit;
      return {
        utilization: Math.round(utilization * 100) / 100,
        type: 'unknown_revolving',
        message: `${balance.toLocaleString()} / ${limit.toLocaleString()} = ${utilization.toFixed(1)}% (assumed revolving)`,
        rawData: { balance, limit }
      };
    }
    
    return {
      utilization: 0,
      type: 'unknown',
      message: 'Unable to calculate utilization - unknown credit type',
      rawData: { balance, limit, high }
    };
  }
};

/**
 * Format utilization display based on account type
 * @param {object} utilizationData - Result from calculateUtilization function
 * @returns {string} - Formatted display string
 */
export const formatUtilizationDisplay = (utilizationData) => {
  if (!utilizationData) return 'N/A';
  
  const { utilization, type, message, paymentProgress } = utilizationData;
  
  switch (type) {
    case 'revolving':
      return `${utilization}%`;
    case 'installment':
      return `${paymentProgress}% paid`;
    case 'unknown_revolving':
      return `${utilization}% (est.)`;
    default:
      return 'N/A';
  }
};

/**
 * Get utilization color class based on percentage and type
 * @param {object} utilizationData - Result from calculateUtilization function
 * @returns {string} - CSS class for color coding
 */
export const getUtilizationColorClass = (utilizationData) => {
  if (!utilizationData) return 'text-gray-500';
  
  const { utilization, type } = utilizationData;
  
  if (type === 'revolving') {
    // For revolving accounts, lower utilization is better
    if (utilization <= 10) return 'text-green-600';
    if (utilization <= 30) return 'text-yellow-600';
    return 'text-red-600';
  } else if (type === 'installment') {
    // For installment accounts, higher payment progress is better
    if (utilization >= 80) return 'text-green-600';
    if (utilization >= 50) return 'text-yellow-600';
    return 'text-gray-500';
  }
  
  return 'text-gray-500';
};

/**
 * Wrapper function to calculate utilization from an account object
 * @param {object} account - Account object with various possible field names
 * @returns {number|null} - Utilization percentage or null if cannot calculate
 */
export const calculateAccountUtilization = (account) => {
  if (!account) return null;
  
  // Extract credit type from various possible field names
  const creditType = account.CreditType || account.type || account.AccountType || account.creditType || '';
  
  // Extract balance from various possible field names
  const currentBalance = account.CurrentBalance || account.balance || account.currentBalance || 0;
  
  // Extract credit limit from various possible field names
  const creditLimit = account.CreditLimit || account.limit || account.creditLimit || 0;
  
  // Extract high balance from various possible field names
  const highBalance = account.HighBalance || account.highBalance || account.originalAmount || 0;
  
  // Call the main calculation function
  const result = calculateUtilization(creditType, currentBalance, creditLimit, highBalance);
  
  // Return just the utilization percentage for backward compatibility
  return result ? result.utilization : null;
};