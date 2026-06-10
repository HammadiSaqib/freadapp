import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, Star, Users, ArrowRight, Shield, BarChart3, Menu, Play, Zap, FileText, TrendingUp, Mail, DollarSign, Sparkles, Globe, Phone, Target } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import FallingMoney from '@/components/ui/FallingMoney'; // Assuming this is available as in Index.tsx
import { Helmet } from "react-helmet-async";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import ReferralEliteLandingPage from './ReferralEliteLandingPage';
import {
  buildReferralLandingUrl,
  buildReferralPricingUrl,
  buildReferralRegisterUrl,
  getPublicAliasOrigin,
} from "@/lib/hostRouting";

gsap.registerPlugin(ScrollTrigger);

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
  eliteLandingPage?: boolean;
  elite_landing_page?: 'allow' | 'deny';
}

interface PricingPlan {
  id: number;
  name: string;
  description: string;
  price: number;
  billing_cycle: string;
  features: string[];
  max_users?: number;
  max_clients?: number;
  sort_order?: number;
}

const ReferralFooter: React.FC<{ affiliate: AffiliateData }> = ({ affiliate }) => {
  return (
    <footer className="relative z-10 bg-black !bg-black border-t border-slate-800 pt-16 pb-8 px-4 text-slate-300" style={{ backgroundColor: 'black' }}>
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between gap-12 mb-12">
          {/* Brand Column */}
          <div className="max-w-sm space-y-4">
            <div className="flex items-center space-x-2">
              <img src="/image.png" alt="Fread App" className="w-20 h-14" />
              <span className="text-xl font-bold text-white">Fread App</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Empowering financial futures through AI-driven credit intelligence and professional management tools.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <a
                href="tel:+14752598768"
                className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-slate-400 border border-slate-800"
                aria-label="Call (475) 259-8768"
              >
                <Phone className="w-4 h-4" />
              </a>
              <a
                href="/contact"
                className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-slate-400 border border-slate-800"
                aria-label="Contact Fread App support"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Referral Badge Column */}
          <div>
            <h4 className="font-semibold text-white mb-4">Referred By</h4>
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-teal-500/10 rounded-full flex items-center justify-center border border-teal-500/20">
                  <Users className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <p className="font-medium text-white">{affiliate.firstName} {affiliate.lastName}</p>
                  <p className="text-xs text-slate-400">Official Partner</p>
                </div>
              </div>
              {affiliate.companyName && (
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-2 pt-2 border-t border-slate-800">
                  <Shield className="w-3 h-3" />
                  <span>{affiliate.companyName}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} Fread App. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

const ReferralLandingPage: React.FC = () => {
  const { affiliateId: routeAffiliateId, publicId } = useParams<{ affiliateId?: string; publicId?: string }>();
  const affiliateId = routeAffiliateId || publicId;
  const navigate = useNavigate();
  const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [plansLoading, setPlansLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingFilter, setBillingFilter] = useState<'monthly' | 'yearly'>('monthly');
  const [demoOpen, setDemoOpen] = useState(false);
  const [selectedLandingExperience, setSelectedLandingExperience] = useState<'pro' | 'elite' | null>(null);
  const ctaRef = React.useRef<HTMLDivElement>(null);
  const slugOrId = (affiliateId && affiliateId.trim().length > 0) ? affiliateId : (affiliate?.id ? String(affiliate.id) : '');
  const referralLink = slugOrId ? buildReferralLandingUrl(slugOrId) : getPublicAliasOrigin('ref');
  const heroImageSrc = affiliate?.logoUrl && affiliate.logoUrl.trim().length > 0
    ? affiliate.logoUrl
    : "https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg";
  const heroImageClassName = affiliate?.logoUrl && affiliate.logoUrl.trim().length > 0
    ? "w-full h-auto object-contain bg-white"
    : "w-full h-auto object-cover";

  useGSAP(() => {
    const el = ctaRef.current;
    if (!el) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start: "top 80%",
        toggleActions: "play none none reverse"
      }
    });

    tl.fromTo(".cta-content", 
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: "power3.out", stagger: 0.2 }
    )
    .fromTo(".cta-glow",
      { opacity: 0, scale: 0.8 },
      { opacity: 1, scale: 1, duration: 1.5, ease: "power2.out" },
      "-=0.8"
    );

  }, { scope: ctaRef });

  useEffect(() => {
    const fetchPricingPlans = async (refCandidate?: string | number) => {
      try {
        const refQuery = refCandidate ? `?ref=${encodeURIComponent(String(refCandidate))}` : '';
        const response = await fetch(`/api/pricing/plans${refQuery}`);
        const result = await response.json();

        if (result.success) {
          setPlans(result.data);
        } else {
          console.error('Failed to load pricing plans:', result.error);
        }
      } catch (err) {
        console.error('Error fetching pricing plans:', err);
      } finally {
        setPlansLoading(false);
      }
    };

    const fetchAffiliateData = async () => {
      if (!affiliateId) {
        setError('Invalid referral link');
        setLoading(false);
        await fetchPricingPlans();
        return;
      }

      try {
        const response = await fetch(`/api/landing/affiliate/${encodeURIComponent(affiliateId)}/info`);
        const result = await response.json();
        console.log('[ReferralLandingPage] RAW API response:', result);

        if (result.success) {
          const data = result.data || {};
          const eliteAllowed =
            data.eliteLandingPage === true ||
            String(data.elite_landing_page || '').toLowerCase() === 'allow';
          console.log('[ReferralLandingPage] data.eliteLandingPage =', data.eliteLandingPage,
            '| data.elite_landing_page =', data.elite_landing_page,
            '| computed eliteAllowed =', eliteAllowed);
          setAffiliate({ ...data, eliteLandingPage: eliteAllowed });
          await fetchPricingPlans(data.id || affiliateId);
        } else {
          setError(result.error || 'Affiliate not found');
          await fetchPricingPlans();
        }
      } catch (err) {
        console.error('Error fetching affiliate data:', err);
        setError('Failed to load referral information');
        await fetchPricingPlans();
      } finally {
        setLoading(false);
      }
    };

    fetchAffiliateData();
  }, [affiliateId]);

  useEffect(() => {
    if (!affiliate) {
      return;
    }

    const next = affiliate.eliteLandingPage ? null : 'pro';
    console.log('[ReferralLandingPage] effect - affiliate.eliteLandingPage =', affiliate.eliteLandingPage,
      '=> selectedLandingExperience =', next);
    setSelectedLandingExperience(next);
  }, [affiliate?.eliteLandingPage, affiliate?.id]);

  const handleGetStarted = (planId?: number) => {
    if (affiliate) {
      localStorage.setItem('referralAffiliateId', affiliate.id);
      localStorage.setItem('referralAffiliateName', affiliate.name);
      localStorage.setItem('referralCommissionRate', affiliate.commissionRate.toString());
    }

    const targetUrl = planId
      ? buildReferralRegisterUrl({ affiliateId: affiliate?.id, planId })
      : buildReferralPricingUrl(affiliate?.id);

    window.location.href = targetUrl;
  };

  const handleLearnMore = () => {
    if (affiliate) {
      localStorage.setItem('referralAffiliateId', affiliate.id);
      localStorage.setItem('referralAffiliateName', affiliate.name);
    }
    setDemoOpen(true);
  };

  const scrollToPricing = () => {
    const pricingSection = document.getElementById('pricing');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading referral information...</p>
        </div>
      </div>
    );
  }

  if (error || !affiliate) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md border-slate-200 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Invalid Referral Link</CardTitle>
            <CardDescription>{error || 'This referral link is not valid or has expired.'}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/')} variant="outline">
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (affiliate.eliteLandingPage && selectedLandingExperience === 'elite') {
    return (
      <ReferralEliteLandingPage
        affiliate={affiliate}
        plans={plans}
        plansLoading={plansLoading}
        referralLink={referralLink}
        onOpenDemo={handleLearnMore}
        onGetStarted={handleGetStarted}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden font-sans selection:bg-teal-400/20 text-slate-600">
      <Helmet>
        <title>Fread App - Referred by {affiliate.firstName}</title>
        <meta name="description" content={`Special offer from ${affiliate.name} to join Fread App.`} />
      </Helmet>

      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent className="w-[98vw] sm:w-[96vw] lg:w-[92vw] xl:w-[88vw] 2xl:w-[85vw] max-w-none m-0 p-0 overflow-hidden bg-white rounded-xl">
          <DialogHeader className="px-4 py-3 border-b border-slate-100 hidden sm:flex">
            <DialogTitle>Fread App Demo</DialogTitle>
          </DialogHeader>
          <div className="w-full bg-black h-[88dvh] sm:h-auto sm:aspect-video sm:max-h-[92vh]">
            {demoOpen && (
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/4KwPYMarpbo?autoplay=1&rel=0"
                title="Fread App Pro Full Walkthrough"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {(() => {
        console.log('[ReferralLandingPage] RENDER - affiliate.eliteLandingPage =', affiliate.eliteLandingPage,
          '| selectedLandingExperience =', selectedLandingExperience,
          '| chooser visible =', (affiliate.eliteLandingPage && selectedLandingExperience === null));
        return null;
      })()}
      {affiliate.eliteLandingPage && selectedLandingExperience === null && (
        <div
          data-debug-chooser="true"
          ref={(el) => {
            if (el) {
              const rect = el.getBoundingClientRect();
              console.log('[ReferralLandingPage] CHOOSER DOM NODE MOUNTED', {
                rect,
                computedDisplay: getComputedStyle(el).display,
                computedVisibility: getComputedStyle(el).visibility,
                computedOpacity: getComputedStyle(el).opacity,
                computedZIndex: getComputedStyle(el).zIndex,
                computedPosition: getComputedStyle(el).position,
                parent: el.parentElement?.tagName,
              });
            }
          }}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2147483647 }}
          className="flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-5xl rounded-[2rem] border border-white/10 bg-white p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] md:p-8">
            <div className="mb-8 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
                Choose Your Experience
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                {affiliate.firstName}&apos;s Referral Link Has Two Landing Pages
              </h2>
              <p className="mt-3 text-base text-slate-600 md:text-lg">
                Pick the experience you want to open: the current Fread App Pro landing page, or the new Fread App Elite landing page.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setSelectedLandingExperience('pro')}
                className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-teal-300 hover:shadow-[0_20px_45px_rgba(20,184,166,0.18)]"
              >
                <div className="border-b border-slate-200 bg-gradient-to-br from-teal-500 via-emerald-500 to-cyan-500 p-6 text-white">
                  <div className="text-xs font-bold uppercase tracking-[0.3em] text-white/80">Fread App Pro</div>
                  <div className="mt-3 text-3xl font-black tracking-tight">Current Landing Page</div>
                  <div className="mt-2 max-w-sm text-sm text-white/90">
                    Keep the referral experience exactly as it works today.
                  </div>
                </div>
                <div className="space-y-4 p-6">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-900">Professional Credit Intelligence</div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-teal-700">Live Now</span>
                    </div>
                    <div className="grid gap-2">
                      <div className="h-3 w-2/3 rounded-full bg-slate-200"></div>
                      <div className="h-3 w-full rounded-full bg-slate-100"></div>
                      <div className="h-3 w-4/5 rounded-full bg-slate-100"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Show Pro</div>
                      <div className="text-sm text-slate-500">Current layout, pricing flow, and messaging.</div>
                    </div>
                    <span className="rounded-full bg-teal-50 px-4 py-2 text-sm font-bold text-teal-700 transition-colors group-hover:bg-teal-100">
                      Open Pro
                    </span>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedLandingExperience('elite')}
                className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-violet-300 hover:shadow-[0_20px_45px_rgba(139,92,246,0.2)]"
              >
                <div className="border-b border-slate-200 bg-[#0f172a] p-6 text-white">
                  <div className="text-xs font-bold uppercase tracking-[0.3em] text-violet-200">Fread App Elite</div>
                  <div className="mt-3 bg-gradient-to-r from-violet-300 via-fuchsia-300 to-orange-300 bg-clip-text text-3xl font-black tracking-tight text-transparent">
                    New Elite Landing Page
                  </div>
                  <div className="mt-2 max-w-sm text-sm text-slate-300">
                    Open the premium Elite referral experience from your separate design server.
                  </div>
                </div>
                <div className="space-y-4 p-6">
                  <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 p-5">
                    <div className="absolute left-[-20%] top-[-30%] h-40 w-40 rounded-full bg-violet-500/30 blur-3xl"></div>
                    <div className="absolute bottom-[-20%] right-[-10%] h-32 w-32 rounded-full bg-orange-400/20 blur-3xl"></div>
                    <div className="relative z-10 rounded-[1.5rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
                      <div className="mb-4 h-3 w-24 rounded-full bg-white/30"></div>
                      <div className="mb-3 h-10 w-3/4 rounded-2xl bg-gradient-to-r from-violet-500/80 to-orange-500/80"></div>
                      <div className="grid gap-2">
                        <div className="h-3 w-full rounded-full bg-white/10"></div>
                        <div className="h-3 w-4/5 rounded-full bg-white/10"></div>
                        <div className="h-3 w-2/3 rounded-full bg-white/10"></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Show Elite</div>
                      <div className="text-sm text-slate-500">Bold premium UI with the new imported Elite presentation.</div>
                    </div>
                    <span className="rounded-full bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700 transition-colors group-hover:bg-violet-100">
                      Open Elite
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- GLOBAL BACKGROUND PATTERN --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-slate-50"></div>
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px), 
                             linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        ></div>
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-teal-200/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-emerald-200/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
        <div className="absolute top-[40%] left-[20%] w-[30vw] h-[30vw] bg-indigo-200/20 rounded-full blur-[100px]"></div>
      </div>

      {/* Header */}
      <header className="fixed w-full z-50 top-0 start-0 border-b border-white/20 bg-white/80 backdrop-blur-md transition-all duration-300">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
             {/* Logo */}
             <img src="/image.png" alt="Fread App" className="w-20 h-14" />
            <span className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Fread App
            </span>
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50/80 rounded-full border border-blue-100">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                    Referred by {affiliate.firstName}
                </span>
            </div>
            <Button 
                onClick={scrollToPricing}
                className="rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:from-teal-500 hover:to-emerald-500 shadow-lg hover:shadow-emerald-500/25 transition-all duration-300"
            >
              Get Started
            </Button>
          </div>

          {/* Mobile menu */}
          <div className="md:hidden ml-auto">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle>
                     <div className="flex items-center space-x-2">
                        <img src="/image.png" alt="Fread App" className="w-16 h-10" />
                        <span className="font-bold text-slate-900">Fread App</span>
                     </div>
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div className="px-3 py-2 bg-blue-50 rounded-lg border border-blue-100 text-center">
                    <p className="text-sm text-blue-800 font-medium">Referred by {affiliate.firstName}</p>
                  </div>
                  <div className="grid gap-3">
                    <Button className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white" onClick={scrollToPricing}>Get Started</Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="relative min-h-[100vh] flex items-center pt-20 lg:pt-0 overflow-hidden">
        
        {/* Animated Background Layer */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          {/* Attempt to use FallingMoney if available, else fallback provided by parent div styles */}
          <FallingMoney />
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-slate-50 to-transparent z-20"></div>
        </div>

        <div className="container mx-auto px-4 relative z-30">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div className="space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm backdrop-blur-md">
                <Sparkles className="h-4 w-4 text-emerald-500 fill-emerald-500 animate-pulse" />
                <span className="text-sm font-medium text-slate-700">
                    Recommended by {affiliate.firstName} {affiliate.lastName}
                </span>
              </div>

              <h1 className="text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tight text-slate-900">
                <span className="block">Professional</span>
                <span className="pb- 3block bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 bg-clip-text text-transparent">
                  Credit Intelligence
                </span>
                <span className="block text-4xl lg:text-5xl mt-2 text-slate-700">Platform</span>
              </h1>

              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-sm max-w-xl mx-auto lg:mx-0">
                  <p className="text-lg text-slate-700 mb-2">
                    <span className="font-semibold text-teal-700">{affiliate.firstName}</span> has invited you to experience Fread App.
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                     Access advanced credit insights, automated dispute tools, and professional-grade monitoring.
                  </p>
                  {affiliate.companyName && (
                    <div className="mt-3 flex items-center justify-center lg:justify-start gap-2 text-sm text-slate-500">
                        <Shield className="w-4 h-4" />
                        <span>Partner: {affiliate.companyName}</span>
                    </div>
                  )}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
                <Button
                  size="lg"
                  className="h-14 px-8 text-lg rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-lg shadow-teal-500/20 transition-all duration-300 border-0"
                  onClick={scrollToPricing}
                >
                  Start Today <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 text-lg rounded-full border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-400 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                  onClick={handleLearnMore}
                >
                  <Play className="mr-2 h-5 w-5 fill-current" />
                  View Demo
                </Button>
              </div>
              
              <div className="mt-6 flex items-center gap-4 justify-center lg:justify-start">
                <div className="bg-white/90 border border-slate-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(referralLink)}`}
                    alt="Referral QR"
                    className="w-20 h-20"
                  />
                  <div className="text-sm">
                    <div className="font-semibold text-slate-800">Scan to open referral link</div>
                    <div className="text-slate-500">Or visit: <span className="text-teal-700">{referralLink}</span></div>
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-slate-500 italic max-w-md mx-auto lg:mx-0 leading-relaxed">
                Join other users who were referred by {affiliate.firstName} and chose to explore Fread App. No credit card required for signup.
              </p>
            </div>

            {/* Visual Content - Keeping the image but styling like Index.tsx 3D element */}
            <div className="relative perspective-1000">
               <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-[8px] border-white bg-white transform transition-transform hover:scale-[1.02] duration-500">
                  <img
                    src={heroImageSrc}
                    alt="Dashboard Preview"
                    className={heroImageClassName}
                  />
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
                  
                  {/* Floating Elements */}
                  <div className="absolute bottom-8 left-8 right-8">
                     <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-white/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-6 h-6 text-emerald-600" />
                           </div>
                           <div>
                              <p className="text-sm font-semibold text-slate-900">Verified Results</p>
                              <p className="text-xs text-slate-500">Results reported by users. Your results may differ.</p>
                           </div>
                        </div>
                        <div className="text-2xl font-bold text-slate-900">Verified</div>
                     </div>
                  </div>
                  
                  <div className="absolute top-6 right-6 z-30 bg-white/95 backdrop-blur-md rounded-xl p-3 shadow-lg border border-white/50 flex flex-col items-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(referralLink)}`}
                      alt="Referral QR"
                      className="w-24 h-24"
                    />
                    <div className="mt-2 text-xs text-slate-700 font-medium">Scan to open</div>
                    <div className="mt-1 text-[10px] text-slate-500 break-all max-w-[180px]">{referralLink}</div>
                  </div>
               </div>

               {/* Decorative blobs behind */}
               <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-br from-teal-500/20 to-purple-500/20 rounded-full blur-3xl opacity-60"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 bg-slate-50 relative z-10 overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
           <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-teal-200/20 rounded-full blur-[80px] mix-blend-multiply"></div>
           <div className="absolute bottom-[10%] right-[5%] w-80 h-80 bg-emerald-200/20 rounded-full blur-[80px] mix-blend-multiply"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-24 max-w-3xl mx-auto">
            <Badge variant="outline" className="mb-6 border-teal-200 text-teal-700 bg-teal-50/50 px-4 py-1 text-sm font-medium rounded-full">
              Why Choose Fread App
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-slate-900 tracking-tight leading-tight">
              Complete
              <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent px-3">
                Credit Management
              </span>
            </h2>
            <p className="text-xl text-slate-600 leading-relaxed font-light mt-6 mb-6">
              Professional tools powered by AI to help you understand, track, and improve your credit health with confidence.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Users, title: "Expert Guidance", desc: "Professional tools frequently used by credit professionals and recommended by some industry users." },
              { icon: BarChart3, title: "Advanced Analytics", desc: "Visualize your credit progress with detailed charts and score tracking." },
              { icon: Zap, title: "AI Automation", desc: "AI-assisted dispute drafting and automated credit monitoring tools." },
              { icon: Shield, title: "Enterprise-Grade Security", desc: "Enterprise-grade security features to protect your data." },
              { icon: Target, title: "Goal Tracking", desc: "Set and track personalized credit score goals with milestones." },
              { icon: Globe, title: "24/7 Monitoring", desc: "Real-time alerts for changes to your credit report across all bureaus." }
            ].map((feature, i) => (
              <div key={i} className="group relative bg-white rounded-[2rem] p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(20,184,166,0.15)] transition-all duration-500 hover:-translate-y-2 overflow-hidden">
                {/* Gradient Border Effect on Hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 p-[1px] -z-10 rounded-[2rem]">
                   <div className="w-full h-full bg-white rounded-[2rem]"></div>
                </div>

                {/* Subtle Background Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-50/50 to-emerald-50/50 rounded-bl-[4rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 group-hover:bg-gradient-to-br group-hover:from-teal-500 group-hover:to-emerald-600 flex items-center justify-center mb-6 transition-all duration-500 shadow-sm group-hover:shadow-lg group-hover:shadow-teal-500/30 group-hover:scale-110">
                    <feature.icon className="h-8 w-8 text-teal-600 group-hover:text-white transition-colors duration-500" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-slate-900 mb-4 group-hover:text-teal-900 transition-colors duration-300">
                    {feature.title}
                  </h3>
                  
                  <p className="text-slate-500 leading-relaxed group-hover:text-slate-600 transition-colors duration-300 flex-grow">
                    {feature.desc}
                  </p>

                  
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Plans Section */}
      <section id="pricing" className="py-24 bg-slate-50 relative z-10 overflow-hidden">
        {/* Ambient Background Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
            {/* Top Left Blob */}
            <div className="absolute top-0 -left-20 w-[500px] h-[500px] bg-teal-200/30 rounded-full blur-[80px] mix-blend-multiply animate-pulse"></div>
            
            {/* Bottom Right Blob */}
            <div className="absolute bottom-0 -right-20 w-[500px] h-[500px] bg-emerald-200/30 rounded-full blur-[80px] mix-blend-multiply animate-pulse delay-1000"></div>
            
            {/* Center Decorative Circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-slate-200/50 rounded-full"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-slate-200/50 rounded-full opacity-70"></div>
            
            {/* Floating Geometric Shapes */}
            <div className="absolute top-20 right-20 w-24 h-24 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-2xl rotate-12 blur-sm opacity-60"></div>
            <div className="absolute bottom-40 left-20 w-32 h-32 bg-gradient-to-tr from-blue-100 to-teal-100 rounded-full blur-sm opacity-60"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 tracking-tight">
              Simple, Transparent <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">Pricing</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto font-light">
              Choose the perfect plan to accelerate your credit journey. Transparent pricing, no hidden fees.
            </p>
          </div>

          {/* Billing Cycle Tabs */}
          <div className="flex justify-center mb-16">
            <Tabs value={billingFilter} onValueChange={(val) => setBillingFilter(val as 'monthly' | 'yearly')} className="w-full max-w-md">
              <TabsList className="grid w-full grid-cols-2 p-1.5 bg-teal-50/50 border border-teal-100 rounded-full h-16 shadow-lg">
                <TabsTrigger 
                  value="monthly" 
                  className="rounded-full h-full text-slate-600 data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm transition-all duration-300 font-medium text-base"
                >
                  Monthly
                </TabsTrigger>
                <TabsTrigger 
                  value="yearly" 
                  className="group rounded-full h-full text-slate-600 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:!text-white data-[state=active]:font-semibold data-[state=active]:shadow-md transition-all duration-300 font-medium text-base relative overflow-hidden"
                >
                  Yearly <span className="ml-2 text-xs bg-teal-100/50 text-teal-800 group-data-[state=active]:bg-white/20 group-data-[state=active]:!text-white px-2 py-0.5 rounded-full transition-colors duration-300">2 months free</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {plansLoading ? (
             <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
             </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto items-center">
              {plans.filter(p => p.billing_cycle === billingFilter).map((plan, index) => (
                <Card key={plan.id} className={`relative border transition-all duration-500 flex flex-col h-full ${
                  index === 1 
                    ? 'border-teal-500 shadow-[0_20px_60px_-15px_rgba(20,184,166,0.3)] bg-white scale-105 z-10' 
                    : 'border-slate-200 bg-white/50 backdrop-blur-sm hover:border-teal-200 hover:shadow-xl'
                }`}>
                  {index === 1 && (
                    <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 w-full text-center">
                      <div className="inline-block bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-600 text-white px-6 py-1.5 text-sm font-bold uppercase tracking-wider rounded-full shadow-lg shadow-emerald-600/30 animate-shimmer bg-[length:200%_100%]">
                        Most Popular
                      </div>
                    </div>
                  )}
                  
                  <CardHeader className={`text-center pb-2 ${index === 1 ? 'pt-10' : 'pt-8'}`}>
                    <CardTitle className="text-2xl font-bold text-slate-900 mb-2">
                      {plan.name}
                    </CardTitle>
                    <CardDescription className="text-slate-500 text-base min-h-[48px] flex items-center justify-center">
                      {plan.description}
                    </CardDescription>
                    <div className="mt-8 flex items-baseline justify-center text-slate-900">
                      <span className="text-lg text-slate-500 mr-1">$</span>
                      <span className="text-6xl font-bold tracking-tighter">{plan.price}</span>
                      <span className="text-lg text-slate-500 ml-1">/{plan.billing_cycle === 'monthly' ? 'mo' : 'yr'}</span>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="px-8 pb-8 pt-6 flex-grow flex flex-col">
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-8"></div>
                    
                    <div className="space-y-5 mb-8 flex-grow">
                      {plan.features.map((feature, i) => (
                        <div key={i} className="flex items-start group">
                          <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 mr-3 transition-colors ${
                             index === 1 ? 'bg-teal-100 text-teal-600 group-hover:bg-teal-600 group-hover:text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
                          }`}>
                            <CheckCircle className="w-4 h-4" />
                          </div>
                          <span className={`text-sm leading-relaxed transition-colors ${
                            index === 1 ? 'text-slate-600 group-hover:text-slate-900' : 'text-slate-500 group-hover:text-slate-700'
                          }`}>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-slate-200 pt-6 mb-8 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Max Users:</span>
                        <span className="font-semibold text-slate-900">{plan.max_users ?? 'Unlimited'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Max Clients:</span>
                        <span className="font-semibold text-slate-900">{plan.max_clients ?? 'Unlimited'}</span>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => handleGetStarted(plan.id)}
                      className={`w-full py-7 text-lg font-semibold rounded-2xl transition-all duration-300 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-lg shadow-teal-600/20 hover:shadow-teal-600/30 hover:-translate-y-1 ${
                        index === 1 ? 'shadow-teal-600/40 ring-2 ring-teal-500/20' : ''
                      }`}
                    >
                      Choose {plan.name}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaRef} className="py-32 relative overflow-hidden bg-black">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-black to-black opacity-80"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>')] opacity-10 mix-blend-overlay"></div>
        
        {/* Glowing Orbs */}
        <div className="cta-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-teal-500/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none"></div>
        <div className="cta-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-[100px] mix-blend-screen pointer-events-none delay-150"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            
            <div className="cta-content mb-8 inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/50 border border-slate-800 backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-sm font-medium text-white">
                Exclusive Invitation
              </span>
            </div>

            <h2 className="cta-content text-5xl md:text-7xl font-bold mb-8 tracking-tight text-white leading-tight">
              Start Your Journey <br />
              <span className="text-white">
                With Fread App
              </span>
            </h2>
            
            <p className="cta-content text-xl md:text-2xl text-slate-200 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
              Join <span className="text-white font-medium">{affiliate.firstName}</span> and others who are working to improve their credit management using Fread App tools. Outcomes vary and are not guaranteed.
            </p>

            <div className="cta-content flex flex-col sm:flex-row items-center justify-center gap-6">
              <Button 
                onClick={scrollToPricing}
                size="lg" 
                className="group relative h-16 px-12 text-lg font-semibold rounded-full bg-white text-black hover:bg-slate-100 transition-all duration-300 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.5)] hover:-translate-y-1"
              >
                Get Started Now
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <ReferralFooter affiliate={affiliate} />
      
     
    </div>
  );
};

export default ReferralLandingPage;
