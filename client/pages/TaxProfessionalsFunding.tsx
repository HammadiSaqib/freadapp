import { Helmet } from "react-helmet-async";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Shield, Briefcase, CheckCircle, BarChart3, Layers } from "lucide-react";

export default function TaxProfessionalsFunding() {
  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>Tax Professionals Funding: Lines of Credit, Working Capital & Readiness | Score Machine</title>
        <meta
          name="description"
          content="Explore funding options for tax professionals and small firms. Score Machine organizes credit insights and creates summaries to support responsible reviews. No approvals or outcomes are guaranteed."
        />
        <link rel="canonical" href="https://scoremachine.com/tax-professionals-funding" />
      </Helmet>

      <SiteHeader />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-emerald-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="text-center space-y-6">
            <Badge variant="secondary" className="bg-gradient-to-r from-blue-600/10 to-emerald-600/10 text-blue-600 border-blue-600/20">
              Tax Professionals Funding
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
              Funding Options and Credit Readiness for Tax Pros
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Lines of credit, working capital, equipment financing, and SBA microloans may be used by tax professionals and small firms. Score Machine helps organize credit insights, summarize information, and support responsible reviews. Tools are informational and do not guarantee approvals or outcomes.
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
                <span>Useful for seasonal cash flow planning</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold">Funding Options for Tax Professionals</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto mt-4">
              Options vary by program and lender. Evaluate total costs, eligibility, and documentation requirements. Score Machine helps present organized credit summaries for internal review and collaboration.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Business Lines of Credit", desc: "Flexible access to funds for seasonal expenses and operations." },
              { title: "Working Capital", desc: "Short-term financing for payroll, marketing, and technology upgrades." },
              { title: "Equipment Financing", desc: "Tools, computers, and office upgrades for tax preparation workflows." },
              { title: "SBA Microloans", desc: "Smaller loans with specific eligibility criteria and documentation." },
              { title: "Invoice Financing", desc: "Advance on outstanding invoices to improve cash flow." },
              { title: "Term Loans", desc: "Fixed or variable-rate financing for expansion and investments." },
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
                <Layers className="h-6 w-6 text-purple-600" />
                <CardTitle>How Score Machine Helps</CardTitle>
              </div>
              <CardDescription>
                Organize credit report data, highlight general indicators, and export clean summaries.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                "Full Credit File Analysis with organized categories",
                "Progress Report and Score Timeline visualization",
                "Client Summary PDF export for loan packages",
                "Informational indicators for readiness discussion",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span>{item}</span>
                </div>
              ))}
              <p className="text-xs text-gray-500 pt-2">
                Tools are informational and do not predict or guarantee approvals or outcomes.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                <CardTitle>Getting Started</CardTitle>
              </div>
              <CardDescription>Explore the platform and tools</CardDescription>
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
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-gradient-to-r from-blue-600/5 to-emerald-600/5 border-blue-600/20">
            <CardContent className="p-10 text-center">
              <h2 className="text-3xl font-bold mb-3">Organize Readiness and Prepare Clean Summaries</h2>
              <p className="text-lg text-gray-600 mb-6">
                Create a free account to explore the Toolkit and prepare informational summaries for responsible reviews.
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
