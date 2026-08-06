import { Helmet } from "react-helmet-async";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Shield, ClipboardList, CheckCircle, BarChart3, Layers } from "lucide-react";

export default function CreditReadiness() {
  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>Credit Readiness Checklist & Insights | Score Machine</title>
        <meta
          name="description"
          content="Review credit readiness with structured insights. Score Machine helps organize credit data, highlight indicators, and export summaries to support responsible decision making. No outcomes are guaranteed."
        />
        <link rel="canonical" href="https://scoremachine.com/credit-readiness" />
      </Helmet>

      <SiteHeader />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-emerald-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="text-center space-y-6">
            <Badge variant="secondary" className="bg-gradient-to-r from-blue-600/10 to-emerald-600/10 text-blue-600 border-blue-600/20">
              Credit Readiness
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
              Credit Readiness Checklist and Structured Insights
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Organize the review of utilization, payment history, age of accounts, and inquiries. Insights are informational and support clearer understanding of credit data.
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

      <section className="py-16 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-3">
                <ClipboardList className="h-6 w-6 text-blue-600" />
                <CardTitle>Readiness Checklist</CardTitle>
              </div>
              <CardDescription>
                Structured items to review, organize, and discuss with clients or teams.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                "Credit utilization across revolving accounts",
                "On-time payment history and late payment visibility",
                "Age of accounts and overall credit mix",
                "Derogatory marks and public records visibility",
                "Recent inquiries and account openings"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span>{item}</span>
                </div>
              ))}
              <p className="text-xs text-gray-500 pt-2">
                Checklist is informational only and does not indicate approval or specific outcomes.
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
                <ClipboardList className="h-5 w-5 text-emerald-600 mt-0.5" />
                <div>
                  <p className="font-medium">Full Credit File Analysis</p>
                  <p className="text-sm text-gray-600">Review organized categories and general indicators.</p>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold">What Is Credit Readiness?</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto mt-4">
              Credit readiness refers to the general preparedness of a credit profile for reviews and responsible decision-making. Professionals typically look at utilization, payment history, age of accounts, credit mix, derogatory marks, and inquiries. Score Machine organizes these items into clear categories and exports concise summaries. Tools are informational and do not guarantee approvals or outcomes.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Utilization", desc: "Balance-to-limit ratios across revolving accounts and overall exposure." },
              { title: "Payment History", desc: "On-time payment consistency and visibility of late payments." },
              { title: "Age of Accounts", desc: "Average age, oldest tradelines, and recent account openings." },
              { title: "Credit Mix", desc: "Revolving vs. installment distribution and diversity of accounts." },
              { title: "Derogatory Marks", desc: "Collections, charge-offs, and public records visibility." },
              { title: "Inquiries", desc: "Recent hard pulls and lender activity patterns." },
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
              Answers to common questions about credit readiness and Score Machine’s Toolkit.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Does Score Machine guarantee improvements or approvals?</CardTitle>
                <CardDescription>No promises or guarantees</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">
                  No. Score Machine provides organizational insights and structured analysis of report data. We do not guarantee credit improvement, approvals, or specific outcomes. Decisions are made by lenders and depend on many factors.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>What tools help assess readiness?</CardTitle>
                <CardDescription>Structured review and exports</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">
                  Progress Report and Score Timeline help visualize changes in reported data. Full Credit File Analysis organizes categories and general indicators. Client Summary PDF creates polished summaries for collaboration and documentation.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Where should I start?</CardTitle>
                <CardDescription>Explore the platform</CardDescription>
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
              <h2 className="text-3xl font-bold mb-3">Get Organized with Readiness Insights</h2>
              <p className="text-lg text-gray-600 mb-6">
                Create a free account to review the Toolkit and prepare clear summaries for discussions and decision support.
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
                Tools provide organizational insights only. No lending, approval, or improvement outcomes are promised or guaranteed.
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
