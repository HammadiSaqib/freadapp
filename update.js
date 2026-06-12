const fs = require('fs');
const prefix = fs.readFileSync('client/pages/Index.tsx', 'utf8').split('\n').slice(0, 501).join('\n');
const replacement = \
  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 overflow-x-hidden font-sans selection:bg-teal-400/20 text-slate-600">
      <Helmet>
        <title>The Capsol – AI-Powered Credit Analysis Platform</title>
        <meta name="description" content="The Capsol is the AI-powered credit analysis platform for professionals. Automate workflows, get structured insights, and manage clients securely." />
        <meta name="keywords" content="AI credit analysis tools, credit reporting software, credit file organization, credit industry platform, professional credit analytics, credit workflow automation, secure credit software, free credit score, AI-driven credit intelligence for lenders, credit card recommendations, Professional funding CRM software, how to fix credit report, FCRA compliant credit dispute system, VantageScore vs FICO, Underwriting Blueprint analysis for business funding, personal loan comparison, Automated fundability score check" />
        <link rel="canonical" href="https://scoremachine.com/" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://scoremachine.com/" />
        <meta property="og:title" content="The Capsol – AI-Powered Credit Analysis Platform" />
        <meta property="og:description" content="The Capsol is the AI-powered credit analysis platform for professionals. Automate workflows, get structured insights, and manage clients securely." />
        <meta property="og:image" content="https://scoremachine.com/site-image.png" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://scoremachine.com/" />
        <meta property="twitter:title" content="The Capsol – AI-Powered Credit Analysis Platform" />
        <meta property="twitter:description" content="The Capsol is the AI-powered credit analysis platform for professionals. Automate workflows, get structured insights, and manage clients securely." />
        <meta property="twitter:image" content="https://scoremachine.com/site-image.png" />

        <script type="application/ld+json">
          {\{\\"@context\\": \\"https://schema.org\\", \\"@type\\": \\"SoftwareApplication\\", \\"name\\": \\"ScoreMachine\\", \\"applicationCategory\\": \\"FinanceApplication\\", \\"operatingSystem\\": \\"Web\\", \\"offers\\": {\\"@type\\": \\"Offer\\", \\"price\\": \\"0\\", \\"priceCurrency\\": \\"USD\\"}, \\"description\\": \\"The Capsol is the AI-powered credit analysis platform for professionals. Automate workflows, get structured insights, and manage clients securely.\\", \\"featureList\\": \\"AI-assisted credit file organization, Structured report summaries, Progress tracking and score timelines, Automated dispute letter generation, Professional client dashboard, Multi-client management tools, Secure data encryption (SOC 2 standards), White-label and branding options, Automated workflows for credit professionals, Real-time analytics and report insights, PDF export and summary tools, Compliance-focused credit data handling, Team and employee management, API access\\"}\}
        </script>
      </Helmet>

      {/* --- GLOBAL BACKGROUND PATTERN --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Light Base */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-slate-100"></div>
        
        {/* Subtle Animated Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: \linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px), 
                             linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px)\,
            backgroundSize: '50px 50px'
          }}
        ></div>

        {/* Animated Gradient Orbs - Light Theme */}
        <div className="absolute top-[-15%] left-[-8%] w-[60vw] h-[60vw] bg-gradient-to-br from-teal-200/30 via-emerald-200/20 to-transparent rounded-full blur-[140px] animate-pulse"></div>
        <div className="absolute bottom-[-15%] right-[-8%] w-[60vw] h-[60vw] bg-gradient-to-tl from-indigo-200/30 via-blue-200/20 to-transparent rounded-full blur-[140px] animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-[35%] left-[15%] w-[40vw] h-[40vw] bg-gradient-to-br from-cyan-200/25 to-transparent rounded-full blur-[120px] opacity-80"></div>
        <div className="absolute bottom-[20%] right-[10%] w-[35vw] h-[35vw] bg-gradient-to-tl from-emerald-200/20 to-transparent rounded-full blur-[110px]"></div>
      </div>

      <SiteHeader />

      {/* --- HERO SECTION --- */}
      <section ref={heroRef} className="relative min-h-[100vh] flex items-center pt-20 lg:pt-0">
        
        {/* Animated Background Layer */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <FallingMoney />
          
          {/* Gradient Fade at bottom to blend with next section */}
          <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-white via-slate-50 to-transparent z-20"></div>
        </div>

        <div className="container mx-auto px-4 relative z-30">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-4 items-center">
            {/* Text Content */}
            <div className="space-y-8 text-center lg:text-left">
              <div className="hero-text-item inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-slate-200 backdrop-blur-md shadow-sm hover:shadow-md transition-shadow">
                <span className="flex h-2 w-2 rounded-full bg-teal-500 animate-pulse"></span>
                <span className="text-sm font-semibold text-slate-700">The Capsol</span>
              </div>

              <h1 className="hero-text-item text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tight text-slate-900">
                <span className="block">Next-Generation</span>
                <span className="p-3 block bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 bg-clip-text text-transparent">
                  Credit Intelligence
                </span>
                <span className="block text-4xl lg:text-5xl mt-2 text-slate-700">for Professionals</span>
              </h1>

              <p className="hero-text-item text-xl text-slate-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
                Built for credit experts, funding consultants, and financial service providers who demand accuracy, clarity, and modern tools. The Capsol delivers advanced credit insights through structured analytics and innovative AI technology.
              </p>

              <div className="flex flex-col gap-3">
                <div className="hero-text-item flex flex-col sm:flex-row gap-4 pt-4 justify-center lg:justify-start">
                  <Button
                    asChild
                    size="lg"
                    className="h-14 px-8 text-lg rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-lg shadow-teal-400/25 hover:shadow-teal-400/35 transition-all duration-300 border-0 font-semibold"
                  >
                    <Link to="/login">
                      Get Started Today <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 px-8 text-lg rounded-full border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-400 transition-all duration-300 bg-white/60 backdrop-blur-sm shadow-sm font-semibold"
                    onClick={scrollToHowItWorks}
                  >
                    <Play className="mr-2 h-5 w-5 fill-current" />
                    Watch Demo
                  </Button>
                </div>
                <p className="hero-text-item text-xs text-slate-500 italic lg:ml-2 mt-2 max-w-md leading-relaxed">
                  Create a free account — no credit card required. Enjoy 14-day access with limited report visibility. Full report access and pulls are billed individually. Cancel anytime.
                </p>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-teal-400/15 via-emerald-400/10 to-cyan-400/10 blur-2xl" />
                <img
                  src="/frame_chrome_mac_dark.png"
                  alt="The Capsol dashboard preview"
                  loading="lazy"
                  decoding="async"
                  className="relative w-full max-w-[720px] rounded-3xl shadow-2xl border border-slate-200 backdrop-blur-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- TRUSTED BY / SOCIAL PROOF --- */}
      <section ref={trustedRef} className="trusted-section py-16 border-y border-slate-200 relative z-10 bg-white/70 backdrop-blur-lg">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Designed for credit and funding professionals</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">For industry practitioners seeking reliable, structured, and efficient credit analysis tools.</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { val: "Nationwide", label: "Professional Use", color: "text-teal-600" },
              { val: "Extensive", label: "Report Processing Capability", color: "text-emerald-600" },
              { val: "Industry", label: "Grade Technology", color: "text-teal-600" },
              { val: "Advanced", label: "AI-Driven Insights", color: "text-emerald-600" },
            ].map((stat, i) => (
              <div key={i} className="trusted-item group relative p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-default">
                {/* Subtle Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                <div className="relative z-10 text-center">
                  <div className={\	ext-2xl lg:text-3xl font-black \ mb-2 transform group-hover:scale-105 transition-transform duration-300\}>
                    {stat.val}
                  </div>
                  <div className="text-xs lg:text-sm text-slate-600 font-bold uppercase tracking-wide">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
          
          <p className="text-center text-xs text-slate-500 mt-12 italic">
            (All metrics represent platform capacity and usage trends, not guaranteed performance or results.)
          </p>
        </div>
      </section>

      {/* --- CREDIT STRATEGY TOOLKIT (FEATURES) - BENTO GRID --- */}
      <section ref={featuresRef} id="features" className="py-32 relative z-10 bg-gradient-to-b from-white to-slate-50/50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <div className="features-header-item inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 text-teal-700 text-sm font-bold mb-6 border border-teal-200">
              <Sparkles className="h-4 w-4" /> CREDIT STRATEGY TOOLKIT
            </div>
            <h2 className="features-header-item text-4xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight">
              Professional <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600">
                Credit Strategy Toolkit
              </span>
            </h2>
            <p className="features-header-item text-lg text-slate-600">
              Tools designed to help credit professionals and clients better understand, organize, and evaluate credit information.
            </p>
          </div>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 auto-rows-max">
            {/* Card 1 - Regular Size */}
            <Card className="feature-card lg:col-span-1 border border-slate-200 shadow-md hover:shadow-lg transition-all duration-500 hover:-translate-y-1 bg-white/80 backdrop-blur-sm overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 opacity-0 group-hover:opacity-5 transition-opacity duration-500"></div>
              <CardHeader>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg mb-6 group-hover:scale-110 transition-transform duration-500">
                  <TrendingUp className="h-7 w-7" />
                </div>
                <CardTitle className="text-xl font-bold mb-3 text-slate-800 group-hover:text-blue-600 transition-colors">Progress Report & Score Timeline</CardTitle>
                <CardDescription className="text-slate-600 leading-relaxed">
                  Visualize how key credit data points evolve over time for clearer decision-making.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Card 2 - Regular Size */}
            <Card className="feature-card lg:col-span-1 border border-slate-200 shadow-md hover:shadow-lg transition-all duration-500 hover:-translate-y-1 bg-white/80 backdrop-blur-sm overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-600 opacity-0 group-hover:opacity-5 transition-opacity duration-500"></div>
              <CardHeader>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-lg mb-6 group-hover:scale-110 transition-transform duration-500">
                  <FileText className="h-7 w-7" />
                </div>
                <CardTitle className="text-xl font-bold mb-3 text-slate-800 group-hover:text-emerald-600 transition-colors">Client Summary Export & PDF</CardTitle>
                <CardDescription className="text-slate-600 leading-relaxed">
                  Generate clean, organized, professional summaries with one click.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Card 3 - Regular Size */}
            <Card className="feature-card lg:col-span-1 border border-slate-200 shadow-md hover:shadow-lg transition-all duration-500 hover:-translate-y-1 bg-white/80 backdrop-blur-sm overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-600 opacity-0 group-hover:opacity-5 transition-opacity duration-500"></div>
              <CardHeader>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-lg mb-6 group-hover:scale-110 transition-transform duration-500">
                  <Brain className="h-7 w-7" />
                </div>
                <CardTitle className="text-xl font-bold mb-3 text-slate-800 group-hover:text-indigo-600 transition-colors">Comprehensive AI Credit Analysis</CardTitle>
                <CardDescription className="text-slate-600 leading-relaxed">
                  Advanced AI highlights patterns, trends, and areas that may require attention — all in a structured and readable format.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Card 4 - Regular Size */}
            <Card className="feature-card lg:col-span-1 border border-slate-200 shadow-md hover:shadow-lg transition-all duration-500 hover:-translate-y-1 bg-white/80 backdrop-blur-sm overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 opacity-0 group-hover:opacity-5 transition-opacity duration-500"></div>
              <CardHeader>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white shadow-lg mb-6 group-hover:scale-110 transition-transform duration-500">
                  <Shield className="h-7 w-7" />
                </div>
                <CardTitle className="text-xl font-bold mb-3 text-slate-800 group-hover:text-purple-600 transition-colors">Underwriting Overview</CardTitle>
                <CardDescription className="text-slate-600 leading-relaxed">
                  Provides a general readiness overview based on commonly used lending and compliance factors.
                  <span className="block mt-2 text-xs italic opacity-80">Not a guarantee of credit or funding approval.</span>
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Benefits Box */}
          <div className="text-center mt-16 p-8 bg-white/70 backdrop-blur-sm rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Included With Every Paid Subscription</h3>
            <div className="flex flex-wrap justify-center gap-8 text-sm font-medium text-slate-700">
              {["No setup fees", "Cancel anytime", "Full access immediately after subscribing"].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --- THE JOURNEY (HOW IT WORKS) --- */}
      <section ref={howItWorksRef} id="how-it-works" className="py-24 relative z-10 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-emerald-400/40 text-emerald-700 bg-emerald-50">
              THE JOURNEY
            </Badge>
            <h2 className="text-4xl font-bold text-slate-900">
              Transform the Way You <span className="text-teal-600">Understand Credit</span>
            </h2>
            <p className="text-slate-600 mt-4 text-lg">The Capsol streamlines the entire process of reviewing and organizing credit information.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 relative">
              {/* Connecting Line */}
              <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-teal-400 to-emerald-400 lg:block hidden"></div>

              {[
                { step: "1", title: "Create a Free Account", desc: "Start in seconds." },
                { step: "2", title: "Choose Your Plan", desc: "Pay only for what you need — per-pull or unlimited options." },
                { step: "3", title: "Connect Securely", desc: "Reports are pulled automatically from MyFreeScoreNow through secure integration." },
                { step: "4", title: "Access Clear, Structured Results", desc: "View organized insights, credit factors, and readiness indicators instantly." }
              ].map((item, i) => (
                <div key={i} className="step-item flex gap-6 relative z-10">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 text-white font-bold text-xl flex items-center justify-center shadow-lg shrink-0 border border-teal-300/30">
                    {item.step}
                  </div>
                  <div className="pt-2">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-slate-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="how-it-works-laptop relative w-full max-w-[600px] mx-auto lg:mr-0 [perspective:2000px]">
              <div className="laptop-wrapper relative w-full aspect-[16/10] [transform-style:preserve-3d] group">
                
                {/* Base (Keyboard area) - Light Theme */}
                <div className="absolute bottom-0 w-full h-[1.5rem] bg-gradient-to-b from-slate-300 to-slate-400 rounded-b-2xl shadow-2xl z-10 origin-top [transform:rotateX(12deg)] border-t border-slate-300 flex items-center justify-center [transform-style:preserve-3d]">
                  <div className="w-1/3 h-[4px] bg-slate-400 rounded-full mt-2"></div>
                </div>

                {/* Lid (Screen) - Light Silver */}
                <div className="laptop-lid absolute inset-0 origin-bottom bg-gradient-to-b from-slate-300 to-slate-200 rounded-t-2xl border-[6px] border-slate-300 shadow-2xl [transform-style:preserve-3d] flex items-center justify-center overflow-hidden"
                     style={{ transform: 'rotateX(-100deg)' }}
                >
                  {/* Screen Content */}
                  <div className="relative w-full h-full bg-black overflow-hidden rounded-lg">
                    {!videoPlaying ? (
                      <div className="absolute inset-0 cursor-pointer group" onClick={() => setVideoPlaying(true)}>
                        <img 
                          src="https://img.youtube.com/vi/4KwPYMarpbo/maxresdefault.jpg"
                          srcSet="https://img.youtube.com/vi/4KwPYMarpbo/mqdefault.jpg 320w, https://img.youtube.com/vi/4KwPYMarpbo/hqdefault.jpg 480w, https://img.youtube.com/vi/4KwPYMarpbo/sddefault.jpg 640w, https://img.youtube.com/vi/4KwPYMarpbo/maxresdefault.jpg 1280w"
                          sizes="(max-width: 640px) 100vw, 600px"
                          alt="The Capsol Pro Full Walkthrough (2025)"
                          loading="lazy"
                          decoding="async"
                          width="1280"
                          height="720"
                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                          <div className="w-20 h-20 bg-teal-500/85 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(20,184,166,0.6)] transform group-hover:scale-110 transition-all duration-300 backdrop-blur-sm border border-white/30">
                            <Play className="w-8 h-8 text-white fill-current ml-1" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <iframe 
                        width="100%" 
                        height="100%" 
                        src="https://www.youtube.com/embed/4KwPYMarpbo?autoplay=1&rel=0" 
                        title="The Capsol Pro Full Walkthrough (2025)" 
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                        className="w-full h-full"
                      ></iframe>
                    )}
                  </div>
                  
                  {/* Webcam */}
                  <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-slate-600 rounded-full z-20 shadow-inner"></div>
                </div>
                
              </div>
                
              {/* Ambient Glow - Light Theme */}
              <div className="absolute -z-10 bottom-[-40px] left-1/2 -translate-x-1/2 w-[120%] h-[60px] bg-gradient-to-r from-teal-400/15 via-emerald-400/20 to-cyan-400/15 blur-[50px] rounded-[100%] animate-pulse"></div>
              
            </div>
          </div>
        </div>
      </section>

      {/* --- TESTIMONIALS --- */}
      <section ref={testimonialsRef} className="py-24 relative z-10 bg-slate-50/50 overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-400/8 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-400/8 rounded-full blur-[100px] pointer-events-none translate-y-1/2 -translate-x-1/2" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-slate-900 tracking-tight">
              Trusted by Industry Leaders
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              See what top professionals are saying about their experience with The Capsol Pro.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            {currentTestimonials.map((t) => {
              const src = /^https?:\\/\\//i.test(t.video) ? t.video : \/\\;
              const isDrive = isDriveUrl(src);
              const embed = isDrive ? null : toEmbedUrl(src);
              return (
                <div
                  key={t.id}
                  className="testimonial-card group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-200 cursor-pointer w-[280px] sm:w-[300px] lg:w-[320px]"
                  onClick={() => setActiveTestimonialVideo(src)}
                >
                  <div className="relative aspect-[9/16] bg-slate-900">
                    {isDrive ? (
                      <DrivePreview url={src} title={t.client_name} />
                    ) : embed ? (
                      <div className="relative w-full h-full overflow-hidden">
                        <iframe
                          src={embed}
                          className="w-full h-full opacity-90 group-hover:opacity-100 transition-opacity duration-500 bg-black"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          title={t.client_name}
                        />
                      </div>
                    ) : (
                      <VideoThumbnail
                        src={src}
                        alt={t.client_name}
                        className="opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                      <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300 backdrop-blur-sm">
                        <Play className="w-6 h-6 text-teal-600 fill-current ml-1" />
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5 text-white pointer-events-none">
                    <h3 className="font-bold text-lg leading-tight mb-1">{t.client_name}</h3>
                    <p className="text-sm text-teal-100 font-medium opacity-90">{t.client_role || ""}</p>
                  </div>
                </div>
              );
            })}
          </div>
          
          <p className="text-center text-xs text-slate-500 mt-12 italic opacity-70">
            Disclosure: Individual experiences vary. These testimonials reflect personal opinions and workflow benefits, not guaranteed results.
          </p>
        </div>
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              className="rounded-full border-slate-300 text-slate-700 hover:bg-slate-100"
              onClick={prevTestimonialsPage}
              disabled={!canPrev}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-sm text-slate-600">
              Page {Math.min(testimonialPage + 1, totalPages)} of {totalPages}
            </span>
            <Button
              variant="outline"
              className="rounded-full border-slate-300 text-slate-700 hover:bg-slate-100"
              onClick={nextTestimonialsPage}
              disabled={!canNext}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Video Modal */}
        {activeTestimonialVideo &&
          createPortal(
            <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={() => setActiveTestimonialVideo(null)}>
              <div className="relative w-full h-full max-w-7xl max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setActiveTestimonialVideo(null)}
                  className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                {(() => {
                  const src = activeTestimonialVideo || '';
                  if (isDriveUrl(src)) {
                    return <DrivePlayer url={src} />;
                  }
                  const embed = toEmbedUrl(src);
                  if (embed) {
                    const isYouTube = /youtube\\.com/i.test(embed);
                    if (isYouTube) {
                      return (
                        <div className="relative h-[85vh] aspect-[9/16] mx-auto bg-black rounded-2xl overflow-hidden shadow-2xl">
                          <iframe
                            src={embed}
                            className="absolute inset-0 w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            title="Testimonial"
                          />
                        </div>
                      );
                    }
                    return (
                      <iframe
                        src={embed}
                        className="w-[80vw] h-[80vh] max-w-full max-h-full rounded-2xl shadow-2xl bg-black"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        title="Testimonial"
                      />
                    );
                  }
                  return (
                    <video
                      src={src}
                      className="w-full h-full max-h-[85vh] object-contain mx-auto rounded-2xl shadow-2xl bg-black"
                      controls
                      autoPlay
                      controlsList="nodownload"
                      onContextMenu={(e) => e.preventDefault()}
                      playsInline
                      disablePictureInPicture
                    >
                      Your browser does not support the video tag.
                    </video>
                  );
                })()}
              </div>
            </div>,
            document.body
          )}
      </section>

      {/* --- ABOUT THE PLATFORM --- */}
      <section ref={aboutRef} className="py-24 bg-white relative z-10">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <h2 className="about-item text-3xl lg:text-4xl font-bold mb-6 text-slate-900">Built for Professional Accuracy and Compliance</h2>
          <p className="about-item text-lg text-slate-600 mb-10">
            The Capsol is designed to meet the needs of modern financial professionals. Our system is built with:
          </p>
          
          <div className="about-item flex flex-wrap justify-center gap-4 mb-12">
            {["Secure data handling", "Clear, structured analysis", "AI-enhanced insight generation", "Professional-grade reporting", "Compliance-aware methodology"].map((item, i) => (
              <div key={i} className="px-4 py-2.5 bg-gradient-to-br from-white to-slate-50 rounded-full border border-slate-300 shadow-sm text-slate-800 font-semibold hover:shadow-md transition-shadow">
                {item}
              </div>
            ))}
          </div>
          
          <div className="about-item">
            <p className="text-2xl font-bold text-teal-600 mb-8">Get the clarity you need to make informed decisions — without guessing.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-full px-8 shadow-lg shadow-teal-400/25 font-semibold">
                <Link to="/register">Create Free Account</Link>
              </Button>
              <Button variant="outline" size="lg" className="border-slate-300 text-slate-700 hover:bg-slate-50 rounded-full px-8 font-semibold" onClick={scrollToHowItWorks}>
                Watch Demo
              </Button>
            </div>
            <div className="mt-6 text-sm text-slate-600 max-w-xl mx-auto bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
              <p className="font-semibold mb-1">Create a free account — no credit card required.</p>
              <p>Enjoy 14-day access with limited report visibility.</p>
              <p className="text-xs text-slate-500 mt-2">Full report access and pulls are billed individually. Cancel anytime.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- AFFILIATE PROGRAM - LIGHT THEMED --- */}
      <section ref={affiliateRef} className="py-24 bg-gradient-to-br from-white via-slate-50 to-slate-100 relative overflow-hidden text-slate-900 border-t border-slate-200">
        {/* Light Decorative Orbs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-300/15 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-300/15 rounded-full blur-[120px] pointer-events-none translate-y-1/2 -translate-x-1/4"></div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="affiliate-anim inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white border border-slate-300 shadow-sm mb-8 font-semibold text-slate-800">
            AFFILIATE PROGRAM
          </div>
          
          <h2 className="affiliate-anim text-4xl lg:text-6xl font-black mb-6 text-slate-900">
            Exclusive <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600">Affiliate Partner Program</span>
          </h2>
          
          <p className="affiliate-anim text-xl text-slate-700 max-w-3xl mx-auto mb-12 leading-relaxed">
            Earn recurring commissions by referring professionals to The Capsol.
          </p>
          
          <div className="affiliate-anim grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { title: "Up to 30% Commission", desc: "Up to 30% commission on active subscriber referrals.", icon: DollarSign },
              { title: "Real-Time Analytics", desc: "Track clicks, conversions, and payouts.", icon: BarChart3 },
              { title: "SmartLink Included", desc: "Easy, profitable traffic monetization. Turn clicks into commissions.", icon: MousePointer2 },
            ].map((item, i) => (
              <div key={i} className="bg-white/60 backdrop-blur-sm border border-slate-300 p-8 rounded-2xl hover:bg-white/80 hover:shadow-lg transition-all text-left shadow-sm">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center text-white mb-4 shadow-md">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-slate-900">{item.title}</h3>
                <p className="text-slate-700">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 affiliate-anim">
            <Button asChild size="lg" className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-full px-8 shadow-lg shadow-teal-400/25 font-semibold">
              <Link to="/affiliate/login">Access Affiliate Portal & Materials</Link>
            </Button>
          </div>
          
          <p className="affiliate-anim text-xs text-slate-600 mt-12 italic max-w-2xl mx-auto">
            Disclosure: Affiliates must comply with company advertising guidelines and may not make credit improvement promises or financial guarantees.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
\;

fs.writeFileSync('client/pages/Index.tsx', prefix + '\\n' + replacement);
