import SiteHeader from '@/components/SiteHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Footer from '@/components/Footer';
import { CheckCircle, Play, Sparkles, ArrowRight, Shield, Brain, FileText, TrendingUp, Users, Zap, Target, BarChart3 } from 'lucide-react';

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <SiteHeader />

      {/* Hero Section --- Enhanced */}
      <section className="relative overflow-hidden py-20 lg:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-white to-emerald-50/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/20 via-transparent to-transparent" />
        
        <div className="relative container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-ocean-blue/10 to-sea-green/10 rounded-full px-4 py-2 mb-6">
              <Sparkles className="h-4 w-4 text-ocean-blue" />
              <span className="text-sm font-medium text-ocean-blue">AI-Powered Credit Enhancement</span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-ocean-blue to-sea-green bg-clip-text text-transparent mb-6">
              Transform Your Credit Journey
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto mb-8">
              Experience the most advanced AI-driven credit enhancement platform. From analysis to action, 
              we guide you through every step with precision, compliance, and clear insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-gradient-to-r from-ocean-blue to-sea-green hover:shadow-lg transition-all duration-300 transform hover:scale-105" asChild>
                <a href="/register" className="flex items-center gap-2">
                  Start Your Journey <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="border-ocean-blue text-ocean-blue" asChild>
                <a href="/pricing">View Pricing Plans</a>
              </Button>
            </div>
          </div>

          {/* Feature Preview Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              { icon: Users, title: "Smart Onboarding", desc: "Streamlined client setup with intelligent goal configuration" },
              { icon: Brain, title: "AI Guidance", desc: "Machine learning organizes and highlights key areas of focus for your review" },
              { icon: Sparkles, title: "AI-Assisted Insights", desc: "Smart suggestions and credit insights powered by AI" },
              { icon: BarChart3, title: "Real-time Analytics", desc: "Track progress with detailed insights and reporting" }
            ].map((feature, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-12 h-12 bg-gradient-to-br from-ocean-blue to-sea-green rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-lg font-semibold text-gray-900">{feature.title}</CardTitle>
                  <CardDescription className="text-gray-600 leading-relaxed">{feature.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Steps - Enhanced */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How The Capsol Works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Four simple steps to transform your credit profile with AI-powered precision
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-4 gap-8 relative">
              {/* Connection Lines for Desktop */}
              <div className="hidden lg:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-ocean-blue via-sea-green to-ocean-blue opacity-20" />
              
              {[
                {
                  step: "01",
                  icon: Play,
                  title: "Create Your Account",
                  subtitle: "Get started in seconds",
                  description: "Sign up instantly and unlock precision-powered credit reporting with our streamlined onboarding process.",
                  color: "from-blue-500 to-blue-600"
                },
                {
                  step: "02", 
                  icon: Target,
                  title: "Choose Your Plan",
                  subtitle: "Flexible pricing options",
                  description: "Select from our transparent pricing starting at $197.00 per pull, or choose unlimited access for maximum value.",
                  color: "from-emerald-500 to-emerald-600"
                },
                {
                  step: "03",
                  icon: Zap,
                  title: "Connect & Import",
                  subtitle: "Automated data integration",
                  description: "Enter client information and connect MyFreeScoreNow for secure, automatic report pulling with full compliance.",
                  color: "from-purple-500 to-purple-600"
                },
                {
                  step: "04",
                  icon: TrendingUp,
                  title: "Get Results",
                  subtitle: "Instant insights & action",
                  description: "Receive comprehensive report breakdowns, score progress tracking, and informational credit readiness insights immediately.",
                  color: "from-orange-500 to-orange-600",
                  disclaimer: "Insights are informational only and do not guarantee credit approval, funding, or specific financial outcomes."
                }
              ].map((step, index) => (
                <div key={index} className="relative group">
                  <Card className="h-full hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 border-0 shadow-lg overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                    
                    <CardHeader className="text-center pb-6 relative">
                      {/* Step Number */}
                      <div className="absolute top-3 right-3 w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-lg font-bold text-gray-700">{step.step}</span>
                      </div>
                      
                      {/* Icon */}
                      <div className={`mx-auto w-16 h-16 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300 shadow-lg`}>
                        <step.icon className="h-8 w-8 text-white" />
                      </div>
                      
                      <CardTitle className="text-xl font-bold text-gray-900 mb-2">{step.title}</CardTitle>
                      <div className="text-sm font-medium text-ocean-blue mb-4">{step.subtitle}</div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <p className="text-gray-600 leading-relaxed text-center">{step.description}</p>
                      {(step as any).disclaimer && (
                        <p className="text-xs text-gray-500 mt-4 text-center italic border-t pt-2 border-gray-100">
                          {(step as any).disclaimer}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="relative overflow-hidden border-0 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-ocean-blue via-sea-green to-ocean-blue" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/5 to-black/20" />
              
              <CardContent className="relative p-12 text-center text-white">
                <div className="mb-8">
                  <h3 className="text-3xl lg:text-4xl font-bold mb-4">
                    Ready to Transform Your Credit?
                  </h3>
                  <p className="text-xl text-white/90 leading-relaxed max-w-2xl mx-auto">
                    Join many professionals who use AI-driven tools for credit analysis and review. 
                    Start your journey today with complete confidence.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" variant="secondary" className="bg-white text-ocean-blue hover:bg-gray-50 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105" asChild>
                    <a href="/register" className="flex items-center gap-2">
                      Start Today <ArrowRight className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" className="border-white/30 text-black hover:bg-white/10 backdrop-blur-sm" asChild>
                    <a href="/contact">Schedule a Demo</a>
                  </Button>
                </div>
                
                <div className="mt-8 flex items-center justify-center gap-8 text-sm text-white/80">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>No Setup Fees</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>Cancel Anytime</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>24/7 Support</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
