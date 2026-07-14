import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Landmark,
  Rocket,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

interface PricingPlan {
  id: number;
  name: string;
  description: string;
  price: number;
  billing_cycle: "monthly" | "yearly" | "lifetime";
  features: string[];
  max_users?: number | null;
  max_clients?: number | null;
  max_disputes?: number | null;
  sort_order: number;
}

interface PricingProps {
  embed?: boolean;
}

const fallbackPlans: PricingPlan[] = [
  {
    id: 1,
    name: "Starter",
    description: "For operators getting their funding workflow in place.",
    price: 49,
    billing_cycle: "monthly",
    features: [
      "Platform access",
      "AI-powered capital matching",
      "Readiness tracking",
      "Funding profile organization",
    ],
    max_users: 1,
    max_clients: 25,
    max_disputes: 50,
    sort_order: 1,
  },
  {
    id: 2,
    name: "Growth",
    description: "For active businesses and investor teams moving more opportunities.",
    price: 149,
    billing_cycle: "monthly",
    features: [
      "Everything in Starter",
      "Expanded workflow capacity",
      "Team collaboration support",
      "Priority platform usage",
    ],
    max_users: 5,
    max_clients: 250,
    max_disputes: 500,
    sort_order: 2,
  },
  {
    id: 3,
    name: "Scale",
    description: "For higher-volume operators and larger opportunity pipelines.",
    price: 299,
    billing_cycle: "monthly",
    features: [
      "Everything in Growth",
      "High-volume platform access",
      "Larger operational capacity",
      "Support for advanced capital workflows",
    ],
    max_users: null,
    max_clients: null,
    max_disputes: null,
    sort_order: 3,
  },
];

const normalizePrice = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const normalizePlan = (plan: any): PricingPlan => ({
  id: Number(plan.id ?? 0),
  name: String(plan.name ?? "Plan"),
  description: String(plan.description ?? ""),
  price: normalizePrice(plan.price),
  billing_cycle:
    plan.billing_cycle === "yearly" || plan.billing_cycle === "lifetime"
      ? plan.billing_cycle
      : "monthly",
  features: Array.isArray(plan.features) ? plan.features.map((feature) => String(feature)) : [],
  max_users: plan.max_users == null ? null : Number(plan.max_users),
  max_clients: plan.max_clients == null ? null : Number(plan.max_clients),
  max_disputes: plan.max_disputes == null ? null : Number(plan.max_disputes),
  sort_order: Number(plan.sort_order ?? 0),
});

const formatPrice = (price: number, cycle: string) => {
  const normalizedPrice = normalizePrice(price);
  if (cycle === "lifetime") {
    return `$${normalizedPrice.toFixed(0)}`;
  }
  return `$${normalizedPrice.toFixed(0)}`;
};

const planCapacityLabel = (value?: number | null) => (value == null ? "Custom / scalable" : String(value));

export default function Pricing({ embed = false }: PricingProps) {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [purchasing, setPurchasing] = useState<number | null>(null);

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/pricing/plans", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.success || !Array.isArray(data.data)) {
        throw new Error("Invalid pricing response");
      }

      const activePlans = data.data
        .filter((plan: any) => plan.is_active !== false)
        .map(normalizePlan)
        .sort((a: PricingPlan, b: PricingPlan) => a.sort_order - b.sort_order);

      setPlans(activePlans.length > 0 ? activePlans : fallbackPlans);
    } catch (err) {
      setPlans(fallbackPlans);
      setError(err instanceof Error ? err.message : "Unable to load pricing plans.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    if (!embed || typeof window === "undefined" || window.parent === window) {
      return;
    }

    const postEmbedHeight = () => {
      const height = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      window.parent.postMessage({ type: "scoremachine:pricing-embed-resize", height }, "*");
    };

    postEmbedHeight();
    const frameId = window.requestAnimationFrame(postEmbedHeight);
    const resizeObserver = new ResizeObserver(() => postEmbedHeight());
    resizeObserver.observe(document.body);
    window.addEventListener("resize", postEmbedHeight);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", postEmbedHeight);
    };
  }, [embed, loading, plans.length, billingCycle]);

  const handleSelectPlan = (plan: PricingPlan) => {
    setPurchasing(plan.id);
    sessionStorage.setItem(
      "selectedPlan",
      JSON.stringify({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        billing_cycle: plan.billing_cycle,
      }),
    );

    const registerUrl = `${window.location.origin}/register`;
    if (!embed) {
      navigate("/register");
      return;
    }

    try {
      if (window.top && window.top !== window.self) {
        window.top.location.href = registerUrl;
        return;
      }
    } catch {}

    const redirected = window.open(registerUrl, "_top");
    if (!redirected) {
      window.location.href = registerUrl;
    }
  };

  const visiblePlans = plans.filter((plan) =>
    billingCycle === "monthly"
      ? plan.billing_cycle === "monthly" || plan.billing_cycle === "lifetime"
      : plan.billing_cycle === "yearly" || plan.billing_cycle === "lifetime",
  );

  const rootClassName = embed ? "min-h-screen bg-white py-8" : "min-h-screen overflow-hidden bg-white text-slate-950";

  return (
    <div className={rootClassName}>
      <Helmet>
        <title>{embed ? "Pricing Embed - CapSol" : "Pricing | CapSol"}</title>
        <meta
          name="description"
          content="Review CapSol pricing for AI-powered capital matching, business readiness support, and scalable funding workflows."
        />
      </Helmet>

      {!embed && <SiteHeader />}

      <main>
        <section className={`relative isolate overflow-hidden bg-slate-950 text-white ${embed ? "py-16" : "py-24 lg:py-32"}`}>
          <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_76%_18%,rgba(20,184,166,0.24),transparent_28%),radial-gradient(circle_at_18%_82%,rgba(16,185,129,0.18),transparent_24%)]" />
          <div className="absolute inset-0 -z-10 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.75)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.75)_1px,transparent_1px)] [background-size:56px_56px]" />
          <div className="container mx-auto grid gap-14 px-4 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-4 py-2 text-sm font-semibold text-teal-200">
                <Sparkles className="h-4 w-4" />
                Straightforward platform pricing
              </div>
              <h1 className="mt-6 text-5xl font-black leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                Pricing built for
                <span className="block bg-gradient-to-r from-teal-300 via-emerald-300 to-lime-200 bg-clip-text text-transparent">
                  recurring access and real upside.
                </span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                CapSol combines subscription access with a success-based structure for larger funded transactions, giving clients a clear operating model and investors a compelling SaaS story.
              </p>
              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300">
                {[
                  "Monthly access for standard platform usage",
                  "10% success fee on larger funded deals",
                  "Funding support from $50K to $20M",
                ].map((item) => (
                  <span key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-teal-400" /> {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-7 shadow-2xl backdrop-blur-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-teal-300">Revenue structure</p>
                  <h2 className="mt-1 text-2xl font-bold">Two-part pricing model</h2>
                </div>
                <div className="rounded-2xl bg-teal-400/15 p-3 text-teal-300">
                  <WalletCards className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                  <p className="text-sm font-bold text-slate-400">Recurring platform access</p>
                  <p className="mt-2 text-3xl font-black">Monthly subscription</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Ongoing access for matching workflows, readiness support, and capital profile organization.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                  <p className="text-sm font-bold text-slate-400">Larger funded transactions</p>
                  <p className="mt-2 text-3xl font-black">10% success fee</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Applied when larger deals fund, starting at $50,000 and scaling up to $20 million.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 py-7">
          <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 text-sm font-bold uppercase tracking-[0.14em] text-slate-500 lg:justify-between">
            <span>Built for scalable capital workflows</span>
            <span className="flex items-center gap-2"><Landmark className="h-5 w-5 text-teal-600" /> SBA-ready</span>
            <span className="flex items-center gap-2"><CircleDollarSign className="h-5 w-5 text-teal-600" /> Success-aligned upside</span>
            <span className="flex items-center gap-2"><Rocket className="h-5 w-5 text-teal-600" /> Growth-oriented operators</span>
          </div>
        </section>

        <section className="bg-slate-50 py-24 lg:py-32">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-700">Choose your access level</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                Subscription plans that support your capital pipeline
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                Pick the platform access level that fits your workflow, then use the system to prepare for and pursue larger funding opportunities.
              </p>
            </div>

            <div className="mt-10 flex justify-center">
              <div className="rounded-full border border-slate-200 bg-white p-1 shadow-sm">
                <button
                  onClick={() => setBillingCycle("monthly")}
                  className={`rounded-full px-6 py-3 text-sm font-bold transition ${billingCycle === "monthly" ? "bg-slate-950 text-white" : "text-slate-600"}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle("yearly")}
                  className={`rounded-full px-6 py-3 text-sm font-bold transition ${billingCycle === "yearly" ? "bg-slate-950 text-white" : "text-slate-600"}`}
                >
                  Yearly
                </button>
              </div>
            </div>

            {error && (
              <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Live pricing could not be loaded, so the page is showing fallback plan content right now.
              </div>
            )}

            {loading ? (
              <div className="py-16 text-center text-slate-600">Loading pricing plans...</div>
            ) : (
              <div className="mt-14 grid gap-6 lg:grid-cols-3">
                {visiblePlans.map((plan, index) => (
                  <article
                    key={plan.id}
                    className={`rounded-3xl border p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
                      index === 1 ? "border-teal-300 bg-slate-950 text-white shadow-xl" : "border-slate-200 bg-white"
                    }`}
                  >
                    <p className={`text-sm font-black uppercase tracking-[0.18em] ${index === 1 ? "text-teal-300" : "text-teal-700"}`}>
                      {plan.billing_cycle}
                    </p>
                    <h3 className="mt-4 text-3xl font-black">{plan.name}</h3>
                    <p className={`mt-3 leading-7 ${index === 1 ? "text-slate-300" : "text-slate-600"}`}>{plan.description}</p>
                    <div className="mt-8">
                      <p className="text-5xl font-black">{formatPrice(plan.price, plan.billing_cycle)}</p>
                      <p className={`mt-2 text-sm ${index === 1 ? "text-slate-400" : "text-slate-500"}`}>
                        {plan.billing_cycle === "lifetime" ? "One-time platform purchase" : `per ${plan.billing_cycle === "monthly" ? "month" : "year"}`}
                      </p>
                    </div>
                    <div className={`my-8 h-px ${index === 1 ? "bg-white/10" : "bg-slate-200"}`} />
                    <div className="space-y-3">
                      {plan.features.map((feature) => (
                        <div key={feature} className="flex items-start gap-3">
                          <CheckCircle2 className={`mt-0.5 h-5 w-5 shrink-0 ${index === 1 ? "text-teal-300" : "text-teal-700"}`} />
                          <span className={index === 1 ? "text-slate-200" : "text-slate-700"}>{feature}</span>
                        </div>
                      ))}
                    </div>
                    <div className={`mt-8 rounded-2xl p-4 ${index === 1 ? "bg-white/5" : "bg-slate-50"}`}>
                      <div className="flex justify-between text-sm">
                        <span className={index === 1 ? "text-slate-400" : "text-slate-500"}>Users</span>
                        <span className="font-semibold">{planCapacityLabel(plan.max_users)}</span>
                      </div>
                      <div className="mt-2 flex justify-between text-sm">
                        <span className={index === 1 ? "text-slate-400" : "text-slate-500"}>Clients</span>
                        <span className="font-semibold">{planCapacityLabel(plan.max_clients)}</span>
                      </div>
                    </div>
                    <Button
                      size="lg"
                      onClick={() => handleSelectPlan(plan)}
                      disabled={purchasing === plan.id}
                      className={`mt-8 h-14 w-full font-bold ${
                        index === 1
                          ? "bg-teal-500 text-slate-950 hover:bg-teal-400"
                          : "bg-slate-950 text-white hover:bg-teal-700"
                      }`}
                    >
                      {purchasing === plan.id ? "Redirecting..." : "Choose Plan"}
                    </Button>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="py-24 lg:py-32">
          <div className="container mx-auto grid gap-16 px-4 lg:grid-cols-[.95fr_1.05fr] lg:items-center">
            <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl sm:p-10">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-teal-400">Beyond subscription access</p>
              <h3 className="mt-4 text-3xl font-black">The bigger upside comes from funded transactions.</h3>
              <div className="mt-8 space-y-4">
                {[
                  "Flat 10% success fee on larger deals",
                  "Applies to opportunities from $50K to $20M",
                  "Supports a high-margin, scalable revenue model",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                    <CheckCircle2 className="h-5 w-5 text-teal-400" />
                    <span className="font-semibold text-slate-200">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-700">What’s included</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                One pricing page, two layers of value.
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                Subscription pricing gives clients ongoing access to the platform. Success-based fees create aligned economics when larger capital opportunities actually close.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  "Recurring SaaS predictability",
                  "Readiness services that support ARPU growth",
                  "Capital workflows built for serious operators",
                  "Designed for long-term scalability",
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-slate-200 p-5">
                    <ShieldCheck className="h-6 w-6 text-teal-700" />
                    <p className="mt-3 font-semibold text-slate-900">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-950 py-24 text-white">
          <div className="container mx-auto grid gap-10 px-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-3xl">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-400">Ready to move?</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                Choose your platform access and start building your funding path.
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-300">
                The subscription gets you into the system. The platform helps you prepare, match, and pursue capital with more precision.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button size="lg" className="h-14 bg-teal-500 px-8 font-bold text-slate-950 hover:bg-teal-400" asChild>
                <Link to="/contact">
                  Talk to Our Team
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 border-white/20 bg-white/5 px-8 font-bold text-white hover:bg-white/10 hover:text-white" asChild>
                <Link to="/features">Explore Features</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {!embed && <Footer />}
    </div>
  );
}
