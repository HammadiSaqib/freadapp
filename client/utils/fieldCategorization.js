// Field categorization for Account Details by Bureau tabs
// C = Credit Repair, F = Funding, C,F = Both

export const fieldCategories = {
  // Credit Repair fields (C)
  creditRepair: [
    'creditorName',                // CreditorName
    'creditType',                  // CreditType
    'accountTypeDescription',      // AccountTypeDescription
    'limit',                       // CreditLimit
    'balance',                     // CurrentBalance
    'designator',                  // AccountDesignator
    'opened',                      // DateOpened
    'reported',                    // DateReported
    'dateAccountStatus',           // DateAccountStatus
    'accountNumber',               // AccountNumber
    'status',                      // AccountStatus
    'paymentHistory',              // PaymentStatus
    'pastDue',                     // AmountPastDue
    'worstStatus',                 // WorstPayStatus
    'payStatusHistoryStartDate',   // PayStatusHistoryStartDate
    'payStatusHistory',            // PayStatusHistory
    'accountCondition',            // AccountCondition
    'disputeFlag',                 // DisputeFlag
    'industry',                    // Industry
    'accountType',                 // AccountType
    'paymentFrequency',            // PaymentFrequency
    'highBalance',                 // HighBalance
    'remark'                       // Remark
  ],
  
  // Funding fields (F)
  funding: [
    'creditorName',                // CreditorName
    'creditType',                  // CreditType
    'opened',                      // DateOpened
    'reported',                    // DateReported
    'dateAccountStatus',           // DateAccountStatus
    'accountNumber',               // AccountNumber
    'status',                      // AccountStatus
    'paymentHistory',              // PaymentStatus
    'pastDue',                     // AmountPastDue
    'worstStatus',                 // WorstPayStatus
    'payStatusHistoryStartDate',   // PayStatusHistoryStartDate
    'payStatusHistory',            // PayStatusHistory
    'designator',                  // AccountDesignator
    'limit',                       // CreditLimit
    'balance'                      // CurrentBalance
  ],
  
  // Fields that appear in both (C,F)
  both: [
    'creditorName',                // CreditorName (appears in both)
    'creditType',                  // CreditType (appears in both)
    'opened',                      // DateOpened (appears in both)
    'reported',                    // DateReported (appears in both)
    'dateAccountStatus',           // DateAccountStatus (appears in both)
    'accountNumber',               // AccountNumber (appears in both)
    'status',                      // AccountStatus (appears in both)
    'paymentHistory',              // PaymentStatus (appears in both)
    'pastDue',                     // AmountPastDue (appears in both)
    'worstStatus',                 // WorstPayStatus (appears in both)
    'payStatusHistoryStartDate',   // PayStatusHistoryStartDate (appears in both)
    'payStatusHistory'             // PayStatusHistory (appears in both)
  ]
};

// Helper function to determine if a field should be shown in a specific tab
export const shouldShowField = (fieldName, activeTab) => {
  switch (activeTab) {
    case 'credit-repair':
      return fieldCategories.creditRepair.includes(fieldName);
    case 'funding':
      return fieldCategories.funding.includes(fieldName);
    case 'all':
      return true; // Show all fields in the "All" tab
    default:
      return true;
  }
};

// Tab configuration
export const tabConfig = [
  { id: 'credit-repair', label: 'Credit Repair', color: 'blue' },
  { id: 'funding', label: 'Funding', color: 'green' },
  { id: 'all', label: 'All', color: 'purple' }
];