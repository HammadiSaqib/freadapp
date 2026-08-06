import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import {
  Home,
  LayoutDashboard,
  LifeBuoy,
  Gauge,
  Mail,
  Bot,
  TrendingUp,
  FileQuestion,
  Search,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

const NotFound = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showFinalMenu, setShowFinalMenu] = useState(false);

  useGSAP(
    () => {
      const tl = gsap.timeline({
        onComplete: () => setShowFinalMenu(true),
      });

      // --- Setup Initial States ---
      gsap.set(".scene-element", { opacity: 0, display: "none" });
      gsap.set(".story-text", { opacity: 0, display: "none", y: 20 });
      gsap.set(".final-screen", { opacity: 0, display: "none" });

      // ========================================================================
      // SCENE 1: Credit Score Meter Panics
      // ========================================================================
      tl.set("#scene-1-gauge", { display: "block", opacity: 0, scale: 0.5 });
      tl.set("#text-1", { display: "block", opacity: 0 });

      // Entrance
      tl.to("#scene-1-gauge", {
        opacity: 1,
        scale: 1,
        duration: 0.5,
        ease: "back.out(1.7)",
      })
        .to("#text-1", { opacity: 1, y: 0, duration: 0.5 }, "<");

      // Shake & Look Around
      tl.to("#scene-1-gauge", {
        rotation: 15,
        duration: 0.1,
        yoyo: true,
        repeat: 5,
      })
        .to("#scene-1-gauge", { x: -20, duration: 0.2, ease: "sine.inOut" })
        .to("#scene-1-gauge", { x: 20, duration: 0.2, ease: "sine.inOut" })
        .to("#scene-1-gauge", { x: 0, duration: 0.2, ease: "sine.inOut" });

      // Run off screen
      tl.to("#scene-1-gauge", {
        x: 500,
        opacity: 0,
        duration: 0.6,
        ease: "power2.in",
      })
        .to("#text-1", { opacity: 0, y: -20, duration: 0.3 }, "-=0.2");

      // ========================================================================
      // SCENE 2: Falling Credit Score Numbers
      // ========================================================================
      tl.set(".falling-number", { display: "block", y: -200, opacity: 1 });
      tl.set("#text-2", { display: "block", opacity: 0, y: 20 });

      // Fall & Bounce
      tl.to(".falling-number", {
        y: 0,
        duration: 1,
        stagger: 0.1,
        ease: "bounce.out",
      })
        .to("#text-2", { opacity: 1, y: 0, duration: 0.5 }, "<+0.5");

      // Shuffle into 404
      // We will move 520 -> first 4, 680 -> 0, 740 -> second 4
      // Others fade out
      tl.to(".falling-number.extra", {
        opacity: 0,
        scale: 0,
        duration: 0.5,
      });

      tl.to(".falling-number.target-4-1", {
        x: -60,
        scale: 1.5,
        color: "#EF4444", // Red for error
        duration: 0.8,
        text: "4", // Requires TextPlugin usually, but we'll just swap content via DOM or rely on movement for now.
        // Since we don't have TextPlugin loaded, we'll crossfade to the big 404 text
      });

      // Actually, let's just fade them out and SLAM the big 404 down
      tl.to(".falling-number", {
        scale: 0,
        opacity: 0,
        duration: 0.4,
        stagger: 0.05,
      });

      tl.set("#big-404", { display: "flex", scale: 5, opacity: 0 });
      tl.to("#big-404", {
        scale: 1,
        opacity: 1,
        duration: 0.6,
        ease: "elastic.out(1, 0.3)",
      });

      tl.to("#text-2", { opacity: 0, y: -20, duration: 0.5, delay: 1 });

      // ========================================================================
      // SCENE 3: Dispute Letters Fly Across
      // ========================================================================
      tl.set(".flying-envelope", { display: "block", x: -100, opacity: 1, y: 50 });
      tl.set("#text-3", { display: "block", opacity: 0, y: 20 });

      // Fly letters
      tl.to("#text-3", { opacity: 1, y: 0, duration: 0.5 });
      
      tl.to(".flying-envelope", {
        x: "120vw",
        duration: 2,
        stagger: 0.3,
        ease: "power1.inOut",
      }, "<");

      // One hits the 404 (simulated timing)
      // Let's make the 404 wobble when "hit"
      tl.to("#big-404", {
        rotation: 10,
        scale: 0.9,
        duration: 0.1,
        yoyo: true,
        repeat: 3,
      }, "-=1.5");
      
      // Make one envelope "fall" mid-flight
      tl.set("#falling-envelope", { display: "block", x: 0, y: 0, opacity: 0 }); // Center screen roughly
      tl.to("#falling-envelope", {
        opacity: 1,
        y: 200,
        rotation: 360,
        duration: 1,
        ease: "power2.in",
      }, "-=1");

      tl.to("#text-3", { opacity: 0, y: -20, duration: 0.5, delay: 0.5 });
      tl.to("#big-404", { opacity: 0, scale: 0, duration: 0.5 }); // Clear 404 for next scene

      // ========================================================================
      // SCENE 4: AI Robot Analyst Scanning
      // ========================================================================
      tl.set("#scene-4-bot", { display: "flex", opacity: 0, scale: 0 });
      tl.set("#text-4", { display: "block", opacity: 0, y: 20 });
      
      // Bot Enters
      tl.to("#scene-4-bot", {
        opacity: 1,
        scale: 1,
        duration: 0.5,
        ease: "back.out(1.7)",
      })
      .to("#text-4", { opacity: 1, y: 0, duration: 0.5 }, "<");

      // Laser Scan
      tl.set(".laser-beam", { height: 0, opacity: 0.5 });
      tl.to(".laser-beam", {
        height: 150,
        duration: 1,
        yoyo: true,
        repeat: 1,
        ease: "power1.inOut",
      });

      // Confusion
      tl.set("#bot-confusion", { display: "block", opacity: 0, scale: 0 });
      tl.to("#bot-confusion", {
        opacity: 1,
        scale: 1,
        duration: 0.4,
        ease: "elastic.out(1, 0.5)",
      });

      // Print Paper
      tl.set("#bot-paper", { display: "block", y: -20, opacity: 0 });
      tl.to("#bot-paper", {
        y: 40,
        opacity: 1,
        duration: 0.6,
        ease: "power2.out",
      });

      tl.to("#scene-4-bot", { opacity: 0, x: -100, duration: 0.5, delay: 1.5 });
      tl.to("#text-4", { opacity: 0, y: -20, duration: 0.5 }, "<");

      // ========================================================================
      // SCENE 5: Score Graph Crashes
      // ========================================================================
      tl.set("#scene-5-graph", { display: "block", opacity: 0 });
      tl.set("#text-5", { display: "block", opacity: 0, y: 20 });
      tl.set(".graph-line", { drawSVG: "0%" }); // Requires plugin, we'll use scaleY for simplicity

      tl.to("#scene-5-graph", { opacity: 1, duration: 0.5 });
      tl.to("#text-5", { opacity: 1, y: 0, duration: 0.5 }, "<");

      // Line rises (scaleY of a bar or path drawing)
      // We'll simulate a line chart with a simple SVG path that we animate the 'd' attribute or clip-path
      tl.fromTo(".graph-path", 
        { strokeDasharray: 1000, strokeDashoffset: 1000 },
        { strokeDashoffset: 500, duration: 1.5, ease: "power1.out" } // Rise
      );
      
      // Crash
      tl.to(".graph-path", {
        strokeDashoffset: 0, // Assuming full path includes the drop
        duration: 0.3,
        ease: "bounce.out",
      });
      
      // "404" appears at bottom of graph
      tl.set("#graph-404", { display: "block", opacity: 0, scale: 2 });
      tl.to("#graph-404", {
        opacity: 1,
        scale: 1,
        duration: 0.3,
        ease: "power4.in",
      });

      tl.to("#scene-5-graph", { opacity: 0, duration: 0.5, delay: 1.5 });
      tl.to("#text-5", { opacity: 0, y: -20, duration: 0.5 }, "<");

      // ========================================================================
      // FINAL SCREEN
      // ========================================================================
      tl.set(".final-screen", { display: "block" });
      tl.to(".final-screen", {
        opacity: 1,
        duration: 1,
      });

    },
    { scope: containerRef }
  );

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-slate-50 font-sans text-slate-600 flex flex-col"
    >
      <Helmet>
        <title>Page Not Found - Score Machine</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <SiteHeader />

      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden p-4">
        {/* ================= SCENE 1: GAUGE ================= */}
        <div id="scene-1-gauge" className="scene-element absolute">
          <Gauge size={120} className="text-blue-600" />
        </div>
        <div id="text-1" className="story-text absolute bottom-1/4 text-2xl font-bold text-slate-700 text-center">
          Wait—where did the credit score go?
        </div>

        {/* ================= SCENE 2: FALLING NUMBERS ================= */}
        <div className="absolute inset-0 pointer-events-none flex justify-center items-center">
          <div className="falling-number extra absolute text-xl font-mono text-slate-400 left-[30%]">520</div>
          <div className="falling-number target-4-1 absolute text-xl font-mono text-slate-400 left-[40%]">680</div>
          <div className="falling-number extra absolute text-xl font-mono text-slate-400 left-[50%]">310</div>
          <div className="falling-number extra absolute text-xl font-mono text-slate-400 left-[60%]">740</div>
          
          <div id="big-404" className="hidden absolute text-9xl font-black text-slate-800 flex gap-2">
            <span className="text-blue-600">4</span>
            <span className="text-slate-300">0</span>
            <span className="text-blue-600">4</span>
          </div>
        </div>
        <div id="text-2" className="story-text absolute bottom-1/4 text-2xl font-bold text-slate-700 text-center">
          Looks like this page has no credit history.
        </div>

        {/* ================= SCENE 3: FLYING ENVELOPES ================= */}
        <div className="absolute inset-0 pointer-events-none">
            <Mail className="flying-envelope absolute top-1/3 left-0 text-emerald-500 w-12 h-12" />
            <Mail className="flying-envelope absolute top-1/2 left-0 text-blue-500 w-10 h-10" />
            <Mail className="flying-envelope absolute top-1/4 left-0 text-purple-500 w-14 h-14" />
            
            <Mail id="falling-envelope" className="hidden absolute top-1/2 left-1/2 -ml-6 text-red-500 w-12 h-12" />
        </div>
        <div id="text-3" className="story-text absolute bottom-1/4 text-2xl font-bold text-slate-700 text-center">
          These dispute letters got lost too...
        </div>

        {/* ================= SCENE 4: AI ROBOT ================= */}
        <div id="scene-4-bot" className="scene-element absolute flex-col items-center">
          <div className="relative">
            <Bot size={100} className="text-indigo-600" />
            <div className="laser-beam absolute top-1/2 left-1/2 -translate-x-1/2 w-32 bg-red-500/30 border-b-2 border-red-500 rounded-full blur-sm"></div>
            <div id="bot-confusion" className="hidden absolute -top-8 -right-8 text-4xl font-bold text-slate-800">???</div>
          </div>
          <div id="bot-paper" className="hidden bg-white border border-slate-200 shadow-md p-2 mt-2 rounded text-xs font-mono text-red-600">
            MISSING PAGE
          </div>
        </div>
        <div id="text-4" className="story-text absolute bottom-1/4 text-2xl font-bold text-slate-700 text-center">
          Even our AI can't find this page.
        </div>

        {/* ================= SCENE 5: GRAPH ================= */}
        <div id="scene-5-graph" className="scene-element absolute flex flex-col items-center">
            <svg width="300" height="200" viewBox="0 0 300 200" className="overflow-visible">
                {/* Axes */}
                <line x1="0" y1="200" x2="300" y2="200" stroke="#94a3b8" strokeWidth="2" />
                <line x1="0" y1="0" x2="0" y2="200" stroke="#94a3b8" strokeWidth="2" />
                
                {/* The Line: Starts low, goes high, then crashes to 404 level */}
                <path 
                    className="graph-path"
                    d="M0,180 L50,160 L100,100 L150,50 L200,20 L250,150" 
                    fill="none" 
                    stroke="#dc2626" 
                    strokeWidth="4" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                />
            </svg>
            <div id="graph-404" className="hidden text-red-600 font-bold text-3xl mt-4">404 CRASH</div>
        </div>
        <div id="text-5" className="story-text absolute bottom-1/4 text-2xl font-bold text-slate-700 text-center">
          This page crashed harder than a 300 score.
        </div>


        {/* ================= FINAL SCREEN ================= */}
        <div className="final-screen text-center max-w-2xl mx-auto space-y-8 z-10">
          <div className="mb-6">
            <div className="inline-block p-6 rounded-full bg-emerald-100 mb-4">
               <FileQuestion className="w-16 h-16 text-emerald-600" />
            </div>
            <h1 className="text-4xl font-bold text-slate-800 mb-2">
              404: Page Not Found
            </h1>
            <p className="text-xl text-emerald-600 font-medium">
              "Good news: Your real credit score is absolutely fine."
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-slate-600">Need help finding your way back?</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 gap-2">
                <Link to="/">
                  <Home size={18} /> Home
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2">
                <Link to="/member/dashboard">
                  <LayoutDashboard size={18} /> Dashboard
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="gap-2">
                <Link to="/contact">
                  <LifeBuoy size={18} /> Contact Support
                </Link>
              </Button>
            </div>
          </div>
          
          <div className="pt-8 text-sm text-slate-400">
             <Link to="#" onClick={() => window.location.reload()} className="hover:text-blue-500 transition-colors flex items-center justify-center gap-2">
                <Search size={14} /> Replay Animation
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

