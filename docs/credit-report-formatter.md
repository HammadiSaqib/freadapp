# Credit Report Formatter Utility

## Overview

The Credit Report Formatter utility provides a set of functions to properly format and display credit report data in the application. It ensures consistent handling of missing, null, or invalid values by displaying them as "N/A" instead of showing empty fields or causing errors.

## Location

- TypeScript version: `client/utils/creditReportFormatter.ts`
- JavaScript version: `client/utils/creditReportFormatter.js`

## Functions

### Basic Formatters

#### `formatCreditScore(score)`

Formats a credit score value for display.

- **Parameters**: `score` - The credit score value (number or string)
- **Returns**: Formatted string representation of the score, or "N/A" if the value is null, undefined, empty, or not a valid number
- **Example**: 
  ```js
  formatCreditScore(650) // Returns "650"
  formatCreditScore(null) // Returns "N/A"
  ```

#### `formatAccountCount(count)`

Formats an account count value for display.

- **Parameters**: `count` - The account count value (number or string)
- **Returns**: Formatted string representation of the count, or "N/A" if the value is null, undefined, empty, or not a valid number
- **Example**: 
  ```js
  formatAccountCount(5) // Returns "5"
  formatAccountCount(undefined) // Returns "N/A"
  ```

#### `formatCurrency(amount)`

Formats a currency amount for display.

- **Parameters**: `amount` - The currency amount (number or string)
- **Returns**: Formatted string with dollar sign and commas, or "N/A" if the value is null, undefined, empty, or not a valid number
- **Example**: 
  ```js
  formatCurrency(1000) // Returns "$1,000"
  formatCurrency('') // Returns "N/A"
  ```

### Advanced Formatters

#### `extractCreditScores(reportData)`

Extracts and formats credit scores from raw report data.

- **Parameters**: `reportData` - The raw credit report data object
- **Returns**: Object containing formatted scores for each bureau
  ```js
  {
    equifax: string,
    transunion: string,
    experian: string
  }
  ```

#### `extractAccountSummary(reportData)`

Extracts and formats account summary information from raw report data.

- **Parameters**: `reportData` - The raw credit report data object
- **Returns**: Object containing account summary for each bureau
  ```js
  {
    equifax: { 
      totalAccounts: string, 
      openAccounts: string, 
      closedAccounts: string, 
      balances: string 
    },
    transunion: { ... },
    experian: { ... }
  }
  ```

#### `processCreditReportData(reportData)`

Processes raw credit report data into a format ready for display.

- **Parameters**: `reportData` - The raw credit report data object
- **Returns**: Processed data object with formatted values for each bureau

## Usage in Components

### Import

```tsx
import { formatCreditScore, formatAccountCount } from "@/utils/creditReportFormatter";
```

### Example: Formatting API Response Data

```tsx
const transformedReports = (response.data?.data || []).map((report: any) => ({
  id: report.id,
  clientName: report.clientName,
  bureau: report.bureau,
  score: formatCreditScore(report.score),
  accounts: formatAccountCount(report.accounts),
  inquiries: formatAccountCount(report.inquiries),
}));
```

### Example: Handling N/A Values in UI

```tsx
<div className={`font-bold ${report.score === 'N/A' ? 'text-gray-500' : 'gradient-text-primary'}`}>
  {report.score}
</div>
```

## Testing

A verification script is available at `verify-formatter.mjs` that tests all formatter functions with various input types to ensure they handle edge cases correctly.

Run the verification script with:

```
node verify-formatter.mjs
```