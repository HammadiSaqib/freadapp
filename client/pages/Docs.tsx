import React, { useEffect } from 'react';
import SiteHeader from '@/components/SiteHeader';
import Footer from '../components/Footer';
import { Card, CardContent } from '../components/ui/card';
import { BookOpen, Server, Shield, Database, BarChart2, Lock, FileText, AlertTriangle, Monitor, Key } from 'lucide-react';

const Docs: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <SiteHeader />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center p-3 bg-violet-100 text-violet-600 rounded-full mb-6 shadow-sm">
                <BookOpen className="w-8 h-8" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
                Platform Documentation & User Guide
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                The Score Machine: Comprehensive guide to platform capabilities, requirements, and policies.
              </p>
            </div>

            <Card className="shadow-xl border-0 bg-white overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-violet-600 to-fuchsia-600"></div>
              <CardContent className="p-8 md:p-12 prose prose-slate max-w-none">
                
                {/* Section 1 */}
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mt-2 mb-6">
                  <span className="text-violet-600">1.</span> Introduction to the Platform
                </h2>
                <p className="text-slate-600 leading-relaxed mb-6">
                  The Score Machine is a proprietary, cloud-based Software-as-a-Service (SaaS) solution designed for sophisticated financial assessment. It utilizes proprietary algorithms, AI, and integrated data sources to retrieve, normalize, and analyze consumer and commercial credit-related data, delivering highly detailed Derivative Outputs (reports, analyses, scores, and recommendations).
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-4">1.1 Core Components of the Platform</h3>
                <div className="grid gap-4 md:grid-cols-2 mb-8">
                  <div className="bg-slate-50 p-5 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2 mb-2 text-violet-700 font-bold">
                      <Database className="w-5 h-5" />
                      Data Ingestion Engine
                    </div>
                    <p className="text-sm text-slate-600">Automated retrieval, parsing, and normalization of structured credit data from authorized Third-Party Data Providers (as defined in the Agreement).</p>
                  </div>
                  
                  <div className="bg-slate-50 p-5 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2 mb-2 text-violet-700 font-bold">
                      <Server className="w-5 h-5" />
                      Forensic Analysis Engine
                    </div>
                    <p className="text-sm text-slate-600">Application of proprietary decision-logic models and AI to interpret credit report details, discrepancies, and trends.</p>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2 mb-2 text-violet-700 font-bold">
                      <BarChart2 className="w-5 h-5" />
                      Reporting Dashboards
                    </div>
                    <p className="text-sm text-slate-600">Visualization of metrics, foundational credit profiles, and benchmark progress.</p>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2 mb-2 text-violet-700 font-bold">
                      <Monitor className="w-5 h-5" />
                      AI Funder Module
                    </div>
                    <p className="text-sm text-slate-600">Identifies and ranks potential capital providers based on assessed credit readiness and facilitates application workflows.</p>
                  </div>
                </div>
                <p className="text-slate-600 mb-6 pl-4 border-l-4 border-violet-200">
                  <strong>Ancillary Modules:</strong> Consultation, coaching, and educational resources for credit management and funding readiness.
                </p>

                <hr className="my-8 border-slate-200" />

                {/* Section 2 */}
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mt-10 mb-6">
                  <span className="text-violet-600">2.</span> System Requirements and Access
                </h2>

                <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">2.1 Access Requirements</h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  The Platform is a hosted, cloud-based service, requiring only a secure internet connection and a standard, updated web browser.
                </p>
                <ul className="list-disc pl-6 space-y-2 text-slate-600 mb-6">
                  <li><strong>Supported Browsers:</strong> The latest two versions of Chrome, Firefox, Safari, and Microsoft Edge.</li>
                  <li><strong>Security:</strong> Users must maintain up-to-date operating systems and security software.</li>
                  <li><strong>Credentials:</strong> Access requires a unique Account and authenticated credentials (username/password, multi-factor codes).</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">2.2 Account Security and Responsibility</h3>
                <div className="bg-violet-50 p-6 rounded-lg mb-6">
                  <div className="flex items-start gap-3 mb-4">
                    <Key className="w-5 h-5 text-violet-600 mt-1" />
                    <div>
                      <h4 className="font-bold text-slate-900">Confidentiality</h4>
                      <p className="text-slate-600 text-sm">The User is solely responsible for safeguarding all Account credentials and tokens. Credentials must not be shared outside of authorized personnel (Section 1.4(b)).</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-violet-600 mt-1" />
                    <div>
                      <h4 className="font-bold text-slate-900">Liability</h4>
                      <p className="text-slate-600 text-sm">All activities, transactions, and data retrievals occurring through your Account are deemed the acts of the User. Promptly report any suspected or actual security breach to the Company (Section 1.4(d)).</p>
                    </div>
                  </div>
                </div>

                <hr className="my-8 border-slate-200" />

                {/* Section 3 */}
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mt-10 mb-6">
                  <span className="text-violet-600">3.</span> Data Authorization and Retrieval Process
                </h2>
                <p className="text-slate-600 leading-relaxed mb-6">
                  The Platform cannot function without your explicit and ongoing authorization to retrieve credit data.
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">3.1 Required User Authorization</h3>
                <ul className="list-disc pl-6 space-y-2 text-slate-600 mb-6">
                  <li>To initiate the Services, you must provide and maintain accurate, complete, and current information, authorizations, and consents necessary for the Company and its Third-Party Data Providers to access and process your credit information (Section 1.4(a)).</li>
                  <li>This authorization is continuing for the duration of the Agreement, covering all necessary updates, refreshes, or re-pulls of data.</li>
                  <li>The User warrants they have the full legal right, authority, and capacity to grant this authorization (Section 3.1(b)).</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">3.2 Data Sources (Third-Party Data Providers)</h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  The Platform relies on data from independent third-party sources (e.g., consumer-reporting agencies and aggregators) which operate under their own terms.
                </p>
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
                  <p className="text-amber-800 text-sm">
                    <strong>Disclaimer:</strong> The Company does not originate, maintain, or guarantee the accuracy, completeness, or reliability of data furnished by Third-Party Data Providers (Section 1.6(a)). Any failures, inaccuracies, or interruptions arising from these providers are not the responsibility of the Company.
                  </p>
                </div>

                <hr className="my-8 border-slate-200" />

                {/* Section 4 */}
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mt-10 mb-6">
                  <span className="text-violet-600">4.</span> Understanding Derivative Outputs and Limitations
                </h2>

                <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">4.1 Nature of Derivative Outputs</h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  Derivative Outputs (reports, scores, underwriting determinations, recommendations) are materials generated by the Platform’s proprietary algorithms and AI models using both User-supplied data and Third-Party Data (Section 1.1(d)).
                </p>
                <ul className="list-disc pl-6 space-y-2 text-slate-600 mb-6">
                  <li><strong>Ownership:</strong> All Derivative Outputs are the exclusive intellectual property and confidential material of the Company (Section 1.7(b)).</li>
                  <li><strong>Permitted Use:</strong> You are granted a limited, non-exclusive right to view and use these outputs solely for your own internal personal or business purposes.</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">4.2 Crucial Disclaimer: Informational Tool Only</h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  The Services and Derivative Outputs are informational and analytical tools only. They are designed to assist the User in making independent assessments and decisions, but they do not constitute legal, financial, investment, or credit advice.
                </p>
                <div className="bg-slate-100 p-5 rounded-lg mb-6">
                  <p className="text-slate-700 font-medium mb-3">The Company makes no representation, warranty, or promise regarding:</p>
                  <ul className="list-disc pl-6 space-y-1 text-slate-600">
                    <li>Any specific credit-approval or funding outcome.</li>
                    <li>The accuracy or predictive value of any score or analytic result.</li>
                    <li>Any guaranteed improvement in your credit profile (Section 1.6(c)).</li>
                  </ul>
                  <p className="text-slate-700 text-sm mt-3 pt-3 border-t border-slate-200">
                    The User bears sole responsibility for the use, interpretation, and consequence of all business or financial decisions made in reliance on the outputs.
                  </p>
                </div>

                <hr className="my-8 border-slate-200" />

                {/* Section 5 */}
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mt-10 mb-6">
                  <span className="text-violet-600">5.</span> Compliance and Prohibited Activities
                </h2>
                <p className="text-slate-600 leading-relaxed mb-6">
                  Users must strictly adhere to legal and contractual restrictions when operating the Platform.
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">5.1 Legal Compliance</h3>
                <p className="text-slate-600 leading-relaxed mb-6">
                  The User must, at all times, comply with all applicable federal and state laws, rules, and regulations, including those governing consumer data, credit information, and privacy (e.g., FCRA, GLBA), in connection with all use of the Services (Section 3.4).
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">5.2 Prohibited Technical Conduct (Section 1.3(b))</h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  The License expressly prohibits the following acts, which constitute a material breach:
                </p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
                    <div>
                      <strong className="text-slate-900">Reverse Engineering:</strong>
                      <p className="text-slate-600 text-sm">Attempting to derive the source code, object code, or underlying logic of the Platform.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
                    <div>
                      <strong className="text-slate-900">Competing Use:</strong>
                      <p className="text-slate-600 text-sm">Using the Platform or outputs to develop, train, benchmark, or support a competing product or algorithm.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
                    <div>
                      <strong className="text-slate-900">Data Scraping:</strong>
                      <p className="text-slate-600 text-sm">Engaging in any automated data collection that bypasses or exceeds API limits or intended user interfaces.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
                    <div>
                      <strong className="text-slate-900">Interference:</strong>
                      <p className="text-slate-600 text-sm">Introducing viruses, malware, or engaging in any conduct that disrupts the security, integrity, or performance of the Platform.</p>
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">5.3 Consequences of Breach</h3>
                <p className="text-slate-600 leading-relaxed mb-6">
                  Any breach of the Prohibited Conduct or Legal Compliance sections may result in the Company, in its sole discretion and without notice, immediately suspending or terminating the User’s access and pursuing all remedies available at law or in equity (Section 3.2(c)).
                </p>

                <hr className="my-8 border-slate-200" />

                {/* Section 6 */}
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mt-10 mb-6">
                  <span className="text-violet-600">6.</span> Support and Maintenance
                </h2>

                <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">6.1 Service Availability and Evolution</h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  The Platform is a continuous SaaS environment, subject to scheduled maintenance, security updates, and enhancements (Section 1.5(a)). The Company uses commercially reasonable efforts to maintain stable access. The Company may modify, enhance, replace, or retire any component or feature at any time without liability (Section 1.5(b)).
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">6.2 User Cooperation</h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  Effective support depends on User cooperation (Section 3.6). The Company shall have no liability for any failure, delay, or degradation of Services caused by the User’s failure to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-slate-600 mb-6">
                  <li>Furnish requested data or cooperation.</li>
                  <li>Maintain accurate contact information.</li>
                  <li>Use compatible hardware or software.</li>
                </ul>

                <hr className="my-8 border-slate-200" />

                {/* Section 7 */}
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mt-10 mb-6">
                  <span className="text-violet-600">7.</span> Account Management and Termination
                </h2>

                <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">7.1 Subscription and Billing</h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  Your subscription automatically renews for successive terms (e.g., month-to-month) unless properly canceled (Section 2.1(c)). All fees are non-refundable upon payment (Section 2.3).
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">7.2 Cancellation Procedure</h3>
                <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 mb-6">
                  <p className="text-slate-600 mb-0">
                    To prevent automatic renewal, you must submit a formal cancellation request via the Platform's account-management interface or in writing, at least <span className="font-bold text-slate-900">three (3) days</span> prior to the end of the current billing cycle (Section 2.6).
                  </p>
                </div>

                <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">7.3 Data Handling Post-Termination</h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  Upon termination, all licenses immediately cease, and access is disabled. Following a transitional Retention Period (e.g., 30 days), the Company may permanently delete or anonymize all data associated with the Account, with no liability for the deletion or loss of data (Section 4.4(b)). Users are responsible for exporting necessary data prior to the effective termination date.
                </p>

              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Docs;
