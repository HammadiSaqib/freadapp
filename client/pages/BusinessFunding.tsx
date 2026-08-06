import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  FileCheck2,
  Landmark,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  WalletCards,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const fundingTypes = [
  {
    icon: Landmark,
    title: "SBA funding pathways",
    description: "Explore government-backed business financing options that support growth, acquisitions, and working capital needs.",
  },
  {
    icon: CircleDollarSign,
    title: "Working capital options",
    description: "Review capital paths designed to help businesses manage cash flow, operations, and short-term expansion goals.",
  },
  {
    icon: Building2,
    title: "Acquisition and expansion funding",
    description: "Match opportunities for business purchases, multifamily deals, and structured growth initiatives.",
  },
];

const readinessPoints = [
  "Business entity and profile organization",
  "Credit-readiness support before applying",
  "Clearer documentation for underwriting review",
  "Faster visibility across multiple funding routes",
];

export default function BusinessFunding() {
  return (
    <div className="min-h-screen overflow-hidden bg-white text-slate-950">
      <Helmet>
        <title>Business Funding | CapSol</title>
        <meta
          name="description"
          content="Explore CapSol business funding support for SBA loans, private capital, readiness guidance, and streamlined funding workflows."
        />
        <link rel="canonical" href="https://thecapsol.com/business-funding" />
      </Helmet>

      <SiteHeader />

      <main>
        <section className="relative isolate overflow-hidden bg-slate-950 py-24 text-white lg:py-32">
          <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_78%_18%,rgba(20,184,166,0.24),transparent_28%),radial-gradient(circle_at_12%_82%,rgba(16,185,129,0.18),transparent_24%)]" />
          <div className="absolute inset-0 -z-10 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.75)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.75)_1px,transparent_1px)] [background-size:56px_56px]" />
          <div className="container mx-auto grid gap-14 px-4 lg:grid-cols-[1.02fr_.98fr] lg:items-center">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-4 py-2 text-sm font-semibold text-teal-200">
                <Sparkles className="h-4 w-4" />
                Business funding support through CapSol
              </div>
              <h1 className="mt-6 text-5xl font-black leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                Capital solutions for
                <span className="block bg-gradient-to-r from-teal-300 via-emerald-300 to-lime-200 bg-clip-text text-transparent">
                  serious business growth.
                </span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                CapSol helps business owners and investors prepare for funding, evaluate multiple capital options, and move toward execution with more speed and clarity.
              </p>
              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <Button size="lg" className="h-14 bg-teal-500 px-7 text-base font-bold text-slate-950 hover:bg-teal-400" asChild>
                  <Link to="/book-appointment">
                    Book Appointment
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-14 border-white/20 bg-white/5 px-7 text-base font-bold text-white hover:bg-white/10 hover:text-white" asChild>
                  <Link to="/pricing">View Pricing</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-7 shadow-2xl backdrop-blur-sm">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-teal-300">What this page covers</p>
              <div className="mt-6 space-y-4">
                {[
                  "How CapSol supports business funding readiness",
                  "Types of business capital commonly pursued",
                  "What helps strengthen your funding position",
                  "Next steps for funding conversations and booking",
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
            <span>Built for practical funding execution</span>
            <span className="flex items-center gap-2"><BriefcaseBusiness className="h-5 w-5 text-teal-600" /> Small business owners</span>
            <span className="flex items-center gap-2"><Target className="h-5 w-5 text-teal-600" /> Growth-focused operators</span>
            <span className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-teal-600" /> Smarter capital workflows</span>
          </div>
        </section>

        <section className="bg-slate-50 py-24 lg:py-32">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-700">Funding solutions</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                Match your business with the right capital path
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                CapSol is designed to reduce the friction around capital raising by helping users understand options, improve readiness, and move through funding decisions more efficiently.
              </p>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {fundingTypes.map((item) => (
                <article
                  key={item.title}
                  className="group rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:border-teal-300 hover:shadow-xl"
                >
                  <div className="inline-flex rounded-2xl bg-teal-50 p-4 text-teal-700 group-hover:bg-teal-600 group-hover:text-white">
                    <item.icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-7 text-2xl font-black">{item.title}</h3>
                  <p className="mt-4 leading-7 text-slate-600">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 lg:py-32">
          <div className="container mx-auto grid gap-16 px-4 lg:grid-cols-[.95fr_1.05fr] lg:items-center">
            <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl sm:p-10">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-teal-400">Funding readiness</p>
              <h3 className="mt-4 text-3xl font-black">What helps businesses move into a stronger funding position</h3>
              <div className="mt-8 space-y-4">
                {readinessPoints.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                    <CheckCircle2 className="h-5 w-5 text-teal-400" />
                    <span className="font-semibold text-slate-200">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-700">How CapSol helps</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                Less confusion. More direction. Better preparation.
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                Instead of chasing fragmented lenders and disconnected services, businesses can use CapSol to review funding options, strengthen readiness, and organize the information that matters before applying.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  { icon: ShieldCheck, label: "Credit and readiness support built in" },
                  { icon: FileCheck2, label: "Better underwriting preparation" },
                  { icon: Landmark, label: "Visibility across multiple funding routes" },
                  { icon: Rocket, label: "A faster path toward funding conversations" },
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
              <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-400">Next step</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                Start your business funding conversation with CapSol.
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-300">
                Book a walkthrough, review your funding goals, and let the platform help guide the next move toward business capital.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button size="lg" className="h-14 bg-teal-500 px-8 font-bold text-slate-950 hover:bg-teal-400" asChild>
                <Link to="/book-appointment">
                  Book Appointment
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 border-white/20 bg-white/5 px-8 font-bold text-white hover:bg-white/10 hover:text-white" asChild>
                <Link to="/contact">Contact CapSol</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
