// Test script for credit report formatter
import fs from 'fs';

/**
 * Format credit score for display
 */
function formatCreditScore(score) {
  if (score === null || score === undefined || score === '') {
    return 'N/A';
  }
  return String(score);
}

/**
 * Format account count for display
 */
function formatAccountCount(count) {
  if (count === null || count === undefined || count === '') {
    return 'N/A';
  }
  return String(count);
}

/**
 * Format currency amount for display
 */
function formatCurrency(amount) {
  if (amount === null || amount === undefined || amount === '') {
    return 'N/A';
  }
  
  // Convert to number if it's a string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Check if it's a valid number
  if (isNaN(numAmount)) {
    return 'N/A';
  }
  
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
      if (score.BureauId === 1) scores.experian = formatCreditScore(score.Score);
      if (score.BureauId === 2) scores.transunion = formatCreditScore(score.Score);
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
 * Format credit report data for display
 */
function formatCreditReport(reportData) {
  try {
    // Extract credit scores and account summary
    const scores = extractCreditScores(reportData);
    const accountSummary = extractAccountSummary(reportData);
    
    // Format the report for display
    let output = 'Credit Report Results\n';
    output += ' Equifax\n';
    output += ` ${scores.equifax}\n\n`;
    output += ' TransUnion\n';
    output += ` ${scores.transunion}\n\n`;
    output += ' Experian\n';
    output += ` ${scores.experian}\n\n`;
    output += ' Account Summary\n';
    output += ' Bureau \t Total Accounts \t Open Accounts \t Closed Accounts \t Balances\n';
    output += ` transunion \t ${accountSummary.transunion.totalAccounts} \t ${accountSummary.transunion.openAccounts} \t ${accountSummary.transunion.closedAccounts} \t ${accountSummary.transunion.balances}\n`;
    output += ` experian \t ${accountSummary.experian.totalAccounts} \t ${accountSummary.experian.openAccounts} \t ${accountSummary.experian.closedAccounts} \t ${accountSummary.experian.balances}\n`;
    output += ` equifax \t ${accountSummary.equifax.totalAccounts} \t ${accountSummary.equifax.openAccounts} \t ${accountSummary.equifax.closedAccounts} \t ${accountSummary.equifax.balances}`;
    
    return output;
  } catch (error) {
    console.error('Error formatting credit report:', error);
    return 'Error formatting credit report data';
  }
}

// Main function to run the script
async function main() {
  try {
    // Check if a file path is provided as an argument
    const filePath = process.argv[2] || './sample_report.json';
    
    // Read the report file
    const reportData = await fs.promises.readFile(filePath, 'utf8');
    
    // Parse and format the report
    const formattedReport = formatCreditReport(JSON.parse(reportData));
    
    console.log(formattedReport);
    
    // Create a sample empty report to test N/A handling
    const emptyReport = {};
    console.log('\n\nEmpty Report Test:');
    console.log(formatCreditReport(emptyReport));
    
  } catch (error) {
    console.error('Error processing credit report:', error);
  }
}

// Run the script
main();