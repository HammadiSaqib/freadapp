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
import { Car, ArrowRight, DollarSign, Percent, Calendar } from "lucide-react";

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

export default function CarLoanCalculator() {
  const [vehiclePrice, setVehiclePrice] = useState("32000");
  const [downPayment, setDownPayment] = useState("3000");
  const [tradeIn, setTradeIn] = useState("0");
  const [salesTaxPercent, setSalesTaxPercent] = useState("7.5");
  const [fees, setFees] = useState("600");
  const [interestRate, setInterestRate] = useState("8.0");
  const [termMonths, setTermMonths] = useState("72");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const results = useMemo(() => {
    const price = Math.max(0, parseNumber(vehiclePrice));
    const dp = Math.max(0, parseNumber(downPayment));
    const trade = Math.max(0, parseNumber(tradeIn));
    const taxPct = Math.max(0, parseNumber(salesTaxPercent));
    const feeAmount = Math.max(0, parseNumber(fees));
    const months = Math.max(0, Math.floor(parseNumber(termMonths)));
    const ratePct = Math.max(0, parseNumber(interestRate));

    const taxableBase = Math.max(0, price - trade);
    const taxAmount = (taxableBase * taxPct) / 100;

    const amountBeforeDown = taxableBase + taxAmount + feeAmount;
    const loanAmount = Math.max(0, amountBeforeDown - dp);

    const monthlyPayment = computeMonthlyPayment(loanAmount, ratePct, months);
    const totalPaid = monthlyPayment * months;
    const totalInterest = Math.max(0, totalPaid - loanAmount);

    return {
      price,
      dp,
      trade,
      taxAmount,
      feeAmount,
      loanAmount,
      months,
      monthlyPayment,
      totalPaid,
      totalInterest,
    };
  }, [vehiclePrice, downPayment, tradeIn, salesTaxPercent, fees, interestRate, termMonths]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Helmet>
        <title>Car Loan Calculator | Score Machine</title>
        <meta
          name="description"
          content="Estimate car loan amount and monthly payment including sales tax and fees."
        />
      </Helmet>

      <SiteHeader />

      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center p-3 bg-amber-100 text-amber-700 rounded-full mb-5">
                <Car className="w-8 h-8" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-3">Car Loan Calculator</h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Estimate loan amount and monthly payment including sales tax, trade-in, and fees.
              </p>
              <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
                <Badge variant="secondary" className="bg-white text-black">
                  Loan amount
                </Badge>
                <Badge variant="secondary" className="bg-white text-black">
                  Monthly payment
                </Badge>
                <Badge variant="secondary" className="bg-white text-black">
                  Total interest
                </Badge>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="shadow-xl border-0 bg-white overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-amber-600 to-teal-600" />
                <CardHeader className="p-6">
                  <CardTitle className="text-xl text-slate-900 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-amber-700" />
                    Inputs
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="vehiclePrice" className="text-slate-700">
                      Vehicle price
                    </Label>
                    <Input
                      id="vehiclePrice"
                      inputMode="decimal"
                      value={vehiclePrice}
                      onChange={(e) => setVehiclePrice(e.target.value)}
                      placeholder="32000"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="downPayment" className="text-slate-700">
                        Down payment
                      </Label>
                      <Input
                        id="downPayment"
                        inputMode="decimal"
                        value={downPayment}
                        onChange={(e) => setDownPayment(e.target.value)}
                        placeholder="3000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tradeIn" className="text-slate-700">
                        Trade-in value
                      </Label>
                      <Input
                        id="tradeIn"
                        inputMode="decimal"
                        value={tradeIn}
                        onChange={(e) => setTradeIn(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="salesTax" className="text-slate-700 flex items-center gap-2">
                        <Percent className="w-4 h-4" />
                        Sales tax (%)
                      </Label>
                      <Input
                        id="salesTax"
                        inputMode="decimal"
                        value={salesTaxPercent}
                        onChange={(e) => setSalesTaxPercent(e.target.value)}
                        placeholder="7.5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fees" className="text-slate-700">
                        Fees
                      </Label>
                      <Input
                        id="fees"
                        inputMode="decimal"
                        value={fees}
                        onChange={(e) => setFees(e.target.value)}
                        placeholder="600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="carRate" className="text-slate-700 flex items-center gap-2">
                        <Percent className="w-4 h-4" />
                        Interest rate (%)
                      </Label>
                      <Input
                        id="carRate"
                        inputMode="decimal"
                        value={interestRate}
                        onChange={(e) => setInterestRate(e.target.value)}
                        placeholder="8.0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="carTerm" className="text-slate-700 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Term (months)
                      </Label>
                      <Input
                        id="carTerm"
                        inputMode="numeric"
                        value={termMonths}
                        onChange={(e) => setTermMonths(e.target.value)}
                        placeholder="72"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex gap-3 flex-wrap">
                    <Button asChild className="bg-gradient-to-r from-ocean-blue to-sea-green">
                      <Link to="/mortgage-calculator">
                        Mortgage Calculator <ArrowRight className="ml-2 w-4 h-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link to="/funding-calculator">Funding Calculator</Link>
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
                      <div className="text-2xl font-bold text-slate-900">{formatMoney(results.monthlyPayment)}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-slate-200">
                        <div className="text-sm text-black">Loan amount</div>
                        <div className="text-lg font-semibold text-slate-900">{formatMoney(results.loanAmount)}</div>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-200">
                        <div className="text-sm text-slate-600">Sales tax</div>
                        <div className="text-lg font-semibold text-slate-900">{formatMoney(results.taxAmount)}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-slate-200">
                        <div className="text-sm text-black">Total interest</div>
                        <div className="text-lg font-semibold text-slate-900">{formatMoney(results.totalInterest)}</div>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-200">
                        <div className="text-sm text-black">Total paid</div>
                        <div className="text-lg font-semibold text-slate-900">{formatMoney(results.totalPaid)}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-slate-200">
                        <div className="text-sm text-slate-600">Down payment</div>
                        <div className="text-lg font-semibold text-slate-900">{formatMoney(results.dp)}</div>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-200">
                        <div className="text-sm text-slate-600">Fees</div>
                        <div className="text-lg font-semibold text-slate-900">{formatMoney(results.feeAmount)}</div>
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
                <h2 className="text-2xl font-bold text-slate-900">
                  Car Loan Calculator: Your Essential Guide to Affordable Auto Financing
                </h2>
                <p>
                  Walking into a car dealership without knowing your numbers puts you at a serious disadvantage. Salespeople love buyers who focus on shiny features rather than monthly payments. That excitement about a new car can quickly turn into financial regret when reality hits.
                </p>
                <p>
                  A car loan calculator flips the script in your favor. This free tool shows exactly what any vehicle will cost you monthly before you set foot on a dealer lot. Knowledge truly equals power when negotiating auto financing.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">What Is a Car Loan Calculator?</h3>
                <p>
                  A car loan calculator estimates your monthly auto payments based on the loan amount, interest rate, and repayment term. You plug in a few numbers and instantly see what owning that specific car actually costs.
                </p>
                <p>No complicated math required. No spreadsheets. Just quick answers that help you shop smarter.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Why Every Car Buyer Needs This Tool</h3>
                <p>
                  Dealers often stretch loan terms to make expensive cars appear affordable. That $500 monthly payment sounds reasonable until you realize you are paying for 84 months.
                </p>
                <p>
                  A car loan calculator reveals the true cost behind those attractive payment offers. You see total interest paid, not just monthly amounts. This complete picture prevents costly mistakes that haunt buyers for years.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">How to Use a Car Loan Calculator</h3>
                <p>Using this tool takes less than a minute. Accuracy depends on entering realistic numbers based on your actual situation.</p>
                <h4 className="text-lg font-semibold text-slate-900">Information You Need to Enter</h4>
                <p>Most car loan calculators require these inputs:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Vehicle price: Total cost including taxes and fees</li>
                  <li>Down payment: Cash you pay upfront</li>
                  <li>Trade-in value: Credit from your current vehicle</li>
                  <li>Interest rate: Annual percentage rate from your lender</li>
                  <li>Loan term: Repayment period in months</li>
                </ul>
                <h4 className="text-lg font-semibold text-slate-900">Reading Your Results Correctly</h4>
                <p>
                  Your calculator displays several key figures. The monthly payment shows your regular obligation. Total interest reveals extra money going to the lender. Total loan cost combines principal and interest together.
                </p>
                <p>
                  That total interest number often surprises people. A $30,000 car can easily cost $35,000 or more after interest charges accumulate.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Factors That Determine Your Car Payment</h3>
                <p>Several variables affect what you pay each month. Understanding these helps you negotiate better terms.</p>

                <h4 className="text-lg font-semibold text-slate-900">Interest Rates and Credit Scores</h4>
                <p>
                  Your credit score directly impacts your interest rate. Excellent credit (above 750) earns rates around 5% to 7%. Poor credit (below 600) might mean rates exceeding 15% or higher.
                </p>
                <p>Improving your credit before buying saves substantial money over the loan term.</p>

                <h4 className="text-lg font-semibold text-slate-900">Loan Term Length</h4>
                <p>
                  Shorter loans mean higher monthly payments but less total interest. Longer loans reduce monthly burden but cost significantly more overall.
                </p>
                <p>
                  Most experts recommend keeping car loans at 60 months or less. Anything longer usually indicates the car costs more than you should spend.
                </p>

                <h4 className="text-lg font-semibold text-slate-900">Down Payment Benefits</h4>
                <p>
                  Larger down payments reduce your loan amount immediately. This lowers monthly payments and total interest paid. Aim for at least 10% to 20% down when possible.
                </p>
                <p>
                  A solid down payment also prevents going underwater—owing more than the car is worth.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">New Car vs Used Car Loans</h3>
                <p>New and used cars come with different financing realities.</p>
                <p>
                  New car loans typically offer lower interest rates because lenders consider new vehicles less risky. However, new cars depreciate rapidly, losing value the moment you drive away.
                </p>
                <p>
                  Used car loans often carry slightly higher rates but involve smaller loan amounts. A reliable used car can provide excellent value while keeping payments manageable.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Smart Tips for Better Car Loan Deals</h3>
                <p>Follow these strategies to secure favorable auto financing:</p>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>Check your credit report and fix errors before applying</li>
                  <li>Get pre-approved from your bank or credit union first</li>
                  <li>Compare offers from multiple lenders</li>
                  <li>Negotiate the total price before discussing monthly payments</li>
                  <li>Avoid unnecessary add-ons that inflate your loan</li>
                </ol>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Conclusion</h3>
                <p>
                  A car loan calculator puts control back in your hands during the car buying process. This simple tool exposes the true cost of any vehicle and helps you make decisions based on facts rather than emotions.
                </p>
                <p>
                  Before visiting any dealership, run your numbers first. Knowing exactly what you can afford transforms you from easy target into confident negotiator. Your wallet will definitely appreciate the preparation.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Frequently Asked Questions</h3>
                <div className="space-y-4">
                  <div>
                    <p className="font-semibold text-slate-900">1. What is a good interest rate for a car loan?</p>
                    <p>Rates between 4% and 7% are considered good for buyers with strong credit. Rates above 10% suggest exploring ways to improve your credit first.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">2. How much should I put down on a car?</p>
                    <p>Financial experts recommend 10% to 20% down. Larger down payments reduce monthly costs and prevent owing more than the car is worth.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">3. Is a longer loan term better?</p>
                    <p>Longer terms lower monthly payments but increase total interest paid. Keep loans at 60 months or less for best financial outcomes.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">4. Should I finance through the dealer or my bank?</p>
                    <p>Compare both options. Banks and credit unions often offer better rates, but dealers occasionally provide promotional financing worth considering.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">5. Can I use a car loan calculator for used cars?</p>
                    <p>Absolutely. Car loan calculators work for any vehicle. Just enter the used car price and expected interest rate for accurate estimates.</p>
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
