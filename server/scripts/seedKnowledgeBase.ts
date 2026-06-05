import { executeQuery } from '../database/mysqlConfig.js';
import { ResultSetHeader } from 'mysql2';

// Sample knowledge base data
const sampleArticles = [
  {
    title: 'Understanding Your Credit Score',
    content: `Your credit score is a three-digit number that represents your creditworthiness. It typically ranges from 300 to 850, with higher scores indicating better credit health.

## What Affects Your Credit Score?

1. **Payment History (35%)** - Your track record of making payments on time
2. **Credit Utilization (30%)** - How much of your available credit you're using
3. **Length of Credit History (15%)** - How long you've had credit accounts
4. **Credit Mix (10%)** - The variety of credit accounts you have
5. **New Credit (10%)** - Recent credit inquiries and new accounts

## Credit Score Ranges:

- **Excellent (800-850)**: Best rates and terms
- **Very Good (740-799)**: Good rates and terms
- **Good (670-739)**: Fair rates and terms
- **Fair (580-669)**: Below average rates
- **Poor (300-579)**: Difficult to get approved

## Tips to Improve Your Score:

- Pay all bills on time
- Keep credit utilization below 30%
- Don't close old credit cards
- Monitor your credit report regularly
- Limit new credit applications`,
    category: 'Credit Basics',
    tags: ['credit score', 'credit report', 'FICO', 'credit improvement'],
    status: 'published',
    featured: true
  },
  {
    title: 'How to Dispute Credit Report Errors',
    content: `Credit report errors are more common than you might think. Studies show that up to 25% of credit reports contain errors that could negatively impact your credit score.

## Steps to Dispute Credit Report Errors:

### 1. Get Your Credit Reports
Obtain free copies of your credit reports from all three major credit bureaus:
- Experian
- Equifax
- TransUnion

Visit annualcreditreport.com for your free annual reports.

### 2. Review Carefully
Look for:
- Incorrect personal information
- Accounts that don't belong to you
- Incorrect payment history
- Wrong account balances
- Duplicate accounts
- Outdated negative information

### 3. Gather Documentation
Collect supporting documents such as:
- Bank statements
- Payment receipts
- Account statements
- Identity theft reports (if applicable)

### 4. File Your Dispute
You can dispute errors:
- **Online**: Through each credit bureau's website
- **By Mail**: Send a dispute letter with copies of supporting documents
- **By Phone**: Call the credit bureau's dispute hotline

### 5. Follow Up
Credit bureaus have 30 days to investigate your dispute. They must:
- Contact the data furnisher
- Review your evidence
- Provide you with results
- Update your credit report if the dispute is valid

## Sample Dispute Letter Template:

[Date]

[Credit Bureau Address]

Re: Request for Investigation of Credit Report Error

Dear Sir/Madam,

I am writing to dispute the following information on my credit report. The items I dispute are also encircled on the attached copy of the report I received.

This item [identify item(s) disputed by name of source, such as creditors or tax court, and identify type of item, such as credit account, judgment, etc.] is [inaccurate or incomplete] because [describe what is inaccurate or incomplete and why]. I am requesting that the item be removed [or request another specific change] to correct the information.

Enclosed are copies of [use this sentence if applicable and describe any enclosed documentation, such as payment records and court documents] supporting my position. Please reinvestigate this [these] matter[s] and [delete or correct] the disputed item[s] as soon as possible.

Sincerely,
[Your name]

Enclosures: [List what you are enclosing]`,
    category: 'Credit Repair',
    tags: ['credit dispute', 'credit report errors', 'credit bureaus', 'dispute letter'],
    status: 'published',
    featured: false
  },
  {
    title: 'Building Credit from Scratch',
    content: `If you're new to credit or have no credit history, building credit can seem challenging. Here's a step-by-step guide to establish your credit profile.

## Starting Your Credit Journey

### 1. Apply for a Secured Credit Card
A secured credit card requires a cash deposit that serves as your credit limit. Benefits:
- Easier approval for those with no credit
- Helps establish payment history
- Many convert to unsecured cards after responsible use

### 2. Consider a Credit-Builder Loan
These loans are designed specifically for building credit:
- You make payments before receiving the loan amount
- Payments are reported to credit bureaus
- Helps establish payment history

### 3. Become an Authorized User
Ask a family member or friend with good credit to add you as an authorized user:
- You benefit from their positive payment history
- Helps establish credit faster
- Ensure the primary cardholder has excellent payment habits

### 4. Use Credit Responsibly
Once you have credit:
- Make all payments on time
- Keep balances low (under 30% of credit limit)
- Don't apply for too much credit at once
- Monitor your credit regularly

## Timeline for Building Credit:

- **1-3 months**: Credit accounts appear on your report
- **3-6 months**: You may qualify for a FICO score
- **6-12 months**: Your score becomes more stable
- **12+ months**: You may qualify for better credit products

## Common Mistakes to Avoid:

- Missing payments
- Maxing out credit cards
- Closing your first credit card
- Applying for too much credit too quickly
- Not monitoring your credit report`,
    category: 'Credit Building',
    tags: ['building credit', 'secured credit card', 'credit builder loan', 'authorized user'],
    status: 'published',
    featured: true
  },
  {
    title: 'Understanding Credit Utilization',
    content: `Credit utilization is one of the most important factors affecting your credit score, accounting for 30% of your FICO score calculation.

## What is Credit Utilization?

Credit utilization is the percentage of your available credit that you're currently using. It's calculated by dividing your current credit card balances by your total credit limits.

**Formula**: (Total Credit Card Balances ÷ Total Credit Limits) × 100

## Types of Credit Utilization:

### 1. Overall Utilization
Your total balances across all credit cards divided by your total credit limits.

### 2. Per-Card Utilization
The utilization ratio on each individual credit card.

## Optimal Utilization Rates:

- **Under 10%**: Excellent for your credit score
- **10-30%**: Good, but room for improvement
- **30-50%**: May negatively impact your score
- **Over 50%**: Significantly hurts your credit score

## Tips to Lower Credit Utilization:

### 1. Pay Down Balances
- Focus on cards with highest utilization first
- Make multiple payments per month
- Pay before the statement closing date

### 2. Request Credit Limit Increases
- Contact your credit card companies
- Provide updated income information
- Don't increase spending with higher limits

### 3. Keep Old Cards Open
- Closing cards reduces available credit
- Older accounts help your credit history
- Use cards occasionally to keep them active

### 4. Spread Balances Across Cards
- Avoid maxing out individual cards
- Keep each card under 30% utilization
- Consider balance transfers if beneficial

## When Utilization is Calculated:

Most credit card companies report your balance to credit bureaus on your statement closing date, not your payment due date. This means:

- Pay down balances before the statement closes
- Consider making multiple payments per month
- Monitor when your issuer reports to bureaus

## Special Considerations:

- **0% utilization**: While low utilization is good, having some small balance (1-9%) may be slightly better than 0%
- **Business cards**: Some business cards don't report to personal credit bureaus
- **Authorized user accounts**: These count toward your utilization`,
    category: 'Credit Basics',
    tags: ['credit utilization', 'credit score factors', 'credit limits', 'credit management'],
    status: 'published',
    featured: false
  },
  {
    title: 'Debt Consolidation Options',
    content: `Debt consolidation can be an effective strategy for managing multiple debts and potentially saving money on interest. Here are the main options available.

## What is Debt Consolidation?

Debt consolidation involves combining multiple debts into a single payment, ideally with better terms such as:
- Lower interest rate
- Lower monthly payment
- Simplified payment schedule
- Fixed repayment timeline

## Types of Debt Consolidation:

### 1. Personal Loans
**Pros:**
- Fixed interest rates
- Fixed repayment terms
- No collateral required (unsecured)
- Predictable monthly payments

**Cons:**
- May require good credit for best rates
- Origination fees possible
- Higher rates than secured options

### 2. Balance Transfer Credit Cards
**Pros:**
- 0% introductory APR periods (12-21 months)
- Can save significant interest
- Consolidates credit card debt

**Cons:**
- Balance transfer fees (3-5%)
- High rates after promotional period
- Requires good credit
- Temptation to run up new debt

### 3. Home Equity Loans/HELOC
**Pros:**
- Lower interest rates (secured by home)
- Tax-deductible interest (in some cases)
- Large loan amounts available

**Cons:**
- Your home is collateral
- Closing costs and fees
- Variable rates (HELOC)
- Risk of foreclosure if you can't pay

### 4. 401(k) Loans
**Pros:**
- Low interest rates
- No credit check required
- Interest paid to yourself

**Cons:**
- Reduces retirement savings
- Must repay if you leave your job
- Opportunity cost of investment growth
- Not available to everyone

## When Debt Consolidation Makes Sense:

- You have multiple high-interest debts
- You qualify for a lower interest rate
- You can afford the new payment
- You won't accumulate new debt
- You have a plan to pay off the consolidated debt

## When to Avoid Debt Consolidation:

- You haven't addressed spending habits
- The new loan has higher total costs
- You're considering risky options (home equity for unsecured debt)
- You're close to paying off current debts

## Steps to Consolidate Debt:

1. **List all your debts** with balances, interest rates, and minimum payments
2. **Calculate total monthly payments** and interest costs
3. **Check your credit score** to understand your options
4. **Shop around** for the best consolidation option
5. **Compare total costs** including fees and interest
6. **Apply for the best option** and use funds to pay off existing debts
7. **Create a repayment plan** and stick to it
8. **Avoid accumulating new debt**

## Alternatives to Consider:

- **Debt Management Plan**: Work with a credit counseling agency
- **Debt Settlement**: Negotiate with creditors (impacts credit)
- **Bankruptcy**: Last resort for overwhelming debt
- **Snowball/Avalanche Method**: Pay off debts systematically without consolidation`,
    category: 'Debt Management',
    tags: ['debt consolidation', 'personal loans', 'balance transfer', 'debt management'],
    status: 'published',
    featured: false
  }
];

const sampleFAQs = [
  {
    question: 'How long does it take to improve my credit score?',
    answer: 'The time it takes to improve your credit score depends on your starting point and the actions you take. Generally, you may see small improvements within 1-2 months of positive changes, but significant improvements typically take 3-6 months or longer. Factors like paying down debt, making on-time payments, and disputing errors can help speed up the process.',
    category: 'Credit Improvement',
    order_index: 1
  },
  {
    question: 'What is the difference between a credit report and a credit score?',
    answer: 'A credit report is a detailed record of your credit history, including accounts, payment history, and public records. A credit score is a three-digit number (typically 300-850) calculated from the information in your credit report. Think of your credit report as the raw data and your credit score as the summary grade.',
    category: 'Credit Basics',
    order_index: 2
  },
  {
    question: 'How often should I check my credit report?',
    answer: 'You should check your credit report at least once a year from each of the three major credit bureaus (Experian, Equifax, and TransUnion). You can get free reports at annualcreditreport.com. If you\'re actively working on credit repair or monitoring for identity theft, consider checking more frequently - even monthly.',
    category: 'Credit Monitoring',
    order_index: 3
  },
  {
    question: 'Will checking my credit score hurt my credit?',
    answer: 'No, checking your own credit score is considered a "soft inquiry" and does not affect your credit score. You can check your score as often as you like. However, when lenders check your credit for loan applications, this creates a "hard inquiry" which may temporarily lower your score by a few points.',
    category: 'Credit Basics',
    order_index: 4
  },
  {
    question: 'How long do negative items stay on my credit report?',
    answer: 'Most negative items stay on your credit report for 7 years, including late payments, collections, and charge-offs. Bankruptcies can stay for 7-10 years depending on the type. Hard inquiries remain for 2 years. Positive information can stay on your report indefinitely, which is why it\'s important to keep old accounts open.',
    category: 'Credit Repair',
    order_index: 5
  },
  {
    question: 'Should I close old credit cards I no longer use?',
    answer: 'Generally, no. Keeping old credit cards open helps your credit score in two ways: it maintains your credit history length and keeps your credit utilization ratio low by maintaining available credit. If the card has no annual fee, consider keeping it open and using it occasionally for small purchases.',
    category: 'Credit Management',
    order_index: 6
  },
  {
    question: 'What is a good credit utilization ratio?',
    answer: 'A good credit utilization ratio is below 30% of your total available credit, but excellent credit scores typically have utilization below 10%. For example, if you have $10,000 in total credit limits, try to keep your total balances below $1,000. Also, try to keep individual card utilization below 30%.',
    category: 'Credit Basics',
    order_index: 7
  },
  {
    question: 'Can I remove accurate negative information from my credit report?',
    answer: 'You cannot legally remove accurate negative information from your credit report before it naturally expires. However, you can dispute inaccurate information, negotiate "pay for delete" agreements with some creditors, or use goodwill letters to request removal of isolated incidents from otherwise good payment history.',
    category: 'Credit Repair',
    order_index: 8
  },
  {
    question: 'What\'s the fastest way to build credit with no credit history?',
    answer: 'The fastest ways to build credit from scratch include: 1) Getting a secured credit card and using it responsibly, 2) Becoming an authorized user on someone else\'s account with good payment history, 3) Taking out a credit-builder loan, or 4) Using services like Experian Boost to get credit for utility and phone payments.',
    category: 'Credit Building',
    order_index: 9
  },
  {
    question: 'How many credit cards should I have?',
    answer: 'There\'s no magic number of credit cards you should have. The average American has 3-4 credit cards. What matters more is using them responsibly - keeping balances low, making payments on time, and not applying for too many cards at once. Having multiple cards can help with credit utilization if managed properly.',
    category: 'Credit Management',
    order_index: 10
  }
];

export async function seedKnowledgeBase() {
  try {
    console.log('🌱 Seeding knowledge base data...');

    // Get a sample admin user ID (assuming user ID 1 exists)
    const adminUsers = await executeQuery('SELECT id FROM users WHERE role = "admin" LIMIT 1') as any[];
    const adminId = adminUsers.length > 0 ? adminUsers[0].id : 1;

    // Insert sample articles
    for (const article of sampleArticles) {
      const result = await executeQuery(`
        INSERT INTO knowledge_articles (title, content, category, tags, author_id, status, featured)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        article.title,
        article.content,
        article.category,
        JSON.stringify(article.tags),
        adminId,
        article.status,
        article.featured
      ]) as ResultSetHeader;

      console.log(`✅ Created article: ${article.title} (ID: ${result.insertId})`);
    }

    // Insert sample FAQs
    for (const faq of sampleFAQs) {
      const result = await executeQuery(`
        INSERT INTO faqs (question, answer, category, order_index, status)
        VALUES (?, ?, ?, ?, 'active')
      `, [
        faq.question,
        faq.answer,
        faq.category,
        faq.order_index
      ]) as ResultSetHeader;

      console.log(`✅ Created FAQ: ${faq.question.substring(0, 50)}... (ID: ${result.insertId})`);
    }

    console.log('🎉 Knowledge base seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding knowledge base:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedKnowledgeBase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}