import { Helmet } from "react-helmet-async";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ClipboardList, FileText, CheckCircle, Shield, Briefcase } from "lucide-react";

export default function LoanPreparation() {
  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>Loan Preparation Guide: Documents & Credit Review | Score Machine</title>
        <meta
          name="description"
          content="Prepare for loan reviews with organized documentation and structured credit insights. Score Machine helps create summaries and highlight general indicators. No approval or outcomes are guaranteed."
        />
        <link rel="canonical" href="https://scoremachine.com/loan-preparation" />
      </Helmet>

      <SiteHeader />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-emerald-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="text-center space-y-6">
            <Badge variant="secondary" className="bg-gradient-to-r from-blue-600/10 to-emerald-600/10 text-blue-600 border-blue-600/20">
              Loan Preparation
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
              Loan Preparation: Documents and Credit Review
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Organize supporting documents and structure credit analysis for clearer reviews and collaboration. Tools are informational and do not guarantee approvals.
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
                <Briefcase className="h-5 w-5 text-blue-600" />
                <span>Useful for loan packaging teams</span>
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
                <ClipboardList className="h-6 w-6 text-blue-600" />
                <CardTitle>Preparation Checklist</CardTitle>
              </div>
              <CardDescription>
                Common items to gather and review for loan packages and internal evaluation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                "Valid ID and business registration details",
                "Recent bank statements and income documentation",
                "Tax returns or P&L statements where applicable",
                "Credit report visibility and organized summary",
                "Explanation letters and supporting evidence as needed"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span>{item}</span>
                </div>
              ))}
              <p className="text-xs text-gray-500 pt-2">
                Items vary by lender and program. Checklist is informational only.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-purple-600" />
                <CardTitle>Organized Credit Review</CardTitle>
              </div>
              <CardDescription>Summaries and indicators for collaboration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">Client Summary PDF Export</p>
                  <p className="text-sm text-gray-600">Create concise summaries for loan packages and team review.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ClipboardList className="h-5 w-5 text-emerald-600 mt-0.5" />
                <div>
                  <p className="font-medium">Full Credit File Analysis</p>
                  <p className="text-sm text-gray-600">Organized categories and general indicators to support discussions.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold">What Is Loan Preparation?</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto mt-4">
              Loan preparation involves organizing required documents, clarifying financial information, and structuring credit insights for responsible reviews. Teams often gather IDs, registration details, bank statements, tax returns, and a clean credit summary. Score Machine helps produce concise summaries and organize indicators in the credit file. Tools are informational and do not guarantee approvals or outcomes.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Document Organization", desc: "Collect and store required items for loan packaging and underwriting." },
              { title: "Credit Summary", desc: "Present a clean, organized overview of report data and general indicators." },
              { title: "Collaboration", desc: "Share structured information for team reviews and discussions." },
              { title: "Eligibility Visibility", desc: "Highlight informational signals often referenced by professionals." },
              { title: "Clarity & Consistency", desc: "Use standardized summaries to reduce confusion during preparation." },
              { title: "Responsible Review", desc: "Support understanding without implying specific outcomes or approvals." },
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
              Answers to common questions about loan preparation and Score Machine’s Toolkit.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Does Score Machine guarantee loan approvals?</CardTitle>
                <CardDescription>No promises or guarantees</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">
                  No. Score Machine provides organizational tools and summaries to help teams prepare loan packages. Approval decisions are made by lenders and depend on program criteria, documentation, and risk assessment.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Which tools help with preparation?</CardTitle>
                <CardDescription>Summaries and analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">
                  Client Summary PDF export presents a concise snapshot of credit information. Full Credit File Analysis organizes categories and informational indicators. These tools support collaboration and understanding without implying outcomes.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Where can I learn more?</CardTitle>
                <CardDescription>Explore features and documentation</CardDescription>
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
                    <Link to="/pricing">Pricing</Link>
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
              <h2 className="text-3xl font-bold mb-3">Prepare Clear, Professional Loan Packages</h2>
              <p className="text-lg text-gray-600 mb-6">
                Create a free account to explore the Toolkit and export client summaries to support loan preparation and collaboration.
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
                Tools provide organizational insights only. No lending or approval outcomes are promised or guaranteed.
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
