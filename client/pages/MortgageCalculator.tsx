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
import { Home, ArrowRight, DollarSign, Percent, Calendar } from "lucide-react";

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

export default function MortgageCalculator() {
  const [homePrice, setHomePrice] = useState("450000");
  const [downPayment, setDownPayment] = useState("20");
  const [downPaymentIsPercent, setDownPaymentIsPercent] = useState(true);
  const [interestRate, setInterestRate] = useState("6.5");
  const [termYears, setTermYears] = useState("30");
  const [propertyTaxAnnual, setPropertyTaxAnnual] = useState("4800");
  const [homeInsuranceAnnual, setHomeInsuranceAnnual] = useState("1800");
  const [pmiRateAnnual, setPmiRateAnnual] = useState("0.5");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const results = useMemo(() => {
    const price = Math.max(0, parseNumber(homePrice));
    const dpRaw = Math.max(0, parseNumber(downPayment));
    const dpAmount = downPaymentIsPercent ? (price * dpRaw) / 100 : dpRaw;
    const loanAmount = Math.max(0, price - dpAmount);
    const years = Math.max(0, Math.floor(parseNumber(termYears)));
    const months = years * 12;
    const ratePct = Math.max(0, parseNumber(interestRate));
    const principalAndInterest = computeMonthlyPayment(loanAmount, ratePct, months);

    const taxMonthly = Math.max(0, parseNumber(propertyTaxAnnual)) / 12;
    const insuranceMonthly = Math.max(0, parseNumber(homeInsuranceAnnual)) / 12;

    const loanToValue = price > 0 ? loanAmount / price : 0;
    const pmiMonthly =
      loanToValue > 0.8 ? (loanAmount * (Math.max(0, parseNumber(pmiRateAnnual)) / 100)) / 12 : 0;

    const totalMonthly = principalAndInterest + taxMonthly + insuranceMonthly + pmiMonthly;

    return {
      price,
      dpAmount,
      loanAmount,
      months,
      years,
      ratePct,
      principalAndInterest,
      taxMonthly,
      insuranceMonthly,
      pmiMonthly,
      totalMonthly,
    };
  }, [homePrice, downPayment, downPaymentIsPercent, interestRate, termYears, propertyTaxAnnual, homeInsuranceAnnual, pmiRateAnnual]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Helmet>
        <title>Mortgage Calculator | Score Machine</title>
        <meta
          name="description"
          content="Estimate monthly mortgage payment including principal, interest, taxes, insurance, and PMI."
        />
      </Helmet>

      <SiteHeader />

      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center p-3 bg-blue-100 text-blue-700 rounded-full mb-5">
                <Home className="w-8 h-8" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-3">Mortgage Calculator</h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Estimate monthly mortgage payment including taxes, insurance, and PMI.
              </p>
              <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
                <Badge variant="secondary" className="bg-white text-black">
                  P&amp;I + Taxes + Insurance
                </Badge>
                <Badge variant="secondary" className="bg-white text-black">
                  PMI when down payment &lt; 20%
                </Badge>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="shadow-xl border-0 bg-white overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-blue-600 to-teal-600" />
                <CardHeader className="p-6">
                  <CardTitle className="text-xl text-slate-900 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-blue-700" />
                    Inputs
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="homePrice" className="text-slate-700">
                      Home price
                    </Label>
                    <Input
                      id="homePrice"
                      inputMode="decimal"
                      value={homePrice}
                      onChange={(e) => setHomePrice(e.target.value)}
                      placeholder="450000"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <Label htmlFor="downPayment" className="text-slate-700">
                        Down payment
                      </Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant={downPaymentIsPercent ? "default" : "outline"}
                          onClick={() => setDownPaymentIsPercent(true)}
                          className="h-8 px-3"
                        >
                          %
                        </Button>
                        <Button
                          type="button"
                          variant={!downPaymentIsPercent ? "default" : "outline"}
                          onClick={() => setDownPaymentIsPercent(false)}
                          className="h-8 px-3"
                        >
                          $
                        </Button>
                      </div>
                    </div>
                    <Input
                      id="downPayment"
                      inputMode="decimal"
                      value={downPayment}
                      onChange={(e) => setDownPayment(e.target.value)}
                      placeholder={downPaymentIsPercent ? "20" : "90000"}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mortgageRate" className="text-slate-700 flex items-center gap-2">
                        <Percent className="w-4 h-4" />
                        Interest rate (%)
                      </Label>
                      <Input
                        id="mortgageRate"
                        inputMode="decimal"
                        value={interestRate}
                        onChange={(e) => setInterestRate(e.target.value)}
                        placeholder="6.5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="termYears" className="text-slate-700 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Term (years)
                      </Label>
                      <Input
                        id="termYears"
                        inputMode="numeric"
                        value={termYears}
                        onChange={(e) => setTermYears(e.target.value)}
                        placeholder="30"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="propertyTax" className="text-slate-700">
                        Property tax (annual)
                      </Label>
                      <Input
                        id="propertyTax"
                        inputMode="decimal"
                        value={propertyTaxAnnual}
                        onChange={(e) => setPropertyTaxAnnual(e.target.value)}
                        placeholder="4800"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="insurance" className="text-slate-700">
                        Home insurance (annual)
                      </Label>
                      <Input
                        id="insurance"
                        inputMode="decimal"
                        value={homeInsuranceAnnual}
                        onChange={(e) => setHomeInsuranceAnnual(e.target.value)}
                        placeholder="1800"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pmiRate" className="text-slate-700">
                      PMI rate (annual %)
                    </Label>
                    <Input
                      id="pmiRate"
                      inputMode="decimal"
                      value={pmiRateAnnual}
                      onChange={(e) => setPmiRateAnnual(e.target.value)}
                      placeholder="0.5"
                    />
                  </div>

                  <div className="pt-2 flex gap-3 flex-wrap">
                    <Button asChild className="bg-gradient-to-r from-ocean-blue to-sea-green">
                      <Link to="/funding-calculator">
                        Funding Calculator <ArrowRight className="ml-2 w-4 h-4" />
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
                      <div className="text-sm text-black">Estimated total monthly payment</div>
                      <div className="text-2xl font-bold text-slate-900">{formatMoney(results.totalMonthly)}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-slate-200">
                        <div className="text-sm text-black">Loan amount</div>
                        <div className="text-lg font-semibold text-slate-900">{formatMoney(results.loanAmount)}</div>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-200">
                        <div className="text-sm text-slate-600">Down payment</div>
                        <div className="text-lg font-semibold text-slate-900">{formatMoney(results.dpAmount)}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-slate-200">
                        <div className="text-sm text-black">Principal &amp; interest</div>
                        <div className="text-lg font-semibold text-slate-900">
                          {formatMoney(results.principalAndInterest)}
                        </div>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-200">
                        <div className="text-sm text-black">PMI</div>
                        <div className="text-lg font-semibold text-slate-900">{formatMoney(results.pmiMonthly)}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-slate-200">
                        <div className="text-sm text-black">Taxes</div>
                        <div className="text-lg font-semibold text-slate-900">{formatMoney(results.taxMonthly)}</div>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-200">
                        <div className="text-sm text-black">Insurance</div>
                        <div className="text-lg font-semibold text-slate-900">{formatMoney(results.insuranceMonthly)}</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200">
                      <div className="text-sm text-slate-600">Term</div>
                      <div className="text-lg font-semibold text-slate-900">{results.years} years</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <section className="mt-12 space-y-6 text-slate-800">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h2 className="text-2xl font-bold text-slate-900">Mortgage Calculator: Your Complete Guide to Smarter Home Buying</h2>
                <p>
                  Buying a home ranks among the biggest financial decisions you will ever make. The numbers can feel overwhelming when
                  you start looking at house prices, interest rates, and monthly payments. That nervous feeling in your stomach when
                  you wonder whether you can actually afford that dream house? Completely normal.
                </p>
                <p>
                  A mortgage calculator takes away that uncertainty. This straightforward tool shows you exactly what you will pay
                  each month before you sign anything. No surprises. No guesswork. Just clear numbers you can trust.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">What Is a Mortgage Calculator?</h3>
                <p>
                  A mortgage calculator is a free online tool that estimates your monthly home loan payments. You enter basic
                  information about the loan, and it instantly shows what you will owe each month.
                </p>
                <p>
                  Think of it as a financial preview. Before you commit to a 30-year relationship with a lender, you get to see
                  exactly what that commitment looks like in real dollars.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">How This Simple Tool Saves You Thousands</h3>
                <p>
                  Here is something most first-time buyers miss: a small difference in interest rates creates massive differences in
                  total cost. We are talking tens of thousands of dollars over the life of your loan.
                </p>
                <p>
                  A mortgage calculator lets you compare different scenarios instantly. You can test a 15-year loan against a 30-year
                  loan. You can see how a larger down payment reduces your monthly burden. This knowledge puts you in control during
                  negotiations.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">How to Use a Mortgage Calculator</h3>
                <p>
                  Using a mortgage calculator takes about two minutes. The process is simple, but getting accurate results requires
                  accurate inputs.
                </p>
                <div className="space-y-2">
                  <p className="font-semibold text-slate-900">Essential Information You Need to Enter</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Home price: The total purchase price of the property</li>
                    <li>Down payment: The upfront amount you will pay (usually 5% to 20%)</li>
                    <li>Loan term: How long you will take to repay (typically 15 or 30 years)</li>
                    <li>Interest rate: The annual percentage rate your lender charges</li>
                    <li>Property taxes: Annual taxes based on your location</li>
                    <li>Homeowners insurance: Required coverage protecting your investment</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-slate-900">Understanding Your Results</p>
                  <p>
                    Your calculator will display several important numbers. The monthly payment shows your regular obligation to the
                    lender. The total interest paid reveals how much extra you pay beyond the home price. Some calculators also show an
                    amortization schedule breaking down each payment over time.
                  </p>
                  <p>
                    Pay close attention to that total interest figure. It often shocks first-time buyers when they realize they might
                    pay nearly as much in interest as the actual home costs.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Key Factors That Affect Your Mortgage Payment</h3>
                <p>
                  Several variables determine what you will pay each month. Understanding these factors helps you make smarter
                  decisions.
                </p>
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-slate-900">Interest Rates Matter More Than You Think</p>
                    <p>
                      Even half a percentage point changes everything. On a $300,000 loan, the difference between 6% and 6.5% interest
                      adds up to roughly $30,000 over 30 years.
                    </p>
                    <p>
                      Current rates fluctuate based on economic conditions, Federal Reserve decisions, and your personal credit score.
                      Checking rates from multiple lenders before committing always pays off.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Loan Term Options Explained</p>
                    <p>The two most common options are 15-year and 30-year mortgages.</p>
                    <p>
                      A 30-year mortgage offers lower monthly payments but costs significantly more in total interest. A 15-year
                      mortgage has higher monthly payments but saves you money long-term and builds equity faster.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Down Payment Impact</p>
                    <p>
                      Larger down payments reduce your loan amount, which lowers monthly payments. Putting down 20% or more also
                      eliminates private mortgage insurance (PMI)—an extra monthly cost that protects the lender, not you.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Types of Mortgages You Should Know</h3>
                <p>Different mortgage types suit different financial situations. Choose wisely based on your plans and risk tolerance.</p>
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-slate-900">Fixed-Rate Mortgages</p>
                    <p>
                      Your interest rate stays identical throughout the entire loan. Monthly payments never change. This predictability
                      makes budgeting easier and protects you from rising rates.
                    </p>
                    <p>Most buyers prefer fixed-rate mortgages for their stability and peace of mind.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Adjustable-Rate Mortgages</p>
                    <p>
                      These start with lower rates that change periodically based on market conditions. Your payment could increase or
                      decrease over time.
                    </p>
                    <p>
                      Adjustable-rate mortgages work well for buyers who plan to sell or refinance within a few years. They carry more
                      risk for long-term homeowners.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Hidden Costs Beyond Your Monthly Payment</h3>
                <p>Your mortgage payment represents just one piece of homeownership costs. Budget for these additional expenses:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Property taxes: Vary significantly by location</li>
                  <li>Homeowners insurance: Required by all lenders</li>
                  <li>PMI: Required if down payment falls below 20%</li>
                  <li>HOA fees: Common in condos and planned communities</li>
                  <li>Maintenance costs: Typically 1% to 2% of home value annually</li>
                </ul>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Tips for Getting the Best Mortgage Deal</h3>
                <p>Follow these strategies to secure favorable terms:</p>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Check your credit score before applying and fix any errors</li>
                  <li>Compare offers from at least three different lenders</li>
                  <li>Consider paying points to lower your interest rate</li>
                  <li>Save for a larger down payment if possible</li>
                  <li>Get pre-approved before house hunting</li>
                </ol>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Conclusion</h3>
                <p>
                  A mortgage calculator transforms confusing home financing into clear, actionable numbers. This simple tool empowers
                  you to compare options, plan your budget, and negotiate confidently with lenders.
                </p>
                <p>
                  Before you fall in love with any property, run the numbers first. Understanding exactly what you can afford prevents
                  heartbreak and financial stress later. Your future self will thank you for taking these few minutes to calculate
                  wisely.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Frequently Asked Questions</h3>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-900">1. How accurate are mortgage calculators?</p>
                    <p>
                      Mortgage calculators provide reliable estimates based on the information you enter. Final payments may vary
                      slightly depending on exact closing costs, tax assessments, and lender fees.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-900">2. Should I include property taxes in my mortgage calculation?</p>
                    <p>
                      Yes, always include property taxes and insurance for a complete picture. Many lenders collect these through
                      escrow accounts as part of your monthly payment.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-900">3. What credit score do I need for a good mortgage rate?</p>
                    <p>
                      Scores above 740 typically qualify for the best rates. Scores between 620 and 740 still qualify but may receive
                      higher rates. Below 620, options become limited.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-900">4. How much house can I realistically afford?</p>
                    <p>
                      Most financial experts recommend keeping total housing costs below 28% of your gross monthly income. A mortgage
                      calculator helps you find this comfortable range.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-900">5. Can I trust online mortgage calculators?</p>
                    <p>
                      Reputable financial websites provide accurate calculators. However, always verify final numbers with your actual
                      lender before making commitments.
                    </p>
                  </div>
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
