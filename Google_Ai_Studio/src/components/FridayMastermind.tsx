import React, { useState } from 'react';
import { Calendar, Video, Clock, Users, Check, Copy, Sparkles, ExternalLink, Radio, LogIn, ArrowRight } from 'lucide-react';
import { QRCodeCard } from './QRCodeCard';

export const FridayMastermind: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const mastermindTopics = [
    'How to use The CapSol CRM effectively to track disputed items',
    'How to read and understand your 3-bureau credit report line by line',
    'What is specifically stopping you from getting institutional funding',
    'Your live credit repair dispute progress and response strategy',
    'Understanding your Funding Readiness score and bureau benchmarks',
    'Recommended next steps to optimize your credit profile and debt ratios',
    'Live open floor Q&A for your personal account questions & journey'
  ];

  const handleCopyNotice = () => {
    navigator.clipboard.writeText('CapSol Friday Mastermind Schedule:\n• Friday, September 4th at 6:00 PM EST\n• Friday, September 11th at 4:00 PM EST\nZoom credentials are sent to active members via email and available inside the portal: https://member.thecapsol.com/');
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  // Google Calendar URL generator for each date
  const getGoogleCalendarUrl = (sessionDate: 'sept4' | 'sept11') => {
    const title = encodeURIComponent('The CapSol Friday Mastermind & Credit Strategy Workshop');
    const details = encodeURIComponent('Live weekly mastermind session for CapSol members. We break down live credit reports, audit dispute progress, and map out bank funding routes. Portal: https://member.thecapsol.com/');
    const location = encodeURIComponent('Live via Zoom (Link provided in The CapSol Member Portal)');
    
    // Sept 4 at 6:00 PM EDT (22:00 UTC - 23:30 UTC)
    // Sept 11 at 4:00 PM EDT (20:00 UTC - 21:30 UTC)
    const dates = sessionDate === 'sept4'
      ? '20260904T220000Z/20260904T233000Z'
      : '20260911T200000Z/20260911T213000Z';

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
  };

  return (
    <section id="mastermind" className="py-20 bg-slate-950 text-white border-b border-slate-800 relative overflow-hidden">
      {/* Background Lighting */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[300px] bg-blue-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[300px] bg-cyan-500/10 blur-[130px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-cyan-300 border border-cyan-400/30 backdrop-blur-md">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Weekly Live Broadcast • Friday Mastermind</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            The CapSol Friday Mastermind
          </h2>

          <p className="text-lg sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-200">
            Understand your credit. Understand the system. Build your funding strategy.
          </p>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Every week, our senior credit and funding specialists host a live interactive workshop
            for enrolled CapSol members to review accounts, analyze reports, and map out paths to institutional capital.
          </p>
        </div>

        {/* Highlighted Upcoming Schedule Cards */}
        <div className="max-w-4xl mx-auto mb-12 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Session 1 Card */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-6 rounded-2xl border-2 border-cyan-500/50 shadow-xl shadow-cyan-500/10 relative flex flex-col justify-between">
            <div className="absolute -top-3 left-6">
              <span className="px-3 py-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 text-[11px] font-black uppercase tracking-wider rounded-full shadow-md">
                ★ Upcoming Session 1
              </span>
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-mono font-bold text-cyan-400">Live Interactive Workshop</span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Next Up
                </span>
              </div>
              <h3 className="text-2xl font-black text-white">
                Friday, September 4th
              </h3>
              <div className="mt-2 text-xl font-bold text-cyan-300 flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                <span>6:00 PM EST</span>
              </div>
              <div className="mt-1 text-xs text-slate-400 flex items-center gap-2">
                <span>5:00 PM CST</span>
                <span>•</span>
                <span>4:00 PM MST</span>
                <span>•</span>
                <span>3:00 PM PST</span>
              </div>
              <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                Topic: Bureau intake teardown, fast-tracking inquiries, and building the CapSol funding action plan.
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-800">
              <a
                href={getGoogleCalendarUrl('sept4')}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-xs sm:text-sm font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 transition-all active:scale-95 text-center"
              >
                <Calendar className="w-4 h-4 shrink-0" />
                <span className="truncate">Add Sept 4 (6 PM EST) to Calendar</span>
              </a>
            </div>
          </div>

          {/* Session 2 Card */}
          <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800 shadow-xl relative flex flex-col justify-between">
            <div className="absolute -top-3 left-6">
              <span className="px-3 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-bold uppercase tracking-wider rounded-full">
                Upcoming Session 2
              </span>
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-mono font-bold text-slate-400">Live Interactive Workshop</span>
                <span className="text-[11px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                  Following Week
                </span>
              </div>
              <h3 className="text-2xl font-black text-white">
                Friday, September 11th
              </h3>
              <div className="mt-2 text-xl font-bold text-slate-200 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-400 shrink-0" />
                <span>4:00 PM EST</span>
              </div>
              <div className="mt-1 text-xs text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>3:00 PM CST</span>
                <span>•</span>
                <span>2:00 PM MST</span>
                <span>•</span>
                <span>1:00 PM PST</span>
              </div>
              <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                Topic: Dispute responses round 1 analysis, debt balance optimization, and institutional underwriting standards.
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-800">
              <a
                href={getGoogleCalendarUrl('sept11')}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-xs sm:text-sm font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 shadow-sm transition-all active:scale-95 text-center"
              >
                <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="truncate">Add Sept 11 (4 PM EST) to Calendar</span>
              </a>
            </div>
          </div>

        </div>

        {/* Mastermind Curriculum & Zoom Stage Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl mx-auto items-stretch">
          
          {/* Topics Covered (7 Columns) */}
          <div className="lg:col-span-7 bg-slate-900/80 rounded-3xl border border-slate-800/90 p-6 sm:p-8 flex flex-col justify-between shadow-2xl backdrop-blur-md">
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Live Webinar Class Agenda</h3>
                    <p className="text-xs text-slate-400">Actionable breakdowns every single week</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded-lg">
                  60-90 Mins
                </span>
              </div>

              <div className="space-y-3">
                {mastermindTopics.map((topic, idx) => (
                  <div key={idx} className="flex items-start gap-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </span>
                    <span className="text-xs sm:text-sm text-slate-200 font-medium leading-normal">
                      {topic}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-800 flex items-center gap-3 text-xs text-slate-400">
              <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Full workshop replay, dispute templates, and strategy notes are archived inside your CapSol CRM dashboard.</span>
            </div>
          </div>

          {/* Zoom Stage & QR Placeholder (5 Columns) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/50 rounded-3xl border-2 border-blue-500/40 p-6 sm:p-8 flex flex-col justify-between text-center shadow-2xl relative">
            <div className="absolute top-4 right-4">
              <span className="px-2.5 py-1 bg-rose-500/20 text-rose-300 border border-rose-400/30 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                Live Broadcast
              </span>
            </div>

            <div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/25">
                <Video className="w-7 h-7" />
              </div>

              <h3 className="text-xl font-extrabold text-white mb-1">
                Friday Mastermind Broadcast Link
              </h3>
              <p className="text-xs text-slate-300 mb-5">
                Active Client Basic members receive private broadcast credentials
              </p>

              {/* Zoom Link Placeholder Area */}
              <div className="bg-slate-950/90 p-4 rounded-2xl border-2 border-dashed border-slate-700 mb-5">
                <div className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 py-2 px-3 rounded-xl border border-amber-500/20 tracking-wider">
                  [ZOOM LINK WILL BE PROVIDED]
                </div>
                <p className="text-[11px] text-slate-400 mt-2.5">
                  Link is distributed each Friday via email and posted directly inside The CapSol client portal prior to start time:
                </p>
                <div className="mt-2.5">
                  <a
                    href="https://member.thecapsol.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 underline"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Check Member Portal: member.thecapsol.com</span>
                  </a>
                </div>
              </div>

              {/* QR Code Placeholder */}
              <div className="flex flex-col items-center">
                <QRCodeCard
                  buttonText="Join Friday Mastermind"
                  isAvailable={false}
                  placeholderText="Zoom Link Provided Weekly"
                  size={130}
                />
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleCopyNotice}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied Mastermind Schedule!' : 'Copy Schedule Details'}</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
