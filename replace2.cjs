const fs = require('fs');
const content = fs.readFileSync('client/pages/AffiliateReferrals.tsx', 'utf8');

const returnIndex = content.indexOf('  return (\n    <AffiliateLayout');
if (returnIndex === -1) {
  console.log('Return statement not found');
  process.exit(1);
}

const beforeReturn = content.substring(0, returnIndex);

const newReturn = `  return (
    <AffiliateLayout>
      <div className="min-h-screen pb-16 bg-slate-50/30">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.02] pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-indigo-50/80 via-white to-transparent pointer-events-none" />
        
        <div className="relative z-10 space-y-8 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          {/* Header Section */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm"
          >
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-sm font-semibold mb-6 ring-1 ring-indigo-600/10 shadow-sm">
                <Star className="h-4 w-4 fill-indigo-700" />
                Referral Hub
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-3">
                Referrals Management
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl font-medium">
                Track, manage, and optimize your referral network with real-time analytics and detailed conversion insights.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center gap-3">
              <Button 
                onClick={exportReferrals} 
                className="bg-white text-slate-700 border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all h-12 px-6 rounded-xl font-semibold"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
              <Button onClick={openAllTimeEarnings} className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-700 hover:via-indigo-600 hover:to-violet-700 text-white shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all duration-300 h-12 px-8 rounded-xl border-0 font-semibold text-base">
                <DollarSign className="h-5 w-5 mr-2" />
                All-Time Earnings
              </Button>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {[
              {
                title: "Total Referrals",
                value: loading ? '...' : (displayTotalReferrals || 0).toLocaleString(),
                subtitle: hasActiveFilters ? 'Visible referrals' : 'All recorded targets',
                icon: Users,
                color: "text-blue-600",
                bg: "bg-blue-50",
                ring: "ring-blue-100",
                shadow: "shadow-blue-100"
              },
              {
                title: "Unpaid",
                value: loading ? '...' : (displayUnpaidReferrals || 0).toLocaleString(),
                subtitle: "Pending distribution",
                icon: Clock,
                color: "text-amber-600",
                bg: "bg-amber-50",
                ring: "ring-amber-100",
                shadow: "shadow-amber-100"
              },
              {
                title: "Paid",
                value: loading ? '...' : (displayPaidReferrals || 0).toLocaleString(),
                subtitle: "Successful conversions",
                icon: TrendingUp,
                color: "text-emerald-600",
                bg: "bg-emerald-50",
                ring: "ring-emerald-100",
                shadow: "shadow-emerald-100"
              },
              {
                title: "Avg. Lifetime",
                value: loading ? '...' : \`$\${(displayAvgLifetimeValue || 0).toLocaleString()}\`,
                subtitle: "Value per paid converted",
                icon: Activity,
                color: "text-fuchsia-600",
                bg: "bg-fuchsia-50",
                ring: "ring-fuchsia-100",
                shadow: "shadow-fuchsia-100"
              },
              {
                title: "All-Time Earnings",
                value: loading || (!purchasesLoaded && loadingPurchases) ? '...' : purchasesLoaded ? \`$\${(purchaseSummary.totalCommissionEarned || 0).toLocaleString()}\` : '...',
                subtitle: "Click to view timeline",
                icon: Award,
                color: "text-indigo-600",
                bg: "bg-indigo-50",
                ring: "ring-indigo-100",
                shadow: "shadow-indigo-100",
                onClick: openAllTimeEarnings,
                isClickable: true
              },
              {
                title: "Churned",
                value: loading ? '...' : (displayCancelledReferrals || 0).toLocaleString(),
                subtitle: "Lost subscriptions",
                icon: X,
                color: "text-rose-600",
                bg: "bg-rose-50",
                ring: "ring-rose-100",
                shadow: "shadow-rose-100"
              }
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <div 
                  onClick={stat.onClick}
                  className={\`relative overflow-hidden rounded-3xl bg-white p-6 border-2 border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group \${stat.isClickable ? 'cursor-pointer hover:-translate-y-1' : ''}\`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={\`flex h-14 w-14 items-center justify-center rounded-2xl \${stat.bg} \${stat.ring} ring-1 shadow-inner \${stat.shadow}\`}>
                      <stat.icon className={\`h-6 w-6 \${stat.color}\`} strokeWidth={2.5} />
                    </div>
                    <div className="p-2 opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500 scale-50 group-hover:scale-100">
                      <stat.icon className="h-24 w-24 absolute -right-6 -top-6 text-slate-900" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-500 mb-1 uppercase tracking-wider">{stat.title}</h3>
                    <div className="text-3xl font-black text-slate-900 tracking-tight">
                      {stat.value}
                    </div>
                    <p className="text-xs text-slate-400 mt-2 font-semibold">
                      {stat.subtitle}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Main Content Area */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-1 gap-8"
          >
            {/* Primary Referrals */}
            <div className="rounded-3xl border-2 border-slate-100 bg-white shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col">
              <div className="p-8 border-b-2 border-slate-50">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center space-y-6 xl:space-y-0">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Direct Referrals</h2>
                    <p className="text-base text-slate-500 mt-1 font-medium">
                      Manage and track all direct conversions across your network.
                    </p>
                  </div>
                  
                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto h-full">
                    <div className="relative group w-full xl:w-[320px]">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                      <Input
                        placeholder="Search by name, email, or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 bg-slate-50 border-transparent hover:border-slate-200 h-12 w-full rounded-2xl focus-visible:ring-indigo-500 focus-visible:bg-white transition-all text-base shadow-inner"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-[160px] bg-slate-50 border-transparent hover:border-slate-200 text-slate-700 h-12 rounded-2xl font-semibold shadow-inner">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                        <SelectItem value="all" className="font-medium">All Status</SelectItem>
                        <SelectItem value="unpaid" className="font-medium">Unpaid</SelectItem>
                        <SelectItem value="paid" className="font-medium">Paid</SelectItem>
                        <SelectItem value="cancelled" className="font-medium">Cancelled</SelectItem>
                        <SelectItem value="churned" className="font-medium">Churned</SelectItem>
                        <SelectItem value="expired" className="font-medium">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={tierFilter} onValueChange={setTierFilter}>
                      <SelectTrigger className="w-full sm:w-[160px] bg-slate-50 border-transparent hover:border-slate-200 text-slate-700 h-12 rounded-2xl font-semibold shadow-inner">
                        <SelectValue placeholder="Tier" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                        <SelectItem value="all" className="font-medium">All Tiers</SelectItem>
                        <SelectItem value="basic" className="font-medium">Basic</SelectItem>
                        <SelectItem value="premium" className="font-medium">Premium</SelectItem>
                        <SelectItem value="enterprise" className="font-medium">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="font-bold text-slate-500 uppercase tracking-widest text-[11px] h-14 pl-8">Referral Profile</TableHead>
                      <TableHead className="font-bold text-slate-500 uppercase tracking-widest text-[11px] h-14">Contact Info</TableHead>
                      <TableHead className="font-bold text-slate-500 uppercase tracking-widest text-[11px] h-14">Status & Rank</TableHead>
                      <TableHead className="font-bold text-slate-500 uppercase tracking-widest text-[11px] h-14">Timeline</TableHead>
                      <TableHead className="font-bold text-slate-500 uppercase tracking-widest text-[11px] h-14">Earnings</TableHead>
                      <TableHead className="font-bold text-slate-500 uppercase tracking-widest text-[11px] h-14">Plan Value</TableHead>
                      <TableHead className="font-bold text-slate-500 uppercase tracking-widest text-[11px] h-14">Subscription Health</TableHead>
                      <TableHead className="font-bold text-slate-500 uppercase tracking-widest text-[11px] h-14 text-right pr-8">LTV</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i} className="animate-pulse">
                          <TableCell colSpan={8} className="pl-8">
                            <div className="flex items-center space-x-4 py-3">
                              <div className="h-12 w-12 bg-slate-100 rounded-full"></div>
                              <div className="space-y-2 flex-1">
                                <div className="h-4 w-1/4 bg-slate-100 rounded-md"></div>
                                <div className="h-3 w-1/3 bg-slate-50 rounded-md"></div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : filteredReferrals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-72 text-center">
                          <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="h-24 w-24 rounded-full bg-slate-50 flex items-center justify-center shadow-inner">
                              <Users className="h-10 w-10 text-slate-300" />
                            </div>
                            <div>
                              <p className="text-xl font-bold text-slate-900">No referrals found</p>
                              <p className="text-slate-500 font-medium max-w-sm mx-auto mt-2">
                                {"Adjust filters or start sharing links to build your network."}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredReferrals.map((referral) => (
                        <Fragment key={referral.id}>
                          <TableRow className="group hover:bg-indigo-50/30 transition-colors border-slate-100 cursor-default">
                            <TableCell className="py-5 pl-8">
                              <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-700 flex items-center justify-center font-bold shadow-sm ring-2 ring-white">
                                  {referral.customerName?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 text-base group-hover:text-indigo-700 transition-colors">{referral.customerName}</div>
                                  <div className="text-[11px] text-slate-400 font-mono mt-0.5 tracking-wider bg-slate-50 inline-block px-1.5 rounded">ID: {referral.id}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-slate-600 font-medium bg-slate-50 w-fit px-2 py-1 rounded-md">
                                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                                  <span>{referral.email}</span>
                                </div>
                                {referral.phone && (
                                  <div className="flex items-center gap-2 text-sm text-slate-600 font-medium bg-slate-50 w-fit px-2 py-1 rounded-md">
                                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                                    <span>{referral.phone}</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-2 items-start">
                                <Badge className={\`px-3 py-1 whitespace-nowrap shadow-sm font-bold \${getStatusColor(referral.status)}\`}>
                                  <div className="w-1.5 h-1.5 rounded-full bg-current mr-2 inline-block opacity-70" />
                                  {formatStatusLabel(referral.status)}
                                </Badge>
                                <Badge className={\`font-semibold shadow-sm \${getTierColor(referral.tier)}\`}>
                                  {referral.tier}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-bold text-slate-700">{referral.signupDate}</div>
                              {referral.conversionDate && (
                                <div className="text-[11px] font-semibold text-emerald-600 mt-1 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded w-fit">
                                  Conver: {referral.conversionDate}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 font-black text-sm border-2 border-emerald-200/50 shadow-sm">
                                \${(referral.commission || 0).toLocaleString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              {referral.planPrice ? (
                                <span className="font-bold text-slate-700 text-base">\${referral.planPrice.toFixed(2)}</span>
                              ) : (
                                <span className="text-slate-300 font-bold">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-2 items-start">
                                {referral.isStripePaid ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 ring-1 ring-emerald-600/20 shadow-sm font-bold">Active Line</Badge>
                                ) : referral.subscriptionStatus === 'past_due' ? (
                                  <Badge className="bg-amber-100 text-amber-800 ring-1 ring-amber-600/20 shadow-sm font-bold">Past Due</Badge>
                                ) : referral.subscriptionStatus === 'canceled' ? (
                                  <Badge className="bg-rose-100 text-rose-800 ring-1 ring-rose-600/20 shadow-sm font-bold">Canceled</Badge>
                                ) : referral.subscriptionStatus === 'unpaid' ? (
                                  <Badge className="bg-amber-100 text-amber-800 ring-1 ring-amber-600/20 shadow-sm font-bold">Unpaid</Badge>
                                ) : (
                                  <Badge className="bg-slate-100 text-slate-800 ring-1 ring-slate-600/20 shadow-sm font-bold">{referral.subscriptionStatus || 'N/A'}</Badge>
                                )}
                                {referral.lastPaymentDate && (
                                  <button
                                    type="button"
                                    onClick={() => togglePaymentHistory(referral.id)}
                                    className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition-all w-max ring-1 ring-indigo-600/10 shadow-sm"
                                  >
                                    Last: {new Date(referral.lastPaymentDate).toLocaleDateString()}
                                    {(referral.paymentHistory?.length || 0) > 0 ? (
                                      expandedPaymentRows[referral.id] ? <ChevronUp className="h-3 w-3 stroke-[3]" /> : <ChevronDown className="h-3 w-3 stroke-[3]" />
                                    ) : null}
                                  </button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right pr-8">
                              <span className="font-black text-slate-900 text-xl tracking-tight">
                                \${(referral.lifetimeValue || 0).toLocaleString()}
                              </span>
                            </TableCell>
                          </TableRow>
                          <AnimatePresence>
                            {expandedPaymentRows[referral.id] && (referral.paymentHistory?.length || 0) > 0 && (
                              <TableRow key={\`\${referral.id}-payments\`}>
                                <TableCell colSpan={8} className="p-0 border-0">
                                  <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden bg-slate-50/80 border-b border-slate-100 shadow-inner"
                                  >
                                    <div className="p-6 pl-24">
                                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                        <CreditCard className="h-4 w-4" />
                                        Ledger History
                                      </h4>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {referral.paymentHistory?.map((payment) => (
                                          <div key={payment.paymentIntentId} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/60 flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition-all group">
                                            <div className="flex justify-between items-start mb-3">
                                              <div className="font-black text-slate-900 text-lg group-hover:text-indigo-700 transition-colors">
                                                \${payment.amount.toFixed(2)} <span className="text-[10px] text-slate-400 font-bold uppercase ml-0.5">{payment.currency}</span>
                                              </div>
                                              <div className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                                {payment.paymentIntentId.slice(-10)}
                                              </div>
                                            </div>
                                            <div>
                                              <div className="text-xs text-slate-600 font-bold bg-slate-50 px-2 py-1 rounded-md inline-block">
                                                {new Date(payment.createdAt).toLocaleDateString()} — {new Date(payment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                              </div>
                                              {payment.description && (
                                                <div className="text-[11px] text-slate-500 mt-2 font-medium line-clamp-1">{payment.description}</div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </motion.div>
                                </TableCell>
                              </TableRow>
                            )}
                          </AnimatePresence>
                        </Fragment>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Affiliate Overrides */}
            <div className="rounded-3xl border-2 border-slate-100 bg-white shadow-xl shadow-slate-200/40 overflow-hidden mt-6">
              <div className="p-8 border-b-2 border-slate-50">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-6 lg:space-y-0">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Affiliate Overrides</h2>
                    <p className="text-base text-slate-500 mt-1 font-medium">
                      Earnings generated completely passively by your sub-affiliate network.
                    </p>
                  </div>
                  <div className="flex items-center gap-6 text-sm bg-slate-50 p-3 rounded-2xl border border-slate-100 shadow-inner w-full lg:w-auto">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-indigo-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Sub-Network</div>
                        <div className="font-black text-slate-900 text-xl">{(childSummary.totalReferrals || 0).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="w-px h-12 bg-slate-200"></div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-emerald-100 flex items-center justify-center">
                        <Award className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Override Value</div>
                        <div className="font-black text-emerald-600 text-xl">\${(childSummary.totalCommission || 0).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="font-bold text-slate-500 uppercase tracking-widest text-[11px] h-14 pl-8">Sub-Affiliate</TableHead>
                      <TableHead className="font-bold text-slate-500 uppercase tracking-widest text-[11px] h-14">Customer Origin</TableHead>
                      <TableHead className="font-bold text-slate-500 uppercase tracking-widest text-[11px] h-14">Product Value</TableHead>
                      <TableHead className="font-bold text-slate-500 uppercase tracking-widest text-[11px] h-14">Status</TableHead>
                      <TableHead className="font-bold text-slate-500 uppercase tracking-widest text-[11px] h-14">Timeline</TableHead>
                      <TableHead className="font-bold text-slate-500 uppercase tracking-widest text-[11px] h-14 text-right pr-8">Your Profit Cut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i} className="animate-pulse">
                          <TableCell colSpan={6} className="pl-8">
                            <div className="h-6 w-full bg-slate-100 rounded-md py-3"></div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : filteredChildReferrals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-56 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3">
                            <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center shadow-inner">
                              <Briefcase className="h-8 w-8 text-slate-300" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-700 text-lg">No sub-affiliates right now</p>
                              <p className="text-slate-500 font-medium mt-1">Invite affiliates systematically to grow external override tiers.</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredChildReferrals.map((referral) => (
                        <TableRow key={referral.id} className="hover:bg-indigo-50/30 transition-colors border-slate-100">
                          <TableCell className="pl-8 py-5">
                            <div className="font-bold text-slate-900 group-hover:text-indigo-700">{referral.childAffiliateName}</div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5 bg-slate-50 inline-block px-1.5 rounded">ID: {referral.childAffiliateId ?? "-"}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-bold text-slate-700">{referral.customerName}</div>
                            <div className="text-[11px] text-slate-500 font-medium bg-slate-50 inline-block px-2 py-0.5 rounded mt-1">{referral.customerEmail}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-black text-slate-900">{referral.product}</div>
                            <div className="text-[10px] text-slate-500 mt-1 bg-slate-100/80 inline-block px-2 py-1 rounded-md font-bold uppercase tracking-widest border border-slate-200/50">
                              Val: \${referral.orderValue.toLocaleString()} @ {referral.commissionRate.toFixed(1)}%
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={\`px-3 py-1 whitespace-nowrap shadow-sm font-bold \${getChildStatusColor(referral.status)}\`}>
                              <div className="w-1.5 h-1.5 rounded-full bg-current mr-2 inline-block opacity-70" />
                              {formatChildStatusLabel(referral.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-600 text-sm font-bold">
                            {referral.orderDate}
                          </TableCell>
                          <TableCell className="text-right pr-8">
                            <div className="inline-flex flex-col items-end">
                              <span className="font-black text-emerald-600 text-xl bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100 shadow-sm">
                                +\${referral.commissionAmount.toLocaleString()}
                              </span>
                              {typeof referral.childCommissionAmount === "number" && (
                                <span className="text-[10px] uppercase font-black text-slate-400 mt-1.5 px-1.5 py-0.5">
                                  Sub earned: \${referral.childCommissionAmount.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <Dialog open={isAllTimeEarningsOpen} onOpenChange={setIsAllTimeEarningsOpen}>
        <DialogContent className="max-w-5xl rounded-[2rem] overflow-hidden p-0 border-0 shadow-2xl">
          <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Award className="w-64 h-64" />
            </div>
            <DialogHeader className="relative z-10">
              <DialogTitle className="text-3xl font-black text-white flex items-center gap-3">
                <div className="bg-indigo-500/20 p-2 rounded-xl backdrop-blur-sm ring-1 ring-white/10">
                  <Award className="h-8 w-8 text-indigo-300" />
                </div>
                All-Time Earnings Ledger
              </DialogTitle>
              <DialogDescription className="text-indigo-200/80 text-sm max-w-2xl mt-3 font-medium leading-relaxed">
                Complete and immutable timeline of every recorded subscription purchase. Volume bonuses execute instantly once thresholds are crossed.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10 relative z-10">
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="text-[11px] font-black uppercase tracking-widest text-indigo-300/80 mb-2">Total Volume</div>
                <div className="text-3xl font-black">{purchaseSummary.totalPurchases.toLocaleString()}</div>
              </div>
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="text-[11px] font-black uppercase tracking-widest text-indigo-300/80 mb-2">Network Rev</div>
                <div className="text-3xl font-black">\${purchaseSummary.totalRevenue.toLocaleString()}</div>
              </div>
              <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-400/10 backdrop-blur-md rounded-2xl p-5 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)] relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity"><DollarSign className="w-24 h-24 text-emerald-400" /></div>
                <div className="text-[11px] font-black uppercase tracking-widest text-emerald-300/80 relative z-10 mb-2">Your Earnings</div>
                <div className="text-3xl font-black text-emerald-400 relative z-10">\${purchaseSummary.totalCommissionEarned.toLocaleString()}</div>
              </div>
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="text-[11px] font-black uppercase tracking-widest text-indigo-300/80 mb-2">Base Multiplier</div>
                <div className="text-3xl font-black">{purchaseSummary.baseCommissionRate.toFixed(1)}%</div>
              </div>
            </div>
          </div>

          <div className="h-[60vh] overflow-y-auto bg-slate-50/50 p-8">
            {loadingPurchases ? (
              <div className="flex flex-col items-center justify-center h-full gap-5 text-slate-400">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                <p className="font-bold tracking-tight text-lg">Syncing blockchain-level ledger...</p>
              </div>
            ) : referralPurchases.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center shadow-inner">
                  <Activity className="h-10 w-10 opacity-30 text-slate-600" />
                </div>
                <p className="font-bold text-slate-500 text-lg">No subscription records generated yet.</p>
              </div>
            ) : (
              <div className="space-y-4 max-w-4xl mx-auto">
                {referralPurchases.map((purchase) => (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    key={purchase.id}
                    className={\`p-6 rounded-3xl border-2 bg-white shadow-sm transition-all hover:shadow-xl \${purchase.isThresholdBonus ? 'border-rose-200 hover:border-rose-300 shadow-rose-100/50' : 'border-slate-100 hover:border-indigo-100'}\`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="flex items-start gap-5">
                        <div className={\`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-base font-black shadow-inner \${purchase.isThresholdBonus ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-700'}\`}>
                          #{purchase.index}
                        </div>
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-slate-900 text-lg">{purchase.customerName}</span>
                            {purchase.isThresholdBonus && (
                              <Badge className="bg-gradient-to-r from-rose-100 to-pink-100 text-rose-800 hover:from-rose-100 hover:to-pink-100 border-0 font-black px-2.5 py-1 text-[10px] uppercase tracking-widest shadow-sm">
                                Volume Bonus Active
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-400 bg-slate-50/80 px-3 py-1.5 rounded-lg w-fit">
                            <span className="flex items-center gap-1.5 text-slate-500"><Mail className="w-3.5 h-3.5" /> {purchase.email}</span>
                            <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                            <span>{new Date(purchase.createdAt).toLocaleDateString()} at {new Date(purchase.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 bg-white inline-block px-2 py-1 rounded border border-slate-100 shadow-sm">
                            INTENT: {purchase.paymentIntentId}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-4 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
                        <div className="text-left lg:text-right">
                          <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Revenue</div>
                          <div className="text-2xl font-black text-slate-900 tracking-tight">
                            \${purchase.amount.toFixed(2)} <span className="text-[11px] text-slate-400 font-bold uppercase ml-0.5">{purchase.currency}</span>
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-2 border-emerald-100/80 px-4 py-2 rounded-xl flex flex-col items-end shadow-sm">
                          <div className="text-base font-black text-emerald-700">
                            Earned \${purchase.commissionEarned.toFixed(2)}
                          </div>
                          <div className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mt-0.5">
                            @ {purchase.effectiveCommissionRate.toFixed(1)}% Multiplier
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AffiliateLayout>
  );
}
`;

fs.writeFileSync('C:/Users/munib/Downloads/ScoreMachineV2RawCode/client/pages/AffiliateReferrals.tsx', beforeReturn + newReturn, 'utf8');
console.log('Done!');
