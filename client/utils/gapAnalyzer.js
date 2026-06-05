/**
 * Gap Analyzer
 * Compares funding projections with industry benchmarks and external standards
 */

export class GapAnalyzer {
  constructor() {
    // Industry benchmarks based on credit score ranges
    this.benchmarks = {
      creditScoreRanges: {
        excellent: { min: 750, max: 850 },
        good: { min: 670, max: 749 },
        fair: { min: 580, max: 669 },
        poor: { min: 300, max: 579 }
      },
      
      // Average funding amounts by credit tier (in USD)
      industryAverages: {
        personal: {
          excellent: { avgFunding: 85000, avgCards: 12, avgLimit: 7500 },
          good: { avgFunding: 45000, avgCards: 8, avgLimit: 5625 },
          fair: { avgFunding: 18000, avgCards: 5, avgLimit: 3600 },
          poor: { avgFunding: 5000, avgCards: 2, avgLimit: 2500 }
        },
        business: {
          excellent: { avgFunding: 150000, avgCards: 15, avgLimit: 10000 },
          good: { avgFunding: 75000, avgCards: 10, avgLimit: 7500 },
          fair: { avgFunding: 30000, avgCards: 6, avgLimit: 5000 },
          poor: { avgFunding: 10000, avgCards: 3, avgLimit: 3333 }
        }
      },
      
      // Optimal utilization benchmarks
      utilizationBenchmarks: {
        excellent: { max: 10, optimal: 5 },
        good: { max: 20, optimal: 10 },
        fair: { max: 30, optimal: 15 },
        poor: { max: 40, optimal: 20 }
      },
      
      // Credit age benchmarks (in months)
      ageBenchmarks: {
        excellent: { min: 84, optimal: 120 }, // 7+ years
        good: { min: 48, optimal: 84 },       // 4+ years
        fair: { min: 24, optimal: 48 },       // 2+ years
        poor: { min: 12, optimal: 24 }        // 1+ year
      }
    };
  }

  /**
   * Determine credit tier based on credit score
   */
  getCreditTier(creditScore) {
    if (creditScore >= 750) return 'excellent';
    if (creditScore >= 670) return 'good';
    if (creditScore >= 580) return 'fair';
    return 'poor';
  }

  /**
   * Analyze gaps in personal funding projection
   */
  analyzePersonalGaps(personalProjection, creditScore) {
    const tier = this.getCreditTier(creditScore);
    const benchmark = this.benchmarks.industryAverages.personal[tier];
    
    const gaps = {
      fundingGap: {
        projected: personalProjection.estimatedFunding,
        benchmark: benchmark.avgFunding,
        difference: personalProjection.estimatedFunding - benchmark.avgFunding,
        percentageDiff: ((personalProjection.estimatedFunding - benchmark.avgFunding) / benchmark.avgFunding * 100).toFixed(1)
      },
      
      cardsGap: {
        projected: personalProjection.maxCards,
        benchmark: benchmark.avgCards,
        difference: personalProjection.maxCards - benchmark.avgCards,
        percentageDiff: ((personalProjection.maxCards - benchmark.avgCards) / benchmark.avgCards * 100).toFixed(1)
      },
      
      avgLimitGap: {
        projected: personalProjection.details.avgLimitPerCard,
        benchmark: benchmark.avgLimit,
        difference: personalProjection.details.avgLimitPerCard - benchmark.avgLimit,
        percentageDiff: ((personalProjection.details.avgLimitPerCard - benchmark.avgLimit) / benchmark.avgLimit * 100).toFixed(1)
      },
      
      utilizationAnalysis: this.analyzeUtilizationGap(personalProjection.details.currentUtilization, tier),
      ageAnalysis: this.analyzeAgeGap(personalProjection.details.averageAccountAge, tier),
      
      tier,
      overallAssessment: this.generatePersonalAssessment(personalProjection, benchmark, tier)
    };
    
    return gaps;
  }

  /**
   * Analyze gaps in business funding projection
   */
  analyzeBusinessGaps(businessProjection, creditScore) {
    const tier = this.getCreditTier(creditScore);
    const benchmark = this.benchmarks.industryAverages.business[tier];
    
    const gaps = {
      fundingGap: {
        projected: businessProjection.estimatedFunding,
        benchmark: benchmark.avgFunding,
        difference: businessProjection.estimatedFunding - benchmark.avgFunding,
        percentageDiff: ((businessProjection.estimatedFunding - benchmark.avgFunding) / benchmark.avgFunding * 100).toFixed(1)
      },
      
      cardsGap: {
        projected: businessProjection.maxCards,
        benchmark: benchmark.avgCards,
        difference: businessProjection.maxCards - benchmark.avgCards,
        percentageDiff: ((businessProjection.maxCards - benchmark.avgCards) / benchmark.avgCards * 100).toFixed(1)
      },
      
      avgLimitGap: {
        projected: businessProjection.details.avgLimitPerCard,
        benchmark: benchmark.avgLimit,
        difference: businessProjection.details.avgLimitPerCard - benchmark.avgLimit,
        percentageDiff: ((businessProjection.details.avgLimitPerCard - benchmark.avgLimit) / benchmark.avgLimit * 100).toFixed(1)
      },
      
      utilizationAnalysis: this.analyzeUtilizationGap(businessProjection.details.currentUtilization, tier),
      ageAnalysis: this.analyzeAgeGap(businessProjection.details.averageAccountAge, tier),
      einAnalysis: this.analyzeEINStatus(businessProjection.details.einStatus),
      
      tier,
      overallAssessment: this.generateBusinessAssessment(businessProjection, benchmark, tier)
    };
    
    return gaps;
  }

  /**
   * Analyze utilization gap against benchmarks
   */
  analyzeUtilizationGap(currentUtilization, tier) {
    const benchmark = this.benchmarks.utilizationBenchmarks[tier];
    
    return {
      current: currentUtilization,
      optimal: benchmark.optimal,
      maximum: benchmark.max,
      status: currentUtilization <= benchmark.optimal ? 'optimal' :
              currentUtilization <= benchmark.max ? 'acceptable' : 'needs_improvement',
      improvement: currentUtilization > benchmark.optimal ? 
                  currentUtilization - benchmark.optimal : 0,
      recommendation: this.getUtilizationRecommendation(currentUtilization, benchmark)
    };
  }

  /**
   * Analyze credit age gap against benchmarks
   */
  analyzeAgeGap(currentAge, tier) {
    const benchmark = this.benchmarks.ageBenchmarks[tier];
    
    return {
      current: currentAge,
      minimum: benchmark.min,
      optimal: benchmark.optimal,
      status: currentAge >= benchmark.optimal ? 'optimal' :
              currentAge >= benchmark.min ? 'acceptable' : 'needs_improvement',
      monthsToOptimal: Math.max(0, benchmark.optimal - currentAge),
      recommendation: this.getAgeRecommendation(currentAge, benchmark)
    };
  }

  /**
   * Analyze EIN status for business accounts
   */
  analyzeEINStatus(einStatus) {
    return {
      status: einStatus,
      verified: einStatus === 'verified',
      impact: einStatus === 'verified' ? 'positive' : 'limiting',
      recommendation: einStatus === 'verified' ? 
                     'EIN verified - good for business applications' :
                     'Verify EIN to improve business credit opportunities'
    };
  }

  /**
   * Generate utilization recommendation
   */
  getUtilizationRecommendation(current, benchmark) {
    if (current <= benchmark.optimal) {
      return 'Utilization is optimal - maintain current levels';
    } else if (current <= benchmark.max) {
      return `Consider reducing utilization to ${benchmark.optimal}% for optimal results`;
    } else {
      return `Priority: Reduce utilization below ${benchmark.max}% (currently ${current}%)`;
    }
  }

  /**
   * Generate age recommendation
   */
  getAgeRecommendation(current, benchmark) {
    if (current >= benchmark.optimal) {
      return 'Credit age is optimal for your tier';
    } else if (current >= benchmark.min) {
      return `Good credit age - will improve over ${Math.ceil((benchmark.optimal - current) / 12)} more years`;
    } else {
      return `Build credit history - need ${Math.ceil((benchmark.min - current) / 12)} more years for tier minimum`;
    }
  }

  /**
   * Generate personal assessment
   */
  generatePersonalAssessment(projection, benchmark, tier) {
    const assessments = [];
    
    // Funding assessment
    if (projection.estimatedFunding >= benchmark.avgFunding * 1.1) {
      assessments.push('Above-average funding potential for your credit tier');
    } else if (projection.estimatedFunding >= benchmark.avgFunding * 0.9) {
      assessments.push('On-track with industry averages for your credit tier');
    } else {
      assessments.push('Below-average funding potential - room for improvement');
    }
    
    // Risk factors assessment
    if (projection.details.riskFactors.length === 0) {
      assessments.push('Low risk profile - good approval odds');
    } else {
      assessments.push(`${projection.details.riskFactors.length} risk factors identified`);
    }
    
    // Utilization assessment
    if (projection.details.currentUtilization <= 10) {
      assessments.push('Excellent utilization management');
    } else if (projection.details.currentUtilization <= 30) {
      assessments.push('Good utilization levels');
    } else {
      assessments.push('High utilization may limit approvals');
    }
    
    return assessments;
  }

  /**
   * Generate business assessment
   */
  generateBusinessAssessment(projection, benchmark, tier) {
    const assessments = [];
    
    // Funding assessment
    if (projection.estimatedFunding >= benchmark.avgFunding * 1.1) {
      assessments.push('Strong business funding potential');
    } else if (projection.estimatedFunding >= benchmark.avgFunding * 0.9) {
      assessments.push('Average business funding potential for your tier');
    } else {
      assessments.push('Limited business funding - focus on building business credit');
    }
    
    // EIN assessment
    if (projection.details.einStatus === 'verified') {
      assessments.push('EIN verified - excellent for business applications');
    } else {
      assessments.push('EIN verification needed for optimal business credit');
    }
    
    // Account establishment
    if (projection.details.accountsCount === 0) {
      assessments.push('No business credit history - start with secured cards');
    } else if (projection.details.accountsCount < 3) {
      assessments.push('Limited business credit - expand gradually');
    } else {
      assessments.push('Good business credit foundation');
    }
    
    return assessments;
  }

  /**
   * Generate improvement roadmap
   */
  generateImprovementRoadmap(personalGaps, businessGaps) {
    const roadmap = {
      immediate: [],
      shortTerm: [], // 3-6 months
      longTerm: []   // 6+ months
    };
    
    // Immediate actions (0-3 months)
    if (personalGaps.utilizationAnalysis.status === 'needs_improvement') {
      roadmap.immediate.push('Reduce personal credit utilization below 30%');
    }
    if (businessGaps.utilizationAnalysis.status === 'needs_improvement') {
      roadmap.immediate.push('Reduce business credit utilization below 40%');
    }
    if (businessGaps.einAnalysis && !businessGaps.einAnalysis.verified) {
      roadmap.immediate.push('Verify EIN and business registration');
    }
    
    // Short-term actions (3-6 months)
    if (personalGaps.cardsGap.difference < 0) {
      roadmap.shortTerm.push('Apply for additional personal credit cards');
    }
    if (businessGaps.cardsGap.difference < 0 && businessGaps.einAnalysis?.verified) {
      roadmap.shortTerm.push('Apply for business credit cards');
    }
    if (personalGaps.avgLimitGap.difference < 0) {
      roadmap.shortTerm.push('Request credit limit increases on existing accounts');
    }
    
    // Long-term actions (6+ months)
    if (personalGaps.ageAnalysis.status === 'needs_improvement') {
      roadmap.longTerm.push(`Build credit age - ${personalGaps.ageAnalysis.monthsToOptimal} months to optimal`);
    }
    if (businessGaps.ageAnalysis.status === 'needs_improvement') {
      roadmap.longTerm.push(`Build business credit age - ${businessGaps.ageAnalysis.monthsToOptimal} months to optimal`);
    }
    
    return roadmap;
  }

  /**
   * Get comprehensive gap analysis
   */
  getComprehensiveAnalysis(fundingProjections, creditScore) {
    const personalGaps = this.analyzePersonalGaps(fundingProjections.personal, creditScore);
    const businessGaps = this.analyzeBusinessGaps(fundingProjections.business, creditScore);
    const roadmap = this.generateImprovementRoadmap(personalGaps, businessGaps);
    
    return {
      personal: personalGaps,
      business: businessGaps,
      combined: {
        totalFundingGap: personalGaps.fundingGap.difference + businessGaps.fundingGap.difference,
        totalCardsGap: personalGaps.cardsGap.difference + businessGaps.cardsGap.difference,
        overallTier: personalGaps.tier,
        priorityArea: this.identifyPriorityArea(personalGaps, businessGaps)
      },
      improvementRoadmap: roadmap,
      benchmarkData: {
        personalBenchmark: this.benchmarks.industryAverages.personal[personalGaps.tier],
        businessBenchmark: this.benchmarks.industryAverages.business[businessGaps.tier],
        tier: personalGaps.tier
      },
      metadata: {
        analyzedAt: new Date().toISOString(),
        creditScore,
        benchmarkVersion: '2024.1'
      }
    };
  }

  /**
   * Identify priority improvement area
   */
  identifyPriorityArea(personalGaps, businessGaps) {
    const personalDeficit = Math.abs(personalGaps.fundingGap.difference);
    const businessDeficit = Math.abs(businessGaps.fundingGap.difference);
    
    if (personalDeficit > businessDeficit * 1.5) {
      return 'personal_credit';
    } else if (businessDeficit > personalDeficit * 1.5) {
      return 'business_credit';
    } else {
      return 'balanced_approach';
    }
  }
}

export default GapAnalyzer;