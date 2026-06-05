/**
 * Credit Report Formatter Utility
 * 
 * This utility provides functions to format credit report data for display,
 * ensuring proper handling of missing or null values.
 */

/**
 * Format credit score for display
 */
export function formatCreditScore(score: any): string {
  if (score === null || score === undefined || score === '' || isNaN(Number(score))) {
    return 'N/A';
  }
  return String(score);
}

/**
 * Format account count for display
 */
export function formatAccountCount(count: any): string {
  if (count === null || count === undefined || count === '' || isNaN(Number(count))) {
    return 'N/A';
  }
  return String(count);
}

/**
 * Format currency amount for display
 */
export function formatCurrency(amount: any): string {
  if (amount === null || amount === undefined || amount === '' || isNaN(Number(amount))) {
    return 'N/A';
  }
  
  // Convert to number if it's a string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Format as currency
  return `$${numAmount.toLocaleString()}`;
}

/**
 * Extract and format credit scores from report data
 */
export function extractCreditScores(reportData: any): {
  equifax: string;
  transunion: string;
  experian: string;
} {
  const scores = {
    equifax: 'N/A',
    transunion: 'N/A',
    experian: 'N/A'
  };
  
  // Extract scores from Score array if available
  if (reportData?.Score && Array.isArray(reportData.Score)) {
    reportData.Score.forEach((score: any) => {
      if (score.BureauId === 1) scores.transunion = formatCreditScore(score.Score);
      if (score.BureauId === 2) scores.experian = formatCreditScore(score.Score);
      if (score.BureauId === 3) scores.equifax = formatCreditScore(score.Score);
    });
  }
  
  return scores;
}

/**
 * Extract and format account summary from report data
 */
export function extractAccountSummary(reportData: any): {
  equifax: { totalAccounts: string; openAccounts: string; closedAccounts: string; balances: string };
  transunion: { totalAccounts: string; openAccounts: string; closedAccounts: string; balances: string };
  experian: { totalAccounts: string; openAccounts: string; closedAccounts: string; balances: string };
} {
  const accountSummary = {
    equifax: { totalAccounts: 'N/A', openAccounts: 'N/A', closedAccounts: 'N/A', balances: 'N/A' },
    transunion: { totalAccounts: 'N/A', openAccounts: 'N/A', closedAccounts: 'N/A', balances: 'N/A' },
    experian: { totalAccounts: 'N/A', openAccounts: 'N/A', closedAccounts: 'N/A', balances: 'N/A' }
  };
  
  // Count accounts by bureau and status
  if (reportData?.Accounts && Array.isArray(reportData.Accounts)) {
    const accountsByBureau = {
      1: { total: 0, open: 0, closed: 0, balance: 0 },
      2: { total: 0, open: 0, closed: 0, balance: 0 },
      3: { total: 0, open: 0, closed: 0, balance: 0 }
    };
    
    reportData.Accounts.forEach((account: any) => {
      const bureauId = account.BureauId;
      if (bureauId && accountsByBureau[bureauId]) {
        accountsByBureau[bureauId].total++;
        
        if (account.AccountStatus === 'Open') {
          accountsByBureau[bureauId].open++;
        } else if (account.AccountStatus === 'Closed') {
          accountsByBureau[bureauId].closed++;
        }
        
        const balance = parseFloat(account.CurrentBalance) || 0;
        accountsByBureau[bureauId].balance += balance;
      }
    });
    
    // Update account summary with actual counts
    if (accountsByBureau[1].total > 0) {
      accountSummary.equifax = {
        totalAccounts: formatAccountCount(accountsByBureau[1].total),
        openAccounts: formatAccountCount(accountsByBureau[1].open),
        closedAccounts: formatAccountCount(accountsByBureau[1].closed),
        balances: formatCurrency(accountsByBureau[1].balance)
      };
    }
    
    if (accountsByBureau[2].total > 0) {
      accountSummary.transunion = {
        totalAccounts: formatAccountCount(accountsByBureau[2].total),
        openAccounts: formatAccountCount(accountsByBureau[2].open),
        closedAccounts: formatAccountCount(accountsByBureau[2].closed),
        balances: formatCurrency(accountsByBureau[2].balance)
      };
    }
    
    if (accountsByBureau[3].total > 0) {
      accountSummary.experian = {
        totalAccounts: formatAccountCount(accountsByBureau[3].total),
        openAccounts: formatAccountCount(accountsByBureau[3].open),
        closedAccounts: formatAccountCount(accountsByBureau[3].closed),
        balances: formatCurrency(accountsByBureau[3].balance)
      };
    }
  }
  
  return accountSummary;
}

/**
 * Process raw credit report data for display
 * @param reportData Raw credit report data
 * @returns Formatted data ready for display
 */
export function processCreditReportData(reportData: any): any {
  if (!reportData) return null;
  
  const scores = extractCreditScores(reportData);
  const accountSummary = extractAccountSummary(reportData);
  
  // Map bureau IDs to names
  const bureauMap: {[key: number]: string} = {
    1: 'experian',
    2: 'transunion',
    3: 'equifax'
  };
  
  // Process report data by bureau
  const processedData: {[key: string]: any} = {};
  
  Object.entries(bureauMap).forEach(([bureauId, bureauName]) => {
    const id = Number(bureauId);
    processedData[bureauName] = {
      score: scores[bureauName as keyof typeof scores],
      accounts: accountSummary[bureauName as keyof typeof accountSummary].totalAccounts,
      openAccounts: accountSummary[bureauName as keyof typeof accountSummary].openAccounts,
      closedAccounts: accountSummary[bureauName as keyof typeof accountSummary].closedAccounts,
      balances: accountSummary[bureauName as keyof typeof accountSummary].balances,
    };
  });
  
  return processedData;
}