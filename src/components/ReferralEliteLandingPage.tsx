import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Check,
  ChevronRight,
  Fingerprint,
  Layers,
  Play,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';

type AffiliateLandingAffiliate = {
  id: string | number;
  name: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  email: string;
  totalReferrals: number;
  commissionRate: number;
  logoUrl?: string;
  status: string;
};

type AffiliateLandingPlan = {
  id: number;
  name: string;
  description: string;
  price: number;
  billing_cycle: string;
  features: string[];
  max_users?: number;
  max_clients?: number;
  sort_order?: number;
};

type ReferralEliteLandingPageProps = {
  affiliate: AffiliateLandingAffiliate;
  plans: AffiliateLandingPlan[];
  plansLoading: boolean;
  referralLink: string;
  onOpenDemo: () => void;
  onGetStarted: (planId?: number) => void;
};

const FeatureCard = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      className={`relative overflow-hidden rounded-[2.5rem] border border-slate-200/60 bg-white p-10 shadow-xl shadow-slate-200/50 transition-all duration-300 ${className}`}
    >
      {children}
    </motion.div>
  );
};

function EliteNavbar({ onPrimaryAction }: { onPrimaryAction: () => void }) {
  return (
    <nav className="elite-affiliate-glass fixed left-1/2 top-6 z-[100] flex w-[90%] max-w-6xl -translate-x-1/2 items-center justify-between rounded-full px-6 py-4 transition-all duration-500 hover:shadow-2xl hover:shadow-violet-500/10">
      <div className="group flex cursor-pointer items-center gap-3 text-xl font-black tracking-tighter">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 shadow-lg transition-transform duration-300 group-hover:scale-105">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <span className="text-slate-900 transition-all duration-300 group-hover:bg-gradient-to-r group-hover:from-violet-600 group-hover:to-orange-500 group-hover:bg-clip-text group-hover:text-transparent">
          ScoreMachine Elite
        </span>
      </div>
      <div className="hidden space-x-10 text-sm font-bold text-slate-500 md:flex">
        <button className="transition-colors hover:text-slate-900" onClick={onPrimaryAction}>Platform</button>
        <button className="transition-colors hover:text-slate-900" onClick={onPrimaryAction}>Solutions</button>
        <button className="transition-colors hover:text-slate-900" onClick={onPrimaryAction}>Pricing</button>
      </div>
      <button
        className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 font-bold text-white transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]"
        onClick={onPrimaryAction}
      >
        Get Started
      </button>
    </nav>
  );
}

function EliteHero({
  affiliate,
  onOpenDemo,
  onPrimaryAction,
}: {
  affiliate: AffiliateLandingAffiliate;
  onOpenDemo: () => void;
  onPrimaryAction: () => void;
}) {
  return (
    <section className="elite-affiliate-bg-dots relative flex min-h-[90vh] items-center overflow-hidden pb-32 pt-40">
      <div className="pointer-events-none absolute left-[-10%] top-[-20%] -z-10 h-[60vw] w-[60vw] animate-blob rounded-full bg-fuchsia-300 opacity-30 blur-[150px] mix-blend-multiply"></div>
      <div className="pointer-events-none absolute right-[-10%] top-[10%] -z-10 h-[50vw] w-[50vw] animate-blob rounded-full bg-violet-300 opacity-30 blur-[150px] mix-blend-multiply animation-delay-2000"></div>
      <div className="pointer-events-none absolute bottom-[-10%] left-[20%] -z-10 h-[50vw] w-[70vw] animate-blob rounded-full bg-orange-200 opacity-30 blur-[150px] mix-blend-multiply animation-delay-4000"></div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center justify-between gap-16 lg:flex-row lg:gap-8">
          <div className="max-w-2xl text-left lg:w-1/2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8 inline-flex cursor-default items-center gap-2 rounded-full border border-slate-200/60 bg-white/80 px-5 py-2.5 shadow-xl backdrop-blur-md transition-colors hover:bg-white"
            >
              <span className="flex h-3 w-3 animate-pulse rounded-full bg-gradient-to-r from-violet-500 to-orange-500"></span>
              <span className="text-xs font-extrabold uppercase tracking-widest text-slate-800">
                Referred by {affiliate.firstName} {affiliate.lastName}
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="mb-8 text-[4rem] font-black leading-[1] tracking-tighter text-slate-900 md:text-[5.5rem] lg:text-[6.5rem]"
            >
              The Platform <br className="hidden md:block" />
              Built For <br className="hidden lg:block" />
              <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-500 bg-clip-text text-transparent drop-shadow-sm">
                The Future.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mb-12 max-w-lg text-xl font-medium leading-relaxed text-slate-600"
            >
              Premium credit intelligence, automated workflows, and a bold Elite experience shared with you by {affiliate.firstName}.
            </motion.p>

            {affiliate.companyName ? (
              <div className="mb-10 max-w-xl rounded-[2rem] border border-slate-200/70 bg-white/75 p-5 shadow-sm backdrop-blur-xl">
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Partner</div>
                <div className="mt-2 text-2xl font-black text-slate-900">{affiliate.companyName}</div>
                <div className="mt-2 text-sm text-slate-500">Elite invitation link by {affiliate.firstName} {affiliate.lastName}</div>
              </div>
            ) : null}

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col gap-5 sm:flex-row"
            >
              <button
                className="group flex items-center justify-center gap-3 rounded-full bg-slate-900 px-8 py-4 text-lg font-extrabold text-white transition-all hover:-translate-y-1 hover:bg-slate-800 hover:shadow-[0_20px_40px_-10px_rgba(15,23,42,0.5)]"
                onClick={onPrimaryAction}
              >
                Enter The Platform
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                className="flex items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-8 py-4 text-lg font-extrabold text-slate-800 shadow-lg transition-all hover:bg-slate-50 hover:shadow-xl"
                onClick={onOpenDemo}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-900">
                  <Play className="ml-1 h-4 w-4" fill="currentColor" />
                </div>
                Watch Experience
              </button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.4, type: 'spring', bounce: 0.4 }}
            className="relative hidden h-[600px] w-full items-center justify-center md:flex lg:w-1/2"
          >
            <motion.div
              animate={{ rotate: 360, scale: [1, 1.05, 1], borderRadius: ['30%', '40%', '50%', '30%'] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute h-[400px] w-[400px] bg-gradient-to-tr from-violet-600 via-fuchsia-500 to-orange-500 opacity-70 blur-2xl mix-blend-multiply"
            />
            <motion.div
              animate={{ rotate: -360, scale: [1, 1.1, 1] }}
              transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
              className="absolute h-[350px] w-[350px] bg-gradient-to-bl from-blue-400 via-violet-300 to-orange-300 opacity-60 blur-3xl mix-blend-screen"
            />

            <motion.div
              animate={{ y: [0, -20, 0], rotateX: [10, -5, 10], rotateY: [-10, 5, -10] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              className="elite-affiliate-glass-card elite-affiliate-preserve-3d absolute z-20 flex h-[380px] w-[280px] flex-col justify-between overflow-hidden rounded-[2rem] border border-white/60 p-6 shadow-2xl"
            >
              <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-white/40 blur-2xl"></div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/30">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="space-y-4">
                <div className="h-3 w-3/4 rounded-full bg-slate-200/50"></div>
                <div className="h-3 w-full rounded-full bg-slate-200/50"></div>
                <div className="h-3 w-5/6 rounded-full bg-slate-200/50"></div>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-white/80 p-5 shadow-inner">
                <div className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">Elite Access</div>
                <div className="mt-3 text-3xl font-black text-slate-900">The Capsol</div>
                <div className="mt-1 bg-gradient-to-r from-violet-600 to-orange-500 bg-clip-text text-lg font-bold text-transparent">
                  Luxury Credit Workflow
                </div>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 30, 0], x: [0, -20, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="absolute top-[20%] z-30 flex h-32 w-32 -rotate-12 items-center justify-center rounded-[2rem] border border-white/20 bg-gradient-to-br from-orange-400 to-pink-500 shadow-2xl shadow-orange-500/40 backdrop-blur-md"
              style={{ left: '-2.5rem' }}
            >
              <Layers className="h-12 w-12 text-white/80" />
            </motion.div>

            <motion.div
              animate={{ y: [0, -40, 0], x: [0, 20, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              className="absolute bottom-[20%] right-[-1rem] z-10 flex h-40 w-40 items-center justify-center rounded-full border border-white/20 bg-gradient-to-tl from-blue-500 to-violet-500 shadow-2xl shadow-blue-500/40 backdrop-blur-md"
            >
              <BrainCircuit className="h-14 w-14 text-white/80" />
            </motion.div>

            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
              className="absolute right-[20%] top-0 z-40 flex h-16 w-16 items-center justify-center rounded-full border border-white bg-white/80 shadow-xl backdrop-blur-md"
            >
              <ShieldCheck className="h-6 w-6 text-emerald-500" />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function EliteShowcase() {
  return (
    <section className="relative overflow-hidden border-y border-slate-800 bg-slate-900 py-32">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[800px] w-[80vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-violet-600/20 via-fuchsia-500/20 to-orange-500/20 blur-[150px]"></div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center gap-20 lg:flex-row">
          <div className="flex-1 space-y-10">
            <h2 className="text-5xl font-black leading-[1.1] tracking-tight text-white md:text-6xl">
              Unleash the power of <span className="bg-gradient-to-r from-violet-400 to-orange-400 bg-clip-text text-transparent">intelligent automation.</span>
            </h2>
            <p className="max-w-xl text-xl font-medium leading-relaxed text-slate-400">
              Leave the manual work behind. Our platform pairs bold visual design with smart AI-guided workflows for a premium credit-management experience.
            </p>
            <ul className="space-y-6">
              {[
                'Lightning-Fast Processing Engine',
                'Intuitive, Beautiful User Experience',
                'Advanced Predictive Algorithms',
              ].map((item) => (
                <li key={item} className="flex items-center gap-4 text-lg font-medium text-slate-300">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30">
                    <ChevronRight className="h-5 w-5" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative flex h-[600px] flex-1 items-center justify-center" style={{ perspective: '1000px' }}>
            <motion.div
              initial={{ rotateY: -15, rotateX: 10, scale: 0.9 }}
              whileInView={{ rotateY: -20, rotateX: 15, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, type: 'spring' }}
              className="elite-affiliate-preserve-3d relative h-full w-full max-w-md"
            >
              <div
                className="absolute inset-0 rounded-[3rem] border border-white/10 bg-gradient-to-tr from-violet-600/20 to-orange-500/20 shadow-[0_0_100px_rgba(139,92,246,0.3)] backdrop-blur-3xl"
                style={{ transform: 'translateZ(-48px)' }}
              ></div>

              <div className="absolute inset-8 flex flex-col gap-6 rounded-[2.5rem] border border-white/20 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-fuchsia-500 shadow-lg">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="mb-3 h-3 w-32 rounded-full bg-white/30"></div>
                      <div className="h-2 w-20 rounded-full bg-white/10"></div>
                    </div>
                  </div>
                </div>

                <div className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-3xl border border-white/5 bg-black/20">
                  <motion.div
                    animate={{
                      background: [
                        'radial-gradient(circle at 50% 50%, rgba(139,92,246,0.8), transparent 70%)',
                        'radial-gradient(circle at 60% 40%, rgba(249,115,22,0.8), transparent 70%)',
                        'radial-gradient(circle at 40% 60%, rgba(236,72,153,0.8), transparent 70%)',
                        'radial-gradient(circle at 50% 50%, rgba(139,92,246,0.8), transparent 70%)',
                      ],
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 opacity-50 blur-xl"
                  ></motion.div>

                  <svg className="relative z-10 h-full w-full" viewBox="0 0 200 100" preserveAspectRatio="none">
                    <motion.path
                      d="M0,50 Q25,20 50,50 T100,50 T150,50 T200,50"
                      fill="none"
                      stroke="rgba(255,255,255,0.4)"
                      strokeWidth="2"
                      animate={{
                        d: [
                          'M0,50 Q25,20 50,50 T100,50 T150,50 T200,50',
                          'M0,50 Q25,80 50,50 T100,50 T150,50 T200,50',
                          'M0,50 Q25,20 50,50 T100,50 T150,50 T200,50',
                        ],
                      }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.path
                      d="M0,50 Q25,80 50,50 T100,50 T150,50 T200,50"
                      fill="none"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="2"
                      animate={{
                        d: [
                          'M0,50 Q25,80 50,50 T100,50 T150,50 T200,50',
                          'M0,50 Q25,20 50,50 T100,50 T150,50 T200,50',
                          'M0,50 Q25,80 50,50 T100,50 T150,50 T200,50',
                        ],
                      }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                    />
                  </svg>
                </div>

                <div className="mt-2 flex flex-1 flex-col gap-4">
                  <div className="flex h-14 w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5">
                    <Zap className="h-6 w-6 text-orange-400" />
                    <div className="flex-1">
                      <div className="mb-2.5 h-2.5 w-1/2 rounded-full bg-white/30"></div>
                      <div className="h-1.5 w-1/3 rounded-full bg-white/10"></div>
                    </div>
                  </div>
                  <div className="flex h-14 w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5">
                    <Layers className="h-6 w-6 text-violet-400" />
                    <div className="flex-1">
                      <div className="mb-2.5 h-2.5 w-2/3 rounded-full bg-white/30"></div>
                      <div className="h-1.5 w-1/4 rounded-full bg-white/10"></div>
                    </div>
                  </div>
                </div>
              </div>

              <motion.div
                animate={{ y: [-15, 15, -15], rotate: [-2, 2, -2] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -right-16 top-20 flex h-40 w-40 items-center justify-center rounded-3xl border border-white/20 bg-gradient-to-br from-orange-400 to-pink-500 shadow-[0_20px_50px_rgba(249,115,22,0.4)]"
              >
                <div className="text-center">
                  <div className="text-4xl font-black text-white drop-shadow-md">99%</div>
                  <div className="mt-2 text-[10px] font-bold uppercase tracking-widest text-white/80">Efficiency</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function EliteMarquee() {
  return (
    <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="relative mb-40 mt-32 w-full">
      <div className="mb-8 text-center text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Trusted by industry leaders</div>
      <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-[100vw] overflow-hidden border-y border-slate-200 bg-white/50 py-10 backdrop-blur-sm">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-slate-50 to-transparent md:w-64"></div>
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-slate-50 to-transparent md:w-64"></div>

        <div className="animate-elite-affiliate-scroll flex w-max">
          {[0, 1].map((index) => (
            <div key={index} className="flex items-center gap-20 px-10">
              {['NexusBank', 'FinCore', 'CapitalTrust', 'AeroPay', 'LendingAI', 'VaultTech'].map((brand) => (
                <div key={`${index}-${brand}`} className="text-3xl font-extrabold text-slate-300">{brand}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function EliteFeatures() {
  return (
    <section className="container mx-auto relative z-10 px-6 py-32">
      <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }} className="mb-24 text-center">
        <div className="mb-4 text-sm font-extrabold uppercase tracking-widest text-violet-600">The Platform</div>
        <h2 className="mb-6 text-5xl font-black tracking-tight text-slate-900 md:text-7xl">
          An Arsenal of <span className="bg-gradient-to-r from-violet-600 to-orange-500 bg-clip-text text-transparent">Intelligence.</span>
        </h2>
        <p className="mx-auto max-w-2xl text-xl font-medium text-slate-600">
          Everything you need to control and elevate your credit workflow inside one premium interface.
        </p>
      </motion.div>

      <div className="grid h-auto grid-cols-1 gap-6 md:grid-cols-4 md:grid-rows-2 md:h-[800px]">
        <FeatureCard className="flex flex-col justify-between bg-gradient-to-b from-slate-50 to-white md:col-span-2 md:row-span-2">
          <div className="absolute right-0 top-0 -z-10 h-[500px] w-[500px] rounded-full bg-violet-100 blur-[100px] transition-all duration-700 group-hover:scale-110 group-hover:bg-violet-200"></div>
          <div className="mb-12">
            <div className="relative z-10 mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-100 bg-white text-violet-600 shadow-md">
              <Sparkles className="h-8 w-8" />
            </div>
            <h3 className="relative z-10 mb-4 text-4xl font-black tracking-tight text-slate-900">AI Automation Engine</h3>
            <p className="relative z-10 max-w-md text-xl font-medium leading-relaxed text-slate-600">
              Personalized automation, recommendation logic, and premium UI patterns built for higher-conviction onboarding.
            </p>
            <div className="relative z-10 mt-8 flex flex-wrap gap-3">
              {['Smart Drafting', 'Auto-Submit', 'Continuous Learning'].map((item) => (
                <span key={item} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-800 shadow-sm">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-inner">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:14px_24px]"></div>
            <motion.div animate={{ x: [-100, 400] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} className="absolute top-1/2 h-[2px] w-32 bg-gradient-to-r from-transparent via-violet-500 to-transparent blur-[1px]"></motion.div>
            <div className="relative z-10 flex gap-4">
              <div className="h-10 w-32 animate-pulse rounded-lg bg-slate-100"></div>
              <div className="h-10 w-48 animate-pulse rounded-lg bg-violet-100" style={{ animationDelay: '0.5s' }}></div>
            </div>
          </div>
        </FeatureCard>

        <FeatureCard className="md:col-span-1 md:row-span-1">
          <div className="absolute left-0 top-0 -z-10 h-40 w-40 rounded-full bg-orange-100 blur-[50px] transition-all group-hover:bg-orange-200"></div>
          <div className="relative z-10 mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-orange-100 bg-orange-50 text-orange-600 shadow-sm">
            <BarChart3 className="h-6 w-6" />
          </div>
          <h3 className="relative z-10 mb-3 text-2xl font-black text-slate-900">Deep Analytics</h3>
          <p className="relative z-10 font-medium text-slate-600">Visualize performance, conversion momentum, and credit progress with premium dashboards.</p>
        </FeatureCard>

        <FeatureCard className="md:col-span-1 md:row-span-1">
          <div className="absolute bottom-0 right-0 -z-10 h-40 w-40 rounded-full bg-blue-100 blur-[50px] transition-all group-hover:bg-blue-200"></div>
          <div className="relative z-10 mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="relative z-10 mb-3 text-2xl font-black text-slate-900">Dark Web Scan</h3>
          <p className="relative z-10 font-medium text-slate-600">Continuous scanning patterns and proactive identity monitoring in one interface.</p>
        </FeatureCard>

        <FeatureCard className="overflow-visible md:col-span-2 md:row-span-1">
          <div className="absolute left-1/2 top-1/2 -z-10 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-100 blur-[80px] transition-all group-hover:bg-emerald-200"></div>
          <div className="relative z-10 flex h-full flex-col items-center gap-8 md:flex-row">
            <div className="flex-1">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600 shadow-sm">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="mb-4 text-3xl font-black tracking-tight text-slate-900">Enterprise Security</h3>
              <p className="font-medium leading-relaxed text-slate-600">
                Bank-level protection, secure workflows, and premium access controls throughout the experience.
              </p>
            </div>

            <div className="relative flex h-full w-full flex-1 items-center justify-center">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} className="absolute h-40 w-40 rounded-full border border-dashed border-emerald-300"></motion.div>
              <div className="z-10 flex h-20 w-20 items-center justify-center rounded-full border border-slate-100 bg-white shadow-2xl">
                <Fingerprint className="h-10 w-10 text-emerald-500" />
              </div>
              <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2, repeat: Infinity }} className="absolute h-20 w-20 rounded-full bg-emerald-400 blur-xl"></motion.div>
            </div>
          </div>
        </FeatureCard>
      </div>
    </section>
  );
}

function ElitePricing({
  plans,
  plansLoading,
  onGetStarted,
}: {
  plans: AffiliateLandingPlan[];
  plansLoading: boolean;
  onGetStarted: (planId?: number) => void;
}) {
  const [isYearly, setIsYearly] = useState(false);
  const billingCycle = isYearly ? 'yearly' : 'monthly';
  const filteredPlans = useMemo(
    () => plans.filter((plan) => String(plan.billing_cycle || '').toLowerCase() === billingCycle),
    [billingCycle, plans]
  );

  return (
    <section id="elite-pricing" className="container mx-auto relative z-10 px-6 py-32 text-center">
      <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }}>
        <div className="mb-4 text-sm font-bold uppercase tracking-widest text-violet-600">Investment</div>
        <h2 className="mb-6 text-5xl font-extrabold text-slate-900 drop-shadow-sm md:text-6xl">
          Simple, Transparent <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-500 bg-clip-text text-transparent">Pricing</span>
        </h2>
        <p className="mx-auto mb-16 max-w-2xl text-xl font-medium text-slate-600">
          Choose the plan that fits your workflow and move straight into The Capsol experience.
        </p>

        <div className="relative mb-20 inline-flex rounded-full border border-slate-200 bg-white p-1.5 shadow-sm">
          <motion.div
            className="absolute bottom-[6px] left-[6px] top-[6px] z-0 rounded-full bg-slate-900 shadow-md"
            animate={{ x: isYearly ? 130 : 0, width: isYearly ? 160 : 130 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />

          <button
            onClick={() => setIsYearly(false)}
            className={`relative z-10 w-[130px] rounded-full px-8 py-3 text-sm font-bold transition-colors duration-300 ${!isYearly ? 'text-white' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Monthly
          </button>

          <button
            onClick={() => setIsYearly(true)}
            className={`relative z-10 flex w-[160px] items-center justify-center gap-2 rounded-full px-8 py-3 text-sm font-bold transition-colors duration-300 ${isYearly ? 'text-white' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Yearly
            <span className={`rounded-md border px-2 py-0.5 text-xs transition-colors ${isYearly ? 'border-white/30 bg-white/20 text-white' : 'border-violet-200 bg-violet-50 text-violet-600'}`}>
              Save 20%
            </span>
          </button>
        </div>
      </motion.div>

      {plansLoading ? (
        <div className="py-16">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-violet-600"></div>
        </div>
      ) : (
        <div className="relative mx-auto grid max-w-6xl items-center gap-8 text-left lg:grid-cols-3">
          <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-200/50 blur-[120px]"></div>

          {filteredPlans.map((plan, index) => {
            const normalizedName = String(plan.name || '').toLowerCase();
            const isFeatured = normalizedName.includes('pro') || normalizedName.includes('professional') || index === 1;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className={isFeatured
                  ? 'relative z-20 rounded-[2.5rem] border border-slate-800 bg-slate-900 p-12 shadow-2xl shadow-violet-500/20 lg:-translate-y-6'
                  : 'rounded-[2.5rem] border border-slate-200 bg-white/80 p-10 shadow-xl shadow-slate-200/50 backdrop-blur-xl transition-transform duration-300 hover:-translate-y-2'
                }
              >
                {isFeatured ? (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 rounded-full border border-white/20 bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-2 text-xs font-extrabold tracking-widest text-white shadow-[0_10px_20px_rgba(139,92,246,0.4)]">
                    MOST POPULAR
                  </div>
                ) : null}

                <h3 className={`mb-2 text-2xl font-extrabold ${isFeatured ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                <p className={`mb-8 text-sm font-medium ${isFeatured ? 'text-slate-300' : 'text-slate-500'}`}>{plan.description}</p>
                <div className="mb-8 flex h-[60px] items-end gap-2">
                  <motion.span
                    key={`${billingCycle}-${plan.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={isFeatured
                      ? 'bg-gradient-to-r from-violet-300 to-orange-300 bg-clip-text text-6xl font-extrabold text-transparent'
                      : 'text-5xl font-extrabold text-slate-900'
                    }
                  >
                    ${plan.price}
                  </motion.span>
                  <span className={`mb-1 text-xl font-medium ${isFeatured ? 'text-slate-400' : 'text-slate-400'}`}>
                    /{billingCycle === 'yearly' ? 'yr' : 'mo'}
                  </span>
                </div>

                <ul className="mb-10 space-y-5">
                  {plan.features.map((feature) => (
                    <li key={`${plan.id}-${feature}`} className={`flex items-center gap-4 ${isFeatured ? 'font-bold text-white' : 'font-medium text-slate-700'}`}>
                      <div className={isFeatured
                        ? 'flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-violet-400 to-orange-500 text-white shadow-[0_0_10px_rgba(139,92,246,0.5)]'
                        : 'flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-violet-600'
                      }>
                        <Check className="h-4 w-4" />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className={`mb-8 border-t pt-6 ${isFeatured ? 'border-slate-800' : 'border-slate-200'}`}>
                  <div className="flex justify-between text-sm">
                    <span className={isFeatured ? 'text-slate-400' : 'text-slate-500'}>Max Users:</span>
                    <span className={isFeatured ? 'font-semibold text-white' : 'font-semibold text-slate-900'}>{plan.max_users ?? 'Unlimited'}</span>
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span className={isFeatured ? 'text-slate-400' : 'text-slate-500'}>Max Clients:</span>
                    <span className={isFeatured ? 'font-semibold text-white' : 'font-semibold text-slate-900'}>{plan.max_clients ?? 'Unlimited'}</span>
                  </div>
                </div>

                <button
                  className={isFeatured
                    ? 'w-full rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-600 px-6 py-5 text-lg font-extrabold text-white transition-all hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(139,92,246,0.6)]'
                    : 'w-full rounded-2xl border-2 border-slate-200 px-6 py-4 text-lg font-bold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50'
                  }
                  onClick={() => onGetStarted(plan.id)}
                >
                  Choose {plan.name}
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function EliteFooter({ affiliate, onPrimaryAction }: { affiliate: AffiliateLandingAffiliate; onPrimaryAction: () => void }) {
  return (
    <>
      <div className="container mx-auto relative z-10 px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          className="relative mb-20 mt-40 overflow-hidden rounded-[3rem] border border-slate-800 bg-slate-900 p-20 text-center shadow-[0_50px_100px_rgba(0,0,0,0.3)]"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-violet-900/40 to-transparent mix-blend-overlay"></div>
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-violet-500/20 to-blue-600/20 blur-[120px]"></div>

          <div className="relative z-10">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-300">
              Ready to transform?
            </div>
            <h2 className="mb-8 text-5xl font-extrabold leading-tight text-white drop-shadow-xl md:text-7xl">
              Start Your Journey <br />
              With <span className="bg-gradient-to-r from-violet-300 to-blue-300 bg-clip-text text-transparent">The Capsol</span>
            </h2>
            <p className="mx-auto mb-12 max-w-3xl text-2xl font-medium text-slate-300">
              Join {affiliate.firstName} and experience the premium The Capsol Elite onboarding flow.
            </p>

            <button
              className="group mx-auto flex items-center gap-4 rounded-full bg-white px-12 py-6 text-xl font-extrabold text-slate-900 transition-transform hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]"
              onClick={onPrimaryAction}
            >
              Get Started Edition
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 transition-colors group-hover:bg-violet-500">
                <ArrowRight className="h-4 w-4 text-white transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          </div>

          <div className="absolute left-10 top-10 h-24 w-24 rounded-full border border-white/5"></div>
          <div className="absolute bottom-10 right-10 h-40 w-40 rounded-full border border-white/5"></div>
        </motion.div>
      </div>

      <footer className="relative z-20 border-t border-slate-200 bg-white/50 pb-10 pt-20 backdrop-blur-xl">
        <div className="container mx-auto px-6">
          <div className="mb-16 grid gap-12 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="mb-6 flex items-center gap-3 text-2xl font-bold tracking-tighter">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-blue-600 shadow-lg shadow-violet-500/30">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <span className="text-slate-900">ScoreMachine Elite</span>
              </div>
              <p className="mb-8 max-w-sm font-medium leading-relaxed text-slate-500">
                Referred by {affiliate.firstName} {affiliate.lastName}{affiliate.companyName ? ` from ${affiliate.companyName}` : ''}. Premium onboarding, premium presentation.
              </p>
              <div className="flex gap-4">
                {[0, 1, 2].map((item) => (
                  <span key={item} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-500 transition-all hover:bg-violet-50 hover:text-violet-600">
                    <Activity className="h-4 w-4" />
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mb-6 font-bold tracking-wide text-slate-900">Platform</h4>
              <ul className="space-y-4 text-sm font-medium text-slate-500">
                <li>Features</li>
                <li>Pricing</li>
                <li>AI Insights</li>
                <li>Security</li>
              </ul>
            </div>

            <div>
              <h4 className="mb-6 font-bold tracking-wide text-slate-900">Elite Benefits</h4>
              <ul className="space-y-4 text-sm font-medium text-slate-500">
                <li>Premium referral experience</li>
                <li>Conversion-focused pricing</li>
                <li>Luxury presentation</li>
                <li>Brand-forward onboarding</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 text-xs font-bold text-slate-400 md:flex-row">
            <p>© 2026 ScoreMachine. All rights reserved.</p>
            <div className="flex items-center gap-2 rounded-full border border-green-100 bg-green-50 px-3 py-1 text-green-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500"></span>
              All systems operational
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

export default function ReferralEliteLandingPage({
  affiliate,
  plans,
  plansLoading,
  onGetStarted,
  onOpenDemo,
}: ReferralEliteLandingPageProps) {
  const scrollToPricing = () => {
    const pricingSection = document.getElementById('elite-pricing');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fafafa]">
      <EliteNavbar onPrimaryAction={scrollToPricing} />
      <EliteHero affiliate={affiliate} onOpenDemo={onOpenDemo} onPrimaryAction={scrollToPricing} />
      <EliteShowcase />
      <EliteMarquee />
      <EliteFeatures />
      <ElitePricing plans={plans} plansLoading={plansLoading} onGetStarted={onGetStarted} />
      <EliteFooter affiliate={affiliate} onPrimaryAction={scrollToPricing} />
    </main>
  );
}