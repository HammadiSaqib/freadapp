const fs = require('fs');
const file = 'c:/Users/munib/Downloads/ScoreMachineV2RawCode/client/pages/AffiliateDashboard.tsx';
let txt = fs.readFileSync(file, 'utf8');

const startTag = '{/* -- HERO BANNER -- */}';
const endTag = '{/* -- CLIENT PIPELINE + FINANCIAL CARDS -- */}';

const startIndex = txt.indexOf(startTag);
const endIndex = txt.indexOf(endTag);

if (startIndex === -1 || endIndex === -1) {
    console.log('Could not find tags');
    process.exit(1);
}

const replacement = \{/* -- GAMIFIED HERO BANNER & KPI -- */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#0a0f1c] to-indigo-950 p-8 lg:p-10 text-white shadow-2xl border border-white/5 mb-8">
          {/* Decorative Elements */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-emerald-500/10 blur-[100px]" />
          
          <div className="relative z-10 flex flex-col gap-10">
            {/* TOP: Greeting & Quick Rank Stats */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold tracking-wide uppercase border border-white/10 mb-4 shadow-inner">
                  <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
                  <span className="bg-gradient-to-r from-yellow-300 to-amber-500 bg-clip-text text-transparent">Partner Portal</span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-black tracking-tight mb-2 text-white">
                  {userProfile?.first_name ? \\\Let's go, \ ??\\\ : "Let's go ??"}
                </h1>
                <p className="text-gray-400 text-lg font-medium drop-shadow-sm">
                  Keep pushing. Your next payout is waiting.
                </p>
              </div>

              {/* Rank Movement */}
              {earningsStats?.tierInfo && (
                <div className="flex flex-col items-end md:text-right bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                  <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-1">Current Status</p>
                  <div className="flex items-center gap-3">
                     <Crown className="h-8 w-8 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
                     <div className="text-2xl font-black text-white">{earningsStats.tierInfo.currentTier}</div>
                  </div>
                  <p className="text-emerald-400 font-bold mt-1 inline-flex items-center gap-1">
                     <CheckCircle2 className="h-4 w-4" /> {earningsStats.currentTierRate || 10}% Commission Match
                  </p>
                </div>
              )}
            </div>

            {/* MIDDLE: Massive Earnings Numbers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Big All-Time Card */}
              <div className="relative overflow-hidden group rounded-3xl bg-gradient-to-br from-emerald-900/40 to-green-900/20 border border-emerald-500/20 p-8 transition-all hover:border-emerald-500/40">
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                        <DollarSign className="h-7 w-7 text-white" />
                      </div>
                      <span className="text-emerald-100 font-bold uppercase tracking-widest text-sm">All-Time Revenue</span>
                    </div>
                    {earningsStats?.totalEarningsChange && (
                      <span className={\\\lex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-full backdrop-blur-md \\\\}>
                        {earningsStats.totalEarningsChange.percentage >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        {Math.abs(earningsStats.totalEarningsChange.percentage)}%
                      </span>
                    )}
                  </div>
                  <div className="text-5xl lg:text-[5rem] font-black text-white drop-shadow-lg tracking-tight">
                    {loading ? <SkeletonPill /> : <AnimatedNumber value={earningsStats.totalEarnings} prefix="$" decimals={2} />}
                  </div>
                </div>
              </div>

              {/* Big This-Month Card */}
              <div className="relative overflow-hidden group rounded-3xl bg-gradient-to-br from-blue-900/40 to-sky-900/20 border border-blue-500/20 p-8 transition-all hover:border-blue-500/40">
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                       <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-sky-600 shadow-[0_0_20px_rgba(56,189,248,0.3)]">
                         <TrendingUp className="h-7 w-7 text-white" />
                       </div>
                       <span className="text-blue-100 font-bold uppercase tracking-widest text-sm">This Month</span>
                    </div>
                  </div>
                  <div className="text-5xl lg:text-[5rem] font-black text-white drop-shadow-lg tracking-tight">
                    {loading ? <SkeletonPill /> : <AnimatedNumber value={earningsStats.monthlyEarnings} prefix="$" decimals={2} />}
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM: Giant Tier Milestone Progress Bar */}
            {earningsStats?.tierInfo && (
              <div className="mt-4 bg-white/5 rounded-3xl p-6 sm:p-8 border border-white/10 backdrop-blur-xl relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
                    <div>
                      <h3 className="text-2xl font-black text-white mb-2">
                        Level Up to <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500 drop-shadow-sm">{earningsStats.tierInfo.nextTier}</span>!
                      </h3>
                      {earningsStats.tierInfo.referralsToNext > 0 ? (
                        <p className="text-lg font-medium text-gray-300">
                          You're <span className="text-yellow-400 font-bold animate-pulse">{Math.round(earningsStats.tierInfo.progressToNext)}% there</span>! Only <span className="font-bold text-white">{earningsStats.tierInfo.referralsToNext} more</span> to boost your payout.
                        </p>
                      ) : (
                        <p className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                          ?? Max Tier Achieved!
                        </p>
                      )}
                    </div>
                    <div className="sm:text-right bg-black/20 rounded-xl px-4 py-2 border border-white/5">
                       <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Paid Referrals</div>
                       <div className="text-3xl font-black text-white">{earningsStats.paidReferralsCount || 0}</div>
                    </div>
                  </div>

                  {/* Epic Progress Bar with Milestones */}
                  <div className="relative pt-8 pb-4">
                    {/* Milestone Markers */}
                    <div className="absolute top-0 left-0 w-full flex justify-between px-1 z-20">
                      {[25, 50, 75, 100].map(m => {
                        const reached = (earningsStats.paidReferralsCount || 0) >= m;
                        return (
                          <div key={m} className="absolute flex flex-col items-center -ml-3 sm:-ml-4 transition-all duration-500" style={{ left: \\\\%\ }}>
                            <div className={\\\	ext-sm sm:text-base font-black mb-2 \\\\}>
                              {m}
                            </div>
                            <div className={\\\h-5 w-1 rounded-full \\\\} />
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* The Bar */}
                    <div className="h-10 w-full bg-black/50 rounded-full overflow-hidden p-1.5 shadow-inner relative border border-white/10">
                      {/* Grid overlay */}
                      <div className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(90deg, transparent 49px, rgba(255,255,255,0.1) 50px)', backgroundSize: '50px 100%' }}></div>
                      
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 relative z-10 transition-all duration-[1500ms] ease-out flex items-center justify-end pr-4 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                        style={{ width: \\\\%\ }}
                      >
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 hover:opacity-100 hover:animate-[shimmer_2s_infinite] -skew-x-12 transform" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Upgrade CTA (if applicable) */}
            {showUpgradeCTA && canUpgrade && (
              <div className="relative overflow-hidden rounded-2xl border border-purple-400/30 bg-gradient-to-r from-purple-900/40 via-fuchsia-900/40 to-pink-900/40 px-6 py-5 shadow-sm mt-4 backdrop-blur-md">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                      <Crown className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-lg">Supercharge Your Partner Earnings</p>
                      <p className="text-sm text-purple-200">Earn up to {nextTierRate} commission and unlock private co-marketing tools</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Button onClick={() => navigate("/affiliate/subscription")} className="bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-700 text-white font-bold px-6 py-2 h-auto text-base shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all hover:scale-105">
                      Upgrade Now <ChevronRight className="h-5 w-5 ml-1" />
                    </Button>
                    <button onClick={handleDontShowAgain} className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* -- CLIENT PIPELINE + FINANCIAL CARDS -- */};

const newTxt = txt.substring(0, startIndex) + replacement + txt.substring(endIndex + endTag.length);
fs.writeFileSync(file, newTxt, 'utf8');
console.log('Successfully replaced top section.');
