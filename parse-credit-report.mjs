// Simple script to parse and display credit report data
import fs from 'fs';

// Function to parse credit report data
function parseCreditReport(reportData) {
  try {
    // Check if reportData is a string (JSON) and parse it
    const data = typeof reportData === 'string' ? JSON.parse(reportData) : reportData;
    
    // Extract credit scores
    const scores = {
      equifax: 'N/A',
      transunion: 'N/A',
      experian: 'N/A'
    };
    
    // Extract scores from Score array if available
    if (data.Score && Array.isArray(data.Score)) {
      data.Score.forEach(score => {
        if (score.BureauId === 1) scores.equifax = score.Score || 'N/A';
        if (score.BureauId === 2) scores.transunion = score.Score || 'N/A';
        if (score.BureauId === 3) scores.experian = score.Score || 'N/A';
      });
    }
    
    // Extract account summary
    const accountSummary = {
      equifax: { totalAccounts: 'N/A', openAccounts: 'N/A', closedAccounts: 'N/A', balances: 'N/A' },
      transunion: { totalAccounts: 'N/A', openAccounts: 'N/A', closedAccounts: 'N/A', balances: 'N/A' },
      experian: { totalAccounts: 'N/A', openAccounts: 'N/A', closedAccounts: 'N/A', balances: 'N/A' }
    };
    
    // Count accounts by bureau and status
    if (data.Accounts && Array.isArray(data.Accounts)) {
      const accountsByBureau = {
        1: { total: 0, open: 0, closed: 0, balance: 0 },
        2: { total: 0, open: 0, closed: 0, balance: 0 },
        3: { total: 0, open: 0, closed: 0, balance: 0 }
      };
      
      data.Accounts.forEach(account => {
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
          totalAccounts: accountsByBureau[1].total,
          openAccounts: accountsByBureau[1].open,
          closedAccounts: accountsByBureau[1].closed,
          balances: `$${accountsByBureau[1].balance.toLocaleString()}`
        };
      }
      
      if (accountsByBureau[2].total > 0) {
        accountSummary.transunion = {
          totalAccounts: accountsByBureau[2].total,
          openAccounts: accountsByBureau[2].open,
          closedAccounts: accountsByBureau[2].closed,
          balances: `$${accountsByBureau[2].balance.toLocaleString()}`
        };
      }
      
      if (accountsByBureau[3].total > 0) {
        accountSummary.experian = {
          totalAccounts: accountsByBureau[3].total,
          openAccounts: accountsByBureau[3].open,
          closedAccounts: accountsByBureau[3].closed,
          balances: `$${accountsByBureau[3].balance.toLocaleString()}`
        };
      }
    }
    
    // Format the report for display
    const formattedReport = {
      scores,
      accountSummary
    };
    
    return formattedReport;
  } catch (error) {
    console.error('Error parsing credit report:', error);
    return {
      scores: { equifax: 'Error', transunion: 'Error', experian: 'Error' },
      accountSummary: {
        equifax: { totalAccounts: 'Error', openAccounts: 'Error', closedAccounts: 'Error', balances: 'Error' },
        transunion: { totalAccounts: 'Error', openAccounts: 'Error', closedAccounts: 'Error', balances: 'Error' },
        experian: { totalAccounts: 'Error', openAccounts: 'Error', closedAccounts: 'Error', balances: 'Error' }
      }
    };
  }
}

// Function to display credit report in a formatted way
function displayCreditReport(report) {
  console.log('Credit Report Results');
  console.log(' Equifax');
  console.log(` ${report.scores.equifax}`);
  console.log('');
  console.log(' TransUnion');
  console.log(` ${report.scores.transunion}`);
  console.log('');
  console.log(' Experian');
  console.log(` ${report.scores.experian}`);
  console.log('');
  console.log(' Account Summary');
  console.log(' Bureau \t Total Accounts \t Open Accounts \t Closed Accounts \t Balances');
  console.log(` transunion \t ${report.accountSummary.transunion.totalAccounts} \t ${report.accountSummary.transunion.openAccounts} \t ${report.accountSummary.transunion.closedAccounts} \t ${report.accountSummary.transunion.balances}`);
  console.log(` experian \t ${report.accountSummary.experian.totalAccounts} \t ${report.accountSummary.experian.openAccounts} \t ${report.accountSummary.experian.closedAccounts} \t ${report.accountSummary.experian.balances}`);
  console.log(` equifax \t ${report.accountSummary.equifax.totalAccounts} \t ${report.accountSummary.equifax.openAccounts} \t ${report.accountSummary.equifax.closedAccounts} \t ${report.accountSummary.equifax.balances}`);
}

// Main function to run the script
function main() {
  try {
    // Check if a file path is provided as an argument
    const filePath = process.argv[2] || './sample_report.json';
    
    // Read the report file
    const reportData = fs.readFileSync(filePath, 'utf8');
    
    // Parse the report
    const parsedReport = parseCreditReport(JSON.parse(reportData));
    
    // Display the report
    displayCreditReport(parsedReport);
    
  } catch (error) {
    console.error('Error processing credit report:', error);
  }
}

// Run the script
main();

// Add type="module" directive to package.json or use .mjs extension