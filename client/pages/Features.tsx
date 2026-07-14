import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  HandCoins,
  Landmark,
  Layers3,
  Network,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  WalletCards,
  Zap,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const platformFeatures = [
  {
    icon: Bot,
    title: "AI-powered capital matching",
    description:
      "CapSol analyzes your funding target, profile, and deal details to surface aligned capital paths faster.",
  },
  {
    icon: Network,
    title: "Multiple sources in one workflow",
    description:
      "Review SBA lending, private equity, and hard money options without bouncing between disconnected processes.",
  },
  {
    icon: SearchCheck,
    title: "Readiness gap visibility",
    description:
      "Spot credit, entity, or documentation gaps early so you can improve your funding position before applying.",
  },
  {
    icon: WalletCards,
    title: "Hybrid revenue model",
    description:
      "The platform supports a recurring subscription structure plus a 10% success fee on larger funded deals.",
  },
];

const operationalFeatures = [
  {
    icon: Landmark,
    title: "SBA loan matching",
    description: "Support for government-backed programs that fit growth, acquisition, and working-capital needs.",
  },
  {
    icon: HandCoins,
    title: "Private equity pathways",
    description: "Designed for larger opportunities, strategic expansion, and multifamily syndication structures.",
  },
  {
    icon: Zap,
    title: "Hard money access",
    description: "Flexible options for time-sensitive deals where speed and asset-backed capital matter.",
  },
  {
    icon: UserRoundCheck,
    title: "Business setup support",
    description: "Professional setup services can help users present stronger, more lender-ready business entities.",
  },
  {
    icon: ShieldCheck,
    title: "Credit repair add-ons",
    description: "Built-in support services aimed at improving readiness before capital applications are submitted.",
  },
  {
    icon: FileCheck2,
    title: "Underwriting preparation",
    description: "Keep key business and funding information organized in one system built for capital readiness.",
  },
];

const outcomes = [
  "Funding targets from $50,000 to $20 million",
  "Built for multifamily investors and small business owners",
  "One platform for matching, readiness, and execution",
];

export default function Features() {
  return (
    <div className="min-h-screen overflow-hidden bg-white text-slate-950">
      <Helmet>
        <title>Features | CapSol</title>
        <meta
          name="description"
          content="Explore CapSol platform features for AI-powered capital matching, readiness support, and streamlined access to SBA, private equity, and hard money opportunities."
        />
      </Helmet>

      <SiteHeader />

      <main>
        <section className="relative isolate overflow-hidden bg-slate-950 py-24 text-white lg:py-32">
          <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_78%_18%,rgba(20,184,166,0.24),transparent_28%),radial-gradient(circle_at_10%_85%,rgba(16,185,129,0.18),transparent_24%)]" />
          <div className="absolute inset-0 -z-10 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.75)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.75)_1px,transparent_1px)] [background-size:56px_56px]" />
          <div className="container mx-auto grid gap-14 px-4 lg:grid-cols-[1.02fr_.98fr] lg:items-center">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-4 py-2 text-sm font-semibold text-teal-200">
                <Sparkles className="h-4 w-4" />
                Platform features built for capital execution
              </div>
              <h1 className="mt-6 text-5xl font-black leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                The features behind
                <span className="block bg-gradient-to-r from-teal-300 via-emerald-300 to-lime-200 bg-clip-text text-transparent">
                  smarter capital matching.
                </span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                CapSol combines AI-powered matching, capital readiness support, and multi-source funding visibility in one modern workflow.
              </p>
              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <Button size="lg" className="h-14 bg-teal-500 px-7 text-base font-bold text-slate-950 hover:bg-teal-400" asChild>
                  <Link to="/pricing">
                    View Pricing
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-14 border-white/20 bg-white/5 px-7 text-base font-bold text-white hover:bg-white/10 hover:text-white" asChild>
                  <Link to="/contact">Talk to Our Team</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {platformFeatures.map((feature) => (
                <article key={feature.title} className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-xl backdrop-blur-sm">
                  <div className="inline-flex rounded-2xl bg-teal-400/15 p-3 text-teal-300">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h2 className="mt-5 text-xl font-black">{feature.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 py-7">
          <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 text-sm font-bold uppercase tracking-[0.14em] text-slate-500 lg:justify-between">
            <span>Built for real-world capital needs</span>
            <span className="flex items-center gap-2"><Building2 className="h-5 w-5 text-teal-600" /> Multifamily investors</span>
            <span className="flex items-center gap-2"><CircleDollarSign className="h-5 w-5 text-teal-600" /> Small business growth</span>
            <span className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-teal-600" /> Faster funding workflows</span>
          </div>
        </section>

        <section className="bg-slate-50 py-24 lg:py-32">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-700">Core platform</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                The operating system for capital readiness and funding discovery
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                Every feature is designed to reduce friction, improve readiness, and help users move through capital procurement with more confidence.
              </p>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {operationalFeatures.map((feature) => (
                <article
                  key={feature.title}
                  className="group rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:border-teal-300 hover:shadow-xl"
                >
                  <div className="inline-flex rounded-2xl bg-teal-50 p-4 text-teal-700 group-hover:bg-teal-600 group-hover:text-white">
                    <feature.icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-7 text-2xl font-black">{feature.title}</h3>
                  <p className="mt-4 leading-7 text-slate-600">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 lg:py-32">
          <div className="container mx-auto grid gap-16 px-4 lg:grid-cols-[.95fr_1.05fr] lg:items-center">
            <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl sm:p-10">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-teal-400">What the platform supports</p>
              <h3 className="mt-4 text-3xl font-black">From profile preparation to funded opportunity.</h3>
              <div className="mt-8 space-y-4">
                {outcomes.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                    <CheckCircle2 className="h-5 w-5 text-teal-400" />
                    <span className="font-semibold text-slate-200">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-700">Why it matters</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                Less fragmentation. More visibility. Better momentum.
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                Traditional commercial lending can feel slow, manual, and disconnected. CapSol brings matching, preparation, and funding support into one investor-ready SaaS experience.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  { icon: Layers3, label: "One system for multiple funding paths" },
                  { icon: ShieldCheck, label: "High-utility readiness support built in" },
                  { icon: Bot, label: "AI-assisted review across several capital sources" },
                  { icon: WalletCards, label: "Scalable model for recurring and transaction revenue" },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200 p-5">
                    <item.icon className="h-6 w-6 text-teal-700" />
                    <p className="mt-3 font-semibold text-slate-900">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-950 py-24 text-white">
          <div className="container mx-auto grid gap-10 px-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-3xl">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-400">See it in action</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                Explore the platform designed around your next capital move.
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-300">
                Whether you’re raising for a multifamily acquisition or building a stronger business funding profile, the platform is built to help you prepare and move faster.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button size="lg" className="h-14 bg-teal-500 px-8 font-bold text-slate-950 hover:bg-teal-400" asChild>
                <Link to="/how-it-works">
                  See How It Works
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 border-white/20 bg-white/5 px-8 font-bold text-white hover:bg-white/10 hover:text-white" asChild>
                <Link to="/contact">Start a Conversation</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
