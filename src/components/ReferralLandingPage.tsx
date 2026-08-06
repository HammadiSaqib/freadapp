import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  ChevronDown,
  CircleAlert,
  FileSearch,
  Goal,
  Menu,
  MonitorCheck,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  buildAliasUrl,
  buildReferralLandingUrl,
  buildReferralPricingUrl,
  buildReferralRegisterUrl,
} from "@/lib/hostRouting";
import dashboardImage from "../../score-machine-affilate-main/images/Main-Software.png";
import goodScoreImage from "../../score-machine-affilate-main/images/I have a good score but still get denied.png";
import understandingImage from "../../score-machine-affilate-main/images/Lack of Understanding.jpg";
import directionImage from "../../score-machine-affilate-main/images/No Direction on What to Do Next.png";
import fundingImage from "../../score-machine-affilate-main/images/Not Positioned for Funding.png";
import repairImage from "../../score-machine-affilate-main/images/Credit Reapir.png";
import "./ReferralLandingPage.css";

interface AffiliateData {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  email: string;
  totalReferrals: number;
  commissionRate: number;
  logoUrl?: string;
  status: string;
}

interface PricingPlan {
  id: number;
  name: string;
  description: string;
  price: number;
  billing_cycle: "monthly" | "yearly" | "lifetime";
  features: string[];
  max_users?: number | null;
  max_clients?: number | null;
  sort_order?: number;
}

const features = [
  { icon: BarChart3, title: "Full Profile Analysis", text: "Organized analysis that helps users review more than a single score." },
  { icon: FileSearch, title: "Underwriting-Style Evaluation", text: "A structured look at profile characteristics that may matter during third-party evaluations." },
  { icon: CircleAlert, title: "Negative & Limiting Factors", text: "Highlight profile information that may deserve further review." },
  { icon: Workflow, title: "Multi-Bureau Profile Overview", text: "View and compare supported profile information in one organized experience." },
  { icon: Bot, title: "AI-Assisted Workflow", text: "Use AI-assisted tools to organize information and support parts of the review workflow." },
  { icon: Sparkles, title: "Self-Service Credit Tools", text: "Access included software tools that users can operate themselves." },
  { icon: Goal, title: "Goal Tracking", text: "Create goals and monitor progress over time." },
  { icon: MonitorCheck, title: "Monitoring Tools", text: "Monitor supported profile information and changes made available through the platform." },
  { icon: Users, title: "Multi-User Management", text: "Manage users and clients according to the selected subscription plan." },
];

const faqs = [
  ["Is The Score Machine a lender?", "No. The Score Machine is a software and educational platform. It does not issue loans, make lending decisions, or control third-party approval decisions."],
  ["Does The Score Machine guarantee approvals?", "No. Approval decisions are made independently by third parties. The platform provides tools and organized information, but it does not guarantee approvals, offers, limits, rates, or other outcomes."],
  ["Does The Score Machine guarantee a score increase?", "No. Results vary based on the information in each profile, user actions, third-party reporting, and other factors. No specific score change is guaranteed."],
  ["Does The Score Machine remove items automatically?", "The platform provides analysis and self-service workflow tools. Users review their information and decide what actions to take. The software does not automatically remove accurate information."],
  ["Can I use it for clients?", "Yes, depending on the selected subscription plan. Each plan includes a stated user and client capacity."],
  ["What is included in each plan?", "Each plan includes core profile-analysis and self-service software tools. The primary differences are user capacity, client capacity, and support level."],
  ["How does annual billing work?", "Annual plans are billed once per year according to the price displayed at checkout."],
  ["Will my subscription renew automatically?", "Subscriptions renew according to the billing cadence selected at checkout unless canceled under the applicable subscription terms."],
] as const;

const problemCards = [
  {
    number: "01",
    title: "A Good Score, But Still No Approval",
    text: "A score may look strong while other profile details still affect an application. Review the broader profile instead of relying on one number alone.",
    image: goodScoreImage,
    tags: ["Utilization", "Recent inquiries", "Account age", "Payment history", "Profile depth"],
  },
  {
    number: "02",
    title: "Not Understanding What Is On The Profile",
    text: "Credit reports contain a large amount of information. The platform turns it into a clearer visual overview.",
    image: understandingImage,
  },
  {
    number: "03",
    title: "No Direction On What To Do Next",
    text: "Turn complex profile data into an organized view of factors, goals, and available self-service tools.",
    image: directionImage,
  },
  {
    number: "04",
    title: "Not Positioned For Funding",
    text: "See the profile characteristics that may influence third-party evaluations before submitting another application.",
    image: fundingImage,
  },
  {
    number: "05",
    title: "Credit Repair Without Clear Visibility",
    text: "Track supported profile information and progress in one place while managing your own workflow.",
    image: repairImage,
  },
];

const ReferralLandingPage: React.FC = () => {
  const { affiliateId: routeAffiliateId, publicId } = useParams<{ affiliateId?: string; publicId?: string }>();
  const affiliateId = routeAffiliateId || publicId;
  const navigate = useNavigate();
  const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [plansLoading, setPlansLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingFilter, setBillingFilter] = useState<"monthly" | "yearly">("monthly");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [disclosureOpen, setDisclosureOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const fetchPricingPlans = async (refCandidate?: string | number) => {
      try {
        const query = refCandidate ? `?ref=${encodeURIComponent(String(refCandidate))}` : "";
        const response = await fetch(`/api/pricing/plans${query}`);
        const result = await response.json();
        if (result.success) setPlans(result.data || []);
      } catch (requestError) {
        console.error("Error fetching pricing plans:", requestError);
      } finally {
        setPlansLoading(false);
      }
    };

    const fetchAffiliateData = async () => {
      if (!affiliateId) {
        setError("Invalid referral link");
        setLoading(false);
        await fetchPricingPlans();
        return;
      }

      try {
        const response = await fetch(`/api/landing/affiliate/${encodeURIComponent(affiliateId)}/info`);
        const result = await response.json();
        if (!result.success) throw new Error(result.error || "Affiliate not found");
        setAffiliate(result.data);
        await fetchPricingPlans(result.data.id || affiliateId);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Failed to load referral information");
        await fetchPricingPlans();
      } finally {
        setLoading(false);
      }
    };

    void fetchAffiliateData();
  }, [affiliateId]);

  useEffect(() => {
    const reveal = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible")),
      { threshold: 0.08 },
    );
    document.querySelectorAll(".affiliate-v2 .reveal").forEach((element) => reveal.observe(element));
    return () => reveal.disconnect();
  }, [loading]);

  const visiblePlans = useMemo(
    () => plans
      .filter((plan) => plan.billing_cycle === billingFilter || plan.billing_cycle === "lifetime")
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [billingFilter, plans],
  );

  const slugOrId = affiliateId?.trim() || affiliate?.id || "";
  const referralLink = slugOrId ? buildReferralLandingUrl(slugOrId) : buildReferralPricingUrl(affiliate?.id);
  const loginUrl = buildAliasUrl("admin", "/login");

  const storeReferral = () => {
    if (!affiliate) return;
    localStorage.setItem("referralAffiliateId", affiliate.id);
    localStorage.setItem("referralAffiliateName", affiliate.name);
    localStorage.setItem("referralCommissionRate", String(affiliate.commissionRate));
  };

  const handleGetStarted = (planId?: number) => {
    storeReferral();
    window.location.href = planId
      ? buildReferralRegisterUrl({ affiliateId: affiliate?.id, planId })
      : buildReferralPricingUrl(affiliate?.id);
  };

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  if (loading) {
    return <div className="affiliate-v2 affiliate-state"><span className="affiliate-spinner" /><p>Loading your referral experience…</p></div>;
  }

  if (error || !affiliate) {
    return (
      <div className="affiliate-v2 affiliate-state">
        <div className="affiliate-error-card">
          <CircleAlert size={34} />
          <h1>Invalid referral link</h1>
          <p>{error || "This referral link is not valid or has expired."}</p>
          <button className="av2-button av2-button-primary" onClick={() => navigate("/")}>Go to homepage</button>
        </div>
      </div>
    );
  }

  const organization = affiliate.companyName?.trim() || "Official Score Machine Partner";

  return (
    <div className="affiliate-v2" id="top">
      <Helmet>
        <title>The Score Machine | Referred by {affiliate.name}</title>
        <meta name="description" content={`${affiliate.name} invites you to explore The Score Machine credit-intelligence and profile-analysis platform.`} />
        <meta property="og:title" content={`The Score Machine | Recommended by ${affiliate.name}`} />
        <meta property="og:description" content="See more than a score. Understand the full profile." />
      </Helmet>

      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent className="w-[96vw] max-w-6xl overflow-hidden p-0">
          <DialogHeader className="border-b px-5 py-3"><DialogTitle>Score Machine Demo</DialogTitle></DialogHeader>
          <div className="aspect-video bg-black">
            {demoOpen && <iframe className="h-full w-full" src="https://www.youtube.com/embed/4KwPYMarpbo?autoplay=1&rel=0" title="Score Machine product demo" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />}
          </div>
        </DialogContent>
      </Dialog>

      <div className="av2-background" aria-hidden="true"><span /><span /><span /></div>

      <div className="av2-disclosure">
        You were referred by <strong>{affiliate.name}</strong>. The referring affiliate may receive compensation from qualifying purchases.
        <button onClick={() => setDisclosureOpen(true)}>Learn more</button>
      </div>

      <header className="av2-nav">
        <a href="#top" className="av2-brand" aria-label="The Score Machine home">
          <img src="/image.png" alt="The Score Machine" />
          <span>The Score Machine</span>
        </a>
        <nav className="av2-nav-links" aria-label="Primary navigation">
          <button onClick={() => scrollTo("platform")}>Platform</button>
          <button onClick={() => scrollTo("problems")}>Problems Solved</button>
          <button onClick={() => scrollTo("how")}>How It Works</button>
          <button onClick={() => scrollTo("features")}>Features</button>
          <button onClick={() => scrollTo("pricing")}>Pricing</button>
          <button onClick={() => scrollTo("faq")}>FAQ</button>
        </nav>
        <div className="av2-nav-actions">
          <span>Recommended by <strong>{affiliate.firstName}</strong></span>
          <a href={loginUrl}>Log in</a>
          <button className="av2-button av2-button-primary av2-button-small" onClick={() => scrollTo("pricing")}>Explore plans</button>
        </div>
        <button className="av2-menu-button" aria-label="Toggle navigation" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)}>
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
        {mobileMenuOpen && (
          <nav className="av2-mobile-menu" aria-label="Mobile navigation">
            {["platform", "problems", "how", "features", "pricing", "faq"].map((item) => <button key={item} onClick={() => scrollTo(item)}>{item === "how" ? "How It Works" : item.replace(/^./, (letter) => letter.toUpperCase())}</button>)}
            <a href={loginUrl}>Log in</a>
          </nav>
        )}
      </header>

      <main>
        <section className="av2-hero av2-shell">
          <div className="reveal">
            <div className="av2-recommended"><span className="av2-dot" /> Recommended by <strong>{affiliate.name}</strong></div>
            <h1>See More Than a Score.<span>Understand the Full Profile.</span></h1>
            <p className="av2-lead">The Score Machine organizes complex credit-profile information into a clearer view of strengths, negative factors, limiting factors, and potential next steps.</p>
            <div className="av2-bullets">
              <span><i className="av2-dot" />Multi-Bureau Profile Overview</span>
              <span><i className="av2-dot cyan" />Underwriting-Style Evaluation</span>
              <span><i className="av2-dot violet" />Action-Focused Insights</span>
            </div>
            <div className="av2-button-row">
              <button className="av2-button av2-button-primary" onClick={() => scrollTo("pricing")}>Explore plans <ArrowRight size={18} /></button>
              <button className="av2-button av2-button-ghost" onClick={() => setDemoOpen(true)}>Watch the demo</button>
            </div>
            <p className="av2-smallprint">The Score Machine provides software tools and educational information. Outcomes and third-party decisions are never guaranteed.</p>
          </div>
          <div className="av2-hero-visual reveal">
            <div className="av2-image-glow" />
            <img src={dashboardImage} alt="The Score Machine profile analysis dashboard" />
            <div className="av2-hero-chip"><ShieldCheck /><span><strong>Secure profile view</strong>Organized for clarity</span></div>
          </div>
        </section>

        <section className="av2-trust-strip">
          {['AI-Assisted Analysis', 'Multi-Bureau Profile View', 'Secure Data Experience', 'Built for Individuals and Professionals'].map((item) => <span key={item}>{item}</span>)}
        </section>

        <section id="platform" className="av2-shell av2-split av2-section">
          <div className="reveal">
            <p className="av2-eyebrow">What is The Score Machine?</p>
            <h2>A clearer way to <span>understand and manage</span> profile information.</h2>
            <p>The Score Machine is a credit-intelligence and workflow platform designed to help individuals and professionals organize, review, and monitor credit-profile information.</p>
            <p>Instead of focusing only on a single score, the platform surfaces the broader information that may affect how a profile is evaluated.</p>
          </div>
          <div className="av2-profile-card reveal">
            <div className="av2-card-heading"><strong>Profile Overview</strong><span>● Live</span></div>
            <div className="av2-stat-grid">
              {[['Overall', '715'], ['Negative Factors', '4'], ['Limiting Factors', '3'], ['Utilization', '34%'], ['Inquiries', '7'], ['Monitoring', 'Active']].map(([label, value], index) => <div key={label} className={`stat-${index}`}><small>{label}</small><strong>{value}</strong></div>)}
            </div>
            <div className="av2-progress-label"><span>Goal progress</span><strong>64%</strong></div>
            <div className="av2-progress"><span /></div>
          </div>
        </section>

        <section id="problems" className="av2-shell av2-section">
          <div className="av2-section-heading reveal">
            <p className="av2-eyebrow cyan">Problems solved</p>
            <h2>Five Problems a Score Alone <span>Cannot Explain</span></h2>
            <p>A score is only one part of a much larger profile. The Score Machine helps organize the information behind the number.</p>
          </div>
          <div className="av2-problem-grid">
            {problemCards.map((problem, index) => (
              <article className={`av2-problem-card reveal ${index === 0 ? "featured" : ""}`} key={problem.number}>
                <div className="av2-problem-copy">
                  <span className="av2-number">{problem.number}</span>
                  <div><h3>{problem.title}</h3><p>{problem.text}</p>{problem.tags && <div className="av2-tags">{problem.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}</div>
                </div>
                <img src={problem.image} alt={problem.title} />
              </article>
            ))}
          </div>
        </section>

        <section id="how" className="av2-section av2-how">
          <div className="av2-shell">
            <div className="av2-section-heading reveal"><p className="av2-eyebrow">How it works</p><h2>From Complex Information to a <span>Clearer View</span></h2></div>
            <div className="av2-steps">
              {[['1', 'Connect', 'Bring supported profile information into one organized experience.'], ['2', 'Analyze', 'The platform organizes data and highlights important information.'], ['3', 'Understand', 'Review strengths, negative information, limiting factors, and differences.'], ['4', 'Track & Manage', 'Use monitoring, goal tracking, education, and self-service tools.']].map(([number, title, text]) => <article className="reveal" key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}
            </div>
          </div>
        </section>

        <section id="features" className="av2-shell av2-section">
          <div className="av2-section-heading reveal"><p className="av2-eyebrow">Features</p><h2>One Platform. <span>A More Complete View.</span></h2></div>
          <div className="av2-feature-grid">
            {features.map(({ icon: Icon, title, text }) => <article className="reveal" key={title}><div><Icon /></div><h3>{title}</h3><p>{text}</p></article>)}
          </div>
        </section>

        <section className="av2-shell av2-section av2-audiences">
          <div className="av2-section-heading reveal"><h2>Built for <span>Different Stages of Growth</span></h2></div>
          <div>{[['Individual Users', 'A clearer understanding of your own profile.'], ['Growing Professionals', 'Organize and manage multiple clients.'], ['Established Teams', 'Greater user and client capacity.'], ['High-Volume Operations', 'Broad access for larger organizations.']].map(([title, text]) => <article className="reveal" key={title}><h3>{title}</h3><p>{text}</p></article>)}</div>
        </section>

        <section id="pricing" className="av2-section av2-pricing">
          <div className="av2-shell">
            <div className="av2-section-heading reveal"><p className="av2-eyebrow cyan">Pricing</p><h2>Choose the Capacity That <span>Fits Your Workflow</span></h2><p>Every available plan includes the platform’s core profile-analysis and self-service tools.</p></div>
            <div className="av2-toggle reveal" role="group" aria-label="Billing period">
              <button className={billingFilter === "monthly" ? "active" : ""} onClick={() => setBillingFilter("monthly")}>Monthly</button>
              <button className={billingFilter === "yearly" ? "active" : ""} onClick={() => setBillingFilter("yearly")}>Yearly</button>
            </div>
            {plansLoading ? <div className="affiliate-spinner" /> : visiblePlans.length ? (
              <div className="av2-plan-grid">
                {visiblePlans.map((plan, index) => (
                  <article className={`av2-plan reveal ${index === 1 ? "popular" : ""}`} key={plan.id}>
                    {index === 1 && <span className="av2-plan-badge">Most popular</span>}
                    <small>{plan.name}</small><p>{plan.description}</p>
                    <div className="av2-price"><strong>${Number(plan.price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong><span>/{plan.billing_cycle === "monthly" ? "month" : plan.billing_cycle === "yearly" ? "year" : "once"}</span></div>
                    <div className="av2-capacity"><span>{plan.max_users ?? "Unlimited"} {plan.max_users === 1 ? "user" : "users"}</span><span>{plan.max_clients ?? "Unlimited"} {plan.max_clients === 1 ? "client" : "clients"}</span></div>
                    <ul>{plan.features.map((feature) => <li key={feature}><Check />{feature}</li>)}</ul>
                    <button className={`av2-button ${index === 1 ? "av2-button-primary" : "av2-button-ghost"}`} onClick={() => handleGetStarted(plan.id)}>Choose {plan.name}</button>
                  </article>
                ))}
              </div>
            ) : <p className="av2-no-plans">No {billingFilter} plans are currently available. Try the other billing option.</p>}
          </div>
        </section>

        <section className="av2-shell av2-section">
          <div className="av2-recommendation reveal">
            <div><p className="av2-eyebrow">Personal recommendation</p><h2>Recommended by <span>{affiliate.name}</span></h2><p>{affiliate.firstName} invited you to explore The Score Machine and determine whether its tools and subscription options fit your needs.</p><div className="av2-partner"><strong>{affiliate.name}</strong><span>{organization}</span><small>Official Affiliate</small></div><div className="av2-button-row"><button className="av2-button av2-button-primary" onClick={() => scrollTo("pricing")}>See plans</button><a className="av2-button av2-button-ghost" href={referralLink}>Open referral link</a></div></div>
            <div className="av2-qr"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(referralLink)}`} alt={`QR code for ${affiliate.name}'s referral link`} /><span>Scan to visit the referral link</span></div>
          </div>
        </section>

        <section id="faq" className="av2-shell av2-section av2-faq">
          <div className="av2-section-heading reveal"><p className="av2-eyebrow violet">FAQ</p><h2>Frequently <span>Asked Questions</span></h2></div>
          <div className="reveal">{faqs.map(([question, answer], index) => <article className={openFaq === index ? "open" : ""} key={question}><button aria-expanded={openFaq === index} onClick={() => setOpenFaq(openFaq === index ? null : index)}><span>{question}</span><ChevronDown /></button><div><p>{answer}</p></div></article>)}</div>
        </section>

        <section className="av2-final-cta">
          <div className="reveal"><p className="av2-eyebrow">Your profile is more than one number</p><h2>Get a Clearer View of <span>What Is On Your Profile.</span></h2><p>Explore The Score Machine’s analysis, monitoring, workflow, and self-service tools through the plan that fits your needs.</p><div className="av2-button-row"><button className="av2-button av2-button-primary" onClick={() => scrollTo("pricing")}>Compare plans</button><button className="av2-button av2-button-ghost" onClick={() => handleGetStarted()}>Get started</button></div></div>
        </section>
      </main>

      <footer className="av2-footer">
        <div className="av2-shell av2-footer-grid"><div><div className="av2-brand"><img src="/image.png" alt="" /><span>The Score Machine</span></div><p>A credit-intelligence and workflow platform for organizing, analyzing, and monitoring profile information.</p></div><div><strong>Platform</strong><button onClick={() => scrollTo("platform")}>Platform</button><button onClick={() => scrollTo("pricing")}>Pricing</button><button onClick={() => scrollTo("faq")}>FAQ</button></div><div><strong>Policies</strong><a href="/privacy">Privacy Policy</a><a href="/terms">Terms & Conditions</a><a href="/refund">Refund Policy</a></div><div><strong>Referred by</strong><span>{affiliate.name}</span><small>{organization}</small></div></div>
        <div className="av2-shell av2-footer-legal"><p>The Score Machine is a software and educational platform. It is not a lender, law firm, credit bureau, or financial adviser. The platform does not guarantee score changes, removals, approvals, funding, rates, limits, or other third-party outcomes.</p><p>This page contains affiliate links. The referring affiliate may receive compensation from qualifying purchases.</p><span>© {new Date().getFullYear()} The Score Machine. All rights reserved.</span></div>
      </footer>

      {disclosureOpen && <div className="av2-modal" role="dialog" aria-modal="true" aria-labelledby="disclosure-title" onMouseDown={(event) => event.target === event.currentTarget && setDisclosureOpen(false)}><div><button className="av2-modal-close" aria-label="Close disclosure" onClick={() => setDisclosureOpen(false)}><X /></button><h2 id="disclosure-title">Affiliate Disclosure</h2><p>This page contains an affiliate link. {affiliate.name} may receive compensation when a qualifying purchase is made.</p><p>You were referred by <strong>{affiliate.name}</strong> of {organization}. Your decision to explore or purchase The Score Machine is entirely your own.</p><button className="av2-button av2-button-primary" onClick={() => setDisclosureOpen(false)}>Close</button></div></div>}
    </div>
  );
};

export default ReferralLandingPage;
