/**
 * Credit Signals Extractor
 * Extracts key credit metrics from credit report JSON data
 */

export class CreditSignalsExtractor {
  constructor(creditReportData) {
    this.data = creditReportData;
    this.accounts = creditReportData?.Accounts || [];
    this.inquiries = creditReportData?.Inquiries || [];
    this.personalInfo = creditReportData?.PersonalInfo || {};
  }

  /**
   * Calculate total available credit across all accounts
   */
  getTotalAvailableCredit() {
    return this.accounts.reduce((total, account) => {
      const creditLimit = parseFloat(account.CreditLimit || 0);
      const currentBalance = parseFloat(account.CurrentBalance || 0);
      const available = creditLimit - currentBalance;
      return total + Math.max(available, 0);
    }, 0);
  }

  /**
   * Calculate total credit limits
   */
  getTotalCreditLimits() {
    return this.accounts.reduce((total, account) => {
      return total + parseFloat(account.CreditLimit || 0);
    }, 0);
  }

  /**
   * Calculate total current balances
   */
  getTotalCurrentBalances() {
    return this.accounts.reduce((total, account) => {
      return total + parseFloat(account.CurrentBalance || 0);
    }, 0);
  }

  /**
   * Calculate overall credit utilization percentage
   */
  getOverallUtilization() {
    const totalLimits = this.getTotalCreditLimits();
    const totalBalances = this.getTotalCurrentBalances();
    
    if (totalLimits === 0) return 0;
    return Math.round((totalBalances / totalLimits) * 100);
  }

  /**
   * Calculate average account age in months
   */
  getAverageAccountAge() {
    const openAccounts = this.accounts.filter(account => 
      account.AccountStatus === 'Open' && account.DateOpened
    );

    if (openAccounts.length === 0) return 0;

    const currentDate = new Date();
    const totalMonths = openAccounts.reduce((sum, account) => {
      const openDate = new Date(account.DateOpened);
      const monthsDiff = (currentDate.getFullYear() - openDate.getFullYear()) * 12 + 
                        (currentDate.getMonth() - openDate.getMonth());
      return sum + Math.max(monthsDiff, 0);
    }, 0);

    return Math.round(totalMonths / openAccounts.length);
  }

  /**
   * Get oldest account age in months
   */
  getOldestAccountAge() {
    const openAccounts = this.accounts.filter(account => 
      account.AccountStatus === 'Open' && account.DateOpened
    );

    if (openAccounts.length === 0) return 0;

    const currentDate = new Date();
    let oldestAge = 0;

    openAccounts.forEach(account => {
      const openDate = new Date(account.DateOpened);
      const monthsDiff = (currentDate.getFullYear() - openDate.getFullYear()) * 12 + 
                        (currentDate.getMonth() - openDate.getMonth());
      oldestAge = Math.max(oldestAge, monthsDiff);
    });

    return oldestAge;
  }

  /**
   * Count total number of open accounts
   */
  getOpenAccountsCount() {
    return this.accounts.filter(account => 
      account.AccountStatus === 'Open'
    ).length;
  }

  /**
   * Count credit cards specifically
   */
  getCreditCardsCount() {
    return this.accounts.filter(account => 
      account.AccountType === 'Credit Card' && account.AccountStatus === 'Open'
    ).length;
  }

  /**
   * Get recent inquiries count by bureau (last 24 months)
   */
  getRecentInquiriesByBureau() {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 24);

    const inquiriesByBureau = {
      experian: 0,
      equifax: 0,
      transunion: 0
    };

    this.inquiries.forEach(inquiry => {
      const inquiryDate = new Date(inquiry.DateOfInquiry || inquiry.Date);
      if (inquiryDate >= cutoffDate) {
        switch (inquiry.BureauId) {
          case 1:
            inquiriesByBureau.experian++;
            break;
          case 2:
            inquiriesByBureau.equifax++;
            break;
          case 3:
            inquiriesByBureau.transunion++;
            break;
        }
      }
    });

    return inquiriesByBureau;
  }

  /**
   * Count negative items (collections, charge-offs, etc.)
   */
  getNegativeItemsCount() {
    return this.accounts.filter(account => {
      const status = account.AccountStatus?.toLowerCase() || '';
      const condition = account.AccountCondition?.toLowerCase() || '';
      const paymentStatus = account.PaymentStatus?.toLowerCase() || '';
      
      return status.includes('closed') && 
             (condition.includes('charge') || 
              condition.includes('collection') ||
              paymentStatus.includes('late') ||
              paymentStatus.includes('delinquent'));
    }).length;
  }

  /**
   * Calculate payment history percentage
   */
  getPaymentHistoryScore() {
    const accountsWithHistory = this.accounts.filter(account => 
      account.PayStatusHistory && account.PayStatusHistory.length > 0
    );

    if (accountsWithHistory.length === 0) return 100;

    let totalPayments = 0;
    let onTimePayments = 0;

    accountsWithHistory.forEach(account => {
      const history = account.PayStatusHistory;
      totalPayments += history.length;
      
      // Count 'C' (Current) as on-time payments
      onTimePayments += (history.match(/C/g) || []).length;
    });

    if (totalPayments === 0) return 100;
    return Math.round((onTimePayments / totalPayments) * 100);
  }

  /**
   * Separate personal vs business accounts
   */
  separateAccountTypes() {
    const personal = [];
    const business = [];

    this.accounts.forEach(account => {
      // Business indicators
      const creditorName = account.CreditorName?.toLowerCase() || '';
      const accountType = account.AccountType?.toLowerCase() || '';
      const industry = account.Industry?.toLowerCase() || '';
      
      const isBusinessAccount = 
        creditorName.includes('business') ||
        creditorName.includes('commercial') ||
        creditorName.includes('corp') ||
        industry.includes('business') ||
        industry.includes('commercial') ||
        accountType.includes('business');

      if (isBusinessAccount) {
        business.push(account);
      } else {
        personal.push(account);
      }
    });

    return { personal, business };
  }

  /**
   * Get comprehensive credit signals summary
   */
  getAllSignals() {
    const inquiries = this.getRecentInquiriesByBureau();
    const accountTypes = this.separateAccountTypes();
    
    return {
      totalAvailableCredit: this.getTotalAvailableCredit(),
      totalCreditLimits: this.getTotalCreditLimits(),
      totalCurrentBalances: this.getTotalCurrentBalances(),
      overallUtilization: this.getOverallUtilization(),
      averageAccountAge: this.getAverageAccountAge(),
      oldestAccountAge: this.getOldestAccountAge(),
      openAccountsCount: this.getOpenAccountsCount(),
      creditCardsCount: this.getCreditCardsCount(),
      inquiries: inquiries,
      totalInquiries: inquiries.experian + inquiries.equifax + inquiries.transunion,
      negativeItemsCount: this.getNegativeItemsCount(),
      paymentHistoryScore: this.getPaymentHistoryScore(),
      accountSeparation: {
        personal: {
          count: accountTypes.personal.length,
          accounts: accountTypes.personal
        },
        business: {
          count: accountTypes.business.length,
          accounts: accountTypes.business
        }
      }
    };
  }
}

export default CreditSignalsExtractor;