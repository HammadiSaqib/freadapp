import SiteHeader from "@/components/SiteHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Shield, Brain, FileText, TrendingUp, Zap, Users, BarChart3, CheckCircle, ArrowRight, Star, Award, Target, Lock, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";

export default function Features() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <SiteHeader />

      {/* Enhanced Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-white to-emerald-50/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/20 via-transparent to-transparent" />
        
        <div className="relative container mx-auto px-4">
          <div className="text-center max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-ocean-blue/10 to-sea-green/10 rounded-full px-4 py-2 mb-6">
              <Award className="h-4 w-4 text-ocean-blue" />
              <span className="text-sm font-medium text-ocean-blue">Elite Credit Strategy Toolkit</span>
            </div>
            
            <h1 className="pb-5 text-5xl lg:text-6xl font-bold tracking-tight leading-snug bg-gradient-to-r from-gray-900 via-ocean-blue to-sea-green bg-clip-text text-transparent mb-6">
              Advanced Tools for Smarter Credit Understanding
            </h1>
            
            <p className="text-xl text-gray-600 leading-relaxed max-w-4xl mx-auto mb-8">
              Designed for credit professionals, consultants, and individuals who want clearer insights using structured analytics and AI-enhanced tools.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button size="lg" className="bg-gradient-to-r from-ocean-blue to-sea-green hover:shadow-lg transition-all duration-300 transform hover:scale-105" asChild>
                <Link to="/register" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Create a Free Account
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-ocean-blue text-ocean-blue bg-transparent hover:bg-transparent hover:text-ocean-blue hover:border-ocean-blue transition-colors" asChild>
                <Link to="/pricing" className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" /> View Pricing Plans
                </Link>
              </Button>
            </div>

            {/* Value Proposition */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-100">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left">
                  <div className="text-3xl font-bold text-gray-900 mb-2">Included Toolkit</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-sea-green mb-2">Starting at $197</div>
                  <div className="text-gray-600">Monthly subscription</div>
                </div>
                <div className="flex items-center gap-2 text-ocean-blue">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">No Setup Fees</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Features Grid */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Your Complete Credit Toolkit</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Professional-grade tools designed to help organize, evaluate, and better understand credit information.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: TrendingUp,
                title: "Progress Report with Score Timeline",
                description: "Visualize month-to-month changes in reported credit data for clearer understanding.",
                color: "from-blue-500 to-blue-600",
                features: ["Timeline visualization", "Display of data changes", "Structured view of report variations"]
              },
              {
                icon: FileText,
                title: "Client Summary Export & PDF Download",
                description: "Generate a clean, organized summary of credit data in a downloadable PDF.",
                color: "from-emerald-500 to-emerald-600",
                features: ["Professional formatting", "Summary export", "Client-ready reporting"]
              },
              {
                icon: Brain,
                title: "Full AI Credit File Analysis",
                description: "Organize report data into categories commonly reviewed by lenders. AI-assisted features organize information but do not guarantee accuracy, outcomes, or lender perception.",
                color: "from-purple-500 to-purple-600",
                features: ["Structured breakdown of report sections", "Pattern detection", "General insight identification"]
              },
              {
                icon: Shield,
                title: "Underwriting Overview",
                description: "General overview of factors commonly referenced by lenders. Not a guarantee of credit approval, funding approval, or any specific financial outcome.",
                color: "from-orange-500 to-orange-600",
                features: ["General indicator overview", "High-level criteria review", "Not a prediction or guarantee"]
              }
            ].map((feature, index) => (
              <Card key={index} className="group hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 border-0 shadow-lg overflow-hidden relative h-full">
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                
                <CardHeader className="pb-6 relative">
                  {/* Icon */}
                  <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300 shadow-lg`}>
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  
                  <CardTitle className="text-xl font-bold text-gray-900 mb-3">{feature.title}</CardTitle>
                  <CardDescription className="text-gray-600 leading-relaxed break-words min-w-0 max-h-24 overflow-hidden">{feature.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="pt-0 mt-auto">
                  <div className="space-y-2">
                    {feature.features.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-600 break-words">
                        <CheckCircle className="h-4 w-4 text-sea-green" />
                        <span className="min-w-0">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Features Section */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Plus These Powerful Features</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Tools designed to support clearer review and better organization of credit information.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
            {[
              { icon: Zap, title: "Lightning Fast Processing", desc: "Get results in seconds, not hours" },
              { icon: Lock, title: "Enterprise-Grade Security", desc: "Your data is protected with enterprise encryption" },
              { icon: Users, title: "Multi-Client Management", desc: "Handle unlimited clients with ease" },
              { icon: Sparkles, title: "AI-Assisted Insights", desc: "Smart suggestions and credit insights powered by AI" },
              { icon: BarChart3, title: "Advanced Analytics", desc: "Deep insights and performance metrics" },
              { icon: Target, title: "Goal Tracking", desc: "Personal tracking features within the platform for general organizational use" }
            ].map((feature, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border border-slate-200 shadow-md bg-white rounded-2xl overflow-hidden h-full flex">
                <CardHeader className="text-center pb-4 flex flex-col items-center gap-2 flex-1">
                  <div className="mx-auto w-12 h-12 bg-gradient-to-br from-ocean-blue to-sea-green rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-lg font-semibold text-gray-900 break-words min-w-0">{feature.title}</CardTitle>
                  <CardDescription className="text-gray-600 text-sm leading-snug break-words min-w-0 max-h-12 overflow-hidden">
                    {feature.desc}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Value Summary */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="relative overflow-hidden border-0 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-ocean-blue via-sea-green to-ocean-blue" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/5 to-black/20" />
              
              <CardContent className="relative p-12 text-center text-white">
                <div className="mb-8">
                  <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2 mb-6">
                    <Star className="h-4 w-4" />
                    <span className="text-sm font-medium">Complete Package</span>
                  </div>
                  
                  <h3 className="text-3xl lg:text-4xl font-bold mb-4">
                    Included Toolkit
                  </h3>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                  <Button size="lg" variant="secondary" className="bg-white text-ocean-blue hover:bg-gray-50 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105" asChild>
                    <Link to="/register" className="flex items-center gap-2">
                      Get Started Today <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="border-white/30 text-black hover:bg-white/10 backdrop-blur-sm" asChild>
                    <Link to="/pricing">View All Plans</Link>
                  </Button>
                </div>
                
                <div className="flex flex-col items-center justify-center gap-2 text-sm text-white/80 mt-6">
                  <p>Create a free account—no credit card required. Limited access included.</p>
                  <p>Full report pulls and complete report visibility are billed individually.</p>
                  <p>Cancel anytime.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      <div className="bg-white py-8 px-4 border-t border-gray-100">
        <div className="container mx-auto max-w-4xl text-center">
          <p className="text-xs text-gray-500 leading-relaxed">
            The Score Machine may not be used to make eligibility, approval, denial, or onboarding decisions for credit, employment, insurance, or housing.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
