/**
 * Funding Projections Calculator
 * Calculates separate personal and business funding projections based on credit data
 */

import CreditSignalsExtractor from './creditSignals.js';
import InquiryLogicCalculator from './inquiryLogic.js';

export class FundingProjectionsCalculator {
  constructor(creditReportData) {
    this.signalsExtractor = new CreditSignalsExtractor(creditReportData);
    this.signals = this.signalsExtractor.getAllSignals();
    this.inquiryCalculator = new InquiryLogicCalculator(this.signals);
    this.inquiryAnalysis = this.inquiryCalculator.getInquiryAnalysis();
  }

  /**
   * Calculate personal funding projection
   */
  calculatePersonalFunding() {
    const personalAccounts = this.signals.accountSeparation.personal.accounts;
    const personalSignals = this.extractAccountTypeSignals(personalAccounts);
    
    // Calculate personal-specific metrics
    const personalUtilization = this.calculateUtilizationForAccounts(personalAccounts);
    const personalAvailableCredit = this.calculateAvailableCreditForAccounts(personalAccounts);
    const personalCreditAge = this.calculateAverageAgeForAccounts(personalAccounts);
    
    // Determine max cards based on inquiry analysis and personal profile
    const maxCards = this.calculateMaxCardsPersonal(personalSignals, personalUtilization);
    
    // Calculate estimated funding per card
    const avgLimitPerCard = this.inquiryAnalysis.estimatedLimits.personal.average;
    const estimatedFunding = maxCards * avgLimitPerCard;
    
    // Generate bureau logic explanation
    const bureauLogic = this.generatePersonalBureauLogic();
    
    return {
      estimatedFunding,
      maxCards,
      bureauLogic,
      details: {
        currentUtilization: personalUtilization,
        availableCredit: personalAvailableCredit,
        averageAccountAge: personalCreditAge,
        avgLimitPerCard,
        accountsCount: personalAccounts.length,
        inquiriesImpact: this.assessInquiriesImpact('personal'),
        riskFactors: this.identifyPersonalRiskFactors(personalSignals),
        recommendations: this.generatePersonalRecommendations(personalSignals)
      }
    };
  }

  /**
   * Calculate business funding projection
   */
  calculateBusinessFunding() {
    const businessAccounts = this.signals.accountSeparation.business.accounts;
    const businessSignals = this.extractAccountTypeSignals(businessAccounts);
    
    // Calculate business-specific metrics
    const businessUtilization = this.calculateUtilizationForAccounts(businessAccounts);
    const businessAvailableCredit = this.calculateAvailableCreditForAccounts(businessAccounts);
    const businessCreditAge = this.calculateAverageAgeForAccounts(businessAccounts);
    
    // Determine max cards based on inquiry analysis and business profile
    const maxCards = this.calculateMaxCardsBusiness(businessSignals, businessUtilization);
    
    // Calculate estimated funding per card (typically higher for business)
    const avgLimitPerCard = this.inquiryAnalysis.estimatedLimits.business.average;
    const estimatedFunding = maxCards * avgLimitPerCard;
    
    // Generate bureau logic explanation
    const bureauLogic = this.generateBusinessBureauLogic();
    
    return {
      estimatedFunding,
      maxCards,
      bureauLogic,
      details: {
        currentUtilization: businessUtilization,
        availableCredit: businessAvailableCredit,
        averageAccountAge: businessCreditAge,
        avgLimitPerCard,
        accountsCount: businessAccounts.length,
        inquiriesImpact: this.assessInquiriesImpact('business'),
        riskFactors: this.identifyBusinessRiskFactors(businessSignals),
        recommendations: this.generateBusinessRecommendations(businessSignals),
        einStatus: this.assessEINStatus()
      }
    };
  }

  /**
   * Extract signals for specific account type
   */
  extractAccountTypeSignals(accounts) {
    if (!accounts || accounts.length === 0) {
      return {
        totalLimits: 0,
        totalBalances: 0,
        utilization: 0,
        accountCount: 0,
        averageAge: 0
      };
    }

    const totalLimits = accounts.reduce((sum, acc) => sum + parseFloat(acc.CreditLimit || 0), 0);
    const totalBalances = accounts.reduce((sum, acc) => sum + parseFloat(acc.CurrentBalance || 0), 0);
    const utilization = totalLimits > 0 ? Math.round((totalBalances / totalLimits) * 100) : 0;
    
    return {
      totalLimits,
      totalBalances,
      utilization,
      accountCount: accounts.length,
      averageAge: this.calculateAverageAgeForAccounts(accounts)
    };
  }

  /**
   * Calculate utilization for specific accounts
   */
  calculateUtilizationForAccounts(accounts) {
    if (!accounts || accounts.length === 0) return 0;
    
    const totalLimits = accounts.reduce((sum, acc) => sum + parseFloat(acc.CreditLimit || 0), 0);
    const totalBalances = accounts.reduce((sum, acc) => sum + parseFloat(acc.CurrentBalance || 0), 0);
    
    return totalLimits > 0 ? Math.round((totalBalances / totalLimits) * 100) : 0;
  }

  /**
   * Calculate available credit for specific accounts
   */
  calculateAvailableCreditForAccounts(accounts) {
    if (!accounts || accounts.length === 0) return 0;
    
    return accounts.reduce((sum, acc) => {
      const limit = parseFloat(acc.CreditLimit || 0);
      const balance = parseFloat(acc.CurrentBalance || 0);
      return sum + Math.max(0, limit - balance);
    }, 0);
  }

  /**
   * Calculate average age for specific accounts
   */
  calculateAverageAgeForAccounts(accounts) {
    if (!accounts || accounts.length === 0) return 0;
    
    const currentDate = new Date();
    const totalMonths = accounts.reduce((sum, acc) => {
      if (!acc.DateOpened) return sum;
      const openDate = new Date(acc.DateOpened);
      const monthsDiff = (currentDate.getFullYear() - openDate.getFullYear()) * 12 + 
                        (currentDate.getMonth() - openDate.getMonth());
      return sum + Math.max(monthsDiff, 0);
    }, 0);
    
    return Math.round(totalMonths / accounts.length);
  }

  /**
   * Calculate maximum cards for personal funding
   */
  calculateMaxCardsPersonal(personalSignals, utilization) {
    let baseCards = this.inquiryAnalysis.safeApplications.maxCards;
    
    // Adjust based on personal-specific factors
    if (utilization <= 10) {
      baseCards = Math.round(baseCards * 1.2);
    } else if (utilization > 30) {
      baseCards = Math.round(baseCards * 0.8);
    }
    
    // Account age factor
    if (personalSignals.averageAge >= 24) {
      baseCards = Math.round(baseCards * 1.1);
    } else if (personalSignals.averageAge < 12) {
      baseCards = Math.round(baseCards * 0.9);
    }
    
    // Ensure minimum and maximum bounds
    return Math.max(3, Math.min(15, baseCards));
  }

  /**
   * Calculate maximum cards for business funding
   */
  calculateMaxCardsBusiness(businessSignals, utilization) {
    let baseCards = this.inquiryAnalysis.safeApplications.maxCards;
    
    // Business cards typically have higher approval rates
    baseCards = Math.round(baseCards * 1.3);
    
    // Adjust based on business-specific factors
    if (utilization <= 15) {
      baseCards = Math.round(baseCards * 1.2);
    } else if (utilization > 40) {
      baseCards = Math.round(baseCards * 0.7);
    }
    
    // EIN status bonus
    if (this.assessEINStatus() === 'verified') {
      baseCards = Math.round(baseCards * 1.1);
    }
    
    // Ensure minimum and maximum bounds
    return Math.max(4, Math.min(20, baseCards));
  }

  /**
   * Generate personal bureau logic explanation
   */
  generatePersonalBureauLogic() {
    const inquiries = this.signals.inquiries;
    const maxInquiries = Math.max(inquiries.experian, inquiries.equifax, inquiries.transunion);
    const avgLimit = this.inquiryAnalysis.estimatedLimits.personal.average;
    
    let logic = `Inquiries ≤ 4 per bureau (current max: ${maxInquiries}); `;
    logic += `estimated limit per card $${(avgLimit / 1000).toFixed(0)}K–$${((avgLimit * 1.3) / 1000).toFixed(0)}K`;
    
    if (this.signals.overallUtilization <= 10) {
      logic += '; low utilization bonus applied';
    }
    
    return logic;
  }

  /**
   * Generate business bureau logic explanation
   */
  generateBusinessBureauLogic() {
    const inquiries = this.signals.inquiries;
    const maxInquiries = Math.max(inquiries.experian, inquiries.equifax, inquiries.transunion);
    const avgLimit = this.inquiryAnalysis.estimatedLimits.business.average;
    const einStatus = this.assessEINStatus();
    
    let logic = `${einStatus === 'verified' ? 'EIN verified' : 'EIN status unknown'}; `;
    logic += `inquiries ≤ 4 per bureau (current max: ${maxInquiries}); `;
    logic += `estimated limit per card $${(avgLimit / 1000).toFixed(0)}K–$${((avgLimit * 1.3) / 1000).toFixed(0)}K`;
    
    return logic;
  }

  /**
   * Assess EIN status (mock implementation - would need real business data)
   */
  assessEINStatus() {
    // In a real implementation, this would check business registration data
    // For now, we'll assume verified if there are business accounts
    return this.signals.accountSeparation.business.count > 0 ? 'verified' : 'unknown';
  }

  /**
   * Assess inquiries impact on funding type
   */
  assessInquiriesImpact(fundingType) {
    const riskLevel = this.inquiryAnalysis.riskLevel;
    const totalInquiries = this.signals.totalInquiries;
    
    return {
      riskLevel,
      totalInquiries,
      impact: riskLevel === 'high' ? 'significant_reduction' : 
              riskLevel === 'medium' ? 'moderate_reduction' : 'minimal_impact',
      recommendation: this.inquiryAnalysis.waitPeriodRecommendation > 0 ? 
                     `Wait ${this.inquiryAnalysis.waitPeriodRecommendation} months` : 
                     'Proceed with applications'
    };
  }

  /**
   * Identify personal risk factors
   */
  identifyPersonalRiskFactors(personalSignals) {
    const risks = [];
    
    if (personalSignals.utilization > 30) {
      risks.push('High utilization ratio');
    }
    
    if (personalSignals.averageAge < 12) {
      risks.push('Limited credit history');
    }
    
    if (this.signals.negativeItemsCount > 0) {
      risks.push(`${this.signals.negativeItemsCount} negative items on report`);
    }
    
    if (this.signals.totalInquiries > 6) {
      risks.push('High inquiry count');
    }
    
    return risks;
  }

  /**
   * Identify business risk factors
   */
  identifyBusinessRiskFactors(businessSignals) {
    const risks = [];
    
    if (businessSignals.utilization > 40) {
      risks.push('High business utilization');
    }
    
    if (businessSignals.accountCount === 0) {
      risks.push('No established business credit');
    }
    
    if (this.assessEINStatus() === 'unknown') {
      risks.push('EIN status not verified');
    }
    
    return risks;
  }

  /**
   * Generate personal recommendations
   */
  generatePersonalRecommendations(personalSignals) {
    const recommendations = [];
    
    if (personalSignals.utilization > 30) {
      recommendations.push('Reduce utilization below 30% before applying');
    }
    
    if (personalSignals.averageAge < 24) {
      recommendations.push('Build credit history with existing accounts');
    }
    
    if (this.signals.totalInquiries > 4) {
      recommendations.push('Space out applications over 6-12 months');
    }
    
    return recommendations;
  }

  /**
   * Generate business recommendations
   */
  generateBusinessRecommendations(businessSignals) {
    const recommendations = [];
    
    if (businessSignals.accountCount === 0) {
      recommendations.push('Establish business credit with secured cards first');
    }
    
    if (businessSignals.utilization > 40) {
      recommendations.push('Reduce business utilization before expansion');
    }
    
    if (this.assessEINStatus() === 'unknown') {
      recommendations.push('Verify EIN and business registration');
    }
    
    return recommendations;
  }

  /**
   * Get comprehensive funding projections
   */
  getAllProjections() {
    const personal = this.calculatePersonalFunding();
    const business = this.calculateBusinessFunding();
    
    return {
      personal,
      business,
      combined: {
        totalEstimatedFunding: personal.estimatedFunding + business.estimatedFunding,
        totalMaxCards: personal.maxCards + business.maxCards,
        overallRiskLevel: this.inquiryAnalysis.riskLevel,
        recommendedStrategy: this.generateOverallStrategy(personal, business)
      },
      metadata: {
        calculatedAt: new Date().toISOString(),
        dataSource: 'credit_report_analysis',
        signalsUsed: Object.keys(this.signals)
      }
    };
  }

  /**
   * Generate overall funding strategy
   */
  generateOverallStrategy(personal, business) {
    const strategies = [];
    
    if (personal.estimatedFunding > business.estimatedFunding) {
      strategies.push('Focus on personal credit expansion first');
    } else {
      strategies.push('Prioritize business credit development');
    }
    
    if (this.inquiryAnalysis.riskLevel === 'high') {
      strategies.push('Implement 6-12 month waiting period');
    } else {
      strategies.push('Proceed with staggered applications');
    }
    
    return strategies;
  }
}

export default FundingProjectionsCalculator;