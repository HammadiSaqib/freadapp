import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '@/components/SiteHeader';
import Footer from '../components/Footer';
import { Card, CardContent } from '../components/ui/card';
import { MapPin, FileText, Link2, Shield, CreditCard, Users, HelpCircle } from 'lucide-react';

const Sitemap: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <SiteHeader />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            
            {/* Header Section */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center p-3 bg-teal-100 text-teal-700 rounded-full mb-6">
                <MapPin className="w-8 h-8" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                Site Map
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                A comprehensive list of all pages and resources available on The Score Machine platform.
              </p>
            </div>

            <Card className="shadow-xl border-0 bg-white overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-teal-600 to-emerald-600"></div>
              <CardContent className="p-8 md:p-12 prose prose-slate max-w-none">
                
                {/* Last Updated Date */}
                <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-500 mb-0">
                    <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
                  </p>
                </div>

                <div className="grid gap-8 md:grid-cols-2">
                  
                  {/* Core Pages */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Link2 className="w-5 h-5 text-teal-600" />
                      <h2 className="text-2xl font-bold text-slate-900 m-0">Core Pages</h2>
                    </div>
                    <ul className="list-disc pl-6 space-y-2 text-slate-600">
                      <li><Link to="/" className="text-teal-600 hover:underline hover:text-teal-800 transition-colors">Home</Link></li>
                      <li><Link to="/features" className="text-teal-600 hover:underline hover:text-teal-800 transition-colors">Features</Link></li>
                      <li><Link to="/how-it-works" className="text-teal-600 hover:underline hover:text-teal-800 transition-colors">How It Works</Link></li>
                      <li><Link to="/pricing" className="text-teal-600 hover:underline hover:text-teal-800 transition-colors">Pricing</Link></li>
                      <li><Link to="/contact" className="text-teal-600 hover:underline hover:text-teal-800 transition-colors">Contact</Link></li>
                    </ul>
                  </div>

                  {/* Legal & Support */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Shield className="w-5 h-5 text-teal-600" />
                      <h2 className="text-2xl font-bold text-slate-900 m-0">Legal & Support</h2>
                    </div>
                    <ul className="list-disc pl-6 space-y-2 text-slate-600">
                      <li><Link to="/terms" className="text-teal-600 hover:underline hover:text-teal-800 transition-colors">Terms & Conditions</Link></li>
                      <li><Link to="/privacy" className="text-teal-600 hover:underline hover:text-teal-800 transition-colors">Privacy Policy</Link></li>
                      <li><Link to="/refund-policy" className="text-teal-600 hover:underline hover:text-teal-800 transition-colors">Refund Policy</Link></li>
                      <li><Link to="/docs" className="text-teal-600 hover:underline hover:text-teal-800 transition-colors">Documentation</Link></li>
                      <li><Link to="/support" className="text-teal-600 hover:underline hover:text-teal-800 transition-colors">Support Center</Link></li>
                      <li><Link to="/sitemap" className="text-teal-600 hover:underline hover:text-teal-800 transition-colors">Site Map</Link></li>
                    </ul>
                  </div>

                  {/* Account & Affiliates */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="w-5 h-5 text-teal-600" />
                      <h2 className="text-2xl font-bold text-slate-900 m-0">Account Access</h2>
                    </div>
                    <ul className="list-disc pl-6 space-y-2 text-slate-600">
                      <li><Link to="/login" className="text-teal-600 hover:underline hover:text-teal-800 transition-colors">Client Login</Link></li>
                      <li><Link to="/register" className="text-teal-600 hover:underline hover:text-teal-800 transition-colors">Create Account</Link></li>
                      <li><Link to="/affiliate/login" className="text-teal-600 hover:underline hover:text-teal-800 transition-colors">Affiliate Program</Link></li>
                    </ul>
                  </div>

                  {/* Resources */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <HelpCircle className="w-5 h-5 text-teal-600" />
                      <h2 className="text-2xl font-bold text-slate-900 m-0">Resources</h2>
                    </div>
                    <ul className="list-disc pl-6 space-y-2 text-slate-600">
                      <li><Link to="/blog" className="text-teal-600 hover:underline hover:text-teal-800 transition-colors">Blog (Coming Soon)</Link></li>
                      <li><Link to="/faq" className="text-teal-600 hover:underline hover:text-teal-800 transition-colors">FAQ (Coming Soon)</Link></li>
                    </ul>
                  </div>

                </div>

              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Sitemap;
