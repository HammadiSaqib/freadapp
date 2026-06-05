import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calculator, ArrowRight, DollarSign, Percent, Calendar } from "lucide-react";

function parseNumber(value: string): number {
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function computeMonthlyPayment(principal: number, aprPercent: number, termMonths: number): number {
  if (principal <= 0 || termMonths <= 0) return 0;
  const monthlyRate = aprPercent > 0 ? aprPercent / 100 / 12 : 0;
  if (monthlyRate === 0) return principal / termMonths;
  const r = monthlyRate;
  const factor = Math.pow(1 + r, termMonths);
  return (principal * r * factor) / (factor - 1);
}

export default function FundingCalculator() {
  const [amount, setAmount] = useState("25000");
  const [apr, setApr] = useState("12.5");
  const [termMonths, setTermMonths] = useState("36");
  const [originationFeePercent, setOriginationFeePercent] = useState("0");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const results = useMemo(() => {
    const principal = parseNumber(amount);
    const aprPct = parseNumber(apr);
    const months = Math.max(0, Math.floor(parseNumber(termMonths)));
    const feePct = Math.max(0, parseNumber(originationFeePercent));
    const feeAmount = (principal * feePct) / 100;
    const financed = principal + feeAmount;
    const monthlyPayment = computeMonthlyPayment(financed, aprPct, months);
    const totalPaid = monthlyPayment * months;
    const totalInterest = Math.max(0, totalPaid - financed);

    return {
      principal,
      feeAmount,
      financed,
      months,
      aprPct,
      monthlyPayment,
      totalPaid,
      totalInterest,
    };
  }, [amount, apr, termMonths, originationFeePercent]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Helmet>
        <title>Funding Calculator | Score Machine</title>
        <meta
          name="description"
          content="Estimate monthly payments and total cost for a funding amount based on APR and term."
        />
      </Helmet>

      <SiteHeader />

      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center p-3 bg-teal-100 text-teal-700 rounded-full mb-5">
                <Calculator className="w-8 h-8" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-3">Funding Calculator</h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Enter a funding amount, APR, and term to estimate monthly payment and total cost.
              </p>
              <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
                <Badge variant="secondary" className="bg-white text-black">
                  Estimated payment
                </Badge>
                <Badge variant="secondary" className="bg-white text-black">
                  Total interest
                </Badge>
                <Badge variant="secondary" className="bg-white text-black">
                  Total paid
                </Badge>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="shadow-xl border-0 bg-white overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-teal-600 to-emerald-600" />
                <CardHeader className="p-6">
                  <CardTitle className="text-xl text-slate-900 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-teal-700" />
                    Inputs
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="fundingAmount" className="text-slate-700">
                      Funding amount
                    </Label>
                    <Input
                      id="fundingAmount"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="25000"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fundingApr" className="text-slate-700 flex items-center gap-2">
                        <Percent className="w-4 h-4" />
                        APR (%)
                      </Label>
                      <Input
                        id="fundingApr"
                        inputMode="decimal"
                        value={apr}
                        onChange={(e) => setApr(e.target.value)}
                        placeholder="12.5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fundingTerm" className="text-slate-700 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Term (months)
                      </Label>
                      <Input
                        id="fundingTerm"
                        inputMode="numeric"
                        value={termMonths}
                        onChange={(e) => setTermMonths(e.target.value)}
                        placeholder="36"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fundingFee" className="text-slate-700">
                      Origination fee (%)
                    </Label>
                    <Input
                      id="fundingFee"
                      inputMode="decimal"
                      value={originationFeePercent}
                      onChange={(e) => setOriginationFeePercent(e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="pt-2 flex gap-3 flex-wrap">
                    <Button asChild className="bg-gradient-to-r from-ocean-blue to-sea-green">
                      <Link to="/mortgage-calculator">
                        Mortgage Calculator <ArrowRight className="ml-2 w-4 h-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link to="/car-loan-calculator">Car Loan Calculator</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-xl border-0 bg-white overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-ocean-blue to-sea-green" />
                <CardHeader className="p-6">
                  <CardTitle className="text-xl text-slate-900">Results</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                      <div className="text-sm text-black">Estimated monthly payment</div>
                      <div className="text-2xl font-bold text-slate-900">
                        {formatMoney(results.monthlyPayment)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-slate-200">
                        <div className="text-sm text-slate-600">Financed amount</div>
                        <div className="text-lg font-semibold text-slate-900">{formatMoney(results.financed)}</div>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-200">
                        <div className="text-sm text-slate-600">Origination fee</div>
                        <div className="text-lg font-semibold text-slate-900">{formatMoney(results.feeAmount)}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-slate-200">
                        <div className="text-sm text-black">Total interest</div>
                        <div className="text-lg font-semibold text-slate-900">
                          {formatMoney(results.totalInterest)}
                        </div>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-200">
                        <div className="text-sm text-black">Total paid</div>
                        <div className="text-lg font-semibold text-slate-900">{formatMoney(results.totalPaid)}</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200">
                      <div className="text-sm text-slate-600">Term</div>
                      <div className="text-lg font-semibold text-slate-900">{results.months} months</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <section className="mt-12 space-y-6 text-slate-800">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h2 className="text-2xl font-bold text-slate-900">Funding Calculator</h2>
                <h3 className="text-xl font-semibold text-slate-900">Introduction</h3>
                <p>
                  Let me be honest with you. When I first heard about funding calculators, I thought they were just fancy spreadsheets.
                  Boy, was I wrong.
                </p>
                <p>
                  A funding calculator is actually one of the most powerful tools you can use when planning your financial future.
                  Whether you're a startup founder chasing investors, a student figuring out college costs, or a business owner
                  calculating loan payments, this tool can save you countless hours and potentially thousands of dollars.
                </p>
                <p>
                  In this guide, I'll walk you through everything you need to know about funding calculators. No jargon. No fluff. Just
                  practical information you can actually use.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">What Exactly Is a Funding Calculator?</h3>
                <p>
                  Simply put, a funding calculator is a digital tool that helps you figure out how much money you need, where it might
                  come from, and what it'll cost you in the long run.
                </p>
                <p>
                  Think of it like a GPS for your financial journey. You tell it where you are now, where you want to go, and it maps
                  out the possible routes to get there.
                </p>
                <p>
                  These calculators come in many forms. Some focus on business loans. Others tackle startup equity. Many help with
                  education funding or personal finance goals. The core purpose remains the same: turning complex money questions into
                  clear answers.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Why Should You Care About Funding Calculators?</h3>
                <p>
                  Here's the thing. Most people make financial decisions based on gut feelings. That's a recipe for disaster.
                </p>
                <p>
                  I've seen business owners take loans they couldn't afford. Students borrowing way more than necessary.
                  Entrepreneurs giving away too much equity because they couldn't do the math.
                </p>
                <p>
                  A good funding calculator removes the guesswork. It gives you hard numbers to work with. And when you're dealing
                  with money, hard numbers beat hunches every single time.
                </p>
                <div className="space-y-2">
                  <p className="font-semibold text-slate-900">Real Benefits You'll Experience</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Time savings stand out first. Manual calculations that take hours get done in seconds.</li>
                    <li>Accuracy matters too. Human error in financial calculations can cost you dearly. Calculators don't make arithmetic mistakes.</li>
                    <li>Comparison becomes easy. Want to see how different loan terms affect your payments? A calculator shows you instantly.</li>
                    <li>Confidence grows when you understand your numbers. Walking into a bank or investor meeting with solid calculations changes everything.</li>
                  </ul>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Types of Funding Calculators You Should Know</h3>
                <p>
                  Not all funding calculators serve the same purpose. Let me break down the main categories for you.
                </p>
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-slate-900">Business Loan Calculators</p>
                    <p>
                      These help you understand what borrowing will actually cost. You input the loan amount, interest rate, and term
                      length. The calculator shows your monthly payments, total interest paid, and overall cost.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Startup Funding Calculators</p>
                    <p>
                      Entrepreneurs use these to figure out equity dilution. How much ownership will you give up for that investment?
                      What will your stake be worth after multiple funding rounds? These tools answer those questions.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Education Funding Calculators</p>
                    <p>
                      Planning for college costs? These calculators factor in tuition increases, savings growth, and financial aid to
                      show you what you need to save.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Grant Funding Calculators</p>
                    <p>
                      Nonprofits and researchers use these to match funding needs with available grants. They help prioritize
                      applications and track funding gaps.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Personal Finance Calculators</p>
                    <p>
                      These cover everything from retirement planning to emergency fund calculations. They're your everyday money
                      planning companions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Key Components of a Funding Calculator</h3>
                <p>
                  Every effective funding calculator shares certain features. Understanding these helps you use them better.
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border border-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-4 py-2 border-b border-slate-200">Component</th>
                        <th className="text-left px-4 py-2 border-b border-slate-200">What It Does</th>
                        <th className="text-left px-4 py-2 border-b border-slate-200">Why It Matters</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">Principal Amount</td>
                        <td className="px-4 py-2">The base funding you need or will receive</td>
                        <td className="px-4 py-2">Starting point for all calculations</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">Interest Rate</td>
                        <td className="px-4 py-2">Cost of borrowing or expected returns</td>
                        <td className="px-4 py-2">Dramatically affects total costs</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">Time Period</td>
                        <td className="px-4 py-2">Length of loan or investment horizon</td>
                        <td className="px-4 py-2">Longer terms mean different outcomes</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">Payment Frequency</td>
                        <td className="px-4 py-2">Monthly, quarterly, or annual payments</td>
                        <td className="px-4 py-2">Affects cash flow planning</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">Compounding Method</td>
                        <td className="px-4 py-2">How interest accumulates over time</td>
                        <td className="px-4 py-2">Simple vs compound makes huge difference</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">Additional Fees</td>
                        <td className="px-4 py-2">Origination fees, closing costs, etc.</td>
                        <td className="px-4 py-2">Hidden costs that impact true expense</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-medium">Amortization Schedule</td>
                        <td className="px-4 py-2">Payment breakdown over time</td>
                        <td className="px-4 py-2">Shows principal vs interest each period</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">How to Use a Funding Calculator Effectively</h3>
                <p>Let me share some practical tips I've learned over the years.</p>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>
                    <span className="font-semibold text-slate-900">Step One: Gather Your Information First</span>
                    <div>
                      Before touching any calculator, collect your data. Know your credit score. Understand current interest rates.
                      Have your financial statements ready. The calculator is only as good as the information you feed it.
                    </div>
                  </li>
                  <li>
                    <span className="font-semibold text-slate-900">Step Two: Start with Realistic Numbers</span>
                    <div>
                      I see this mistake constantly. People plug in best-case scenarios and wonder why reality disappoints them. Use
                      conservative estimates. If your projections are wrong, better to be pleasantly surprised than devastated.
                    </div>
                  </li>
                  <li>
                    <span className="font-semibold text-slate-900">Step Three: Run Multiple Scenarios</span>
                    <div>
                      Don't just calculate one option. What if interest rates rise? What if you need more funding than expected? What
                      if your timeline changes? Good planning means preparing for different outcomes.
                    </div>
                  </li>
                  <li>
                    <span className="font-semibold text-slate-900">Step Four: Understand the Results</span>
                    <div>
                      Numbers on a screen mean nothing if you can't interpret them. Take time to understand what each figure
                      represents. Ask questions if something seems unclear.
                    </div>
                  </li>
                  <li>
                    <span className="font-semibold text-slate-900">Step Five: Document Everything</span>
                    <div>
                      Keep records of your calculations. Save screenshots or export reports. You'll want to reference these later and
                      track how your actual results compare to projections.
                    </div>
                  </li>
                </ol>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Common Funding Calculator Formulas Explained</h3>
                <p>You don't need to be a mathematician, but understanding basic formulas helps you trust the results.</p>
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-slate-900">Simple Interest Formula</p>
                    <p>Interest = Principal × Rate × Time</p>
                    <p>This applies to straightforward loans where interest doesn't compound. It's the easiest to understand and calculate.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Compound Interest Formula</p>
                    <p>A = P(1 + r/n)^(nt)</p>
                    <p>Where:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>A = Final amount</li>
                      <li>P = Principal</li>
                      <li>r = Annual interest rate</li>
                      <li>n = Compounding frequency per year</li>
                      <li>t = Time in years</li>
                    </ul>
                    <p>Compound interest works for or against you depending on whether you're saving or borrowing.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Monthly Payment Formula</p>
                    <p>M = P[r(1+r)^n]/[(1+r)^n-1]</p>
                    <p>Where:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>M = Monthly payment</li>
                      <li>P = Principal</li>
                      <li>r = Monthly interest rate</li>
                      <li>n = Number of payments</li>
                    </ul>
                    <p>This tells you exactly what you'll owe each month on a standard loan.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Comparison Table: Popular Funding Calculator Types</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border border-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-4 py-2 border-b border-slate-200">Calculator Type</th>
                        <th className="text-left px-4 py-2 border-b border-slate-200">Best For</th>
                        <th className="text-left px-4 py-2 border-b border-slate-200">Key Inputs</th>
                        <th className="text-left px-4 py-2 border-b border-slate-200">Primary Output</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">Business Loan</td>
                        <td className="px-4 py-2">Small business owners</td>
                        <td className="px-4 py-2">Loan amount, rate, term</td>
                        <td className="px-4 py-2">Monthly payments</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">SBA Loan</td>
                        <td className="px-4 py-2">Government-backed borrowing</td>
                        <td className="px-4 py-2">Loan details, SBA program type</td>
                        <td className="px-4 py-2">Payment schedule, fees</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">Startup Equity</td>
                        <td className="px-4 py-2">Entrepreneurs seeking investment</td>
                        <td className="px-4 py-2">Investment amount, valuation</td>
                        <td className="px-4 py-2">Ownership percentage</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">Crowdfunding</td>
                        <td className="px-4 py-2">Product launches</td>
                        <td className="px-4 py-2">Goal, platform fees, reward costs</td>
                        <td className="px-4 py-2">Net proceeds</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">Education Savings</td>
                        <td className="px-4 py-2">Parents, students</td>
                        <td className="px-4 py-2">Current savings, target amount</td>
                        <td className="px-4 py-2">Required monthly contribution</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">Research Grant</td>
                        <td className="px-4 py-2">Academics, nonprofits</td>
                        <td className="px-4 py-2">Project costs, indirect rates</td>
                        <td className="px-4 py-2">Total budget request</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">Mortgage</td>
                        <td className="px-4 py-2">Home buyers</td>
                        <td className="px-4 py-2">Price, down payment, rate</td>
                        <td className="px-4 py-2">Monthly payment, total cost</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-medium">Line of Credit</td>
                        <td className="px-4 py-2">Businesses with variable needs</td>
                        <td className="px-4 py-2">Credit limit, usage, rate</td>
                        <td className="px-4 py-2">Interest costs</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Mistakes People Make with Funding Calculators</h3>
                <p>I've watched smart people make dumb mistakes with these tools. Here's what to avoid.</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <span className="font-semibold text-slate-900">Ignoring Hidden Costs</span>
                    <div>
                      The calculator shows your loan payment. Great. But what about origination fees? Prepayment penalties? Insurance
                      requirements? These add up fast.
                    </div>
                  </li>
                  <li>
                    <span className="font-semibold text-slate-900">Forgetting Inflation</span>
                    <div>
                      A dollar today won't buy what a dollar buys in ten years. Long-term calculations need inflation adjustments to
                      stay meaningful.
                    </div>
                  </li>
                  <li>
                    <span className="font-semibold text-slate-900">Overlooking Opportunity Cost</span>
                    <div>
                      If you tie up money in one investment, you can't use it elsewhere. Good funding calculations consider what you're
                      giving up.
                    </div>
                  </li>
                  <li>
                    <span className="font-semibold text-slate-900">Assuming Perfect Conditions</span>
                    <div>
                      Markets change. Income fluctuates. Unexpected expenses pop up. Build buffers into your calculations.
                    </div>
                  </li>
                  <li>
                    <span className="font-semibold text-slate-900">Not Updating Regularly</span>
                    <div>Your financial situation changes. Recalculate periodically to make sure your plans still make sense.</div>
                  </li>
                </ul>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Industry-Specific Funding Calculations</h3>
                <p>Different industries face unique funding challenges. Let me highlight a few.</p>
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-slate-900">Healthcare and Medical Research</p>
                    <p>
                      Funding calculations here involve grant cycles, matching requirements, and indirect cost rates. Timing matters
                      enormously because funding often comes in specific phases.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Technology Startups</p>
                    <p>
                      Runway calculations dominate this space. How long will your funding last at current burn rates? When do you need
                      to raise again? These questions drive strategic decisions.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Real Estate Development</p>
                    <p>
                      Project financing involves construction loans, permanent financing, equity investments, and various fees.
                      Calculations get complex with multiple funding sources.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Manufacturing</p>
                    <p>
                      Equipment financing, working capital needs, and inventory funding all require different calculation approaches.
                      Cash flow timing becomes critical.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Funding Calculator Features Comparison</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border border-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-4 py-2 border-b border-slate-200">Feature</th>
                        <th className="text-left px-4 py-2 border-b border-slate-200">Basic Calculators</th>
                        <th className="text-left px-4 py-2 border-b border-slate-200">Advanced Calculators</th>
                        <th className="text-left px-4 py-2 border-b border-slate-200">Enterprise Solutions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">Simple interest calculations</td>
                        <td className="px-4 py-2">Yes</td>
                        <td className="px-4 py-2">Yes</td>
                        <td className="px-4 py-2">Yes</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">Compound interest options</td>
                        <td className="px-4 py-2">Sometimes</td>
                        <td className="px-4 py-2">Yes</td>
                        <td className="px-4 py-2">Yes</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">Multiple scenario comparison</td>
                        <td className="px-4 py-2">No</td>
                        <td className="px-4 py-2">Yes</td>
                        <td className="px-4 py-2">Yes</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">Amortization schedules</td>
                        <td className="px-4 py-2">Basic</td>
                        <td className="px-4 py-2">Detailed</td>
                        <td className="px-4 py-2">Comprehensive</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">Export capabilities</td>
                        <td className="px-4 py-2">Limited</td>
                        <td className="px-4 py-2">PDF, Excel</td>
                        <td className="px-4 py-2">Multiple formats</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">Customization</td>
                        <td className="px-4 py-2">None</td>
                        <td className="px-4 py-2">Moderate</td>
                        <td className="px-4 py-2">Full</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">Integration with other tools</td>
                        <td className="px-4 py-2">No</td>
                        <td className="px-4 py-2">Some</td>
                        <td className="px-4 py-2">Extensive</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">Support and training</td>
                        <td className="px-4 py-2">Minimal</td>
                        <td className="px-4 py-2">Available</td>
                        <td className="px-4 py-2">Dedicated</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-medium">Cost</td>
                        <td className="px-4 py-2">Free</td>
                        <td className="px-4 py-2">Low to moderate</td>
                        <td className="px-4 py-2">Subscription-based</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-medium">Best for</td>
                        <td className="px-4 py-2">Personal use</td>
                        <td className="px-4 py-2">Small business</td>
                        <td className="px-4 py-2">Large organizations</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Building Your Own Funding Calculations</h3>
                <p>Sometimes existing calculators don't fit your needs. Here's how to create your own.</p>
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-slate-900">Spreadsheet Approach</p>
                    <p>
                      Excel or Google Sheets work perfectly for custom calculations. Built-in financial functions handle most
                      scenarios. You control every variable.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Key Functions to Learn</p>
                    <p>
                      PMT calculates payment amounts. FV projects future values. PV determines present values. RATE figures out
                      interest rates. NPER counts payment periods.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Template Creation</p>
                    <p>
                      Build reusable templates for recurring calculations. Document your formulas so others can understand them. Test
                      thoroughly before relying on results.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Digital Tools and Resources</h3>
                <p>The market offers countless funding calculator options. Here's what to look for.</p>
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-slate-900">Free Online Calculators</p>
                    <p>
                      Banks and financial websites offer basic calculators at no cost. They work fine for simple needs. Just
                      understand they may not cover complex scenarios.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Professional Software</p>
                    <p>
                      Accounting and financial planning software often includes robust calculation tools. These integrate with your
                      broader financial management.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Mobile Apps</p>
                    <p>
                      Calculator apps let you run numbers anywhere. Helpful for quick estimates during meetings or conversations.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Custom Solutions</p>
                    <p>
                      Large organizations sometimes build proprietary calculators tailored to their specific needs. This makes sense
                      when standard tools fall short.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Funding Calculator Accuracy Factors</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border border-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-4 py-2 border-b border-slate-200">Factor</th>
                        <th className="text-left px-4 py-2 border-b border-slate-200">Impact Level</th>
                        <th className="text-left px-4 py-2 border-b border-slate-200">How to Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">Input data quality</td>
                        <td className="px-4 py-2">High</td>
                        <td className="px-4 py-2">Verify all numbers before entering</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">Formula accuracy</td>
                        <td className="px-4 py-2">High</td>
                        <td className="px-4 py-2">Use trusted calculators or verify formulas</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">Assumption validity</td>
                        <td className="px-4 py-2">Medium-High</td>
                        <td className="px-4 py-2">Use realistic, current assumptions</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">Market condition changes</td>
                        <td className="px-4 py-2">Medium</td>
                        <td className="px-4 py-2">Update calculations regularly</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">Rounding differences</td>
                        <td className="px-4 py-2">Low</td>
                        <td className="px-4 py-2">Minor impact on most calculations</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-medium">Software bugs</td>
                        <td className="px-4 py-2">Low</td>
                        <td className="px-4 py-2">Use established, tested tools</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Practical Examples and Scenarios</h3>
                <p>Let me walk you through some real-world applications.</p>
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-slate-900">Small Business Loan Example</p>
                    <p>
                      Suppose you need $100,000 for equipment. The bank offers 7% interest over 5 years. A funding calculator quickly
                      shows you'll pay about $1,980 monthly, with total interest around $18,800. Now you know if your cash flow can
                      handle it.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Startup Equity Example</p>
                    <p>
                      Your company gets a $500,000 investment at a $2 million pre-money valuation. The calculator shows investors will
                      own 20% of your company. After several rounds, you can see exactly how your ownership decreases.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Education Savings Example</p>
                    <p>
                      Your child starts college in 15 years. Current costs are $30,000 annually. With 5% annual increases, you'll need
                      roughly $62,000 per year when they enroll. The calculator shows you need to save about $700 monthly to reach your
                      goal.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Questions to Ask Before Calculating</h3>
                <p>Good calculations start with good questions. Ask yourself:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>What exactly am I trying to figure out? Clarity here saves time later.</li>
                  <li>What information do I already have? Gather your data before starting.</li>
                  <li>What assumptions am I making? Challenge them to ensure they're reasonable.</li>
                  <li>What would change my results significantly? Identify your biggest variables.</li>
                  <li>How accurate does this need to be? Quick estimates need less precision than major decisions.</li>
                </ul>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">The Future of Funding Calculators</h3>
                <p>These tools keep getting smarter. Here's where things are heading.</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Artificial intelligence will provide personalized recommendations based on your specific situation and goals.</li>
                  <li>Integration with banking and accounting systems will automate data input, reducing errors and saving time.</li>
                  <li>Scenario modeling will become more sophisticated, accounting for more variables and uncertainty.</li>
                  <li>Accessibility will improve, making powerful calculations available to everyone regardless of financial expertise.</li>
                </ul>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Final Thoughts</h3>
                <p>
                  Funding calculators aren't magic. They won't make financial decisions for you. But they will give you the information
                  you need to make those decisions wisely.
                </p>
                <p>
                  The best time to start using these tools? Right now. Even if your financial needs seem simple today, building
                  calculation habits prepares you for more complex situations tomorrow.
                </p>
                <p>
                  Pick a calculator that fits your current needs. Learn to use it well. Update your calculations regularly. And
                  always remember that the numbers serve you, not the other way around.
                </p>
                <p>Your financial future deserves careful planning. Funding calculators make that planning possible.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Quick Reference Summary</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border border-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-4 py-2 border-b border-slate-200">Topic</th>
                        <th className="text-left px-4 py-2 border-b border-slate-200">Key Takeaway</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">Definition</td>
                        <td className="px-4 py-2">Tool for calculating funding needs and costs</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">Main benefit</td>
                        <td className="px-4 py-2">Removes guesswork from financial planning</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">Most important feature</td>
                        <td className="px-4 py-2">Accuracy and scenario comparison</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">Biggest mistake to avoid</td>
                        <td className="px-4 py-2">Using unrealistic assumptions</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="px-4 py-2 font-medium">Best practice</td>
                        <td className="px-4 py-2">Run multiple scenarios, update regularly</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-medium">Starting point</td>
                        <td className="px-4 py-2">Gather accurate data before calculating</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
