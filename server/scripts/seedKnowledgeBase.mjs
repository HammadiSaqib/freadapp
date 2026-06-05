import { executeQuery } from '../database/mysqlConfig.ts';

const sampleArticles = [
  {
    title: "Understanding Your Credit Score",
    content: `Your credit score is a three-digit number that represents your creditworthiness to lenders. It typically ranges from 300 to 850, with higher scores indicating better credit health.

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
- Pay down existing debt`,
    category: "credit-basics",
    tags: ["credit-score", "basics", "improvement"],
    status: "published",
    featured: true
  },
  {
    title: "How to Read Your Credit Report",
    content: `Your credit report is a detailed record of your credit history. Understanding how to read it is crucial for maintaining good credit health.

## Main Sections of a Credit Report:

### 1. Personal Information
- Name, address, Social Security number
- Date of birth, employment information

### 2. Credit Accounts
- Account details for each credit card, loan, or line of credit
- Payment history, current balance, credit limit
- Account status (open, closed, paid off)

### 3. Credit Inquiries
- **Hard inquiries**: When you apply for credit
- **Soft inquiries**: Background checks that don't affect your score

### 4. Public Records
- Bankruptcies, tax liens, civil judgments
- These can significantly impact your credit score

### 5. Collections
- Accounts that have been sent to collection agencies
- Unpaid debts that creditors have written off

## How to Get Your Free Credit Report:

1. Visit annualcreditreport.com
2. Request reports from all three bureaus: Experian, Equifax, TransUnion
3. Review each report carefully for errors
4. Dispute any inaccuracies you find

## Red Flags to Look For:

- Accounts you didn't open
- Incorrect personal information
- Wrong account balances or payment history
- Accounts that should have been removed`,
    category: "credit-reports",
    tags: ["credit-report", "monitoring", "errors"],
    status: "published",
    featured: false
  },
  {
    title: "Disputing Credit Report Errors",
    content: `Found an error on your credit report? Don't panic. You have the right to dispute inaccurate information, and the process is straightforward.

## Common Credit Report Errors:

1. **Identity Errors**
   - Wrong name, address, or Social Security number
   - Mixed files with someone who has a similar name

2. **Account Errors**
   - Accounts that aren't yours
   - Incorrect account status or balance
   - Wrong payment history

3. **Data Management Errors**
   - Duplicate accounts
   - Accounts not updated after being paid off
   - Closed accounts showing as open

## How to Dispute Errors:

### Step 1: Gather Documentation
- Copy of your credit report with errors highlighted
- Supporting documents (payment records, account statements)
- Written explanation of the error

### Step 2: Contact the Credit Bureau
- File dispute online, by phone, or by mail
- Include all supporting documentation
- Keep copies of everything you send

### Step 3: Contact the Data Furnisher
- Also dispute directly with the company that reported the error
- This can speed up the resolution process

### Step 4: Follow Up
- Credit bureaus have 30 days to investigate
- You'll receive results in writing
- If dispute is successful, get updated credit report

## Tips for Successful Disputes:

- Be specific about what's wrong
- Provide clear evidence
- Keep detailed records
- Be persistent but patient
- Consider certified mail for important documents`,
    category: "credit-repair",
    tags: ["disputes", "errors", "credit-repair"],
    status: "published",
    featured: true
  },
  {
    title: "Building Credit from Scratch",
    content: `Starting your credit journey can feel overwhelming, but with the right approach, you can build a strong credit foundation.

## Why Building Credit Matters:

- Better loan terms and interest rates
- Easier approval for apartments and utilities
- Lower insurance premiums
- Better job prospects in some fields
- Financial flexibility and opportunities

## Steps to Build Credit:

### 1. Start with a Secured Credit Card
- Put down a security deposit
- Use it for small purchases
- Pay the full balance each month
- Deposit typically becomes your credit limit

### 2. Consider a Credit-Builder Loan
- Bank holds loan amount in savings account
- You make monthly payments
- Get the money back when loan is paid off
- Builds payment history

### 3. Become an Authorized User
- Ask family member to add you to their account
- Their payment history can help your credit
- Make sure they have good payment habits

### 4. Pay All Bills on Time
- Set up automatic payments
- Use calendar reminders
- Even non-credit bills matter (utilities, rent)

### 5. Keep Credit Utilization Low
- Use less than 30% of available credit
- Ideally, keep it under 10%
- Pay balances before statement closes

## Timeline for Building Credit:

- **3-6 months**: First credit score appears
- **6-12 months**: Score becomes more stable
- **12+ months**: Eligible for better credit products
- **2+ years**: Considered established credit history

## Common Mistakes to Avoid:

- Applying for too many cards at once
- Maxing out credit cards
- Missing payments
- Closing your first credit card
- Not monitoring your credit report`,
    category: "credit-building",
    tags: ["building-credit", "beginners", "secured-cards"],
    status: "published",
    featured: false
  },
  {
    title: "Debt Consolidation Options",
    content: `Struggling with multiple debts? Debt consolidation might help simplify your payments and potentially save money on interest.

## What is Debt Consolidation?

Debt consolidation combines multiple debts into a single payment, ideally with a lower interest rate or better terms.

## Types of Debt Consolidation:

### 1. Personal Loans
**Pros:**
- Fixed interest rate and payment
- No collateral required
- Predictable payoff timeline

**Cons:**
- May require good credit for best rates
- Origination fees possible
- Temptation to run up new debt

### 2. Balance Transfer Credit Cards
**Pros:**
- 0% intro APR offers available
- Can save significant interest
- Convenient online management

**Cons:**
- Intro rates are temporary
- Balance transfer fees (3-5%)
- Need good credit for approval

### 3. Home Equity Loans/HELOC
**Pros:**
- Lower interest rates
- Tax-deductible interest (sometimes)
- Large borrowing amounts

**Cons:**
- Home is collateral
- Closing costs and fees
- Risk of losing home if you can't pay

### 4. 401(k) Loans
**Pros:**
- No credit check required
- Low interest rates
- Pay interest to yourself

**Cons:**
- Reduces retirement savings
- Must repay if you leave job
- Opportunity cost of lost investment growth

## When Debt Consolidation Makes Sense:

- You have good credit to qualify for lower rates
- You're committed to not running up new debt
- Your debt is manageable (under 40% of income)
- You have steady income

## When to Avoid Debt Consolidation:

- You haven't addressed spending habits
- Debt exceeds 50% of income
- You're considering bankruptcy
- You can't qualify for better terms

## Steps to Consolidate Debt:

1. **Calculate total debt and monthly payments**
2. **Check your credit score**
3. **Shop around for best rates and terms**
4. **Compare total costs, not just monthly payments**
5. **Read all terms and conditions carefully**
6. **Create a plan to avoid new debt**

## Alternatives to Consider:

- Debt management plan through credit counseling
- Debt settlement (impacts credit significantly)
- Bankruptcy (last resort)
- DIY debt payoff strategies (snowball/avalanche)`,
    category: "debt-management",
    tags: ["debt-consolidation", "personal-loans", "balance-transfer"],
    status: "published",
    featured: false
  }
];

const sampleFAQs = [
  {
    question: "How often should I check my credit score?",
    answer: "You should check your credit score at least once a month. Many credit card companies and financial institutions offer free credit score monitoring. Additionally, you're entitled to one free credit report from each of the three major credit bureaus (Experian, Equifax, and TransUnion) annually through annualcreditreport.com. Consider spacing these out throughout the year to monitor your credit more frequently.",
    category: "credit-monitoring",
    order_index: 1
  },
  {
    question: "What's the difference between a credit score and a credit report?",
    answer: "A credit report is a detailed record of your credit history, including your payment history, current debts, length of credit history, types of credit, and recent credit inquiries. A credit score is a three-digit number (typically 300-850) calculated from the information in your credit report. Think of your credit report as the raw data and your credit score as the summary grade based on that data.",
    category: "credit-basics",
    order_index: 2
  },
  {
    question: "How long do negative items stay on my credit report?",
    answer: "Most negative items stay on your credit report for 7 years, including late payments, collections, charge-offs, and Chapter 13 bankruptcy. Chapter 7 bankruptcy stays for 10 years. Hard inquiries remain for 2 years but only affect your score for the first year. Positive information, like on-time payments, can stay on your report indefinitely and continue to help your score.",
    category: "credit-reports",
    order_index: 3
  },
  {
    question: "Will checking my own credit score hurt my credit?",
    answer: "No, checking your own credit score is considered a 'soft inquiry' and does not affect your credit score. You can check your score as often as you like without any negative impact. Only 'hard inquiries' from lenders when you apply for credit can temporarily lower your score by a few points.",
    category: "credit-monitoring",
    order_index: 4
  },
  {
    question: "What's a good credit utilization ratio?",
    answer: "A good credit utilization ratio is generally below 30% of your available credit, but ideally below 10% for the best credit scores. For example, if you have $10,000 in total credit limits, try to keep your total balances below $1,000. This applies both to individual cards and your overall utilization across all cards.",
    category: "credit-basics",
    order_index: 5
  },
  {
    question: "How long does it take to improve my credit score?",
    answer: "The timeline varies depending on your starting point and the actions you take. Small improvements might be seen in 1-2 months, while significant improvements typically take 3-6 months of consistent positive behavior. Major negative items like bankruptcies or foreclosures can take years to fully recover from. The key is consistent, positive credit habits over time.",
    category: "credit-improvement",
    order_index: 6
  },
  {
    question: "Should I close old credit cards I don't use?",
    answer: "Generally, no. Keeping old credit cards open helps your credit score in two ways: it maintains your length of credit history and keeps your credit utilization ratio lower by maintaining higher available credit. However, if the card has an annual fee you don't want to pay, or if having the card tempts you to overspend, closing it might be worth the small credit score impact.",
    category: "credit-management",
    order_index: 7
  },
  {
    question: "What should I do if I find an error on my credit report?",
    answer: "If you find an error, dispute it immediately with the credit bureau that issued the report. You can dispute online, by phone, or by mail. Include documentation supporting your claim. The credit bureau has 30 days to investigate. Also consider contacting the company that reported the incorrect information directly. Keep records of all communications and follow up if necessary.",
    category: "credit-repair",
    order_index: 8
  },
  {
    question: "Can I remove accurate negative information from my credit report?",
    answer: "No, you cannot legally remove accurate negative information from your credit report before it naturally expires. However, you can try negotiating with creditors for a 'pay for delete' agreement, though this isn't guaranteed to work. Focus instead on adding positive information and waiting for negative items to age off your report.",
    category: "credit-repair",
    order_index: 9
  },
  {
    question: "How many credit cards should I have?",
    answer: "There's no magic number, but most experts suggest having 2-4 credit cards. This provides enough credit history and available credit without being too complex to manage. The key is to only have as many cards as you can responsibly manage, always paying on time and keeping balances low. Quality of management matters more than quantity of cards.",
    category: "credit-management",
    order_index: 10
  }
];

async function seedKnowledgeBase() {
  try {
    console.log('Starting knowledge base seeding...');
    
    // Get admin user ID
    const adminUsers = await executeQuery('SELECT id FROM users WHERE role = "admin" LIMIT 1');
    const adminId = adminUsers.length > 0 ? adminUsers[0].id : 1;
    
    // Insert articles
    console.log('Inserting sample articles...');
    const articleResult = await executeQuery(`
      INSERT INTO knowledge_articles (title, content, category, tags, author_id, status, featured, views, likes, dislikes, rating)
      VALUES ${sampleArticles.map(() => '(?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0)').join(', ')}
    `, sampleArticles.flatMap(article => [
      article.title,
      article.content,
      article.category,
      JSON.stringify(article.tags),
      adminId,
      article.status,
      article.featured ? 1 : 0
    ]));
    
    console.log(`Inserted ${articleResult.affectedRows} articles`);
    
    // Insert FAQs
    console.log('Inserting sample FAQs...');
    const faqResult = await executeQuery(`
      INSERT INTO faqs (question, answer, category, order_index, status, views, helpful, not_helpful)
      VALUES ${sampleFAQs.map(() => '(?, ?, ?, ?, "published", 0, 0, 0)').join(', ')}
    `, sampleFAQs.flatMap(faq => [
      faq.question,
      faq.answer,
      faq.category,
      faq.order_index
    ]));
    
    console.log(`Inserted ${faqResult.affectedRows} FAQs`);
    console.log('Knowledge base seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding knowledge base:', error);
    process.exit(1);
  }
}

seedKnowledgeBase();