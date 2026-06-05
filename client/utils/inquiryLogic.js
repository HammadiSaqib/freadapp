/**
 * Inquiry Logic Calculator
 * Determines safe card application limits based on bureau inquiry counts and credit profile
 */

export class InquiryLogicCalculator {
  constructor(creditSignals) {
    this.signals = creditSignals;
    this.inquiries = creditSignals.inquiries;
    this.totalInquiries = creditSignals.totalInquiries;
  }

  /**
   * Calculate maximum safe cards to apply for based on inquiry limits
   */
  calculateSafeCardApplications() {
    const maxInquiriesPerBureau = 4; // Conservative limit
    const maxTotalInquiries = 10; // Total across all bureaus
    
    // Calculate remaining inquiry capacity per bureau
    const remainingCapacity = {
      experian: Math.max(0, maxInquiriesPerBureau - this.inquiries.experian),
      equifax: Math.max(0, maxInquiriesPerBureau - this.inquiries.equifax),
      transunion: Math.max(0, maxInquiriesPerBureau - this.inquiries.transunion)
    };

    // Total remaining capacity
    const totalRemainingCapacity = remainingCapacity.experian + 
                                  remainingCapacity.equifax + 
                                  remainingCapacity.transunion;

    // Apply conservative multiplier based on credit profile
    const profileMultiplier = this.getProfileMultiplier();
    
    return {
      maxCards: Math.floor(Math.min(totalRemainingCapacity, maxTotalInquiries - this.totalInquiries) * profileMultiplier),
      remainingCapacity,
      totalRemainingCapacity,
      profileMultiplier,
      recommendations: this.generateRecommendations(remainingCapacity)
    };
  }

  /**
   * Get profile multiplier based on credit health
   */
  getProfileMultiplier() {
    let multiplier = 1.0;

    // Utilization factor
    if (this.signals.overallUtilization <= 10) {
      multiplier += 0.3;
    } else if (this.signals.overallUtilization <= 30) {
      multiplier += 0.1;
    } else if (this.signals.overallUtilization > 50) {
      multiplier -= 0.3;
    }

    // Account age factor
    if (this.signals.averageAccountAge >= 24) { // 2+ years
      multiplier += 0.2;
    } else if (this.signals.averageAccountAge < 12) { // Less than 1 year
      multiplier -= 0.2;
    }

    // Payment history factor
    if (this.signals.paymentHistoryScore >= 95) {
      multiplier += 0.2;
    } else if (this.signals.paymentHistoryScore < 80) {
      multiplier -= 0.3;
    }

    // Negative items factor
    if (this.signals.negativeItemsCount > 0) {
      multiplier -= (this.signals.negativeItemsCount * 0.1);
    }

    // Ensure multiplier stays within reasonable bounds
    return Math.max(0.1, Math.min(1.5, multiplier));
  }

  /**
   * Generate application strategy recommendations
   */
  generateRecommendations(remainingCapacity) {
    const recommendations = [];

    // Bureau-specific recommendations
    Object.entries(remainingCapacity).forEach(([bureau, capacity]) => {
      if (capacity > 0) {
        recommendations.push({
          type: 'bureau_strategy',
          bureau: bureau.charAt(0).toUpperCase() + bureau.slice(1),
          message: `${capacity} applications available for ${bureau.charAt(0).toUpperCase() + bureau.slice(1)}`
        });
      } else {
        recommendations.push({
          type: 'bureau_warning',
          bureau: bureau.charAt(0).toUpperCase() + bureau.slice(1),
          message: `${bureau.charAt(0).toUpperCase() + bureau.slice(1)} at inquiry limit - wait 24 months`
        });
      }
    });

    // Overall strategy recommendations
    if (this.totalInquiries >= 8) {
      recommendations.push({
        type: 'strategy',
        message: 'High inquiry count detected. Consider waiting 6-12 months before new applications.'
      });
    }

    if (this.signals.overallUtilization > 30) {
      recommendations.push({
        type: 'strategy',
        message: 'Reduce utilization below 30% before applying for new credit.'
      });
    }

    if (this.signals.averageAccountAge < 12) {
      recommendations.push({
        type: 'strategy',
        message: 'Build account age history before aggressive credit applications.'
      });
    }

    return recommendations;
  }

  /**
   * Calculate estimated credit limits per card based on profile
   */
  calculateEstimatedLimitsPerCard() {
    const baseLimit = 5000; // Conservative base
    let multiplier = 1.0;

    // Credit utilization impact
    if (this.signals.overallUtilization <= 10) {
      multiplier += 0.5;
    } else if (this.signals.overallUtilization <= 30) {
      multiplier += 0.2;
    }

    // Account age impact
    if (this.signals.averageAccountAge >= 36) { // 3+ years
      multiplier += 0.4;
    } else if (this.signals.averageAccountAge >= 24) { // 2+ years
      multiplier += 0.2;
    }

    // Payment history impact
    if (this.signals.paymentHistoryScore >= 95) {
      multiplier += 0.3;
    } else if (this.signals.paymentHistoryScore >= 85) {
      multiplier += 0.1;
    }

    // Existing credit limits impact
    const avgExistingLimit = this.signals.totalCreditLimits / Math.max(1, this.signals.creditCardsCount);
    if (avgExistingLimit > 10000) {
      multiplier += 0.3;
    } else if (avgExistingLimit > 5000) {
      multiplier += 0.1;
    }

    const estimatedLimit = Math.round(baseLimit * multiplier);

    return {
      personal: {
        min: Math.round(estimatedLimit * 0.7),
        max: Math.round(estimatedLimit * 1.3),
        average: estimatedLimit
      },
      business: {
        min: Math.round(estimatedLimit * 1.2),
        max: Math.round(estimatedLimit * 2.0),
        average: Math.round(estimatedLimit * 1.5)
      }
    };
  }

  /**
   * Generate bureau-specific application strategy
   */
  getBureauStrategy() {
    const strategy = {
      experian: {
        available: Math.max(0, 4 - this.inquiries.experian),
        priority: 'medium',
        timing: 'immediate'
      },
      equifax: {
        available: Math.max(0, 4 - this.inquiries.equifax),
        priority: 'medium', 
        timing: 'immediate'
      },
      transunion: {
        available: Math.max(0, 4 - this.inquiries.transunion),
        priority: 'medium',
        timing: 'immediate'
      }
    };

    // Determine priority based on inquiry counts
    const inquiryCounts = [
      { bureau: 'experian', count: this.inquiries.experian },
      { bureau: 'equifax', count: this.inquiries.equifax },
      { bureau: 'transunion', count: this.inquiries.transunion }
    ].sort((a, b) => a.count - b.count);

    // Assign priorities
    strategy[inquiryCounts[0].bureau].priority = 'high';
    strategy[inquiryCounts[2].bureau].priority = 'low';

    // Adjust timing based on inquiry levels
    Object.keys(strategy).forEach(bureau => {
      if (this.inquiries[bureau] >= 4) {
        strategy[bureau].timing = 'wait_24_months';
      } else if (this.inquiries[bureau] >= 3) {
        strategy[bureau].timing = 'wait_6_months';
      }
    });

    return strategy;
  }

  /**
   * Get comprehensive inquiry analysis
   */
  getInquiryAnalysis() {
    const safeApplications = this.calculateSafeCardApplications();
    const estimatedLimits = this.calculateEstimatedLimitsPerCard();
    const bureauStrategy = this.getBureauStrategy();

    return {
      safeApplications,
      estimatedLimits,
      bureauStrategy,
      currentInquiries: this.inquiries,
      totalInquiries: this.totalInquiries,
      riskLevel: this.assessRiskLevel(),
      waitPeriodRecommendation: this.getWaitPeriodRecommendation()
    };
  }

  /**
   * Assess overall risk level for new applications
   */
  assessRiskLevel() {
    if (this.totalInquiries >= 10) return 'high';
    if (this.totalInquiries >= 6) return 'medium';
    if (this.signals.overallUtilization > 50) return 'high';
    if (this.signals.negativeItemsCount > 2) return 'high';
    if (this.signals.paymentHistoryScore < 80) return 'medium';
    return 'low';
  }

  /**
   * Get recommended wait period before next applications
   */
  getWaitPeriodRecommendation() {
    if (this.totalInquiries >= 8) return 12; // months
    if (this.totalInquiries >= 6) return 6;
    if (this.signals.overallUtilization > 40) return 3;
    return 0; // No wait needed
  }
}

export default InquiryLogicCalculator;