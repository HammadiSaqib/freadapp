import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Handshake,
  Landmark,
  Network,
  Rocket,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  WalletCards,
  Zap,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const fundingSources = [
  { icon: Landmark, title: "SBA Loans", description: "Government-backed lending options for business growth, acquisitions, and working capital." },
  { icon: Handshake, title: "Private Equity", description: "Equity capital for larger opportunities, strategic expansion, and multifamily syndication." },
  { icon: Zap, title: "Hard Money", description: "Flexible, asset-based capital for time-sensitive real estate opportunities." },
];

const benefits = [
  { icon: Network, title: "One application, multiple sources", description: "Cap Sol evaluates multiple capital paths at the same time." },
  { icon: Bot, title: "AI-powered matching", description: "Your profile, deal, and goals are analyzed to surface aligned capital options." },
  { icon: Clock3, title: "A faster path to capital", description: "Move through a streamlined workflow built for speed and clarity." },
  { icon: SearchCheck, title: "Built-in readiness support", description: "Identify underwriting gaps early and access services to strengthen your application." },
];

const steps = [
  { number: "01", title: "Tell us what you’re funding", description: "Share your business, acquisition, or multifamily opportunity and capital target." },
  { number: "02", title: "Strengthen your profile", description: "Complete your readiness details and address credit or entity setup needs." },
  { number: "03", title: "Let AI evaluate the market", description: "Cap Sol analyzes multiple sources and identifies relevant funding paths." },
  { number: "04", title: "Secure capital and grow", description: "Review your options, complete the process, and put your capital to work." },
];

export default function Index() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Cap Sol",
    alternateName: "Capital Solutions LLC",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    description: "AI-powered capital matching for multifamily real estate investors and small business owners.",
  };

  return (
    <div className="min-h-screen overflow-hidden bg-white text-slate-950">
      <Helmet>
        <title>Cap Sol | Smarter Capital for Your Next Opportunity</title>
        <meta name="description" content="Cap Sol uses AI to match multifamily real estate investors and small business owners with SBA loans, private equity, hard money, and business readiness services." />
        <meta name="keywords" content="business funding, multifamily real estate funding, SBA loans, private equity, hard money, capital matching" />
        <meta property="og:title" content="Cap Sol | Capital, Matched Smarter" />
        <meta property="og:description" content="One intelligent platform for finding, preparing for, and securing growth capital." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <SiteHeader />
      <main>
        <section className="relative isolate flex min-h-[calc(100vh-89px)] items-center overflow-hidden bg-slate-950 py-24 text-white">
          <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_78%_20%,rgba(20,184,166,0.24),transparent_32%),radial-gradient(circle_at_15%_80%,rgba(16,185,129,0.16),transparent_28%)]" />
          <div className="absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:64px_64px]" />
          <div className="container mx-auto grid items-center gap-16 px-4 lg:grid-cols-[1.08fr_.92fr]">
            <div className="max-w-3xl">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-4 py-2 text-sm font-semibold text-teal-200">
                <Sparkles className="h-4 w-4" /> AI-powered capital matching
              </div>
              <h1 className="text-5xl font-black leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                Capital, matched
                <span className="block bg-gradient-to-r from-teal-300 via-emerald-300 to-lime-200 bg-clip-text text-transparent">smarter.</span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                Cap Sol helps multifamily real estate investors and small business owners find the right growth capital—without the slow, fragmented lending process.
              </p>
              <p className="mt-4 max-w-2xl leading-7 text-slate-400">Explore SBA loans, private equity, and hard money through one intelligent platform built to move your opportunity forward.</p>
              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <Button size="lg" className="h-14 bg-teal-500 px-7 text-base font-bold text-slate-950 hover:bg-teal-400" asChild>
                  <Link to="/business-funding">Find My Capital Match <ArrowRight className="ml-2 h-5 w-5" /></Link>
                </Button>
                <Button size="lg" variant="outline" className="h-14 border-white/20 bg-white/5 px-7 text-base font-bold text-white hover:bg-white/10 hover:text-white" asChild>
                  <a href="#how-it-works">See How It Works</a>
                </Button>
              </div>
              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300">
                {["Funding from $50K to $20M", "Multiple capital sources", "Readiness support"].map((item) => (
                  <span key={item} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-400" /> {item}</span>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl">
              <div className="absolute -inset-8 rounded-full bg-teal-400/10 blur-3xl" />
              <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 shadow-2xl backdrop-blur-xl">
                <div className="mb-7 flex items-start justify-between gap-4">
                  <div><p className="text-sm font-semibold text-teal-300">Capital Match Overview</p><h2 className="mt-1 text-2xl font-bold">One profile. More possibilities.</h2></div>
                  <div className="rounded-2xl bg-teal-400/15 p-3 text-teal-300"><Bot className="h-6 w-6" /></div>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "SBA lending", value: "Growth & acquisitions", icon: Landmark },
                    { label: "Private equity", value: "Scale & syndication", icon: Users },
                    { label: "Hard money", value: "Speed & flexibility", icon: Rocket },
                  ].map((source) => (
                    <div key={source.label} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                      <div className="rounded-xl bg-white/10 p-2.5 text-teal-300"><source.icon className="h-5 w-5" /></div>
                      <div className="min-w-0 flex-1"><p className="font-bold">{source.label}</p><p className="text-sm text-slate-400">{source.value}</p></div>
                      <BadgeCheck className="h-5 w-5 text-emerald-400" />
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 p-5 text-slate-950">
                  <div className="flex items-center justify-between"><div><p className="text-sm font-bold opacity-70">Funding range</p><p className="mt-1 text-3xl font-black">$50K–$20M</p></div><TrendingUp className="h-10 w-10 opacity-70" /></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 py-7">
          <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 text-sm font-bold uppercase tracking-[0.14em] text-slate-500 lg:justify-between">
            <span>Built for ambitious growth</span>
            <span className="flex items-center gap-2"><Building2 className="h-5 w-5 text-teal-600" /> Multifamily investors</span>
            <span className="flex items-center gap-2"><BriefcaseBusiness className="h-5 w-5 text-teal-600" /> Small business owners</span>
            <span className="flex items-center gap-2"><CircleDollarSign className="h-5 w-5 text-teal-600" /> Capital seekers</span>
          </div>
        </section>

        <section className="bg-slate-50 py-24 lg:py-32">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-700">Capital without the maze</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">The right funding path for the opportunity ahead</h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">Multiple funding sources in one experience, so you can spend less time chasing capital and more time building.</p>
            </div>
            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {fundingSources.map((source) => (
                <article key={source.title} className="group rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:border-teal-300 hover:shadow-xl">
                  <div className="inline-flex rounded-2xl bg-teal-50 p-4 text-teal-700 group-hover:bg-teal-600 group-hover:text-white"><source.icon className="h-7 w-7" /></div>
                  <h3 className="mt-7 text-2xl font-black">{source.title}</h3><p className="mt-4 leading-7 text-slate-600">{source.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 lg:py-32">
          <div className="container mx-auto grid items-center gap-16 px-4 lg:grid-cols-2">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-700">Powered by intelligent matching</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">One AI engine working across multiple capital sources</h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">Cap Sol analyzes your business profile, deal structure, funding target, and readiness signals simultaneously to guide you toward better-aligned opportunities.</p>
              <div className="mt-8 flex gap-3 rounded-2xl border border-teal-100 bg-teal-50 p-5"><ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-teal-700" /><p className="leading-7 text-slate-700"><strong className="text-slate-950">More clarity at every step.</strong> Understand what fits, what needs attention, and what comes next.</p></div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <article key={benefit.title} className="rounded-3xl bg-slate-950 p-7 text-white"><benefit.icon className="h-7 w-7 text-teal-400" /><h3 className="mt-5 text-xl font-bold">{benefit.title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{benefit.description}</p></article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-teal-700 py-24 text-white">
          <div className="container relative mx-auto grid items-center gap-12 px-4 lg:grid-cols-[1fr_.85fr]">
            <div><p className="text-sm font-black uppercase tracking-[0.2em] text-teal-100">Straightforward hybrid pricing</p><h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Predictable access. Success-aligned outcomes.</h2><p className="mt-6 max-w-2xl text-lg leading-8 text-teal-50">A monthly subscription gives you ongoing platform access. For larger transactions from $50,000 to $20 million, a flat 10% success fee applies when funding is secured.</p>
              <div className="mt-8 flex flex-wrap gap-5 text-sm font-semibold">{["No percentage tiers", "Clear success-based fee", "Built to support growth"].map((item) => <span key={item} className="flex items-center gap-2"><Check className="h-5 w-5" /> {item}</span>)}</div>
            </div>
            <div className="rounded-[2rem] border border-white/20 bg-slate-950 p-8 shadow-2xl sm:p-10">
              <div className="flex items-center gap-4"><div className="rounded-2xl bg-teal-400/15 p-4 text-teal-300"><WalletCards className="h-8 w-8" /></div><div><p className="text-sm font-bold text-slate-400">Larger funded transactions</p><p className="text-4xl font-black">10% success fee</p></div></div>
              <div className="my-7 h-px bg-white/10" /><div className="flex items-center justify-between gap-4"><div><p className="text-sm text-slate-400">Starting at</p><p className="text-2xl font-bold">$50K</p></div><ArrowRight className="text-teal-400" /><div className="text-right"><p className="text-sm text-slate-400">Up to</p><p className="text-2xl font-bold">$20M</p></div></div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 bg-slate-50 py-24 lg:py-32">
          <div className="container mx-auto px-4">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-700">How Cap Sol works</p><h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">From capital need to capital match</h2>
            <div className="mt-14 grid gap-5 lg:grid-cols-4">{steps.map((step) => <article key={step.number} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"><span className="text-5xl font-black text-teal-100">{step.number}</span><h3 className="mt-5 text-xl font-black">{step.title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p></article>)}</div>
          </div>
        </section>

        <section className="py-24 lg:py-32">
          <div className="container mx-auto grid items-center gap-16 px-4 lg:grid-cols-[.9fr_1.1fr]">
            <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl sm:p-10"><p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-400">Capital readiness</p><h3 className="mt-4 text-3xl font-black">Build a stronger funding profile before you apply.</h3><div className="mt-8 space-y-4">{["Professional business setup", "Credit repair services", "Underwriting readiness guidance", "Funding profile organization"].map((service) => <div key={service} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4"><CheckCircle2 className="h-5 w-5 text-teal-400" /><span className="font-semibold text-slate-200">{service}</span></div>)}</div></div>
            <div><p className="text-sm font-black uppercase tracking-[0.2em] text-teal-700">More than a marketplace</p><h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Everything you need to become funding-ready</h2><p className="mt-6 text-lg leading-8 text-slate-600">Cap Sol integrates credit repair and professional business setup directly into the platform, helping your entity and credit profile better align with underwriting expectations.</p><Button className="mt-8 h-12 bg-slate-950 px-6 font-bold hover:bg-teal-700" asChild><Link to="/business-funding">Start My Funding Profile <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>
          </div>
        </section>

        <section className="bg-slate-950 py-24 text-white">
          <div className="container mx-auto grid gap-10 px-4 lg:grid-cols-[1fr_auto] lg:items-center"><div className="max-w-3xl"><p className="text-sm font-black uppercase tracking-[0.2em] text-teal-400">Your next move starts here</p><h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Turn capital procurement into a strategic advantage.</h2><p className="mt-6 text-lg leading-8 text-slate-300">Whether you’re acquiring your next multifamily property or scaling your business, Cap Sol helps you prepare, match, and move forward—all in one place.</p></div><div className="flex flex-col gap-3"><Button size="lg" className="h-14 bg-teal-500 px-8 font-bold text-slate-950 hover:bg-teal-400" asChild><Link to="/business-funding">Find My Capital Match <ArrowRight className="ml-2 h-5 w-5" /></Link></Button><Button size="lg" variant="outline" className="h-14 border-white/20 bg-white/5 px-8 font-bold text-white hover:bg-white/10 hover:text-white" asChild><Link to="/contact">Talk to Our Team</Link></Button></div></div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
