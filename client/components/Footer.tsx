import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Facebook, 
  Instagram, 
  Youtube, 
  Send, 
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const TikTok = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const Footer: React.FC = () => {
  const footerRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const currentYear = new Date().getFullYear();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Successfully subscribed!');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.message || data.error || 'Failed to subscribe.');
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      setStatus('error');
      setMessage('An error occurred. Please try again later.');
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (footerRef.current) {
      observer.observe(footerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <footer 
      ref={footerRef}
      className={`bg-[#0f182a] border-t border-slate-800 pt-16 pb-8 relative overflow-hidden transition-all duration-1000 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
    >
      {/* Decorative Top Gradient Line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-500 opacity-50"></div>

      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-16">
          
          {/* Brand Column */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-teal-900/20">
                <Shield className="h-6 w-6" />
              </div>
              <span className="text-xl font-black text-white tracking-tight">
                Score Machine
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed text-sm max-w-xs">
              Empowering credit professionals with advanced analytics, automated insights, and secure reporting tools.
            </p>
            <div className="flex items-center gap-4">
              {[
                { icon: Facebook, href: "https://www.facebook.com/profile.php?id=61581433227215", label: "Facebook" },
                { icon: Instagram, href: "https://www.instagram.com/the_scoremachine/", label: "Instagram" },
                { icon: TikTok, href: "https://www.tiktok.com/@smarthustlersuniversity", label: "TikTok" },
                { icon: Youtube, href: "https://www.youtube.com/@Smarthustlersuniversity", label: "YouTube" },
              ].map((social, i) => (
                <a 
                  key={i} 
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-teal-400 hover:border-teal-500 hover:-translate-y-1 hover:shadow-md hover:shadow-teal-900/20 transition-all duration-300"
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-white text-lg mb-6">Quick Links</h3>
            <ul className="space-y-4">
              {[
                { label: "Home", to: "/" },
                { label: "Features", to: "/features" },
                { label: "How It Works", to: "/how-it-works" },
                { label: "Pricing", to: "/pricing" },
                { label: "Business Funding", to: "/business-funding" },
                { label: "Credit Readiness", to: "/credit-readiness" },
                { label: "Loan Preparation", to: "/loan-preparation" },
                { label: "0% Interest Credit Cards", to: "/0-percent-interest-credit-cards" },
                { label: "Tax Professionals Funding", to: "/tax-professionals-funding" },
                { label: "Blog", to: "/blog" },
                { label: "Contact", to: "/contact" },
                { label: "Affiliate Program", to: "/affiliate/login" },
              ].map((link, i) => (
                <li key={i}>
                  <Link 
                    to={link.to} 
                    className="text-slate-300 hover:text-teal-400 transition-colors duration-300 flex items-center gap-2 group"
                  >
                    <span className="w-0 group-hover:w-2 h-0.5 bg-teal-500 transition-all duration-300"></span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources / Support */}
          <div>
            <h3 className="font-bold text-white text-lg mb-6">Resources</h3>
            <ul className="space-y-4">
              {[
                { label: "Terms & Conditions", to: "/terms" },
                { label: "Privacy Policy", to: "/privacy" },
                { label: "Refund Policy", to: "/refund-policy" },
                { label: "Cancel Subscription", to: "/login" },
                { label: "Support Center", to: "/support" },
                { label: "Documentation", to: "/docs" },
              ].map((link, i) => (
                <li key={i}>
                  <Link 
                    to={link.to} 
                    className="text-slate-300 hover:text-teal-400 transition-colors duration-300 flex items-center gap-2 group"
                  >
                    <span className="w-0 group-hover:w-2 h-0.5 bg-teal-500 transition-all duration-300"></span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-bold text-white text-lg mb-6">Stay Informed</h3>
            <p className="text-slate-300 text-sm mb-4">
              Subscribe to our newsletter for the latest updates and credit insights.
            </p>
            <form className="space-y-3" onSubmit={handleSubscribe}>
              <div className="relative">
                <Input 
                  type="email" 
                  placeholder="Enter your email" 
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-teal-500 focus:ring-teal-500 rounded-lg pl-4 pr-4 py-6 shadow-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === 'loading' || status === 'success'}
                  required
                />
              </div>
              <Button 
                type="submit"
                disabled={status === 'loading' || status === 'success'}
                className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg shadow-teal-900/20 rounded-lg py-6 font-bold transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? 'Subscribing...' : status === 'success' ? 'Subscribed!' : 'Subscribe'} 
                {status !== 'loading' && status !== 'success' && <Send className="ml-2 h-4 w-4" />}
              </Button>
              {message && (
                <p className={`text-xs text-center mt-2 ${status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {message}
                </p>
              )}
              {!message && (
                <p className="text-xs text-slate-500 text-center mt-2">
                  No spam. Unsubscribe anytime.
                </p>
              )}
            </form>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-300">
          <p>© {currentYear} Score Machine. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="hover:text-teal-400 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-teal-400 transition-colors">Terms</Link>
            <Link to="/sitemap" className="hover:text-teal-400 transition-colors">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
