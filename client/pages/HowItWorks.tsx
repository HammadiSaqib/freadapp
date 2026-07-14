import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  Landmark,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  WalletCards,
  Zap,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: "01",
    icon: Target,
    title: "Tell us what you need to fund",
    description:
      "Start with your business opportunity, acquisition target, or multifamily deal and define the capital range you’re pursuing.",
  },
  {
    number: "02",
    icon: ClipboardCheck,
    title: "Complete your readiness profile",
    description:
      "Add the business, credit, and entity details the platform uses to evaluate readiness and improve your positioning.",
  },
  {
    number: "03",
    icon: Bot,
    title: "Let the AI match the market",
    description:
      "The platform reviews multiple sources at once and highlights relevant funding routes across SBA, private equity, and hard money.",
  },
  {
    number: "04",
    icon: Rocket,
    title: "Move toward funding faster",
    description:
      "Use the match insights, readiness tools, and next-step guidance to advance your opportunity with more clarity and less delay.",
  },
];

const supportBlocks = [
  {
    icon: Landmark,
    title: "Capital source alignment",
    description: "Evaluate several funding paths without repeating the same process across fragmented channels.",
  },
  {
    icon: ShieldCheck,
    title: "Readiness support built in",
    description: "Access credit repair and business setup options directly from the platform when they’re needed.",
  },
  {
    icon: FileSearch,
    title: "Clearer underwriting preparation",
    description: "Keep the profile, opportunity, and supporting information organized in one workflow.",
  },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen overflow-hidden bg-white text-slate-950">
      <Helmet>
        <title>How It Works | CapSol</title>
        <meta
          name="description"
          content="See how CapSol helps multifamily investors and small business owners move from capital need to capital match with AI-powered workflows and readiness support."
        />
      </Helmet>

      <SiteHeader />

      <main>
        <section className="relative isolate overflow-hidden bg-slate-950 py-24 text-white lg:py-32">
          <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_76%_20%,rgba(20,184,166,0.24),transparent_28%),radial-gradient(circle_at_18%_82%,rgba(16,185,129,0.18),transparent_24%)]" />
          <div className="absolute inset-0 -z-10 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.75)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.75)_1px,transparent_1px)] [background-size:56px_56px]" />
          <div className="container mx-auto grid gap-14 px-4 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-4 py-2 text-sm font-semibold text-teal-200">
                <Sparkles className="h-4 w-4" />
                The CapSol workflow
              </div>
              <h1 className="mt-6 text-5xl font-black leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                From funding goal
                <span className="block bg-gradient-to-r from-teal-300 via-emerald-300 to-lime-200 bg-clip-text text-transparent">
                  to matched opportunity.
                </span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                CapSol is built to simplify how investors and business owners prepare for funding, evaluate options, and move with better speed and clarity.
              </p>
              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <Button size="lg" className="h-14 bg-teal-500 px-7 text-base font-bold text-slate-950 hover:bg-teal-400" asChild>
                  <Link to="/business-funding">
                    Start My Funding Path
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-14 border-white/20 bg-white/5 px-7 text-base font-bold text-white hover:bg-white/10 hover:text-white" asChild>
                  <Link to="/contact">Talk to Our Team</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-7 shadow-2xl backdrop-blur-sm">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-teal-300">Workflow snapshot</p>
              <div className="mt-6 space-y-4">
                {[
                  "Define your opportunity and funding target",
                  "Strengthen business and credit readiness",
                  "Review AI-matched capital options",
                  "Advance toward execution with confidence",
                ].map((item, index) => (
                  <div key={item} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-400/15 font-black text-teal-300">
                      0{index + 1}
                    </div>
                    <p className="font-semibold text-slate-100">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 py-7">
          <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 text-sm font-bold uppercase tracking-[0.14em] text-slate-500 lg:justify-between">
            <span>Built for practical execution</span>
            <span className="flex items-center gap-2"><Building2 className="h-5 w-5 text-teal-600" /> Business growth</span>
            <span className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-teal-600" /> Capital readiness</span>
            <span className="flex items-center gap-2"><Zap className="h-5 w-5 text-teal-600" /> Faster workflows</span>
          </div>
        </section>

        <section className="bg-slate-50 py-24 lg:py-32">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-700">How it works</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                A four-step system built for smarter capital moves
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                The platform is designed to reduce the manual back-and-forth that slows down commercial funding and readiness work.
              </p>
            </div>

            <div className="mt-14 grid gap-5 lg:grid-cols-4">
              {steps.map((step) => (
                <article key={step.number} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
                  <span className="text-5xl font-black text-teal-100">{step.number}</span>
                  <div className="mt-5 inline-flex rounded-2xl bg-teal-50 p-3 text-teal-700">
                    <step.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-xl font-black">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 lg:py-32">
          <div className="container mx-auto grid gap-16 px-4 lg:grid-cols-[.95fr_1.05fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-700">What supports the process</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                Matching is only part of the advantage.
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                CapSol also helps users improve readiness so capital matching happens in a stronger, more organized position.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              {supportBlocks.map((item) => (
                <article key={item.title} className="rounded-3xl bg-slate-950 p-7 text-white shadow-xl">
                  <item.icon className="h-7 w-7 text-teal-400" />
                  <h3 className="mt-5 text-xl font-bold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-teal-700 py-24 text-white">
          <div className="container mx-auto grid gap-12 px-4 lg:grid-cols-[1fr_.85fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-100">Why teams choose it</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                One intelligent path from inquiry to opportunity.
              </h2>
              <div className="mt-8 space-y-4">
                {[
                  "Designed to replace slow, fragmented commercial funding workflows",
                  "Helps users evaluate multiple capital routes in parallel",
                  "Supports both preparation and execution in one platform",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0" />
                    <p className="text-lg leading-7 text-teal-50">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/20 bg-slate-950 p-8 shadow-2xl sm:p-10">
              <p className="text-sm font-bold text-slate-400">Next step</p>
              <p className="mt-2 text-4xl font-black">Explore your funding path</p>
              <p className="mt-4 text-slate-300">
                Start with your capital goal, then let the platform and team help guide the next move.
              </p>
              <div className="mt-8 flex flex-col gap-3">
                <Button size="lg" className="h-14 bg-teal-500 font-bold text-slate-950 hover:bg-teal-400" asChild>
                  <Link to="/pricing">
                    See Pricing
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-14 border-white/20 bg-white/5 font-bold text-white hover:bg-white/10 hover:text-white" asChild>
                  <Link to="/contact">Contact CapSol</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
