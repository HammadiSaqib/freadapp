import { Helmet } from "react-helmet-async";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Shield, CreditCard, CheckCircle, BarChart3, Layers } from "lucide-react";

export default function ZeroPercentInterestCreditCards() {
  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>0% Interest Credit Cards: Promotional APRs & Readiness | Score Machine</title>
        <meta
          name="description"
          content="Learn about 0% interest credit cards and promotional APR offers for purchases or balance transfers. Use Score Machine to organize credit insights and create summaries for responsible reviews. No outcomes or approvals are guaranteed."
        />
        <link rel="canonical" href="https://scoremachine.com/0-percent-interest-credit-cards" />
      </Helmet>

      <SiteHeader />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-emerald-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="text-center space-y-6">
            <Badge variant="secondary" className="bg-gradient-to-r from-blue-600/10 to-emerald-600/10 text-blue-600 border-blue-600/20">
              0% Interest Credit Cards
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
              Promotional APRs and Credit Readiness
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Understand promotional APR offers for purchases and balance transfers. Score Machine helps organize credit data and export summaries for responsible reviews. Tools are informational and do not guarantee approvals or outcomes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white" asChild>
                <Link to="/register">Create a Free Account</Link>
              </Button>
              <Button size="lg" variant="outline" className="border-blue-600 text-blue-600" asChild>
                <Link to="/pricing">View Pricing</Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-6 pt-4 justify-center text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-600" />
                <span>No outcome guarantees</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold">What Are 0% Interest Credit Cards?</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto mt-4">
              Some credit cards offer promotional APRs with 0% interest for a limited time. Offers may apply to purchases, balance transfers, or both. Terms vary by issuer and are subject to change. Score Machine helps organize credit insights used in responsible reviews. Tools are informational and do not guarantee approvals or specific outcomes.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Promotional Purchases", desc: "Temporary 0% APR on new purchases during the intro period." },
              { title: "Balance Transfers", desc: "Promotional APRs on transferred balances, sometimes with transfer fees." },
              { title: "Intro Periods", desc: "Limited-time offers; duration and terms vary by issuer." },
              { title: "Deferred Interest", desc: "Certain promotions may accrue interest if balances remain after the period." },
              { title: "Eligibility Factors", desc: "Issuer decisions depend on criteria such as credit profile and risk." },
              { title: "Responsible Use", desc: "Evaluate total costs, fees, and repayment plans before using offers." },
            ].map((item, i) => (
              <Card key={i} className="shadow-sm">
                <CardHeader>
                  <CardTitle>{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-3">
                <CreditCard className="h-6 w-6 text-blue-600" />
                <CardTitle>Readiness Factors</CardTitle>
              </div>
              <CardDescription>
                Organize credit data to support responsible reviews of promotional APR offers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                "Credit utilization across revolving accounts",
                "On-time payment history and visibility of late payments",
                "Age of accounts and recent openings",
                "Derogatory marks and public records visibility",
                "Recent inquiries and lender activity",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span>{item}</span>
                </div>
              ))}
              <p className="text-xs text-gray-500 pt-2">
                Indicators are informational and do not predict or guarantee approvals or outcomes.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Layers className="h-6 w-6 text-purple-600" />
                <CardTitle>Toolkit Highlights</CardTitle>
              </div>
              <CardDescription>Organize data and export summaries</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <BarChart3 className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">Progress Report & Score Timeline</p>
                  <p className="text-sm text-gray-600">Visualize changes in reported data month-to-month.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-indigo-600 mt-0.5" />
                <div>
                  <p className="font-medium">Client Summary PDF Export</p>
                  <p className="text-sm text-gray-600">Create polished summaries for collaboration and documentation.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-gradient-to-r from-blue-600/5 to-emerald-600/5 border-blue-600/20">
            <CardContent className="p-10 text-center">
              <h2 className="text-3xl font-bold mb-3">Get Organized for Promotional APR Reviews</h2>
              <p className="text-lg text-gray-600 mb-6">
                Create a free account to explore the Toolkit and prepare clean summaries for responsible decision-making.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white" asChild>
                  <Link to="/register">Sign Up for Score Machine</Link>
                </Button>
                <Button size="lg" variant="outline" className="border-blue-600 text-blue-600" asChild>
                  <Link to="/pricing">See Plans</Link>
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-6">
                Tools provide organizational insights only. No approvals or outcomes are promised or guaranteed.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="py-8 bg-gray-50 text-center px-4">
        <p className="text-xs text-gray-500 max-w-4xl mx-auto leading-relaxed">
          Score Machine provides software tools for organizing and reviewing credit report information. It does not promise credit improvement, approvals, or specific financial outcomes.
        </p>
      </div>

      <Footer />
    </div>
  );
}
