import { Helmet } from "react-helmet-async";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Shield, TrendingUp, FileText, CheckCircle, LineChart, Users } from "lucide-react";

export default function BusinessFunding() {
  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>Business Funding Insights & Credit Analysis Tools | Score Machine</title>
        <meta
          name="description"
          content="Explore business funding readiness with structured credit analysis. Score Machine organizes credit insights, summaries, and underwriting overviews to support funding reviews. No funding approval or outcomes are guaranteed."
        />
        <link rel="canonical" href="https://scoremachine.com/business-funding" />
      </Helmet>

      <SiteHeader />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-emerald-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="text-center space-y-6">
            <Badge variant="secondary" className="bg-gradient-to-r from-blue-600/10 to-emerald-600/10 text-blue-600 border-blue-600/20">
              Business Funding
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
              Organized Credit Insights for Funding Reviews
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Support reviews for working capital, small business loans, lines of credit, and equipment financing with structured credit analysis and clear summaries. Tools are informational and do not guarantee outcomes.
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
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span>Used by funding teams and consultants</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-blue-600" />
                <CardTitle>How Score Machine Helps with Funding Reviews</CardTitle>
              </div>
              <CardDescription>
                Organize credit report information, identify general signals, and export clean summaries to support professional reviews.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5" />
                <div>
                  <p className="font-medium">Structured Credit File Analysis</p>
                  <p className="text-sm text-gray-600">Organized categories commonly referenced in reviews for clearer understanding.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5" />
                <div>
                  <p className="font-medium">Underwriting Overview</p>
                  <p className="text-sm text-gray-600">General overview of common criteria with informational indicators.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">Client Summary Export & PDF</p>
                  <p className="text-sm text-gray-600">Generate a concise summary for review packages and internal documentation.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <LineChart className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-medium">Progress Report & Score Timeline</p>
                  <p className="text-sm text-gray-600">Visualize changes in reported data and monitor trends over time.</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Funding Readiness Signals</CardTitle>
              <CardDescription>Informational items often reviewed by professionals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                "Credit utilization and limits",
                "Payment history and consistency",
                "Age of accounts and mix",
                "Public records visibility",
                "Recent inquiries and activity"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span>{item}</span>
                </div>
              ))}
              <p className="text-xs text-gray-500 pt-2">
                Indicators are informational and do not predict or guarantee funding approvals.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold">What Is Business Funding?</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto mt-4">
              Business funding refers to financing options such as working capital, term loans, lines of credit, SBA programs, equipment financing, and invoice financing. Lenders and partners typically review credit profiles, income documentation, and overall risk indicators. Score Machine helps organize credit insights that support responsible reviews. Tools are informational and cannot guarantee approvals or specific outcomes.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Term Loans", desc: "Fixed or variable-rate loans for expansion, equipment, or consolidation." },
              { title: "Business Lines of Credit", desc: "Flexible access to funds for short-term needs and cash flow management." },
              { title: "SBA Loans", desc: "Government-backed programs like 7(a) and 504 with eligibility requirements." },
              { title: "Equipment Financing", desc: "Specialized loans for purchasing machinery and business equipment." },
              { title: "Invoice Financing", desc: "Advance on receivables to improve liquidity and operations." },
              { title: "Working Capital", desc: "Short-term financing for operational expenses and growth initiatives." },
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto mt-4">
              Answers to common questions about business funding and how Score Machine supports organized reviews.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>How does credit analysis support business funding?</CardTitle>
                <CardDescription>Organized insights for responsible reviews</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">
                  Score Machine structures credit data into categories commonly referenced by professionals. The Toolkit includes Progress Report and Score Timeline, Full Credit File Analysis, and a Client Summary PDF export to help present information clearly. Tools are informational and do not guarantee any funding decisions.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Does Score Machine guarantee funding approvals?</CardTitle>
                <CardDescription>No promises or guarantees</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">
                  No. Score Machine is software for organizing and reviewing credit report information. Lenders make independent decisions based on their criteria. We do not guarantee approvals, outcomes, or changes to credit performance.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Who benefits from using Score Machine?</CardTitle>
                <CardDescription>Professionals, teams, and individuals</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">
                  Funding teams, consultants, and organized individuals use the Toolkit to prepare cleaner internal reviews and collaborative summaries. Structured insights can improve clarity but do not determine lender perception or outcomes.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Where can I learn more?</CardTitle>
                <CardDescription>Explore features and tools</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" asChild className="border-blue-600 text-blue-600">
                    <Link to="/features">Features</Link>
                  </Button>
                  <Button variant="outline" asChild className="border-blue-600 text-blue-600">
                    <Link to="/how-it-works">How It Works</Link>
                  </Button>
                  <Button variant="outline" asChild className="border-blue-600 text-blue-600">
                    <Link to="/funding-calculator">Funding Calculator</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-gradient-to-r from-blue-600/5 to-emerald-600/5 border-blue-600/20">
            <CardContent className="p-10 text-center">
              <h2 className="text-3xl font-bold mb-3">Start with Organized Credit Insights</h2>
              <p className="text-lg text-gray-600 mb-6">
                Create a free account to explore the Toolkit and prepare professional reviews with clean summaries and clear indicators.
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
                Tools provide organizational insights only. No lending or funding outcomes are promised or guaranteed.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="py-8 bg-gray-50 text-center px-4">
        <p className="text-xs text-gray-500 max-w-4xl mx-auto leading-relaxed">
          Score Machine provides software tools for organizing and reviewing credit report information. It does not promise credit improvement, funding approval, or specific financial outcomes.
        </p>
      </div>

      <Footer />
    </div>
  );
}
