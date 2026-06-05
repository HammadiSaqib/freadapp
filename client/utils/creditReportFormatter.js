/**
 * Credit Report Formatter Utility
 * 
 * This utility provides functions to format credit report data for display,
 * ensuring proper handling of missing or null values.
 */

/**
 * Format credit score for display
 */
function formatCreditScore(score) {
  if (score === null || score === undefined || score === '' || isNaN(Number(score))) {
    return 'N/A';
  }
  return String(score);
}

/**
 * Format account count for display
 */
function formatAccountCount(count) {
  if (count === null || count === undefined || count === '' || isNaN(Number(count))) {
    return 'N/A';
  }
  return String(count);
}

/**
 * Format currency amount for display
 */
function formatCurrency(amount) {
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
function extractCreditScores(reportData) {
  const scores = {
    equifax: 'N/A',
    transunion: 'N/A',
    experian: 'N/A'
  };
  
  // Extract scores from Score array if available
  if (reportData?.Score && Array.isArray(reportData.Score)) {
    reportData.Score.forEach(score => {
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
function extractAccountSummary(reportData) {
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
    
    reportData.Accounts.forEach(account => {
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
function processCreditReportData(reportData) {
  if (!reportData) return null;
  
  const scores = extractCreditScores(reportData);
  const accountSummary = extractAccountSummary(reportData);
  
  // Map bureau IDs to names
  const bureauMap = {
    1: 'equifax',
    2: 'transunion',
    3: 'experian'
  };
  
  // Process report data by bureau
  const processedData = {};
  
  Object.entries(bureauMap).forEach(([bureauId, bureauName]) => {
    const id = Number(bureauId);
    processedData[bureauName] = {
      score: scores[bureauName],
      accounts: accountSummary[bureauName].totalAccounts,
      openAccounts: accountSummary[bureauName].openAccounts,
      closedAccounts: accountSummary[bureauName].closedAccounts,
      balances: accountSummary[bureauName].balances,
    };
  });
  
  return processedData;
}

// Export the functions for use in other modules
export { 
  formatCreditScore, 
  formatAccountCount, 
  formatCurrency, 
  extractCreditScores, 
  extractAccountSummary, 
  processCreditReportData 
};